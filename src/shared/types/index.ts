// ── Primitives ────────────────────────────────────────────────────────────────

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── World ─────────────────────────────────────────────────────────────────────

export interface GateState {
  spawnX: number;
  spawnY: number;
}

export interface ObstacleState {
  rect: Rect;
}

export interface WorldState {
  width: number;
  height: number;
  boundaryThickness: number;
  obstacles: readonly ObstacleState[];
  gates: readonly GateState[];
}

// ── Input ─────────────────────────────────────────────────────────────────────

export interface InputState {
  /** Normalized horizontal axis in the range [-1, 1]. */
  dx: number;
  /** Normalized vertical axis in the range [-1, 1]. */
  dy: number;
}

// ── Simulation entities ───────────────────────────────────────────────────────

export interface PlayerState {
  id: string;
  position: Vector2;
  lives: number;
  isEliminated: boolean;
  survivalTimeSeconds: number;
  score: number;
}

export interface EnemyState {
  id: string;
  position: Vector2;
}

// ── Match ─────────────────────────────────────────────────────────────────────

export type MatchPhase = 'waiting' | 'countdown' | 'playing' | 'finished';

export interface MatchState {
  matchId: string;
  phase: MatchPhase;
  tick: number;
  players: PlayerState[];
  enemies: EnemyState[];
  elapsedSeconds: number;
}

// ── Network snapshots ─────────────────────────────────────────────────────────

export interface MatchSnapshot {
  tick: number;
  players: readonly PlayerState[];
  enemies: readonly EnemyState[];
  elapsedSeconds: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  rank: number;
  survivalTimeSeconds: number;
  score: number;
}

export interface MatchResult {
  matchId: string;
  /** null if all players were eliminated simultaneously. */
  winnerId: string | null;
  players: PlayerResult[];
  durationSeconds: number;
}
