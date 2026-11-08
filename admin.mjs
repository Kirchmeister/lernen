import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash } from "node:crypto";
import { existsSync } from "node:fs";
const path = process.env.DATA_PATH || "data/lernreise.sqlite";
if (!existsSync(path))
  throw Error(
    "Datenbank nicht gefunden. Server zuerst starten oder DATA_PATH setzen.",
  );
const db = new DatabaseSync(path);
db.exec("PRAGMA busy_timeout=5000;");
const [command, id] = process.argv.slice(2);
if (command === "list")
  console.table(db.prepare("SELECT id,name,role FROM users").all());
else if (command === "recover") {
  const u = db.prepare("SELECT * FROM users WHERE id=?").get(id || "");
  if (!u)
    throw Error(
      "Konto nicht gefunden. Zuerst „node admin.mjs list“ verwenden.",
    );
  const token = randomBytes(24).toString("base64url"),
    hash = createHash("sha256").update(token).digest("hex");
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const t of ["sessions", "credentials", "invites"])
      db.prepare(`DELETE FROM ${t} WHERE user_id=?`).run(u.id);
    // Offene Registrierungen dürfen keinen widerrufenen Zugang wiederherstellen.
    db.prepare(
      "DELETE FROM challenges WHERE json_extract(payload,'$.user.id')=?",
    ).run(u.id);
    db.prepare("INSERT INTO invites VALUES(?,?,?)").run(
      hash,
      u.id,
      Date.now() + 30 * 60000,
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  console.log(
    `Alle bisherigen Passkeys und Sitzungen für ${u.name} widerrufen. Neuer Einrichtungslink (30 Minuten):`,
  );
  console.log(
    `${process.env.ORIGIN || "http://localhost:3000"}/?setup=${token}`,
  );
} else
  console.log(
    "Verwendung: node admin.mjs list | node admin.mjs recover <konto-id>",
  );
db.close();
