# Karteio

**Karteikarten-Lern-App fürs iPhone – by Felix Böse**

Karteio ist eine Progressive Web App (PWA): Sie wird über Safari auf dem Home-Bildschirm installiert, läuft im Vollbild wie eine native App, funktioniert komplett offline und kostet nichts. Alle Daten bleiben auf dem Gerät.

👉 **App öffnen:** https://flexus-code.github.io/Karteio/

---

## Auf dem iPhone installieren

1. Den Link oben in **Safari** öffnen (nicht Chrome – nur Safari kann Apps zum Home-Bildschirm hinzufügen).
2. Unten auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. Nach unten scrollen → **„Zum Home-Bildschirm“** → **Hinzufügen**.
4. Karteio ab jetzt **immer über das neue App-Icon** starten.

**Updates:** Kommen automatisch. Beim Öffnen erscheint „Neue Version verfügbar → Aktualisieren“. Das Icon muss dafür nicht neu hinzugefügt werden.

**Backup:** Einstellungen → Daten → *Backup erstellen* → „In Dateien sichern“ (z. B. iCloud Drive). Die App erinnert, wenn das letzte Backup älter als 7 Tage ist. Wichtig: Wird die App vom Home-Bildschirm gelöscht, löscht iOS auch ihre Daten.

---

## Funktionen

| Bereich | Was geht |
| --- | --- |
| **Ordner** | Beliebig verschachtelte Ordner und Stapel, Farben & Symbole, Drag & Drop, Pfadnavigation, Papierkorb (30 Tage) mit Rückgängig |
| **Karten** | Rich Text (Formatierung, Farben, Listen, Code, Tabellen), Bilder aus Kamera/Fotos, 5 Kartentypen: Standard, umkehrbar, Lückentext, Multiple Choice, Eingabe; Hinweis, Eselsbrücke, Schlagwörter; Schnellerfassung; Entwürfe werden automatisch gesichert |
| **Spracheingabe** | Karten per Sprache erstellen („Frage … Antwort …“ in einem Satz), Diktieren im Editor |
| **Lernen** | Spaced Repetition (FSRS) mit Tageslimits, wischbare Karten (rechts = gewusst, links = nochmal, hoch = einfach), freies Lernen, Schreibmodus mit Tippfehler-Toleranz, Quiz, Prüfungssimulation mit Timer und IHK-Note, Filter, Rückgängig |
| **Statistik** | Level & XP, Streak, Lernkalender, Diagramme, Prognose, Kartenstatus, 12 Erfolge, Prüfungs-Countdown mit Lernplan, Tagesziel |
| **Daten** | Globale Suche, Backup & Wiederherstellen, Stapel/Ordner als Datei teilen, CSV-Import/-Export, Text einfügen, Druckansicht/PDF, Beispiel-Stapel |
| **Design** | Hell/Dunkel, 7 Akzentfarben (Standard: Grün), animierter Startbildschirm, Kurzanleitung, iPhone-Startbilder, Notch/Home-Indicator berücksichtigt |

---

## Entwicklung

Voraussetzung: Node.js 22+.

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # Entwicklungsserver (auch im WLAN erreichbar)
npm test             # Unit-Tests (Vitest)
npm run test:e2e     # End-to-End-Tests im iPhone-Format (Playwright/WebKit)
npm run build        # Produktions-Build nach dist/
```

Beim ersten E2E-Lauf einmalig den Testbrowser installieren: `npx playwright install webkit`.

`?noanim` an die URL hängen (nur im Entwicklungsmodus), um alle Animationen für Tests abzuschalten.

### Tech-Stack

Vite · React · TypeScript (strict) · Tailwind CSS · Framer Motion · Dexie (IndexedDB) · TipTap · ts-fsrs · Zustand · vite-plugin-pwa (Workbox) · Vitest · Playwright

### Projektstruktur

```
src/
  app/          App-Rahmen, Routing
  components/   Wiederverwendbare UI-Bausteine (Sheet, Button, Switch …)
  db/           Datenbank-Schema und Typen
  features/
    cards/      Karten: Editor, Kartentypen, Lückentext, Bilder
    data/       Backup, Teilen, CSV, Beispiel-Stapel
    library/    Ordner & Stapel
    onboarding/ Kurzanleitung
    stats/      Statistik, Erfolge, Prüfungs-Countdown
    study/      Lernmodi, Planung (FSRS), Sitzungen
    voice/      Spracheingabe
  pages/        Seiten
  store/        Einstellungen (Zustand)
e2e/            End-to-End-Tests
```

### Veröffentlichen

Jeder Push auf `main` baut die App per GitHub Actions (inkl. Tests) und veröffentlicht sie auf GitHub Pages (`.github/workflows/deploy.yml`). Einmalig nötig: im Repository unter *Settings → Pages → Source* „GitHub Actions“ wählen.

### Qualität

- 59 Unit-Tests (Lernlogik, Lückentext, Import/Export, Backup, Statistik) und 4 End-to-End-Tests
- Lighthouse (mobil): Performance 93 · Barrierefreiheit 100 · Best Practices 100
