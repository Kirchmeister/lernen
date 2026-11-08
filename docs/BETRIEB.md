# Betrieb, Updates und Sicherungen

Alle Befehle im geklonten Repository ausführen. Ausgangspunkt ist die [Installation](INSTALLATION.md).

## Status und Protokolle

```bash
docker compose ps
docker compose logs --tail=100 app caddy
docker compose restart app
```

Protokolle vor Weitergabe auf private Inhalte prüfen. `docker compose config` ohne `--quiet` kann aufgelöste Umgebungsvariablen einschließlich Geheimnissen zeigen; diese Ausgabe nicht öffentlich teilen.

## Daten und Einstellungen

| Ort                    | Inhalt                                                         | Wiederherstellung                                                 |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Git-Repository         | Code, Dokumentation, Beispiele und Versionsstand               | Aus GitHub klonen                                                 |
| `.env`                 | Domain und Erstinstallations-Token                             | Lokal neu erstellen oder geschützte Konfiguration nutzen          |
| Volume `learning_data` | Konten, öffentliche Passkey-Schlüssel, Aufgaben und Lernstände | Externes Datenbank-Backup einspielen                              |
| Volume `caddy_data`    | Zertifikate und Caddy-Zustand                                  | Behalten; Caddy kann auf neuem Server erneut Zertifikate beziehen |
| Volume `caddy_config`  | Caddy-Laufzeitkonfiguration                                    | Aus Compose neu erstellen                                         |

Die vollständigen Volume-Namen tragen gewöhnlich den Compose-Projektnamen als Präfix. Das Repository-Verzeichnis nicht unbedacht umbenennen: Dadurch kann Compose neue, zunächst leere Volumes anlegen. Bei einem Verzeichniswechsel den bisherigen Projektnamen mit `docker compose -p ALTER-NAME ...` beibehalten und die Skripte entsprechend nicht ungeprüft verwenden.

`docker compose down` entfernt normalerweise keine benannten Volumes. **`docker compose down -v` entfernt auch die Daten-Volumes.** Ein Volume auf derselben Festplatte ist keine Sicherung gegen Serververlust.

## Sicherung erstellen

```bash
bash scripts/backup.sh
```

Optional ein eigenes Zielverzeichnis angeben:

```bash
bash scripts/backup.sh /home/DEIN-BENUTZER/lernreise-sicherungen
```

Das Skript hält eine laufende App kurz an, kopiert die geschlossene SQLite-Datenbank und erstellt ein zeitgestempeltes Archiv mit privaten Dateirechten. Eine zuvor laufende App wird auch bei einem Kopierfehler wieder gestartet. Eine bereits gestoppte App bleibt gestoppt. Währenddessen ist die Webseite kurz nicht verfügbar.

Das Archiv enthält `lernreise.sqlite`, die Prüfsumme `SHA256SUMS` sowie Git-Commit und Sicherungszeit in `version.txt`. Keine `.env` und keine privaten Passkey-Schlüssel vom Gerät werden gesichert. Datenbank und öffentliche Schlüssel sind trotzdem vertraulich. Das Archiv wird nicht verschlüsselt: Auf einem geschützten, bei Bedarf verschlüsselten externen Speicher aufbewahren. Nur Sicherungen aus vertrauenswürdiger Quelle einspielen; eine Prüfsumme beweist keine Urheberschaft.

Die Datei auf ein anderes System kopieren und mehrere ältere Stände aufbewahren. Keine Sicherungen in GitHub hochladen. Eine automatische zeitgesteuerte Sicherung ist noch nicht eingerichtet; das Skript allein führt keine regelmäßigen Backups aus.

## Update durchführen

1. `git status --short` und `git rev-parse HEAD` ansehen. Lokale Änderungen zuerst klären.
2. `bash scripts/backup.sh` ausführen und die Sicherung extern ablegen.
3. Änderungen und [Projektstand](PROJEKTSTAND.md) lesen, besonders bei künftigen Datenbankänderungen.
4. Den vorgesehenen Branch aktualisieren und neu bauen:

```bash
git pull --ff-only
docker compose up -d --build
docker compose ps
```

5. Anmeldung und eine Lernrunde prüfen. Den neuen Commit als eingesetzten Stand notieren.

Daten bleiben im Volume. Abhängigkeiten werden im Container mit `npm ci` aus der Lockdatei installiert. Node- und Caddy-Images verwenden bewegliche Hauptversion-Tags; bei Bedarf geprüfte Image-Digests zusätzlich festhalten.

## Einen älteren Stand verwenden

Vor einem Rückschritt eine Sicherung anlegen. Für einen getesteten Commit:

```bash
git checkout DEIN-GEPRUEFTER-COMMIT
docker compose up -d --build
```

Das ändert nur die Anwendung. Bei einer künftig inkompatiblen Schemaänderung muss auch die passende Datenbanksicherung nach [WIEDERHERSTELLUNG.md](WIEDERHERSTELLUNG.md) eingespielt werden. Die erste Version führt noch keine versionierten Datenbankmigrationen.

## Zugang verloren

Zuerst den zweiten Eltern-Passkey verwenden. Falls keiner mehr erreichbar ist:

```bash
docker compose exec app node admin.mjs list
docker compose exec app node admin.mjs recover KONTO-ID
```

Die Konto-ID exakt übernehmen. `recover` widerruft alle Passkeys, Sitzungen, Einladungen und ausstehenden Registrierungsvorgänge dieses Kontos. Der neue Link gilt 30 Minuten und ist vertraulich. Lernstände bleiben erhalten.

Ein zusätzlicher Einrichtungslink im Elternbereich ergänzt einen Passkey und widerruft verlorene Schlüssel nicht. Bei einem verlorenen Gerät deshalb die Server-Wiederherstellung verwenden.
