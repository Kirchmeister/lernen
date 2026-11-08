import http from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  validatePack,
  grade,
  advance,
  publicQuestion,
  solution,
} from "./learning.mjs";
import { packs } from "./examples/create-demo.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const DEMO = process.env.DEMO_MODE === "true",
  PORT = Number(process.env.PORT || 3000);
const ORIGIN = process.env.ORIGIN || `http://localhost:${PORT}`,
  RP_ID = new URL(ORIGIN).hostname;
if (!DEMO && !process.env.SETUP_TOKEN)
  throw new Error("SETUP_TOKEN fehlt. Bitte .env gemäß README einrichten.");
if (!DEMO && !ORIGIN.startsWith("https://") && RP_ID !== "localhost")
  throw new Error("Im regulären Betrieb ist HTTPS erforderlich.");
const path = resolve(process.env.DATA_PATH || "data/lernreise.sqlite");
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
);
db.exec(`
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,family TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS credentials(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),public_key BLOB NOT NULL,counter INTEGER NOT NULL,transports TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS challenges(token TEXT PRIMARY KEY,payload TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS invites(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS packages(family TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(family,id));
 CREATE TABLE IF NOT EXISTS progress(user_id TEXT NOT NULL,pack TEXT NOT NULL,qid TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(user_id,pack,qid));
 CREATE TABLE IF NOT EXISTS rounds(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,pack TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY,user_id TEXT NOT NULL,pack TEXT NOT NULL,qid TEXT NOT NULL,correct INTEGER NOT NULL,created INTEGER NOT NULL);
`);
const uid = () => randomBytes(24).toString("base64url");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const get = (sql, ...p) => db.prepare(sql).get(...p),
  all = (sql, ...p) => db.prepare(sql).all(...p),
  run = (sql, ...p) => db.prepare(sql).run(...p);
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const transaction = (fn) => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
};
const day = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(
    new Date(),
  );
const packFor = (u, id) => {
  const p = get(
    "SELECT body FROM packages WHERE family=? AND id=?",
    u.family,
    id,
  );
  if (!p) fail("Lernpaket nicht gefunden.", 404);
  return JSON.parse(p.body);
};
const progressFor = (id, pack) =>
  Object.fromEntries(
    all(
      "SELECT qid,body FROM progress WHERE user_id=? AND pack=?",
      id,
      pack,
    ).map((x) => [x.qid, JSON.parse(x.body)]),
  );
function session(res, id) {
  const token = uid();
  run(
    "INSERT INTO sessions VALUES(?,?,?)",
    hash(token),
    id,
    Date.now() + 7 * 86400000,
  );
  res.setHeader(
    "Set-Cookie",
    `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${!DEMO && ORIGIN.startsWith("https://") ? "; Secure" : ""}`,
  );
}
function cookie(req, name) {
  return (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="))
    ?.slice(name.length + 1);
}
function user(req) {
  const token = cookie(req, "session");
  if (!token) return null;
  return get(
    "SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?",
    hash(token),
    Date.now(),
  );
}
const requireUser = (req) => user(req) || fail("Bitte zuerst anmelden.", 401);
const parent = (req) => {
  const u = requireUser(req);
  if (u.role !== "parent") fail("Dieser Bereich gehört zum Elternkonto.", 403);
  return u;
};
function learner(req) {
  const u = requireUser(req);
  if (u.role !== "student") fail("Bitte mit einem Schülerkonto anmelden.", 403);
  return u;
}
function invite(userId) {
  const token = uid();
  run(
    "INSERT INTO invites VALUES(?,?,?)",
    hash(token),
    userId,
    Date.now() + 30 * 60000,
  );
  return token;
}
function challenge(res, payload) {
  const token = uid();
  run(
    "INSERT INTO challenges VALUES(?,?,?)",
    hash(token),
    JSON.stringify(payload),
    Date.now() + 300000,
  );
  res.setHeader(
    "Set-Cookie",
    `challenge=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=300${!DEMO && ORIGIN.startsWith("https://") ? "; Secure" : ""}`,
  );
}
function takeChallenge(req) {
  const t = cookie(req, "challenge");
  if (!t) fail("Anmeldung abgelaufen. Bitte erneut starten.");
  const r = get("SELECT * FROM challenges WHERE token=?", hash(t));
  run("DELETE FROM challenges WHERE token=?", hash(t));
  if (!r || r.expires < Date.now()) fail("Anmeldung abgelaufen.");
  return JSON.parse(r.payload);
}
function registrationTarget(req, b) {
  const u = user(req);
  if (u && !b.token) return { kind: "existing", user: u };
  if (
    b.token &&
    process.env.SETUP_TOKEN &&
    hash(b.token) === hash(process.env.SETUP_TOKEN) &&
    !get("SELECT id FROM users LIMIT 1")
  ) {
    if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 60)
      fail("Bitte deinen Namen eingeben.");
    return {
      kind: "setup",
      user: { id: uid(), family: uid(), name: b.name.trim(), role: "parent" },
    };
  }
  if (typeof b.token === "string") {
    const i = get(
      "SELECT * FROM invites WHERE token=? AND expires>?",
      hash(b.token),
      Date.now(),
    );
    if (i)
      return {
        kind: "invite",
        invite: hash(b.token),
        user: get("SELECT * FROM users WHERE id=?", i.user_id),
      };
  }
  fail("Dieser Einrichtungslink ist ungültig oder abgelaufen.", 403);
}
function savePack(u, p) {
  validatePack(p);
  const active = get(
    "SELECT id FROM rounds WHERE pack=? AND user_id IN (SELECT id FROM users WHERE family=?) AND json_extract(body,'$.done')=0",
    p.id,
    u.family,
  );
  if (active)
    fail(
      "Dieses Paket wird gerade bearbeitet. Bitte die Lernrunde zuerst beenden.",
    );
  transaction(() => {
    const old = get(
      "SELECT body FROM packages WHERE family=? AND id=?",
      u.family,
      p.id,
    );
    if (old) {
      const before = JSON.parse(old.body);
      const changed = before.questions
        .filter(
          (q) =>
            JSON.stringify(q) !==
            JSON.stringify(p.questions.find((n) => n.id === q.id)),
        )
        .map((q) => q.id);
      for (const qid of changed)
        run(
          "DELETE FROM progress WHERE pack=? AND qid=? AND user_id IN (SELECT id FROM users WHERE family=?)",
          p.id,
          qid,
          u.family,
        );
    }
    run(
      "INSERT OR REPLACE INTO packages VALUES(?,?,?)",
      u.family,
      p.id,
      JSON.stringify(p),
    );
  });
}
function bootstrapDemo() {
  if (!DEMO) return;
  if (!get("SELECT id FROM users WHERE id='demo-parent'")) {
    run(
      "INSERT INTO users VALUES(?,?,?,?)",
      "demo-parent",
      "demo",
      "Eltern",
      "parent",
    );
    run(
      "INSERT INTO users VALUES(?,?,?,?)",
      "demo-student",
      "demo",
      "Alex",
      "student",
    );
    for (const p of packs) savePack({ family: "demo" }, p);
  }
}
bootstrapDemo();
const buckets = new Map();
function limit(req) {
  const key = req.socket.remoteAddress;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.until < now) b = { n: 0, until: now + 60000 };
  b.n++;
  buckets.set(key, b);
  if (b.n > 120)
    fail("Einen Moment bitte. Versuche es gleich noch einmal.", 429);
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
}
async function body(req) {
  let s = "",
    size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 1024 * 1024) fail("Die Datei ist zu groß (maximal 1 MB).", 413);
    s += c;
  }
  try {
    return JSON.parse(s || "{}");
  } catch {
    fail("Die Daten sind kein gültiges JSON.");
  }
}
function state(u) {
  const packages = all(
    "SELECT body FROM packages WHERE family=?",
    u.family,
  ).map((r) => {
    const p = JSON.parse(r.body),
      pr = progressFor(u.id, p.id);
    return {
      id: p.id,
      title: p.title,
      subject: p.subject,
      topic: p.topic,
      grade: p.grade,
      total: p.questions.length,
      learned: p.questions.filter((q) => pr[q.id]?.archived).length,
      practiced: p.questions.filter((q) => pr[q.id]?.streak > 0).length,
    };
  });
  const stats = get(
    "SELECT count(*) answered, coalesce(sum(correct),0) correct FROM attempts WHERE user_id=?",
    u.id,
  );
  const completed = get(
    "SELECT count(*) n FROM rounds WHERE user_id=? AND json_extract(body,'$.done')=1 AND coalesce(json_extract(body,'$.abandoned'),0)=0",
    u.id,
  ).n;
  const badges = [
    {
      title: "Erster Schritt",
      detail: "Deine erste Aufgabe beantwortet",
      unlocked: stats.answered > 0,
    },
    {
      title: "Drangeblieben",
      detail: "Eine Lernrunde abgeschlossen",
      unlocked: completed > 0,
    },
    {
      title: "Wissenssammler",
      detail: "20 Antworten richtig gelöst",
      unlocked: stats.correct >= 20,
    },
    {
      title: "Sicher gelernt",
      detail: "Eine Aufgabe an drei Tagen gemeistert",
      unlocked: packages.some((p) => p.learned > 0),
    },
  ];
  const result = {
    user: u,
    demo: DEMO,
    packages,
    stats: {
      ...stats,
      completed,
      xp: stats.correct * 10 + (stats.answered - stats.correct) * 2,
    },
    badges,
  };
  if (u.role === "parent")
    result.children = all(
      "SELECT * FROM users WHERE family=? AND role='student'",
      u.family,
    ).map((c) => {
      const s = get(
        "SELECT count(*) answered,coalesce(sum(correct),0) correct FROM attempts WHERE user_id=?",
        c.id,
      );
      const learned = get(
        "SELECT count(*) n FROM progress WHERE user_id=? AND json_extract(body,'$.archived')=1",
        c.id,
      ).n;
      return { ...c, ...s, learned };
    });
  return result;
}
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    let j = randomBytes(4).readUInt32BE() % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function roundView(r, p) {
  const q = p.questions.find((q) => q.id === r.queue[0]?.id);
  const v = {
    id: r.id,
    done: r.done,
    mode: r.mode,
    total: r.total,
    answered: r.firstCount,
    correctCount: r.firstCorrect,
    retries: r.retries,
    packTitle: p.title,
  };
  if (q) {
    v.question = publicQuestion(q);
    v.retry = r.queue[0].retry;
    if (q.type === "choice") v.order = r.queue[0].order;
  }
  if (r.done) v.review = r.review;
  return v;
}

async function api(req, res, url) {
  const route = url.pathname,
    b = req.method === "POST" ? await body(req) : {};
  if (route === "/api/status") return { demo: DEMO, user: user(req) || null };
  if (route === "/api/logout" && req.method === "POST") {
    const t = cookie(req, "session");
    if (t) run("DELETE FROM sessions WHERE token=?", hash(t));
    res.setHeader(
      "Set-Cookie",
      "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    );
    return { ok: true };
  }
  if (route === "/api/demo" && req.method === "POST") {
    if (!DEMO) fail("Demo ist deaktiviert.", 404);
    session(res, b.role === "parent" ? "demo-parent" : "demo-student");
    return { ok: true };
  }
  if (route === "/api/auth/register/options" && req.method === "POST") {
    if (DEMO) fail("Passkeys sind in der Demo deaktiviert.");
    const target = registrationTarget(req, b);
    const cs = all(
      "SELECT id,transports FROM credentials WHERE user_id=?",
      target.user.id,
    );
    const options = await generateRegistrationOptions({
      rpName: "Lernreise",
      rpID: RP_ID,
      userName: target.user.name,
      userDisplayName: target.user.name,
      userID: Buffer.from(target.user.id),
      attestationType: "none",
      excludeCredentials: cs.map((c) => ({
        id: c.id,
        transports: JSON.parse(c.transports),
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    });
    challenge(res, {
      type: "registration",
      ...target,
      challenge: options.challenge,
    });
    return options;
  }
  if (route === "/api/auth/register/verify" && req.method === "POST") {
    const c = takeChallenge(req);
    if (c.type !== "registration") fail("Ungültiger Anmeldevorgang.");
    const v = await verifyRegistrationResponse({
      response: b,
      expectedChallenge: c.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
    if (!v.verified) fail("Passkey konnte nicht geprüft werden.");
    transaction(() => {
      if (c.kind === "setup") {
        if (get("SELECT id FROM users LIMIT 1"))
          fail("Einrichtung ist bereits abgeschlossen.", 403);
        run(
          "INSERT INTO users VALUES(?,?,?,?)",
          c.user.id,
          c.user.family,
          c.user.name,
          "parent",
        );
      }
      if (c.kind === "existing") {
        if (user(req)?.id !== c.user.id) fail("Bitte erneut anmelden.", 401);
      }
      if (c.kind === "invite") {
        const i = get(
          "SELECT * FROM invites WHERE token=? AND expires>?",
          c.invite,
          Date.now(),
        );
        if (!i || i.user_id !== c.user.id) fail("Einrichtungslink abgelaufen.");
        run("DELETE FROM invites WHERE token=?", c.invite);
      }
      const cr = v.registrationInfo.credential;
      run(
        "INSERT INTO credentials VALUES(?,?,?,?,?)",
        cr.id,
        c.user.id,
        cr.publicKey,
        cr.counter,
        JSON.stringify(b.response.transports || []),
      );
    });
    session(res, c.user.id);
    return { ok: true };
  }
  if (route === "/api/auth/login/options" && req.method === "POST") {
    if (DEMO) fail("Bitte den Demo-Einstieg verwenden.");
    const o = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: "required",
    });
    challenge(res, { type: "login", challenge: o.challenge });
    return o;
  }
  if (route === "/api/auth/login/verify" && req.method === "POST") {
    const c = takeChallenge(req);
    if (c.type !== "login") fail("Ungültiger Anmeldevorgang.");
    const cr = get("SELECT * FROM credentials WHERE id=?", b.id || "");
    if (!cr) fail("Passkey nicht gefunden.", 401);
    const v = await verifyAuthenticationResponse({
      response: b,
      expectedChallenge: c.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: cr.id,
        publicKey: new Uint8Array(cr.public_key),
        counter: cr.counter,
        transports: JSON.parse(cr.transports),
      },
    });
    if (!v.verified) fail("Anmeldung fehlgeschlagen.", 401);
    run(
      "UPDATE credentials SET counter=? WHERE id=?",
      v.authenticationInfo.newCounter,
      cr.id,
    );
    session(res, cr.user_id);
    return { ok: true };
  }
  if (route === "/api/state") return state(requireUser(req));
  if (route === "/api/children" && req.method === "POST") {
    const u = parent(req);
    if (DEMO) fail("Neue Konten sind in der Demo deaktiviert.");
    if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 60)
      fail("Bitte einen Namen mit bis zu 60 Zeichen eingeben.");
    const id = uid();
    run(
      "INSERT INTO users VALUES(?,?,?,?)",
      id,
      u.family,
      b.name.trim(),
      "student",
    );
    return { token: invite(id) };
  }
  if (route === "/api/invite" && req.method === "POST") {
    const u = parent(req);
    if (DEMO) fail("Einladungen sind in der Demo deaktiviert.");
    const c = get(
      "SELECT * FROM users WHERE id=? AND family=?",
      b.child || "",
      u.family,
    );
    if (!c || c.role !== "student") fail("Schülerkonto nicht gefunden.", 404);
    run("DELETE FROM invites WHERE user_id=?", c.id);
    return { token: invite(c.id) };
  }
  if (route === "/api/packages/validate" && req.method === "POST") {
    parent(req);
    validatePack(b);
    return {
      ok: true,
      title: b.title,
      subject: b.subject,
      count: b.questions.length,
    };
  }
  if (route === "/api/packages" && req.method === "POST") {
    savePack(parent(req), b);
    return { ok: true };
  }
  if (route === "/api/progress/reset" && req.method === "POST") {
    const u = parent(req),
      c = get(
        "SELECT * FROM users WHERE id=? AND family=? AND role='student'",
        b.child || "",
        u.family,
      );
    if (!c) fail("Schülerkonto nicht gefunden.");
    packFor(u, b.pack);
    run("DELETE FROM progress WHERE user_id=? AND pack=?", c.id, b.pack);
    return { ok: true };
  }
  if (route === "/api/rounds" && req.method === "POST") {
    const u = learner(req),
      p = packFor(u, b.pack),
      pr = progressFor(u.id, p.id),
      mode = b.mode === "test" ? "test" : "practice";
    // Je Kind eine offene Runde: fortsetzen oder bewusst schließen.
    const active = get(
      "SELECT * FROM rounds WHERE user_id=? AND json_extract(body,'$.done')=0",
      u.id,
    );
    if (active) {
      const r = JSON.parse(active.body);
      return roundView(r, packFor(u, active.pack));
    }
    const questions = shuffle(p.questions.filter((q) => !pr[q.id]?.archived))
      .sort((a, b) => (pr[a.id]?.streak ?? 0) - (pr[b.id]?.streak ?? 0))
      .slice(0, 10);
    if (!questions.length)
      fail(
        "Dieses Paket ist schon gelernt. Im Elternbereich kannst du es wieder aktivieren.",
      );
    const r = {
      id: uid(),
      mode,
      queue: questions.map((q) => ({
        id: q.id,
        retry: false,
        order: q.options ? shuffle(q.options.map((_, i) => i)) : undefined,
      })),
      total: questions.length,
      firstCount: 0,
      firstCorrect: 0,
      retries: 0,
      review: [],
      done: false,
    };
    run(
      "INSERT INTO rounds VALUES(?,?,?,?,?)",
      r.id,
      u.id,
      p.id,
      JSON.stringify(r),
      Date.now(),
    );
    return roundView(r, p);
  }
  if (route === "/api/rounds/answer" && req.method === "POST") {
    const u = learner(req);
    return transaction(() => {
      const row = get(
        "SELECT * FROM rounds WHERE id=? AND user_id=?",
        b.round || "",
        u.id,
      );
      if (!row) fail("Lernrunde nicht gefunden.", 404);
      const r = JSON.parse(row.body),
        p = packFor(u, row.pack);
      if (r.done || r.queue[0]?.id !== b.question)
        fail("Diese Aufgabe wurde schon beantwortet.");
      const entry = r.queue.shift(),
        q = p.questions.find((q) => q.id === entry.id);
      if (typeof b.value === "string" && b.value.length > 500)
        fail("Die Antwort ist zu lang.");
      const correct = grade(q, b.value);
      if (!entry.retry) {
        r.firstCount++;
        if (correct) r.firstCorrect++;
        r.review.push({
          prompt: q.prompt,
          correct,
          value: b.value,
          solution: solution(q),
          explanation: q.explanation,
        });
        run(
          "INSERT INTO attempts(user_id,pack,qid,correct,created) VALUES(?,?,?,?,?)",
          u.id,
          p.id,
          q.id,
          Number(correct),
          Date.now(),
        );
        const old = progressFor(u.id, p.id)[q.id],
          next = advance(old, correct, day());
        run(
          "INSERT OR REPLACE INTO progress VALUES(?,?,?,?)",
          u.id,
          p.id,
          q.id,
          JSON.stringify(next),
        );
        if (!correct && r.mode === "practice")
          r.queue.splice(Math.min(2, r.queue.length), 0, {
            ...entry,
            retry: true,
            order: q.options ? shuffle(q.options.map((_, i) => i)) : undefined,
          });
      } else r.retries++;
      r.done = !r.queue.length;
      run("UPDATE rounds SET body=? WHERE id=?", JSON.stringify(r), r.id);
      return {
        correct: r.mode === "test" ? null : correct,
        explanation: r.mode === "test" ? null : q.explanation,
        solution: r.mode === "test" ? null : solution(q),
        ...roundView(r, p),
      };
    });
  }
  if (route === "/api/rounds/close" && req.method === "POST") {
    const u = learner(req);
    const row = get(
      "SELECT * FROM rounds WHERE id=? AND user_id=?",
      b.round || "",
      u.id,
    );
    if (!row) fail("Lernrunde nicht gefunden.", 404);
    const r = JSON.parse(row.body);
    r.done = true;
    r.abandoned = true;
    run("UPDATE rounds SET body=? WHERE id=?", JSON.stringify(r), r.id);
    return { ok: true };
  }
  fail("Nicht gefunden.", 404);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  res.setHeader("Cache-Control", "no-store");
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      limit(req);
      if (!["GET", "POST"].includes(req.method))
        fail("Methode nicht erlaubt.", 405);
      if (req.method === "POST") {
        const origin = req.headers.origin,
          allowed = DEMO
            ? `${new URL(origin || ORIGIN).protocol}//${req.headers.host}`
            : ORIGIN;
        if (origin !== allowed) fail("Ungültiger Ursprung der Anfrage.", 403);
        if (!req.headers["content-type"]?.startsWith("application/json"))
          fail("JSON erwartet.", 415);
      }
      const result = await api(req, res, url);
      res.writeHead(200, { "Content-Type": types[".json"] });
      res.end(JSON.stringify(result));
    } else {
      if (req.method !== "GET") fail("Methode nicht erlaubt.", 405);
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const permitted = [
        "index.html",
        "style.css",
        "app.js",
        "KI-VORLAGE.md",
        "beispielpaket.json",
      ];
      if (!permitted.includes(name)) fail("Nicht gefunden.", 404);
      let file;
      try {
        file = readFileSync(resolve(root, "public", name));
      } catch {
        fail("Nicht gefunden.", 404);
      }
      const ext = "." + name.split(".").pop();
      res.writeHead(200, {
        "Content-Type": types[ext] || "text/plain; charset=utf-8",
      });
      res.end(file);
    }
  } catch (e) {
    res.writeHead(e.status || 400, { "Content-Type": types[".json"] });
    res.end(
      JSON.stringify({
        error: e.status
          ? e.message
          : "Die Anfrage konnte nicht verarbeitet werden. Bitte erneut versuchen.",
      }),
    );
    if (!e.status) console.error(e.name, e.message);
  }
});
const cleanup = setInterval(() => {
  for (const table of ["sessions", "challenges", "invites"])
    run(`DELETE FROM ${table} WHERE expires<?`, Date.now());
}, 60000);
cleanup.unref();
server.listen(PORT, process.env.HOST || "127.0.0.1", () =>
  console.log(`Lernreise ${DEMO ? "(Demo) " : ""}auf Port ${PORT}`),
);
for (const sig of ["SIGTERM", "SIGINT"])
  process.on(sig, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
