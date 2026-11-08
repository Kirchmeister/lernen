import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  randomBytes,
  generateKeyPairSync,
  createHash,
  sign,
} from "node:crypto";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sha = (b) => createHash("sha256").update(b).digest();
// Kleiner CBOR-Encoder für einen ausschließlich im Test verwendeten Authenticator.
function cbor(v) {
  const head = (major, n) =>
    n < 24
      ? Buffer.from([major * 32 + n])
      : n < 256
        ? Buffer.from([major * 32 + 24, n])
        : Buffer.from([major * 32 + 25, n >> 8, n & 255]);
  if (typeof v === "number") return v < 0 ? head(1, -v - 1) : head(0, v);
  if (typeof v === "string") {
    const b = Buffer.from(v);
    return Buffer.concat([head(3, b.length), b]);
  }
  if (Buffer.isBuffer(v)) return Buffer.concat([head(2, v.length), v]);
  if (v instanceof Map)
    return Buffer.concat([
      head(5, v.size),
      ...[...v].flatMap(([k, x]) => [cbor(k), cbor(x)]),
    ]);
  throw Error("Unsupported test CBOR");
}
const b64 = (b) => b.toString("base64url");
function authenticator() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    }),
    jwk = publicKey.export({ format: "jwk" }),
    id = randomBytes(32);
  const cose = cbor(
    new Map([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x, "base64url")],
      [-3, Buffer.from(jwk.y, "base64url")],
    ]),
  );
  let count = 0;
  return {
    registration(o, origin) {
      const data = Buffer.from(
        JSON.stringify({
          type: "webauthn.create",
          challenge: o.challenge,
          origin,
          crossOrigin: false,
        }),
      );
      const len = Buffer.alloc(2);
      len.writeUInt16BE(id.length);
      const auth = Buffer.concat([
        sha(Buffer.from(o.rp.id)),
        Buffer.from([0x45]),
        Buffer.alloc(4),
        Buffer.alloc(16),
        len,
        id,
        cose,
      ]);
      return {
        id: b64(id),
        rawId: b64(id),
        type: "public-key",
        clientExtensionResults: {},
        response: {
          clientDataJSON: b64(data),
          attestationObject: b64(
            cbor(
              new Map([
                ["fmt", "none"],
                ["attStmt", new Map()],
                ["authData", auth],
              ]),
            ),
          ),
          transports: ["internal"],
        },
      };
    },
    authentication(o, origin) {
      const data = Buffer.from(
        JSON.stringify({
          type: "webauthn.get",
          challenge: o.challenge,
          origin,
          crossOrigin: false,
        }),
      );
      const counter = Buffer.alloc(4);
      counter.writeUInt32BE(++count);
      const auth = Buffer.concat([
        sha(Buffer.from(o.rpId)),
        Buffer.from([0x05]),
        counter,
      ]);
      return {
        id: b64(id),
        rawId: b64(id),
        type: "public-key",
        clientExtensionResults: {},
        response: {
          clientDataJSON: b64(data),
          authenticatorData: b64(auth),
          signature: b64(
            sign("sha256", Buffer.concat([auth, sha(data)]), privateKey),
          ),
          userHandle: null,
        },
      };
    },
  };
}
test("Passkeys: echte Signaturprüfung, einmalige Challenges, Einladungen und Rollen", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lernreise-passkey-")),
    port = 34874,
    origin = `http://localhost:${port}`,
    token = randomBytes(32).toString("hex");
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      DEMO_MODE: "false",
      SETUP_TOKEN: token,
      ORIGIN: origin,
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
  function client() {
    const jar = new Map();
    return async (path, data) => {
      const res = await fetch(origin + "/api/" + path, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          Cookie: [...jar].map(([k, v]) => k + "=" + v).join("; "),
          ...(data === undefined
            ? {}
            : { Origin: origin, "Content-Type": "application/json" }),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      for (const s of res.headers.getSetCookie()) {
        const [k, ...v] = s.split(";")[0].split("=");
        jar.set(k, v.join("="));
      }
      return { status: res.status, body: await res.json() };
    };
  }
  try {
    await ready;
    const parent = client(),
      auth = authenticator();
    assert.equal((await parent("demo", { role: "parent" })).status, 404);
    const options = (
      await parent("auth/register/options", { token, name: "Richard" })
    ).body;
    assert.ok(options.challenge);
    const att = auth.registration(options, origin);
    assert.equal((await parent("auth/register/verify", att)).status, 200);
    assert.equal((await parent("auth/register/verify", att)).status, 400);
    assert.equal((await parent("state")).body.user.role, "parent");
    const stranger = client();
    assert.equal(
      (
        await stranger("auth/register/options", {
          token,
          name: "Andere Person",
        })
      ).status,
      403,
    );
    await parent("logout", {});
    const o = (await parent("auth/login/options", {})).body;
    const wrong = auth.authentication(o, "https://evil.invalid");
    assert.equal((await parent("auth/login/verify", wrong)).status, 400);
    const good = (await parent("auth/login/options", {})).body;
    assert.equal(
      (await parent("auth/login/verify", auth.authentication(good, origin)))
        .status,
      200,
    );
    const invite = (await parent("children", { name: "Kind" })).body.token;
    assert.ok(invite);
    const student = client(),
      studentAuth = authenticator();
    const so = (await student("auth/register/options", { token: invite })).body;
    assert.equal(
      (
        await student(
          "auth/register/verify",
          studentAuth.registration(so, origin),
        )
      ).status,
      200,
    );
    assert.equal((await student("state")).body.user.role, "student");
    assert.equal(
      (await student("children", { name: "Unzulässig" })).status,
      403,
    );
    assert.equal(
      (await stranger("auth/register/options", { token: invite })).status,
      403,
    );
    // Auf einem geteilten Gerät hat eine Einladung Vorrang vor der bestehenden Sitzung.
    const secondInvite = (await parent("children", { name: "Zweites Kind" }))
      .body.token;
    const siblingAuth = authenticator(),
      siblingOptions = (
        await student("auth/register/options", { token: secondInvite })
      ).body;
    assert.equal(
      (
        await student(
          "auth/register/verify",
          siblingAuth.registration(siblingOptions, origin),
        )
      ).status,
      200,
    );
    assert.equal((await student("state")).body.user.name, "Zweites Kind");
  } finally {
    clearTimeout(timer);
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
