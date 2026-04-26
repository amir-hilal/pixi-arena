# Firebase Persistence Plan

## Purpose

Firebase is for persistence, not realtime gameplay.

Store durable product data in Firestore:

- player display names
- leaderboard entries
- match results

Realtime player movement, enemy movement, collision, and match simulation will use WebSockets or Socket.IO instead.

REST APIs may be used for non-realtime operations such as score submission, leaderboard reads, player profile persistence, and match result persistence. REST APIs must not carry high-frequency gameplay state.

## Authentication

No authentication for v1.

The local display name is stored in `localStorage`. The client sends that display name when submitting scores or joining a lobby.

## Firestore Data Model

### `leaderboard_scores/{scoreId}`

```text
playerName: string
score: number
survivalTimeSeconds: number
matchId: string
environment: "local" | "development" | "production"
createdAt: server timestamp
gameVersion: string
```

### `match_results/{matchId}`

```text
lobbyId: string
winnerPlayerId: string
players: array
startedAt: timestamp
endedAt: timestamp
environment: "local" | "development" | "production"
```

## Environment Separation

Frontend environments:

- `local`
- `development`
- `production`

Backend environments:

- `local`
- `development`
- `production`

Preferred:

- Use separate Firebase projects for production and dev/local.
- Keep production data physically isolated.

Acceptable temporary approach:

- Use environment-prefixed collections, or
- Keep an `environment` field on all persisted documents and filter reads by environment.

Firestore data must not mix across local, development, and production.

## Required Vite Environment Variables

```text
VITE_APP_ENV=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIRESTORE_LEADERBOARD_COLLECTION=
VITE_FIRESTORE_MATCH_RESULTS_COLLECTION=
```

## Security Rules Notes

- Allow leaderboard reads.
- Allow score and match result creates with validation.
- Deny client updates and deletes.
- Validate `playerName` length.
- Validate score and survival time bounds.
- Validate required environment fields.
- Prefer server-side writes for final multiplayer match results once the realtime server exists.
