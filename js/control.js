// Steuer-Panel: Agenten frei an-/abhaken, Fortschritt via GitHub-Store speichern.

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
  let completed = {};
  let token = getStoredToken();

  // Schreibvorgänge laufen strikt nacheinander (nie überlappend), damit schnelle
  // Klicks nicht um dieselbe Datei-Version konkurrieren. Klicks selbst blockieren nie -
  // sie aktualisieren die Anzeige sofort und markieren nur "dirty" für den Sync-Loop.
  let dirty = false;
  let syncing = false;

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

  // Markiert den aktuellen `completed`-Stand als "muss noch gespeichert werden" und
  // startet den Sync-Loop, falls er nicht schon läuft. Nie überlappend, aber auch nie
  // blockierend für den Klick, der es ausgelöst hat.
  function scheduleSync() {
    dirty = true;
    if (syncing) return;
    syncing = true;
    runSyncLoop();
  }

  async function runSyncLoop() {
    while (dirty) {
      dirty = false;
      const snapshot = { ...completed }; // immer der neueste Stand, inkl. zwischenzeitlicher Klicks
      setSyncStatus("Speichere…");
      try {
        await writeStateWithRetry({ completed: snapshot }, token, "update progress");
        if (!dirty) setSyncStatus("Gespeichert ✓", "ok");
      } catch (err) {
        dirty = true; // dieser Stand soll beim nächsten Anlauf erneut versucht werden
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
    if (completed[agent.uuid]) delete completed[agent.uuid];
    else completed[agent.uuid] = new Date().toISOString();
    draw();
    scheduleSync();
  }

  function handleReset() {
    if (!token) return;
    const sure = confirm("Wirklich den GESAMTEN Fortschritt zurücksetzen? Das kann nicht rückgängig gemacht werden.");
    if (!sure) return;
    completed = {};
    draw();
    scheduleSync();
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
    if (dirty && !syncing) {
      syncing = true;
      runSyncLoop();
    }
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
    completed = state.completed || {};
  } catch {
    completed = {};
  }

  updateConnectionUi();
  draw();
})();
