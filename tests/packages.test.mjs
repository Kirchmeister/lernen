import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { packageStore } from "../package-store.mjs";
import { packs } from "../examples/create-demo.mjs";

function fixture(legacy = true) {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id TEXT PRIMARY KEY,family TEXT,name TEXT,role TEXT);
    CREATE TABLE packages(family TEXT,id TEXT,body TEXT,PRIMARY KEY(family,id));
    CREATE TABLE progress(user_id TEXT,pack TEXT,qid TEXT,body TEXT,PRIMARY KEY(user_id,pack,qid));
    CREATE TABLE rounds(id TEXT PRIMARY KEY,user_id TEXT,pack TEXT,body TEXT,created INTEGER);
    CREATE TABLE attempts(id INTEGER PRIMARY KEY,user_id TEXT,pack TEXT,qid TEXT,correct INTEGER,created INTEGER);
    INSERT INTO users VALUES('a','family','Kind A','student'),('b','family','Kind B','student'),('p','family','Eltern','parent'),('other','other-family','Fremdes Kind','student');`);
  const p = structuredClone(packs[0]),
    u = { family: "family", name: "Eltern" };
  if (legacy)
    db.prepare("INSERT INTO packages VALUES(?,?,?)").run(
      u.family,
      p.id,
      JSON.stringify(p),
    );
  return { db, p, u, store: packageStore(db) };
}

test("Migration erhält vorhandene Freigaben, wiederholt sich nicht und erfindet keine alten Importdaten", () => {
  const { db, p, u, store } = fixture();
  try {
    assert.deepEqual(store.assigned(u, p.id), ["a", "b"]);
    assert.equal(store.detail(u, p.id).created, null);
    assert.equal(store.detail(u, p.id).revision, 1);
    store.assign(u, p.id, ["a"], 1, ["a", "b"]);
    db.exec("INSERT INTO users VALUES('new','family','Neues Kind','student')");
    const restarted = packageStore(db);
    assert.deepEqual(restarted.assigned(u, p.id), ["a"]);
    assert.equal(restarted.detail(u, p.id).history.length, 1);
    assert.equal(
      restarted.canLearn({ family: "family", id: "new" }, p.id),
      false,
    );
  } finally {
    db.close();
  }
});

test("Neue Pakete sind privat; Zuweisung validiert Familie, Rollen und veraltete Ansichten", () => {
  const { db, p, u, store } = fixture(false);
  try {
    store.save(u, p, 0);
    assert.deepEqual(store.assigned(u, p.id), []);
    for (const children of [["other"], ["p"], ["a", "a"], ["missing"]])
      assert.throws(() => store.assign(u, p.id, children, 1, []));
    store.assign(u, p.id, ["a", "b"], 1, []);
    assert.equal(store.canLearn({ family: "family", id: "a" }, p.id), true);
    assert.equal(
      store.canLearn({ family: "other-family", id: "a" }, p.id),
      false,
    );
    assert.throws(
      () => store.assign(u, p.id, [], 1, []),
      (e) => e.status === 409,
    );
    assert.throws(
      () => store.save(u, p, 0),
      (e) => e.status === 409,
    );
    assert.throws(
      () => store.detail({ family: "other-family" }, p.id),
      (e) => e.status === 404,
    );
    assert.throws(
      () => store.remove({ family: "other-family" }, p.id, 1, []),
      (e) => e.status === 404,
    );
  } finally {
    db.close();
  }
});

test("Versionen zeigen echte Änderungen und erhalten nur unveränderte Lernstände", () => {
  const { db, p, u, store } = fixture();
  try {
    const q = p.questions[0],
      unchanged = p.questions[1],
      removed = p.questions[2];
    for (const user of ["a", "b", "other"])
      for (const question of [q, unchanged, removed])
        db.prepare("INSERT INTO progress VALUES(?,?,?,?)").run(
          user,
          p.id,
          question.id,
          '{"streak":2}',
        );
    const reordered = Object.fromEntries(Object.entries(p).reverse());
    reordered.questions = reordered.questions.map((q) =>
      Object.fromEntries(Object.entries(q).reverse()),
    );
    assert.equal(store.plan(u, reordered).kind, "unchanged");
    store.save(u, reordered, 1);
    assert.equal(store.detail(u, p.id).history.length, 1);
    const changed = structuredClone(p);
    changed.questions[0].prompt += " Neue Formulierung.";
    changed.questions.splice(2, 1);
    changed.questions.push({ ...structuredClone(q), id: "new-question" });
    const plan = store.plan(u, changed);
    assert.equal(plan.changes.changed.length, 1);
    assert.equal(plan.changes.removed.length, 1);
    assert.equal(plan.changes.added.length, 1);
    store.save(u, changed, 1);
    assert.deepEqual(store.assigned(u, p.id), ["a", "b"]);
    const d = store.detail(u, p.id);
    assert.equal(d.revision, 2);
    assert.equal(d.history.length, 2);
    assert.equal(d.questionVersions[q.id], 2);
    assert.equal(d.questionVersions[unchanged.id], 1);
    assert.equal(store.detail(u, p.id, 1).pack.questions[0].prompt, q.prompt);
    assert.equal(
      db.prepare("SELECT count(*) n FROM progress WHERE user_id='a'").get().n,
      1,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM progress WHERE user_id='other'").get()
        .n,
      3,
    );
    assert.throws(
      () => store.save(u, p, 1),
      (e) => e.status === 409,
    );
  } finally {
    db.close();
  }
});

test("Entzug beendet offene Runden und erhält Fortschritt; Löschen ist familienbegrenzt", () => {
  const { db, p, u, store } = fixture();
  try {
    for (const user of ["a", "other"]) {
      db.prepare("INSERT INTO progress VALUES(?,?,?,?)").run(
        user,
        p.id,
        p.questions[0].id,
        '{"streak":1}',
      );
      db.prepare(
        "INSERT INTO attempts(user_id,pack,qid,correct,created) VALUES(?,?,?,?,?)",
      ).run(user, p.id, p.questions[0].id, 1, 1);
      db.prepare("INSERT INTO rounds VALUES(?,?,?,?,?)").run(
        user,
        user,
        p.id,
        '{"done":false}',
        1,
      );
    }
    const changed = structuredClone(p);
    changed.title += " neu";
    assert.throws(() => store.save(u, changed, 1), /gerade bearbeitet/);
    assert.throws(
      () => store.remove(u, p.id, 1, ["a", "b"]),
      (e) => e.status === 409,
    );
    store.assign(u, p.id, ["b"], 1, ["a", "b"]);
    assert.deepEqual(
      JSON.parse(db.prepare("SELECT body FROM rounds WHERE id='a'").get().body),
      { done: true, abandoned: true },
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM progress WHERE user_id='a'").get().n,
      1,
    );
    store.assign(u, p.id, ["a", "b"], 1, ["b"]);
    assert.equal(
      db.prepare("SELECT count(*) n FROM progress WHERE user_id='a'").get().n,
      1,
    );
    store.remove(u, p.id, 1, ["a", "b"]);
    for (const table of ["progress", "rounds", "attempts"]) {
      assert.equal(
        db.prepare(`SELECT count(*) n FROM ${table} WHERE user_id='a'`).get().n,
        0,
      );
      assert.equal(
        db
          .prepare(`SELECT count(*) n FROM ${table} WHERE user_id='other'`)
          .get().n,
        1,
      );
    }
    assert.equal(
      db.prepare("SELECT count(*) n FROM package_revisions").get().n,
      0,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM package_assignments").get().n,
      0,
    );
    store.save(u, p, 0);
    assert.deepEqual(store.assigned(u, p.id), []);
  } finally {
    db.close();
  }
});
