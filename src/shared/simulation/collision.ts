import type { Vector2, Rect } from '../types/index';

interface CircleCollider {
  position: Vector2;
  radius: number;
}

/**
 * Returns true if two circle colliders overlap.
 * Uses a squared-distance check to avoid a square root.
 */
export function circlesOverlap(a: CircleCollider, b: CircleCollider): boolean {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const collisionDistance = a.radius + b.radius;

  return dx * dx + dy * dy <= collisionDistance * collisionDistance;
}

/**
 * Computes the pushback vector needed to move a circle out of an axis-aligned rectangle.
 * Returns null if the circle does not overlap the rect.
 * The caller should add the returned vector to the circle's position.
 */
export function circleRectPushback(
  circlePos: Vector2,
  radius: number,
  rect: Rect,
): Vector2 | null {
  const nearestX = Math.max(rect.x, Math.min(circlePos.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(circlePos.y, rect.y + rect.height));
  const dx = circlePos.x - nearestX;
  const dy = circlePos.y - nearestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) {
    return null;
  }

  const dist = Math.sqrt(distSq);

  if (dist === 0) {
    // Degenerate: center is exactly on the rect boundary; push upward.
    return { x: 0, y: rect.y - radius - circlePos.y };
  }

  const overlap = radius - dist;

  return { x: (dx / dist) * overlap, y: (dy / dist) * overlap };
}
