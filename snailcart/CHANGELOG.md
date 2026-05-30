# Changelog

## 0.20.1

- **Fix Namensanzeige „Benutzername"**: Für HA-Personen, die SnailCart noch nie
  geöffnet haben (kein aus dem Header gelernter Login-Name), wurde im Modus
  „Benutzername" fälschlich der volle Name angezeigt. Jetzt wird hilfsweise der
  `person.<slug>`-Entity-Name als Benutzername verwendet.

## 0.20.0

- **Namensanzeige global konfigurierbar (Admin)**: Einstellungen → Namensanzeige
  legt fest, wie Benutzernamen überall dargestellt werden — Voller Name,
  Vorname, Nachname, Initialen oder Benutzername. Der Name wird aus der
  HA-Identität abgeleitet; ein pro Benutzer manuell gesetzter Anzeigename hat
  weiterhin Vorrang.
- **Listenfreigabe: Suche statt manuellem Hinzufügen**: Da nun alle bekannten
  HA-Benutzer angezeigt werden, entfällt das manuelle Eintippen eines
  Benutzernamens. Stattdessen filtert ein Suchfeld die Benutzerliste (ab >6
  Benutzern), aktiv ausgewählte bleiben immer sichtbar.

## 0.19.0

- **Identität durchgängig auf HA-UUID umgestellt (sauberer Neustart)**: Interne
  Identität ist ab jetzt ausschließlich die Home-Assistant-User-UUID aus dem
  Ingress-Header `X-Remote-User-Id`. Besitzer, Freigaben, „hinzugefügt von",
  Speisekammer-Ersteller, Benutzer-Einstellungen, Präsenz, Voice-Keys und
  Angebots-Benachrichtigungen werden alle über die UUID verschlüsselt — kein
  Username-Abgleich, keine Groß-/Kleinschreibungs-Heuristik mehr. Der
  Login-Username dient nur noch der Admin-Prüfung (`admins:` in der Konfig) und
  der Anzeige.
- **Benutzerliste aus HA-Personen**: Die Roster-Liste kommt aus den
  `person.*`-Entities (jede mit echter `user_id`) plus aus den UUIDs, die schon
  in Daten vorkommen. Der unzuverlässige Supervisor-Aufruf `list_users`
  (lieferte ohnehin keine UUID) wurde entfernt.
- **Kein Migrationspfad**: Diese Version startet mit leerem Datenbestand. Alte
  username-basierte Daten werden nicht übernommen — vor dem Update bitte sauber
  neu installieren.

## 0.18.8

- **Alle HA-Personen in der Benutzerliste**: Jetzt wo die Core-API erreichbar
  ist, werden *alle* `person.*`-Entities aus Home Assistant in die
  Benutzerverwaltung gemischt — auch Personen, die SnailCart noch nie geöffnet
  haben. Schlüssel ist der echte Login-Username, sobald bekannt (UUID-Abgleich
  aus `ha_user_map.json`), sonst der Person-Entity-Slug. Anzeigename und Avatar
  kommen aus HA.

## 0.18.7

- **Temporäres HA-Debug-Panel entfernt**: Das Diagnose-Panel in den
  Einstellungen sowie der Endpoint `GET /api/ha-users/debug` (inkl.
  `probeCore`) waren nur zur Eingrenzung des Token-Problems gedacht und sind
  jetzt wieder raus.

## 0.18.6

- **Supervisor-Token wird wieder gelesen (Avatar-Fix)**: Ursache des
  fehlenden `SUPERVISOR_TOKEN` war, dass das s6-overlay-Init des HA-Base-Images
  (`/init`, trotz `init: false` weiterhin ENTRYPOINT) die Umgebung
  standardmäßig leert. Mit `S6_KEEP_ENV=1` im Dockerfile bleibt die vom
  Supervisor injizierte Umgebung erhalten — damit funktioniert die Core-API
  (`/api/states`) und das **HA-Avatar** wird endlich angezeigt.

## 0.18.5

- **Diagnose des fehlenden Supervisor-Tokens**: Der Debug-Probe listet jetzt
  *alle* Env-Variablen-**Namen** (`envKeys`, ohne Werte) plus `envCount`.
  Damit lässt sich unterscheiden, ob der Container eine normale HA-Umgebung
  hat (Supervisor injiziert kein Token) oder eine kahle (unser direkter
  `CMD`/`init: false` umgeht das Init des Base-Images und verliert dabei die
  Umgebung).

## 0.18.4

- **HA-Anzeigename ohne Core-API**: Der Name wird jetzt direkt aus dem
  Ingress-Header `X-Remote-User-Display-Name` gelernt und persistiert
  (`ha_user_map.json`). Damit erscheint „Marc Bauschlicher" auch dann,
  wenn der Supervisor-Token fehlt und die `person.*`-Abfrage scheitert.
  Auflösung: in-App-Override → gelernter HA-Name → person.friendly_name →
  Username.
- **Token-Robustheit**: Es wird jetzt `SUPERVISOR_TOKEN` *oder*
  `HASSIO_TOKEN` gelesen. Der Debug-Probe listet zusätzlich die
  vorhandenen token-relevanten Env-Variablen-Namen (`envTokenKeys`,
  ohne Werte), um ein fehlendes Token einzugrenzen.

## 0.18.3

- **HA-Debug in der Oberfläche** (Einstellungen → „HA-Debug (temporär)",
  nur Admin): Button „Prüfen" zeigt die Diagnose direkt als JSON an,
  inkl. „JSON kopieren". Damit ist die Personen-Integration auch ohne
  Desktop/URL-Tricks vom Handy aus diagnostizierbar.

## 0.18.2

- **Selbstdiagnose im Debug-Endpoint**: `GET /api/ha-users/debug` führt
  jetzt einen Live-Aufruf der Core-API (`/api/states`) aus und meldet
  Token-Vorhandensein, HTTP-Status und die gefundenen `person.*`-Entities
  — damit lässt sich in einer Abfrage feststellen, ob/warum die
  HA-Personen nicht geladen werden.

## 0.18.1

- **Robusteres Person-Matching**: Der `friendly_name` einer HA-Person ist
  oft länger als der Login-Username (z. B. „Marc Bauschlicher" vs.
  `marc`). Zusätzlich zum UUID-Link (`X-Remote-User-Id`) matcht SnailCart
  jetzt auch über die Person-Entity-ID und über einen Token-Abgleich
  (Username steckt als Wort im `friendly_name`). Damit greifen
  HA-Avatar und -Name auch ohne etablierten UUID-Link.
- Admin-Debug `GET /api/ha-users/debug` zeigt jetzt zusätzlich die
  ankommenden Ingress-Header (`X-Remote-User-Id/-Name/-Display-Name`),
  um den UUID-Link verifizieren zu können.

## 0.18.0

- **HA-Benutzerinfos statt Rad neu erfinden**: SnailCart zieht jetzt
  Anzeigename und Avatar direkt aus Home Assistant. Quelle sind die
  `person.*`-Entities (geholt über die Core-API `GET /api/states` mit dem
  Supervisor-Token). Reihenfolge der Avatar-Auflösung:
  1. eigenes hochgeladenes Foto (Override) → 2. HA-Profilbild der
  zugeordneten Person → 3. farbige Initialen. Genauso beim Namen:
  manueller Override → HA-`friendly_name` → Username.
- **Username ↔ HA-Person-Verknüpfung**: Beim Öffnen der App lernt das
  Add-on aus dem Ingress-Header `X-Remote-User-Id` die HA-User-UUID und
  merkt sie sich (`ha_user_map.json`). Fallback ohne gelernte UUID:
  case-insensitiver Abgleich von `friendly_name` gegen den Username.
- **Avatar-Proxy**: `GET /api/ha-users/avatar/:username` streamt das
  HA-`entity_picture` über den Supervisor-Proxy (kein direkter Core-
  Zugriff vom Browser). 404 → Frontend fällt automatisch auf Initialen
  zurück.
- **Graceful Degradation**: Ist HA / der Supervisor-Token nicht
  erreichbar, bleibt alles funktionsfähig — es greifen Upload bzw.
  Initialen wie bisher. Das manuelle Hochladen bleibt als Override
  vollständig erhalten.
- Admin-Debug: `GET /api/ha-users/debug` zeigt die geholten Personen und
  die gelernte UUID-Zuordnung zur Kontrolle.

## 0.17.0

- **Avatare pro Benutzer**: Im Benutzer-Sheet kann jeder ein Foto aus
  der Galerie hochladen — wird clientseitig auf 256×256 Quadrat
  zugeschnitten, als JPEG (0.85) base64-kodiert und in
  `user_settings.json` abgelegt (Cap: 300 KB). Ohne eigenes Bild gibt's
  einen farbigen Initialen-Avatar, dessen Farbe deterministisch aus dem
  Username gehasht wird (gleicher User = gleiche Farbe auf allen
  Geräten).
- **Live-Präsenz in Listen**: In der Detailansicht einer Liste und im
  Sammel-Einkauf erscheinen oben rechts die Avatare aller Personen, die
  *gerade jetzt* dieselbe Liste/Auswahl geöffnet haben (grüner Ring).
  Heartbeat alle 20 s; Einträge verschwinden ~60 s nach Inaktivität.
  Beispiel: Marc und Sarah sind gleichzeitig im Supermarkt — beide
  sehen den Avatar des anderen und wissen, dass jemand parallel
  einkauft.
- Backend: neuer `/api/presence/:listId`-Endpoint (Heartbeat / Leave /
  Snapshot), gated durch `listVisibleTo`. SSE-Event `presence:list`
  wird scope-gefiltert an alle Listen-Berechtigten gepusht.
- Avatare werden überall dort genutzt, wo bisher nur ein Textname stand
  — Benutzer-Sheet (Liste + Detail) zeigt jetzt den Avatar mit.

## 0.16.11

- **Status-Kreis vor Artikeln entfernt**: Der leere Kreis links neben dem
  Produktbild war reine Status-Anzeige (Klick-Target war eh die ganze
  Zeile), sah aber aus wie eine Checkbox, die man drücken sollte. Raus
  damit — gewonnener Platz geht an Name + Angebotszeile. Gekaufte Items
  bleiben durch den durchgestrichenen Text erkennbar, „nicht
  verfügbar"-Items durch das gelbe Badge.

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
