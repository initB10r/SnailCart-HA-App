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
- **Produkt = einzige Wahrheit**: Marke und Kategorie werden in Listen aus dem
  referenzierten Produkt aufgelöst. Ändert man die Kategorie (oder Marke) an
  einem Listen-Artikel, wird sie ins Produkt geschrieben und zieht sofort durch
  alle Listen und den Katalog.
- **Ein Dialog für Artikel und Produkte**: Hinzufügen und Bearbeiten laufen über
  denselben Dialog (Tabs Scan / Suche / Manuell). Reine Katalog-Felder (Notizen,
  Angebots-Einstellungen) liegen in einem **„Erweitert"-Aufklapper**. Ein neu
  manuell angelegter Listen-Artikel wird automatisch zu einem **sichtbaren**
  Katalog-Produkt; ein bereits vorhandenes Produkt wird wiederverwendet.
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
- Eigener Endpoint (`/api/voice/add`) auf Port 8098, ausschließlich
  per `X-API-Key` authentifiziert — sicher freigebbar via cloudflared.
- Pro Nutzer eigener Voice-Key (in der App generierbar).
- **Mehrrunden-Rückfragen**: „In welche Liste?" / „Welche Variante?".
- Erkennt Listen am Besitzer-Namen (z. B. „Jacobs Einkaufsliste").
- Bestätigung vor dem Anlegen unbekannter Produkte (Ja/Nein).

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
  (Mindestbestand / MHD / Angebote) und Stumm-Listen je Bereich.
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

## Daten

Alle Daten werden im Add-on-eigenen `/data`-Volume als JSON gespeichert
(`lists.json`, `items.json`, `products.json`, `pantries.json`,
`pantry_items.json`, `categories.json`, `units.json`,
`user_settings.json`, `app_settings.json`, `ha_user_map.json`).

## Source

<https://github.com/initB10r/SnailCart>
