# Multiplayer Implementation Plan

This document is the single authoritative reference for multiplayer design and implementation.
It supersedes scattered notes in `multiplayer-architecture.md` where the two conflict.

---

## Approved Decisions

- Server is authoritative. Clients send input only.
- Socket.IO for realtime transport.
- Firebase for persistence only (later).
- Up to 4 players per lobby.
- `Game.ts` owns scene switching and high-level socket lifecycle only. It constructs the `SocketClient` but does not contain lobby or match logic.
- Each scene subscribes and unsubscribes its own socket events.
- `SocketClient` is a thin typed wrapper — no lobby or match logic inside it.
- No ECS. No physics engine. No client-side prediction in v1. Interpolation happens only after authoritative snapshots exist.
- Shared simulation layer must exist before the server is written.

---

## Current Status

Phases A through F and Phase I.4 are complete:

- Shared constants, types, and pure simulation functions exist under `src/shared/`.
- `Player` and `Enemy` are Pixi view wrappers over `PlayerState` and `EnemyState`.
- `SocketClient` exists as a typed Socket.IO transport wrapper.
- `HomeScene` offers Single Player and Multiplayer.
- `MultiplayerMenuScene` stores display name, shows Create Lobby / Join Lobby / Back, connects through `Game.ts`, and transitions to `LobbyScene` on `lobby:state`.
- `server/` owns lobby state, match state, player input, movement, enemies, damage, eliminations, winner detection, survival scoring, `match:snapshot`, and `match:finished`.
- `LobbyScene` renders from server `lobby:state`, supports host start, leave, countdown, errors, and transitions to `MultiplayerPlayingScene`.
- `MultiplayerPlayingScene` sends input, renders players/enemies from `match:snapshot`, stops input after elimination/finish, and shows a minimal match-finished placeholder.
- Same-tick eliminations use one deterministic ranking policy: survival time first, then lobby/player insertion order.
- Polished MatchResultsScene/results UI, interpolation, Firebase, leaderboard, and persistence do not exist yet.

## Current Multiplayer State

- Lobby flow is fully functional using the local Socket.IO server.
- Client is fully server-state-driven via `lobby:state`.
- Scene transitions work: MultiplayerMenu → Lobby → MultiplayerPlaying.
- Server owns match state, movement, enemies, damage, eliminations, winner detection, survival scoring, and `match:finished`.
- MultiplayerPlayingScene renders players/enemies from `match:snapshot` and shows only a minimal match-finished placeholder.
- Same-tick eliminations use one deterministic ranking policy: survival time first, then lobby/player insertion order.
- Solo lobby start remains dev-only behavior for local testing.
- No polished MatchResultsScene, interpolation, Firebase, leaderboard, or persistence exists yet.
- Match state is currently stored inside internal lobby state and may later be separated from public lobby payloads.

## Current Next Step

Implement MatchResultsScene and transition from MultiplayerPlayingScene.

## Current Risk

The server now emits `match:finished`, but the client only shows a placeholder.
MatchResultsScene, rematch/back-to-lobby UX, Firebase persistence, leaderboard, and production deployment are still pending.

---

## Part 1: Scene and Flow Design

### 1.1 Player Flow

```
HomeScene
  ├─ [Single Player] ──────────────────────────────────── (unchanged)
  │    PlayingScene → GameOverScene → HomeScene
  │
  └─ [Multiplayer]
       MultiplayerMenuScene
         ├─ Create Lobby ──→ LobbyScene
         ├─ Join Lobby ────→ LobbyScene
         └─ Back ──────────→ HomeScene

LobbyScene
  ├─ [Host: Start Match] ──→ MultiplayerPlayingScene
  ├─ [Leave] ──────────────→ MultiplayerMenuScene
  └─ (server: match:started) → MultiplayerPlayingScene

MultiplayerPlayingScene
  └─ (server: match:finished) → MatchResultsScene

MatchResultsScene
  ├─ [Back to Lobby] ──→ LobbyScene   (server resets lobby to waiting)
  └─ [Home] ───────────→ HomeScene    (client sends lobby:leave first)
```

### 1.2 New Files Required

| File | Purpose |
|---|---|
| `src/api/SocketClient.ts` | Typed Socket.IO client wrapper — complete |
| `src/game/scenes/MultiplayerMenuScene.ts` | Display name input, Create / Join UI — complete |
| `src/game/scenes/LobbyScene.ts` | Player list, host controls, leave button — complete |
| `src/game/scenes/MultiplayerPlayingScene.ts` | Sends input, renders players/enemies from `match:snapshot`, and shows minimal match-finished placeholder |
| `src/game/scenes/MatchResultsScene.ts` | Ranked results, back to lobby / home — pending |
| `src/shared/` | Constants, types, simulation (see Part 2) — complete |
| `server/` | Authoritative movement, enemies, damage, eliminations, winner detection, and `match:finished` complete; results UI/persistence pending |

**Modified existing files:**
- `src/game/scenes/HomeScene.ts` — Single Player / Multiplayer mode buttons complete
- `src/game/core/Game.ts` — constructs `SocketClient`, connects on Multiplayer entry, wires Home / Playing / Multiplayer scenes, and disconnects on destroy.

### 1.3 Scene Construction Pattern

All scenes follow the existing pattern established by `PlayingScene`:

```
constructor(renderer, audioManager, ...callbacks)
```

`Game.ts` constructs scenes and wires their callbacks. Each scene subscribes to socket events in `initialize()` and unsubscribes in `destroy()`. No socket logic belongs in `Game.ts` beyond constructing the shared `SocketClient` and connecting/disconnecting at multiplayer entry/exit.

```
// Game.ts (sketch — not implementation)
private readonly showLobbyScene = (state: LobbyState): void => {
  this.sceneManager.setScene(
    new LobbyScene(this.renderer, this.audioManager, this.socketClient, state, {
      onMatchStarted: this.showMultiplayerPlayingScene,
      onLeave: this.showMultiplayerMenuScene,
    })
  );
};
```

`SocketClient` is passed into scenes that need it. Scenes call `socketClient.on(...)` in `initialize()` and `socketClient.off(...)` in `destroy()`.

---

## Part 2: Shared Simulation Layer

### 2.1 Why It Must Come First

The existing `Player` and `Enemy` entities own a Pixi `Graphics` renderable. The server cannot import Pixi.

The simulation math in `MovementSystem`, `CollisionSystem`, `EnemySystem`, and `PlayingScene` is already pure — no Pixi calls inside the math itself. The Pixi coupling exists only in `syncRenderable` steps that follow position mutations.

The shared layer separates the math (importable by server) from the sync step (client-only).

### 2.2 Architecture Principle

> State lives in plain objects. Pixi lives in thin view wrappers.

Each simulation entity becomes two things:

- A **state object** — plain TypeScript, lives in `src/shared/`. Owned by simulation. No Pixi.
- A **view** — Pixi entity that reads state and updates its `renderable`. Never touched by simulation code.

### 2.3 File Structure

```
src/shared/
  constants/
    world.ts          ← move from src/game/utils/world.ts
    player.ts         ← extract from src/game/entities/Player.ts
    enemy.ts          ← extract from src/game/entities/Enemy.ts
    simulation.ts     ← extract from EnemySystem.ts + PlayingScene.ts constants
  types/
    index.ts          ← all shared interfaces, re-exported from one entry point
  simulation/
    movement.ts       ← applyPlayerInput, clampToBounds
    collision.ts      ← circleRectOverlap, circlesOverlap
    enemyBehavior.ts  ← stepEnemyTowardTarget, selectSpawnPosition
    damage.ts         ← applyEnemyCollisionDamage, computeWinner
```

```
src/game/
  entities/
    Player.ts         ← becomes a Pixi view wrapper over PlayerState
    Enemy.ts          ← becomes a Pixi view wrapper over EnemyState
    Obstacle.ts       ← unchanged (visual only; simulation already uses rect only)
  systems/
    MovementSystem.ts ← thin adapter; delegates to shared/simulation/movement.ts
    CollisionSystem.ts← thin adapter; delegates to shared/simulation/collision.ts
    EnemySystem.ts    ← thin adapter; delegates to shared/simulation/enemyBehavior.ts
```

```
server/
  simulation/         ← imports from src/shared/ only; no pixi.js import anywhere
```

### 2.4 Shared Constants

#### src/shared/constants/world.ts

*(currently `src/game/utils/world.ts` — move, then re-export from game layer)*

```
WORLD_WIDTH = 3000
WORLD_HEIGHT = 3000
BOUNDARY_WALL_THICKNESS = 28
GATE_SPAWN_INSET = BOUNDARY_WALL_THICKNESS + 62   // = 90
WORLD_GATES: readonly GateState[]                  // 4 cardinal gates
```

#### src/shared/constants/player.ts

*(extracted from `entities/Player.ts`)*

```
PLAYER_RADIUS = 18
PLAYER_SPEED = 260
INITIAL_LIVES = 3
```

#### src/shared/constants/enemy.ts

*(extracted from `entities/Enemy.ts`)*

```
ENEMY_RADIUS = 14
ENEMY_SPEED = 125
```

#### src/shared/constants/simulation.ts

*(extracted from `EnemySystem.ts` and `PlayingScene.ts`)*

```
SPAWN_INTERVAL_SECONDS = 1.5
SPAWN_INTERVAL_SCALE_FACTOR = 0.02
MINIMUM_SPAWN_INTERVAL_SECONDS = 0.45
SPAWN_RADIUS_MIN = 400
SPAWN_RADIUS_MAX = 650
GATE_FALLBACK_MIN_DIST = 240       // SPAWN_RADIUS_MIN * 0.6
MAX_SPAWN_RETRIES = 5
SPAWN_SAFE_RADIUS = 16
POINTS_PER_SECOND = 10
```

### 2.5 Shared Type Definitions (src/shared/types/index.ts)

#### Primitives

```typescript
interface Vector2 {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

#### Simulation Entities

```typescript
interface PlayerState {
  id: string;
  position: Vector2;
  lives: number;
  isEliminated: boolean;
  survivalTimeSeconds: number;
  score: number;
}

interface EnemyState {
  id: string;
  position: Vector2;
}

interface ObstacleState {
  rect: Rect;
}

interface GateState {
  spawnX: number;
  spawnY: number;
}
```

#### Input

```typescript
interface InputState {
  dx: number;   // normalized [-1..1] horizontal axis
  dy: number;   // normalized [-1..1] vertical axis
}
```

#### World

```typescript
interface WorldState {
  width: number;
  height: number;
  boundaryThickness: number;
  obstacles: readonly ObstacleState[];
  gates: readonly GateState[];
}
```

#### Match

```typescript
type MatchPhase = 'waiting' | 'countdown' | 'playing' | 'finished';

interface MatchState {
  matchId: string;
  phase: MatchPhase;
  tick: number;
  players: PlayerState[];
  enemies: EnemyState[];
  elapsedSeconds: number;
}
```

#### Network Snapshots

```typescript
interface MatchSnapshot {
  tick: number;
  players: readonly PlayerState[];
  enemies: readonly EnemyState[];
  elapsedSeconds: number;
}

interface PlayerResult {
  id: string;
  name: string;
  rank: number;
  survivalTimeSeconds: number;
  score: number;
}

interface MatchResult {
  matchId: string;
  winnerId: string | null;   // null if all eliminated simultaneously
  players: PlayerResult[];
  durationSeconds: number;
}
```

### 2.6 Shared Simulation Functions

All functions are pure: no classes, no Pixi, no side effects beyond mutating the state object passed in.

#### src/shared/simulation/movement.ts

```
applyPlayerInput(
  state: PlayerState,
  input: InputState,
  deltaSeconds: number,
  speed: number,            // PLAYER_SPEED
): void
  → normalizes input vector; advances state.position by speed * deltaSeconds

clampPlayerToBounds(
  state: PlayerState,
  world: WorldState,
  radius: number,           // PLAYER_RADIUS
): void
  → clamps state.position to [boundaryThickness + radius, worldEdge - boundaryThickness - radius]
```

Source: `MovementSystem.movePlayer` + `keepPlayerInBounds`. Remove `syncRenderable` call.

#### src/shared/simulation/collision.ts

```
circleRectPushback(
  circlePos: Vector2,
  radius: number,
  rect: Rect,
): Vector2 | null
  → returns pushback vector to move circle out of rect; null if no overlap
  → caller applies vector to state.position

circlesOverlap(
  a: { position: Vector2; radius: number },
  b: { position: Vector2; radius: number },
): boolean
```

Source: `PlayingScene.resolveCircleRectCollision` + `CollisionSystem.areCirclesColliding`.

#### src/shared/simulation/enemyBehavior.ts

```
stepEnemyTowardTarget(
  enemy: EnemyState,
  target: Vector2,
  speed: number,            // ENEMY_SPEED
  deltaSeconds: number,
): void
  → advances enemy.position toward target by speed * deltaSeconds

selectSpawnPosition(
  playerPos: Vector2,
  world: WorldState,
  gates: readonly GateState[],
  viewportRect: ViewportRect,
): Vector2
  → retry loop (MAX_SPAWN_RETRIES) for near-player angle; gate fallback
  → obstacle clearance checked via circleRectPushback distance
```

Source: `EnemySystem.getSpawnPosition`, `selectGateSpawn`, `isInsideObstacle`.
`EnemySystem` retains ownership of the spawn timer and the `EnemyState[]` array.

#### src/shared/simulation/damage.ts

```
collectEnemyCollisions(
  player: PlayerState,
  enemies: readonly EnemyState[],
  playerRadius: number,
  enemyRadius: number,
): EnemyState[]
  → returns enemies that overlap player (uses circlesOverlap)

applyDamage(
  player: PlayerState,
  hits: number,
): void
  → decrements player.lives by hits; clamps to 0; sets isEliminated if lives === 0

computeWinner(
  players: readonly PlayerState[],
): string | null
  → returns id of sole surviving player; null if count ≠ 1
```

Source: inline logic in `PlayingScene.resolvePlayerEnemyCollisions` + `damagePlayer`.

### 2.7 What Stays Client-Only

| Item | Reason |
|---|---|
| `Graphics`, `Container`, `Application` | Pixi render API |
| `Camera.ts` | Viewport math, not simulation |
| `Renderer.ts` | Canvas and stage management |
| All scene files | Pixi + orchestration |
| `VirtualJoystick.ts`, `InputManager.ts` | Browser event listeners |
| `AudioManager.ts` | Web Audio API |
| `GroundBackground.ts`, `WorldBoundary.ts` | Visual only |
| `Obstacle.ts` visual code | Visual only |
| `PLAYER_COLOR`, `ENEMY_COLOR` | Display constants |
| `syncRenderable` calls | Bridge: state → Pixi position |

---

## Part 3: Lobby and Match Lifecycle

### 3.1 Lobby Lifecycle

| Trigger | Server Behavior | Broadcast |
|---|---|---|
| `lobby:create` | Generate 4-char code; creator becomes host | `lobby:state` to creator |
| `lobby:join` | Validate: exists + not full + status=waiting; add player | `lobby:state` to all in lobby |
| `lobby:leave` or disconnect | Remove player; if host → promote next by join order; if empty → destroy | `lobby:state` to remaining |
| `lobby:startMatch` | Validate sender is host + status=waiting; set countdown; 3s timer; set playing | `match:countdown` × 3 → `match:started` |
| Player disconnect mid-match | Eliminate immediately | `player:eliminated` + `match:snapshot` |
| Last surviving player | Set status=finished; emit result; reset to waiting | `match:finished` → `lobby:state` |

**Host assignment:** first joiner = host. On host leave, promote next player in join order.

**Minimum to start:** 1 (for dev testing). Recommend enforcing ≥ 2 for release via server validation.

### 3.2 Match Lifecycle

```
waiting
  └─ host sends lobby:startMatch
       ↓
countdown  (3 × match:countdown at 1s intervals)
       ↓
playing  (match:snapshot at 20–30 ticks/sec)
  ├─ player:eliminated per hit-to-zero-lives
  └─ one player remains (or all eliminated)
       ↓
finished
  └─ match:finished emitted
  └─ lobby status reset to waiting
  └─ lobby:state broadcast (players still connected stay in lobby)
```

---

## Part 4: Event Contract

### 4.1 Client → Server

| Event | Payload | Notes |
|---|---|---|
| `lobby:create` | `{ playerName: string }` | Server generates lobby code |
| `lobby:join` | `{ lobbyCode: string; playerName: string }` | Server validates code + capacity |
| `lobby:leave` | *(none)* | Implicit on disconnect too |
| `lobby:startMatch` | *(none)* | Server validates sender is host |
| `player:input` | `{ dx: number; dy: number }` | Normalized direction; sent every frame during match |

### 4.2 Server → Client

| Event | Payload | Notes |
|---|---|---|
| `lobby:state` | `LobbyState` | Full object; broadcast on any lobby change |
| `lobby:error` | `{ message: string }` | e.g. "Lobby not found" / "Lobby full" / "Match in progress" |
| `match:countdown` | `{ secondsRemaining: number }` | 3, 2, 1 before match:started |
| `match:started` | `{ matchId: string; initialState: MatchSnapshot }` | Triggers scene transition |
| `match:snapshot` | `MatchSnapshot` | 20–30× per second during playing phase |
| `player:eliminated` | `{ playerId: string; rank: number }` | Show elimination overlay |
| `match:finished` | `{ result: MatchResult }` | Triggers results scene transition |

---

## Part 5: State Interfaces (Network Layer)

These supplement the shared simulation types from Part 2.

```typescript
type LobbyStatus = 'waiting' | 'countdown' | 'playing' | 'finished';

interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
}

interface LobbyState {
  lobbyCode: string;
  status: LobbyStatus;
  players: LobbyPlayer[];
  maxPlayers: 4;
}
```

`MatchSnapshot`, `MatchResult`, `PlayerResult` are defined in `src/shared/types/index.ts` (Part 2.5).

---

## Part 6: Implementation Phases

### Phase A — Shared Constants and Types ✅ COMPLETE
*Prerequisite for everything else.*

1. Create `src/shared/constants/world.ts`. Move constants from `src/game/utils/world.ts`. Re-export from `utils/world.ts` for backward compatibility.
2. Create `src/shared/constants/player.ts`, `enemy.ts`, `simulation.ts`. Extract from entity files and `EnemySystem.ts`.
3. Create `src/shared/types/index.ts`. Define `Vector2`, `Rect`, `PlayerState`, `EnemyState`, `ObstacleState`, `GateState`, `InputState`, `WorldState`, `MatchPhase`, `MatchState`, `MatchSnapshot`, `PlayerResult`, `MatchResult`.
4. Import shared constants in existing files. Remove duplicates.
5. Verify: zero TypeScript errors. Single-player works.

### Phase B — Shared Simulation Functions ✅ COMPLETE
*Extracts math from systems without changing system behavior.*

1. ✅ Create `src/shared/simulation/movement.ts`. Exports `applyPlayerInput(state, input, deltaSeconds, speed)` and `clampPlayerToBounds(state, world, radius)` using `PlayerState`, `InputState`, `WorldState`. `MovementSystem` delegates via pre-Phase C adapters; `syncRenderable` remains client-only.
2. ✅ Create `src/shared/simulation/collision.ts`. Exports `circlesOverlap(a, b)` and `circleRectPushback(circlePos, radius, rect): Vector2 | null`. `CollisionSystem` and `PlayingScene.resolveCircleRectCollision` delegate to these; pushback is applied by callers; `syncRenderable` remains client-only.
3. ✅ Create `src/shared/simulation/enemyBehavior.ts`. Extract spawn interval/position logic, enemy step logic, and culling bounds checks. `EnemySystem` delegates while keeping Pixi entity ownership and render sync client-only.
4. ✅ Create `src/shared/simulation/damage.ts`. Extract enemy collision collection, damage application, and winner computation from `PlayingScene`.
5. ✅ Update `MovementSystem`, `CollisionSystem`, `EnemySystem`, `PlayingScene` to delegate to shared functions. Keep all `syncRenderable` calls in client layer.
6. ✅ Verify: zero TypeScript errors. Single-player works.

### Phase C — Entity View Wrappers ✅ COMPLETE
*Prepares for server. Do not start this before Phase B is stable.*

1. ✅ Define `PlayerState` as the data source for `Player`. `Player` holds a `state: PlayerState` and a `renderable: Graphics`. View reads `state.position` to sync renderable.
2. ✅ Same pattern for `Enemy` → `EnemyState`.
3. ✅ Client systems now use `player.state` / `enemy.state.position` where shared simulation expects state. Pixi sync remains in client wrappers and scenes.
4. ✅ Verify: zero TypeScript errors. Single-player works.

### Phase D — SocketClient ✅ COMPLETE
*No scenes yet.*

1. ✅ Create `src/api/SocketClient.ts`. Wrap `io()` from Socket.IO client.
2. ✅ Typed `emit<T>(event, payload)` and `on<T>(event, handler)` / `off(event, handler)` methods.
3. ✅ `connect(url)` and `disconnect()` lifecycle methods.
4. ✅ `Game.ts` constructs one `SocketClient` instance, connects on Multiplayer entry, and disconnects on game destroy.

### Phase E — HomeScene Split + MultiplayerMenuScene ✅ COMPLETE
*First visible multiplayer UI.*

1. ✅ Update `HomeScene` to show "Single Player" and "Multiplayer" buttons.
2. ✅ Create `MultiplayerMenuScene`:
   - ✅ Display name prompt flow (stored in `localStorage`).
   - ✅ Create Lobby button → emits `lobby:create` when socket is connected; on `lobby:state` response → transitions to `LobbyScene`.
   - ✅ Join Lobby prompt + button → emits `lobby:join` when socket is connected; on `lobby:state` → transitions to `LobbyScene`.
   - ✅ Inline error display for `lobby:error`.
   - ✅ Back button → navigate to `HomeScene`.
3. ✅ Scene subscribes to `lobby:state` and `lobby:error` in `initialize()`; unsubscribes in `destroy()`.

### Phase F.0 — Temporary Mock Socket.IO Server ✅ COMPLETE

1. ✅ Created disposable Node.js + TypeScript Socket.IO server in `server/`.
2. ✅ Implemented in-memory lobby create, join, leave, disconnect cleanup, host promotion, countdown, and mock `match:started`.
3. ✅ No gameplay simulation, snapshots, enemies, persistence, Firebase, or `src/shared` imports.

### Phase F — LobbyScene ✅ COMPLETE

1. ✅ Renders full `LobbyState` from latest server `lobby:state`.
2. ✅ Shows lobby code, player list, host indicator, and player count.
3. ✅ Host sees Start Match; all players see Leave.
4. ✅ On `match:countdown`, displays `{ secondsRemaining }`.
5. ✅ On `match:started`, navigates to `MultiplayerPlayingScene` placeholder.
6. ✅ Inline `lobby:error` display.
7. ✅ Subscribes to `lobby:state`, `lobby:error`, `match:countdown`, `match:started` in `initialize()` and unsubscribes in `destroy()`.

### Phase I — Authoritative Realtime Server

1. ✅ Replace the temporary mock countdown handoff with server-owned match state.
2. ✅ Keep server-side authoritative lobby create, join, leave, host promotion, and code generation.
3. ✅ Add `player:input` events.
4. ✅ Implement match tick loop at 20–30 ticks/sec.
5. ✅ Apply `player:input` events to `PlayerState` via `applyPlayerInput` + `clampPlayerToBounds`.
6. ✅ Broadcast `match:snapshot` each tick with authoritative player positions.
7. ✅ Render local and remote players from snapshots in `MultiplayerPlayingScene`.
8. ✅ Update `survivalTimeSeconds` and survival score during the match.
9. ✅ Step enemies via shared enemy behavior helpers and spawn enemies on the server.
10. ✅ Include enemies in `match:snapshot` and render enemies from snapshots on the client.
11. ✅ Resolve enemy-player collisions via shared damage helpers.
12. ✅ Emit `player:eliminated`.
13. ✅ Detect winner via `computeWinner`; emit `match:finished` once.
14. ✅ Produce `MatchResult` payload for `match:finished`.
15. Pending: separate internal match state from public lobby payloads if the lobby contract needs a stricter boundary.

Same-tick eliminations use the same deterministic ranking policy for `player:eliminated` and final `MatchResult.players`: survival time first, then lobby/player insertion order.

Solo lobby start remains dev-only behavior for local testing. Production should enforce at least two players before `lobby:startMatch`.

### Phase G — MultiplayerPlayingScene Client Rendering

1. On `initialize()`: render world, obstacles, boundary, ground (same as `PlayingScene`).
2. Local player rendered from last known `PlayerState`.
3. Remote players rendered as separate Pixi circles, updated from `match:snapshot`.
4. Enemies rendered from `match:snapshot.enemies`.
5. Each frame: read local `InputState` from `InputManager`/`VirtualJoystick`; emit `player:input`.
6. On `player:eliminated` for local player: show elimination overlay.
7. On `match:finished`: currently shows a minimal placeholder; next step is transition to `MatchResultsScene`.
8. No client-side movement prediction in v1 — local player position comes from server snapshots only.

### Phase H — MatchResultsScene ← CURRENT NEXT PHASE

1. Display ranked player results from `MatchResult.players` (sorted by `rank`).
2. Highlight winner row.
3. "Back to Lobby" button → navigate to `LobbyScene` (server already reset status to `waiting`).
4. "Home" button → emit `lobby:leave`; navigate to `HomeScene`.

---

## Part 7: Risks and Tradeoffs

### Critical

**Constant desync between client and server**
If `ENEMY_SPEED`, `PLAYER_SPEED`, or spawn constants ever diverge between client and server, simulations will produce different results. This breaks hit detection and live count parity.
Mitigation: single source of truth in `src/shared/constants/`. Server imports the same files or a build artifact. Validate with a linter rule that prohibits hardcoded simulation values outside `src/shared/`.

**Pixi bleeding into shared layer**
TypeScript will not prevent `import { Graphics } from 'pixi.js'` inside `src/shared/`. Any such import silently breaks the server.
Mitigation: run `tsc --noEmit` on `src/shared/` in isolation as part of CI. Or enforce via an ESLint `no-restricted-imports` rule on `src/shared/**`.

### Important

**Phases C–I depend on Phases A–B being complete and stable**
Starting entity view wrapper refactor before simulation functions are extracted risks breaking single-player during an incomplete migration. Never begin Phase C until Phase B has zero errors and single-player has been verified.

**Input latency in v1**
No client-side prediction means the local player's rendered position lags by one server round-trip (~33ms at 30 ticks). This is intentional for v1 simplicity. Interpolation is a Phase G+ improvement.

**Snapshot bandwidth**
4 players + 20 enemies × ~3 numeric fields ≈ 1–2 KB JSON per tick. At 30 ticks/sec = ~60 KB/sec per client. Acceptable for v1 without binary encoding.

**Back-to-lobby consistency**
After `match:finished`, server resets lobby to `waiting` and emits `lobby:state`. Clients on `MatchResultsScene` clicking "Back to Lobby" navigate to `LobbyScene` and sync to current `lobby:state`. Clients clicking "Home" must emit `lobby:leave` before navigating.

### Minor

**Lobby code collisions**
4-char alphanumeric = ~1.68M possible codes. Collision probability is negligible at small scale. Server should retry generation up to a small limit before returning `lobby:error`.

**`ObstacleState` array rebuilt each frame**
`obstacleSystem.getObstacles().map(o => o.rect)` creates a new array every frame in `PlayingScene`. Obstacles are static. A `getObstacleRects()` accessor returning a cached stable array is a small cleanup deferred to Phase B.

**Host can start with 1 player**
Useful for dev testing. Should be enforced to ≥ 2 for production by server validation. The client can show the Start button disabled with a "Waiting for more players" label when count < 2.

---

## Part 8: Out of Scope (v1 MVP)

- Authentication or display name persistence
- Reconnect mid-match (disconnect = eliminated)
- Public lobby browser or matchmaking
- Chat
- Ranked / ELO mode
- Client-side prediction or interpolation
- Rematch flow (distinct from back-to-lobby, which is in scope)
- Firebase integration (designed, not yet implemented)
