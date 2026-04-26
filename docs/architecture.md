# Architecture

## Current Architecture

Pixi Arena is currently a frontend-only Vite, TypeScript, and PixiJS browser game. The current implementation includes Home, Playing, and Game Over scenes, player movement, mobile joystick input, lives, survival scoring, difficulty scaling, and basic feedback.

The current frontend separates engine setup, gameplay data, gameplay logic, scene orchestration, API access, and UI. Each layer should have one clear reason to change.

## Separation of Concerns

- Rendering displays state.
- Systems update state.
- Entities hold state.
- Scenes coordinate systems, entities, assets, and transitions.
- API code stays outside gameplay entities and systems.
- Pixi rendering code must not leak into shared simulation logic.

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

Non-realtime product data access such as leaderboard, match history, and player display name persistence.

## Future Client/Server Split

Multiplayer gameplay will use a client/server architecture.

- The browser client captures input and renders snapshots.
- The realtime server owns authoritative gameplay state.
- Firebase stores persistent product data only.

The client should gradually move gameplay rules into a shared simulation layer that has no Pixi dependency. Shared logic may include types, constants, movement rules, collision helpers, and world bounds calculations.

## Server-Authoritative Multiplayer

In multiplayer, clients send input state, not final positions.

The server owns:

- player positions
- enemy movement
- collisions
- damage and lives
- eliminations
- game start and game over
- winner selection

Clients render server snapshots and may interpolate between snapshots for smooth motion.

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

In multiplayer, the frontend update loop should also process server snapshots and interpolation while avoiding ownership of authoritative gameplay outcomes.
