# Multiplayer Architecture

## Overview

Pixi Arena will evolve from a single-player survival prototype into a real-time multiplayer survival arena. Up to 4 players join the same lobby, avoid enemies, and compete to survive the longest.

The map will become larger than the screen. The camera will follow the local player, while the world includes ground visuals, obstacles, and boundaries.

## Realtime Transport

Use WebSockets or Socket.IO for realtime gameplay.

- Realtime gameplay needs low-latency bidirectional messaging.
- Clients must receive frequent game snapshots.
- The server must receive continuous player input.
- Socket.IO is acceptable initially because it simplifies rooms, reconnect behavior, and event naming.

Do not use webhooks for gameplay. Webhooks are request callbacks between services, not a realtime client/server transport.

Do not use Firestore for high-frequency movement. Firestore is not designed for 20-30 gameplay updates per second per lobby and would add latency, cost, and consistency problems.

## Server-Authoritative Model

The multiplayer server owns the simulation. Clients send input intent, not final positions.

The server owns:

- player positions
- enemy movement
- collisions
- damage and lives
- eliminations
- game start and game over
- winner selection

Clients render snapshots from the server and may interpolate between snapshots for smooth motion.

## Responsibilities

| Area | Client | Server |
| --- | --- | --- |
| Input | Capture keyboard/touch input and send input state | Validate and apply input |
| Player movement | Render latest known/interpolated state | Own authoritative position and bounds checks |
| Enemies | Render snapshots | Spawn, move, and remove enemies |
| Collisions | Render feedback | Detect collisions and apply damage |
| Lives/elimination | Display state | Own lives, elimination, and winner logic |
| Lobby state | Display lobby/countdown/results | Own lobby lifecycle |
| Persistence | Request save/fetch through API/Firebase layer | Save match results and leaderboard data after match completion |

## Lobby Model

Each lobby supports up to 4 players.

Lobby states:

- `waiting`: players can join or leave.
- `countdown`: lobby is full enough to start; inputs may be accepted but game state is not advancing.
- `playing`: authoritative simulation is running.
- `finished`: winner and match results are final.

## Realtime Event Plan

Client to server:

- `lobby:create`
- `lobby:join`
- `lobby:leave`
- `player:input`

Server to client:

- `lobby:state`
- `game:countdown`
- `game:snapshot`
- `player:damaged`
- `player:eliminated`
- `game:finished`

## Tick Rate

- Server tick rate: start at 20-30 ticks per second.
- Client render rate: target 60 FPS.
- Client rendering should interpolate between server snapshots to reduce jitter.

## Anti-Cheat Baseline

- Clients send input only.
- Clients do not submit final positions, collisions, damage, or winner state.
- Server validates movement, world boundaries, collision, lives, eliminations, and game finish conditions.
