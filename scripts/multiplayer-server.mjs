import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web");
const port = Number(process.env.PORT || 4174);
const games = new Map();
const clients = new Set();
let nextClientId = 1;

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
  return [...games.values()].map((game) => ({
    code: game.code,
    players: game.participants.length,
    started: game.started,
    resolution: game.resolution,
    maxWind: game.maxWind,
    initialCash: game.initialCash,
    rounds: game.rounds,
    currentRound: game.currentRound,
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
    kills: participant.kills ?? 0,
    gain: participant.gain ?? 0,
    overallKills: participant.overallKills ?? 0,
    overallGain: participant.overallGain ?? 0
  }));
}

function participantForClient(room, client) {
  return room.participants.find((participant) => participant.client === client);
}

function activeAuthorized(room, client, playerId = room.active) {
  const active = room.participants[playerId];
  if (!active) return false;
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
    hostId: room.hostId,
    selfId: selfClientId,
    selfPlayerId: playerIdForClient(room, selfClientId),
    resolution: room.resolution,
    maxWind: room.maxWind,
    initialCash: room.initialCash,
    rounds: room.rounds,
    currentRound: room.currentRound,
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

function startPayload(room, member, type = "start") {
  return {
    type,
    game: room.code,
    seed: room.seed,
    resolution: room.resolution,
    maxWind: room.maxWind,
    initialCash: room.initialCash,
    rounds: room.rounds,
    currentRound: room.currentRound,
    active: room.active,
    activeTurnId: room.activeTurnId,
    hostId: room.hostId,
    selfId: member.id,
    selfPlayerId: playerIdForClient(room, member.id),
    players: roomPlayers(room)
  };
}

function createRoom(client, payload) {
  if (client.room) {
    send(client.socket, { type: "error", message: "Already in a game." });
    return;
  }
  const name = payload.name;
  const room = {
    code: roomCode(),
    clients: [],
    participants: [],
    hostId: client.id,
    started: false,
    seed: null,
    resolution: validResolution(payload.resolution),
    maxWind: validMaxWind(payload.maxWind),
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
    initialPreparing: false,
    massKillPendingBy: null,
    lastLateAimKey: "",
    roundEnding: false
  };
  client.name = name || "Player 1";
  client.room = room;
  room.clients.push(client);
  room.participants.push({ kind: "human", client, name: client.name, tankType: validTankType(payload.tankType), kills: 0, gain: 0, overallKills: 0, overallGain: 0 });
  games.set(room.code, room);
  log("game.create", `game=${room.code} host=${client.name} resolution=${room.resolution} wind=${room.maxWind} cash=${room.initialCash} rounds=${room.rounds}`);
  send(client.socket, lobbyState(room, client.id));
  broadcastGameList();
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
  room.participants.push({ kind: "human", client, name: client.name, tankType: validTankType(payload.tankType), kills: 0, gain: 0, overallKills: 0, overallGain: 0 });
  log("game.join", `game=${room.code} player=${client.name}`);
  for (const member of room.clients) send(member.socket, lobbyState(room, member.id));
  broadcastGameList();
}

function addAi(client, aiType) {
  const room = client.room;
  if (!room || room.hostId !== client.id || room.started || room.participants.length >= 8) return;
  const names = ["Shooter", "Cyborg", "Killer"];
  const type = Math.max(0, Math.min(2, Number(aiType) || 0));
  const name = `${names[type]} ${room.participants.filter((entry) => entry.kind === "ai").length + 1}`;
  room.participants.push({ kind: "ai", aiType: type, name, tankType: type, kills: 0, gain: 0, overallKills: 0, overallGain: 0 });
  log("game.add_ai", `game=${room.code} type=${names[type]} name="${name}"`);
  for (const member of room.clients) send(member.socket, lobbyState(room, member.id));
  broadcastGameList();
}

function startRoom(client) {
  const room = client.room;
  if (!room || room.hostId !== client.id || room.participants.length < 2) return;
  room.started = true;
  room.seed = crypto.randomBytes(4).readUInt32BE(0);
  room.active = 0;
  room.activeTurnId = 1;
  room.turnId = 0;
  room.turnReports = new Map();
  room.roundReady = new Set();
  room.initialReady = new Set();
  room.initialPreparing = room.initialCash > 0;
  room.massKillPendingBy = null;
  room.lastLateAimKey = "";
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = null;
  room.roundEnding = false;
  room.currentRound = 1;
  log("game.start", `game=${room.code} round=${room.currentRound}/${room.rounds} seed=${room.seed} resolution=${room.resolution} wind=${room.maxWind} cash=${room.initialCash} participants=${room.participants.map((p) => p.name).join(",")}`);
  for (const member of room.clients) send(member.socket, startPayload(room, member));
  broadcastGameList();
}

function startNextRound(room) {
  if (!room.started || room.currentRound >= room.rounds) return;
  room.currentRound += 1;
  room.seed = crypto.randomBytes(4).readUInt32BE(0);
  room.active = 0;
  room.activeTurnId += 1;
  room.turnId = 0;
  room.turnReports = new Map();
  room.roundReady = new Set();
  room.initialReady = new Set();
  room.initialPreparing = false;
  room.massKillPendingBy = null;
  room.lastLateAimKey = "";
  if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
  room.turnReportTimer = null;
  room.roundEnding = false;
  log("game.round_start", `game=${room.code} round=${room.currentRound}/${room.rounds} seed=${room.seed}`);
  for (const member of room.clients) send(member.socket, startPayload(room, member, "round-start"));
  broadcastGameList();
}

function relayAim(client, payload) {
  const room = client.room;
  if (!room?.started || room.roundEnding || room.initialPreparing) return;
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
  if (!room?.started || room.roundEnding || room.initialPreparing) return;
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
  if (!room?.started || room.roundEnding || room.initialPreparing) return;
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
  if (Array.isArray(payload.stats)) {
    for (const stat of payload.stats) {
      const participant = room.participants[stat.id];
      if (!participant) continue;
      participant.kills = Number(stat.kills) || 0;
      participant.gain = Number(stat.gain) || 0;
      participant.overallKills = Number(stat.overallKills) || 0;
      participant.overallGain = Number(stat.overallGain) || 0;
    }
  }
  const alive = Array.isArray(payload.alive) ? payload.alive : room.participants.map((_, id) => id);
  if (alive.length <= 1) {
    room.roundEnding = true;
    if (room.turnReportTimer) clearTimeout(room.turnReportTimer);
    room.turnReportTimer = null;
    const winner = alive.length ? alive[0] : null;
    log("game.round_end", `game=${room.code} round=${room.currentRound}/${room.rounds} winner=${winner ?? "none"} checksum=${payload.checksum ?? "n/a"}`);
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
      games.delete(room.code);
      for (const member of room.clients) member.room = null;
      room.clients = [];
      broadcastGameList();
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
  room.activeTurnId += 1;
  room.lastLateAimKey = "";
  log("game.turn", `game=${room.code} active=${room.active} activeTurn=${room.activeTurnId} checksum=${payload.checksum ?? "n/a"}`);
  broadcast(room, { type: "turn", active: room.active, activeTurnId: room.activeTurnId, checksum: payload.checksum ?? null, players: roomPlayers(room) });
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

function relayRoundReady(client) {
  const room = client.room;
  if (!room?.started) return;
  if (room.initialPreparing) {
    room.initialReady.add(client.id);
    const waiting = waitingClients(room, room.initialReady);
    log("game.initial_ready", `game=${room.code} client=${client.name || client.id} waiting=${waiting.map((member) => member.name || member.id).join(",") || "none"}`);
    if (!waiting.length) {
      room.initialPreparing = false;
      room.initialReady = new Set();
      broadcast(room, { type: "round-ready-complete", active: room.active, activeTurnId: room.activeTurnId, players: roomPlayers(room) });
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
  if (playerId !== room.active || !activeAuthorized(room, client, playerId)) return;
  const itemId = Number(payload.itemId);
  const participant = room.participants[playerId];
  if (!participant || !Number.isInteger(itemId) || itemId < 0) return;
  log("game.use_item", `game=${room.code} player=${playerId} item=${itemId}`);
  broadcast(room, {
    type: "use-item",
    playerId,
    activeTurnId: room.activeTurnId,
    itemId
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
    case "round-ready": relayRoundReady(client); break;
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
  const index = room.clients.indexOf(client);
  if (index >= 0) room.clients.splice(index, 1);
  const participant = participantForClient(room, client);
  if (participant) room.participants.splice(room.participants.indexOf(participant), 1);
  if (!room.clients.length) {
    games.delete(room.code);
    client.room = null;
    log("game.remove", `game=${room.code}`);
    broadcastGameList();
    return;
  }
  if (room.hostId === client.id) room.hostId = room.clients[0].id;
  if (room.active >= room.participants.length) room.active = 0;
  log("game.leave", `game=${room.code} client=${client.name}`);
  for (const member of room.clients) send(member.socket, lobbyState(room, member.id));
  client.room = null;
  broadcastGameList();
}

const server = http.createServer(async (request, response) => {
  try {
    const requested = request.url === "/" ? "/index.html" : request.url;
    const file = path.resolve(root, `.${requested.split("?")[0]}`);
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
  socket.on("data", (chunk) => consumeFrames(client, chunk));
  socket.on("close", () => { clients.delete(client); detach(client); });
  socket.on("error", () => { clients.delete(client); detach(client); });
  send(socket, { type: "hello", clientId: client.id });
  send(socket, { type: "game-list", games: gameList() });
});

server.listen(port, () => {
  log("server.listen", `http://localhost:${port}`);
});
