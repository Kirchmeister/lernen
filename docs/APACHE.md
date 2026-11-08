# Installation hinter vorhandenem Apache

Diese Variante ist für einen Ubuntu-Server gedacht, auf dem Apache direkt auf dem Host bereits andere Webseiten über 80/443 bedient. Bestehende Container bleiben in ihren bisherigen Compose-Projekten. Apache in einem Container benötigt eine andere Netzwerkplanung; dort diese Anleitung nicht unverändert verwenden.

## Aufbau

- Apache bleibt der einzige externe Webserver und übernimmt HTTPS.
- Lernreise verwendet ausschließlich [compose.apache.yaml](../compose.apache.yaml), ohne Caddy.
- Die App wird nur unter `127.0.0.1:18080` veröffentlicht; Apache leitet die eigene Lerndomain dorthin weiter.
- Compose-Projektname ist `lernreise`, das eigene Datenvolume heißt gewöhnlich `lernreise_learning_data`.
- Laufzeitlimits: eine halbe CPU, 384 MiB RAM und 128 Prozesse. Ein Image-Bau ist dadurch nicht begrenzt; freie Ressourcen vorher prüfen.

Apache unterstützt dafür [Reverse Proxy](https://httpd.apache.org/docs/2.4/en/howto/reverse_proxy.html). Die Auswahl über `COMPOSE_FILE` ist eine dokumentierte [Compose-Umgebungsvariable](https://docs.docker.com/compose/how-tos/environment-variables/envvars/).

## 1. Bestand aufnehmen

```bash
sudo apache2ctl configtest
sudo apache2ctl -S
sudo apache2ctl -M
sudo ss -ltnp
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
sudo docker compose ls
free -h
df -h /
```

Ein `Syntax OK` mit der Warnung AH00558 ist von einem Syntaxfehler zu unterscheiden. Das globale `ServerName` muss nicht für diese Installation geändert werden. Zuerst klären, ob bereits ein VirtualHost für die Lerndomain vorhanden ist, welcher Port frei ist und wie Zertifikate auf diesem Server verwaltet werden. Wenn eine Hosting-Verwaltung Apache-Dateien erzeugt, Änderungen über deren vorgesehenen Weg durchführen.

## 2. Repository und eigene Konfiguration

Nur wenn das Zielverzeichnis noch nicht existiert:

```bash
git clone https://github.com/Kirchmeister/lernen.git lernen
cd lernen
bash scripts/configure.sh lernen.funkymonkeytown.de --apache
```

Die Domain anpassen, wenn ein anderer Hostname verwendet wird. Bei einer vorhandenen `.env` bricht das Skript ab; niemals für eine bloße Variantenumstellung löschen. Dann Domain, bisheriges Datenvolume und Compose-Projektname zuerst feststellen. Für eine bestehende Installation ist eine bewusste Umzugsplanung erforderlich.

Der Apache-Modus schreibt zusätzlich zur Domain und zum geheimen Setup-Token diese nicht geheimen Werte in `.env`:

```dotenv
COMPOSE_FILE=compose.apache.yaml
COMPOSE_PROJECT_NAME=lernreise
APP_PORT=18080
```

Vor dem Start mit `sudo ss -ltnp` prüfen, dass dieser Port frei ist. Andernfalls `APP_PORT` ändern und Apache später auf denselben Port zeigen lassen. Auch bereits vorhandene Compose-Projekte bzw. Volumes namens `lernreise` zuerst klären.

```bash
sudo docker compose config --services
sudo docker compose config --quiet
```

Die erste Ausgabe muss **ausschließlich `app`** sein. Falls `caddy` auftaucht, nicht starten: Konfigurationsauswahl bzw. übergeordnete Umgebungsvariablen prüfen. Niemals beide Compose-Dateien per `-f` kombinieren. Extern gesetzte `COMPOSE_FILE`-/`COMPOSE_PROJECT_NAME`-Variablen oder explizite CLI-Flags können `.env` übersteuern.

## 3. Nur die App starten

```bash
sudo docker compose up -d --build app
sudo docker compose ps
curl --fail --silent --show-error http://127.0.0.1:18080/api/status
```

Erwartet wird `{"demo":false,"user":null}`. Außerdem muss die Portzuordnung nur `127.0.0.1:18080` enthalten. Noch keinen Elternzugang über unverschlüsseltes HTTP einrichten. Die Anwendung erwartet extern bereits `https://lernen.funkymonkeytown.de`.

Ein Fehler bei Port, Bau oder Start ist kein Anlass, andere Container oder Apache zu stoppen. Nur das eigene Projekt prüfen. Niemals globale `docker stop`-/`prune`-Befehle verwenden.

## 4. Eigene Apache-Konfiguration ergänzen

Die genaue Datei erst nach Prüfung vorhandener VirtualHosts und Zertifikate anlegen. Vor einer Änderung die betroffene Datei sichern. Für die Lerndomain eigene VirtualHosts verwenden; vorhandene Domain-Zuordnungen erhalten.

Im passenden HTTPS-VirtualHost werden benötigt:

```apache
ServerName lernen.funkymonkeytown.de
ProxyRequests Off
ProxyPreserveHost On
ProxyPass "/" "http://127.0.0.1:18080/"
ProxyPassReverse "/" "http://127.0.0.1:18080/"
```

Das ist nur der Proxy-Abschnitt, keine vollständige SSL-Konfiguration. Die Module `proxy`, `proxy_http` und `ssl` müssen verfügbar sein. Zertifikatspfade ausschließlich aus dem tatsächlich vorhandenen Zertifikat übernehmen. Keine SSL-Konfiguration mit nicht existierenden Zertifikatsdateien aktivieren.

Für ein neues Zertifikat die vorhandene Zertifikatsverwaltung beibehalten. Wenn Certbot verwendet wird, kann dessen [Webroot-Verfahren](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot) HTTP-Challenges über Apache ausliefern, ohne Apache für einen Standalone-Prozess anzuhalten. Dafür den Challenge-Pfad ausdrücklich vor der allgemeinen Proxy-Regel ausnehmen und einen eigenen Webroot freigeben. Eine vorhandene automatische Verlängerung inklusive Apache-Reload prüfen; ein neues Zertifikat nicht blind einem vorhandenen Zertifikatsnamen unterschieben.

Vor Aktivierung und nach jeder Änderung:

```bash
sudo apache2ctl configtest
```

Nur bei `Syntax OK` den vorgesehenen Reload ausführen:

```bash
sudo systemctl reload apache2
```

Ein Reload betrifft den gemeinsamen Apache-Prozess. Deshalb vor und nach der Änderung auch ausgewählte bestehende Webseiten prüfen. Kein pauschaler Restart und keine Änderungen an Standard-VirtualHosts oder globalen Weiterleitungen für diese Installation.

## 5. Abnahme und Konten

HTTPS für die Lerndomain, vorhandene Webseiten und die bisherige Containerliste prüfen. Danach Eltern- und Schülerkonten wie in [INSTALLATION.md](INSTALLATION.md) einrichten. Passkeys auf den tatsächlichen Mobiltelefonen testen. Ein lokaler Backend-Test ersetzt keine Prüfung des öffentlichen HTTPS-Zugangs.

## Betrieb und Wiederanlauf

Die [Backup- und Restore-Skripte](BETRIEB.md) laufen weiterhin im Projektverzeichnis. Sie lesen über Compose dieselbe `.env` und damit automatisch die Apache-Variante. Falls Docker sudo braucht, `sudo bash scripts/backup.sh` bzw. `sudo bash scripts/restore.sh ... --ersetzen` verwenden. Ein explizit abweichender Compose-Aufruf muss bei Betriebshilfen ebenfalls konsistent gewählt werden.

Bei einer Neuinstallation hinter Apache zuerst mit `configure.sh DOMAIN --apache` konfigurieren und dann wiederherstellen. Die Host-Apache-Konfiguration und Zertifikatsverwaltung gehören nicht zur Anwendungsdatenbank und müssen ebenfalls anhand dieser Anleitung bzw. der eigenen Serververwaltung eingerichtet werden. Die bisherige Domain für vorhandene Passkeys erhalten.

Für einen Rückweg nur den neu angelegten VirtualHost nach Sicherung deaktivieren, Apache-Konfiguration prüfen und reloaden. Die eigene App kann mit `sudo docker compose stop app` angehalten werden. Das Datenvolume und andere Projekte bleiben bestehen. Keine `down -v`- oder systemweiten Bereinigungsbefehle verwenden.
