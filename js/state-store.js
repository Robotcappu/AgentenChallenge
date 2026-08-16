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

async function readState() {
  if (!isConfigured()) return emptyState();
  const res = await fetch(`${APPS_SCRIPT_URL}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Zustand lesen fehlgeschlagen (${res.status})`);
  const state = await res.json();
  return { ...emptyState(), ...state };
}

// Absichtlich Content-Type "text/plain" statt "application/json": das ist ein CORS-"simple
// request", der ohne Preflight (OPTIONS) auskommt - Apps Script Web Apps beantworten OPTIONS
// nicht. Der Body ist trotzdem ganz normales JSON, Apps Script liest ihn roh über
// e.postData.contents und parst ihn selbst.
async function postAction(action) {
  if (!isConfigured()) {
    throw new Error("Apps-Script-URL ist noch nicht eingetragen (js/state-store.js).");
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error(`Speichern fehlgeschlagen (${res.status})`);
  const state = await res.json();
  return { ...emptyState(), ...state };
}

async function toggleAgent(uuid) {
  return postAction({ action: "toggle", uuid });
}

async function resetAll() {
  return postAction({ action: "reset" });
}
