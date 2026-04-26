# Architecture

## High-Level Architecture

Pixi Arena separates engine setup, gameplay data, gameplay logic, scene orchestration, API access, and UI. Each layer should have one clear reason to change.

## Separation of Concerns

- Rendering displays state.
- Systems update state.
- Entities hold state.
- Scenes coordinate systems, entities, assets, and transitions.
- API code stays outside game systems unless data is explicitly passed in.

## Game Modules

### core

Engine-level code such as Pixi application setup, timing, global configuration, and shared contracts.

### entities

Pure data holders for game objects such as the player, enemies, projectiles, or pickups. Entities should not own behavior.

### systems

Logic that operates on entities, such as movement, collision, spawning, scoring, and cleanup.

### scenes

Orchestration units for menu, gameplay, pause, and game over flows. Scenes decide which systems run and which entities are active.

## Game Loop

The game loop should keep update and render responsibilities separate. Update work advances state using elapsed time. Render work reflects the latest state through Pixi display objects. This separation makes performance issues easier to isolate and gameplay behavior easier to test.
