# Architektur und Lernregeln

## Komponenten

| Bestandteil           | Aufgabe                                                         |
| --------------------- | --------------------------------------------------------------- |
| Caddy                 | Externes HTTPS, Zertifikate, Weiterleitung an die App           |
| Node.js 24            | Ein Prozess für statische Oberfläche und JSON-API               |
| SQLite                | Lokale dauerhafte Datenhaltung; ein gemeinsames App-Volume      |
| SimpleWebAuthn Server | Kryptografische Prüfung der Passkey-Registrierung und Anmeldung |
| HTML, CSS, JavaScript | Responsive deutsche Oberfläche ohne Frontend-Framework          |

Die Anwendung lädt keine externen Schriftarten und enthält keine Trackingdienste. Eine KI ist zur Laufzeit nicht beteiligt. Inhalte werden vorab als JSON vorbereitet. Aktuell ist genau eine App-Instanz vorgesehen, kein Cluster mit mehreren schreibenden Replikaten.

## Dateien und Verantwortlichkeiten

- [server.mjs](../server.mjs): Schemaanlage, Sitzungen, Einladung, WebAuthn-Endpunkte, Rollen, Pakete, Runden und statische Dateien. `api` verteilt Anfragen; `state` liefert nur die jeweils erforderlichen Ansichten.
- [learning.mjs](../learning.mjs): `validatePack` prüft Uploads, `grade` bewertet Antworten, `advance` aktualisiert den Lernstand und `publicQuestion` entfernt Lösungsfelder.
- [admin.mjs](../admin.mjs): Lokale Verwaltungsbefehle mit direktem Datenbankzugriff; nicht über die Webseite erreichbar.
- [public/app.js](../public/app.js): Navigation, Formulare, Passkey-Browseraufrufe und Darstellung. Die verbindliche Bewertung erfolgt immer auf dem Server.
- [public/style.css](../public/style.css): Farben, Komponenten, Bildschirmgrößen und reduzierte Bewegung.

## Identität und Zugriffe

Elternkonten verwalten die eigene Familie. Schüler sehen die Pakete ihrer Familie und nur ihren eigenen Lernstand. Die Familienzugehörigkeit kommt aus der serverseitigen Sitzung, nicht aus frei übermittelten Formularwerten.

Der erste Elternzugang benötigt den lokal erzeugten Setup-Token und eine leere Kontentabelle. Spätere Schülerzugänge verwenden kurzlebige Einladungslinks. Passkey-Challenges sind an einen Browser-Cookie gebunden, fünf Minuten gültig und werden bei der Prüfung einmalig verbraucht. Nutzerverifikation ist erforderlich. Die Anmeldung prüft Challenge, Signatur, externe Origin und Relying-Party-ID.

Die Datenbank speichert öffentliche Passkey-Schlüssel; biometrische Daten oder private Passkey-Schlüssel werden nicht an die App übertragen. Sitzungscookies sind HttpOnly und SameSite=Strict sowie im regulären HTTPS-Betrieb Secure. Schreibende API-Aufrufe brauchen die passende Origin und JSON.

## Tabellen

| Tabelle       | Inhalt                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| `users`       | ID, Familie, Anzeigename und Rolle                                         |
| `credentials` | Öffentliche Schlüssel, Credential-ID, Signaturzähler und Transporthinweise |
| `sessions`    | Gehashte Sitzungstokens mit Ablaufzeit                                     |
| `challenges`  | Gehashte, einmalige WebAuthn-Vorgänge mit Ablaufzeit                       |
| `invites`     | Gehashte Einladungen mit Ablaufzeit und Zielkonto                          |
| `packages`    | Lernpakete je Familie und stabiler Paket-ID                                |
| `progress`    | Lernstand je Schüler, Paket und Aufgabe                                    |
| `rounds`      | Aktuelle Warteschlange, Runde und Auswertung                               |
| `attempts`    | Erste Antworten als richtig/falsch für Statistik und Lernpunkte            |

Das Schema wird beim Start mit `CREATE TABLE IF NOT EXISTS` angelegt. Es gibt bislang kein versioniertes Migrationssystem. SQLite läuft mit WAL und Fremdschlüsselprüfung.

## Ablauf einer Lernrunde

1. Höchstens zehn nicht archivierte Aufgaben werden ausgewählt. Weniger gefestigte Aufgaben erhalten Vorrang; innerhalb vergleichbarer Lernstände wird gemischt.
2. Die Oberfläche bekommt die Frage und bei Auswahlaufgaben die Optionen, jedoch keine Lösung oder Erklärung.
3. Der Server akzeptiert nur die aktuell erwartete Aufgabe der eigenen Runde.
4. Die erste Antwort fließt in Lernstand, Statistik und Lernpunkte ein.
5. Im Übungsmodus gibt es sofort Rückmeldung. Eine falsche Frage wird nach bis zu zwei anderen Aufgaben einmal erneut eingefügt. Auch nach einem erneuten Fehler endet ihre Behandlung in dieser Runde.
6. Im Test gibt es keine Wiederholung und die Oberfläche zeigt Ergebnisse erst am Ende.
7. Ein Kind hat höchstens eine offene Runde. Beim erneuten Start wird sie fortgesetzt; bewusstes Beenden behält bisherige Antworten.

## Lernstand

- Erste richtige Antwort: ein Erfolgstag, sofern an diesem Tag noch kein Versuch für die Aufgabe gezählt wurde.
- Weitere richtige Antworten am selben Kalendertag erhöhen den Zähler nicht.
- Drei erfolgreiche Tage ergeben `archived=true`; dazwischen muss nicht täglich gelernt werden.
- Eine falsche erste Antwort setzt den Zähler auf null und merkt den Tag. Ein späterer Erfolg am selben Tag zählt deshalb noch nicht als neuer Erfolgstag.
- Der Übungs-Wiederholungsversuch ändert den Lernstand nicht.
- Zeitzone ist fest `Europe/Berlin`.
- Archivierte Aufgaben erscheinen auch in Tests nicht mehr. Eltern können den Lernstand eines ganzen Pakets zurücksetzen.

Richtig und falsch im Test beeinflussen denselben Lernstand wie erste Übungsantworten. Die Schwelle drei und die Rundengröße zehn sind aktuell im Code festgelegt. Pro richtiger erster Antwort gibt es zehn Lernpunkte, pro falscher zwei fürs Ausprobieren. Wiederholungen geben keine zusätzlichen Punkte.

## Paketaktualisierung

Die Paket-ID bezeichnet das Paket innerhalb der Familie; die Aufgaben-ID bezeichnet eine Aufgabe darin. Ein unverändertes Aufgabenobjekt behält bei erneutem Import den Lernstand. Bei geänderten oder entfernten Aufgaben wird deren Lernstand zurückgesetzt. Aktuell vergleicht die App die serialisierten Aufgabenobjekte; auch eine andere Reihenfolge der JSON-Felder kann deshalb als Änderung gelten. Die Reihenfolge der Aufgaben selbst darf sich ändern.

Ein Paket mit laufender Runde kann nicht geändert werden. Alle Schüler einer Familie erhalten automatisch alle freigegebenen Pakete. Eine Zuweisung einzelner Pakete an einzelne Kinder ist noch offen.

## Grenzen

Das Rate-Limit zählt die direkte Verbindung. Hinter Caddy teilen Besucher dessen Limit. Gesundheits-/Betriebsmonitoring, automatische Sicherungen, differenzierte Aufbewahrungsregeln und ein öffentlicher Mehrfamilienbetrieb sind noch nicht umgesetzt. Weitere offene Punkte stehen im [Projektstand](PROJEKTSTAND.md).
