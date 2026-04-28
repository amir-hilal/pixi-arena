import {
  MAX_SPAWN_RETRIES,
  MINIMUM_SPAWN_INTERVAL_SECONDS,
  SPAWN_INTERVAL_SCALE_FACTOR,
  SPAWN_INTERVAL_SECONDS,
  SPAWN_RADIUS_MAX,
  SPAWN_RADIUS_MIN,
  SPAWN_SAFE_RADIUS,
} from '../constants/simulation';
import type { GateState, Rect, Vector2 } from '../types/index';

interface Bounds {
  width: number;
  height: number;
}

const TWO_PI = Math.PI * 2;

export function getEnemySpawnIntervalSeconds(
  survivalTimeSeconds: number,
): number {
  return Math.max(
    MINIMUM_SPAWN_INTERVAL_SECONDS,
    SPAWN_INTERVAL_SECONDS -
      survivalTimeSeconds * SPAWN_INTERVAL_SCALE_FACTOR,
  );
}

export function getEnemySpawnPosition(
  playerPosition: Vector2,
  bounds: Bounds,
  gates: readonly GateState[],
  obstacles: readonly Rect[],
  random: () => number = Math.random,
): Vector2 {
  // Try several random world-space ring positions around the player.
  for (let attempt = 0; attempt < MAX_SPAWN_RETRIES; attempt++) {
    const angle = random() * TWO_PI;
    const radius =
      SPAWN_RADIUS_MIN + random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    const x = playerPosition.x + Math.cos(angle) * radius;
    const y = playerPosition.y + Math.sin(angle) * radius;

    if (!isPointWithinBounds({ x, y }, bounds)) {
      continue;
    }

    if (isPointInsideObstacleSafeRadius({ x, y }, obstacles)) {
      continue;
    }

    return { x, y };
  }

  return selectEnemyGateSpawn(playerPosition, gates, obstacles);
}

export function selectEnemyGateSpawn(
  playerPosition: Vector2,
  gates: readonly GateState[],
  obstacles: readonly Rect[],
): Vector2 {
  const candidates = [...gates];

  let bestX = candidates[0].spawnX;
  let bestY = candidates[0].spawnY;
  let bestDist = Infinity;

  for (const gate of candidates) {
    if (isPointInsideObstacleSafeRadius({ x: gate.spawnX, y: gate.spawnY }, obstacles)) {
      continue;
    }

    const dist = Math.hypot(
      gate.spawnX - playerPosition.x,
      gate.spawnY - playerPosition.y,
    );

    if (dist < bestDist) {
      bestDist = dist;
      bestX = gate.spawnX;
      bestY = gate.spawnY;
    }
  }

  return { x: bestX, y: bestY };
}

export function stepEnemyTowardPosition(
  enemyPosition: Vector2,
  targetPosition: Vector2,
  deltaSeconds: number,
  speed: number,
): void {
  const movementX = targetPosition.x - enemyPosition.x;
  const movementY = targetPosition.y - enemyPosition.y;
  const movementLength = Math.hypot(movementX, movementY);

  if (movementLength === 0) {
    return;
  }

  const distance = speed * deltaSeconds;

  enemyPosition.x += (movementX / movementLength) * distance;
  enemyPosition.y += (movementY / movementLength) * distance;
}

export function isEnemyWithinValidBounds(
  enemyPosition: Vector2,
  bounds: Bounds,
  margin: number,
): boolean {
  return (
    enemyPosition.x >= -margin &&
    enemyPosition.x <= bounds.width + margin &&
    enemyPosition.y >= -margin &&
    enemyPosition.y <= bounds.height + margin
  );
}

export function getEnemyCullMargin(): number {
  return SPAWN_RADIUS_MAX + 100;
}

function isPointWithinBounds(pos: Vector2, bounds: Bounds): boolean {
  return (
    pos.x >= 0 &&
    pos.x <= bounds.width &&
    pos.y >= 0 &&
    pos.y <= bounds.height
  );
}

function isPointInsideObstacleSafeRadius(
  pos: Vector2,
  obstacles: readonly Rect[],
): boolean {
  for (const rect of obstacles) {
    const nearestX = Math.max(rect.x, Math.min(pos.x, rect.x + rect.width));
    const nearestY = Math.max(rect.y, Math.min(pos.y, rect.y + rect.height));

    if (Math.hypot(pos.x - nearestX, pos.y - nearestY) < SPAWN_SAFE_RADIUS) {
      return true;
    }
  }

  return false;
}
