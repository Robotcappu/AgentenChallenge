/**
 * Öffentliches Backend für den Fortschritt der Agenten Challenge.
 *
 * Deployment (einmalig, siehe README):
 *   1. script.google.com -> Neues Projekt -> diesen Code komplett reinkopieren.
 *   2. Bereitstellen -> Neue Bereitstellung -> Typ "Web App".
 *   3. "Ausführen als": Ich (dein Google-Konto). "Wer hat Zugriff": Jeder.
 *   4. Bereitstellen, die angezeigte Web-App-URL kopieren.
 *   5. Diese URL in js/state-store.js als APPS_SCRIPT_URL eintragen.
 *
 * Danach kann jeder (ohne Anmeldung) lesen und den Fortschritt togglen.
 * LockService sorgt dafür, dass zwei gleichzeitige Klicks sich nicht überschreiben.
 *
 * WICHTIG: Lesen UND Schreiben laufen beide über GET (?action=toggle&uuid=... bzw.
 * ?action=reset), nicht über POST. Grund: script.google.com/.../exec leitet jeden
 * Aufruf per 302 auf eine script.googleusercontent.com-URL um. Browser/fetch() wandeln
 * bei so einer Weiterleitung einen POST automatisch in GET um und verwerfen dabei den
 * Body - ein echtes POST würde also lautlos ins Leere laufen. GET bleibt bei Redirects
 * immer GET, deshalb ist das hier der einzige zuverlässige Weg.
 */

var STATE_KEY = "agentenChallengeState";
var CODE_VERSION = "v2-get-based"; // nur zur Diagnose beim Deployen, kein Teil der eigentlichen Logik

function readState_() {
  var raw = PropertiesService.getScriptProperties().getProperty(STATE_KEY);
  if (!raw) return { completed: {}, updatedAt: null };
  try {
    var parsed = JSON.parse(raw);
    if (!parsed.completed) parsed.completed = {};
    return parsed;
  } catch (e) {
    return { completed: {}, updatedAt: null };
  }
}

function writeState_(state) {
  PropertiesService.getScriptProperties().setProperty(STATE_KEY, JSON.stringify(state));
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function applyAction_(action, uuid) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var state = readState_();
    if (action === "toggle" && uuid) {
      if (state.completed[uuid]) {
        delete state.completed[uuid];
      } else {
        state.completed[uuid] = new Date().toISOString();
      }
    } else if (action === "reset") {
      state.completed = {};
    }
    state.updatedAt = new Date().toISOString();
    writeState_(state);
    return state;
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  if (params.action === "toggle" || params.action === "reset") {
    var result = applyAction_(params.action, params.uuid);
    result.codeVersion = CODE_VERSION;
    return jsonOutput_(result);
  }
  var state = readState_();
  state.codeVersion = CODE_VERSION;
  return jsonOutput_(state);
}

// Delegiert an dieselbe Logik wie doGet, falls doch mal ein Client per POST mit
// Query-Parametern statt Body zugreift - schadet nicht, wird vom Control-Panel aber
// nicht genutzt (siehe Hinweis oben).
function doPost(e) {
  return doGet(e);
}
