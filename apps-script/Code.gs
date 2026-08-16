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
 */

var STATE_KEY = "agentenChallengeState";

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

function doGet(e) {
  return jsonOutput_(readState_());
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents);
    var state = readState_();

    if (body.action === "toggle" && body.uuid) {
      if (state.completed[body.uuid]) {
        delete state.completed[body.uuid];
      } else {
        state.completed[body.uuid] = new Date().toISOString();
      }
    } else if (body.action === "reset") {
      state.completed = {};
    }

    state.updatedAt = new Date().toISOString();
    writeState_(state);
    return jsonOutput_(state);
  } finally {
    lock.releaseLock();
  }
}
