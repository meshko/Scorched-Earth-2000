# JavaScript Port Architecture

This document is a starting map for future LLMs working on the JavaScript port in
`scripts/` and `web/`. It describes the shape of the current implementation, not
an ideal end state.

## Repository Scope

- `web/index.html` defines the applet-like DOM shell, modal windows, multiplayer
  lobby, shop, inventory, round setup, stats, about, and license UI.
- `web/styles.css` recreates the Java applet/window look and sizes the field from
  CSS variables set by the game.
- `web/scorch.js` contains almost all browser-side logic: rendering, terrain,
  weapons, AI, inventory/shop, single-player flow, multiplayer client protocol,
  and DOM event wiring.
- `scripts/multiplayer-server.mjs` is a dependency-free Node server. It serves
  files from `web/`, accepts WebSocket upgrades at `/ws`, coordinates multiplayer
  rooms, validates deterministic turn reports, relays chat and state, and writes a
  generated `stats.html`.
- `web/COPYING` is displayed in the license modal.
- `web/bugs.txt` is a small note file, not part of the runtime.

There is no bundler, package manifest, or module graph. The browser app is loaded
directly by `index.html` with `<script src="./scorch.js"></script>`.

## Running

For local multiplayer or served single-player:

```sh
node scripts/multiplayer-server.mjs
```

The server listens on `PORT` or `4174` by default and serves
`http://localhost:4174/`. It writes stats to `web/stats.html` unless
`SCORCH_STATS_HTML` or `STATS_HTML` is set.

For browser-only single-player, opening `web/index.html` directly mostly works,
but the startup code still attempts to connect to `/ws` and falls back to a
single-player path if the socket fails.

## Browser Architecture

`web/scorch.js` is organized as one large script with these major layers:

- Constants and data tables: `WEAPONS`, `ITEMS`, `tankData`, player colors, AI
  tuning, physics constants, and initial cash.
- Utility classes:
  - `Random` is a seedable LCG used for deterministic terrain and effects.
  - `Bitmap` owns the pixel buffer, terrain/background operations, and primitive
    drawing helpers used by the game simulation.
  - `Player` stores tank identity, position, aim, health/power limit, cash,
    weapons, items, shield, tracer, and AI flags.
- `ScorchGame` owns the live game simulation and canvas rendering. Important
  responsibilities include:
  - sizing the canvas and CSS field dimensions with `resize()`;
  - creating rounds with `newRound()`, `randomBackground()`,
    `generateTerrain()`, `placeTanks()`, and `drop()`;
  - rendering terrain, tanks, shields, wind, chat, tracer trails, and tooltips;
  - firing and animating weapons through `fire()`, `fireMirv()`,
    `rollAndExplode()`, `napalm()`, `sandExplosion()`, `diggerExplosion()`,
    `funkyExplosion()`, `explode()`, and `explodeMany()`;
  - applying damage, cash, kills, inventory effects, tank settling, and round
    transitions;
  - running AI targeting with `scheduleAiTurn()`, `takeAiTurn()`,
    `findAiShot()`, `searchAiCandidates()`, and `simulateAiMissile()`;
  - producing `checksum()` values for multiplayer desync detection.
- Utility functions convert colors, write pixels/lines, play simple audio, escape
  HTML, and update shared UI.
- `MultiplayerSession` wraps the browser WebSocket client. It owns connection
  state, lobby state, identity, settings, roster, game list, chat log, active turn
  id, and message handling.
- Bottom-of-file DOM wiring connects buttons, forms, tank pickers, keyboard
  shortcuts, canvas hover, shop/inventory actions, modals, and startup behavior.

The current code is intentionally close to the original applet model: global
state plus a central game object. Avoid splitting files casually unless the
refactor includes a clear loading strategy, because there is no build step today.

## Game State Model

`ScorchGame` is the source of truth for local simulation state:

- `bitmap.pixels` holds the terrain/background pixels.
- `players` is the ordered turn roster. Player ids are array indexes.
- `active` is the active player index.
- `wind`, `maxWind`, `weapon`, `animating`, and `roundOver` control turn flow.
- `statsSnapshot` preserves displayed stat values across render/update timing.
- `rand` must be seeded consistently for multiplayer rounds.

`Player.powerLimit` functions as health. Damage lowers it; a tank dies when it
falls below `MIN_POWER`. Player cash and stats are updated during damage and kill
recording, then synchronized in multiplayer turn reports.

Terrain edits happen through `Bitmap` methods. After destructive or constructive
terrain changes, code normally calls `drop()` to settle terrain and
`settleTanks()` to move unsupported tanks and apply fall damage.

## Multiplayer Model

Multiplayer is deterministic client simulation with server coordination:

1. The host creates a room with settings: resolution, wind, initial cash, rounds,
   privacy, title, and tank type.
2. The server assigns a room code and tracks `clients` plus `participants`.
3. On start, the server chooses a seed, sends each client a `start` payload, and
   the browser builds the same `ScorchGame` state from that seed and roster.
4. Aim updates are relayed with `aim`.
5. The active player sends `fire`; the server relays it to all clients.
6. Every client simulates the shot locally, computes `game.checksum()`, and sends
   `turn-complete` with alive players, stats, and inventory.
7. The server waits for all client reports, compares checksums, merges stats and
   inventory, and either advances with `turn`, ends the round with `round-over`,
   or stops the game with `desync`.

The server does not simulate physics or weapons. It is authoritative for room
membership, turn ordering, active turn ids, round count, shop/ready gates, stats
aggregation, and desync handling.

AI in multiplayer is host-driven. Non-host clients receive the same `aim` and
`fire` messages, then simulate locally like any other turn.

## WebSocket Protocol

Client-to-server message types handled in `handleMessage()`:

- `create`
- `join`
- `add-ai`
- `start`
- `aim`
- `fire`
- `mass-kill`
- `turn-complete`
- `chat`
- `round-ready`
- `shop-update`
- `use-item`
- `list-games`

Server-to-client message types handled in `MultiplayerSession.handle()`:

- `hello`
- `error`
- `game-list`
- `lobby`
- `start`
- `round-start`
- `round-waiting`
- `round-ready-complete`
- `chat`
- `galsla`
- `shop-update`
- `use-item`
- `aim`
- `fire`
- `mass-kill`
- `turn`
- `round-over`
- `desync`

When adding protocol fields, update both `scripts/multiplayer-server.mjs` and
`MultiplayerSession.handle()`/send helpers in `web/scorch.js`. Prefer additive
fields with defaults because clients may briefly be out of step during manual
testing.

## Server Architecture

`scripts/multiplayer-server.mjs` keeps all state in memory:

- `games` maps room codes to room objects.
- `clients` tracks connected sockets.
- `statsByName` accumulates global human player stats for generated HTML stats.
- `serverMetrics` records simple lifetime metrics.

Room objects contain room settings, host id, current seed, participant roster,
turn ids, active player, ready sets, pending shop clients, desync timer state, and
round/game lifecycle flags.

The server includes a tiny WebSocket implementation rather than using a package.
`send()` writes unmasked JSON text frames to clients. `consumeFrames()` decodes
masked client text frames and dispatches JSON payloads. Keep this in mind before
using browser WebSocket features that require binary frames, compression, pings,
or large payloads.

Static file serving is deliberately small: paths resolve under `web/`, `/` maps
to `/index.html`, and MIME types are listed in `mime`.

## Determinism and Desync Risk

Multiplayer depends on all clients producing the same post-turn state. Be careful
with:

- calls to `Math.random()` inside deterministic gameplay paths;
- reading wall-clock time for simulation decisions;
- iteration order changes over unordered data;
- DOM, canvas, audio, or browser-specific APIs feeding back into game state;
- floating point changes in projectile, napalm, AI, or damage math;
- async timing differences that can alter game state before checksum capture.

`ScorchGame.checksum()` samples bitmap pixels plus player alive/position/health
state. It does not cover every field. If a new feature affects future simulation,
consider whether the checksum should include it or whether the server should
merge/relay it explicitly.

One known exception is `startGalslaMode()`, which uses `Math.random()` for a
visual gag after a chat trigger. Treat it as cosmetic unless future work makes it
part of authoritative gameplay.

## UI and DOM Notes

Most UI is static HTML in `index.html`; `scorch.js` mutates content and classes.
Hidden modals use the `hidden` class. Controls are disabled through
`setControlsDisabled()`, which also accounts for remote turns and AI turns.

The field size is coordinated in two places:

- canvas width/height attributes in `ScorchGame.resize()`;
- CSS variables `--field-width` and `--field-height`, also set by `resize()`.

The old applet aesthetic is intentional. `styles.css` relies heavily on beveled
border colors, fixed pixel sizing, and `image-rendering: pixelated`.

## Common Change Points

- Add or tune weapons: edit `WEAPONS`, add handling in `ScorchGame.fire()` and
  terrain/damage helpers as needed, then check shop/inventory display.
- Add items: edit `ITEMS`, `inventoryAction()`, `applyItemUse()`, shop rows, and
  multiplayer `use-item` behavior if it affects active turns.
- Change round setup: update `index.html` controls, DOM event wiring near
  `startRound`, and multiplayer create payload validation on the server.
- Change multiplayer room settings: update create UI, `MultiplayerSession.create()`,
  server validation, `lobbyState()`, `startPayload()`, and client `applySettings()`.
- Change stats: update browser stat capture/reporting, server `recordStatsDelta()`
  or `recordGameFinished()`, and `renderStatsHtml()`.
- Change turn rules: update both local `ScorchGame.nextTurn()` behavior and server
  `advanceTurn()` behavior.

## Testing Checklist

There is no automated test harness in this repository today. For risky changes,
manually verify:

- served startup: `node scripts/multiplayer-server.mjs`, then open
  `http://localhost:4174/`;
- single-player round setup, firing, AI turns, shop, inventory, and mass kill;
- multiplayer room create/join in two browser tabs;
- host-driven AI in multiplayer;
- round end, between-round shopping, next-round readiness, and final game end;
- stats generation at `/stats.html`;
- desync-sensitive changes by confirming both clients advance turns instead of
  receiving `desync`.

