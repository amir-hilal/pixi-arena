# Pixi Arena

Pixi Arena is a production-focused browser game project built with TypeScript, Vite, and PixiJS. This repository starts with a clean foundation for scalable game development before gameplay code is introduced.

## Tech Stack

- TypeScript for strict, predictable application code
- Vite for fast local development and production builds
- PixiJS for high-performance 2D rendering in the browser

## Folder Structure

```text
src/
  game/
    core/       Engine-level code such as app bootstrap, loop, and shared contracts
    entities/   Data structures for game objects such as players and enemies
    systems/    Gameplay logic such as movement, collision, and spawning
    scenes/     Screen-level orchestration such as menu, gameplay, and game over
    utils/      Small shared helpers with no domain ownership
  api/          External API clients and request helpers
  ui/           DOM or overlay UI code outside the Pixi render tree
  assets/       Source-controlled game assets
docs/           Project planning, architecture, and delivery notes
.ai/            AI collaboration rules, prompts, and review checklists
public/         Static files served directly by Vite
```

## Development Approach

Development will proceed in small, reviewable steps:

1. Initialize the Vite, TypeScript, and PixiJS runtime.
2. Add a minimal application shell and game loop.
3. Introduce entities as data, then systems as behavior.
4. Add scenes to orchestrate gameplay flow.
5. Layer in UI, API integration, polish, optimization, and deployment.

## Principles

- Performance: keep rendering and updates intentional.
- Simplicity: prefer clear code over premature abstraction.
- Clarity: separate state, logic, rendering, and orchestration.
- Predictability: keep state transitions explicit and testable.
