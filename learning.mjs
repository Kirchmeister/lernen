export function validatePack(p) {
  const fail = (m) => {
    throw new Error(m);
  };
  const text = (v, n, max = 500) => {
    if (typeof v !== "string" || !v.trim() || v.length > max)
      fail(`${n}: gültigen Text angeben.`);
  };
  if (!p || p.version !== 1) fail("Das Paket benötigt version: 1.");
  for (const key of ["id", "title", "subject", "topic"]) text(p[key], key, 120);
  if (!/^[a-zA-Z0-9_-]+$/.test(p.id))
    fail("Paket-ID: nur Buchstaben, Zahlen, _ und -.");
  if (!Number.isInteger(p.grade) || p.grade < 1 || p.grade > 13)
    fail("Klassenstufe muss zwischen 1 und 13 liegen.");
  if (
    !Array.isArray(p.questions) ||
    p.questions.length < 1 ||
    p.questions.length > 300
  )
    fail("Ein Paket benötigt 1 bis 300 Aufgaben.");
  const ids = new Set();
  for (const q of p.questions) {
    if (!q || typeof q !== "object") fail("Ungültige Aufgabe.");
    text(q.id, "Aufgaben-ID", 100);
    if (ids.has(q.id)) fail(`Doppelte ID: ${q.id}`);
    ids.add(q.id);
    text(q.prompt, "Frage", 2000);
    text(q.explanation, "Erklärung", 2000);
    if (!["input", "choice", "number"].includes(q.type))
      fail(`Unbekannter Aufgabentyp: ${q.type}`);
    if (q.type === "choice") {
      if (
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        q.options.length > 6
      )
        fail("Auswahlfragen brauchen 2 bis 6 Optionen.");
      q.options.forEach((o) => text(o, "Option", 500));
      if (new Set(q.options).size !== q.options.length)
        fail("Antwortoptionen müssen unterschiedlich sein.");
      if (
        !Number.isInteger(q.correct) ||
        q.correct < 0 ||
        q.correct >= q.options.length
      )
        fail("Ungültiger Lösungsindex.");
    }
    if (q.type === "input") {
      if (
        !Array.isArray(q.answers) ||
        !q.answers.length ||
        q.answers.length > 20
      )
        fail("Eingabeaufgaben brauchen 1 bis 20 Lösungen.");
      q.answers.forEach((a) => text(a, "Lösung", 300));
      for (const k of [
        "caseSensitive",
        "accentSensitive",
        "punctuationSensitive",
      ])
        if (q[k] !== undefined && typeof q[k] !== "boolean")
          fail(`${k} muss true oder false sein.`);
    }
    if (q.type === "number") {
      if (
        typeof q.answer !== "number" ||
        !Number.isFinite(q.answer) ||
        typeof (q.tolerance ?? 0) !== "number" ||
        !Number.isFinite(q.tolerance ?? 0) ||
        (q.tolerance ?? 0) < 0
      )
        fail("Zahlenaufgabe: ungültige Lösung oder Toleranz.");
      text(q.unit, "Einheit", 40);
    }
  }
  return p;
}
export function normalize(s, q = {}) {
  let v = String(s).normalize("NFC").trim().replace(/\s+/g, " ");
  if (!q.caseSensitive) v = v.toLocaleLowerCase("de");
  if (q.accentSensitive === false)
    v = v.normalize("NFD").replace(/\p{M}/gu, "");
  if (q.punctuationSensitive === false) v = v.replace(/\p{P}/gu, "");
  return v;
}
export function grade(q, value) {
  if (q.type === "choice")
    return Number.isInteger(value) && value === q.correct;
  if (q.type === "number") {
    if (typeof value !== "string" && typeof value !== "number") return false;
    const s = String(value).trim().replace(",", ".");
    return (
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) &&
      Math.abs(Number(s) - q.answer) <= (q.tolerance ?? 0) + 1e-10
    );
  }
  return (
    typeof value === "string" &&
    q.answers.some((a) => normalize(a, q) === normalize(value, q))
  );
}
export function advance(old, correct, day) {
  const p = {
    streak: old?.streak ?? 0,
    lastDay: old?.lastDay ?? null,
    archived: !!old?.archived,
  };
  if (!correct) {
    p.streak = 0;
    p.lastDay = day;
    p.archived = false;
    return p;
  }
  if (p.lastDay !== day) p.streak++;
  p.lastDay = day;
  p.archived = p.streak >= 3;
  return p;
}
export function publicQuestion(q) {
  const { id, type, prompt, options, unit } = q;
  return { id, type, prompt, options, unit };
}
export function solution(q) {
  return q.type === "choice"
    ? q.options[q.correct]
    : q.type === "number"
      ? `${q.answer} ${q.unit}`
      : q.answers.join(" / ");
}
