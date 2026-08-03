# Valorant Agenten Challenge

Webseite + OBS-Overlay für die Challenge "mit jedem Valorant-Agenten mindestens einmal gewinnen".

- **`control.html`** — Steuer-Panel: Agenten während des Streams an-/abhaken.
- **`overlay.html`** — OBS Browser-Source: zeigt den Fortschritt live im Stream (transparenter Hintergrund).
- **`index.html`** — Übersichtsseite mit Links zu beiden.

Agentendaten (Name, Icon, Rolle) kommen live von [valorant-api.com](https://valorant-api.com). Der Fortschritt selbst wird als `state.json` auf einem eigenen Branch (`state-data`) dieses Repos gespeichert — kein separates Backend nötig.

## 1. GitHub Pages aktivieren

1. Im Repo: **Settings → Pages**.
2. Unter "Build and deployment" → Source: **Deploy from a branch**.
3. Branch: **`main`**, Ordner: **`/ (root)`** → Save.
4. Nach ein bis zwei Minuten ist die Seite unter `https://robotcappu.github.io/AgentenChallenge/` erreichbar.

## 2. Zugriffs-Token für die Steuerung erstellen

Die Steuer-Seite (`control.html`) braucht Schreibrechte auf dieses Repo, um den Fortschritt zu speichern. Dafür ein **fine-grained Personal Access Token** anlegen — **nicht** ein "classic" Token, damit der Zugriff eng begrenzt bleibt:

1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Repository access**: "Only select repositories" → `AgentenChallenge` auswählen.
3. **Permissions → Repository permissions → Contents**: **Read and write**. Alle anderen Permissions auf "No access" lassen.
4. Token erzeugen und kopieren.
5. Auf `control.html` einmalig einfügen und auf "Verbinden" klicken — das Token wird nur lokal im Browser gespeichert (`localStorage`), niemals im Repo.

**Wichtig:** Dieses Token ist gleichzeitig dein Zugriffscode für die Steuerung. Nicht öffentlich teilen, nicht im Stream zeigen, nicht in Screenshots.

## 3. OBS Browser-Source einrichten

1. In OBS: Quelle hinzufügen → **Browser**.
2. URL: `https://robotcappu.github.io/AgentenChallenge/overlay.html`
3. Breite/Höhe z.B. `1000` × `700` (je nach gewünschter Overlay-Größe im Bild).
4. Hintergrund ist transparent — die Quelle lässt sich direkt über das Gameplay legen.
5. Empfehlenswert: "Refresh browser when scene becomes active" aktivieren, damit die Seite beim Szenenwechsel neu lädt.

Das Overlay aktualisiert sich danach automatisch alle paar Sekunden, sobald im Control-Panel etwas geändert wird.

## Sicherheitshinweis

Das Token in `control.html` ist bewusst **fine-grained** und auf **genau dieses eine Repo** mit **nur** "Contents: Read & Write" begrenzt — selbst falls es einmal in falsche Hände gerät, kann damit nichts anderes als der Fortschritt in diesem einen Repo verändert werden. Trotzdem: Control-URL + Token nie gemeinsam veröffentlichen.
