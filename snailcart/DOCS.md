# SnailCart

Einkaufslisten, Vorrats- und Angebotsverwaltung als Home-Assistant-Add-on.
Läuft als eigenständige Web-App (Vue 3 / Express) im Ingress-Tab von HA und
optional mit Siri/Alexa-Sprachsteuerung über eine separate API.

## Funktionen

### Einkaufslisten
- Mehrere Listen pro Haushalt, **owner + sharedWith**-Berechtigungen
  (Sohn sieht Papas Liste nur, wenn explizit geteilt — Audit in v0.15.8).
- Drag-and-drop Sortierung pro Benutzer, individuelle Sortier-Modi
  (Einfüge-Reihenfolge / Kategorie / A-Z).
- Swipe-Aktionen: links → Einlagern, rechts → Löschen / „Nicht verfügbar".
- **Löschvormerkung**: Endgültig löschen darf nur, wer den Artikel eingetragen
  hat (oder ein Admin). Alle anderen merken das Löschen nur vor: Der Artikel
  bleibt auf der Liste, trägt den Hinweis „… möchte das entfernen", und der
  Ersteller wählt **Löschen** oder **Behalten**. Wer vorgemerkt hat, kann den
  Wunsch **zurücknehmen**. Wird derselbe Artikel erneut eingetragen, verfällt
  die Vormerkung. Der Ersteller bekommt eine Push-Nachricht (pro Benutzer
  abschaltbar: „Löschwünsche für meine Artikel").
- **Sammel-Einkauf** über mehrere Listen gleichzeitig.
- **Angebots-Filter** pro Liste (3-fach-Umschalter: Alle / Ohne Angebote / Nur
  Angebote) — blendet „nur im Angebot"-Artikel aus oder zeigt gezielt nur diese;
  aktueller Modus an Icon + Farbe erkennbar, pro Benutzer gespeichert.
- **Einkaufs-Quittung an Beitragende**: Beim Abschluss eines Einkaufs erhält
  jede Person eine Push-Nachricht mit den von **ihr** auf die Liste gesetzten
  und nun eingekauften Artikeln (der Einkäufer selbst wird nicht über seine
  eigenen Artikel benachrichtigt). Pro Benutzer ab-/anschaltbar
  („Erledigte Einkäufe"), läuft über das Pushover-Device.
- Echtzeit-Updates via Server-Sent Events (mit Berechtigungs-Filter).

### Produkte & Barcode
- Lokaler Produkt-Katalog mit Bild, Marke, Standard-Einheit, Kategorie.
- **Produkt = einzige Wahrheit**: Name, Marke, Kategorie und Foto werden in
  Listen aus dem referenzierten Produkt aufgelöst. Ändert man eines davon an
  einem Listen-Artikel, wird es ins Produkt geschrieben und zieht sofort durch
  alle Listen und den Katalog — da Artikel per FK am Produkt hängen, können
  diese Felder nicht abweichen.
- **Ein Dialog, ein Screen**: Hinzufügen und Bearbeiten laufen über denselben
  Dialog. Beim Hinzufügen sind Scan und Suche/Eingabe auf **einem** Screen
  vereint — das **Namensfeld ist zugleich die Produktsuche** (lokale + Online-
  Treffer erscheinen darunter), und ein **📷-Button direkt daneben** öffnet den
  Scanner. Findet die Suche nichts, wird der getippte Name direkt gespeichert —
  keine Doppel-Eingabe. Reine Katalog-Felder (Notizen, Angebots-Einstellungen)
  liegen in einem **„Erweitert"-Aufklapper**. Ein neu manuell angelegter Listen-
  Artikel wird automatisch zu einem **sichtbaren** Katalog-Produkt; ein bereits
  vorhandenes Produkt wird wiederverwendet.
- Jedes Produkt merkt sich, **wer es angelegt hat** („angelegt von …").
- **Archivieren statt Löschen**: Gelöschte Produkte werden archiviert und aus dem
  Katalog ausgeblendet, bleiben aber für bestehende Listen-Artikel auflösbar.
  Admins blenden sie über den Schalter **„Archivierte anzeigen"** wieder ein.
- Ältere **Ad-hoc-Produkte** (vor 0.21.0 ausgeblendet angelegt) lassen sich über
  den Schalter **„Ad-hoc anzeigen"** weiterhin einblenden.
- **Barcode-Scan** (native iOS BarcodeDetector + ZXing-Fallback) mit
  freundlicher Fehlerführung, wenn die Kamera-Berechtigung fehlt.
- Manueller EAN-Eingabe und Online-Suche.
- **Open Food Facts / Open Beauty Facts / Open Products Facts**-Integration:
  Lookup über Barcode oder Online-Textsuche, deutsche Kategorien mit
  automatischem Match gegen die eigenen Kategorien, Bild, Nutri-Score und
  Nährwerte. Such-Ergebnisse sind auf Deutschland beschränkt.
- Eigener OFF-Account zum **Beitragen** von Produkten (optional).

### Vorratsverwaltung (Speisekammer)
- Beliebig viele Speisekammern mit benannten Lagerorten (z. B. „Fach 1").
- Mindestbestand- und MHD-Tracking, Schnell-Plus/Minus pro Reihe.
- Pull-Down vom Einkauf direkt in die Speisekammer beim Abschluss.
- Push-Benachrichtigung über HA-Notify-Dienst (z. B. Pushover) bei
  Unterschreiten des Mindestbestands oder ablaufendem MHD —
  konfigurierbarer Sound pro Typ.

### Angebote
- Anbindung an **marktguru** (POST-Code-basiert).
- Pro Produkt eigener Suchbegriff und „Genau"/„Alle Varianten"-Modus.
- Listen-Ansicht zeigt das beste Angebot inline; Tap auf die grüne Zeile
  öffnet alle Treffer (Preis-sortiert).
- Push-Benachrichtigung an Listen-Owner und sharedWith bei neuen Angeboten.

### Voice-API (Siri / Alexa)
- Eigener Listener auf Port 8098, ausschließlich per `X-API-Key`
  authentifiziert — sicher freigebbar via cloudflared.
- Pro Nutzer eigener Voice-Key (in der App generierbar).
- **Gesprächs-Endpoint `/api/voice/converse`** (ab 0.24.0, empfohlen): SnailCart
  führt das ganze Gespräch, der Siri-Kurzbefehl ist nur eine Schleife.
  Anfrage `{ text, session }`, Antwort immer
  `{ next: "ask"|"end", speak, session, options }`. Bei `ask` stellt der
  Kurzbefehl `speak` als Frage und schickt die Antwort mit derselben `session`
  zurück, bei `end` sagt er `speak` und hört auf. Neue Rückfragen brauchen
  keine Änderung am Kurzbefehl. Bauanleitung: `docs/siri-kurzbefehl.md` im
  Repository.
  - Rückfragen: „Auf welche Liste?", „Welche genau: Vollmilch, fettarme Milch
    oder Hafermilch?", „… kenne ich noch nicht. Trotzdem auf die Liste?".
  - Antworten werden frei erkannt: Name, Teil des Namens, „die zweite",
    „die letzte", „ja"/„nein", „abbrechen".
  - Nennt man bei „Welche genau?" etwas anderes, wird danach gesucht.
  - Menge und Einheit am Satzanfang: „2 Liter Milch", „drei Packungen Nudeln".
  - Gespräche gelten 5 Minuten, sind an den Benutzer des Keys gebunden und
    nur einmal verwendbar.
- Erkennt Listen am Besitzer-Namen (z. B. „Jacobs Einkaufsliste").
- Der ältere Endpoint `/api/voice/add` bleibt für bestehende Kurzbefehle
  erhalten.

### Home Assistant-Integration (Dashboard)
- Eigene HA-Integration `snailcart`, installierbar über den **HA-Marketplace
  (HACS)** als benutzerdefiniertes Repository
  `https://github.com/initB10r/SnailCart-HA-App` vom Typ **Integration**.
  Schritt-für-Schritt-Anleitung direkt in SnailCart unter Einstellungen →
  Home Assistant-Integration.
- **Nur freigegebene Listen**: Pro Liste schaltet Besitzer oder Admin unter
  „Liste verwalten“ → **In Home Assistant anzeigen** frei. Nur diese Listen
  erscheinen in HA, dort aber für alle HA-Benutzer sichtbar.
- In HA entsteht pro Liste eine `todo.*`-Entität. Der Zustand ist die Zahl der
  offenen Artikel. Zum Löschen vorgemerkte Artikel sind ausgeblendet.
- **Nur ansehen und löschen**: Hinzufügen, Abhaken und Aufräumen geschieht in
  SnailCart. Löschen aus HA folgt der Löschvormerkung (fremde Artikel werden
  nur vorgemerkt), handelnde Person ist der in HA angemeldete Benutzer.
- Dienste: `snailcart.get_list` (Detaildaten für Dashboard-Karten: Menge,
  Kategorie mit Icon, Bild, Produktnotizen, wer eingetragen hat) und
  `snailcart.cancel_delete` (Vormerkung zurücknehmen).
- Änderungen erscheinen per Push in etwa einer Sekunde in HA.
- **Sicherheit**: eigener interner Port 8097 (siehe Ports), Schlüssel nur als
  Hash gespeichert und einmalig angezeigt (Einstellungen →
  Home Assistant-Integration, nur Admin; erneuern widerruft den alten sofort),
  minimale Rechte, Bild-URLs nur `https:` oder eingebettete Bilder; eigene
  Fotos gehen als kleines Vorschaubild (max. 192 px) an HA.
  Admin-Rechte werden nie aus HA übernommen.

### Benutzer
- **Identität = HA-User-UUID**: Intern wird jeder Benutzer ausschließlich
  über seine Home-Assistant-UUID (aus dem Ingress-Header
  `X-Remote-User-Id`) referenziert — Listen-Besitz, Freigaben, „hinzugefügt
  von", Einstellungen, Präsenz und Voice-Keys hängen alle an der UUID, nicht
  am Username. Der Login-Username dient nur der Admin-Prüfung und der Anzeige.
- **Alle HA-Personen sichtbar**: Die Benutzerverwaltung listet alle
  `person.*`-Entities aus Home Assistant (mit echter `user_id`) — auch
  Personen, die SnailCart noch nie geöffnet haben. Bis zum ersten App-Start
  wird der `friendly_name` angezeigt; danach kommen die übrigen Infos dazu.
- **HA-Profil-Integration**: Anzeigename und Avatar kommen automatisch
  aus den `person.*`-Entities von Home Assistant (Core-API). Auflösung
  in der Reihenfolge: 1. eigenes hochgeladenes Foto / manueller Name →
  2. HA-Profilbild bzw. `friendly_name` der zugeordneten Person →
  3. farbige Initialen. Username und Anzeigename werden je UUID aus dem
  Ingress-Header gelernt. Fällt HA aus, bleibt alles funktionsfähig
  (Upload/Initialen).
- **Namensanzeige (global, Admin)**: In den Einstellungen wählbar, wie Namen
  überall dargestellt werden — Voller Name, Vorname, Nachname, Initialen oder
  Benutzername. Wird aus der HA-Identität abgeleitet; ein manuell gesetzter
  Anzeigename pro Benutzer hat Vorrang.
- Pro Benutzer: **Anzeigename** (überschreibt HA/Username), **Avatar**
  (Foto-Upload als Override, wird auf 256×256 verkleinert; ohne eigenes
  Bild HA-Profilbild, sonst farbige Initialen mit deterministischer
  Hash-Farbe), Voice-Key, Pushover-Device, Benachrichtigungs-Schalter
  (Mindestbestand / MHD / Angebote / Erledigte Einkäufe / Löschwünsche) und
  Stumm-Listen je Bereich.
- **Live-Präsenz**: In der Detailansicht einer Liste und im
  Sammel-Einkauf wird oben angezeigt, wer aktuell gerade dieselbe
  Liste/Auswahl offen hat (Avatare mit grünem Ring). Heartbeat alle
  20 s, Eintrag verschwindet nach 60 s Inaktivität.

### Ansicht
- **Dark Mode** in Einstellungen → Erscheinungsbild (Auto / Hell / Dunkel),
  persistent pro Gerät, FOUC-frei beim Cold-Start.
- Deutsche und englische Lokalisierung, umschaltbar pro Gerät.

## Konfiguration

```yaml
admins: []        # HA-Usernamen mit Admin-Rechten (case-insensitiv).
                  # Leer lassen -> der erste Benutzer, der die App öffnet
                  # (= der Installierende), wird automatisch Admin.
off_account:
  username: ""    # optional, für Beitragen an Open Food Facts
  password: ""
auto_add_categories: true
mhd_notify_days_before: 3
notify_service: ""     # z. B. notify.pushover
offer_plz: ""           # PLZ für marktguru
offer_retailers: []
offer_refresh_hours: 6
log_level: info
```

## Ports

- **Ingress (intern, 8099)**: Haupt-UI über das HA-Sidebar-Icon.
- **8098/tcp** (optional, Host): Voice-API für Siri/Alexa. **Nur freigeben,
  wenn genutzt** und am besten via cloudflared exposen — der Listener
  authentifiziert ausschließlich per X-API-Key und ignoriert
  X-Remote-User.
- **8097/tcp** (nur intern, **nicht** freigeben): API für die
  Home-Assistant-Integration. Wird bewusst nicht als Host-Port veröffentlicht
  und darf nicht über cloudflared laufen. Erreichbar nur im
  Supervisor-Netz unter `<Add-on-Hostname>:8097`.

## Daten

Alle Daten werden im Add-on-eigenen `/data`-Volume als JSON gespeichert
(`lists.json`, `items.json`, `products.json`, `pantries.json`,
`pantry_items.json`, `categories.json`, `units.json`,
`user_settings.json`, `app_settings.json`, `ha_user_map.json`).

## Source

<https://github.com/initB10r/SnailCart>
