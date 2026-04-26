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
- [ ] Create realtime server
- [ ] Add Socket.IO
- [ ] Add lobby create/join/leave
- [ ] Add player input events
- [ ] Add server-authoritative movement
- [ ] Add snapshot broadcasting
- [ ] Add remote player rendering
- [ ] Add interpolation
- [ ] Add server-owned enemies
- [ ] Add multiplayer game over/winner logic

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
