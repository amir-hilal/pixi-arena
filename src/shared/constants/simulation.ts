/** Base time in seconds between enemy spawns at t=0. */
export const SPAWN_INTERVAL_SECONDS = 1.5;

/** Reduction in spawn interval per second of survival time. */
export const SPAWN_INTERVAL_SCALE_FACTOR = 0.02;

/** Minimum spawn interval — difficulty floor. */
export const MINIMUM_SPAWN_INTERVAL_SECONDS = 0.45;

export const SPAWN_RADIUS_MIN = 400;
export const SPAWN_RADIUS_MAX = 650;

/**
 * If a near-player spawn attempt ends up closer than this to the player
 * (due to world-edge clamping), fall back to a gate spawn instead.
 */
export const GATE_FALLBACK_MIN_DIST = SPAWN_RADIUS_MIN * 0.6;

/** Maximum near-player spawn attempts before falling back to a gate. */
export const MAX_SPAWN_RETRIES = 5;

/** Minimum clearance in units from any obstacle rect edge for a spawn point. */
export const SPAWN_SAFE_RADIUS = 16;

/** Score points awarded per second of survival. */
export const POINTS_PER_SECOND = 10;

/**
 * Obstacles whose center falls within this radius of the player start position
 * are excluded during map initialization.
 */
export const PLAYER_SAFE_RADIUS = 380;
