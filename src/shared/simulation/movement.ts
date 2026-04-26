import type { PlayerState, InputState, WorldState } from '../types/index';

/**
 * Advances the player's position by `speed * deltaSeconds` along the normalized
 * input direction. Mutates `state.position` in place. No-op for zero-length input.
 */
export function applyPlayerInput(
  state: PlayerState,
  input: InputState,
  deltaSeconds: number,
  speed: number,
): void {
  const length = Math.hypot(input.dx, input.dy);

  if (length === 0) {
    return;
  }

  state.position.x += (input.dx / length) * speed * deltaSeconds;
  state.position.y += (input.dy / length) * speed * deltaSeconds;
}

/**
 * Clamps the player's position to the playable area inside the boundary walls.
 * Mutates `state.position` in place.
 */
export function clampPlayerToBounds(
  state: PlayerState,
  world: WorldState,
  radius: number,
): void {
  const min = world.boundaryThickness + radius;
  const maxX = Math.max(min, world.width - world.boundaryThickness - radius);
  const maxY = Math.max(min, world.height - world.boundaryThickness - radius);

  state.position.x = Math.min(Math.max(state.position.x, min), maxX);
  state.position.y = Math.min(Math.max(state.position.y, min), maxY);
}
