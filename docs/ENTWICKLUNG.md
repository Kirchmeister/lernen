# Entwicklung und Prüfung

## Voraussetzungen

- Node.js 24; die gewünschte Hauptversion steht in [.nvmrc](../.nvmrc).
- npm und Git.
- Bash und Python 3 mindestens 3.9 für die Gesamtprüfung und Betriebshilfen.
- Docker mit Compose für den tatsächlichen Containerbetrieb.

```bash
npm ci --ignore-scripts
bash scripts/check.sh
```

`npm ci` verwendet die eingecheckte Lockdatei. `node_modules` wird nicht eingecheckt. Formatierung bei Bedarf mit `npm run format`; Formatieren ersetzt keine Tests.

## Demo starten

```bash
DEMO_MODE=true DATA_PATH=./data/demo.sqlite HOST=127.0.0.1 npm start
```

Unter http://localhost:3000 erscheinen zwei Demo-Einstiege. Schüler- und Elternansicht verwenden feste Beispielkonten und dieselben Beispieldaten. Es gibt dort keine echte Passkey-Anmeldung. Ein erneuter Start behält die Demo-Datenbank; für einen frischen Zustand nur diese ausdrücklich ausgewählte Demo-Datenbank bei gestopptem Server löschen.

`npm run dev` ist für eine Entwicklungs-/Vorschauumgebung vorgesehen, bindet an alle Schnittstellen und verwendet `data/preview.sqlite`. Für einen privaten lokalen Versuch den obigen Loopback-Befehl bevorzugen. Der Demo-Modus darf keine echten Schülerdaten verwenden.

## Konfiguration bei direktem Node-Start

| Variable      | Zweck / Standard                                                            |
| ------------- | --------------------------------------------------------------------------- |
| `DEMO_MODE`   | Nur exakt `true` aktiviert Demo; sonst regulärer Modus                      |
| `HOST`        | Standard `127.0.0.1`; im Container `0.0.0.0`                                |
| `PORT`        | Standard `3000`                                                             |
| `DATA_PATH`   | Standard `data/lernreise.sqlite`, relativ zum Arbeitsverzeichnis            |
| `ORIGIN`      | Externe URL ohne abschließenden Slash; im Echtbetrieb HTTPS außer localhost |
| `SETUP_TOKEN` | Im regulären Betrieb erforderlich; lokales Erstinstallationsgeheimnis       |

Die Relying-Party-ID wird aus dem Hostnamen der `ORIGIN` abgeleitet. Bei direktem Start werden diese Variablen exportiert oder über eine lokal verwaltete Startumgebung gesetzt. `.env` wird nur von Docker Compose automatisch gelesen.

## Tests

| Prüfung                    | Inhalt                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `tests/learning.test.mjs`  | Formate, Normalisierung, Zahlen, Auswahl, Archivierung und Schutz der Lösungen                 |
| `tests/packages.test.mjs` | Migration, Zuordnung, Versionskonflikte, Historie, Fortschrittserhalt und familienbegrenzte Löschung |
| `tests/server.test.mjs`    | HTTP-Abläufe, Rollen, Wiederholungen, Testmodus und Paketaktualisierung                        |
| `tests/passkeys.test.mjs`  | Kryptografische Registrierung/Anmeldung mit Software-Authenticator, Einladungen und Challenges |
| `tests/test_operations.py` | Konfiguration, sichere Archivprüfung und Fehlerbehandlung beim Backup mit simuliertem Docker   |
| `scripts/check-docs.py`    | Relative Dateilinks in der Dokumentation                                                       |

Die Software-Passkey-Tests ersetzen keinen Test mit einem Mobiltelefon, echten Browsern und der produktiven HTTPS-Domain. Die Betriebsskripte benötigen zusätzlich einen Wiederherstellungsversuch auf einem echten Docker-Testsystem.

## GitHub Actions

[pruefung.yml](../.github/workflows/pruefung.yml) läuft bei Push, Pull Request und manuellem Start. Der Workflow installiert aus der Lockdatei, führt die Gesamtprüfung aus, baut das Docker-Image und validiert Compose mit reinen Platzhaltern. Er benötigt keine produktiven Secrets und führt keine Serverbereitstellung aus.

Die tatsächlichen Ergebnisse stehen unter [GitHub Actions](https://github.com/Kirchmeister/lernen/actions). Einen Lauf immer dem geprüften Commit zuordnen. Ein grüner Anwendungstest bedeutet nicht automatisch einen getesteten Zielserver.

## Änderungen weitergeben

Fachliche Änderungen auf Deutsch erklären. Bei geändertem Verhalten die betroffenen Dokumente und bei relevanten Regeln die Tests aktualisieren. Datenbankschemaänderungen benötigen einen konkreten Migrations- und Rückweg; `CREATE TABLE IF NOT EXISTS` allein aktualisiert vorhandene Tabellen nicht. Den genauen Git-Stand des produktiven Betriebs festhalten.
