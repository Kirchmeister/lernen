# Wiederherstellung nach einer Neuinstallation

Bei einem Server mit vorhandenem Apache zuerst [APACHE.md](APACHE.md) lesen. Dort wird die Variante ohne Caddy ausgewählt; keinen zweiten Dienst auf 80/443 starten.

## Neu anfangen oder Daten erhalten?

| Verfügbar                                    | Ergebnis                                                      |
| -------------------------------------------- | ------------------------------------------------------------- |
| Nur das GitHub-Repository                    | Anwendung und Beispiele neu installieren; neue Konten anlegen |
| Repository und gültige Datenbanksicherung    | Bisherige Konten, Aufgaben und Lernstände wiederherstellen    |
| Repository und noch vorhandenes Daten-Volume | Bestehendes Volume weiterverwenden; nicht blind ersetzen      |

Eine KI kann frühere Lernstände nicht aus dem Quellcode oder aus Erinnerungen an den Chat rekonstruieren. Dafür ist die Datenbanksicherung erforderlich. Ein ZIP-Archiv aus diesem Chat wird für keinen Ablauf benötigt.

## A. Frische Installation nur aus GitHub

Die [Installationsanleitung](INSTALLATION.md) durchlaufen. Domain festlegen, Repository klonen, `.env` mit `scripts/configure.sh` erzeugen und Compose starten. Ein neues Elternkonto einrichten, anschließend Schülerkonten und Lernpakete anlegen.

Das ist auch möglich, wenn sämtliche Dateien des alten Servers verloren sind und es keine Sicherung gibt. Es beginnt eine neue Lernhistorie.

## B. Bisherige Daten aus einer Sicherung übernehmen

Voraussetzungen: eine Sicherung von `scripts/backup.sh`, der passende Git-Stand, dieselbe Domain und Geräte mit vorhandenen Passkeys oder eine administrative Wiederherstellungsmöglichkeit.

1. Auf dem neuen Server die Voraussetzungen aus [INSTALLATION.md](INSTALLATION.md) herstellen und das Repository klonen.
2. Nach Möglichkeit den in `version.txt` vermerkten Git-Commit verwenden. Die Version lässt sich lokal mit `tar -xOf SICHERUNG.tar.gz version.txt` lesen. Keine Datenbank oder Geheimnisse in einen KI-Chat laden.
3. Mit `bash scripts/configure.sh DEINE-BISHERIGE-DOMAIN` eine neue `.env` erstellen; bei vorhandenem Apache dafür `bash scripts/configure.sh DEINE-BISHERIGE-DOMAIN --apache` verwenden. Der neue Setup-Token darf anders sein: Bei vorhandenen Konten dient er nicht zum Anmelden.
4. Die Sicherung geschützt auf den neuen Server übertragen. Schreibzugriffe auf dem alten Server beenden, bevor zwei Systeme denselben Datenstand verwenden.
5. Im neuen Repository ausführen:

```bash
bash scripts/restore.sh /absoluter/pfad/lernreise-SICHERUNGSZEIT.tar.gz --ersetzen
```

Das Flag bestätigt bewusst das Ersetzen der Datenbank. Das Skript prüft Dateinamen, Prüfsumme, SQLite-Integrität und erforderliche Tabellen, bevor Docker-Daten geändert werden. Es baut die App, hält sie an und sichert vorhandene Daten zusätzlich unter `backups/`. Dann spielt es die Sicherung mit passenden Dateirechten ein und startet die Dienste.

Schlägt der Restore nach dem Anhalten fehl, startet das Skript die App nicht blind wieder. Die Fehlermeldung prüfen. Die vorherige Sicherung bleibt verfügbar; bei unveränderter Datenbank kann `docker compose up -d` den bisherigen Betrieb wieder aufnehmen.

6. DNS auf den neuen Server umstellen, soweit noch nicht geschehen. DNS-Zwischenspeicherung berücksichtigen. Caddy kann nach korrekter Umstellung neue Zertifikate beziehen.
7. Über HTTPS anmelden. Namen, Lernpakete und Lernstand prüfen. Eine Lernrunde ausführen und die App einmal neu starten.
8. Eine neue Sicherung erstellen und wieder extern ablegen.

## Passkeys nach dem Umzug

Für die Weiterverwendung müssen Domain/Relying-Party-ID und öffentliche Schlüssel in der Datenbank erhalten bleiben. Der private Schlüssel muss auf einem erreichbaren Gerät oder über den verwendeten Passkey-Anbieter verfügbar sein. Die Sicherung kopiert keinen privaten Schlüssel vom alten Gerät.

Bei einem Domainwechsel passen bisherige Passkeys grundsätzlich nicht zur neuen Domain. Auch bei verlorenem Gerät kann eine Neuregistrierung nötig sein. Dafür den unter [BETRIEB.md](BETRIEB.md) dokumentierten Befehl `admin.mjs recover` verwenden. Keine Umgehung der Passkey-Prüfung einbauen.

## C. Altes Daten-Volume noch vorhanden

Zuerst `docker volume ls` ansehen und das richtige Volume feststellen. Bisherigen Compose-Projektnamen, Domain und Stand beibehalten. Dann mit `docker compose up -d --build` starten. Keine leere Sicherung einspielen und kein neues Elternkonto anlegen, bevor der tatsächliche Datenbestand geklärt ist.

## Erfolgskriterien

- HTTPS funktioniert unter der gewünschten Domain.
- Eltern- und Schüleranmeldung funktionieren auf den verwendeten Geräten.
- Der Schüler hat keine Elternrechte.
- Erwartete Pakete und Lernstände sind vorhanden, sofern eine Sicherung eingespielt wurde.
- Ein Neustart erhält die Daten.
- Eine neue externe Sicherung existiert.

Für KI-Unterstützung siehe [KI-WIEDERANLAUF.md](KI-WIEDERANLAUF.md).
