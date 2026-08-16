// Steuer-Panel: Agenten frei an-/abhaken, Fortschritt via GitHub-Store speichern.
// Mehrpersonen-fähig: Statt den Server-Stand blind mit dem lokalen zu überschreiben, hält
// diese Seite den zuletzt bestätigten Server-Stand (remoteKnown) getrennt von den eigenen,
// noch nicht bestätigten Klicks (localDeltas). Jeder Schreibvorgang holt sich frisch den
// aktuellen Server-Stand und wendet nur die eigenen offenen Deltas darauf an - Änderungen
// einer anderen Person/eines anderen Geräts gehen so nicht verloren.

const CONTROL_POLL_INTERVAL_MS = 5000;

(async function initControl() {
  const tokenBox = document.getElementById("tokenBox");
  const connectedBox = document.getElementById("connectedBox");
  const tokenInput = document.getElementById("tokenInput");
  const tokenStatus = document.getElementById("tokenStatus");
  const syncStatus = document.getElementById("syncStatus");
  const saveTokenBtn = document.getElementById("saveTokenBtn");
  const changeTokenBtn = document.getElementById("changeTokenBtn");
  const resetBtn = document.getElementById("resetBtn");
  const gridEl = document.getElementById("grid");
  const progressEl = document.getElementById("progress");

  let groupedAgents = [];
  let totalAgents = 0;
  let remoteKnown = {}; // zuletzt vom Server bestätigter completed-Stand
  let localDeltas = {}; // uuid -> ISO-Timestamp (abgehakt) oder null (zurückgesetzt), noch nicht bestätigt
  let completed = {}; // remoteKnown + localDeltas zusammengeführt - das, was angezeigt wird
  let token = getStoredToken();
  let syncing = false;

  function applyDeltas(base, deltas) {
    const result = { ...base };
    for (const [uuid, value] of Object.entries(deltas)) {
      if (value) result[uuid] = value;
      else delete result[uuid];
    }
    return result;
  }

  function recomputeCompleted() {
    completed = applyDeltas(remoteKnown, localDeltas);
  }

  function setSyncStatus(text, kind) {
    syncStatus.textContent = text;
    syncStatus.className = "status-line" + (kind ? ` ${kind}` : "");
  }

  function setTokenStatus(text, kind) {
    tokenStatus.textContent = text;
    tokenStatus.className = "status-line" + (kind ? ` ${kind}` : "");
  }

  function updateConnectionUi() {
    const hasToken = Boolean(token);
    tokenBox.style.display = hasToken ? "none" : "flex";
    connectedBox.style.display = hasToken ? "flex" : "none";
  }

  function draw(justCompletedUuids) {
    renderRoleSections(gridEl, groupedAgents, completed, {
      clickable: Boolean(token),
      onToggle: handleToggle,
      justCompletedUuids,
    });
    renderProgress(progressEl, Object.values(completed).filter(Boolean).length, totalAgents);
  }

  // Startet den Sync-Loop, falls er nicht schon läuft. Klicks selbst blockieren nie -
  // sie aktualisieren die Anzeige sofort, der Loop räumt localDeltas im Hintergrund ab.
  function scheduleSync() {
    if (syncing) return;
    syncing = true;
    runSyncLoop();
  }

  async function runSyncLoop() {
    while (Object.keys(localDeltas).length > 0) {
      const deltasSnapshot = { ...localDeltas };
      setSyncStatus("Speichere…");
      try {
        const written = await writeStateWithRetry(
          (freshRemoteCompleted) => applyDeltas(freshRemoteCompleted, deltasSnapshot),
          token,
          "update progress"
        );
        remoteKnown = written;
        for (const uuid of Object.keys(deltasSnapshot)) {
          if (localDeltas[uuid] === deltasSnapshot[uuid]) delete localDeltas[uuid];
        }
        recomputeCompleted();
        draw();
        if (Object.keys(localDeltas).length === 0) setSyncStatus("Gespeichert ✓", "ok");
      } catch (err) {
        if (err instanceof GithubAuthError) {
          setSyncStatus("Token ungültig oder ohne Schreibrecht — bitte neu verbinden.", "error");
          token = "";
          setStoredToken("");
          updateConnectionUi();
          draw();
        } else {
          setSyncStatus(`Fehler beim Speichern: ${err.message}`, "error");
        }
        break;
      }
    }
    syncing = false;
  }

  function handleToggle(agent) {
    if (!token) return;
    const isCurrentlyCompleted = Boolean(completed[agent.uuid]);
    localDeltas[agent.uuid] = isCurrentlyCompleted ? null : new Date().toISOString();
    recomputeCompleted();
    draw();
    scheduleSync();
  }

  function handleReset() {
    if (!token) return;
    const sure = confirm("Wirklich den GESAMTEN Fortschritt zurücksetzen? Das kann nicht rückgängig gemacht werden.");
    if (!sure) return;
    for (const uuid of Object.keys(completed)) {
      localDeltas[uuid] = null;
    }
    recomputeCompleted();
    draw();
    scheduleSync();
  }

  // Holt periodisch den Server-Stand, damit Änderungen einer anderen Person/eines anderen
  // Geräts sichtbar werden, auch ohne dass man selbst gerade etwas anklickt. Während ein
  // eigener Schreibvorgang läuft, wird der Server-Stand ohnehin schon frisch abgeglichen.
  async function pollRemote() {
    if (syncing) return;
    try {
      const state = await readState();
      remoteKnown = state.completed || {};
      recomputeCompleted();
      draw();
    } catch {
      // Transienter Fehler - beim nächsten Poll erneut versuchen.
    }
  }

  saveTokenBtn.addEventListener("click", () => {
    const value = tokenInput.value.trim();
    if (!value) {
      setTokenStatus("Bitte ein Token einfügen.", "error");
      return;
    }
    token = value;
    setStoredToken(value);
    tokenInput.value = "";
    setTokenStatus("");
    updateConnectionUi();
    draw();
    scheduleSync();
  });

  changeTokenBtn.addEventListener("click", () => {
    token = "";
    setStoredToken("");
    updateConnectionUi();
    draw();
  });

  resetBtn.addEventListener("click", handleReset);

  try {
    const agents = await getAgents();
    totalAgents = agents.length;
    groupedAgents = groupAgentsByRole(agents);
  } catch (err) {
    gridEl.textContent = "Agentenliste konnte nicht geladen werden.";
    return;
  }

  try {
    const state = await readState();
    remoteKnown = state.completed || {};
  } catch {
    remoteKnown = {};
  }
  recomputeCompleted();

  updateConnectionUi();
  draw();

  setInterval(pollRemote, CONTROL_POLL_INTERVAL_MS);
})();
