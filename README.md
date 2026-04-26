# Pixi Arena

Pixi Arena is a browser-based survival arena game built with TypeScript, Vite, and PixiJS.

Current status: single-player prototype with scene flow, player movement, mobile joystick controls, enemies, lives, survival score, difficulty scaling, and basic visual/audio feedback.

Planned direction: real-time multiplayer survival. Up to 4 players will join the same lobby, avoid enemies, and the player who survives longest wins.

## Stack

- Vite for local development and production builds
- TypeScript for strict application code
- PixiJS for browser 2D rendering
- Socket.IO planned for realtime multiplayer gameplay
- Firebase planned for persistent leaderboard, display names, and match results

## Local Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Project Structure

```text
src/
  game/
    core/       Pixi setup, loop, input, audio, and client orchestration
    entities/   Game object state containers
    systems/    Gameplay logic such as movement, collision, and spawning
    scenes/     Home, Playing, Game Over, and future product screens
    ui/         Pixi UI/input components such as the virtual joystick
  api/          Planned non-realtime API/Firebase access
  assets/       Source-controlled game assets
docs/           Architecture, roadmap, and planning notes
.ai/            AI collaboration rules and review checklists
public/         Static files served by Vite
```

## Architecture Direction

The current game is frontend-only. Multiplayer will introduce a server-authoritative realtime backend.

- Clients send input, not final positions.
- The server owns movement, enemies, collisions, damage, eliminations, game over, and winner selection.
- Clients render server snapshots.
- Shared simulation logic must not depend on Pixi.
- Firebase is persistence only, not realtime gameplay transport.

## Environments

The project uses Vite env files for local, development, and production configuration.

The future realtime backend should use the same environment split: local, development, and production. Firebase data must stay isolated across those environments.

Existing frontend env keys:

```text
VITE_APP_ENV=
VITE_API_BASE_URL=
VITE_ENABLE_DEBUG=
```

Planned Firebase env keys are documented in `docs/firebase-persistence-plan.md`.

## Documentation

- `docs/architecture.md`: current and future architecture boundaries
- `docs/multiplayer-architecture.md`: realtime multiplayer model
- `docs/firebase-persistence-plan.md`: Firebase persistence plan
- `docs/implementation-roadmap.md`: phased roadmap
- `docs/progress-checklist.md`: implementation checklist

## Current Non-Goals

- No backend code is implemented yet.
- No Firebase code is implemented yet.
- No leaderboard implementation exists yet.
- Multiplayer, Socket.IO, and Firebase are planned but not installed or wired.
