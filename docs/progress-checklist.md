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
- [ ] Finalize responsive controls
- [ ] Stabilize scene flow

## World Expansion

- [ ] Add world coordinate system
- [ ] Add camera follow
- [ ] Add ground/tile background
- [ ] Add obstacles
- [ ] Add obstacle collision
- [ ] Add world boundaries

## Multiplayer

- [ ] Design shared simulation types
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
