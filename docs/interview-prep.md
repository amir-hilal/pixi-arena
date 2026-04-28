# Pixi Arena Interview and Demo Talking Points

## 1. High-Level Architecture (1-2 min)

### Concise Script
Pixi Arena uses a server-authoritative multiplayer architecture. The client handles rendering, input capture, scene transitions, and UI feedback. The server owns simulation truth: movement resolution, enemy behavior, collisions, eliminations, winner detection, and match lifecycle. Clients send input intent, receive authoritative snapshots, and render from those snapshots. We added interpolation on the client to smooth visual motion between snapshots without changing authority or simulation outcomes.

### Key Points
- Client responsibilities:
	- render world, entities, and UI
	- collect input
	- manage scenes and transitions
	- show local feedback
- Server responsibilities:
	- authoritative simulation
	- lobby and match state
	- tick loop and snapshots
	- winner and elimination logic
- Why snapshots plus interpolation:
	- snapshots keep all clients consistent with server truth
	- interpolation improves visual smoothness under network jitter
	- no simulation trust on client

## 2. Multiplayer Flow

### Concise Script
Flow is Home to Multiplayer Menu to Lobby to Playing to Results, then either Back to Lobby or Home. We fixed readiness by tracking player location state as lobby, playing, or results. Start match now requires all connected players to be back in lobby, not just connected. This separates connection state from participation state and prevents invalid starts after a match ends.

### Key Points
- End-to-end flow:
	- lobby creation or join
	- host starts match
	- playing emits snapshots
	- results shown on match finish
	- persistence writes run after match finish
- Readiness fix:
	- per-player location state: lobby, playing, results
	- host start gate checks all connected players are in lobby
- Why connection does not equal participation:
	- connected users may still be in results scene
	- participation must be explicit to avoid race conditions

## 3. Key Technical Decisions

### Concise Script
Simulation is world-space and resolution-agnostic, so gameplay is consistent across devices. Clients send directional intent, not positions, preventing client-side teleport authority. We intentionally use full-state snapshots for version one simplicity and correctness. Interpolation is rendering-only, with no client-side prediction, so authority remains clean.

### Key Points
- World-space simulation:
	- no camera or viewport dependency in server logic
- Input model:
	- intent vector dx and dy, not absolute coordinates
- Snapshot model:
	- full state each tick for predictable client reconstruction
	- simpler correctness and debugging than delta for MVP
- Interpolation:
	- buffered snapshots
	- smooth render between snapshots
	- no prediction and no reconciliation complexity

## 4. Bugs Found and Fixed

### Concise Script
We fixed four impactful issues. First, an input pipeline bug where latest inputs were effectively lost between ticks. Second, enemy spawn fairness was tied to viewport assumptions, which broke consistency; we moved spawn logic to world space. Third, lobby readiness allowed starts when players were connected but not truly ready; fixed with location-state gating. Fourth, interpolation edge cases: tab resume caused render-time drift freeze, and newly spawned entities briefly rendered at origin; both were fixed with render clock capping and latest-snapshot fallback placement.

### Key Points
- Input pipeline bug:
	- latest input state got wiped unexpectedly
	- effect: stale or missing movement updates
	- fix: preserve and apply latest intent per tick
- Spawn fairness bug:
	- viewport-coupled spawn behavior
	- fix: world-space ring spawn with fallback strategy
- Lobby readiness bug:
	- connected treated as ready
	- fix: readiness equals location state in lobby
- Interpolation edge cases:
	- tab resume drift or freeze
	- origin flash for new entities
	- fixes: cap render clock to latest server time and position fallback

## 5. Firebase Design

### Concise Script
Firestore is persistence only, never realtime gameplay transport. We use repositories to isolate data access and keep scenes decoupled from Firestore APIs. Environment separation is free-tier friendly: one Firestore database, environment field on documents, and repository-level filters. Security rules keep reads public for version one but strictly validate creates and deny updates and deletes.

### Key Points
- Firestore role:
	- leaderboard and match result persistence
	- no gameplay-state transport
- Repository pattern:
	- clean data-access boundary
	- easier testing and refactoring
- Environment strategy:
	- one database plus environment field plus filtered reads
	- separate projects or databases deferred to hardening
- Rules:
	- allow read
	- allow validated create
	- deny update and delete
	- enforce field, type, bounds, environment, and timestamp checks

## 6. Trade-Offs

### Concise Script
We prioritized correctness and interview clarity over maximum performance optimization. No prediction reduces complexity and cheat surface but can feel less responsive at high round-trip time. Full snapshots simplify consistency but use more bandwidth than deltas. Single database with environment tagging is cost-effective for MVP but weaker isolation than separate projects. Bundle size is larger than ideal and accepted for development speed.

### Key Points
- No prediction:
	- pro: simpler authority model
	- con: perceived latency at high round-trip time
- Full snapshot versus delta:
	- pro: simpler client logic and easier debugging
	- con: higher network payload
- Bundle size versus simplicity:
	- pro: faster iteration
	- con: larger production chunks
- Single database versus multi-project:
	- pro: free-tier friendly and simple operations
	- con: weaker physical isolation

## 7. Demo Flow

### Concise Script
Show architecture through behavior rather than slides: create and join lobby, start match, show synchronized snapshots and smooth interpolation, finish match, then show persistence in leaderboard and match results. Narrate each design choice while demonstrating the visible outcome.

### Step-by-Step
1. Start client and local server, open two tabs.
2. Create lobby in tab A, join from tab B.
3. Show readiness gate:
	 - start is allowed only when all connected players are back in lobby.
4. Start match:
	 - move both players
	 - point out server-authoritative sync
	 - mention input as intent.
5. Show enemies and spawn behavior:
	 - explain world-space fairness.
6. Finish match:
	 - results scene with ranked output.
7. Return flows:
	 - Back to Lobby versus Home behavior.
8. Open leaderboard:
	 - show top scores read from Firestore.
9. Mention persistence timing:
	 - writes happen after match finish.

### What to Say While Showing
- Client renders, server decides truth.
- Movement comes from server snapshots; interpolation is visual only.
- Readiness is location-based, not only connection-based.
- Persistence is isolated behind repositories.
- Environment separation uses field filtering for MVP.

## 8. Likely Interviewer Questions and Answers

### Latency Handling
- Question: How do you handle latency without prediction?
- Answer: We smooth rendering via snapshot interpolation and keep authority server-side. For version one, we chose consistency and simplicity. Prediction and reconciliation are future steps if responsiveness needs to improve.

### Scaling Multiplayer
- Question: How would you scale beyond small lobbies?
- Answer: Move from in-memory lobby and match state to distributed session management, shard matches across workers, reduce snapshot payloads with delta or compression, and add observability plus autoscaling around tick loop and socket fan-out.

### Cheat Prevention
- Question: How do you prevent cheating?
- Answer: Clients never send positions or damage outcomes, only intent. Server computes all outcomes. Firestore writes are rule-validated and can move server-side for stronger trust in production.

### Production Hardening
- Question: What would you harden first?
- Answer: Add auth and server-issued identity, move persistence writes to trusted backend paths, add rate limiting and abuse controls, tighten Firestore rules further, split Firebase projects or databases per environment, and add CI checks for rules and index deployment.
