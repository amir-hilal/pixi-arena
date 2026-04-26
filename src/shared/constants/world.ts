import type { GateState } from '../types/index';

export const WORLD_WIDTH = 3000;
export const WORLD_HEIGHT = 3000;

/** Thickness of the boundary walls drawn around the world edge. */
export const BOUNDARY_WALL_THICKNESS = 28;

/** Inset from the boundary wall inner face where gate spawn points are placed. */
export const GATE_SPAWN_INSET = BOUNDARY_WALL_THICKNESS + 62;

/** Four cardinal gates, one per world edge. Enemies spawn at the given position. */
export const WORLD_GATES: readonly GateState[] = [
  { spawnX: WORLD_WIDTH / 2,                spawnY: GATE_SPAWN_INSET },                   // North
  { spawnX: WORLD_WIDTH / 2,                spawnY: WORLD_HEIGHT - GATE_SPAWN_INSET },     // South
  { spawnX: GATE_SPAWN_INSET,               spawnY: WORLD_HEIGHT / 2 },                   // West
  { spawnX: WORLD_WIDTH - GATE_SPAWN_INSET, spawnY: WORLD_HEIGHT / 2 },                   // East
];
