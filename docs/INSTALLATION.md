# Installation auf einem Ubuntu-Server

Diese Anleitung benötigt keine Datei aus einem früheren Chat. Der Quellcode wird aus dem Repository bezogen. Für die Rückkehr bestehender Konten und Lernstände zusätzlich [WIEDERHERSTELLUNG.md](WIEDERHERSTELLUNG.md) beachten.

## 1. Voraussetzungen

- Eine von Docker unterstützte Ubuntu-Version; Python 3 mindestens 3.9 für die Betriebshilfen.
- SSH-Zugang mit sudo-Rechten.
- Eine feste Domain, beispielsweise `lernen.deine-domain.de`, deren A-Eintrag auf die öffentliche IPv4 des Servers zeigt. Einen AAAA-Eintrag nur setzen, wenn IPv6 korrekt eingerichtet ist.
- TCP 80 und 443 müssen den Server erreichen. Der SSH-Zugang muss erhalten bleiben.
- Bei privatem Repository ein GitHub-Zugang mit Leserechten, zum Beispiel ein lesender Deploy-Key. Zugangsdaten nicht in die Clone-URL schreiben.

Die Domain vor dem Einrichten der ersten Passkeys festlegen und später möglichst beibehalten.

## 2. Systemwerkzeuge installieren

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git openssl python3
```

Docker Engine mit Compose-Plugin nach der [offiziellen Ubuntu-Anleitung](https://docs.docker.com/engine/install/ubuntu/) installieren. Falls Docker bereits vorhanden ist, keine zweite Installation darüberlegen. Danach:

```bash
docker version
docker compose version
```

Die folgenden Befehle setzen voraus, dass der angemeldete Benutzer Docker ausführen darf. Eine Mitgliedschaft in der Docker-Gruppe entspricht weitreichenden Rechten auf dem Server und sollte nur dem administrativen Benutzer gegeben werden. Alternativ die Docker-Befehle mit sudo ausführen.

## 3. Repository beziehen

```bash
git clone https://github.com/Kirchmeister/lernen.git lernen
cd lernen
git log -1 --oneline
```

Das private Repository ist [Kirchmeister/lernen](https://github.com/Kirchmeister/lernen). Vor dem Klonen den GitHub-Lesezugriff einrichten. Bei eingerichteter SSH-Authentifizierung kann alternativ `git@github.com:Kirchmeister/lernen.git` verwendet werden. Einen Token nicht in die URL schreiben.

Zum Wiederaufsetzen eines bestimmten Stands bei Bedarf vor der Installation:

```bash
git checkout DEIN-GEPRUEFTER-COMMIT
```

Das ergibt einen absichtlich losgelösten Git-Stand. Für normale Weiterentwicklung später auf den gewünschten Branch zurückwechseln.

## 4. Private Konfiguration anlegen

```bash
bash scripts/configure.sh lernen.deine-domain.de
```

Die Domain ersetzen, ohne `https://`, Port oder Pfad. Das Skript erstellt `.env` mit Dateirechten 600 und einem zufälligen Setup-Token. Es überschreibt keine bestehende `.env` und gibt das Geheimnis nicht aus.

```dotenv
DOMAIN=lernen.deine-domain.de
SETUP_TOKEN=ein-lokal-erzeugter-zufaelliger-wert
```

Die Datei bleibt auf dem Server. Der Beispielwert in [.env.example](../.env.example) ist kein produktives Geheimnis. Compose liest `.env` automatisch; bei direktem `node server.mjs` passiert das nicht.

## 5. Anwendung starten

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 app caddy
```

Die App lauscht nur im internen Docker-Netzwerk auf Port 3000. Caddy stellt HTTPS bereit. Sein automatischer Zertifikatsbezug benötigt korrektes DNS und erreichbare Web-Ports. Öffne `https://lernen.deine-domain.de`. Die Anmeldeseite sollte ohne Zertifikatswarnung erscheinen.

## 6. Eltern- und Schülerkonto einrichten

1. `.env` ausschließlich auf dem eigenen administrativen Gerät mit einem Editor öffnen.
2. Im eigenen Browser `https://DEINE-DOMAIN/?setup=DEIN-SETUP-TOKEN` öffnen. Die Platzhalter lokal ersetzen. Den vollständigen Link nicht teilen und nicht in einen KI-Chat kopieren.
3. Namen eingeben und einen Eltern-Passkey erstellen. Der Erstinstallations-Token funktioniert nur, solange noch kein Konto existiert.
4. Unter **Konten** einen zweiten eigenen Passkey auf einem geeigneten Ersatzgerät oder Authenticator ergänzen.
5. Ein Schülerkonto anlegen. Den 30 Minuten gültigen Link auf dem Gerät des Kindes öffnen und dort dessen Passkey erstellen.
6. Unter **Lernpakete** ein Paket aus [examples/](../examples/) hochladen, Fragen und Lösungen prüfen und freigeben.

Die Oberfläche entfernt den Setup-Parameter nach dem Einlesen aus der sichtbaren URL. Ein Einrichtungslink ist bis zu seinem Ablauf vertraulich zu behandeln.

## 7. Abnahme vor regelmäßigem Einsatz

- Eltern können sich an- und abmelden; ein Schüler hat keine Elternrechte.
- Das Kind kann sich auf seinem Mobiltelefon mit seinem eigenen Passkey anmelden.
- Texteingabe, Multiple Choice und Zahlen mit Dezimalkomma funktionieren.
- Eine falsche Übungsantwort erhält eine Erklärung und erscheint später erneut.
- Ein Test zeigt die Auswertung erst am Schluss.
- Nach `docker compose restart app` sind Konten und Lernstände vorhanden.
- Eine Sicherung nach [BETRIEB.md](BETRIEB.md) lässt sich auf einem separaten Testsystem wiederherstellen. Nicht dafür die einzige produktive Datenbank überschreiben.

## Häufige Startprobleme

| Beobachtung                      | Nächster Prüfschritt                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Zertifikat fehlt                 | DNS, A/AAAA, Portweiterleitung und `docker compose logs caddy` prüfen        |
| Passkey funktioniert nicht       | HTTPS, dauerhafte Domain, Browser und Geräteeinstellungen prüfen             |
| `SETUP_TOKEN fehlt`              | `.env` im Projektverzeichnis prüfen; Geheimnisse nicht posten                |
| Erstinstallationslink abgewiesen | Ein Konto existiert bereits; normalen Login oder Wiederherstellung verwenden |
| GitHub verweigert Clone          | Leseberechtigung bzw. Deploy-Key prüfen; Token nicht an die URL anhängen     |

Weiter: [Betrieb](BETRIEB.md) oder [KI-Wiederanlauf](KI-WIEDERANLAUF.md).
