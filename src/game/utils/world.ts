export const WORLD_WIDTH = 3000;
export const WORLD_HEIGHT = 3000;

/** Thickness of the boundary walls drawn around the world edge. */
export const BOUNDARY_WALL_THICKNESS = 28;

export interface WorldBounds {
  width: number;
  height: number;
}

export function getWorldBounds(): WorldBounds {
  return { width: WORLD_WIDTH, height: WORLD_HEIGHT };
}

/** A gate on the world boundary. Enemies spawn at the given position. */
export interface Gate {
  spawnX: number;
  spawnY: number;
}

// Spawn position is past the wall thickness with a small buffer.
const GATE_SPAWN_INSET = BOUNDARY_WALL_THICKNESS + 22;

/** Four cardinal gates, one per world edge. Used by EnemySystem as fallback spawn points. */
export const WORLD_GATES: readonly Gate[] = [
  { spawnX: WORLD_WIDTH / 2,                spawnY: GATE_SPAWN_INSET },                   // North
  { spawnX: WORLD_WIDTH / 2,                spawnY: WORLD_HEIGHT - GATE_SPAWN_INSET },     // South
  { spawnX: GATE_SPAWN_INSET,               spawnY: WORLD_HEIGHT / 2 },                   // West
  { spawnX: WORLD_WIDTH - GATE_SPAWN_INSET, spawnY: WORLD_HEIGHT / 2 },                   // East
];
