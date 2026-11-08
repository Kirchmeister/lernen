import test from "node:test";
import assert from "node:assert/strict";
import { validatePack, grade, advance, publicQuestion } from "../learning.mjs";
import { packs } from "../examples/create-demo.mjs";
test("Beispielpakete erfüllen das Importformat", () => {
  for (const p of packs) assert.equal(validatePack(p), p);
});
test("Ungültige Lösungsindizes und doppelte IDs werden abgelehnt", () => {
  const p = structuredClone(packs[1]);
  p.questions[0].correct = 999;
  assert.throws(() => validatePack(p), /Lösungsindex/);
  const d = structuredClone(packs[0]);
  d.questions.push(d.questions[0]);
  assert.throws(() => validatePack(d), /Doppelte ID/);
});
test("Textbewertung: Leerzeichen, Großschreibung, Akzente und erlaubte Varianten", () => {
  const q = {
    type: "input",
    answers: ["Schüler", "Lernender"],
    accentSensitive: true,
  };
  assert.equal(grade(q, "  SCHÜLER  "), true);
  assert.equal(grade(q, "schuler"), false);
  assert.equal(grade(q, "Lernender"), true);
  assert.equal(grade({ ...q, accentSensitive: false }, "schuler"), true);
  assert.equal(grade({ ...q, caseSensitive: true }, "schüler"), false);
  assert.equal(grade(q, "Schüler!"), false);
  assert.equal(grade({ ...q, punctuationSensitive: false }, "Schüler!"), true);
});
test("Zahlen: Dezimalkomma und Toleranz; leere und ungültige Werte sind falsch", () => {
  const q = { type: "number", answer: 6, tolerance: 0.1 };
  assert.equal(grade(q, "6,05"), true);
  assert.equal(grade(q, "6.1"), true);
  assert.equal(grade(q, "6.2"), false);
  assert.equal(grade(q, ""), false);
  assert.equal(grade(q, "6 m/s"), false);
  assert.equal(grade(q, null), false);
});
test("Auswahl akzeptiert ausschließlich den richtigen ganzzahligen Index", () => {
  const q = { type: "choice", correct: 1 };
  assert.equal(grade(q, 1), true);
  assert.equal(grade(q, 0), false);
  assert.equal(grade(q, "1"), false);
});
test("Archiv erst nach drei verschiedenen Tagen; Fehler setzen Lernstand zurück", () => {
  let p = advance(null, true, "2026-11-08");
  assert.equal(p.streak, 1);
  p = advance(p, true, "2026-11-08");
  assert.equal(p.streak, 1);
  p = advance(p, true, "2026-11-09");
  assert.equal(p.archived, false);
  p = advance(p, true, "2026-11-10");
  assert.equal(p.archived, true);
  p = advance(p, false, "2026-11-11");
  assert.equal(p.streak, 0);
  assert.equal(p.archived, false);
  p = advance(p, true, "2026-11-11");
  assert.equal(p.streak, 0);
  p = advance(p, true, "2026-11-12");
  assert.equal(p.streak, 1);
});
test("Öffentliche Fragen enthalten keine Lösungen", () => {
  for (const p of packs)
    for (const q of p.questions) {
      const publicQ = publicQuestion(q);
      for (const key of ["answer", "answers", "correct", "explanation"])
        assert.equal(key in publicQ, false);
    }
});
