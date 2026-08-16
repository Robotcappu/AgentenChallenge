// Nutzt das GitHub-Repo selbst als kleinen Key-Value-Store für den Challenge-Fortschritt.
// State liegt als state.json auf einem separaten, nicht veröffentlichten Branch (STATE_BRANCH),
// damit main sauber bleibt. Lesen geht ohne Auth über raw.githubusercontent.com, Schreiben
// braucht ein fine-grained Personal Access Token (Contents: Read & Write, nur dieses Repo).

const GH_OWNER = "Robotcappu";
const GH_REPO = "AgentenChallenge";
const STATE_BRANCH = "state-data";
const STATE_PATH = "state.json";
const TOKEN_STORAGE_KEY = "agentenChallenge.githubToken";

function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function emptyState() {
  return { updatedAt: null, completed: {} };
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Liest den aktuellen State öffentlich (kein Auth nötig) - für's Overlay und die Erstanzeige.
async function readState() {
  const url = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${STATE_BRANCH}/${STATE_PATH}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return emptyState();
  if (!res.ok) throw new Error(`state.json lesen fehlgeschlagen (${res.status})`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return emptyState();
  }
}

function contentsApiUrl() {
  return `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${STATE_PATH}?ref=${STATE_BRANCH}`;
}

// Holt sha + Inhalt direkt über die (authentifizierte) API - unumgänglich beim Schreiben,
// da raw.githubusercontent zwischengecached sein kann.
async function fetchCurrentFile(token) {
  const res = await fetch(contentsApiUrl(), {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) return { sha: null, state: emptyState() };
  if (res.status === 401 || res.status === 403) {
    throw new GithubAuthError(`Token abgelehnt (${res.status})`);
  }
  if (!res.ok) throw new Error(`GitHub API Fehler beim Lesen (${res.status})`);
  const json = await res.json();
  const state = JSON.parse(base64ToUtf8(json.content));
  return { sha: json.sha, state };
}

class GithubAuthError extends Error {}
class GithubConflictError extends Error {}

// Schreibt einen neuen State - MERGE-basiert statt Überschreiben: `computeNewCompleted`
// bekommt den gerade frisch vom Server gelesenen `completed`-Stand übergeben und muss daraus
// den zu speichernden Stand berechnen. So gehen Änderungen aus einer anderen Session/einem
// anderen Gerät (z.B. ein Mod, der gleichzeitig das Panel benutzt) nicht verloren, selbst wenn
// dieser Aufruf hier retried wird - jeder Versuch holt sich den jeweils aktuellsten Stand.
// Gibt den tatsächlich geschriebenen `completed`-Stand zurück.
async function writeState(computeNewCompleted, token, commitMessage) {
  if (!token) throw new GithubAuthError("Kein Token vorhanden");
  const { sha, state } = await fetchCurrentFile(token);
  const newCompleted = computeNewCompleted(state.completed || {});

  const body = {
    message: commitMessage || "update state.json",
    content: utf8ToBase64(
      JSON.stringify({ completed: newCompleted, updatedAt: new Date().toISOString() }, null, 2)
    ),
    branch: STATE_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(contentsApiUrl().split("?")[0], {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 409) throw new GithubConflictError("Konflikt beim Speichern, bitte erneut versuchen");
  if (res.status === 401 || res.status === 403) throw new GithubAuthError(`Token abgelehnt (${res.status})`);
  if (!res.ok) throw new Error(`GitHub API Fehler beim Schreiben (${res.status})`);

  return newCompleted;
}

// Schreibt mit ein paar automatischen Retries bei sha-Konflikten (z.B. zwei Sessions gleichzeitig).
// Jeder Versuch liest den Server-Stand neu und lässt `computeNewCompleted` neu darüber mergen.
async function writeStateWithRetry(computeNewCompleted, token, commitMessage, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await writeState(computeNewCompleted, token, commitMessage);
    } catch (err) {
      if (err instanceof GithubConflictError && i < attempts - 1) continue;
      throw err;
    }
  }
}
