# SnailCart (Home Assistant App)

Einkaufslisten + Vorratsverwaltung mit Barcode-Scan und Angeboten.

## Installation der App (Add-on)

1. **Einstellungen → Add-ons/Apps → Store** (oben rechts ⋮ → **Repositories**)
2. Diese URL hinzufügen: `https://github.com/initB10r/SnailCart-HA-App`
3. **SnailCart** auswählen → **Installieren**
4. Nach dem Start **In Seitenleiste anzeigen** aktivieren

Das vorgebaute Image wird automatisch aus der GitHub Container Registry geladen.

## Optional: Integration fürs Home-Assistant-Dashboard

Zeigt freigegebene SnailCart-Listen als `todo`-Entitäten in Home Assistant und
liefert über den Dienst `snailcart.get_list` alle Daten für eigene
Dashboard-Karten (Menge, Kategorie, Bild, Notizen). Aus Home Assistant heraus
kann man nur ansehen und löschen. Hinzufügen und Abhaken geschieht in SnailCart.

1. In SnailCart (als Admin): **Einstellungen → Home Assistant-Integration →
   Schlüssel erzeugen**, Schlüssel sowie Host und Port notieren.
2. Pro Liste: **Liste verwalten → In Home Assistant anzeigen**.
3. In Home Assistant: **Marketplace (HACS)** → oben rechts ⋮ →
   **Benutzerdefinierte Repositories** → URL
   `https://github.com/initB10r/SnailCart-HA-App`, Typ **Integration** →
   Hinzufügen. Dann „SnailCart“ suchen → **Herunterladen**.
4. Home Assistant **neu starten**.
5. **Einstellungen → Geräte & Dienste → Integration hinzufügen → SnailCart**,
   Host, Port und Schlüssel eintragen.

Updates der Integration zeigt der Marketplace automatisch an.
