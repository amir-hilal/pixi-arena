# Progress Checklist

## Current Completed Foundation

- [x] Setup project structure and documentation
- [x] Set up Pixi application
- [x] Add player movement
- [x] Add enemies
- [x] Add collision
- [x] Add scoring
- [x] Add scene flow: Home, Playing, Game Over
- [x] Add start/restart flow
- [x] Add health/lives system
- [x] Update rules: avoid enemies instead of scoring by collision
- [x] Add survival-based scoring
- [x] Add difficulty scaling over time
- [x] Add basic sound/visual feedback
- [x] Add responsive UI polish

## Single Player Polish

- [x] Clean mobile long-press behavior
- [x] Finalize responsive controls
- [x] Stabilize scene flow

## World Expansion

- [x] Add world coordinate system
- [x] Add camera follow
- [x] Add ground/tile background
- [x] Add obstacles
- [x] Add obstacle collision
- [x] Add world boundaries

## Game Feel Tuning
- [x] Tune enemy speed and spawn scaling
- [x] Tune obstacle density and placement
- [x] Tune gate spawn distance/behavior
- [x] Improve map readability
- [x] Verify mobile controls after world expansion
- [x] Run 3-minute playtest and document issues

## Multiplayer

- [x] Design shared simulation types and constants (Phase A complete — src/shared/constants + src/shared/types)
- [x] Phase B.1 complete — `src/shared/simulation/movement.ts`; `applyPlayerInput` + `clampPlayerToBounds` use `PlayerState`/`InputState`/`WorldState`; `MovementSystem` is a thin adapter
- [x] Phase B.2 complete — `src/shared/simulation/collision.ts`; `circlesOverlap` + `circleRectPushback`; `CollisionSystem` and `PlayingScene` delegate; no behavior change
- [x] Phase B.3 complete — `src/shared/simulation/enemyBehavior.ts`; spawn interval/position, enemy stepping, and culling bounds extracted; `EnemySystem` remains a Pixi adapter
- [x] Phase B.4 complete — `src/shared/simulation/damage.ts`; enemy collision collection, damage application, and winner computation extracted; `PlayingScene` delegates without entity refactors
- [x] Phase C.1 complete — `Player` owns `PlayerState` + Pixi `Graphics`; movement/damage use `player.state`; temporary PlayerState casts removed
- [x] Phase C.2 complete — `Enemy` owns `EnemyState` + Pixi `Graphics`; enemy movement/culling use `enemy.state.position`; Pixi sync is client-only
- [x] Phase D complete — `src/api/SocketClient.ts`; typed Socket.IO transport wrapper only; no lobby/match/game lifecycle logic
- [x] Phase E complete — HomeScene split into Single Player/Multiplayer; `MultiplayerMenuScene` added with display name, create/join/back, socket subscriptions, and LobbyScene transition
- [x] Phase F.0 — Add temporary local mock Socket.IO server for lobby UI development
- [x] Phase F — Implement LobbyScene with lobby state rendering, host controls, readiness-aware start validation UI, leave flow, countdown, and match:started subscription
- [x] Phase I movement slice — server-owned match state, player input, authoritative movement tick loop, `match:snapshot`, and snapshot-driven player rendering
- [x] Phase I.2 — Add server-owned enemies and enemy snapshots
- [x] Phase I.3 — Add server-owned damage/collisions and eliminations
- [x] Phase I.4 — Add winner/game over logic, `match:finished`, survival scoring, deterministic result ranking, and post-match location state transitions (`playing` → `results`)
- [x] Phase H — Add MatchResultsScene/results UI with server-confirmed `lobby:return` flow back to LobbyScene

- [x] Phase G — Expand client gameplay rendering from authoritative server snapshots, including world rendering parity and resolution fairness fixes.
	- Resolved resolution-dependent spawn fairness by removing viewport-based logic
- [x] Phase J — Implement client-side snapshot interpolation for smooth rendering
	- Client maintains snapshot buffer ordered by tick, deduped, max 10 snapshots
	- Render clock advances each frame, capped at latestSnapshot.elapsedSeconds
	- Player/enemy positions interpolated between bracketing snapshots only
	- New entities fall back to latestSnapshot position to avoid origin flash
	- Lives, score, elimination, damage flash, results transition all use latestSnapshot (no prediction)
	- Camera follows interpolated local player position
	- No server authority changes; all snapshots remain immutable on client
- [x] Fix lobby readiness and post-match player state handling
	- Server tracks player location (`lobby` | `playing` | `results`)
	- Host start requires all connected players to be back in lobby
	- MatchResults Back to Lobby emits `lobby:return` before transition

## Firebase Persistence

- [x] Document Firebase env config
- [x] Add Firebase initialization layer
- [x] Add Firestore repositories
- [x] Save leaderboard scores
- [x] Save match results
- [x] Add leaderboard scene
- [x] Draft Firestore security rules

## Production

- [ ] Configure local/dev/prod environments
- [ ] Deploy frontend
- [ ] Deploy realtime server
- [ ] Verify production Firebase separation
- [ ] Prepare interview/demo talking points

## Product Scope Note

Pixi Arena is moving toward a small multiplayer survival arena: up to 4 players share a lobby, avoid enemies, and the player who survives longest wins.

The goal remains interview-ready production quality over feature quantity. Authentication, registration, settings, cosmetics, matchmaking, and rule editors are outside the first multiplayer MVP.

## Current Multiplayer State

- Lobby flow is fully functional using the local Socket.IO server
- Client is fully server-state-driven via `lobby:state`
- Full multiplayer MVP loop exists: MultiplayerMenu → Lobby → MultiplayerPlaying → MatchResults
- Server owns match state, movement, enemies, damage, eliminations, winner detection, survival scoring, and `match:finished`
- Server tracks per-player location state (`lobby` | `playing` | `results`) and readiness for next match
- Match start requires all connected players to be in `lobby`
- Server simulation is resolution-agnostic and does not use viewport/camera dimensions
- Enemy spawning uses world-space ring distribution around players (`radius + angle`) with gate fallback
- Client camera is presentation-only and does not influence gameplay outcomes
- **Client maintains a buffer of recent authoritative snapshots, ordered by tick and deduped**
- **Player and enemy positions are interpolated only — render positions animate smoothly between buffered server snapshots**
- **Render clock advances each frame, capped at latest server time to handle tab resume without entity freeze**
- **Lives, score, elimination, damage flash, and match finish always use latestSnapshot for instant authority changes**
- **No client-side prediction; new entities fall back to latestSnapshot position to avoid origin flashes**
- MultiplayerPlayingScene renders players/enemies from interpolated positions and transitions to MatchResultsScene on `match:finished`
- MultiplayerPlayingScene now matches single-player world rendering patterns (background, boundaries, obstacles, camera)
- LobbyScene reflects readiness state and disables Start Match until all connected players are back in lobby
- MatchResultsScene shows winner/no winner, ranked players, survival time, score, local player marker, Back to Lobby, and Home
- MatchResultsScene emits `lobby:return` before rejoining LobbyScene; Home emits `lobby:leave`
- Match results now persist to Firestore after match completion
- Leaderboard score entries now persist to Firestore for each player
- HomeScene includes navigation to LeaderboardScene
- LeaderboardScene reads top leaderboard scores from Firestore via repository
- Same-tick eliminations use one deterministic ranking policy: survival time first, then lobby/player insertion order
- Match state is currently stored inside internal lobby state and may later be separated from public lobby payloads

## Current Next Step

Verify production environment separation using a single Firestore database plus environment field filters.

## Current Risk

- Production environment separation still needs verification.

## Manual QA Checklist

- [ ] Create lobby
- [ ] Join from second tab
- [ ] Host reassignment
- [ ] Start match
- [ ] Player movement sync
- [ ] Enemy sync
- [ ] Damage/elimination
- [ ] Match finish
- [ ] Results scene
- [ ] Back to lobby
- [ ] Home leave
