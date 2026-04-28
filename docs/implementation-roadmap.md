# Implementation Roadmap

## Current Status

This roadmap is a high-level product roadmap. For multiplayer implementation details, `docs/multiplayer-implementation-plan.md` is authoritative.

Single-player stabilization, world/camera work, shared simulation extraction, entity state/view wrappers, SocketClient, the Home/Multiplayer menu split, the local Socket.IO server, LobbyScene, Phase I.4 authoritative match lifecycle, MatchResultsScene, and Phase G MultiplayerPlayingScene world-rendering stabilization are complete. Resolution-dependent enemy spawn fairness has been resolved in world-space simulation by removing viewport-based spawn logic.

Current next step: implement interpolation for smoother movement between server snapshots.

Current risk: the full local multiplayer MVP loop is stable, but snapshot interpolation is not implemented yet. Movement smoothness under latency and jitter, Firebase persistence, leaderboard, and production deployment are still pending.

## Phase 1: Current Single-Player Stabilization

Goal: stabilize the existing browser game before expanding the world or adding networking.

Checklist:

- Clean up remaining mobile control issues.
- Finalize responsive UI and gameplay polish.
- Ensure Home, Playing, and Game Over scene flow is stable.

Acceptance criteria:

- Keyboard and touch movement work reliably.
- Scene transitions do not leak listeners or renderables.
- Game over, restart, score, lives, and feedback remain stable.

Risks:

- Mobile browser input quirks can hide bugs that desktop testing misses.

## Phase 2: World and Camera

Goal: move from screen-space gameplay to a larger world.

Checklist:

- Add larger world coordinates.
- Add camera follow for the local player.
- Add world boundaries.
- Add visible ground/grid/tile background.
- Add obstacle rendering.
- Add obstacle collision.

Acceptance criteria:

- Player movement is bounded by the world, not the screen.
- Camera follows smoothly without breaking UI.
- Obstacles are visible and block movement.

Risks:

- Mixing UI coordinates with world coordinates can make rendering and input brittle.

## Phase 3: Shared Simulation Layer

Goal: prepare gameplay rules for reuse by client and server.

Checklist:

- Extract shared types.
- Extract movement and collision constants.
- Prepare pure simulation logic reusable by client and server.
- Avoid Pixi dependencies in shared logic.

Acceptance criteria:

- Shared logic can run without Pixi.
- Client rendering depends on simulation state, not the other way around.
- Server can later import the same rules or equivalent types.

Risks:

- Refactoring too late will make multiplayer more expensive.

## Phase 4: Lobby Server Foundation

Goal: create the temporary realtime backend for lobby state and the frontend lobby UI.

Checklist:

- Create temporary Node.js TypeScript mock server.
- Add Socket.IO.
- Create in-memory lobby model.
- Support create, join, leave, host reassignment, countdown, and mock match start.
- Broadcast lobby state.
- Render server-state-driven LobbyScene.

Acceptance criteria:

- Up to 4 clients can join the same lobby.
- Lobby state is consistent after joins/leaves.
- Clients can leave and return to the multiplayer menu without stale lobby listeners.
- Match start reaches MultiplayerPlayingScene.
- Match finish reaches MatchResultsScene.

Risks:

- Reconnects and abandoned lobbies need explicit cleanup rules.

## Phase 5: Multiplayer Movement

Goal: move player simulation authority to the server.

Checklist:

- [x] Clients send input state.
- [x] Server updates player positions.
- [x] Server broadcasts snapshots.
- [x] Client renders local and remote players from snapshots.
- Add interpolation.

Acceptance criteria:

- Clients do not send final positions.
- Remote players render smoothly enough at 20-30 server ticks/sec.
- Movement remains bounded and consistent across clients.

Risks:

- Latency can make local movement feel less responsive without prediction or interpolation.

## Phase 6: Server-Authoritative Enemies and Combat

Goal: make survival gameplay authoritative in multiplayer.

Checklist:

- Server owns enemy spawning and movement.
- Server owns collision and damage.
- Server handles eliminations.
- Server selects winner.

Acceptance criteria:

- All clients see the same enemy and player state.
- Eliminations and winner selection are decided only by the server.
- Game finished state is consistent for all players.

Risks:

- Enemy count and snapshot size can affect bandwidth.

## Phase 7: Firebase Persistence

Goal: persist product data after the realtime match flow works.

Checklist:

- Add Firebase app config.
- Add Firestore repository layer.
- Save match results.
- Save leaderboard scores.
- Fetch leaderboard screen.

Acceptance criteria:

- Match results and leaderboard scores persist by environment.
- Leaderboard reads do not require authentication in v1.
- Failed persistence does not block returning to Home or restarting.

Risks:

- Dev and production data can mix if environment separation is weak.

## Phase 8: Production Readiness

Goal: prepare the game for deployment and technical review.

Checklist:

- Configure environment-specific builds.
- Create deployment plan.
- Update README setup.
- Prepare technical interview talking points.

Acceptance criteria:

- Frontend, realtime server, and Firebase config are documented by environment.
- Production uses isolated data.
- Demo flow is reliable and explainable.

Risks:

- Shipping multiplayer without observability makes production issues hard to debug.
