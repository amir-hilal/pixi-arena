# Pixi Arena

Pixi Arena is a browser-based survival arena game built with TypeScript, Vite, and PixiJS.

Current status: server-authoritative multiplayer + single-player gameplay with Firebase persistence for leaderboard and match results.

## Stack

- Vite for local development and production builds
- TypeScript for strict application code
- PixiJS for browser 2D rendering
- Socket.IO for realtime multiplayer gameplay
- Firebase Firestore for leaderboard and match-result persistence

## Local Development

```bash
npm install
npm run dev
```

Run client + local Socket.IO server together:

```bash
npm run dev:full
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
    scenes/     Home, single-player, multiplayer, and leaderboard screens
    ui/         Pixi UI/input components such as the virtual joystick
  api/          Typed Socket.IO client wrapper
  firebase/     Firebase init, Firestore access, repositories, persistence service
  assets/       Source-controlled game assets
server/         Local Node.js Socket.IO authoritative realtime server
docs/           Architecture, roadmap, and planning notes
.ai/            AI collaboration rules and review checklists
public/         Static files served by Vite
```

## Architecture Direction

Multiplayer is server-authoritative.

- Clients send input, not final positions.
- The server owns movement, enemies, collisions, damage, eliminations, game over, and winner selection.
- Clients render server snapshots.
- Shared simulation logic must not depend on Pixi.
- Firebase is persistence only, not realtime gameplay transport.

Persistence is implemented for:

- leaderboard entries
- match results
- leaderboard scene reads (repository-driven, read-only)

## Environments

The project uses Vite env files for local, development, and production configuration.

Socket and Firebase should use the same environment split: local, development, and production.
Firebase data isolation is handled in MVP using a single Firestore database plus an `environment` field and repository filters.

## Deploy-Ready Environment Variables

```text
VITE_APP_ENV=local
VITE_SOCKET_SERVER_URL=http://localhost:3001
VITE_ENABLE_DEBUG=true

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_ENVIRONMENT=local
```

Notes:

- `VITE_SOCKET_SERVER_URL` is the preferred socket endpoint variable.
- `VITE_SOCKET_URL` remains supported as a legacy fallback.
- `VITE_FIREBASE_ENVIRONMENT` is optional when `VITE_APP_ENV` is set; Firebase environment resolution falls back to `VITE_APP_ENV`.
- No collection-name environment variables are currently used; repositories use fixed collection names (`leaderboard`, `matchResults`).

## Firestore Deployment Runbook

1. Deploy Firestore rules from project root:

```bash
firebase deploy --only firestore:rules
```

2. Ensure these composite indexes exist:

- `leaderboard`: `environment` ASC, `survivalTimeSeconds` DESC, `score` DESC
- `leaderboard`: `environment` ASC, `displayName` ASC, `survivalTimeSeconds` DESC
- `matchResults`: `environment` ASC, `finishedAt` DESC
- `matchResults`: `playerDisplayNames` ARRAY, `finishedAt` DESC

3. Verify environment filtering in app behavior:

- set `VITE_FIREBASE_ENVIRONMENT` (or `VITE_APP_ENV`) to `local`
- write/read leaderboard and match results
- switch to `development` and confirm reads do not return `local` data

MVP environment strategy:

- single Firestore database
- `environment` field on documents
- repository filters by environment

Future production hardening can move to separate Firebase projects/databases.

## Documentation

- `docs/architecture.md`: current and future architecture boundaries
- `docs/multiplayer-architecture.md`: realtime multiplayer model
- `docs/firebase-persistence-plan.md`: Firebase persistence plan, rules, and index requirements
- `docs/implementation-roadmap.md`: phased roadmap
- `docs/progress-checklist.md`: implementation checklist

## Current Non-Goals

- Authentication/user accounts
- Matchmaking/public lobby discovery
- Multi-project Firebase deployment split (deferred hardening)
