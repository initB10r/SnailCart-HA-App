# Changelog

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
