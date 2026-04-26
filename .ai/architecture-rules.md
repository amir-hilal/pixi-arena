# Architecture Rules

- Do not directly couple systems to each other.
- Entities are pure data holders.
- Systems contain gameplay logic.
- Scenes orchestrate entities, systems, assets, and transitions.
- Rendering should reflect state, not own state transitions.
- API clients must not be imported directly into gameplay systems.
- Shared utilities must stay small and domain-neutral.
