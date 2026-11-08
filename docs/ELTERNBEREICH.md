# Lernpakete als Eltern verwalten

## Welches Kind sieht welche Inhalte?

Unter **Lernpakete** zeigt jede Karte Titel, Fach, Fragenzahl, Inhaltsversion, Änderungszeit und die zugeordneten Kinder. **Verwalten und Fragen prüfen** öffnet die Einzelansicht.

Bei **Zuordnung zu Kindern** die gewünschten Namen ankreuzen und **Zuordnung speichern** wählen. Mehrere Kinder können dasselbe Paket bearbeiten, jedes mit eigenem Lernstand. Ohne Häkchen bleibt das Paket nur im Elternbereich. Die Zuordnung steht nicht in der importierten JSON-Datei und wird niemals aus dem Namen des Kindes oder dem Inhalt erraten.

Neue Pakete sind zunächst keinem Kind zugeordnet. Beim Import kannst du die Kinder direkt auswählen. Neu angelegte Schülerkonten erhalten keine automatischen Paketfreigaben.

**Ausnahme beim erstmaligen Update von der alten Anwendung:** Früher konnten alle Kinder einer Familie sämtliche Pakete sehen. Diese vorhandenen Zugänge werden einmalig in ausdrückliche Zuordnungen übernommen. Deshalb bleiben bestehende Pakete zunächst den bereits vorhandenen Kindern zugeordnet. Unter Lernpakete kannst du das ändern. Ein späterer Neustart setzt deine Auswahl nicht zurück.

Entfernst du eine Zuordnung, verschwindet das Paket beim Kind. Eine offene Runde dieses Pakets wird beendet; bereits beantwortete Aufgaben, Punkte und Lernstände bleiben erhalten. Eine erneute Zuordnung setzt am vorhandenen Lernstand an. Bereits im Browser angezeigte Inhalte lassen sich nicht nachträglich zurückholen, weitere Antworten werden aber serverseitig abgewiesen.

Im **Elternbereich** stehen unter jedem Kind seine zugeordneten Pakete samt Version. Die darüberstehenden Statistiken umfassen auch bisherige Übungen in inzwischen ausgeblendeten Paketen.

## Fragen prüfen und ausprobieren

Der Menüpunkt **Fragen prüfen** führt zu allen gespeicherten Paketen, auch zu noch nicht zugeordneten. In der Einzelansicht gibt es zwei Wege:

- **Alle Fragen mit Lösungen:** jede Frage aufklappen, Auswahlantworten, richtige Lösung, Erklärung und Fragen-ID lesen. Bei Eingabefragen werden auch die Bewertungsregeln angezeigt.
- **Alle Fragen ausprobieren:** jede Frage selbst beantworten und prüfen lassen. Die verbindliche Bewertung verwendet dieselbe Serverfunktion wie beim Kind. Alle Fragen sind in Dateireihenfolge erreichbar, unabhängig vom Archivierungsstand und ohne Begrenzung auf zehn. Vor-/Zurück, erneuter Versuch und direkte Fragenauswahl helfen beim Prüfen.

Die Vorschau ist eine eigene Elternfunktion. Sie erstellt keine Lernrunden oder Antworten in der Datenbank, vergibt keine Punkte und verändert keine Schülerstatistik. Die Auswahlantworten bleiben zur besseren Prüfung in Dateireihenfolge; Schüler sehen weiterhin eine gemischte Reihenfolge. Du kannst auch eine frühere Version ausprobieren.

## Import und Versionsverlauf

Vor dem Speichern zeigt die Importvorschau ausdrücklich:

- **Neues Paket · Version 1**, wenn die Paket-ID noch nicht existiert.
- **Aktualisiert … von Version X auf Y**, wenn dieselbe ID mit anderem Inhalt importiert wird.
- **Identischer Inhalt**, wenn keine Inhaltsänderung vorliegt. Dann entsteht keine zusätzliche Version.

Du siehst die Anzahl neuer, geänderter, entfernter und unveränderter Fragen. Die betroffenen Fragetexte lassen sich aufklappen. Bei einem Update sind die bisherigen Kinder vorausgewählt. Eine inzwischen in einem anderen Browser geänderte Version oder Zuordnung wird nicht still überschrieben: neu öffnen bzw. Datei erneut prüfen.

Jede Inhaltsänderung speichert einen vollständigen Stand mit Zeit und importierendem Elternnamen. Auch Änderungen am Titel oder der Fragenreihenfolge erzeugen eine Version. Die Reihenfolge der Felder innerhalb eines JSON-Objekts zählt nicht als Änderung. Bei unverändertem Aufgabenobjekt bleibt der Lernstand erhalten; geänderte oder entfernte Aufgaben verlieren ihren bisherigen aktuellen Lernstand. Frühere Antworten bleiben bis zur Paketlöschung in der Gesamtstatistik.

In **Versionsverlauf** kannst du ältere Inhalte ansehen. An jeder Frage steht die Inhaltsversion, in der sie zuletzt geändert wurde. **Diese Version als JSON herunterladen** exportiert den ausgewählten Stand. Soll eine ältere Version wieder aktuell werden, die exportierte Datei neu importieren und die Änderungsvorschau prüfen; sie wird als nächste Version gespeichert, die Historie bleibt erhalten. Ein früherer Lernstand wird dadurch nicht wiederhergestellt.

Die JSON-Angabe `version: 1` ist weiterhin ausschließlich die **Formatversion**. Die sichtbare Inhaltsversion zählt die Anwendung selbst; die KI muss sie nicht setzen.

Vor diesem Update importierte Stände werden als Version 1 mit „Bestand übernommen · früheres Importdatum unbekannt“ angezeigt. Bereits früher überschriebene Inhalte und Zeitpunkte können nicht nachträglich rekonstruiert werden.

## Ausblenden, erneut üben oder löschen?

| Ziel | Aktion | Folge |
|---|---|---|
| Ein Kind soll das Paket vorerst nicht mehr sehen | Zuordnung entfernen | Inhalte, Lernstand und Punkte bleiben erhalten |
| Ein weiteres Kind möchte mitlernen | Zusätzliches Kind auswählen | Eigenständiger Lernstand für dieses Kind |
| Ein Kind soll von vorn beginnen | Im Elternbereich dessen Lernstand für das Paket zurücksetzen | Andere Kinder und bisherige Antwortstatistik bleiben unverändert |
| Ein Paket vollständig entfernen | In der Paketansicht endgültig löschen und bestätigen | Alle Versionen, Zuordnungen, Lernstände, Runden und Antworten dieses Pakets in der Familie werden entfernt |

Löschen verändert auch die daraus berechneten Lernpunkte und Statistiken. Eine offene Runde verhindert die Löschung; Runde beenden oder zuerst die Zuordnung entfernen. Vor einer Löschung bei Bedarf JSON exportieren und eine Datenbanksicherung aufbewahren. Ein JSON-Export enthält keine Konten oder Lernstände. Einen Papierkorb gibt es noch nicht.

## Update einer bestehenden Installation

Vor dem Update eine Sicherung mit [BETRIEB.md](BETRIEB.md) erstellen. Beim ersten Start legt die App in einer SQLite-Transaktion `schema_migrations`, `package_revisions` und `package_assignments` an. Bestehende Pakete werden als erster Versionsstand übernommen, vorhandenen Schülern ihrer Familie zugeordnet; bestehende Konten, Antworten und Fortschritte bleiben erhalten. Die Migration `package-management-v1` wird genau einmal durchgeführt.

Bei einem Fehler wird die gesamte Migration zurückgerollt und der Start bricht ab. Nicht durch Löschen der Datenbank umgehen; App-Protokoll und Sicherung prüfen. Die normalen Backup-/Restore-Skripte sichern die komplette SQLite-Datei einschließlich neuer Tabellen.

**Rückweg:** Alten Code nur zusammen mit der Datenbanksicherung von vor diesem Update verwenden, siehe [WIEDERHERSTELLUNG.md](WIEDERHERSTELLUNG.md). Der alte Code ignoriert die neue Zuordnung und Historie und würde wieder allen Kindern alle Pakete zeigen. Er darf daher nicht schreibend mit der migrierten Datenbank betrieben werden. Nach dem Backup entstandene Lernstände sind in einer älteren Sicherung nicht enthalten. Apache-Konfiguration, Ports, Compose-Projektname und Datenvolume bleiben bei diesem Anwendungsupdate unverändert.
