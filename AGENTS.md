# Arbeitsanleitung für KI-Unterstützung

## Projekt und Kommunikation

Lernreise ist eine selbst hostbare deutschsprachige Lernplattform für Kinder von 8 bis 13 Jahren. Nutzertexte, Dokumentation, erklärende Kommentare und Änderungsbeschreibungen auf Deutsch schreiben. Bestehende Code-Bezeichner nicht allein zur Übersetzung ändern. Freundliche Motivation ohne Ranglisten, Beschämung oder täglichen Lerndruck erhalten.

## Vor Änderungen lesen

1. [README.md](README.md)
2. [Projektstand](docs/PROJEKTSTAND.md)
3. Die zur Aufgabe passende Anleitung unter [docs/](docs/)

Bei Serverneuinstallation zusätzlich [Installation](docs/INSTALLATION.md), [Wiederherstellung](docs/WIEDERHERSTELLUNG.md) und [KI-Wiederanlauf](docs/KI-WIEDERANLAUF.md) lesen. Den Repository-Stand prüfen und keine früheren Chat-Dateien voraussetzen.

## Technische Leitplanken

- Node.js 24, SQLite, SimpleWebAuthn; `package-lock.json` verwenden und Änderungen daran einchecken.
- Demo- und Echtdatenbanken trennen. Keine produktiven Daten in Demo-Konten kopieren.
- Bewertung und Zugriffsprüfung auf dem Server belassen. Keine Lösungen in noch offene Schülerfragen aufnehmen.
- Familienzugehörigkeit aus der authentifizierten Sitzung ableiten. Passkey-Challenge, Origin, RP-ID, Signatur und Nutzerverifikation nicht abschwächen.
- Eine App-Instanz betreiben; kein Mehrinstanzbetrieb mit dieser lokalen Datenbank voraussetzen.
- Datenbankschemaänderungen mit Sicherung, Migration und Rückweg dokumentieren.
- Keine automatische Veröffentlichung, Serveränderung oder Kontaktaufnahme aus einer bloßen Dokumentationsaufgabe ableiten. Im jeweils tatsächlich autorisierten Umfang weiterarbeiten.

## Geheimnisse und Daten

`.env`, Schülerdatenbanken, Sicherungen, private Schlüssel und Tokens niemals committen. Keine echten Secrets in Tests, Logs oder Befehlsbeschreibungen einbauen. Bestehende Daten nicht ohne Prüfung ersetzen. Vor einer Wiederherstellung die Quelle prüfen und vorhandene Daten sichern. Kein `docker compose down -v` für einen normalen Neustart oder Update verwenden.

## Prüfung

```bash
npm ci --ignore-scripts
bash scripts/check.sh
```

Bei Dockeränderungen zusätzlich Image-Bau und Compose-Prüfung auf einem verfügbaren Docker-System ausführen. Browser, Mobilgeräte, HTTPS, Containerstart und Restore nur dann als geprüft melden, wenn die Schritte tatsächlich durchgeführt wurden. Blocker konkret nennen und andere sinnvolle Vorbereitungen fortsetzen.

## Dokumentation

Verhaltensänderungen in der passenden deutschen Anleitung nachführen. Neue Befehle mit Arbeitsverzeichnis, Voraussetzungen, Platzhaltern und Wirkung erklären. Quellcode-Reproduzierbarkeit und persönliche Datenwiederherstellung klar unterscheiden. Nach bestätigter GitHub-Übernahme die tatsächliche Repository-URL und den Projektstatus in README und docs/GITHUB.md aktualisieren.
