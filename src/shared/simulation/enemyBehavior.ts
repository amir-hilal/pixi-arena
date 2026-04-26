import {
  GATE_FALLBACK_MIN_DIST,
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

export interface ViewportRect {
  worldLeft: number;
  worldTop: number;
  worldRight: number;
  worldBottom: number;
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
  viewport: ViewportRect,
  random: () => number = Math.random,
): Vector2 {
  // Try several random near-player angles; skip positions that are too close
  // after world-edge clamping or land inside an obstacle.
  for (let attempt = 0; attempt < MAX_SPAWN_RETRIES; attempt++) {
    const angle = random() * TWO_PI;
    const radius = SPAWN_RADIUS_MIN + random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    const x = Math.min(
      Math.max(0, playerPosition.x + Math.cos(angle) * radius),
      bounds.width,
    );
    const y = Math.min(
      Math.max(0, playerPosition.y + Math.sin(angle) * radius),
      bounds.height,
    );
    const actualDist = Math.hypot(x - playerPosition.x, y - playerPosition.y);

    if (
      actualDist >= GATE_FALLBACK_MIN_DIST &&
      !isPointInsideObstacleSafeRadius({ x, y }, obstacles)
    ) {
      return { x, y };
    }
  }

  return selectEnemyGateSpawn(playerPosition, gates, viewport, obstacles);
}

export function selectEnemyGateSpawn(
  playerPosition: Vector2,
  gates: readonly GateState[],
  viewport: ViewportRect,
  obstacles: readonly Rect[],
): Vector2 {
  const offScreen = gates.filter((gate) => !isGateInViewport(gate, viewport));
  const candidates = offScreen.length > 0 ? offScreen : [...gates];

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

function isGateInViewport(gate: GateState, viewport: ViewportRect): boolean {
  return (
    gate.spawnX >= viewport.worldLeft &&
    gate.spawnX <= viewport.worldRight &&
    gate.spawnY >= viewport.worldTop &&
    gate.spawnY <= viewport.worldBottom
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
