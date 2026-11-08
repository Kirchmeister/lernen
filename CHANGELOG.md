# Änderungen

## 0.2.0 – Übersichtliche Elternverwaltung

- Pakete gezielt einem oder mehreren Kindern zuordnen; neue Inhalte zunächst ohne Freigabe.
- Inhaltsversion, Importzeit, Änderungsvorschau und vollständige frühere Versionen anzeigen.
- Fragen samt Änderungsstand lesen oder als Eltern ohne Schülerdatenänderung ausprobieren.
- Aktuelle und frühere Versionen als JSON exportieren; Pakete nach Bestätigung familienweit löschen.
- Bestehende Freigaben einmalig und atomar migrieren; Rückweg mit alter Sicherung dokumentieren.
- Schutz vor veralteten Importen und Zuordnungen, serverseitige Zugriffsprüfung sowie zusätzliche Integrations- und Migrationstests.

## Betrieb hinter bestehendem Apache

- Eigenständige Compose-Datei ohne Caddy, nur auf Loopback-Port 18080 veröffentlicht.
- Konfiguration mit `configure.sh DOMAIN --apache` und festem Projektnamen ergänzt.
- Deutsche Anleitung für Bestandsaufnahme, Proxy, HTTPS und Wiederherstellung ergänzt.
- Zusätzliche Tests für Variantenwahl und Konfigurationsfehler; CI validiert beide Compose-Dateien.

## GitHub-Übernahme

- Quellcode und Dokumentation auf `Kirchmeister/lernen`, Branch `main`, übernommen; ursprünglichen GitHub-Commit erhalten.
- Bestätigte Clone-URL in die Installationsanleitungen eingetragen.
- [Erster GitHub-Actions-Lauf](https://github.com/Kirchmeister/lernen/actions/runs/42486357276) erfolgreich: 16 Tests, Image-Bau und Compose-Konfiguration.
- Produktiver Serverbetrieb und reale Geräteprüfung stehen weiterhin aus.

## Vorbereitung für GitHub

- README als Einstieg für Installation, Betrieb und Datenwiederherstellung neu strukturiert.
- Deutsche Anleitungen zu Architektur, Lernpaketen, Entwicklung, GitHub-Übernahme und KI-Wiederanlauf ergänzt.
- Arbeitsanleitung `AGENTS.md` für spätere KI-Unterstützung hinzugefügt.
- Sichere lokale Konfiguration, Datenbank-Backup und geprüfte Wiederherstellung als Skripte ergänzt.
- Quellcode zur besseren Lesbarkeit formatiert; bestehende technische Kommentare übersetzt.
- Git-Ausschlüsse für Geheimnisse, Datenbanken, Sicherungen und Arbeitsdateien erweitert.
- Automatische GitHub-Prüfung vorbereitet; noch nicht auf GitHub ausgeführt.
- Lokal bestanden: neun Anwendungstests und sieben Prüfungen der Betriebshilfen sowie Syntax- und Dokumentationslinkprüfung.
- Noch offen: echte Browser-/Geräteprüfung und Container-/Restore-Abnahme auf dem Ubuntu-Zielserver.

## Erste Version

- Eltern-/Schülerkonten mit Passkeys und Einladungen.
- Paketimport, Texteingabe, Multiple Choice und Zahlenantworten.
- Übungs- und Testmodus, gezielte Wiederholung und Archivierung nach drei Erfolgstagen.
- Persönliche Lernpunkte und Meilensteine.
- Beispielpakete Englisch, Latein und Physik.
