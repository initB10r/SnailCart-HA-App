# Changelog

## 0.16.10

- **Angebote-Tab respektiert Listen-Sichtbarkeit**: Bisher bekamen alle
  Benutzer (auch Admins) im Angebote-Tab Treffer aus *allen* Listen
  serviert — auch aus solchen, auf die sie keinen Zugriff haben.
  Standardmäßig werden jetzt nur noch Angebote für eigene + freigegebene
  Listen angezeigt. Admins können oben rechts „Alle Listen (Admin)"
  einschalten, um den globalen Überblick zurückzubekommen (wie beim
  Listen-Tab).
- **Sammel-Einkauf zeigt Angebote**: Beim gleichzeitigen Einkauf über
  mehrere Listen tauchen die grünen Angebotszeilen (inkl. „+N"-Badge bei
  mehreren Treffern) jetzt direkt unter den Artikeln auf — vorher waren
  sie dort komplett unsichtbar, obwohl sie pro Einzelliste längst
  geladen wurden.

## 0.16.9

- **Dark Mode Trennlinien dezenter**: Item-Reihen in Einkaufslisten und
  Speisekammer, Sheet-Header und Listen-Trenner sind nicht mehr knallhell
  weiß auf dunkel — die Linien sind jetzt durchweg ein subtiles 5%-Weiß
  (kaum sichtbar, aber noch da als Strukturhilfe).

## 0.16.8

- **MHD-Feld absichern**: iOS' Datums-Picker übernahm beim Antippen
  manchmal das aktuelle Datum, auch wenn der Nutzer nichts ausgewählt
  hat — und löste damit ungewollte MHD-Warnungen aus. Neben dem
  MHD-Eingabefeld gibt's jetzt einen **×-Button** zum schnellen Leeren,
  ein Hinweistext „Leer lassen = kein MHD und keine Warnung" und der
  Server lehnt alles ab, was kein sauberes `YYYY-MM-DD` ist (wird
  serverseitig zu `null` normalisiert).

## 0.16.7

- **EAN-Scan in der Speisekammer**: Beim Anlegen eines Vorrats-Artikels
  gibt's jetzt ein EAN-Eingabefeld plus 📷-Button für den Live-Scanner.
  Treffer aus Lokal-Cache oder OFF/OBF/OPF füllen Name, Kategorie, Bild
  und (sofern leer) Einheit vor.
- **MHD mit Monat/Jahr**: Im MHD-Block ein Häkchen „nur Monat/Jahr" —
  dann erscheint statt des Datums-Pickers ein Monatspicker. Intern wird
  der letzte Tag des Monats gespeichert, damit die MHD-Warnung am
  Monatsende fällig wird.
- **Listen-Freigabe nur an reale Benutzer**: Das Backend prüft beim
  Anlegen/Patchen von Listen, dass jeder Eintrag in `sharedWith` einem
  bekannten HA-Benutzer entspricht; unbekannte Namen werden mit einer
  klaren Fehlermeldung abgewiesen statt stillschweigend als Phantom
  angelegt. Im Listen-verwalten-Sheet kannst du beim manuellen
  Hinzufügen jetzt **Username oder Anzeigename** eingeben — wird
  automatisch zum echten Username aufgelöst.
- **Standard-Freigabe für neue Listen** (Admin-Einstellung): Schalter
  in den Einstellungen entscheidet, ob neu angelegte Listen automatisch
  mit allen HA-Benutzern geteilt werden. Default: aus — nur der
  Ersteller sieht die Liste, bis er sie explizit teilt.

## 0.16.6

**Pott-Patch, Servicebereich Dark Mode:**

Kollege Torsten (VfL Bochum, ohne tägliche Dönninghaus-Currywurst geht's
nich) hat reklamiert: „Mensch Marc, dat is doch eher Blue Mode!". Tossi,
recht haste — Slate-Palette is jetz raus, neutrales HA-Schwatz drinne.
So dunkel wie's HA selbst macht.

Aber kleine Korrektur am Rande, wenn wir schon bei Pott-Themen sind: die
Currywurst kommt nachweislich aus Duisburg, nich aus Bochum. Wenn du also
bei Dönninghaus stehst und denkst „bochumer Erfindung" — falsch, du isst
quasi 'ne MSV-Wurst. Glück auf.

## 0.16.5

- **Angebots-Titel pro Treffer** statt nur der Marke. marktguru liefert
  Produktname und Größe getrennt; die Anzeige setzt sie jetzt zu „Kölln
  Müsli 0,6kg", „Kölln Haferfleks 0,375kg" etc. zusammen — vorher stand
  überall nur „Kölln". Wirkt im Angebote-Sheet pro Listen-Item sowie im
  Produkt-Anlage-/Detail-Tester und im globalen Angebote-Tab.
- Genauer Match-Modus berücksichtigt jetzt auch den marktguru-Produktnamen
  (vorher nur Marke + Beschreibung).

## 0.16.4

- **Notizen pro Produkt**: ein neues Freitext-Feld in Produkt-Anlage und
  Produkt-Detail (z. B. für Zubereitungshinweise, Allergien,
  Bezugsquelle …). Wird beim OFF-Refresh nicht überschrieben, deine
  Notizen bleiben.
- In der Produkt-Liste taucht ein **📝-Symbol** rechts neben dem
  Produktnamen auf, sobald eine Notiz hinterlegt ist (Hover-Tooltip
  zeigt den Inhalt).

## 0.16.3

- **Produkt-Detail / „Frisch aus OFF/OBF/OPF laden"**: Statt sofort zu
  speichern werden die geänderten Felder jetzt in den Formularen
  vorbefüllt; ein grünes Diff-Banner listet auf, welche Felder neu
  reinkamen (Name, Marke, Bild, Nutri-Score, Nährwerte, Kategorie).
- **Kategorie-Chips** auch in der Produkt-Detailseite: alle OFF-Kategorien
  werden als Chips angeboten — grün ✓ = du hast diese Kategorie, gelb +
  = wird beim Tippen neu angelegt.
- Du prüfst die Änderungen und tippst dann auf „Speichern" — keine
  überraschenden Auto-Updates mehr.

## 0.16.2

- **Fix für englische Kategorie-Chips**: OFF hat in der Standard-Antwort
  die deutschen `categories_tags_de` weggelassen, sobald keine `fields`
  explizit angefragt werden — das Backend hat deshalb auf die englischen
  Tags zurückgegriffen. Der Lookup fordert die deutschen Namen jetzt
  explizit an; die Chip-Vorschläge sind ab sofort wieder auf Deutsch
  (und matchen wie geplant gegen die eigenen Kategorien).

## 0.16.1

- Kamera-Fehlerbox: Hilfetext für die Home-Assistant-Companion-App
  (iOS-Einstellungen → Apps → Home Assistant → Kamera) als
  Primär-Anleitung; der Safari/PWA-Pfad steht jetzt als Fallback
  darunter, falls die HA-App-Option fehlt oder nichts bewirkt.

## 0.16.0

- **OFF-Kategorie-Chips**: Beim Hinzufügen werden jetzt **alle** OFF-Kategorien
  als Chips angezeigt (spezifisch → allgemein). Eigene Kategorien sind **grün
  ✓** markiert, neue **gelb +**. Tap auf einen grünen Chip übernimmt die
  eigene Kategorie; gelbe Chips legen die neue Kategorie sofort an (oder
  fragen nach, wenn Auto-Anlegen aus ist). Damit ist klar erkennbar, welche
  OFF-Vorschläge schon im eigenen System existieren.
- Auch beim erneuten Lookup eines gecachten Produkts wird die Chip-Liste mit
  den frischen deutschen Namen aktualisiert.

## 0.15.9

- Auf der HA-Add-on-Seite (neben Start/Stop/Update) gibt es ab sofort
  einen **Dokumentation**-Tab mit Feature-Liste und einen **Changelog**-Tab
  mit der Versionshistorie. Beides wird auch ins öffentliche Repo
  mitgesynct.

## 0.15.8

- **Sicherheit**: SSE-Broadcasts werden jetzt pro Empfänger gefiltert —
  `list:*`- und `item:*`-Events erreichen nur Owner, sharedWith und
  Admins. Vorher wurden die Payloads an alle verbundenen Clients verteilt.
- **Barcode-Kamera**: Bei verweigerter Kamera-Berechtigung erscheint eine
  klare Box mit iOS-Anleitung („Einstellungen → Apps → Safari → Kamera")
  und einem „Erneut versuchen"-Button, statt der vorigen technischen
  Fehlermeldung.

## 0.15.7

- OFF-Suche läuft jetzt über `de.openfoodfacts.org` und filtert auf
  `countries=germany` — keine französischen/italienischen Treffer mehr.
- Der „Neue Kategorie … anlegen?"-Prompt ist jetzt dark-tauglich.

## 0.15.6

- OFF-Kategorien werden auch beim erneuten Scan eines bereits gecachten
  Produkts neu eingedeutscht (vorher behielt der Cache das alte englische
  Fallback). Beim Treffer in den eigenen Kategorien wird diese
  automatisch als Default gesetzt.

## 0.15.5

- Backend liefert pro OFF-Lookup die komplette deutsche Kategorie-Hierarchie
  zurück; das Frontend matcht spezifisch → allgemein gegen die eigenen
  Kategorien.
- Dark Mode für Scan-/Suche-/Manuell-Tabs und das EAN-Eingabefeld.

## 0.15.4

- **Einheiten erweitert**: Vollständiger Standard-Katalog (Verpackung A-Z,
  Metrische Einheiten, US/Imperial). Dropdowns zeigen jetzt
  `<optgroup>`s; metrische und US-Einheiten erscheinen mit deutschem
  Klartext-Label („g (Gramm)", „fl oz (Flüssigunzen)").
- Vorhandene Einheiten und eigene Einträge bleiben erhalten — fehlende
  Standards werden hinten angehängt.
- Dark Mode für Speisekammer-Reihen, „Einkauf abschließen"-Karten und
  MHD-/Low-Stock-Badges.

## 0.15.3

- Großer Dark-Mode-Sweep: Kategorien-/Einheiten-Verwaltung,
  ProductDetailSheet, PantryItemSheet, ListManageSheet und alle übrigen
  Sheets bekommen dunkle Inputs, Cards und Footer-Buttons.

## 0.15.2

- Benutzer-Anzeige vereinfacht: nur noch ein optionaler **Anzeigename**
  pro Benutzer (gefüllt → wird angezeigt, sonst der HA-Username). Der
  globale Modus und das „Voller Name"-Feld sind entfallen.
- Benutzerliste im UserManagerSheet im Dark Mode lesbar.

## 0.15.1

- Listen-Items mit mehreren Angeboten zeigen ein **„+N"-Badge** neben der
  grünen Angebotszeile; Tap öffnet ein neues Sheet mit allen Treffern
  (nach Preis sortiert).

## 0.15.0

- **Dark Mode**: Auto / Hell / Dunkel als Toggle in den Einstellungen,
  persistent pro Gerät, FOUC-frei beim Cold-Start.
- **Voller-Name**-Feld pro User (Quelle für den globalen Anzeige-Modus,
  weil der HA-Supervisor Personennamen nicht zuverlässig durchreicht).

## 0.14.0

- Globaler Benutzer-Anzeige-Modus (Username / Voller Name / 1. Vorname /
  Vorname / Nachname) plus per-User-Override.

## 0.13.x

- Voice-API für Siri/Alexa: Mehrrunden-Rückfragen (Liste + Variante),
  Listen-Erkennung am Besitzer-Namen, Bestätigung vor dem Anlegen
  unbekannter Produkte, eingebaute Füllwörter („setzen", „einkaufen", …).
- Per-User-Voice-Keys (in der App verwaltbar), Pushover-Device,
  Benachrichtigungs-Schalter pro Bereich, globale Töne pro Typ.
- CI: Tag-Pushes bauen das Image, Public-Repo-Sync nur bei GitHub-Releases.
