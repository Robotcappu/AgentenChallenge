// Öffentlicher Speicher für den Challenge-Fortschritt über ein Google Apps Script Web App
// (siehe apps-script/Code.gs). Komplett offen: jeder mit dieser Seite kann lesen und schreiben,
// keine Anmeldung nötig. Nach dem Deployen des Scripts die URL hier eintragen.
const APPS_SCRIPT_URL = "PASTE_YOUR_WEB_APP_URL_HERE";

function isConfigured() {
  return APPS_SCRIPT_URL.startsWith("https://script.google.com/");
}

function emptyState() {
  return { updatedAt: null, completed: {} };
}

// Lesen UND Schreiben laufen beide über GET (siehe apps-script/Code.gs für den Grund:
// script.google.com/.../exec leitet per 302 um, und dabei würde ein POST von fetch()
// automatisch zu GET degradiert und der Body verworfen werden - GET bleibt bei
// Redirects immer GET, deshalb ist das der einzige zuverlässige Weg für beides).
async function callBackend(params) {
  if (!isConfigured()) {
    throw new Error("Apps-Script-URL ist noch nicht eingetragen (js/state-store.js).");
  }
  const url = new URL(APPS_SCRIPT_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("t", Date.now());

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Anfrage fehlgeschlagen (${res.status})`);
  const state = await res.json();
  return { ...emptyState(), ...state };
}

async function readState() {
  if (!isConfigured()) return emptyState();
  return callBackend({});
}

async function toggleAgent(uuid) {
  return callBackend({ action: "toggle", uuid });
}

async function resetAll() {
  return callBackend({ action: "reset" });
}
