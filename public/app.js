const paths = {
  star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L2.2 9.4l6.1-.9Z",
  home: "m3 10 9-7 9 7 M5 9v12h14V9 M9 21v-7h6v7",
  book: "M12 5c-4-3-9-2-9-2v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16",
  award: "M8 14 6 22l6-3 6 3-2-8 M19 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  arrow: "M5 12h14 m-6-6 6 6-6 6",
  leaf: "M20 3C8 2 3 8 6 15s14 4 14-12ZM5 21 16 8",
  check: "m5 12 4 4L19 6",
  bolt: "m13 2-9 12h7l-1 8L21 9h-8Z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  flask: "M9 3h6 M10 3v6L4 19c-.6 1 .2 2 1 2h14c.8 0 1.6-1 1-2L14 9V3 M7 15h10",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18 M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  upload: "M12 16V3 m-5 5 5-5 5 5 M4 15v6h16v-6",
  logout: "M9 3H3v18h6 M9 12h12 m-5-5 5 5-5 5",
  users:
    "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M18 3a4 4 0 0 1 0 8 M18 14a4 4 0 0 1 4 4v3",
  key: "M14 5a5 5 0 1 1-4 8l-7 7H1v-4l8-8a5 5 0 0 1 5-3Z",
  close: "m6 6 12 12 M6 18 18 6",
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.star}"/></svg>`;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const button = (label, act, extra = "", cls = "btn") =>
  `<button type="button" class="${cls}" data-act="${act}" ${extra}>${label}</button>`;
const app = document.querySelector("#app");
let state = null,
  view = "home",
  filter = "Alle",
  round = null,
  feedback = null,
  nextRound = null,
  selected = null,
  pendingPack = null,
  busy = false;
let demo = false;
let setupToken = new URLSearchParams(location.search).get("setup");
// Einrichtungslink nach dem Einlesen aus der sichtbaren Browserhistorie entfernen.
if (setupToken) history.replaceState(null, "", location.pathname);
async function api(path, data) {
  const r = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await r.json();
  if (!r.ok) throw Error(result.error || "Das hat gerade nicht geklappt.");
  return result;
}
let toastTimer;
function toast(s) {
  const t = document.querySelector("#toast");
  t.textContent = s;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 6500);
}
async function load() {
  state = await api("state");
  demo = state.demo;
  render();
}
const meta = (p) =>
  p.subject.toLowerCase().includes("phys")
    ? { cls: "physics", icon: "flask" }
    : p.subject.toLowerCase().includes("latein")
      ? { cls: "latin", icon: "book" }
      : { cls: "english", icon: "globe" };
const brand = () =>
  `<a class="brand" href="/" aria-label="Lernreise Startseite"><span class="brand-mark">${icon("star")}</span><span>lernreise<small>KLEINE SCHRITTE. GROSSES WISSEN.</small></span></a>`;
const pct = (v, total) => (total ? Math.min(100, (v / total) * 100) : 0);
function bar(p) {
  return `<div class="progress-track" role="img" aria-label="${p.learned} von ${p.total} Aufgaben gelernt, ${p.practiced - p.learned} in Übung"><i data-width="${pct(p.learned, p.total)}"></i><i class="practice" data-width="${pct(p.practiced - p.learned, p.total)}"></i></div>`;
}
function render() {
  if (!state) {
    auth();
    return;
  }
  const parent = state.user.role === "parent";
  const nav = parent
    ? [
        ["home", "Elternbereich", "home"],
        ["upload", "Lernpakete", "upload"],
        ["review", "Fragen prüfen", "book"],
        ["settings", "Konten", "users"],
      ]
    : [
        ["home", "Mein Lernraum", "home"],
        ["subjects", "Meine Fächer", "book"],
        ["badges", "Meine Erfolge", "award"],
      ];
  const current =
    nav.find((n) => n[0] === view)?.[1] ||
    (parent ? "Paket prüfen" : "Deine Lernmission");
  app.innerHTML = `${demo ? '<div class="demo-banner">Interaktive Demo · Nur Beispieldaten · Passkeys im Serverbetrieb</div>' : ""}<div class="shell"><aside class="sidebar">${brand()}<nav aria-label="Hauptnavigation">${nav.map(([id, label, ic]) => button(icon(ic) + `<span>${label}</span>`, "navigate", `data-view="${id}" ${view === id ? 'aria-current="page"' : ""}`, `nav-item ${view === id ? "active" : ""}`)).join("")}</nav><div class="sidebar-note">${icon("leaf")}<strong>In deinem Tempo.</strong>Jeder kleine Schritt zählt. Du musst nicht alles auf einmal können.</div><div class="account"><div class="avatar">${esc(state.user.name[0])}</div><div><strong>${esc(state.user.name)}</strong><small>${parent ? "Elternkonto" : "Deine Lernreise"}</small></div>${button(icon("logout"), "logout", 'aria-label="Abmelden"', "icon-button")}</div></aside><div class="workspace"><header class="topbar"><span class="breadcrumb">${parent ? "Familie" : "Dein Lernort"} &nbsp; / &nbsp; ${current}</span><div class="top-right">${!parent ? `<span class="xp">${icon("star")} ${state.stats.xp} Lernpunkte</span>` : ""}${demo ? button(parent ? "Zur Schüleransicht" : "Zum Elternbereich", "switch", "", "demo-switch") : button(icon("logout"), "logout", 'aria-label="Abmelden"', "icon-button")}</div></header><main id="main">${view === "quiz" ? quiz() : parent ? parentPage() : studentPage()}</main></div></div>`;
  app
    .querySelectorAll("[data-width]")
    .forEach((e) => (e.style.width = e.dataset.width + "%"));
  if (view === "quiz" && !feedback)
    setTimeout(() => document.querySelector("#answer")?.focus(), 60);
}
function studentPage() {
  if (view === "badges")
    return `<div class="intro"><div><div class="eyebrow">Das hast du dir erarbeitet</div><h1>Deine kleinen Meilensteine.</h1><p>Hier zählt dein eigener Fortschritt. Ganz ohne Vergleich.</p></div></div><div class="badge-grid">${state.badges.map((b) => `<article class="badge-card ${b.unlocked ? "" : "locked"}"><div class="medal">${icon(b.unlocked ? "award" : "star")}</div><div><h3>${b.title}</h3><p>${b.detail}</p><small>${b.unlocked ? "Geschafft!" : "Wächst mit deiner Lernreise"}</small></div></article>`).join("")}</div>`;
  if (view === "subjects")
    return `<div class="intro"><div><div class="eyebrow">Entdecken & verstehen</div><h1>Worauf bist du neugierig?</h1><p>Such dir ein Thema aus und leg in deinem Tempo los.</p></div></div><div class="filters">${["Alle", ...new Set(state.packages.map((p) => p.subject))].map((s) => button(esc(s), "filter", `data-filter="${esc(s)}" aria-pressed="${filter === s}"`, `filter ${filter === s ? "active" : ""}`)).join("")}</div>${cards(state.packages.filter((p) => filter === "Alle" || p.subject === filter))}`;
  const recommended = state.packages.find((p) => p.learned < p.total);
  return `<div class="intro"><div><div class="eyebrow">Dein Kopf steckt voller Möglichkeiten</div><h1>Hey ${esc(state.user.name)}, bereit für Neues?</h1><p>Ein bisschen üben. Etwas entdecken. Und stolz auf dich sein.</p></div><span class="date-pill">${new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long" }).format(new Date())}</span></div><section class="hero"><div><div class="eyebrow">Deine nächste Lernmission</div><h2>${recommended ? "Kleine Runde.<br>Großer Aha-Moment." : state.packages.length ? "Das sitzt. Gut gemacht!" : "Deine Lernreise wartet."}</h2><p>${recommended ? "Bis zu 10 Aufgaben aus „" + esc(recommended.title) + "“. Schau mal, was du schon kannst." : state.packages.length ? "Du hast alle aktuellen Aufgaben sicher gelernt. Zeit, stolz auf dich zu sein." : "Dir ist noch kein Lernpaket zugeordnet. Deine Eltern können ein Thema für dich auswählen."}</p>${recommended ? button("Mission starten " + icon("arrow"), "start", `data-pack="${esc(recommended.id)}"`, "btn lime") : button("Meine Erfolge ansehen " + icon("arrow"), "navigate", 'data-view="badges"', "btn lime")}</div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit second"></div><div class="planet">${icon("book")}</div><span class="spark">✦</span><span class="spark two">✧</span><span class="float-badge">Ein Schritt weiter. ✦</span></div></section><div class="stats">${stat(
    "check",
    state.packages.reduce((s, p) => s + p.learned, 0),
    "Aufgaben sicher gelernt",
  )}${stat("book", state.stats.answered, "Aufgaben ausprobiert")}${stat("award", state.stats.completed, "Lernrunden geschafft")}</div><div class="section-heading"><h2>Deine Lernwelten</h2>${button("Alle Fächer " + icon("arrow"), "navigate", 'data-view="subjects"', "btn quiet small")}</div>${cards(state.packages)}<div class="encouragement">${icon("leaf")}Du musst es noch nicht können. Dafür bist du hier.</div><div class="footer-note">Kurze Runden. Hilfreiche Erklärungen. Wissen, das bleibt.</div>`;
}
function stat(ic, n, label) {
  return `<div class="stat"><div class="stat-icon">${icon(ic)}</div><div><strong>${n}</strong><span>${label}</span></div></div>`;
}
function cards(packages) {
  return packages.length
    ? `<div class="subject-grid">${packages
        .map((p) => {
          const m = meta(p);
          return `<article class="subject-card"><div class="card-top"><div class="subject-icon ${m.cls}">${icon(m.icon)}</div><span class="tag">Klasse ${p.grade}</span></div><div class="eyebrow">${esc(p.subject)}</div><h3>${esc(p.title)}</h3><p>${esc(p.topic)}</p><div class="progress-label"><span>${p.practiced} von ${p.total} in Übung</span><span>${p.learned} gelernt</span></div>${bar(p)}<div class="card-actions">${button(p.learned === p.total ? "Sicher gelernt " + icon("check") : "Loslernen " + icon("arrow"), "start", `data-pack="${esc(p.id)}" ${p.learned === p.total ? "disabled" : ""}`, "btn light")}${p.learned !== p.total ? button("Test", "start", `data-pack="${esc(p.id)}" data-mode="test" aria-label="Test zu ${esc(p.title)} starten"`, "test-btn") : ""}</div></article>`;
        })
        .join("")}</div>`
    : '<div class="empty">Deine Lernwelten warten noch auf Inhalte.<br>Im Elternbereich lässt sich das erste Lernpaket hochladen.</div>';
}
let packageDetail = null,
  previewIndex = 0,
  previewFeedback = null,
  previewChoice = null;
let importPlan = null;
const when = (value) =>
  value
    ? new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      }).format(new Date(value))
    : "Bestand übernommen · früheres Importdatum unbekannt";
const solutionText = (q) =>
  q.type === "choice"
    ? q.options[q.correct]
    : q.type === "number"
      ? `${q.answer} ${q.unit}`
      : q.answers.join(" / ");
const assignedNames = (ids) =>
  state.children
    .filter((c) => ids.includes(c.id))
    .map((c) => c.name)
    .join(", ") || "Noch keinem Kind zugeordnet";
function childChecks(ids, scope) {
  return `<fieldset class="assignment-fields"><legend>Für welche Kinder?</legend>${state.children.map((c) => `<label class="check-label"><input type="checkbox" data-assignment="${scope}" value="${esc(c.id)}" ${ids.includes(c.id) ? "checked" : ""}><span>${esc(c.name)}</span></label>`).join("") || "<p>Unter „Konten“ zuerst ein Schülerkonto anlegen. Das Paket kann bereits gespeichert werden.</p>"}</fieldset>`;
}
const checkedChildren = (scope) =>
  [...document.querySelectorAll(`[data-assignment="${scope}"]:checked`)].map(
    (e) => e.value,
  );
function changeSummary(diff) {
  return `${diff.added.length} neu · ${diff.changed.length} geändert · ${diff.removed.length} entfernt · ${diff.unchanged.length} unverändert`;
}
function changeList(diff) {
  return `<p>${changeSummary(diff)}</p>${[
    ["Neue Fragen", diff.added],
    ["Geänderte Fragen", diff.changed],
    ["Entfernte Fragen", diff.removed],
  ]
    .filter(([, qs]) => qs.length)
    .map(
      ([title, qs]) =>
        `<details><summary>${title} (${qs.length})</summary><ul>${qs.map((q) => `<li>${esc(q.prompt)} <small>(${esc(q.id)})</small></li>`).join("")}</ul></details>`,
    )
    .join("")}`;
}
function questionList(questions, versions = {}) {
  return `<div class="review-list">${questions.map((q, i) => `<details class="file-preview-item"><summary>${i + 1}. ${esc(q.prompt)}</summary>${versions[q.id] ? `<p class="tag">Zuletzt geändert in Version ${versions[q.id]}</p>` : ""}${q.options ? `<ol type="A">${q.options.map((o, n) => `<li>${esc(o)}${n === q.correct ? " ✓" : ""}</li>`).join("")}</ol>` : ""}<p><b>Lösung:</b> ${esc(solutionText(q))}</p><p>${esc(q.explanation)}</p>${q.type === "input" ? `<small>Großschreibung: ${q.caseSensitive ? "zählt" : "egal"} · Akzente: ${q.accentSensitive === false ? "egal" : "zählen"} · Satzzeichen: ${q.punctuationSensitive === false ? "egal" : "zählen"}</small>` : q.type === "number" ? `<small>Toleranz: ${esc(q.tolerance ?? 0)}</small>` : ""}<p><small>Fragen-ID: ${esc(q.id)}</small></p></details>`).join("")}</div>`;
}
function packageCards(reviewOnly = false) {
  return state.packages.length
    ? `<div class="subject-grid">${state.packages.map((p) => `<article class="subject-card"><div class="card-top"><span class="tag">${esc(p.subject)} · Klasse ${p.grade}</span><span class="tag">Version ${p.revision}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.topic)}</p><p>${p.total} Fragen · ${esc(when(p.updatedAt))}</p><p><b>Zugeordnet:</b> ${esc(assignedNames(p.assignedTo))}</p><div class="package-actions">${button(reviewOnly ? "Fragen ansehen und ausprobieren" : "Verwalten und Fragen prüfen", "package-open", `data-pack="${esc(p.id)}"`, "btn light")}</div></article>`).join("")}</div>`
    : '<div class="empty">Noch keine Lernpakete vorhanden. Unter „Lernpakete“ kannst du eine JSON-Datei importieren.</div>';
}
function packagesPage() {
  return `<div class="intro"><div><div class="eyebrow">Inhalte und Freigaben</div><h1>Deine Lernpakete.</h1><p>Prüfe Versionen und Fragen. Du entscheidest, welches Kind welches Paket sieht.</p></div></div><section class="panel"><h2>Lernpaket importieren</h2><label class="dropzone" for="packfile">${icon("upload")}<strong>JSON-Datei auswählen</strong><span>Bis 1 MB · Formatversion 1</span></label><input type="file" id="packfile" accept=".json,application/json" aria-label="Lernpaket als JSON auswählen"><div id="upload-preview"></div><div class="tools"><a href="/KI-VORLAGE.md" download>KI-Vorlage</a><a href="/beispielpaket.json" download>Beispielpaket</a></div></section><div class="section-heading"><h2>Gespeicherte Pakete (${state.packages.length})</h2></div>${packageCards()}<div class="help space-top">Ein Paket kann mehreren Kindern zugeordnet werden. Jedes Kind hat seinen eigenen Lernstand. Kindernamen stehen nicht in der JSON-Datei. Neue Pakete sind ohne Auswahl zunächst nur im Elternbereich sichtbar.</div>`;
}
async function openPackage(id, revision) {
  packageDetail = await api(
    `packages/detail?id=${encodeURIComponent(id)}${revision ? `&revision=${revision}` : ""}`,
  );
  view = "package";
  render();
  window.scrollTo(0, 0);
}
function packagePage() {
  const d = packageDetail,
    p = d.pack,
    old = d.revision !== d.currentRevision;
  return `<div class="intro"><div><div class="eyebrow">${esc(p.subject)} · Klasse ${p.grade}</div><h1>${esc(p.title)}</h1><p>Version ${d.revision}${old ? ` · Älterer Stand, aktuell ist Version ${d.currentRevision}` : " · Aktueller Stand"} · ${esc(when(d.created))}</p><p>${esc(p.topic)}</p><small>Paket-ID: ${esc(p.id)}</small></div></div><div class="package-actions">${button("Zur Paketübersicht", "navigate", 'data-view="upload"', "btn light")}${button("Alle Fragen ausprobieren", "preview-start")}${button("Diese Version als JSON herunterladen", "package-export", "", "btn light")}</div>${old ? `<div class="help space-top">Du siehst eine frühere Inhaltsversion. Zuordnung und Löschen sind nur beim aktuellen Stand möglich. ${button("Aktuelle Version öffnen", "package-open", `data-pack="${esc(p.id)}"`, "btn light small")}</div>` : `<section class="panel space-top"><h2>Zuordnung zu Kindern</h2><p>Aktuell: ${esc(assignedNames(d.assignedTo))}</p>${childChecks(d.assignedTo, "detail")}${button("Zuordnung speichern", "package-assign")}<p class="space-top">Ohne Häkchen bleibt das Paket nur im Elternbereich. Entfernen einer Zuordnung beendet offene Runden dieses Pakets; bisherige Lernstände bleiben für eine spätere Freigabe erhalten.</p></section>`}<section class="panel space-top"><h2>Versionsverlauf</h2><p>Gleiche Paket-ID: bestehendes Paket aktualisieren. Identischer Inhalt: keine neue Version. Die Formatversion 1 in der Datei ist davon unabhängig.</p><label class="form-field">Version ansehen<select id="package-version">${d.history.map((h) => `<option value="${h.revision}" ${h.revision === d.revision ? "selected" : ""}>Version ${h.revision} · ${esc(when(h.created))}</option>`).join("")}</select></label>${d.history
    .filter((h) => h.revision === d.revision)
    .map(
      (h) =>
        `<p>${h.actor ? `Importiert von ${esc(h.actor)}` : "Bei Einführung der Versionsverwaltung übernommen"}</p>${changeList(h.changes)}`,
    )
    .join(
      "",
    )}</section><section class="panel space-top"><h2>Alle ${p.questions.length} Fragen mit Lösungen</h2><p>Zum Lesen aufklappen oder oben ohne sichtbare Lösung ausprobieren. Die Vorschau verändert keine Schülerdaten.</p>${questionList(p.questions, d.questionVersions)}</section>${old ? "" : `<section class="panel space-top"><h2>Paket löschen</h2><p>Entfernt dieses Paket samt Versionsverlauf, Zuordnungen, Lernständen und bisherigen Antworten für alle Kinder deiner Familie. Dadurch ändern sich auch deren Statistiken und Lernpunkte. Wenn du es nur ausblenden möchtest, entferne stattdessen die Zuordnungen.</p>${button("Paket endgültig löschen", "package-delete", "", "btn danger")}</section>`}`;
}
function previewPage() {
  const d = packageDetail,
    q = d.pack.questions[previewIndex];
  return `<section class="quiz"><div class="quiz-header"><span>Elternvorschau · Version ${d.revision}</span>${button("Vorschau beenden", "preview-close", "", "btn light small")}</div><div class="help">${esc(d.pack.title)} · Alle Fragen in Dateireihenfolge. Keine Lernpunkte, keine Änderungen am Lernstand der Kinder.</div><article class="question-card"><label class="form-field">Frage auswählen<select id="preview-jump">${d.pack.questions.map((x, i) => `<option value="${i}" ${i === previewIndex ? "selected" : ""}>${i + 1}. ${esc(x.prompt.slice(0, 90))}</option>`).join("")}</select></label><div class="eyebrow">Frage ${previewIndex + 1} von ${d.pack.questions.length} · Zuletzt geändert in Version ${d.questionVersions[q.id] || d.revision}</div><h2 id="preview-question">${esc(q.prompt)}</h2><form id="preview-form">${q.type === "choice" ? `<div class="choices" role="group" aria-labelledby="preview-question">${q.options.map((o, i) => button(`<span>${String.fromCharCode(65 + i)}</span>${esc(o)}`, "preview-choose", `data-choice="${i}" aria-pressed="${previewChoice === i}" ${previewFeedback ? "disabled" : ""}`, `choice ${previewChoice === i ? "selected" : ""}`)).join("")}</div>` : `<label class="form-field">Deine Antwort${q.unit ? ` in ${esc(q.unit)}` : ""}<input id="preview-answer" maxlength="500" autocomplete="off" ${q.type === "number" ? 'inputmode="decimal"' : ""} ${previewFeedback ? "disabled" : ""}></label>`}${previewFeedback ? `<div class="feedback ${previewFeedback.correct ? "success" : ""}" role="status"><strong>${previewFeedback.correct ? "Richtig beantwortet." : "Diese Antwort passt noch nicht."}</strong><p><b>Lösung:</b> ${esc(previewFeedback.solution)}</p><p>${esc(previewFeedback.explanation)}</p></div>` : '<button type="submit" class="btn space-top">Antwort prüfen</button>'}</form><div class="package-actions space-top">${button("Zurück", "preview-step", `data-step="-1" ${previewIndex === 0 ? "disabled" : ""}`, "btn light")}${button("Erneut versuchen", "preview-retry", "", "btn light")}${previewIndex + 1 < d.pack.questions.length ? button("Nächste Frage", "preview-step", 'data-step="1"') : button("Zur Fragenübersicht", "preview-close")}</div></article></section>`;
}

function parentPage() {
  if (view === "upload") return packagesPage();
  if (view === "review")
    return `<div class="intro"><div><h1>Fragen selbst ausprobieren.</h1><p>Wähle ein Paket. Du kannst alle Fragen ansehen oder ohne sichtbare Lösungen beantworten. Schülerdaten bleiben unverändert.</p></div></div>${packageCards(true)}`;
  if (view === "package") return packagePage();
  if (view === "preview") return previewPage();
  if (view === "settings")
    return `<div class="intro"><div><div class="eyebrow">Deine Familie</div><h1>Ein eigener Zugang für alle.</h1><p>Jedes Kind lernt mit seinem eigenen Konto und Lernstand.</p></div></div><div class="parent-grid"><section class="panel"><h2>Schülerkonto anlegen</h2><label class="form-field">Vorname<input id="child-name" maxlength="60" autocomplete="off" placeholder="Wie heißt dein Kind?"></label>${button("Einrichtungslink erstellen " + icon("arrow"), "create-child", demo ? "disabled" : "")}<div id="invite-result"></div><p class="space-top">Der Link gilt 30 Minuten. Öffne ihn auf dem Gerät des Kindes, um dort den ersten Passkey einzurichten.</p>${demo ? '<div class="help">In dieser Demo sind Kontenerstellung und Passkeys deaktiviert. Du kannst beide Ansichten mit Beispieldaten ausprobieren.</div>' : ""}</section><section class="panel"><h2>Bestehende Konten</h2>${state.children.map((c) => `<div class="child-row"><h3>${esc(c.name)}</h3><p>Schülerkonto · eigener Lernfortschritt</p>${button("Weiteren Passkey einrichten", "invite", `data-child="${c.id}" ${demo ? "disabled" : ""}`, "btn light small")}</div>`).join("") || "<p>Noch kein Schülerkonto angelegt.</p>"}<div class="space-top">${button(icon("key") + " Eigenen Passkey ergänzen", "add-passkey", demo ? "disabled" : "", "btn light small")}</div><p class="space-top">Ein zweiter Passkey ist ein Ersatz, falls ein Gerät verloren geht. Bei verlorenem Elternzugang hilft die Wiederherstellung über den Server, siehe Anleitung.</p><div id="existing-invite"></div></section></div>`;
  return `<div class="intro"><div><div class="eyebrow">Begleiten statt vergleichen</div><h1>Platz für kleine Fortschritte.</h1><p>Hier siehst du, was schon klappt und wo noch Übung hilft.</p></div></div><section class="hero"><div><div class="eyebrow">Gemeinsam auf Lernreise</div><h2>Neues Wissen beginnt<br>mit einer guten Frage.</h2><p>Bereite ein Thema vor. Dein Kind entdeckt den Rest Schritt für Schritt.</p>${button("Lernpaket hinzufügen " + icon("upload"), "navigate", 'data-view="upload"', "btn lime")}</div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="planet">${icon("leaf")}</div><span class="spark">✦</span></div></section><div class="section-heading"><h2>So läuft die Lernreise</h2><p>${state.children.length} Schülerkonto${state.children.length === 1 ? "" : "en"}</p></div>${
    state.children
      .map(
        (c) =>
          `<section class="panel"><div class="inline"><div class="avatar">${esc(c.name[0])}</div><h3>${esc(c.name)}</h3></div><div class="stats space-top">${stat("book", c.answered, "Aufgaben ausprobiert")}${stat("check", c.correct, "Beim ersten Versuch richtig")}${stat("award", c.learned, "Aufgaben sicher gelernt")}</div><div class="space-top"><h4>Zugeordnete Lernpakete</h4>${
            state.packages
              .filter((p) => p.assignedTo.includes(c.id))
              .map(
                (p) =>
                  `<p>${button(esc(p.title) + ` · Version ${p.revision}`, "package-open", `data-pack="${esc(p.id)}"`, "btn light small")}</p>`,
              )
              .join("") || "<p>Noch kein Lernpaket zugeordnet.</p>"
          }${button("Zuordnungen verwalten", "navigate", 'data-view="upload"', "btn quiet small")}</div><details><summary>Lernpaket erneut üben lassen</summary><p class="space-top">Setzt den Lernstand für dieses Paket zurück. Bisherige Antworten bleiben in der Statistik erhalten.</p><label class="form-field">Lernpaket<select id="reset-${c.id}">${state.packages
            .filter((p) => p.assignedTo.includes(c.id))
            .map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`)
            .join(
              "",
            )}</select></label>${button("Lernstand zurücksetzen", "reset", `data-child="${c.id}"`, "btn light small")}</details></section>`,
      )
      .join("") ||
    '<div class="empty">Lege unter „Konten“ das erste Schülerkonto an.</div>'
  }<div class="help">Eine Aufgabe gilt nach richtigen Antworten an drei verschiedenen Tagen als gelernt. Fehler führen zu mehr Übung. Im Test erfolgt die Rückmeldung erst am Ende. Lernpunkte belohnen auch das Ausprobieren.</div>`;
}
function quiz() {
  if (round.done && !feedback) return results();
  const q = round.question;
  if (!q) return "";
  return `<section class="quiz"><div class="quiz-header"><span>${esc(round.packTitle)} · ${round.mode === "test" ? "Test" : "Lernmission"}</span>${button(icon("close"), "close-round", 'aria-label="Lernrunde beenden"', "icon-button")}</div><div class="quiz-progress"><i data-width="${pct(round.answered, round.total)}"></i></div><article class="question-card"><div class="eyebrow">${round.retry ? "Noch ein Versuch · Du kennst den Weg schon" : `Aufgabe ${Math.min(round.answered + 1, round.total)} von ${round.total}`} · ${q.type === "choice" ? "Wähle eine Antwort" : q.type === "number" ? "Rechne selbst" : "Schreib es auf"}</div><h2 id="question">${esc(q.prompt)}</h2><form id="answer-form">${q.type === "choice" ? `<div class="choices" role="group" aria-labelledby="question">${round.order.map((i, j) => button(`<span>${String.fromCharCode(65 + j)}</span>${esc(q.options[i])}`, "choose", `data-choice="${i}" aria-pressed="${selected === i}" ${feedback ? "disabled" : ""}`, `choice ${selected === i ? "selected" : ""}`)).join("")}</div>` : `<label class="sr-only" for="answer">Deine Antwort${q.unit ? " in " + esc(q.unit) : ""}</label><div class="input-wrap"><input class="answer-input" id="answer" name="answer" autocomplete="off" spellcheck="false" autocapitalize="off" ${q.type === "number" ? 'inputmode="decimal"' : ""} placeholder="${q.type === "number" ? "Dein Ergebnis" : "Deine Antwort …"}" ${feedback ? "disabled" : ""}>${q.unit ? `<span>${esc(q.unit)}</span>` : ""}</div>`}${feedback ? `<div class="feedback ${feedback.correct ? "success" : ""}" role="status"><strong>${feedback.correct ? "Das hast du geschafft!" : "Noch nicht ganz. Schau mal:"}</strong>${!feedback.correct ? `<p>Die Lösung: <b>${esc(feedback.solution)}</b></p>` : ""}<p>${esc(feedback.explanation)}</p></div><div class="quiz-actions"><small>${feedback.correct ? "Ein kleiner Schritt weiter." : "Fehler helfen dir beim Lernen."}</small>${button("Weiter " + icon("arrow"), "continue")}</div>` : `<div class="quiz-actions"><small>${round.mode === "test" ? "Die Auswertung kommt zum Schluss." : "Nimm dir die Zeit, die du brauchst."}</small><button type="submit" class="btn">${round.mode === "test" ? "Antwort abgeben" : "Antwort prüfen"} ${icon("arrow")}</button></div>`}</form></article><p class="quiz-note">${round.mode === "test" ? "Jede Frage kommt einmal. Du kannst das." : "Du musst nicht perfekt sein. Du bist hier, um zu lernen."}</p></section>`;
}
function results() {
  return `<section class="result"><div class="result-icon">${icon("award")}</div><div class="eyebrow">${round.mode === "test" ? "Deine Testauswertung" : "Mission abgeschlossen"}</div><h1>Du bist ein Stück weiter!</h1><p>Du hast ${round.total} Aufgaben ausprobiert.${round.correctCount === round.total ? " Alle beim ersten Versuch richtig. Stark!" : " Schau dir an, was schon klappt und was du noch üben kannst."}</p><div class="stats">${stat("check", `${round.correctCount}/${round.total}`, "Beim ersten Versuch richtig")}${stat("star", round.correctCount * 10 + (round.total - round.correctCount) * 2, "Lernpunkte gesammelt")}${stat("leaf", round.retries, "Wiederholungen geschafft")}</div><div class="panel review"><h2>${round.mode === "test" ? "Deine Antworten" : "Das nimmst du mit"}</h2><p>Die erste Antwort zählt für die Auswertung. Wiederholungen helfen beim Verstehen.</p>${(round.review || []).map((r) => `<details><summary>${r.correct ? "✓" : "↻"} ${esc(r.prompt)}</summary><p><b>Lösung:</b> ${esc(r.solution)}</p><p>${esc(r.explanation)}</p></details>`).join("")}</div>${button("Zurück in meinen Lernraum " + icon("arrow"), "finish")}<p class="quiz-note">Auch eine Pause gehört zum Lernen.</p></section>`;
}
function auth() {
  app.innerHTML = `${demo ? '<div class="demo-banner">Interaktive Demo · Beispieldaten statt echter Schülerkonten</div>' : ""}<div class="auth-wrap"><section class="auth-art">${brand()}<div><div class="eyebrow">Neugier ist der Anfang</div><h1>Dein nächster<br>Aha-Moment<br>wartet schon.</h1><p>Englisch, Physik, Latein und alles, was du noch entdecken möchtest. Eine kleine Lernrunde nach der anderen.</p></div><small>Kleine Schritte. Großes Wissen.</small></section><section class="auth-form"><div><div class="eyebrow">Willkommen auf deiner Lernreise</div><h2>${setupToken ? "Deinen Zugang einrichten." : "Schön, dass du da bist."}</h2><p>${setupToken ? "Lege deinen persönlichen Passkey an. Damit meldest du dich künftig ohne Passwort an." : demo ? "Probiere die Lernreise aus. Die Demo enthält drei Lernwelten und einen Elternbereich." : "Melde dich mit deinem Passkey an. Dein Wissen wartet auf dich."}</p>${setupToken ? `<label class="form-field">Dein Name (bei der ersten Elterneinrichtung)<input id="setup-name" maxlength="60" autocomplete="given-name" placeholder="Dein Vorname"></label>${button(icon("key") + " Passkey einrichten", "register")}` : demo ? `${button("Als Schüler ausprobieren " + icon("arrow"), "demo-student")}${button("Elternbereich ansehen", "demo-parent", "", "btn light")}` : button(icon("key") + " Mit Passkey anmelden", "login")}<div id="auth-error" class="error-text" role="alert"></div><p class="space-top">${demo ? "Kein Konto nötig. Probier auch eine falsche Antwort aus und schau, was passiert." : "Neue Schülerkonten werden über den Einrichtungslink des Elternkontos angelegt."}</p></div></section></div>`;
}
function decode(s) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
}
function encode(b) {
  return btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
async function passkey(register, token) {
  if (!window.PublicKeyCredential)
    throw Error(
      "Dieser Browser unterstützt keine Passkeys. Bitte einen aktuellen Browser verwenden.",
    );
  const path = "auth/" + (register ? "register" : "login");
  const options = await api(
    path + "/options",
    register
      ? { token, name: document.querySelector("#setup-name")?.value }
      : {},
  );
  options.challenge = decode(options.challenge);
  if (options.user) options.user.id = decode(options.user.id);
  for (const key of ["excludeCredentials", "allowCredentials"])
    if (options[key])
      options[key] = options[key].map((c) => ({ ...c, id: decode(c.id) }));
  let cred;
  try {
    cred = await navigator.credentials[register ? "create" : "get"]({
      publicKey: options,
    });
  } catch (e) {
    throw Error(
      e.name === "NotAllowedError"
        ? "Passkey-Vorgang abgebrochen. Du kannst es erneut versuchen."
        : "Passkey konnte nicht verwendet werden. Bitte Browser und Domain prüfen.",
    );
  }
  const r = cred.response;
  const response = { clientDataJSON: encode(r.clientDataJSON) };
  if (register) {
    response.attestationObject = encode(r.attestationObject);
    response.transports = r.getTransports?.() || [];
  } else {
    response.authenticatorData = encode(r.authenticatorData);
    response.signature = encode(r.signature);
    response.userHandle = r.userHandle ? encode(r.userHandle) : null;
  }
  await api(path + "/verify", {
    id: cred.id,
    rawId: encode(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment,
    response,
    clientExtensionResults: cred.getClientExtensionResults(),
  });
  if (register) setupToken = null;
  await load();
}
async function start(id, mode) {
  round = await api("rounds", { pack: id, mode: mode || "practice" });
  feedback = null;
  selected = null;
  view = "quiz";
  render();
  window.scrollTo(0, 0);
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || busy) return;
  if (b.closest("#answer-form")) e.preventDefault();
  const act = b.dataset.act;
  try {
    if (act === "navigate") {
      if (round && !round.done && view === "quiz") {
        toast(
          "Beende zuerst die Lernrunde über das Kreuz. Dein bisheriger Fortschritt bleibt erhalten.",
        );
        return;
      }
      view = b.dataset.view;
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (act === "choose") {
      selected = Number(b.dataset.choice);
      document.querySelectorAll("[data-choice]").forEach((x) => {
        x.classList.toggle("selected", Number(x.dataset.choice) === selected);
        x.setAttribute(
          "aria-pressed",
          String(Number(x.dataset.choice) === selected),
        );
      });
      return;
    }
    if (act === "filter") {
      filter = b.dataset.filter;
      render();
      return;
    }
    busy = true;
    b.disabled = true;
    if (act === "demo-student" || act === "demo-parent") {
      await api("demo", { role: act === "demo-parent" ? "parent" : "student" });
      await load();
    }
    if (act === "switch") {
      await api("demo", {
        role: state.user.role === "parent" ? "student" : "parent",
      });
      view = "home";
      round = null;
      feedback = null;
      await load();
    }
    if (act === "logout") {
      await api("logout", {});
      state = null;
      view = "home";
      round = null;
      auth();
    }
    if (act === "start") await start(b.dataset.pack, b.dataset.mode);
    if (act === "continue") {
      round = nextRound;
      feedback = null;
      selected = null;
      render();
    }
    if (act === "finish") {
      round = null;
      view = "home";
      await load();
      window.scrollTo(0, 0);
    }
    if (act === "close-round") {
      if (
        confirm(
          "Lernrunde beenden? Deine bisherigen Antworten bleiben gespeichert.",
        )
      ) {
        await api("rounds/close", { round: round.id });
        round = null;
        feedback = null;
        view = "home";
        await load();
      }
    }
    if (act === "login") await passkey(false);
    if (act === "register") await passkey(true, setupToken);
    if (act === "add-passkey") {
      await passkey(true);
      toast("Dein zusätzlicher Passkey ist eingerichtet.");
    }
    if (act === "create-child") {
      const r = await api("children", {
        name: document.querySelector("#child-name").value,
      });
      await load();
      showInvite("invite-result", r.token);
    }
    if (act === "invite") {
      const r = await api("invite", { child: b.dataset.child });
      showInvite("existing-invite", r.token);
    }
    if (act === "package-open") await openPackage(b.dataset.pack);
    if (act === "package-assign") {
      await api("packages/assign", {
        pack: packageDetail.pack.id,
        children: checkedChildren("detail"),
        expectedRevision: packageDetail.currentRevision,
        expectedAssignedTo: packageDetail.assignedTo,
      });
      const id = packageDetail.pack.id;
      state = await api("state");
      await openPackage(id);
      toast(
        "Zuordnung gespeichert. Jedes Kind behält seinen eigenen Lernstand.",
      );
    }
    if (act === "package-delete") {
      if (
        confirm(
          `„${packageDetail.pack.title}“ endgültig für die ganze Familie löschen? Alle Versionen, Zuordnungen, Lernstände, Runden und Antworten dieses Pakets werden entfernt. Lernpunkte und Statistiken ändern sich entsprechend.`,
        )
      ) {
        await api("packages/delete", {
          pack: packageDetail.pack.id,
          expectedRevision: packageDetail.currentRevision,
          expectedAssignedTo: packageDetail.assignedTo,
        });
        packageDetail = null;
        view = "upload";
        await load();
        toast("Lernpaket gelöscht.");
      }
    }
    if (act === "package-export") {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(packageDetail.pack, null, 2) + "\n"], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${packageDetail.pack.id}-v${packageDetail.revision}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (act === "preview-start") {
      previewIndex = 0;
      previewFeedback = null;
      previewChoice = null;
      view = "preview";
      render();
    }
    if (act === "preview-close") {
      view = "package";
      render();
    }
    if (act === "preview-choose") {
      previewChoice = Number(b.dataset.choice);
      document.querySelectorAll('[data-act="preview-choose"]').forEach((x) => {
        x.classList.toggle(
          "selected",
          Number(x.dataset.choice) === previewChoice,
        );
        x.setAttribute(
          "aria-pressed",
          String(Number(x.dataset.choice) === previewChoice),
        );
      });
    }
    if (act === "preview-step" || act === "preview-retry") {
      if (act === "preview-step")
        previewIndex = Math.max(
          0,
          Math.min(
            packageDetail.pack.questions.length - 1,
            previewIndex + Number(b.dataset.step),
          ),
        );
      previewChoice = null;
      previewFeedback = null;
      render();
    }
    if (act === "import") {
      if (!pendingPack || !importPlan)
        throw Error("Bitte zuerst eine Datei prüfen.");
      const result = await api("packages", {
        pack: pendingPack,
        expectedRevision: importPlan.currentRevision,
        expectedAssignedTo: importPlan.assignedTo,
        children: checkedChildren("import"),
      });
      const id = pendingPack.id;
      pendingPack = null;
      importPlan = null;
      state = await api("state");
      await openPackage(id);
      toast(
        result.kind === "unchanged"
          ? `Inhalt unverändert · Version ${result.revision}. Zuordnung gespeichert.`
          : `Gespeichert als Version ${result.revision}.`,
      );
    }
    if (act === "reset") {
      const pack = document.getElementById("reset-" + b.dataset.child)?.value;
      if (!pack) throw Error("Noch kein Lernpaket vorhanden.");
      if (confirm("Den Lernstand für dieses Paket zurücksetzen?")) {
        await api("progress/reset", { child: b.dataset.child, pack });
        await load();
        toast("Das Paket kann wieder von vorne geübt werden.");
      }
    }
  } catch (err) {
    toast(err.message);
    const er = document.querySelector("#auth-error");
    if (er) er.textContent = err.message;
  } finally {
    busy = false;
    b.disabled = false;
  }
});
function showInvite(target, token) {
  const e = document.getElementById(target);
  if (e)
    e.innerHTML = `<div class="link-box"><strong>Einrichtungslink · 30 Minuten gültig</strong><p>Auf dem Gerät des Kindes öffnen:</p><a href="${esc(location.origin + "/?setup=" + token)}">${esc(location.origin + "/?setup=" + token)}</a><p>Vertraulich behandeln: Der Link erlaubt das Hinzufügen eines Passkeys zu diesem Schülerkonto.</p></div>`;
}
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "answer-form") return;
  e.preventDefault();
  if (busy || feedback) return;
  const value =
    round.question.type === "choice"
      ? selected
      : document.querySelector("#answer").value;
  if (value === null || (typeof value === "string" && !value.trim())) {
    toast("Gib zuerst eine Antwort ein.");
    return;
  }
  busy = true;
  const submit = e.target.querySelector("[type=submit]");
  submit.disabled = true;
  try {
    const result = await api("rounds/answer", {
      round: round.id,
      question: round.question.id,
      value,
    });
    if (round.mode === "test") {
      round = result;
      selected = null;
      render();
    } else {
      feedback = result;
      nextRound = result;
      const typed = document.querySelector("#answer")?.value;
      render();
      if (typed !== undefined && document.querySelector("#answer"))
        document.querySelector("#answer").value = typed;
    }
  } catch (err) {
    toast(err.message);
    submit.disabled = false;
  } finally {
    busy = false;
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "package-version") {
    try {
      await openPackage(packageDetail.pack.id, e.target.value);
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (e.target.id === "preview-jump") {
    previewIndex = Number(e.target.value);
    previewFeedback = null;
    previewChoice = null;
    render();
    return;
  }
  if (e.target.id !== "packfile") return;
  pendingPack = null;
  importPlan = null;
  const target = document.querySelector("#upload-preview"),
    f = e.target.files[0];
  target.innerHTML = "";
  if (!f) return;
  const input = e.target;
  input.disabled = true;
  try {
    if (f.size > 1024 * 1024)
      throw Error("Die Datei darf höchstens 1 MB groß sein.");
    const p = JSON.parse(await f.text()),
      result = await api("packages/validate", p);
    if (!target.isConnected) return;
    pendingPack = p;
    importPlan = result;
    const notice =
      result.kind === "new"
        ? "Neues Paket · Version 1"
        : result.kind === "unchanged"
          ? `Identischer Inhalt · Version ${result.currentRevision} bleibt erhalten`
          : `Aktualisiert „${result.previousTitle}“ von Version ${result.currentRevision} auf ${result.nextRevision}`;
    target.innerHTML = `<div class="preview"><h3>${esc(p.title)}</h3><p><b>${esc(notice)}</b></p><p>${esc(p.subject)} · ${p.questions.length} Fragen · Paket-ID: ${esc(p.id)}</p>${changeList(result.changes)}<p>Unveränderte Fragen behalten ihren Lernstand. Geänderte und neue Fragen beginnen neu; entfernte Fragen verschwinden aus dem aktuellen Lernstand.</p>${childChecks(result.assignedTo, "import")}<p>Ohne Auswahl bleibt das Paket nur im Elternbereich. Bei einem Update sind die bisherigen Kinder vorausgewählt.</p><details><summary>Alle Fragen und Lösungen vor dem Speichern prüfen</summary>${questionList(p.questions)}</details><div class="space-top">${button(result.kind === "update" ? `Als Version ${result.nextRevision} speichern` : result.kind === "unchanged" ? "Zuordnung bestätigen" : "Paket speichern", "import")}</div></div>`;
  } catch (err) {
    target.innerHTML = `<p class="error-text" role="alert">${esc(err instanceof SyntaxError ? "Die Datei enthält kein gültiges JSON." : err.message)}</p>`;
  } finally {
    input.disabled = false;
  }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "preview-form") return;
  e.preventDefault();
  if (busy || previewFeedback) return;
  const q = packageDetail.pack.questions[previewIndex];
  const value =
    q.type === "choice"
      ? previewChoice
      : document.querySelector("#preview-answer").value;
  if (value === null || (typeof value === "string" && !value.trim())) {
    toast("Gib zuerst eine Antwort ein.");
    return;
  }
  busy = true;
  const submit = e.target.querySelector('[type="submit"]');
  submit.disabled = true;
  const detail = packageDetail,
    index = previewIndex;
  try {
    const result = await api("packages/preview-answer", {
      pack: detail.pack.id,
      revision: detail.revision,
      question: q.id,
      value,
    });
    if (
      view === "preview" &&
      packageDetail === detail &&
      previewIndex === index
    ) {
      previewFeedback = result;
      render();
      if (document.querySelector("#preview-answer"))
        document.querySelector("#preview-answer").value = value;
    }
  } catch (err) {
    toast(err.message);
  } finally {
    busy = false;
    submit.disabled = false;
  }
});
(async () => {
  try {
    const s = await api("status");
    demo = s.demo;
    if (s.user && !setupToken) await load();
    else auth();
  } catch (e) {
    app.innerHTML = `<div class="empty">Die Lernreise ist gerade nicht erreichbar.<p>${esc(e.message)}</p><a href="/">Erneut versuchen</a></div>`;
  }
})();
