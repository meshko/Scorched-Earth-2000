import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web");
const port = Number(process.env.PORT || 4174);
const statsHtmlPath = path.resolve(process.env.SCORCH_STATS_HTML || process.env.STATS_HTML || path.join(root, "stats.html"));
const AUTO_START_MS = 3 * 60 * 1000;
const games = new Map();
const clients = new Set();
const statsByName = new Map();
let nextClientId = 1;
let statsWritePending = false;
const serverMetrics = {
  completedGames: 0,
  maxConcurrentGames: 0,
  maxConcurrentPlayers: 0,
  longestGameMs: 0,
  longestGameLabel: "",
  longestGameStartedAt: null,
  longestGameEndedAt: null
};

const mime = new Map([
  ["", "text/plain; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"]
]);

function log(event, details = "") {
  const stamp = new Date().toISOString();
  console.log(`[${stamp}] ${event}${details ? ` ${details}` : ""}`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function statKey(name) {
  return String(name || "Player").trim().toLowerCase();
}

function globalStatFor(name) {
  const displayName = String(name || "Player").trim() || "Player";
  const key = statKey(displayName);
  if (!statsByName.has(key)) {
    statsByName.set(key, {
      name: displayName,
      kills: 0,
      gain: 0,
      games: 0,
      wins: 0,
      lastSeen: null
    });
  }
  const entry = statsByName.get(key);
  entry.name = displayName;
  entry.lastSeen = new Date().toISOString();
  return entry;
}

function recordStatsDelta(participant, stat) {
  if (!participant || participant.kind !== "human") return false;
  const kills = Number(stat.kills) || 0;
  const gain = Number(stat.gain) || 0;
  const overallKills = Number(stat.overallKills) || kills;
  const overallGain = Number(stat.overallGain) || gain;
  const previousKills = Number(participant.overallKills) || 0;
  const previousGain = Number(participant.overallGain) || 0;
  const entry = globalStatFor(participant.name);
  entry.kills += overallKills - previousKills;
  entry.gain += overallGain - previousGain;
  participant.kills = kills;
  participant.gain = gain;
  participant.overallKills = overallKills;
  participant.overallGain = overallGain;
  return true;
}

function statWeight(stat) {
  return Math.abs(Number(stat?.gain) || 0) +
    Math.abs(Number(stat?.kills) || 0) * 100000 +
    Math.abs(Number(stat?.overallGain) || 0) +
    Math.abs(Number(stat?.overallKills) || 0) * 100000;
}

function mergedTurnStats(turnReports) {
  const merged = new Map();
  for (const report of turnReports.values()) {
    if (!Array.isArray(report.payload?.stats)) continue;
    for (const stat of report.payload.stats) {
      const id = Number(stat.id);
      if (!Number.isInteger(id)) continue;
      const current = merged.get(id);
      if (!current || statWeight(stat) > statWeight(current)) merged.set(id, stat);
    }
  }
  return [...merged.values()];
}

function mergeTurnInventory(room, turnReports) {
  let changed = false;
  for (const report of turnReports.values()) {
    if (!Array.isArray(report.payload?.inventory)) continue;
    for (const item of report.payload.inventory) {
      const participant = room.participants[item.id];
      if (!participant) continue;
      if (Array.isArray(item.weapons)) {
        participant.weapons = item.weapons.map((value) => Math.max(0, Number(value) || 0));
        changed = true;
      }
      if (Array.isArray(item.items)) {
        participant.items = item.items.map((value) => Math.max(0, Number(value) || 0));
        changed = true;
      }
      if (item.cash != null) {
        participant.cash = Math.max(0, Number(item.cash) || 0);
        changed = true;
      }
    }
  }
  return changed;
}

function recordGameFinished(room, winnerId) {
  let changed = false;
  for (const participant of room.participants) {
    if (participant.kind !== "human") continue;
    const entry = globalStatFor(participant.name);
    entry.games += 1;
    if (room.participants[winnerId] === participant) entry.wins += 1;
    changed = true;
  }
  if (changed) scheduleStatsWrite();
}

function statsRows() {
  return [...statsByName.values()]
    .sort((a, b) => b.gain - a.gain || b.kills - a.kills || a.name.localeCompare(b.name));
}

function currentGameRows() {
  const now = Date.now();
  return [...games.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((game) => {
      const humanCount = game.participants.filter((entry) => entry.kind === "human").length;
      const aiCount = game.participants.filter((entry) => entry.kind === "ai").length;
      const status = game.started
        ? `Round ${game.currentRound} of ${game.rounds}`
        : "Waiting for players";
      const label = game.private ? "Private game" : `${game.code}${game.title ? ` - ${game.title}` : ""}`;
      const ageMs = now - game.createdAt;
      return { game, label, status, ageMs, humanCount, aiCount };
    });
}

function serverSummary() {
  const gameEntries = [...games.values()];
  const humans = gameEntries.reduce((sum, game) => sum + game.participants.filter((entry) => entry.kind === "human").length, 0);
  const ais = gameEntries.reduce((sum, game) => sum + game.participants.filter((entry) => entry.kind === "ai").length, 0);
  return {
    games: gameEntries.length,
    completedGames: serverMetrics.completedGames,
    waiting: gameEntries.filter((game) => !game.started).length,
    playing: gameEntries.filter((game) => game.started).length,
    humans,
    ais,
    connections: clients.size,
    longestGameMs: serverMetrics.longestGameMs
  };
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}h ${minutes}m ${seconds}s`
    : `${minutes}m ${seconds}s`;
}

function updateConcurrentGameRecord() {
  serverMetrics.maxConcurrentGames = Math.max(serverMetrics.maxConcurrentGames, games.size);
  const humanPlayers = [...games.values()]
    .filter((game) => game.started)
    .reduce((sum, game) => sum + game.participants.filter((entry) => entry.kind === "human").length, 0);
  serverMetrics.maxConcurrentPlayers = Math.max(serverMetrics.maxConcurrentPlayers, humanPlayers);
}

function gameLabel(room) {
  if (!room) return "";
  return room.private ? "Private game" : `${room.code}${room.title ? ` - ${room.title}` : ""}`;
}

function recordGameDuration(room, endedAt = Date.now()) {
  if (!room?.startedAt) return;
  const duration = endedAt - room.startedAt;
  if (duration <= serverMetrics.longestGameMs) return;
  serverMetrics.longestGameMs = duration;
  serverMetrics.longestGameLabel = gameLabel(room);
  serverMetrics.longestGameStartedAt = new Date(room.startedAt).toISOString();
  serverMetrics.longestGameEndedAt = new Date(endedAt).toISOString();
}

function recordCompletedGame(room, winnerId, endedAt = Date.now()) {
  serverMetrics.completedGames += 1;
  recordGameDuration(room, endedAt);
  recordGameFinished(room, winnerId);
}

function renderStatsHtml() {
  const generated = new Date().toISOString();
  const summary = serverSummary();
  const gameRows = currentGameRows().map((entry) => `
      <tr>
        <td>${escapeHtml(entry.label)}</td>
        <td>${escapeHtml(entry.status)}</td>
        <td>${formatDuration(entry.ageMs)}</td>
        <td>${entry.game.resolution}</td>
        <td>${entry.game.maxWind}</td>
        <td>${entry.game.initialCash}</td>
        <td>${entry.humanCount}</td>
        <td>${entry.aiCount}</td>
        <td>${escapeHtml(entry.game.participants.map((participant) => participant.name).join(", "))}</td>
      </tr>`).join("");
  const rows = statsRows().map((entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(entry.name)}</td>
        <td>${entry.kills}</td>
        <td>${entry.gain}</td>
        <td>${entry.games}</td>
        <td>${entry.wins}</td>
        <td>${entry.lastSeen ? escapeHtml(entry.lastSeen) : ""}</td>
      </tr>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Scorched Earth 2000 Stats</title>
  <style>
    body { background:#000; color:#ddd; font:14px Arial, sans-serif; margin:24px; }
    h1 { color:#fff; font-size:22px; }
    h2 { color:#fff; font-size:17px; margin-top:22px; }
    table { border-collapse:collapse; min-width:720px; background:#111; }
    th, td { border:1px solid #555; padding:6px 9px; text-align:right; }
    th { background:#333; color:#fff; }
    td:nth-child(2), th:nth-child(2) { text-align:left; }
    .current-games td:first-child, .current-games th:first-child,
    .current-games td:nth-child(2), .current-games th:nth-child(2),
    .current-games td:last-child, .current-games th:last-child { text-align:left; }
    .summary { display:grid; grid-template-columns:repeat(4, auto); gap:8px; justify-content:start; margin:12px 0 18px; }
    .summary span { background:#111; border:1px solid #555; padding:6px 9px; }
    .meta { color:#aaa; margin-bottom:14px; }
  </style>
</head>
<body>
  <h1>Scorched Earth 2000 Stats</h1>
  <div class="meta">Generated ${escapeHtml(generated)}</div>
  <div class="summary">
    <span>Connections: ${summary.connections}</span>
    <span>Games: ${summary.games}</span>
    <span>Completed games: ${summary.completedGames}</span>
    <span>Waiting: ${summary.waiting}</span>
    <span>Playing: ${summary.playing}</span>
    <span>Human players: ${summary.humans}</span>
    <span>AI players: ${summary.ais}</span>
    <span>Most concurrent games: ${serverMetrics.maxConcurrentGames}</span>
    <span>Most concurrent human players in games: ${serverMetrics.maxConcurrentPlayers}</span>
    <span>Longest game: ${formatDuration(summary.longestGameMs)}${serverMetrics.longestGameLabel ? ` (${escapeHtml(serverMetrics.longestGameLabel)})` : ""}</span>
  </div>
  <h2>Current Games</h2>
  <table class="current-games">
    <thead>
      <tr><th>Game</th><th>Status</th><th>Age</th><th>Resolution</th><th>Wind</th><th>Cash</th><th>Humans</th><th>AI</th><th>Players</th></tr>
    </thead>
    <tbody>
${gameRows || "      <tr><td colspan=\"9\">No games are running right now.</td></tr>"}
    </tbody>
  </table>
  <h2>Player Standings</h2>
  <table>
    <thead>
      <tr><th>Rank</th><th>Player Name</th><th>Kills</th><th>Gain</th><th>Games</th><th>Wins</th><th>Last Seen</th></tr>
    </thead>
    <tbody>
${rows || "      <tr><td colspan=\"7\">No games recorded yet.</td></tr>"}
    </tbody>
  </table>
</body>
</html>
`;
}

function scheduleStatsWrite() {
  if (statsWritePending) return;
  statsWritePending = true;
  setTimeout(() => {
    statsWritePending = false;
    writeStatsHtml().catch((error) => log("stats.write_failed", error.message));
  }, 100);
}

async function writeStatsHtml() {
  await fs.mkdir(path.dirname(statsHtmlPath), { recursive: true });
  await fs.writeFile(statsHtmlPath, renderStatsHtml(), "utf8");
  log("stats.write", `path=${statsHtmlPath}`);
}

function roomCode() {
  let code = "";
  do code = crypto.randomBytes(3).toString("hex").toUpperCase();
  while (games.has(code));
  return code;
}

function send(socket, payload) {
  if (socket.destroyed) return;
  const body = Buffer.from(JSON.stringify(payload));
  const header = body.length < 126
    ? Buffer.from([0x81, body.length])
    : Buffer.from([0x81, 126, body.length >> 8, body.length & 255]);
  socket.write(Buffer.concat([header, body]));
}

function broadcast(room, payload) {
  for (const client of room.clients) send(client.socket, payload);
}

function gameList() {
  return [...games.values()].filter((game) => !game.private && !game.started).map((game) => ({
    code: game.code,
    title: game.title,
    private: game.private,
    players: game.participants.length,
    started: game.started,
    resolution: game.resolution,
    maxWind: game.maxWind,
    changingWinds: game.changingWinds,
    unlimitedInventory: game.unlimitedInventory,
    initialCash: game.initialCash,
    rounds: game.rounds,
    currentRound: game.currentRound,
    autoStartAt: game.autoStartAt,
    host: game.clients.find((client) => client.id === game.hostId)?.name ?? "unknown",
    names: game.participants.map((participant) => participant.name)
  }));
}

function broadcastGameList() {
  for (const client of clients) send(client.socket, { type: "game-list", games: gameList() });
}

function roomPlayers(room) {
  return room.participants.map((participant, id) => ({
    id,
    clientId: participant.client?.id ?? null,
    name: participant.name,
    tankType: participant.tankType ?? (id % 6),
    ai: participant.kind === "ai",
    aiType: participant.aiType ?? 0,
    disconnected: !!participant.disconnected,
    weapons: participant.weapons ?? null,
    items: participant.items ?? null,
    cash: participant.cash ?? null,
    kills: participant.kills ?? 0,
    gain: participant.gain ?? 0,
    overallKills: participant.overallKills ?? 0,
    overallGain: participant.overallGain ?? 0
  }));
}

function defaultWeapons(unlimitedInventory = false) {
  return unlimitedInventory ? Array(17).fill(999) : [999, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

function defaultItems(unlimitedInventory = false) {
  return unlimitedInventory ? Array(8).fill(999) : Array(8).fill(0);
}

function ensureParticipantInventory(room) {
  for (const participant of room.participants) {
    if (room.unlimitedInventory || !Array.isArray(participant.weapons)) participant.weapons = defaultWeapons(room.unlimitedInventory);
    if (room.unlimitedInventory || !Array.isArray(participant.items)) participant.items = defaultItems(room.unlimitedInventory);
    if (participant.cash == null) participant.cash = room.initialCash;
  }
}

function hasAutoDefenseOpportunity(participant) {
  const items = participant?.items;
  return Array.isArray(items) && (items[6] || 0) > 0 && items.some((qty, index) =>
    index !== 6 && index !== 7 && (Number(qty) || 0) > 0
  );
}

function autoDefenseClients(room) {
  return room.participants
    .filter((participant) => participant.kind === "human" && participant.client && hasAutoDefenseOpportunity(participant))
    .map((participant) => participant.client.id);
}

function nextWindSeed(seed) {
  return (Math.imul(1664525, seed >>> 0) + 1013904223) >>> 0;
}

function drawRoomWind(room) {
  const maxWind = Number(room.maxWind) || 0;
  if (maxWind <= 0) return 0;
  room.windSeed = nextWindSeed(room.windSeed ?? room.seed ?? 0);
  return Math.floor((room.windSeed / 0x100000000) * (maxWind * 2 + 1)) - maxWind;
}

function participantForClient(room, client) {
  return room.participants.find((participant) => participant.client === client);
}

function activeAuthorized(room, client, playerId = room.active) {
  const active = room.participants[playerId];
  if (!active) return false;
  if (active.disconnected) return client?.room === room;
  if (active.kind === "human") return active.client === client;
  return active.kind === "ai" && room.hostId === client.id;
}

function playerIdForClient(room, clientId) {
  return room.participants.findIndex((participant) => participant.client?.id === clientId);
}

function lobbyState(room, selfClientId = null) {
  return {
    type: "lobby",
    game: room.code,
    title: room.title,
    private: room.private,
    hostId: room.hostId,
    selfId: selfClientId,
    selfPlayerId: playerIdForClient(room, selfClientId),
    resolution: room.resolution,
    maxWind: room.maxWind,
    changingWinds: room.changingWinds,
    unlimitedInventory: room.unlimitedInventory,
    initialCash: room.initialCash,
    rounds: room.rounds,
    currentRound: room.currentRound,
    autoStartAt: room.autoStartAt,
    players: roomPlayers(room),
    started: room.started
  };
}

function validResolution(value) {
  return ["640x480", "800x600", "1024x768"].includes(value) ? value : "800x600";
}

function validMaxWind(value) {
  const wind = Number(value);
  return [0, 5, 10, 20].includes(wind) ? wind : 10;
}

function validInitialCash(value) {
  const cash = Number(value);
  if (!Number.isFinite(cash)) return 50000;
  return Math.max(0, Math.min(999999, Math.trunc(cash)));
}

function validTankType(value) {
  const tank = Number(value);
  if (!Number.isFinite(tank)) return 0;
  return Math.max(0, Math.min(5, Math.trunc(tank)));
}

function validRounds(value) {
  const rounds = Number(value);
  if (!Number.isFinite(rounds)) return 3;
  return Math.max(1, Math.min(99, Math.trunc(rounds)));
}

function validGameTitle(value) {
  return String(value || "").trim().slice(0, 32);
}

function cancelAutoStart(room) {
  if (room?.autoStartTimer) clearTimeout(room.autoStartTimer);
  if (!room) return;
  room.autoStartTimer = null;
  room.autoStartAt = null;
}

function addAutoStartOpponent(room) {
  if (room.participants.length >= 2 || room.participants.length >= 8) return;
  room.participants.push({ kind: "ai", aiType: 0, name: "Shooter 1", tankType: 0, cash: null, weapons: null, items: null, kills: 0, gain: 0, overallKills: 0, overallGain: 0 });
  log("game.auto_ai", `game=${room.code} name="Shooter 1"`);
}

function scheduleAutoStart(room) {
  cancelAutoStart(room);
  if (!room || room.private || room.started) return;
  room.autoStartAt = Date.now() + AUTO_START_MS;
  room.autoStartTimer = setTimeout(() => {
    if (!games.has(room.code) || room.started || room.private) return;
    addAutoStartOpponent(room);
    log("game.auto_start", `game=${room.code}`);
    startRoom(room.clients.find((client) => client.id === room.hostId) || room.clients[0], { automatic: true });
  }, AUTO_START_MS);
}

function startPayload(room, member, type = "start") {
  return {
    type,
    game: room.code,
    title: room.title,
    private: room.private,
    seed: room.seed,
    resolution: room.resolution,
    maxWind: room.maxWind,
    wind: room.wind,
    changingWinds: room.changingWinds,
    unlimitedInventory: room.unlimitedInventory,
    initialCash: room.initialCash,
    rounds: room.rounds,
    currentRound: room.currentRound,
    autoStartAt: room.autoStartAt,
    active: room.active,
    activeTurnId: room.activeTurnId,
    hostId: room.hostId,
    selfId: member.id,
    selfPlayerId: playerIdForClient(room, member.id),
    players: roomPlayers(room)
  };
}

function playerLeftPayload(room, member, leftName = "") {
  return {
    ...lobbyState(room, member.id),
    type: "player-left",
    leftName,
    active: room.active,
    activeTurnId: room.activeTurnId
  };
}

function applyPendingDisconnects(room, alive = null) {
  const removed = [];
  let remappedAlive = Array.isArray(alive) ? [...alive] : null;
  for (let index = room.participants.length - 1; index >= 0; index--) {
    const participant = room.participants[index];
    if (!participant?.disconnected) continue;
    removed.push({ index, name: participant.name });
    room.participants.splice(index, 1);
    if (remappedAlive) {
      remappedAlive = remappedAlive
        .filter((id) => id !== index)
        .map((id) => id > index ? id - 1 : id);
    }
    if (room.active > index) room.active -= 1;
  }
  if (room.active >= room.participants.length) room.active = 0;
  return { removed, alive: remappedAlive };
}

function broadcastTurn(room, checksum = null) {
  room.activeTurnId += 1;
  room.lastLateAimKey = "";
  if (room.changingWinds) room.wind = drawRoomWind(room);
  log("game.turn", `game=${room.code} active=${room.active} activeTurn=${room.activeTurnId} wind=${room.wind ?? "n/a"} checksum=${checksum ?? "n/a"}`);
  broadcast(room, { type: "turn", active: room.active, activeTurnId: room.activeTurnId, checksum, wind: room.wind, players: roomPlayers(room) });
}

function removeActiveDisconnected(room, leftName = "") {
  applyPendingDisconnects(room);
  if (!room.participants.length || !room.clients.length) return;
  room.turnReports = new Map();
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = null;
  const active = room.participants[room.active];
  log("game.disconnect_turn_skip", `game=${room.code} left="${leftName}" next=${room.active}`);
  broadcast(room, {
    type: "chat",
    playerId: null,
    name: "Server",
    text: `<Server> ${leftName || "A player"} left; skipping to ${active?.name || "next player"}.`,
    at: Date.now()
  });
  broadcastTurn(room, null);
}

function createRoom(client, payload) {
  if (client.room) {
    send(client.socket, { type: "error", message: "Already in a game." });
    return;
  }
  const name = payload.name;
  const room = {
    code: roomCode(),
    title: validGameTitle(payload.gameName),
    private: !!payload.private,
    clients: [],
    participants: [],
    hostId: client.id,
    started: false,
    seed: null,
    resolution: validResolution(payload.resolution),
    maxWind: validMaxWind(payload.maxWind),
    changingWinds: !!payload.changingWinds,
    unlimitedInventory: !!payload.unlimitedInventory,
    initialCash: validInitialCash(payload.initialCash),
    rounds: validRounds(payload.rounds),
    currentRound: 0,
    active: 0,
    activeTurnId: 0,
    turnId: 0,
    turnReports: new Map(),
    turnReportTimer: null,
    roundReady: new Set(),
    initialReady: new Set(),
    pendingShop: new Set(),
    initialPreparing: false,
    massKillPendingBy: null,
    lastLateAimKey: "",
    roundEnding: false,
    createdAt: Date.now(),
    autoStartAt: null,
    autoStartTimer: null,
    startedAt: null,
    autoDefensePreparing: false,
    autoDefenseReady: new Set(),
    windSeed: 0,
    wind: 0
  };
  client.name = name || "Player 1";
  client.room = room;
  room.clients.push(client);
  room.participants.push({ kind: "human", client, name: client.name, tankType: validTankType(payload.tankType), cash: null, weapons: null, items: null, kills: 0, gain: 0, overallKills: 0, overallGain: 0 });
  games.set(room.code, room);
  scheduleAutoStart(room);
  updateConcurrentGameRecord();
  log("game.create", `game=${room.code} title="${room.title}" private=${room.private} host=${client.name} resolution=${room.resolution} wind=${room.maxWind} changingWinds=${room.changingWinds} unlimitedInventory=${room.unlimitedInventory} cash=${room.initialCash} rounds=${room.rounds}`);
  send(client.socket, lobbyState(room, client.id));
  broadcastGameList();
  scheduleStatsWrite();
}

function joinRoom(client, payload) {
  if (client.room) {
    send(client.socket, { type: "error", message: "Already in a game." });
    return;
  }
  const code = payload.room;
  const name = payload.name;
  const room = games.get(String(code || "").trim().toUpperCase());
  if (!room || room.started || room.participants.length >= 8) {
    send(client.socket, { type: "error", message: "Game unavailable." });
    return;
  }
  client.name = name || `Player ${room.clients.length + 1}`;
  client.room = room;
  room.clients.push(client);
  room.participants.push({ kind: "human", client, name: client.name, tankType: validTankType(payload.tankType), cash: null, weapons: null, items: null, kills: 0, gain: 0, overallKills: 0, overallGain: 0 });
  updateConcurrentGameRecord();
  log("game.join", `game=${room.code} player=${client.name}`);
  for (const member of room.clients) send(member.socket, lobbyState(room, member.id));
  broadcastGameList();
  scheduleStatsWrite();
}

function addAi(client, aiType) {
  const room = client.room;
  if (!room || room.hostId !== client.id || room.started || room.participants.length >= 8) return;
  const names = ["Shooter", "Cyborg", "Killer"];
  const type = Math.max(0, Math.min(2, Number(aiType) || 0));
  const name = `${names[type]} ${room.participants.filter((entry) => entry.kind === "ai").length + 1}`;
  room.participants.push({ kind: "ai", aiType: type, name, tankType: type, cash: null, weapons: null, items: null, kills: 0, gain: 0, overallKills: 0, overallGain: 0 });
  log("game.add_ai", `game=${room.code} type=${names[type]} name="${name}"`);
  for (const member of room.clients) send(member.socket, lobbyState(room, member.id));
  broadcastGameList();
  scheduleStatsWrite();
}

function startRoom(client) {
  const room = client.room;
  if (!room || room.hostId !== client.id || room.participants.length < 2) return;
  cancelAutoStart(room);
  room.started = true;
  room.seed = crypto.randomBytes(4).readUInt32BE(0);
  room.windSeed = room.seed;
  room.wind = drawRoomWind(room);
  room.active = 0;
  room.activeTurnId = 1;
  room.turnId = 0;
  room.turnReports = new Map();
  room.roundReady = new Set();
  room.initialReady = new Set();
  room.pendingShop = new Set(room.clients.map((member) => member.id));
  ensureParticipantInventory(room);
  room.initialPreparing = room.initialCash > 0 && !room.unlimitedInventory;
  room.autoDefensePreparing = false;
  room.autoDefenseReady = new Set();
  room.massKillPendingBy = null;
  room.lastLateAimKey = "";
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = null;
  room.roundEnding = false;
  room.currentRound = 1;
  room.startedAt = Date.now();
  updateConcurrentGameRecord();
  log("game.start", `game=${room.code} round=${room.currentRound}/${room.rounds} seed=${room.seed} resolution=${room.resolution} wind=${room.maxWind} changingWinds=${room.changingWinds} unlimitedInventory=${room.unlimitedInventory} cash=${room.initialCash} participants=${room.participants.map((p) => p.name).join(",")}`);
  for (const member of room.clients) send(member.socket, startPayload(room, member));
  if (!room.initialPreparing) beginAutoDefenseIfNeeded(room);
  broadcastGameList();
  scheduleStatsWrite();
}

function startNextRound(room) {
  if (!room.started || room.currentRound >= room.rounds) return;
  room.currentRound += 1;
  room.seed = crypto.randomBytes(4).readUInt32BE(0);
  room.windSeed = room.seed;
  room.wind = drawRoomWind(room);
  room.active = 0;
  room.activeTurnId += 1;
  room.turnId = 0;
  room.turnReports = new Map();
  room.roundReady = new Set();
  room.initialReady = new Set();
  room.pendingShop = new Set(room.clients.map((member) => member.id));
  room.initialPreparing = false;
  room.autoDefensePreparing = false;
  room.autoDefenseReady = new Set();
  room.massKillPendingBy = null;
  room.lastLateAimKey = "";
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = null;
  room.roundEnding = false;
  ensureParticipantInventory(room);
  log("game.round_start", `game=${room.code} round=${room.currentRound}/${room.rounds} seed=${room.seed}`);
  for (const member of room.clients) send(member.socket, startPayload(room, member, "round-start"));
  beginAutoDefenseIfNeeded(room);
  broadcastGameList();
  scheduleStatsWrite();
}

function relayAim(client, payload) {
  const room = client.room;
  if (!room?.started || room.roundEnding || room.initialPreparing || room.autoDefensePreparing) return;
  const playerId = Number(payload.playerId ?? room.participants.indexOf(participantForClient(room, client)));
  const activeTurnId = Number(payload.activeTurnId ?? room.activeTurnId);
  if (activeTurnId !== room.activeTurnId) {
    const lateKey = `${client.id}:${playerId}:${activeTurnId}:${room.activeTurnId}`;
    if (room.lastLateAimKey !== lateKey) {
      room.lastLateAimKey = lateKey;
      log("game.aim_late", `game=${room.code} from=${client.name || client.id} player=${playerId} active=${room.active} activeTurn=${activeTurnId}/${room.activeTurnId}`);
    }
    return;
  }
  if (playerId !== room.active || !activeAuthorized(room, client, playerId)) {
    log("game.aim_ignored", `game=${room.code} from=${client.name || client.id} player=${playerId} active=${room.active} activeTurn=${activeTurnId}`);
    return;
  }
  broadcast(room, {
    type: "aim",
    playerId,
    activeTurnId: room.activeTurnId,
    angle: Number(payload.angle),
    power: Number(payload.power)
  });
}

function relayFire(client, payload) {
  const room = client.room;
  if (!room?.started || room.roundEnding || room.initialPreparing || room.autoDefensePreparing) return;
  const playerId = Number(payload.playerId ?? room.participants.indexOf(participantForClient(room, client)));
  const activeTurnId = Number(payload.activeTurnId ?? room.activeTurnId);
  if (activeTurnId !== room.activeTurnId) {
    log("game.fire_late", `game=${room.code} from=${client.name || client.id} player=${playerId} active=${room.active} activeTurn=${activeTurnId}/${room.activeTurnId}`);
    return;
  }
  if (playerId !== room.active || !activeAuthorized(room, client, playerId)) {
    log("game.fire_ignored", `game=${room.code} from=${client.name || client.id} player=${playerId} active=${room.active} activeTurn=${activeTurnId}`);
    return;
  }
  room.turnId += 1;
  room.turnReports = new Map();
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = setTimeout(() => {
    if (!room.started || room.roundEnding) return;
    const expected = room.clients.map((member) => member.id);
    const missing = expected.filter((id) => !room.turnReports.has(id));
    if (missing.length) endDesyncedGame(room, `turn=${room.turnId} missing_reports=${missing.join(",")}`);
  }, 20000);
  log("game.fire", `game=${room.code} turn=${room.turnId} player=${playerId} angle=${payload.angle} power=${payload.power} weapon=${payload.weapon || 0}`);
  broadcast(room, {
    type: "fire",
    turnId: room.turnId,
    activeTurnId: room.activeTurnId,
    playerId,
    angle: Number(payload.angle),
    power: Number(payload.power),
    weapon: Number(payload.weapon || 0)
  });
}

function beginTurnReport(room) {
  room.turnId += 1;
  room.turnReports = new Map();
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = setTimeout(() => {
    if (!room.started || room.roundEnding) return;
    const expected = room.clients.map((member) => member.id);
    const missing = expected.filter((id) => !room.turnReports.has(id));
    if (missing.length) endDesyncedGame(room, `turn=${room.turnId} missing_reports=${missing.join(",")}`);
  }, 20000);
  return room.turnId;
}

function relayMassKill(client, payload) {
  const room = client.room;
  if (!room?.started || room.roundEnding || room.initialPreparing || room.autoDefensePreparing) return;
  if (client.id !== room.hostId) {
    log("game.mass_kill_ignored", `game=${room.code} from=${client.name || client.id} reason=not_host`);
    return;
  }
  if (room.massKillPendingBy) return;
  if (!room.turnReportTimer && activeAuthorized(room, client, room.active)) {
    beginMassKill(room, client);
    return;
  }
  room.massKillPendingBy = client.id;
  log("game.mass_kill_scheduled", `game=${room.code} by=${client.name || client.id} after_active=${room.active}`);
  broadcast(room, {
    type: "chat",
    playerId: null,
    name: "Server",
    text: "<Server> Mass kill scheduled by game master.",
    at: Date.now()
  });
}

function beginMassKill(room, client) {
  room.massKillPendingBy = null;
  const playerId = room.active;
  const turnId = beginTurnReport(room);
  log("game.mass_kill", `game=${room.code} turn=${turnId} by=${client.name || client.id} active=${playerId}`);
  broadcast(room, {
    type: "mass-kill",
    turnId,
    activeTurnId: room.activeTurnId,
    playerId
  });
}

function endDesyncedGame(room, reason) {
  if (!room?.started) return;
  room.started = false;
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = null;
  log("game.desync", `game=${room.code} ${reason}`);
  broadcast(room, {
    type: "chat",
    playerId: null,
    name: "Server",
    text: "<Server> Game stopped: clients are out of sync.",
    at: Date.now()
  });
  broadcast(room, {
    type: "desync",
    message: "Game ended because clients are out of sync.",
    reason,
    players: roomPlayers(room)
  });
  broadcastGameList();
  scheduleStatsWrite();
}

function advanceTurn(client, payload) {
  const room = client.room;
  if (!room?.started || room.roundEnding) return;
  const playerId = Number(payload.playerId ?? room.participants.indexOf(participantForClient(room, client)));
  const turnId = Number(payload.turnId ?? 0);
  if (playerId !== room.active || turnId !== room.turnId) {
    log("game.turn_complete_ignored", `game=${room.code} from=${client.name || client.id} turn=${turnId}/${room.turnId} player=${playerId} active=${room.active}`);
    return;
  }
  const expected = new Set(room.clients.map((member) => member.id));
  if (!expected.has(client.id)) return;
  const checksum = String(payload.checksum || "");
  room.turnReports.set(client.id, { client, checksum, payload });
  const checksums = [...room.turnReports.values()].map((report) => report.checksum);
  const uniqueChecksums = new Set(checksums);
  if (uniqueChecksums.size > 1) {
    const detail = [...room.turnReports.values()].map((report) => `${report.client.name || report.client.id}:${report.checksum}`).join(",");
    endDesyncedGame(room, `turn=${room.turnId} reports=${detail}`);
    return;
  }
  for (const id of expected) {
    if (!room.turnReports.has(id)) {
      log("game.turn_wait", `game=${room.code} turn=${room.turnId} waiting=${[...expected].filter((entry) => !room.turnReports.has(entry)).join(",")}`);
      return;
    }
  }
  const activeReport = [...room.turnReports.values()].find((report) => activeAuthorized(room, report.client, playerId));
  if (!activeReport) {
    log("game.turn_complete_ignored", `game=${room.code} turn=${room.turnId} no_authorized_report active=${room.active}`);
    return;
  }
  payload = activeReport.payload;
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = null;
  const reportedStats = mergedTurnStats(room.turnReports);
  if (reportedStats.length) payload.stats = reportedStats;
  mergeTurnInventory(room, room.turnReports);
  if (Array.isArray(payload.stats)) {
    let statsChanged = false;
    for (const stat of payload.stats) {
      const participant = room.participants[stat.id];
      if (!participant) continue;
      if (recordStatsDelta(participant, stat)) statsChanged = true;
    }
    if (statsChanged) scheduleStatsWrite();
  }
  const removal = applyPendingDisconnects(room, Array.isArray(payload.alive) ? payload.alive : room.participants.map((_, id) => id));
  const alive = removal.alive ?? room.participants.map((_, id) => id);
  if (alive.length <= 1) {
    room.roundEnding = true;
    if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
    room.turnReportTimer = null;
    const winner = alive.length ? alive[0] : null;
    log("game.round_end", `game=${room.code} round=${room.currentRound}/${room.rounds} winner=${winner ?? "none"} checksum=${payload.checksum ?? "n/a"}`);
    if (room.currentRound >= room.rounds) recordCompletedGame(room, winner);
    scheduleStatsWrite();
    broadcast(room, {
      type: "round-over",
      winner,
      final: room.currentRound >= room.rounds,
      currentRound: room.currentRound,
      rounds: room.rounds,
      checksum: payload.checksum ?? null,
      players: roomPlayers(room)
    });
    if (room.currentRound >= room.rounds) {
      room.started = false;
      log("game.end", `game=${room.code} rounds=${room.rounds}`);
      cancelAutoStart(room);
      games.delete(room.code);
      for (const member of room.clients) member.room = null;
      room.clients = [];
      broadcastGameList();
      scheduleStatsWrite();
    }
    return;
  }
  if (room.massKillPendingBy) {
    const master = room.clients.find((member) => member.id === room.massKillPendingBy);
    beginMassKill(room, master || client);
    return;
  }
  let next = room.active;
  for (let i = 0; i < room.participants.length; i++) {
    next = (next + 1) % room.participants.length;
    if (alive.includes(next)) break;
  }
  room.active = next;
  broadcastTurn(room, payload.checksum ?? null);
}

function relayChat(client, payload) {
  const room = client.room;
  if (!room) {
    send(client.socket, { type: "error", message: "Join a game before chatting." });
    return;
  }
  const playerId = room.clients.indexOf(client);
  const text = String(payload.text || "").replace(/\s+/g, " ").trim().slice(0, 180);
  if (!text) return;
  broadcast(room, {
    type: "chat",
    playerId,
    name: client.name,
    text: `<${client.name}> ${text}`,
    at: Date.now()
  });
  log("game.chat", `game=${room.code} ${client.name}: ${text}`);
  if (text.includes("Galsla")) {
    broadcast(room, {
      type: "chat",
      playerId: null,
      name: "Server",
      text: "PRIVET GALKA!!!",
      at: Date.now()
    });
    broadcast(room, { type: "galsla" });
    log("game.galsla", `game=${room.code} by=${client.name || client.id}`);
  }
}

function relayLobbyChat(client, payload) {
  const name = String(payload.name || client.name || "Player").replace(/\s+/g, " ").trim().slice(0, 24) || "Player";
  const text = String(payload.text || "").replace(/\s+/g, " ").trim().slice(0, 180);
  if (!text) return;
  client.name = name;
  const line = `<${name}> ${text}`;
  for (const member of clients) send(member.socket, { type: "lobby-chat", name, text: line, at: Date.now() });
  log("lobby.chat", `${name}: ${text}`);
}

function leaveRoom(client) {
  if (!client.room) {
    send(client.socket, { type: "left" });
    return;
  }
  detach(client);
  send(client.socket, { type: "left" });
}

function relayRoundReady(client) {
  const room = client.room;
  if (!room?.started) return;
  if (room.pendingShop?.has(client.id)) room.pendingShop.delete(client.id);
  if (room.initialPreparing) {
    room.initialReady.add(client.id);
    const waiting = waitingClients(room, room.initialReady);
    log("game.initial_ready", `game=${room.code} client=${client.name || client.id} waiting=${waiting.map((member) => member.name || member.id).join(",") || "none"}`);
    if (!waiting.length) {
      room.initialPreparing = false;
      room.initialReady = new Set();
      beginAutoDefenseIfNeeded(room);
    } else {
      broadcastRoundWaiting(room, room.initialReady, waiting);
    }
    return;
  }
  if (!room.roundEnding || room.currentRound >= room.rounds) return;
  room.roundReady.add(client.id);
  const waiting = waitingClients(room, room.roundReady);
  log("game.round_ready", `game=${room.code} client=${client.name || client.id} waiting=${waiting.map((member) => member.name || member.id).join(",") || "none"}`);
  if (!waiting.length) startNextRound(room);
  else broadcastRoundWaiting(room, room.roundReady, waiting);
}

function beginAutoDefenseIfNeeded(room) {
  ensureParticipantInventory(room);
  const readyClients = autoDefenseClients(room);
  if (!readyClients.length) {
    room.autoDefensePreparing = false;
    room.autoDefenseReady = new Set();
    broadcast(room, { type: "round-ready-complete", active: room.active, activeTurnId: room.activeTurnId, wind: room.wind, players: roomPlayers(room) });
    return false;
  }
  room.autoDefensePreparing = true;
  room.autoDefenseReady = new Set();
  log("game.auto_defense_start", `game=${room.code} waiting=${readyClients.join(",")}`);
  const waiting = room.clients
    .filter((member) => readyClients.includes(member.id))
    .map((member) => ({ clientId: member.id, name: member.name || `Player ${member.id}` }));
  for (const member of room.clients) {
    send(member.socket, readyClients.includes(member.id)
      ? {
          type: "auto-defense-start",
          active: room.active,
          activeTurnId: room.activeTurnId,
          players: roomPlayers(room)
        }
      : {
          type: "round-waiting",
          readyClientIds: [],
          waiting
        });
  }
  return true;
}

function relayAutoDefenseReady(client, payload) {
  const room = client.room;
  if (!room?.started || !room.autoDefensePreparing) return;
  const playerId = playerIdForClient(room, client.id);
  if (playerId >= 0) {
    const participant = room.participants[playerId];
    if (Array.isArray(payload.weapons)) participant.weapons = payload.weapons.map((value) => Math.max(0, Number(value) || 0));
    if (Array.isArray(payload.items)) participant.items = payload.items.map((value) => Math.max(0, Number(value) || 0));
    if (payload.cash != null) participant.cash = Math.max(0, Number(payload.cash) || 0);
  }
  room.autoDefenseReady.add(client.id);
  const waitingIds = autoDefenseClients(room).filter((id) => !room.autoDefenseReady.has(id));
  log("game.auto_defense_ready", `game=${room.code} client=${client.name || client.id} waiting=${waitingIds.join(",") || "none"}`);
  if (waitingIds.length) {
    broadcastRoundWaiting(room, room.autoDefenseReady, room.clients.filter((member) => waitingIds.includes(member.id)));
    return;
  }
  room.autoDefensePreparing = false;
  room.autoDefenseReady = new Set();
  broadcast(room, { type: "round-ready-complete", active: room.active, activeTurnId: room.activeTurnId, wind: room.wind, players: roomPlayers(room) });
}

function waitingClients(room, readySet) {
  return room.clients.filter((member) => !readySet.has(member.id));
}

function broadcastRoundWaiting(room, readySet, waitingClientsList) {
  broadcast(room, {
    type: "round-waiting",
    readyClientIds: [...readySet],
    waiting: waitingClientsList
      .map((member) => ({ clientId: member.id, name: member.name || `Player ${member.id}` }))
  });
}

function relayShop(client, payload) {
  const room = client.room;
  if (!room?.started) return;
  const playerId = playerIdForClient(room, client.id);
  if (playerId < 0) return;
  const participant = room.participants[playerId];
  participant.weapons = Array.isArray(payload.weapons) ? payload.weapons.map((value) => Number(value) || 0) : participant.weapons;
  participant.items = Array.isArray(payload.items) ? payload.items.map((value) => Number(value) || 0) : participant.items;
  participant.cash = Number(payload.cash) || 0;
  if (room.pendingShop) room.pendingShop.delete(client.id);
  log("game.shop", `game=${room.code} player=${playerId} cash=${participant.cash}`);
  broadcast(room, {
    type: "shop-update",
    playerId,
    weapons: participant.weapons,
    items: participant.items,
    cash: participant.cash
  });
}

function relayUseItem(client, payload) {
  const room = client.room;
  if (!room?.started || room.roundEnding) return;
  const playerId = Number(payload.playerId ?? playerIdForClient(room, client.id));
  const activeTurnId = Number(payload.activeTurnId ?? room.activeTurnId);
  if (activeTurnId !== room.activeTurnId) {
    log("game.use_item_late", `game=${room.code} from=${client.name || client.id} player=${playerId} active=${room.active} activeTurn=${activeTurnId}/${room.activeTurnId}`);
    return;
  }
  const autoDefenseUse = room.autoDefensePreparing && playerId === playerIdForClient(room, client.id);
  if (!autoDefenseUse && (playerId !== room.active || !activeAuthorized(room, client, playerId))) return;
  const itemId = Number(payload.itemId);
  const participant = room.participants[playerId];
  if (!participant || !Number.isInteger(itemId) || itemId < 0) return;
  log("game.use_item", `game=${room.code} player=${playerId} item=${itemId}`);
  broadcast(room, {
    type: "use-item",
    playerId,
    activeTurnId: room.activeTurnId,
    itemId,
    arg: payload.arg ?? null
  });
}

function handleMessage(client, payload) {
  switch (payload.type) {
    case "create": createRoom(client, payload); break;
    case "join": joinRoom(client, payload); break;
    case "add-ai": addAi(client, payload.aiType); break;
    case "start": startRoom(client); break;
    case "aim": relayAim(client, payload); break;
    case "fire": relayFire(client, payload); break;
    case "mass-kill": relayMassKill(client, payload); break;
    case "turn-complete": advanceTurn(client, payload); break;
    case "chat": relayChat(client, payload); break;
    case "lobby-chat": relayLobbyChat(client, payload); break;
    case "leave": leaveRoom(client); break;
    case "round-ready": relayRoundReady(client); break;
    case "auto-defense-ready": relayAutoDefenseReady(client, payload); break;
    case "shop-update": relayShop(client, payload); break;
    case "use-item": relayUseItem(client, payload); break;
    case "list-games": send(client.socket, { type: "game-list", games: gameList() }); break;
    default: send(client.socket, { type: "error", message: "Unknown message." });
  }
}

function consumeFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);
  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    let offset = 2;
    let length = second & 0x7f;
    if (length === 126) {
      if (client.buffer.length < 4) return;
      length = client.buffer.readUInt16BE(2);
      offset = 4;
    }
    const masked = (second & 0x80) !== 0;
    if (!masked || client.buffer.length < offset + 4 + length) return;
    const mask = client.buffer.subarray(offset, offset + 4);
    offset += 4;
    const payload = client.buffer.subarray(offset, offset + length);
    const decoded = Buffer.alloc(length);
    for (let i = 0; i < length; i++) decoded[i] = payload[i] ^ mask[i % 4];
    client.buffer = client.buffer.subarray(offset + length);
    if (opcode === 0x8) {
      client.socket.end();
      return;
    }
    if (opcode !== 0x1) continue;
    try {
      handleMessage(client, JSON.parse(decoded.toString("utf8")));
    } catch {
      send(client.socket, { type: "error", message: "Invalid message." });
    }
  }
}

function detach(client) {
  const room = client.room;
  if (!room) return;
  const wasStarted = room.started;
  const index = room.clients.indexOf(client);
  if (index >= 0) room.clients.splice(index, 1);
  const participant = participantForClient(room, client);
  const participantIndex = participant ? room.participants.indexOf(participant) : -1;
  if (participant && wasStarted) {
    participant.disconnected = true;
    participant.client = null;
  } else if (participantIndex >= 0) {
    room.participants.splice(participantIndex, 1);
  }
  if (!room.clients.length) {
    cancelAutoStart(room);
    games.delete(room.code);
    client.room = null;
    log("game.remove", `game=${room.code}`);
    broadcastGameList();
    scheduleStatsWrite();
    return;
  }
  if (room.hostId === client.id) room.hostId = room.clients[0].id;
  log("game.leave", `game=${room.code} client=${client.name}`);
  if (wasStarted && participantIndex === room.active && !room.turnReportTimer) {
    removeActiveDisconnected(room, client.name);
  } else {
    if (!wasStarted && participantIndex >= 0 && participantIndex < room.active) room.active -= 1;
    if (room.active >= room.participants.length) room.active = 0;
    for (const member of room.clients) {
      send(member.socket, wasStarted
        ? playerLeftPayload(room, member, client.name)
        : lobbyState(room, member.id));
    }
  }
  client.room = null;
  broadcastGameList();
  scheduleStatsWrite();
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || "/", "http://localhost");
    const requested = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const file = path.resolve(root, `.${decodeURIComponent(requested)}`);
    if (!file.startsWith(root)) throw new Error("forbidden");
    const data = await fs.readFile(file);
    response.writeHead(200, { "content-type": mime.get(path.extname(file)) || "application/octet-stream" });
    response.end(data);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.on("upgrade", (request, socket) => {
  if (request.url !== "/ws") {
    socket.destroy();
    return;
  }
  const key = request.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  const client = { id: nextClientId++, socket, room: null, name: "", buffer: Buffer.alloc(0) };
  clients.add(client);
  scheduleStatsWrite();
  socket.on("data", (chunk) => consumeFrames(client, chunk));
  socket.on("close", () => { clients.delete(client); detach(client); scheduleStatsWrite(); });
  socket.on("error", () => { clients.delete(client); detach(client); scheduleStatsWrite(); });
  send(socket, { type: "hello", clientId: client.id });
  send(socket, { type: "game-list", games: gameList() });
});

server.listen(port, () => {
  log("server.listen", `http://localhost:${port}`);
  log("stats.path", statsHtmlPath);
  writeStatsHtml().catch((error) => log("stats.write_failed", error.message));
});
