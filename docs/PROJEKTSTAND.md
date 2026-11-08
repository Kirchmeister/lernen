# Projektstand

## Vorhanden

- Deutschsprachige, responsive Oberfläche mit Lernmissionen, Lernpunkten und persönlichen Meilensteinen.
- Eltern-/Schülerrollen und Passkeys, Einladung und administrative Wiederherstellung.
- JSON-Pakete mit Texteingabe, einer richtigen Multiple-Choice-Antwort und Zahlenaufgaben.
- Uploadprüfung und Inhaltsvorschau, Üben und Testen, Wiederholung und Archivierung.
- SQLite-Persistenz, Containerdefinition und Caddy-Konfiguration für HTTPS.
- Deutsche Dokumentation, KI-Wiederanlauf, Konfigurations-, Backup- und Restore-Hilfen.
- Lokale automatisierte Anwendungsprüfungen einschließlich kryptografischer Passkey-Signaturprüfung.

## Vor dem Einsatz noch praktisch prüfen

- Darstellung und Bedienung auf dem tatsächlichen Mobiltelefon und einem größeren Bildschirm.
- Passkey-Anlegen, Anmelden und Wiederherstellen auf den Zielgeräten unter der endgültigen Domain.
- Docker-Bau, HTTPS-Zertifikat und Neustartverhalten auf dem Ubuntu-Zielserver.
- Backup und vollständige Wiederherstellung auf einem getrennten Docker-Testsystem.
- GitHub-Actions-Lauf nach dem Upload; lokal ist kein entfernter Workflow ausgeführt.

Die Erstellungsumgebung bot keine funktionierende Browser-Vorschau und keinen verifizierten Docker-Zielbetrieb. Shell-/Archivtests und Software-Authenticator-Tests sind enger begrenzt als diese praktische Abnahme.

## Noch nicht implementiert

- Einstellbare Rundengröße, Archivierungsschwelle oder Wiederholungsabstände.
- Individuelle Paketzuweisung pro Kind und detaillierte historische Elternberichte.
- Lückentextaufgaben, Mehrfachauswahl, Audio oder Bilder in Aufgaben.
- Tippfehlertoleranz und freie semantische Bewertung.
- KI-API-Anbindung und automatische fachliche Prüfung der Inhalte.
- Zeitgesteuerte oder verschlüsselte externe Backups, automatisches Deployment und Monitoring.
- Formale Datenbankmigrationen, differenzierte Datenaufbewahrung und Kontolöschung über die Oberfläche.
- Gehärteter öffentlicher Mehrfamilienbetrieb; aktuell Familienanwendung mit einer App-Instanz.

## Bekannte Details

- Alle Schüler einer Familie sehen dieselben Pakete.
- Eine Zahl wird ohne die daneben vorgegebene Einheit eingegeben.
- Gleiches Aufgabenobjekt behält beim Import den Lernstand; auch abweichende Feldreihenfolge kann derzeit als Änderung gelten.
- In den automatisierten HTTP-Tests werden feste lokale Testports verwendet; diese müssen frei sein.
- Hinter Caddy teilen Besucher ein Verbindungslimit. Bei größerer Nutzung muss das vor einem öffentlichen Betrieb angepasst werden.
- Node-/Caddy-Hauptversion-Tags sind beweglich; `package-lock.json` fixiert npm-Abhängigkeiten, nicht das gesamte Betriebssystem-Image.

Aktuelle Bedienung und Regeln sind in [ARCHITEKTUR.md](ARCHITEKTUR.md) beschrieben. Geplante Funktionen nicht als bereits vorhanden behandeln.
