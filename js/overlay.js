// OBS Browser-Source: rein lesend, pollt state.json und zeigt den Fortschritt live an.
const POLL_INTERVAL_MS = 5000;

(async function initOverlay() {
  const gridEl = document.getElementById("grid");
  const progressEl = document.getElementById("progress");

  let groupedAgents = [];
  let totalAgents = 0;
  let previousCompleted = {};

  try {
    const agents = await getAgents();
    totalAgents = agents.length;
    groupedAgents = groupAgentsByRole(agents);
  } catch (err) {
    gridEl.textContent = "Agentenliste konnte nicht geladen werden.";
    return;
  }

  async function tick() {
    let state;
    try {
      state = await readState();
    } catch {
      return; // Netzwerk-Hänger etc. - beim nächsten Poll erneut versuchen
    }

    const completed = state.completed || {};
    const justCompletedUuids = new Set(
      Object.keys(completed).filter((uuid) => completed[uuid] && !previousCompleted[uuid])
    );

    renderRoleSections(gridEl, groupedAgents, completed, {
      clickable: false,
      justCompletedUuids,
    });
    renderProgress(progressEl, Object.keys(completed).filter((k) => completed[k]).length, totalAgents);

    previousCompleted = completed;
  }

  await tick();
  setInterval(tick, POLL_INTERVAL_MS);
})();
