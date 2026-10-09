# Action Prompt: Karteikarten-Lern-App „Kartei“ (PWA für iPhone)

## Rolle & Ziel

Du bist ein erfahrener Frontend-Engineer und UI/UX-Designer. Baue im Ordner `C:\IHK\Abschlussprüfung\Karteikarten_App` eine **moderne, optisch hochwertige Karteikarten-Lern-App**, die ich auf meinem **iPhone** benutze. Sie soll sich wie eine native App anfühlen (flüssige Animationen, Gesten, Vollbild ohne Browserleiste), komplett **offline** funktionieren und **keine laufenden Kosten** verursachen.

Ich erstelle alle Karteikarten selbst (eigene Inhalte eintippen, Bilder hinzufügen). Optional kann mir Claude (KI) in der App beim Erstellen und Lernen helfen.

---

## 1. Plattform & Rahmenbedingungen (verbindlich)

- **Zielgerät:** iPhone (iOS Safari, aktuelle iOS-Version), Hochformat, Bildschirmbreiten 375–430 px. Auf Desktop soll es ebenfalls nutzbar sein (zentrierte, max. ~480 px breite Ansicht genügt).
- **App-Typ: Progressive Web App (PWA).** Begründung: Eine APK läuft nicht auf dem iPhone, und eine native iOS-App erfordert einen Mac plus kostenpflichtigen Apple-Developer-Account (99 €/Jahr). Eine PWA ist kostenlos, wird über Safari → „Teilen“ → „Zum Home-Bildschirm“ installiert und läuft danach im Vollbild wie eine echte App.
- **Hosting:** kostenlos über **GitHub Pages** (Deployment per GitHub Actions). HTTPS ist dort Pflicht und gegeben (nötig für Service Worker).
- **Keine Kosten:** keine kostenpflichtigen Dienste, kein Backend, kein Server. Einzige optionale Ausnahme: mein eigener Anthropic-API-Key für KI-Funktionen (Bezahlung pro Nutzung, nur wenn ich sie verwende).
- **Datenspeicherung:** ausschließlich lokal auf dem Gerät (IndexedDB), plus Export/Import als Backup-Datei. Kein Login.

## 2. Tech-Stack

- **Vite + React + TypeScript** (strict mode)
- **Tailwind CSS** für Styling, Design-Tokens als CSS-Variablen (Light/Dark)
- **Framer Motion** für Animationen und Gesten
- **Dexie.js** (IndexedDB) für die lokale Datenbank, inkl. Schema-Versionierung/Migrationen
- **vite-plugin-pwa** (Workbox) für Manifest, Service Worker, Offline-Caching und Update-Hinweis
- **ts-fsrs** (FSRS-Algorithmus) für Spaced Repetition
- **TipTap** als Rich-Text-Editor für Kartenseiten
- **Zustand** für UI-State, **React Router** (HashRouter, wegen GitHub Pages)
- Icons: **lucide-react**; Konfetti: **canvas-confetti**
- Optional: **KaTeX** für Formeln, **Shiki/highlight.js** für Code-Syntax-Highlighting

Wenn du für etwas eine bessere, ebenfalls kostenlose Alternative siehst, schlag sie vor, bevor du sie einsetzt.

## 3. iOS-/PWA-Anforderungen

- `manifest.webmanifest` mit `display: standalone`, Theme-/Hintergrundfarben, App-Name, Icons (192/512, maskable) und `apple-touch-icon` (180×180); Splash-Screens für gängige iPhone-Größen
- `viewport-fit=cover` und Berücksichtigung von `env(safe-area-inset-*)` (Notch, Dynamic Island, Home-Indicator)
- Eingabefelder mit mind. 16 px Schriftgröße (verhindert iOS-Auto-Zoom); kein ungewolltes Pinch-Zoom und kein Overscroll-Bounce in der App-Shell
- `navigator.storage.persist()` anfragen, damit iOS die Daten nicht löscht
- Offline-first: Die App muss nach der ersten Installation komplett ohne Internet funktionieren (außer KI-Funktionen)
- In-App-Hinweis „Neue Version verfügbar → Aktualisieren“, wenn ein Update deployed wurde
- Eine Installationsanleitung in der App (wird angezeigt, wenn die App im normalen Safari-Tab statt als installierte PWA läuft)
- Hinweis: iOS-Safari unterstützt keine Vibrations-API; haptisches Feedback daher nur dort, wo es möglich ist, ansonsten weglassen

## 4. Design & Animationen

**Stil:** modern, ruhig, hochwertig, wie eine Premium-iOS-App. Kein generisches Bootstrap-Aussehen.

- Light- und Dark-Mode (automatisch nach System + manuell umschaltbar), mehrere Akzentfarben zur Auswahl
- Weiche Schatten, abgerundete Ecken, dezentes Glassmorphism für Navigationsleisten, gut lesbare Typografie (z. B. „Inter“ oder System-Font `-apple-system`)
- Untere Tab-Bar (Start, Ordner, Lernen, Statistik, Einstellungen) im iOS-Stil
- **Animationen (Framer Motion):**
  - 3D-Flip der Karteikarte beim Umdrehen (Tippen)
  - Swipe-Gesten im Lernmodus: rechts = gewusst, links = nicht gewusst, hoch = einfach (mit Farb-Feedback und Kippen der Karte, Tinder-Style)
  - Kartenstapel-Optik (nächste Karten leicht versetzt dahinter sichtbar)
  - Übergänge zwischen Seiten (Shared-Layout-Animation von Ordner/Deck zur Detailansicht)
  - Animierte Fortschrittsringe und -balken, Zahlen-Counter
  - Konfetti und Erfolgsanimation am Ende einer Lerneinheit / bei Achievements
  - Skeleton-Loader, Micro-Interactions bei Buttons (Press-Scale), Long-Press-Kontextmenüs
- `prefers-reduced-motion` respektieren (Animationen reduzieren)
- Durchdachte Empty States mit Illustration und klarer Handlungsaufforderung

## 5. Datenmodell (Vorschlag, gern verbessern)

```
Folder   { id, parentId|null, name, color, icon, order, createdAt, updatedAt, deletedAt? }
Deck     { id, folderId, name, description, color, icon, order, createdAt, updatedAt, deletedAt? }
Card     { id, deckId, type, front (Rich-Text JSON), back (Rich-Text JSON),
           extra?: { clozeText, choices[], hint, notes }, tags[], images[], audio?,
           flagged, suspended, createdAt, updatedAt, deletedAt? }
Review   { id, cardId, rating (Again/Hard/Good/Easy), reviewedAt, durationMs, mode }
CardState{ cardId, FSRS-Felder (due, stability, difficulty, reps, lapses, state, lastReview) }
Settings { theme, accentColor, dailyNewLimit, dailyReviewLimit, examDate, apiKey?, aiModel, ... }
Media    { id, blob, mimeType }   // Bilder/Audio als Blob in IndexedDB, komprimiert
```

## 6. Kernfunktionen (Pflicht)

### 6.1 Ordnerstruktur
- **Beliebig verschachtelte Ordner** (Ordner in Ordnern), darin **Decks** (Kartenstapel)
- Erstellen, umbenennen, verschieben, löschen; Farbe und Icon/Emoji pro Ordner und Deck
- Sortierung per Drag & Drop (Touch-tauglich), Breadcrumb-Navigation
- Pro Ordner/Deck sichtbar: Kartenanzahl, fällige Karten, Lernfortschritt in %
- „Gesamten Ordner lernen“ (inkl. aller Unterordner)

### 6.2 Karten erstellen & bearbeiten
- Vollbild-Editor für Vorder- und Rückseite mit **Rich Text**: fett, kursiv, Unterstrichen, Farben/Markierung, Listen, Überschriften, Code-Blöcke, Tabellen
- **Bilder** auf beiden Seiten: aus Kamera oder Fotomediathek, automatisch komprimiert
- **Kartentypen:**
  1. Standard (Vorderseite → Rückseite)
  2. Umkehrbar (wird in beide Richtungen abgefragt)
  3. Lückentext / Cloze (`{{c1::Begriff}}`, mehrere Lücken pro Karte)
  4. Multiple Choice (eine oder mehrere richtige Antworten)
  5. Eingabe-Karte (Antwort eintippen, Vergleich mit Lösung)
- Tags, Hinweis (optional aufdeckbar), Notizen/Eselsbrücke
- Live-Vorschau der Karte im Editor
- **Schnellerfassung:** nach dem Speichern direkt die nächste Karte anlegen, ohne den Editor zu verlassen
- Karten duplizieren, verschieben (in anderes Deck), Mehrfachauswahl für Bulk-Aktionen (verschieben, taggen, löschen, markieren)
- Optional: Sprachnotiz als Audio-Anhang aufnehmen (MediaRecorder); Diktieren funktioniert ohnehin über die iOS-Tastatur

### 6.3 Lernmodi
- **Spaced Repetition (FSRS):** Bewertung mit Nochmal / Schwer / Gut / Einfach, jeweils mit Anzeige des nächsten Intervalls; tägliche Limits für neue Karten und Wiederholungen
- **Freies Lernen:** alle Karten eines Decks/Ordners ohne Einfluss auf den Zeitplan, optional gemischt
- **Schreibmodus:** Antwort eintippen, Abweichungen werden farblich hervorgehoben (tolerant gegenüber Groß-/Kleinschreibung, optional Tippfehlertoleranz)
- **Quiz-Modus:** automatisch generierte Multiple-Choice-Fragen aus den Rückseiten anderer Karten
- **Prüfungssimulation:** X zufällige Karten, Timer, keine Hilfen, Auswertung am Ende mit Note/Punkten
- **Fokus-Filter:** nur markierte, nur schwierige (viele Fehler), nur neue, nach Tags
- Session-Einstellungen: Reihenfolge (zufällig/geordnet), Richtung (vorne/hinten/beides), Kartenanzahl
- Während der Session: Fortschrittsbalken, Rückgängig der letzten Bewertung, Karte direkt bearbeiten, markieren, aussetzen
- **Session-Zusammenfassung:** richtig/falsch, Zeit, schwierigste Karten, „Fehler nochmal lernen“

### 6.4 Statistik & Motivation
- Dashboard (Startseite): heute fällig, Lernzeit heute, Tages-Streak, „Jetzt lernen“-Button
- **Prüfungs-Countdown** zu einem einstellbaren Prüfungsdatum (z. B. IHK-Abschlussprüfung) inkl. Hinweis, wie viele Karten pro Tag nötig sind, um bis dahin alles zu beherrschen
- Kalender-Heatmap der Lernaktivität (wie GitHub)
- Diagramme: Wiederholungen pro Tag, Prognose fälliger Karten der nächsten 30 Tage, Erfolgsquote, Kartenstatus (neu/lernend/beherrscht)
- Statistiken pro Ordner/Deck
- Gamification: Tagesziel, XP/Level, Achievements (z. B. „7-Tage-Streak“, „100 Karten gelernt“)

### 6.5 Suche & Organisation
- Globale Volltextsuche über alle Karten (Vorder-/Rückseite, Tags), Ergebnisse mit Pfad
- Filter nach Tags, Deck, Status, markiert
- **Papierkorb:** gelöschte Elemente 30 Tage wiederherstellbar
- Undo-Toast nach jeder Löschaktion

### 6.6 Backup, Import & Export
- **Vollständiges Backup** als `.json`-Datei (inkl. Bilder als Base64, Lernfortschritt, Einstellungen) über das iOS-Teilen-Menü (Web Share API) bzw. Download
- Wiederherstellen aus Backup (Zusammenführen oder Ersetzen, mit Bestätigung)
- **Backup-Erinnerung**, wenn das letzte Backup älter als 7 Tage ist
- Import einzelner Decks aus **CSV** (Vorderseite;Rückseite;Tags) und aus einfachem Text (Trennzeichen wählbar)
- Export einzelner Decks/Ordner (JSON und CSV), z. B. um sie mit Mitschülern zu teilen
- Druckansicht / PDF-Export eines Decks (optional)

### 6.7 Einstellungen
- Theme, Akzentfarbe, Schriftgröße der Karten
- Lernlimits, FSRS-Zielbehaltensrate (Standard 90 %)
- Prüfungsdatum, Tagesziel
- KI-Einstellungen (siehe 7)
- Speicherbelegung anzeigen, Daten zurücksetzen (mit doppelter Bestätigung)
- Beim ersten Start: kurzes animiertes **Onboarding** (3–4 Screens) und ein Beispiel-Deck, das man löschen kann

## 7. KI-Funktionen mit Claude (optional, standardmäßig aus)

Die App muss ohne KI vollständig funktionieren. KI-Funktionen werden erst sichtbar, wenn ich in den Einstellungen meinen eigenen **Anthropic-API-Key** hinterlege.

**Technik:**
- Direkter Aufruf der Anthropic Messages API aus dem Browser (`https://api.anthropic.com/v1/messages`) mit den Headern `x-api-key`, `anthropic-version: 2023-06-01` und `anthropic-dangerous-direct-browser-access: true`; kein eigener Server
- API-Key nur lokal speichern, nie loggen, nie exportieren (aus Backups ausschließen), mit „Key testen“-Button und Löschen-Option
- Modellauswahl in den Einstellungen: **`claude-haiku-5-5`** (Standard, günstig und schnell) und **`claude-sonnet-5-5`** (höhere Qualität)
- Strukturierte Ausgaben (JSON) für generierte Karten, robuste Validierung, verständliche Fehlermeldungen (kein Internet, ungültiger Key, Rate-Limit)
- **Kostentransparenz:** Token-Verbrauch und geschätzte Kosten pro Anfrage sowie kumuliert pro Monat anzeigen; optionales Monatslimit

**Funktionen:**
1. **Karten aus Text generieren:** Text/Notizen einfügen → Claude schlägt Karten vor → ich prüfe, bearbeite, wähle aus und speichere sie in ein Deck (nichts wird ungefragt gespeichert)
2. **Karten aus Foto generieren:** Foto vom Skript/Buch/Tafelbild aufnehmen → Claude (Vision) erstellt Kartenvorschläge
3. **Karte verbessern:** Formulierung schärfen, Antwort kürzen, Eselsbrücke vorschlagen, Rechtschreibung prüfen
4. **„Erklär mir das“:** während des Lernens eine ausführlichere Erklärung oder ein Beispiel zur aktuellen Karte anfordern
5. **KI-Bewertung im Schreibmodus:** Claude bewertet meine freie Antwort inhaltlich (nicht nur Wortgleichheit) und gibt kurzes Feedback
6. **Prüfungsfragen generieren:** aus einem Deck neue, IHK-typische Übungsfragen erstellen

Alle KI-Antworten auf Deutsch.

## 8. Qualitätsanforderungen

- Sauber strukturierter Code (Feature-Ordner, wiederverwendbare Komponenten, keine Riesendateien), TypeScript ohne `any`
- Performance: flüssige 60 fps auf dem iPhone, Listen mit vielen Karten virtualisieren, Lighthouse-PWA- und Performance-Score ≥ 90
- Barrierefreiheit: ausreichende Kontraste, Touch-Ziele ≥ 44 px, ARIA-Labels
- Komplette Benutzeroberfläche auf **Deutsch**
- Unit-Tests (Vitest) für Lernlogik, Cloze-Parsing, Import/Export; einige E2E-Tests (Playwright) mit iPhone-Viewport für die Hauptabläufe
- Fehlerbehandlung: Error Boundary mit freundlicher Meldung, keine Datenverluste bei Abstürzen (Entwürfe im Editor automatisch zwischenspeichern)

## 9. Vorgehen

Arbeite in Meilensteinen. Nach jedem Meilenstein: kurz zusammenfassen, was fertig ist, im Browser mit iPhone-Viewport (390×844) prüfen und auf mein OK warten, bevor du weitermachst.

1. **Setup:** Projekt anlegen, Tech-Stack, Design-Tokens, App-Shell mit Tab-Bar, PWA-Grundgerüst, Git-Repository initialisieren
2. **Datenbank & Ordnerstruktur:** Dexie-Schema, Ordner/Decks CRUD, verschachtelte Navigation, Drag & Drop
3. **Karten-Editor:** alle Kartentypen, Rich Text, Bilder, Schnellerfassung
4. **Lernmodus:** FSRS, Flip- und Swipe-Animationen, Session-Zusammenfassung, weitere Lernmodi
5. **Statistik, Dashboard, Gamification, Prüfungs-Countdown**
6. **Suche, Papierkorb, Backup/Import/Export, Einstellungen, Onboarding**
7. **KI-Funktionen**
8. **Feinschliff & Deployment:** Animationen polieren, Tests, Lighthouse, GitHub Pages per GitHub Actions, README mit Installationsanleitung für das iPhone

**Wichtig:**
- Stelle mir Rückfragen, wenn Anforderungen unklar sind oder sich widersprechen, statt zu raten.
- Schlage zusätzliche sinnvolle Features vor, setze sie aber erst nach meiner Zustimmung um.
- Erkläre mir am Ende Schritt für Schritt, wie ich die App online stelle und auf meinem iPhone installiere.
