# Lernpaket für Lernreise erstellen

Kopiere diesen Auftrag in eine KI und ergänze Fach, Klassenstufe, Thema und Lernstoff.
Keine Namen oder persönlichen Daten des Kindes mitsenden.

Erstelle ein fachlich korrektes Lernpaket für Kinder von 8 bis 13 Jahren.
Fach: [FACH]
Klassenstufe: [KLASSE]
Thema: [THEMA]
Lernstoff: [HIER EINFÜGEN]

Gib ausschließlich eine gültige JSON-Datei ohne Markdown-Codezaun aus.
Verwende diese Struktur:

{
  "version": 1,
  "id": "englisch-alltag-01",
  "title": "Hello, Alltag!",
  "subject": "Englisch",
  "topic": "Wörter für deinen Tag",
  "grade": 7,
  "questions": [
    {
      "id": "apple",
      "type": "input",
      "prompt": "Wie heißt Apfel auf Englisch?",
      "answers": ["apple"],
      "caseSensitive": false,
      "accentSensitive": true,
      "punctuationSensitive": true,
      "explanation": "Apfel heißt auf Englisch apple."
    },
    {
      "id": "energy-unit",
      "type": "choice",
      "prompt": "In welcher Einheit wird Energie angegeben?",
      "options": ["Joule", "Meter", "Sekunde"],
      "correct": 0,
      "explanation": "Die Einheit der Energie ist Joule (J)."
    },
    {
      "id": "speed",
      "type": "number",
      "prompt": "60 Meter in 10 Sekunden: Wie groß ist die Geschwindigkeit?",
      "answer": 6,
      "tolerance": 0,
      "unit": "m/s",
      "explanation": "Geschwindigkeit = Strecke geteilt durch Zeit: 60 ÷ 10 = 6 m/s."
    }
  ]
}

Regeln:
- Erstelle etwa 15 bis 30 kurze Aufgaben passend zum angegebenen Lernstoff.
- Mische Aufgabenarten nur, wenn es didaktisch sinnvoll ist. Bei Vokabeln vor allem "input".
- Jede Frage ist eindeutig, altersgerecht und prüft genau einen Inhalt.
- Jede Aufgabe braucht eine hilfreiche Erklärung in freundlicher, sachlicher Sprache.
- "choice": 2 bis 6 unterschiedliche Optionen; genau eine ist richtig. "correct" ist deren Index, beginnend mit 0.
- "input": "answers" enthält alle erlaubten eindeutigen Lösungen. Keine Platzhalter.
- "number": "answer" ist eine JSON-Zahl; "tolerance" ist eine absolute Toleranz >= 0; "unit" ist vorgegeben und wird in der Oberfläche angezeigt. Das Kind gibt nur die Zahl ein.
- Klassenstufe ist eine ganze Zahl zwischen 1 und 13.
- Paket-ID enthält nur Buchstaben, Zahlen, Bindestriche oder Unterstriche.
- Aufgaben-IDs sind innerhalb eines Pakets eindeutig und sollen bei unveränderten Aufgaben dauerhaft gleich bleiben.
- Keine externen Links, HTML, Benutzerdaten oder Skripte.
- Prüfe jede Lösung auf fachliche Richtigkeit. Nicht belegte Annahmen weglassen.

Wichtig: Die drei Fragen im Beispiel demonstrieren nur das Format. Das fertige Paket soll das gewählte Fach und Thema behandeln.
Speichere die Ausgabe als UTF-8-Datei mit der Endung .json.
Eltern prüfen Fragen und Lösungen vor der Freigabe.
