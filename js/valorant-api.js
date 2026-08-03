// Lädt und cached die Liste aller spielbaren Valorant-Agenten von valorant-api.com.
const VALORANT_API_URL = "https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=en-US";
const AGENTS_CACHE_KEY = "agentenChallenge.agentsCache.v1";
const AGENTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const ROLE_ORDER = ["Duelist", "Initiator", "Controller", "Sentinel"];

function readAgentsCache() {
  try {
    const raw = localStorage.getItem(AGENTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.agents)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAgentsCache(agents) {
  try {
    localStorage.setItem(
      AGENTS_CACHE_KEY,
      JSON.stringify({ agents, fetchedAt: Date.now() })
    );
  } catch {
    // localStorage kann in seltenen Fällen voll/gesperrt sein - Cache ist nur ein Optimierung, kein Muss.
  }
}

function mapAgent(raw) {
  return {
    uuid: raw.uuid,
    name: raw.displayName,
    icon: raw.displayIcon,
    portrait: raw.fullPortrait || raw.displayIcon,
    role: raw.role && raw.role.displayName ? raw.role.displayName : "Unbekannt",
  };
}

async function fetchAgentsFromApi() {
  const res = await fetch(VALORANT_API_URL);
  if (!res.ok) throw new Error(`valorant-api.com antwortete mit ${res.status}`);
  const json = await res.json();
  return json.data
    .filter((a) => a.displayName && a.displayIcon && a.role)
    .map(mapAgent);
}

// Liefert die Agentenliste; nutzt Cache, holt im Hintergrund/Notfall neu.
async function getAgents() {
  const cached = readAgentsCache();
  const cacheIsFresh = cached && Date.now() - cached.fetchedAt < AGENTS_CACHE_TTL_MS;

  if (cacheIsFresh) return cached.agents;

  try {
    const agents = await fetchAgentsFromApi();
    writeAgentsCache(agents);
    return agents;
  } catch (err) {
    if (cached) return cached.agents; // API down -> lieber alten Cache nutzen als nichts anzuzeigen
    throw err;
  }
}

function groupAgentsByRole(agents) {
  const groups = new Map();
  for (const agent of agents) {
    if (!groups.has(agent.role)) groups.set(agent.role, []);
    groups.get(agent.role).push(agent);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const orderedKeys = [
    ...ROLE_ORDER.filter((r) => groups.has(r)),
    ...[...groups.keys()].filter((r) => !ROLE_ORDER.includes(r)),
  ];
  return orderedKeys.map((role) => ({ role, agents: groups.get(role) }));
}
