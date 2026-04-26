import type { Vector2 } from '../types/index';

interface BoundsRect {
  width: number;
  height: number;
}

/**
 * Applies a directional input to a 2D position, advancing it by
 * `speed * deltaSeconds` along the normalized direction.
 * Mutates `position` in place. No-op if the direction vector is zero-length.
 */
export function applyPlayerInput(
  position: Vector2,
  direction: Vector2,
  speed: number,
  deltaSeconds: number,
): void {
  const length = Math.hypot(direction.x, direction.y);

  if (length === 0) {
    return;
  }

  position.x += (direction.x / length) * speed * deltaSeconds;
  position.y += (direction.y / length) * speed * deltaSeconds;
}

/**
 * Clamps `position` to the playable area inside the boundary walls.
 * Mutates `position` in place.
 */
export function clampPlayerToBounds(
  position: Vector2,
  radius: number,
  bounds: BoundsRect,
  boundaryThickness: number,
): void {
  const min = boundaryThickness + radius;
  const maxX = Math.max(min, bounds.width - boundaryThickness - radius);
  const maxY = Math.max(min, bounds.height - boundaryThickness - radius);

  position.x = Math.min(Math.max(position.x, min), maxX);
  position.y = Math.min(Math.max(position.y, min), maxY);
}
