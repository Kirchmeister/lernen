const input = (id, prompt, answers, explanation) => ({
  id,
  type: "input",
  prompt,
  answers,
  explanation,
  accentSensitive: true,
  caseSensitive: false,
});
export const packs = [
  {
    version: 1,
    id: "english-everyday",
    title: "Hello, Alltag!",
    subject: "Englisch",
    topic: "Wörter für deinen Tag",
    grade: 7,
    questions: [
      ["apple", "Apfel", "apple"],
      ["school", "Schule", "school"],
      ["friend", "Freund / Freundin", "friend"],
      ["window", "Fenster", "window"],
      ["breakfast", "Frühstück", "breakfast"],
      ["library", "Bücherei", "library"],
      ["homework", "Hausaufgaben", "homework"],
      ["garden", "Garten", "garden"],
      ["bicycle", "Fahrrad", "bicycle"],
      ["because", "weil", "because"],
      ["always", "immer", "always"],
      ["sometimes", "manchmal", "sometimes"],
    ].map(([id, de, en]) =>
      input(
        id,
        `Wie heißt „${de}“ auf Englisch?`,
        [en],
        `„${de}“ heißt auf Englisch „${en}“.`,
      ),
    ),
  },
  {
    version: 1,
    id: "physics-energy",
    title: "Energie entdecken",
    subject: "Physik",
    topic: "Energie und Bewegung",
    grade: 7,
    questions: [
      {
        id: "energy-unit",
        type: "choice",
        prompt: "In welcher Einheit wird Energie angegeben?",
        options: ["Joule", "Meter", "Sekunde", "Grad Celsius"],
        correct: 0,
        explanation:
          "Energie wird in Joule (J) angegeben. Meter ist eine Längeneinheit.",
      },
      {
        id: "bike",
        type: "choice",
        prompt: "Welche Energie hat ein fahrendes Fahrrad?",
        options: ["Bewegungsenergie", "Nur chemische Energie", "Keine Energie"],
        correct: 0,
        explanation:
          "Wenn sich ein Körper bewegt, besitzt er Bewegungsenergie.",
      },
      {
        id: "sun",
        type: "choice",
        prompt: "Was wandelt eine Solarzelle hauptsächlich um?",
        options: [
          "Lichtenergie in elektrische Energie",
          "Wärme in Schall",
          "Bewegung in Licht",
        ],
        correct: 0,
        explanation:
          "Eine Solarzelle wandelt die Energie des Lichts in elektrische Energie um.",
      },
      {
        id: "brake",
        type: "choice",
        prompt: "Die Bremsen am Fahrrad werden warm. Warum?",
        options: [
          "Reibung wandelt Bewegungsenergie in Wärme um",
          "Wärme entsteht aus dem Nichts",
          "Die Bremsen speichern Sonnenlicht",
        ],
        correct: 0,
        explanation:
          "Beim Bremsen wird Bewegungsenergie durch Reibung in Wärme umgewandelt.",
      },
      {
        id: "speed",
        type: "number",
        prompt:
          "Du legst 60 Meter in 10 Sekunden zurück. Wie groß ist deine mittlere Geschwindigkeit?",
        answer: 6,
        tolerance: 0,
        unit: "m/s",
        explanation:
          "Geschwindigkeit = Strecke ÷ Zeit. Also 60 m ÷ 10 s = 6 m/s.",
      },
      {
        id: "height",
        type: "choice",
        prompt:
          "Ein Buch liegt oben im Regal. Welche Energie besitzt es durch seine Höhe?",
        options: ["Lageenergie", "Schallenergie", "Elektrische Energie"],
        correct: 0,
        explanation:
          "Ein angehobener Körper besitzt Lageenergie. Beim Herunterfallen wird sie in Bewegungsenergie umgewandelt.",
      },
      {
        id: "battery",
        type: "choice",
        prompt: "Welche Energie speichert eine Batterie?",
        options: [
          "Chemische Energie",
          "Nur Lichtenergie",
          "Nur Bewegungsenergie",
        ],
        correct: 0,
        explanation:
          "Eine Batterie speichert chemische Energie und kann diese in elektrische Energie umwandeln.",
      },
      {
        id: "distance",
        type: "number",
        prompt:
          "Ein Roller fährt gleichmäßig mit 3 m/s. Welche Strecke legt er in 4 Sekunden zurück?",
        answer: 12,
        unit: "m",
        tolerance: 0,
        explanation: "Strecke = Geschwindigkeit × Zeit. 3 m/s × 4 s = 12 m.",
      },
    ],
  },
  {
    version: 1,
    id: "latin-first",
    title: "Salve, Latein!",
    subject: "Latein",
    topic: "Deine ersten Wörter",
    grade: 7,
    questions: [
      ["aqua", "Was bedeutet „aqua“?", ["Wasser"]],
      ["amicus", "Was bedeutet „amicus“?", ["Freund", "der Freund"]],
      ["terra", "Was bedeutet „terra“?", ["Erde", "Land"]],
      ["puella", "Was bedeutet „puella“?", ["Mädchen", "das Mädchen"]],
      ["videre", "Wie heißt „sehen“ auf Latein?", ["videre"]],
      ["audire", "Wie heißt „hören“ auf Latein?", ["audire"]],
      ["sol", "Was bedeutet „sol“?", ["Sonne", "die Sonne"]],
      ["luna", "Was bedeutet „luna“?", ["Mond", "der Mond"]],
    ].map(([id, prompt, answers]) =>
      input(
        id,
        prompt,
        answers,
        `Die gesuchte Übersetzung ist „${answers[0]}“.`,
      ),
    ),
  },
];
