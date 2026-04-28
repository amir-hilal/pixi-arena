# Architecture

## Current Architecture

Pixi Arena is currently a Vite, TypeScript, and PixiJS browser game with a local Socket.IO server for multiplayer lobby and authoritative movement development. The current implementation includes Home, Playing, Game Over, Multiplayer Menu, Lobby, and Multiplayer Playing scenes; player movement; mobile joystick input; lives; survival scoring; difficulty scaling; world bounds; obstacles; and basic feedback.

The multiplayer foundation is implemented through the lobby flow and server-authoritative match simulation. Shared constants, shared simulation functions, and shared state types live under `src/shared/`. `Player` and `Enemy` are Pixi view wrappers over shared state. `SocketClient` exists as a thin Socket.IO transport wrapper. The local multiplayer MVP loop now runs from MultiplayerMenu to Lobby to MultiplayerPlaying to MatchResults. Firebase, leaderboard, and persistence are not implemented yet.

The current frontend separates engine setup, gameplay data, gameplay logic, scene orchestration, API access, and UI. Each layer should have one clear reason to change.

## Separation of Concerns

- Rendering displays state.
- Systems update state.
- Entities hold state.
- Scenes coordinate systems, entities, assets, and transitions.
- API code stays outside gameplay entities and systems.
- Pixi rendering code must not leak into shared simulation logic.
- All gameplay logic is defined in world space and must never depend on client viewport, resolution, or camera.
- Client camera is a presentation concern only and does not influence simulation.
- Match participation requires explicit server-side readiness. Connection alone is not sufficient.
- Player lifecycle includes location states (`lobby`, `playing`, `results`) to prevent UI/server desync.

## Game Modules

### core

Engine-level frontend code such as Pixi application setup, timing, input, audio, and shared client contracts.

### entities

Data holders for game objects such as players, enemies, projectiles, or pickups. Entities should not own behavior.

### systems

Gameplay logic that operates on entities, such as movement, collision, spawning, scoring, and cleanup.

### scenes

Orchestration units for menu, gameplay, pause, leaderboard, and game over flows. Scenes decide which systems run and which entities are active.

### api

Transport and product data access code that stays outside gameplay entities and systems. `SocketClient` is the current realtime transport wrapper. Future non-realtime product operations may include leaderboard, match history, and player display name persistence.

## Future Client/Server Split

Multiplayer gameplay will use a client/server architecture.

- The browser client captures input and renders snapshots.
- The realtime server owns authoritative gameplay state.
- Firebase stores persistent product data only.

Gameplay rules that need to run on both client and server are being moved into a shared simulation layer with no Pixi dependency. Shared logic currently includes types, constants, movement, collision, enemy behavior, and damage/winner helpers.
Enemy spawning fairness is enforced in shared/server world-space logic and does not depend on viewport-based spawning rules.

## Server-Authoritative Multiplayer

In multiplayer, clients send input state, not final positions.

Clients continuously emit input intent `{ dx, dy }`. The server stores each player's latest input and applies that input every simulation tick.

The server owns:

- player positions
- enemy movement
- collisions
- damage and lives
- eliminations
- game start and game over
- winner selection

Clients render server snapshots and may interpolate between snapshots for smooth motion.

`match:snapshot` is a full authoritative snapshot, not a delta. Clients render from the latest snapshot state. This favors consistency and simplicity over bandwidth efficiency.

Damage is not emitted as a separate event. Clients derive damage feedback from snapshot state changes, such as lives decreasing.

Interpolation operates on client-side snapshot history by buffering recent snapshots and interpolating render positions between them. The render clock is capped at the latest server time to handle tab resume correctly. Lives, score, elimination, damage feedback, and match finish events always use the latest authoritative snapshot (no client-side prediction). Server authority remains unchanged.

## Realtime and Persistence Boundaries

Use WebSockets or Socket.IO for realtime gameplay.

REST APIs may be used for non-realtime product operations such as leaderboard reads, score submission, display name persistence, and match result persistence.

Do not use:

- webhooks for gameplay
- Firestore for high-frequency movement
- client-submitted final positions for authoritative state

Use Firebase Firestore for persistence only:

- leaderboard scores
- player display names
- match results/history

Firestore data must be separated by environment: local, development, and production.

Frontend and backend environments should both be treated as explicit deployment targets: local, development, and production. Production Firebase data must not share collections or projects with development data unless environment-prefixed collections are used as a temporary fallback.

## Game Loop

The frontend game loop keeps update and render responsibilities separate. Update work advances state using elapsed time. Render work reflects the latest state through Pixi display objects.

In multiplayer, the frontend update loop processes server snapshots, maintains interpolation buffers, advances the render clock, and interpolates render positions while avoiding ownership of authoritative gameplay outcomes.

## Current Next Step

Implement Firebase persistence for match results and leaderboard scores.

## Current Risk

The full multiplayer MVP loop with smooth client-side interpolation is stable and verified.
Firebase persistence, leaderboard, and production deployment are still pending.
