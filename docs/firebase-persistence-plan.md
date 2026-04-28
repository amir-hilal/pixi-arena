# Firebase Persistence Plan

## Purpose

Firebase is for persistence, not realtime gameplay.

Store durable product data in Firestore:

- leaderboard entries
- match results

Realtime player movement, enemy movement, collision, and match simulation will use WebSockets or Socket.IO instead.

REST APIs may be used for non-realtime operations such as score submission, leaderboard reads, player profile persistence, and match result persistence. REST APIs must not carry high-frequency gameplay state.

## Authentication

No authentication for v1.

The local display name is stored in `localStorage`. The client sends that display name when submitting scores or joining a lobby.

## Firestore Data Model

### `leaderboard/{scoreId}`

```text
displayName: string
score: number
survivalTimeSeconds: number
environment: "local" | "development" | "production"
recordedAt: server timestamp
```

### `matchResults/{matchResultId}`

```text
matchId: string
winnerDisplayName: string | null
players: array
playerDisplayNames: string[]
durationSeconds: number
environment: "local" | "development" | "production"
finishedAt: server timestamp
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

MVP free-tier strategy (current):

- Use one Firestore database.
- Store `environment` on every persisted document.
- Filter repository reads by environment.

Future production hardening:

- Move to separate Firebase projects or databases if stricter physical isolation is required.

## Required Vite Environment Variables

```text
VITE_APP_ENV=
VITE_SOCKET_SERVER_URL=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_ENVIRONMENT=local (optional if VITE_APP_ENV is set)
```

Collection name env vars are not used in the current implementation. Repositories write to fixed collections:

- `leaderboard`
- `matchResults`

## Security Rules Notes

- Allow leaderboard reads.
- Allow score and match result creates with strict validation.
- Deny client updates and deletes.
- Validate `displayName` length.
- Validate score and survival time bounds.
- Validate required environment fields and timestamp fields.
- Prefer server-side writes for final multiplayer match results once the realtime server exists.

Hardened v1 rules are drafted in [firestore.rules](../firestore.rules).

Validation coverage includes:

- allow only expected fields for `leaderboard` and `matchResults`
- type and length checks for display names and matchId
- numeric bounds for score, survivalTimeSeconds, and durationSeconds
- environment allowlist (`local`, `development`, `production`)
- timestamp enforcement using `request.time` for `recordedAt` and `finishedAt`

## Required Composite Indexes

Based on current repository queries:

- `leaderboard`: `environment` ASC, `survivalTimeSeconds` DESC, `score` DESC
- `matchResults`: `environment` ASC, `finishedAt` DESC
- `matchResults`: `playerDisplayNames` ARRAY, `finishedAt` DESC

Additional index required by current player leaderboard query:

- `leaderboard`: `environment` ASC, `displayName` ASC, `survivalTimeSeconds` DESC

## Firestore Deployment Runbook

1. Deploy rules from repository root:

```bash
firebase deploy --only firestore:rules
```

2. Create/verify all required composite indexes listed above.

3. Verify environment filtering end-to-end:

- set `VITE_FIREBASE_ENVIRONMENT=local` and confirm local reads/writes
- set `VITE_FIREBASE_ENVIRONMENT=development` (or set only `VITE_APP_ENV=development`) and confirm local data is not returned
- repeat for `production`

4. Confirm write validation behavior:

- valid writes succeed for `leaderboard` and `matchResults`
- invalid writes (bad environment/type/field set) are denied by rules
