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

  async function handleToggle(agent) {
    if (!token) return;

    const wasCompleted = Boolean(completed[agent.uuid]);
    const previousSnapshot = { ...completed };

    if (wasCompleted) delete completed[agent.uuid];
    else completed[agent.uuid] = new Date().toISOString();

    draw();
    setSyncStatus("Speichere…");

    try {
      await writeStateWithRetry({ completed }, token, `toggle: ${agent.name}`);
      setSyncStatus("Gespeichert ✓", "ok");
    } catch (err) {
      completed = previousSnapshot;
      if (err instanceof GithubAuthError) {
        setSyncStatus("Token ungültig oder ohne Schreibrecht — bitte neu verbinden.", "error");
        token = "";
        setStoredToken("");
        updateConnectionUi();
      } else {
        setSyncStatus(`Fehler beim Speichern: ${err.message}`, "error");
      }
      draw();
    }
  }

  async function handleReset() {
    if (!token) return;
    const sure = confirm("Wirklich den GESAMTEN Fortschritt zurücksetzen? Das kann nicht rückgängig gemacht werden.");
    if (!sure) return;

    const previousSnapshot = { ...completed };
    completed = {};
    draw();
    setSyncStatus("Setze zurück…");

    try {
      await writeStateWithRetry({ completed }, token, "reset all progress");
      setSyncStatus("Zurückgesetzt ✓", "ok");
    } catch (err) {
      completed = previousSnapshot;
      draw();
      setSyncStatus(`Fehler beim Zurücksetzen: ${err.message}`, "error");
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
