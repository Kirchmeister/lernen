# Lernpakete erstellen und aktualisieren

Eltern können Inhalte mit einer beliebigen KI vorbereiten. Die App selbst benötigt weder einen KI-API-Schlüssel noch ein KI-Abonnement. Als Auftrag dient [KI-VORLAGE.md](../public/KI-VORLAGE.md).

## Ablauf

1. Fach, Klasse, Thema und tatsächlichen Lernstoff in der Vorlage ergänzen.
2. Die KI ausschließlich eine JSON-Datei erzeugen lassen und diese als UTF-8 mit `.json` speichern.
3. Im Elternkonto unter **Lernpakete** auswählen. Maximal 1 MB pro Datei, 1 bis 300 Aufgaben pro Paket.
4. Nach der Formatprüfung Fragen und Lösungen in der Vorschau selbst fachlich prüfen.
5. Änderungsvorschau prüfen, die gewünschten Kinder auswählen und speichern. Ohne Auswahl bleibt ein neues Paket nur im Elternbereich. Bei Updates sind bisherige Zuordnungen vorausgewählt.

Versionen, Fragenvorschau, Export und Löschen sind in [ELTERNBEREICH.md](ELTERNBEREICH.md) beschrieben.

Die automatische Prüfung bestätigt das Format, nicht die fachliche Richtigkeit. Persönliche Daten des Kindes gehören weder in den KI-Auftrag noch in das Paket.

## Gemeinsame Felder

| Feld        | Bedeutung                                               |
| ----------- | ------------------------------------------------------- |
| `version`   | Formatversion; aktuell ausschließlich `1`               |
| `id`        | Dauerhafte Paket-ID aus Buchstaben, Zahlen, `_` und `-` |
| `title`     | Kurzer sichtbarer Titel                                 |
| `subject`   | Fach, etwa Englisch, Latein oder Physik                 |
| `topic`     | Beschreibung des Themas                                 |
| `grade`     | Klassenstufe als ganze Zahl von 1 bis 13                |
| `questions` | Liste der Aufgaben                                      |

Jede Aufgabe besitzt `id`, `type`, `prompt` und eine hilfreiche `explanation`. Aufgaben-IDs müssen innerhalb des Pakets eindeutig sein. Es gibt drei Typen:

## Texteingabe: `input`

```json
{
  "id": "apple",
  "type": "input",
  "prompt": "Wie heißt Apfel auf Englisch?",
  "answers": ["apple"],
  "caseSensitive": false,
  "accentSensitive": true,
  "punctuationSensitive": true,
  "explanation": "Apfel heißt auf Englisch apple."
}
```

Ein bis zwanzig erlaubte Lösungen in `answers`. Führende und folgende Leerzeichen werden entfernt, mehrere innere Leerzeichen zusammengefasst und Unicode normalisiert. Großschreibung zählt standardmäßig nicht, Akzente und Satzzeichen dagegen schon. Diese Regeln gelten je Aufgabe. Ein nicht vorgesehenes Synonym oder ein Tippfehler zählt aktuell als falsch; es gibt keine semantische KI-Bewertung.

## Auswahl: `choice`

```json
{
  "id": "energy-unit",
  "type": "choice",
  "prompt": "In welcher Einheit wird Energie angegeben?",
  "options": ["Joule", "Meter", "Sekunde"],
  "correct": 0,
  "explanation": "Die Einheit der Energie ist Joule (J)."
}
```

Zwei bis sechs unterschiedliche Optionen; genau eine richtige Antwort. `correct` ist der Index in der ursprünglichen Liste, beginnend bei null. Die Webseite mischt die sichtbare Reihenfolge und behält die richtige Zuordnung.

## Zahl mit vorgegebener Einheit: `number`

```json
{
  "id": "speed",
  "type": "number",
  "prompt": "60 Meter in 10 Sekunden: Wie groß ist die Geschwindigkeit?",
  "answer": 6,
  "tolerance": 0.1,
  "unit": "m/s",
  "explanation": "Geschwindigkeit = Strecke geteilt durch Zeit: 60 ÷ 10 = 6 m/s."
}
```

`answer` ist eine JSON-Zahl mit Dezimalpunkt. `tolerance` ist eine absolute Toleranz, standardmäßig null. Die Eingabe darf Dezimalkomma oder Dezimalpunkt verwenden. Die Einheit wird daneben angezeigt und nicht mit eingetippt. Es gibt keine Einheitenumrechnung und keine freie Formelauswertung.

## Beispiele und Aktualisierungen

Vollständige Pakete liegen unter [examples/](../examples/). Die Datei [beispielpaket.json](../public/beispielpaket.json) wird in der Oberfläche zum Download angeboten. [create-demo.mjs](../examples/create-demo.mjs) enthält die Beispieldaten für den Demostart.

Bei gleicher Paket-ID wird das vorhandene Paket aktualisiert und der bisherige Inhalt als Version behalten. Identischer Inhalt erzeugt keine neue Version. Unveränderte Aufgaben-IDs samt identischem Aufgabenobjekt behalten den Lernstand. Änderungen an Lösungen, Erklärungen oder Regeln setzen ihn für die betroffenen Fragen zurück. Die Reihenfolge von JSON-Objektfeldern spielt dabei keine Rolle. Bei offenen Lernrunden wird eine Inhaltsänderung des betroffenen Pakets abgewiesen.

Die Inhaltsversion vergibt die Anwendung; `version: 1` in JSON bleibt die Formatversion. Kinderzuordnungen werden im Elternkonto gewählt und sind kein Feld des Lernpakets.

Für ein fachlich neues Thema eine neue Paket-ID verwenden. Für eine Korrektur am bestehenden Thema dieselbe ID behalten und die Änderung bewusst prüfen.
