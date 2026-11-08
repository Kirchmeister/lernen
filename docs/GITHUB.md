# Repository und Zusammenarbeit auf GitHub

## Verbindliches Ziel

Der Quellcode wird in diesem privaten Repository verwaltet:

- Repository: [Kirchmeister/lernen](https://github.com/Kirchmeister/lernen)
- Hauptbranch: `main`
- HTTPS-Clone-URL: `https://github.com/Kirchmeister/lernen.git`
- SSH-Clone-URL: `git@github.com:Kirchmeister/lernen.git`
- Prüfungen: [GitHub Actions](https://github.com/Kirchmeister/lernen/actions)

Die ursprüngliche README mit dem Titel `lernen` wird zur vollständigen Projektanleitung erweitert. Der erste GitHub-Commit bleibt in der Historie erhalten. Eine frühere ZIP-Datei aus einem Chat wird für künftige Installationen nicht benötigt.

## Inhalt und Zugriffe

Hochgeladen werden Quellcode, deutsche Dokumentation, `.env.example`, Lockdatei, Tests, Konfigurationsvorlagen und Betriebsskripte. Persönliche Datenbanken, `.env`, Sicherungen, private Schlüssel und Download-Archive gehören nicht ins Repository. Auch ein privates Repository ist kein Ablageort für Schülerdaten oder produktive Geheimnisse.

Für den Ubuntu-Server genügt ein GitHub-Zugang mit Leserechten, etwa ein lesender Deploy-Key. Eine KI benötigt Leserechte für die Analyse und zusätzlich Schreibrechte, wenn sie Änderungen hochladen soll. Zugangsdaten über die vorgesehene Verbindung verwalten und nicht in Chat-Nachrichten, Clone-URLs oder Commits kopieren.

## Änderungen vorbereiten

```bash
git clone https://github.com/Kirchmeister/lernen.git lernen
cd lernen
git switch -c aenderung/kurze-beschreibung
npm ci --ignore-scripts
bash scripts/check.sh
```

Änderungen und betroffene Anleitungen auf Deutsch beschreiben. Vor dem Commit `git status --short` und `git diff --check` prüfen. Beim ersten Upload wurde nur die anfängliche README vorgefunden; spätere Änderungen dürfen nicht von einem weiterhin leeren Repository ausgehen.

## Änderungen übernehmen

Vorhandene Branches und Dateien zuerst lesen. Neue Arbeit möglichst in einem nachvollziehbaren Branch oder Pull Request bereitstellen. Keine fremden Änderungen überschreiben und keinen Force-Push für die normale Zusammenarbeit verwenden. Den Stand des Hauptbranches vor jeder Veröffentlichung erneut prüfen.

Nach einem Push den zum Commit gehörenden Actions-Lauf ansehen. Der Workflow führt Tests und einen Containerbau aus, aber keine Bereitstellung auf dem Ubuntu-Server. Ein Upload nach GitHub ersetzt deshalb keine Geräte- oder Serverabnahme.

## Wiederaufsetzen

Ein neuer Server benötigt dieses Repository und die [Installationsanleitung](INSTALLATION.md). Für bestehende Konten und Lernstände zusätzlich eine externe Datenbanksicherung und die [Wiederherstellungsanleitung](WIEDERHERSTELLUNG.md) verwenden. Als Auftrag für spätere KI-Unterstützung dient [KI-WIEDERANLAUF.md](KI-WIEDERANLAUF.md).
