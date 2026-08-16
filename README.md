# Valorant Agenten Challenge

Webseite + OBS-Overlay für die Challenge "mit jedem Valorant-Agenten mindestens einmal gewinnen".

- **`control.html`** — Steuer-Panel: Agenten an-/abhaken. Komplett offen, keine Anmeldung nötig — jeder mit dem Link kann mitsteuern.
- **`overlay.html`** — OBS Browser-Source: zeigt den Fortschritt live im Stream (transparenter Hintergrund).
- **`index.html`** — Übersichtsseite mit Links zu beiden.

Agentendaten (Name, Icon, Rolle) kommen live von [valorant-api.com](https://valorant-api.com). Der Fortschritt selbst liegt in einem kleinen, selbst gehosteten Google Apps Script Web App (siehe unten) — komplett kostenlos, keine Anmeldung für die Nutzer, du behältst als Ersteller die volle Kontrolle.

## 1. GitHub Pages aktivieren

1. Im Repo: **Settings → Pages**.
2. Unter "Build and deployment" → Source: **Deploy from a branch**.
3. Branch: **`main`**, Ordner: **`/ (root)`** → Save.
4. Nach ein bis zwei Minuten ist die Seite unter `https://robotcappu.github.io/AgentenChallenge/` erreichbar.

## 2. Backend (Google Apps Script) einrichten

Das ist der einzige Setup-Schritt, danach braucht **niemand mehr** — auch du nicht — irgendeine Anmeldung, um mitzuspielen.

1. [script.google.com](https://script.google.com) öffnen (mit einem beliebigen Google-Konto) → **Neues Projekt**.
2. Den kompletten Inhalt von [`apps-script/Code.gs`](apps-script/Code.gs) aus diesem Repo hineinkopieren (vorhandenen Beispielcode ersetzen).
3. Oben rechts **Bereitstellen → Neue Bereitstellung**.
4. Typ: **Web App** auswählen.
5. **Ausführen als**: Ich (dein Konto). **Wer hat Zugriff**: **Jeder**.
6. **Bereitstellen** klicken, ggf. den Zugriff bestätigen ("Advanced" → "Go to ... (unsafe)" — das ist normal bei eigenen unveröffentlichten Scripts).
7. Die angezeigte **Web-App-URL** kopieren (sieht aus wie `https://script.google.com/macros/s/…/exec`).
8. In [`js/state-store.js`](js/state-store.js) die Zeile `const APPS_SCRIPT_URL = "PASTE_YOUR_WEB_APP_URL_HERE";` durch diese URL ersetzen, committen und pushen.

**Test:** Die Web-App-URL direkt im Browser öffnen — es sollte `{"completed":{},"updatedAt":null}` erscheinen. Wenn nicht, Schritt 5 (Zugriff: "Jeder") prüfen.

Falls du das Script später änderst: Bereitstellen → **Bestehende Bereitstellung verwalten** → Version → **Bearbeiten** → neue Version wählen, sonst bleibt die alte URL auf dem alten Code hängen.

## 3. OBS Browser-Source einrichten

1. In OBS: Quelle hinzufügen → **Browser**.
2. URL: `https://robotcappu.github.io/AgentenChallenge/overlay.html`
3. Breite/Höhe z.B. `1000` × `700` (je nach gewünschter Overlay-Größe im Bild).
4. Hintergrund ist transparent — die Quelle lässt sich direkt über das Gameplay legen.
5. Empfehlenswert: "Refresh browser when scene becomes active" aktivieren, damit die Seite beim Szenenwechsel neu lädt.

Das Overlay aktualisiert sich danach automatisch alle paar Sekunden, sobald im Control-Panel etwas geändert wird.

## Offener Zugriff — was das bedeutet

`control.html` prüft keinerlei Anmeldung — **jeder, der den Link kennt, kann Agenten an- und abhaken oder alles zurücksetzen.** Das ist bewusst so gewünscht (z.B. damit ein Mod mithelfen kann), heißt aber auch:

- Den Link zu `control.html` nicht im Stream zeigen bzw. nicht öffentlich teilen, wenn nur bestimmte Leute mitsteuern sollen dürfen.
- Für dich selbst als OBS-Overlay-Quelle nur `overlay.html` verwenden (rein anzeigend, keine Steuerung möglich) — die eigentliche Steuerung bleibt privat unter `control.html`.
