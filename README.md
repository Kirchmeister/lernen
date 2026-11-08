# Lernreise

Eine deutschsprachige, selbst hostbare Lernplattform für Kinder von **8 bis 13 Jahren**. Kurze Lernmissionen, persönliche Erfolge und verständliche Erklärungen helfen beim Üben. Eltern bereiten Aufgaben mit einer KI vor und geben sie nach einer Prüfung frei.

Das gesamte Projekt einschließlich Installationsanleitungen liegt im Repository. Für eine neue Installation ist keine Datei aus einem Chat erforderlich.

## Was die Anwendung kann

- Eigene Eltern- und Schülerkonten mit Passkeys, ohne Passwortanmeldung.
- Englische und lateinische Wörter schreiben, Multiple Choice beantworten und Zahlenaufgaben lösen.
- JSON-Lernpakete hochladen, alle Lösungen prüfen und für die Familie freigeben.
- Üben mit Erklärungen und Fehlerwiederholungen oder einen Test mit Auswertung am Ende durchführen.
- Aufgaben nach richtigen Antworten an drei verschiedenen Tagen archivieren.
- Lernpunkte und persönliche Meilensteine sammeln, ohne Ranglisten oder täglichen Pflichtlauf.

**Projektstand:** erste Version für einen Familienbetrieb. Die Anwendungstests, der Docker-Image-Bau und die Compose-Validierung bestehen auch auf GitHub. Containerstart und Wiederherstellung auf dem Zielserver, mobile Darstellung und Passkeys auf echten Geräten müssen noch praktisch geprüft werden. Die genaue Abgrenzung steht unter [Projektstand und offene Punkte](docs/PROJEKTSTAND.md).

## Wo beginne ich?

| Vorhaben                                   | Anleitung                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Die Anwendung zunächst ausprobieren        | [Demo und Entwicklung](docs/ENTWICKLUNG.md)                                  |
| Auf einem neuen Ubuntu-Server installieren | [Installation Schritt für Schritt](docs/INSTALLATION.md)                     |
| Updates, Sicherungen und täglicher Betrieb | [Betrieb](docs/BETRIEB.md)                                                   |
| Nach einem Serverausfall wiederherstellen  | [Wiederherstellung](docs/WIEDERHERSTELLUNG.md)                               |
| Eine KI soll den Wiederanlauf begleiten    | [KI-Wiederanlauf mit kopierbarem Auftrag](docs/KI-WIEDERANLAUF.md)           |
| Aufgaben mit KI erstellen                  | [Lernpaketformat](docs/LERNPAKETE.md) und [KI-Vorlage](public/KI-VORLAGE.md) |
| Aufbau und Lernregeln nachvollziehen       | [Architektur](docs/ARCHITEKTUR.md)                                           |
| Dieses Projekt auf GitHub übernehmen       | [GitHub-Übernahme](docs/GITHUB.md)                                           |

## Schnellstart: lokale Demo

Voraussetzung: Node.js 24 und npm. Im ausgecheckten Repository:

```bash
npm ci --ignore-scripts
npm test
DEMO_MODE=true DATA_PATH=./data/demo.sqlite HOST=127.0.0.1 npm start
```

Dann **http://localhost:3000** öffnen. Die Demo enthält Englisch, Physik und Latein sowie einen Elternbereich. Sie verwendet Beispielkonten; echte Passkey-Anmeldung und neue Konten sind dort deaktiviert. Für den Demo- und Echtbetrieb immer unterschiedliche Datenbanken verwenden.

## Vorhandener Apache oder andere Webdienste

Wenn bereits Apache auf Port 80/443 läuft, die separate [Apache-Anleitung](docs/APACHE.md) verwenden. Sie startet nur die App auf einem lokalen Port und keinen Caddy. Der folgende Kurzablauf gilt für einen Server mit freien Web-Ports.

## Kurzablauf: Ubuntu mit Docker

Nach Installation von Docker und Git, eingerichteter Domain und geöffneten Ports 80/443:

```bash
git clone https://github.com/Kirchmeister/lernen.git lernen
cd lernen
bash scripts/configure.sh lernen.deine-domain.de
docker compose up -d --build
```

Den Platzhalter für die Domain ersetzen. Das Repository ist [Kirchmeister/lernen](https://github.com/Kirchmeister/lernen) und privat; zum Klonen ist freigegebener Lesezugriff nötig. Die vollständige Anleitung einschließlich erstem Elternkonto steht in [INSTALLATION.md](docs/INSTALLATION.md).

## Was GitHub wiederherstellen kann

**Das Repository enthält Anwendung, Beispielpakete, dokumentierte Einstellungen, Betriebsskripte und Tests.** `package-lock.json` hält die npm-Abhängigkeiten fest. Eine Wiederinstallation verwendet einen gewählten Git-Commit. Node- und Caddy-Container sind auf Hauptversionen festgelegt und erhalten bei Neubauten gegebenenfalls neue Patchstände; ein byteidentischer Containerbau ist damit nicht zugesichert.

**Persönliche Daten gehören nicht ins Repository.** Konten, Passkey-Schlüssel, hochgeladene Aufgaben und Lernstände liegen in der SQLite-Datenbank. Wer diese erhalten möchte, braucht eine externe Sicherung. Ohne Sicherung kann die Anwendung neu installiert werden, persönliche Lernstände lassen sich daraus nicht rekonstruieren.

`.env`, Datenbanken, Sicherungen und private Schlüssel sind durch `.gitignore` ausgeschlossen. Keine echten Zugangsdaten in Issues, Commit-Nachrichten oder KI-Aufträge kopieren.

## Projektstruktur

| Pfad                                                             | Zweck                                                     |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| [server.mjs](server.mjs)                                         | HTTP-API, Rollen, Passkeys, SQLite und Lernrunden         |
| [learning.mjs](learning.mjs)                                     | Paketprüfung, Bewertung und Archivierungsregeln           |
| [admin.mjs](admin.mjs)                                           | Konten auflisten und verlorene Passkeys wiederherstellen  |
| [public/](public/)                                               | Oberfläche und herunterladbare Aufgaben-Vorlagen          |
| [examples/](examples/)                                           | Fachlich zu prüfende Beispielpakete für den Einstieg      |
| [scripts/](scripts/)                                             | Konfiguration, Backup, Restore und Projektprüfungen       |
| [tests/](tests/)                                                 | Automatisierte Prüfungen der Anwendung und Betriebshilfen |
| [docs/](docs/)                                                   | Deutsche Installation, Betrieb und Wiederanlauf           |
| [compose.yaml](compose.yaml)                                     | Anwendung, HTTPS-Proxy und dauerhafte Volumes             |
| [.github/workflows/pruefung.yml](.github/workflows/pruefung.yml) | Vorgesehene automatische Prüfung auf GitHub               |
| [AGENTS.md](AGENTS.md)                                           | Arbeitsanleitung für spätere KI-Unterstützung             |

## Prüfung

```bash
npm ci --ignore-scripts
bash scripts/check.sh
```

Die Gesamtprüfung braucht Bash und Python 3 zusätzlich zu Node.js. Sie prüft Syntax, Anwendung, Betriebshilfen und interne Dokumentationslinks. Der GitHub-Workflow baut außerdem das Docker-Image und prüft die Compose-Konfiguration, wenn GitHub Actions für das Repository ausgeführt wird. Den Status des jeweiligen Commits unter [Actions](https://github.com/Kirchmeister/lernen/actions) prüfen.
