# Projektstand

## Elternverwaltung ergänzt

- Zuordnung je Kind, sichtbare Inhaltsversionen samt Frageänderungen, Importvergleich, Export und Löschen.
- Elternvorschau für alle Fragetypen ohne Änderung von Schülerdaten.
- Atomare, einmalige Datenmigration; Anleitung und Rückweg in [ELTERNBEREICH.md](ELTERNBEREICH.md).
- Neue Tests für Migration, Familiengrenzen, Konflikte, Historie und unveränderte Schülerstatistik bei der Vorschau. Insgesamt 13 Node-Tests und 9 Python-Tests lokal bestanden.
- Die neue Oberfläche ist noch nicht in einem echten Browser geprüft; in der Erstellungsumgebung fehlte ein Chromium-Browser. Die Bedienung am Mobiltelefon bleibt Teil der Abnahme.

## Vorhanden

- Deutschsprachige, responsive Oberfläche mit Lernmissionen, Lernpunkten und persönlichen Meilensteinen.
- Eltern-/Schülerrollen und Passkeys, Einladung und administrative Wiederherstellung.
- JSON-Pakete mit Texteingabe, einer richtigen Multiple-Choice-Antwort und Zahlenaufgaben.
- Uploadprüfung und Inhaltsvorschau, Üben und Testen, Wiederholung und Archivierung.
- SQLite-Persistenz, Containerdefinition und Caddy-Konfiguration für HTTPS.
- Deutsche Dokumentation, KI-Wiederanlauf, Konfigurations-, Backup- und Restore-Hilfen.
- Lokale automatisierte Anwendungsprüfungen einschließlich kryptografischer Passkey-Signaturprüfung.
- Erfolgreicher [GitHub-Actions-Lauf vom 8. November 2026](https://github.com/Kirchmeister/lernen/actions/runs/42486357276): 16 Tests, Syntax-/Dokumentationsprüfung, Docker-Image-Bau und Compose-Validierung bestanden.

## Vor dem Einsatz noch praktisch prüfen

- Darstellung und Bedienung auf dem tatsächlichen Mobiltelefon und einem größeren Bildschirm.
- Passkey-Anlegen, Anmelden und Wiederherstellen auf den Zielgeräten unter der endgültigen Domain.
- Docker-Bau, HTTPS-Zertifikat und Neustartverhalten auf dem Ubuntu-Zielserver.
- Backup und vollständige Wiederherstellung auf einem getrennten Docker-Testsystem.

Die Erstellungsumgebung bot keine funktionierende Browser-Vorschau und keinen verifizierten Docker-Zielbetrieb. Shell-/Archivtests und Software-Authenticator-Tests sind enger begrenzt als diese praktische Abnahme.

## Noch nicht implementiert

- Einstellbare Rundengröße, Archivierungsschwelle oder Wiederholungsabstände.
- Detaillierte historische Elternberichte über den Versionsverlauf der Lernpakete hinaus.
- Lückentextaufgaben, Mehrfachauswahl, Audio oder Bilder in Aufgaben.
- Tippfehlertoleranz und freie semantische Bewertung.
- KI-API-Anbindung und automatische fachliche Prüfung der Inhalte.
- Zeitgesteuerte oder verschlüsselte externe Backups, automatisches Deployment und Monitoring.
- Differenzierte Datenaufbewahrung und Kontolöschung über die Oberfläche.
- Gehärteter öffentlicher Mehrfamilienbetrieb; aktuell Familienanwendung mit einer App-Instanz.

## Bekannte Details

- Schüler sehen nur ausdrücklich zugeordnete Pakete. Vorhandene Freigaben werden beim Update einmalig übernommen.
- Eine Zahl wird ohne die daneben vorgegebene Einheit eingegeben.
- Gleiches Aufgabenobjekt behält beim Import den Lernstand; die Objektfeld-Reihenfolge wird dabei ignoriert.
- In den automatisierten HTTP-Tests werden feste lokale Testports verwendet; diese müssen frei sein.
- Hinter Caddy teilen Besucher ein Verbindungslimit. Bei größerer Nutzung muss das vor einem öffentlichen Betrieb angepasst werden.
- Node-/Caddy-Hauptversion-Tags sind beweglich; `package-lock.json` fixiert npm-Abhängigkeiten, nicht das gesamte Betriebssystem-Image.

Aktuelle Bedienung und Regeln sind in [ARCHITEKTUR.md](ARCHITEKTUR.md) beschrieben. Geplante Funktionen nicht als bereits vorhanden behandeln.
