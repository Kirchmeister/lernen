import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { packs } from "../examples/create-demo.mjs";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
test("HTTP: Rollen, Import, Üben, Test, Antwortschutz und Wiederholung", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lernreise-test-"));
  const port = 34873,
    origin = `http://localhost:${port}`;
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      DEMO_MODE: "true",
      PORT: String(port),
      HOST: "127.0.0.1",
      DATA_PATH: join(dir, "test.sqlite"),
    },
  });
  let logs = "";
  child.stderr.on("data", (d) => (logs += d));
  const ready = new Promise((resolve, reject) => {
    child.stdout.on("data", (d) => {
      if (String(d).includes("auf Port")) resolve();
    });
    child.on("exit", (c) => reject(Error("Server beendet: " + c + " " + logs)));
  });
  const timer = setTimeout(() => child.kill(), 15000);
  const request = async (path, data, cookie = "", requestOrigin = origin) => {
    const r = await fetch(origin + "/api/" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(data === undefined
          ? {}
          : { "Content-Type": "application/json", Origin: requestOrigin }),
        Cookie: cookie,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    await ready;
    assert.equal((await request("state")).status, 401);
    assert.equal(
      (await request("demo", { role: "parent" }, "", "https://evil.invalid"))
        .status,
      403,
    );
    const student = (await request("demo", { role: "student" })).cookie;
    assert.equal((await request("packages", packs[0], student)).status, 403);
    assert.equal(
      (await request("children", { name: "Test" }, student)).status,
      403,
    );
    const st = (await request("state", undefined, student)).body;
    assert.equal(st.packages.length, 3);
    assert.equal(st.user.role, "student");
    assert.equal("questions" in st.packages[0], false);
    let r = (await request("rounds", { pack: "physics-energy" }, student)).body;
    assert.equal(r.total, 8);
    assert.equal("correct" in r.question, false);
    const firstQ = r.question.id;
    let a = await request(
      "rounds/answer",
      { round: r.id, question: r.question.id, value: "definitely wrong" },
      student,
    );
    assert.equal(a.body.correct, false);
    assert.equal(a.body.correctCount, 0);
    assert.ok(a.body.explanation);
    assert.equal(
      (
        await request(
          "rounds/answer",
          { round: r.id, question: firstQ, value: 0 },
          student,
        )
      ).status,
      400,
    );
    let seenRetry = false,
      steps = 1;
    r = a.body;
    while (!r.done) {
      const q = packs[1].questions.find((q) => q.id === r.question.id);
      if (r.retry) seenRetry = true;
      const value = q.type === "choice" ? q.correct : String(q.answer);
      r = (
        await request(
          "rounds/answer",
          { round: r.id, question: q.id, value },
          student,
        )
      ).body;
      steps++;
    }
    assert.equal(seenRetry, true);
    assert.equal(steps, 9);
    assert.equal(r.correctCount, 7);
    assert.equal(r.retries, 1);
    const after = (await request("state", undefined, student)).body;
    assert.equal(after.stats.answered, 8);
    assert.equal(after.stats.correct, 7);
    assert.equal(after.stats.completed, 1);
    assert.equal(
      after.packages.find((p) => p.id === "physics-energy").learned,
      0,
    );
    assert.equal(
      after.packages.find((p) => p.id === "physics-energy").practiced,
      7,
    );
    r = (
      await request("rounds", { pack: "latin-first", mode: "test" }, student)
    ).body;
    while (!r.done) {
      const q = packs[2].questions.find((q) => q.id === r.question.id);
      r = (
        await request(
          "rounds/answer",
          { round: r.id, question: q.id, value: "wrong" },
          student,
        )
      ).body;
      assert.equal(r.correct, null);
      assert.equal(r.explanation, null);
      if (!r.done) assert.equal("review" in r, false);
    }
    assert.equal(r.correctCount, 0);
    assert.equal(r.retries, 0);
    assert.equal(r.review.length, 8);
    const parent = (await request("demo", { role: "parent" })).cookie;
    assert.equal(
      (await request("rounds", { pack: "latin-first" }, parent)).status,
      403,
    );
    assert.equal(
      (await request("packages/validate", { version: 9 }, parent)).status,
      400,
    );
    const imported = {
      ...structuredClone(packs[0]),
      id: "new-pack",
      title: "Neues Paket",
    };
    assert.equal((await request("packages", imported, parent)).status, 200);
    assert.equal(
      (await request("state", undefined, student)).body.packages.length,
      4,
    );
    assert.equal(
      (await request("auth/register/options", {}, parent)).status,
      400,
    );
    assert.equal(
      (
        await request(
          "progress/reset",
          { child: "demo-parent", pack: "physics-energy" },
          parent,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          "progress/reset",
          { child: "demo-student", pack: "physics-energy" },
          parent,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request("state", undefined, student)).body.packages.find(
        (p) => p.id === "physics-energy",
      ).practiced,
      0,
    );
    // Identische Aufgaben behalten ihren Stand; geänderte Aufgaben beginnen erneut.
    r = (await request("rounds", { pack: "english-everyday" }, student)).body;
    const q = packs[0].questions.find((q) => q.id === r.question.id);
    await request(
      "rounds/answer",
      { round: r.id, question: q.id, value: q.answers[0] },
      student,
    );
    assert.equal((await request("packages", packs[0], parent)).status, 400);
    await request("rounds/close", { round: r.id }, student);
    assert.equal((await request("packages", packs[0], parent)).status, 200);
    assert.equal(
      (await request("state", undefined, student)).body.packages.find(
        (p) => p.id === "english-everyday",
      ).practiced,
      1,
    );
    const changed = structuredClone(packs[0]);
    changed.questions.find((n) => n.id === q.id).prompt +=
      " Neue Formulierung.";
    await request("packages", changed, parent);
    assert.equal(
      (await request("state", undefined, student)).body.packages.find(
        (p) => p.id === "english-everyday",
      ).practiced,
      0,
    );
    await request("logout", {}, student);
    assert.equal((await request("state", undefined, student)).status, 401);
  } finally {
    clearTimeout(timer);
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
