import { validatePack } from "./learning.mjs";

// Objektfeld-Reihenfolge ist keine Inhaltsänderung. Reihenfolgen in Listen
// (insbesondere Auswahlantworten mit Lösungsindex) bleiben dagegen bedeutsam.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function changes(before, after) {
  const previous = new Map((before?.questions || []).map((q) => [q.id, q]));
  const next = new Map(after.questions.map((q) => [q.id, q]));
  const added = [],
    changed = [],
    unchanged = [],
    removed = [];
  for (const q of after.questions) {
    const old = previous.get(q.id);
    (old
      ? canonical(old) === canonical(q)
        ? unchanged
        : changed
      : added
    ).push({ id: q.id, prompt: q.prompt });
  }
  for (const q of previous.values())
    if (!next.has(q.id)) removed.push({ id: q.id, prompt: q.prompt });
  return { added, changed, removed, unchanged };
}

export function packageStore(db) {
  const get = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const fail = (message, status = 400) => {
    throw Object.assign(new Error(message), { status });
  };
  const tx = (fn) => {
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
  // Einmalige, atomare Übernahme: Bestehende Kinder behalten ihren Zugang.
  // Neue Kinder/Pakete erhalten anschließend niemals implizite Zuweisungen.
  tx(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations(id TEXT PRIMARY KEY, applied INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS package_revisions(family TEXT NOT NULL,pack TEXT NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL,created INTEGER,actor TEXT,summary TEXT NOT NULL,PRIMARY KEY(family,pack,revision));
      CREATE TABLE IF NOT EXISTS package_assignments(family TEXT NOT NULL,pack TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(family,pack,user_id));
    `);
    if (
      !get("SELECT id FROM schema_migrations WHERE id='package-management-v1'")
    ) {
      for (const row of all("SELECT * FROM packages")) {
        const p = JSON.parse(row.body);
        run(
          "INSERT INTO package_revisions VALUES(?,?,?,?,?,?,?)",
          row.family,
          row.id,
          1,
          row.body,
          null,
          null,
          JSON.stringify(changes(null, p)),
        );
        run(
          "INSERT INTO package_assignments SELECT family,?,id FROM users WHERE family=? AND role='student'",
          row.id,
          row.family,
        );
      }
      run(
        "INSERT INTO schema_migrations VALUES(?,?)",
        "package-management-v1",
        Date.now(),
      );
    }
  });
  const current = (u, id) =>
    get(
      "SELECT * FROM package_revisions WHERE family=? AND pack=? ORDER BY revision DESC LIMIT 1",
      u.family,
      id,
    );
  const assigned = (u, id) =>
    all(
      "SELECT user_id FROM package_assignments WHERE family=? AND pack=? ORDER BY user_id",
      u.family,
      id,
    ).map((r) => r.user_id);
  const checkChildren = (u, ids) => {
    if (
      !Array.isArray(ids) ||
      ids.length > 100 ||
      new Set(ids).size !== ids.length
    )
      fail("Bitte gültige Schülerkonten auswählen.");
    for (const id of ids)
      if (
        typeof id !== "string" ||
        !get(
          "SELECT id FROM users WHERE id=? AND family=? AND role='student'",
          id,
          u.family,
        )
      )
        fail("Schülerkonto gehört nicht zu deiner Familie.");
    return [...ids].sort();
  };
  const checkVersion = (row, expected) => {
    if (!Number.isInteger(expected) || expected !== (row?.revision || 0))
      fail(
        "Das Paket wurde inzwischen geändert. Bitte neu öffnen und die aktuelle Version prüfen.",
        409,
      );
  };
  const checkAssignments = (u, id, expected) => {
    if (
      !Array.isArray(expected) ||
      canonical([...expected].sort()) !== canonical(assigned(u, id))
    )
      fail("Die Zuordnung wurde inzwischen geändert. Bitte neu öffnen.", 409);
  };
  const need = (u, id) => {
    if (typeof id !== "string") fail("Paket-ID fehlt.");
    const row = current(u, id);
    if (!row) fail("Lernpaket nicht gefunden.", 404);
    return row;
  };
  const summary = (r) => ({
    revision: r.revision,
    created: r.created,
    actor: r.actor,
    changes: JSON.parse(r.summary),
  });
  const plan = (u, p) => {
    validatePack(p);
    const row = current(u, p.id);
    const same = !!row && canonical(JSON.parse(row.body)) === canonical(p);
    return {
      ok: true,
      title: p.title,
      subject: p.subject,
      count: p.questions.length,
      currentRevision: row?.revision || 0,
      nextRevision: (row?.revision || 0) + (same ? 0 : 1),
      kind: !row ? "new" : same ? "unchanged" : "update",
      assignedTo: assigned(u, p.id),
      previousTitle: row ? JSON.parse(row.body).title : null,
      changes: changes(row ? JSON.parse(row.body) : null, p),
    };
  };
  const replaceAssignments = (u, id, ids) => {
    const removed = assigned(u, id).filter((x) => !ids.includes(x));
    // Entzug schließt offene Runden, behält aber bereits erworbene Lernstände.
    for (const child of removed)
      run(
        "UPDATE rounds SET body=json_set(body,'$.done',json('true'),'$.abandoned',json('true')) WHERE user_id=? AND pack=? AND json_extract(body,'$.done')=0",
        child,
        id,
      );
    run(
      "DELETE FROM package_assignments WHERE family=? AND pack=?",
      u.family,
      id,
    );
    for (const child of ids)
      run("INSERT INTO package_assignments VALUES(?,?,?)", u.family, id, child);
  };
  return {
    assigned,
    plan,
    canLearn: (u, id) =>
      !!get(
        "SELECT 1 FROM package_assignments WHERE family=? AND pack=? AND user_id=?",
        u.family,
        id,
        u.id,
      ),
    metadata(u, id) {
      const row = need(u, id);
      return {
        revision: row.revision,
        updatedAt: row.created,
        assignedTo: assigned(u, id),
      };
    },
    detail(u, id, version) {
      const latest = need(u, id);
      const revision =
        version === undefined ? latest.revision : Number(version);
      if (!Number.isInteger(revision) || revision < 1)
        fail("Ungültige Version.");
      const row = get(
        "SELECT * FROM package_revisions WHERE family=? AND pack=? AND revision=?",
        u.family,
        id,
        revision,
      );
      if (!row) fail("Version nicht gefunden.", 404);
      const history = all(
        "SELECT * FROM package_revisions WHERE family=? AND pack=? ORDER BY revision DESC",
        u.family,
        id,
      );
      const questionVersions = {};
      for (const entry of [...history]
        .reverse()
        .filter((r) => r.revision <= revision)) {
        const diff = JSON.parse(entry.summary);
        for (const q of [...diff.added, ...diff.changed])
          questionVersions[q.id] = entry.revision;
        for (const q of diff.removed) delete questionVersions[q.id];
      }
      return {
        pack: JSON.parse(row.body),
        revision,
        currentRevision: latest.revision,
        created: row.created,
        assignedTo: assigned(u, id),
        history: history.map(summary),
        questionVersions,
      };
    },
    save(u, p, expected, children, expectedAssigned) {
      validatePack(p);
      return tx(() => {
        const row = current(u, p.id);
        checkVersion(row, expected);
        const info = plan(u, p);
        const ids =
          children === undefined ? info.assignedTo : checkChildren(u, children);
        if (children !== undefined) checkAssignments(u, p.id, expectedAssigned);
        if (info.kind !== "unchanged") {
          if (
            get(
              "SELECT id FROM rounds WHERE pack=? AND user_id IN (SELECT id FROM users WHERE family=?) AND json_extract(body,'$.done')=0",
              p.id,
              u.family,
            )
          )
            fail(
              "Dieses Paket wird gerade bearbeitet. Bitte die Lernrunde zuerst beenden.",
            );
          for (const q of [...info.changes.changed, ...info.changes.removed])
            run(
              "DELETE FROM progress WHERE pack=? AND qid=? AND user_id IN (SELECT id FROM users WHERE family=?)",
              p.id,
              q.id,
              u.family,
            );
          const body = JSON.stringify(p);
          run(
            "INSERT INTO package_revisions VALUES(?,?,?,?,?,?,?)",
            u.family,
            p.id,
            info.nextRevision,
            body,
            Date.now(),
            u.name || "Demo",
            JSON.stringify(info.changes),
          );
          run(
            "INSERT OR REPLACE INTO packages VALUES(?,?,?)",
            u.family,
            p.id,
            body,
          );
        }
        replaceAssignments(u, p.id, ids);
        return {
          ok: true,
          ...info,
          revision: info.nextRevision,
          assignedTo: ids,
        };
      });
    },
    assign(u, id, children, expected, expectedAssigned) {
      return tx(() => {
        checkVersion(need(u, id), expected);
        checkAssignments(u, id, expectedAssigned);
        const ids = checkChildren(u, children);
        replaceAssignments(u, id, ids);
        return { ok: true, assignedTo: ids };
      });
    },
    remove(u, id, expected, expectedAssigned) {
      return tx(() => {
        checkVersion(need(u, id), expected);
        checkAssignments(u, id, expectedAssigned);
        if (
          get(
            "SELECT id FROM rounds WHERE pack=? AND user_id IN (SELECT id FROM users WHERE family=?) AND json_extract(body,'$.done')=0",
            id,
            u.family,
          )
        )
          fail(
            "Dieses Paket wird gerade bearbeitet. Bitte die Runde beenden oder zuerst die Zuordnung entfernen.",
            409,
          );
        for (const table of ["progress", "attempts", "rounds"])
          run(
            `DELETE FROM ${table} WHERE pack=? AND user_id IN (SELECT id FROM users WHERE family=?)`,
            id,
            u.family,
          );
        for (const table of ["package_revisions", "package_assignments"])
          run(`DELETE FROM ${table} WHERE family=? AND pack=?`, u.family, id);
        run("DELETE FROM packages WHERE family=? AND id=?", u.family, id);
        return { ok: true };
      });
    },
  };
}
