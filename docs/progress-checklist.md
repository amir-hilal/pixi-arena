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
- [x] Phase F — Implement LobbyScene with lobby state rendering, host controls, leave flow, countdown, and match:started subscription
- [x] Phase I movement slice — server-owned match state, player input, authoritative movement tick loop, `match:snapshot`, and snapshot-driven player rendering
- [x] Phase I.2 — Add server-owned enemies and enemy snapshots
- [x] Phase I.3 — Add server-owned damage/collisions and eliminations
- [x] Phase I.4 — Add winner/game over logic, `match:finished`, survival scoring, and deterministic result ranking
- [x] Phase H — Add MatchResultsScene/results UI
- [ ] Phase G — Expand client gameplay rendering from authoritative server snapshots

## Firebase Persistence

- [x] Document Firebase env config
- [ ] Add Firebase initialization layer
- [ ] Add Firestore repositories
- [ ] Save leaderboard scores
- [ ] Save match results
- [ ] Add leaderboard scene
- [ ] Draft Firestore security rules

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
- MultiplayerPlayingScene renders players/enemies from `match:snapshot` and transitions to MatchResultsScene on `match:finished`
- MatchResultsScene shows winner/no winner, ranked players, survival time, score, local player marker, Back to Lobby, and Home
- Back to Lobby uses server `lobby:state`; Home emits `lobby:leave`
- Same-tick eliminations use one deterministic ranking policy: survival time first, then lobby/player insertion order
- Solo lobby start remains dev-only behavior for local testing
- No interpolation, Firebase, leaderboard, or persistence exists yet
- Match state is currently stored inside internal lobby state and may later be separated from public lobby payloads

## Current Next Step

Run full two-tab multiplayer QA and fix any discovered bugs.

## Current Risk

The full local multiplayer MVP loop exists, but it still needs a complete two-tab QA pass.
Firebase persistence, leaderboard, interpolation, and production deployment are still pending.

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
