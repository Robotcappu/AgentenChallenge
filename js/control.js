// Steuer-Panel: komplett offen, jeder kann Agenten an-/abhaken - keine Anmeldung nötig.
// Jeder Klick löst ein einzelnes, atomares Toggle im Backend aus (siehe apps-script/Code.gs),
// das dort per LockService serialisiert wird - zwei gleichzeitige Klicks auf unterschiedliche
// Agenten können sich dadurch nie gegenseitig überschreiben.

const CONTROL_POLL_INTERVAL_MS = 5000;

(async function initControl() {
  const syncStatus = document.getElementById("syncStatus");
  const resetBtn = document.getElementById("resetBtn");
  const gridEl = document.getElementById("grid");
  const progressEl = document.getElementById("progress");

  let groupedAgents = [];
  let totalAgents = 0;
  let completed = {};

  function setSyncStatus(text, kind) {
    syncStatus.textContent = text;
    syncStatus.className = "status-line" + (kind ? ` ${kind}` : "");
  }

  function draw() {
    renderRoleSections(gridEl, groupedAgents, completed, {
      clickable: true,
      onToggle: handleToggle,
    });
    renderProgress(progressEl, Object.values(completed).filter(Boolean).length, totalAgents);
  }

  function handleToggle(agent) {
    const wasCompleted = Boolean(completed[agent.uuid]);
    // Optimistisch sofort anzeigen, unabhängig von anderen laufenden Klicks.
    if (wasCompleted) delete completed[agent.uuid];
    else completed[agent.uuid] = new Date().toISOString();
    draw();
    setSyncStatus("Speichere…");

    toggleAgent(agent.uuid)
      .then((state) => {
        completed = state.completed || {};
        draw();
        setSyncStatus("Gespeichert ✓", "ok");
      })
      .catch((err) => {
        // Nur diesen einen Klick zurücknehmen, nicht alles - andere Klicks laufen unabhängig.
        if (wasCompleted) completed[agent.uuid] = new Date().toISOString();
        else delete completed[agent.uuid];
        draw();
        setSyncStatus(`Fehler beim Speichern: ${err.message}`, "error");
      });
  }

  function handleReset() {
    const sure = confirm("Wirklich den GESAMTEN Fortschritt zurücksetzen? Das kann nicht rückgängig gemacht werden.");
    if (!sure) return;
    const previousSnapshot = { ...completed };
    completed = {};
    draw();
    setSyncStatus("Setze zurück…");

    resetAll()
      .then((state) => {
        completed = state.completed || {};
        draw();
        setSyncStatus("Zurückgesetzt ✓", "ok");
      })
      .catch((err) => {
        completed = previousSnapshot;
        draw();
        setSyncStatus(`Fehler beim Zurücksetzen: ${err.message}`, "error");
      });
  }

  // Holt periodisch den aktuellen Stand, damit Änderungen einer anderen Person sichtbar
  // werden, auch ohne dass man selbst gerade etwas anklickt.
  async function pollRemote() {
    try {
      const state = await readState();
      completed = state.completed || {};
      draw();
    } catch {
      // Transienter Fehler - beim nächsten Poll erneut versuchen.
    }
  }

  resetBtn.addEventListener("click", handleReset);

  if (!isConfigured()) {
    setSyncStatus(
      "Backend noch nicht eingerichtet: APPS_SCRIPT_URL in js/state-store.js eintragen (siehe README).",
      "error"
    );
  }

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

  draw();
  setInterval(pollRemote, CONTROL_POLL_INTERVAL_MS);
})();
