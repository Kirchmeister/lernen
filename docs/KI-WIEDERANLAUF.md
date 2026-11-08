# Wiederanlauf mit KI-Unterstützung

Dieses Dokument ist der Einstieg für einen künftigen Chat oder Coding-Agenten. Es benötigt keine ursprüngliche Chat-Datei. Code und Anleitungen im ausgecheckten Repository sind die verbindliche Quelle.

## Diesen Auftrag an eine KI geben

> Hilf mir, die Lernplattform aus diesem GitHub-Repository auf einem neuen Ubuntu-Server wieder in Betrieb zu nehmen. Lies zuerst README.md, AGENTS.md, docs/PROJEKTSTAND.md, docs/INSTALLATION.md und docs/WIEDERHERSTELLUNG.md direkt aus dem Repository. Ermittle den aktuellen Git-Stand und führe keine angenommenen alten Befehle aus dem Gedächtnis aus. Kläre, ob ich frisch anfangen oder vorhandene Konten und Lernstände aus einer Sicherung übernehmen möchte. Verwende die vorhandene Docker-Compose-Konfiguration und die dokumentierten Betriebsskripte. Erhalte bei einer Datenübernahme möglichst die bisherige Domain wegen der Passkeys. Erzeuge Geheimnisse lokal; verlange keine Tokens, privaten Schlüssel oder vollständige Datenbank in diesem Chat. Prüfe nach dem Start HTTPS, getrennte Rollen, Passkeys auf meinen Geräten, Daten nach Neustart und eine externe Sicherung. Dokumentiere jeden tatsächlich ausgeführten Schritt und unterscheide bestandene Prüfungen von noch offenen Prüfungen. Erfinde keine fehlenden Lernstände und ändere keine Authentifizierungsregeln, um einen Login zu umgehen.

Die tatsächliche Repository-URL zusammen mit diesem Auftrag angeben. Bei einem privaten Repository der KI einen geeigneten Lesezugriff geben.

## Angaben, die für den Wiederanlauf gebraucht werden

| Angabe                                            | Woher?                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Repository-URL und gewünschter Commit/Branch      | GitHub; bei Datenübernahme möglichst `version.txt` aus dem Backup   |
| Gewünschte Domain und ggf. bisherige Domain       | Eigene DNS-Verwaltung                                               |
| Zielserver und geeigneter administrativer Zugriff | Eigene Serververwaltung; Zugang über einen dafür vorgesehenen Kanal |
| Frisch anfangen oder Daten übernehmen?            | Eigene Entscheidung                                                 |
| Lokaler Pfad zur Sicherung, sofern vorhanden      | Eigener geschützter Sicherungsspeicher                              |
| Verfügbarkeit bestehender Passkey-Geräte          | Eigene Geräte bzw. Passkey-Anbieter                                 |

Passwörter, private SSH-Schlüssel, Einrichtungslinks und Datenbankinhalte nicht in den Auftrag einfügen. Eine beschreibende Angabe wie „Sicherung liegt geschützt auf dem Server unter …“ genügt.

## Verbindliche Reihenfolge

1. Repository lesen und Status/Versionsstand prüfen.
2. Vorhandene Serverdaten und Volumes feststellen; nichts ungeprüft überschreiben.
3. Neuinstallation oder Datenwiederherstellung auswählen.
4. Domain und HTTPS vorbereiten.
5. Konfiguration lokal erzeugen, Container bauen und gegebenenfalls Backup mit dem dokumentierten Skript einspielen.
6. Auf echten Geräten testen. Passkeys bei Bedarf über die dokumentierte administrative Wiederherstellung neu einrichten.
7. Datenpersistenz und externes Backup prüfen.
8. Eingesetzten Git-Commit und Ergebnisse ohne Geheimnisse festhalten.

## Was nicht versprochen werden darf

Ein Klon des Repositories enthält keine persönlichen Konten oder Lernstände. Ein Software-Passkey-Test beweist keine Gerätekompatibilität. Ein syntaktisch korrektes Skript beweist keinen erfolgreichen Restore auf dem Zielserver. Ein vorbereiteter Workflow ist noch kein bestandener GitHub-Lauf. Bei beweglichen Container-Tags ist der Neubau nicht byteidentisch zum früheren Image.
