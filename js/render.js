// Gemeinsames Rendering für Control-Panel und Overlay: Rollen-Grid + Fortschrittsbalken.

const ROLE_CSS_VAR = {
  Duelist: "--role-duelist",
  Initiator: "--role-initiator",
  Controller: "--role-controller",
  Sentinel: "--role-sentinel",
};

function roleColorVar(role) {
  return `var(${ROLE_CSS_VAR[role] || "--role-unbekannt"})`;
}

function createAgentCard(agent, isCompleted, { clickable, onToggle, justCompleted } = {}) {
  const card = document.createElement("div");
  card.className = "agent-card" + (isCompleted ? " completed" : "") + (clickable ? " clickable" : "");
  if (justCompleted) card.classList.add("just-completed");
  card.style.setProperty("--role-color", roleColorVar(agent.role));
  card.dataset.uuid = agent.uuid;

  const img = document.createElement("img");
  img.src = agent.icon;
  img.alt = agent.name;
  img.loading = "lazy";

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = agent.name;

  const check = document.createElement("div");
  check.className = "check";
  check.textContent = "✓";

  card.append(img, name, check);

  if (clickable && onToggle) {
    card.addEventListener("click", () => onToggle(agent, card));
  }

  return card;
}

function renderRoleSections(container, groupedAgents, completedMap, options = {}) {
  container.innerHTML = "";
  for (const { role, agents } of groupedAgents) {
    const section = document.createElement("div");
    section.className = "role-section";

    const title = document.createElement("div");
    title.className = "role-title";
    title.textContent = role;
    title.style.setProperty("--role-color", roleColorVar(role));

    const grid = document.createElement("div");
    grid.className = "agent-grid";

    for (const agent of agents) {
      const isCompleted = Boolean(completedMap[agent.uuid]);
      const justCompleted = options.justCompletedUuids && options.justCompletedUuids.has(agent.uuid);
      grid.appendChild(
        createAgentCard(agent, isCompleted, {
          clickable: options.clickable,
          onToggle: options.onToggle,
          justCompleted,
        })
      );
    }

    section.append(title, grid);
    container.appendChild(section);
  }
}

function renderProgress(el, completedCount, total) {
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  el.querySelector(".progress-count").textContent = `${completedCount} / ${total} Agenten gewonnen`;
  el.querySelector(".progress-pct").textContent = `${pct}%`;
  el.querySelector(".progress-bar-fill").style.width = `${pct}%`;
}
