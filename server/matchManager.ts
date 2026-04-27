import {
  INITIAL_LIVES,
  PLAYER_RADIUS,
  PLAYER_SPEED,
} from '../src/shared/constants/player.js';
import { ENEMY_SPEED } from '../src/shared/constants/enemy.js';
import {
  BOUNDARY_WALL_THICKNESS,
  WORLD_GATES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../src/shared/constants/world.js';
import {
  applyPlayerInput,
  clampPlayerToBounds,
} from '../src/shared/simulation/movement.js';
import {
  getEnemyCullMargin,
  getEnemySpawnIntervalSeconds,
  getEnemySpawnPosition,
  isEnemyWithinValidBounds,
  stepEnemyTowardPosition,
} from '../src/shared/simulation/enemyBehavior.js';
import type {
  EnemyState,
  InputState,
  MatchSnapshot,
  PlayerState,
  Vector2,
  WorldState,
} from '../src/shared/types/index.js';
import type { LobbyState, ServerMatchState } from './types.js';

const TICK_RATE = 30;
const TICK_INTERVAL_MS = 1000 / TICK_RATE;
const TICK_DELTA_SECONDS = 1 / TICK_RATE;
const SPAWN_SPACING = 96;
const SERVER_VIEWPORT = {
  worldLeft: 0,
  worldTop: 0,
  worldRight: WORLD_WIDTH,
  worldBottom: WORLD_HEIGHT,
};

const worldState: WorldState = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  boundaryThickness: BOUNDARY_WALL_THICKNESS,
  obstacles: [],
  gates: WORLD_GATES,
};

const latestInputs = new Map<string, Map<string, InputState>>();
const tickIntervals = new Map<string, NodeJS.Timeout>();
const enemySpawnTimers = new Map<string, number>();
const enemyIds = new Map<string, number>();

export function initializeMatch(lobby: LobbyState): ServerMatchState {
  const match: ServerMatchState = {
    matchId: `match-${Date.now().toString(36)}`,
    phase: 'playing',
    tick: 0,
    players: lobby.players.map((player, index) =>
      createPlayerState(player.id, index),
    ),
    enemies: [],
    elapsedSeconds: 0,
  };

  lobby.match = match;
  latestInputs.set(lobby.lobbyCode, new Map());
  enemySpawnTimers.set(lobby.lobbyCode, 0);
  enemyIds.set(lobby.lobbyCode, 0);

  return match;
}

export function startMatchLoop(
  lobby: LobbyState,
  onSnapshot: (snapshot: MatchSnapshot) => void,
): void {
  stopMatchLoop(lobby.lobbyCode);

  const interval = setInterval(() => {
    const snapshot = stepMatch(lobby);

    if (snapshot !== null) {
      onSnapshot(snapshot);
    }
  }, TICK_INTERVAL_MS);

  tickIntervals.set(lobby.lobbyCode, interval);
}

export function stopMatchLoop(lobbyCode: string): void {
  const interval = tickIntervals.get(lobbyCode);

  if (interval !== undefined) {
    clearInterval(interval);
    tickIntervals.delete(lobbyCode);
  }

  latestInputs.delete(lobbyCode);
  enemySpawnTimers.delete(lobbyCode);
  enemyIds.delete(lobbyCode);
}

export function storePlayerInput(
  lobbyCode: string,
  playerId: string,
  input: InputState,
): void {
  const matchInputs = latestInputs.get(lobbyCode);

  if (matchInputs === undefined) {
    return;
  }

  matchInputs.set(playerId, {
    dx: clampInputAxis(input.dx),
    dy: clampInputAxis(input.dy),
  });
}

export function removePlayerFromMatch(
  lobbyCode: string,
  playerId: string,
  match?: ServerMatchState,
): void {
  latestInputs.get(lobbyCode)?.delete(playerId);

  if (match !== undefined) {
    match.players = match.players.filter((player) => player.id !== playerId);
  }
}

export function getMatchSnapshot(
  match: ServerMatchState,
): MatchSnapshot {
  return {
    tick: match.tick,
    players: match.players,
    enemies: match.enemies,
    elapsedSeconds: match.elapsedSeconds,
  };
}

function stepMatch(lobby: LobbyState): MatchSnapshot | null {
  const match = lobby.match;

  if (match === undefined || lobby.status !== 'playing') {
    return null;
  }

  const matchInputs = latestInputs.get(lobby.lobbyCode);

  for (const player of match.players) {
    const input = matchInputs?.get(player.id) ?? { dx: 0, dy: 0 };

    applyPlayerInput(player, input, TICK_DELTA_SECONDS, PLAYER_SPEED);
    clampPlayerToBounds(player, worldState, PLAYER_RADIUS);
  }

  spawnEnemies(lobby, match);
  moveEnemies(match);
  cullEnemies(match);

  match.tick += 1;
  match.elapsedSeconds += TICK_DELTA_SECONDS;

  return getMatchSnapshot(match);
}

function spawnEnemies(lobby: LobbyState, match: ServerMatchState): void {
  const target = getFirstActivePlayer(match.players);

  if (target === null) {
    return;
  }

  const nextSpawnTimer =
    (enemySpawnTimers.get(lobby.lobbyCode) ?? 0) + TICK_DELTA_SECONDS;
  const spawnInterval = getEnemySpawnIntervalSeconds(match.elapsedSeconds);

  if (nextSpawnTimer < spawnInterval) {
    enemySpawnTimers.set(lobby.lobbyCode, nextSpawnTimer);
    return;
  }

  enemySpawnTimers.set(lobby.lobbyCode, 0);
  match.enemies.push(createEnemyState(lobby.lobbyCode, target.position));
}

function moveEnemies(match: ServerMatchState): void {
  for (const enemy of match.enemies) {
    const target = getClosestActivePlayer(enemy.position, match.players);

    if (target !== null) {
      stepEnemyTowardPosition(
        enemy.position,
        target.position,
        TICK_DELTA_SECONDS,
        ENEMY_SPEED,
      );
    }
  }
}

function cullEnemies(match: ServerMatchState): void {
  const bounds = { width: WORLD_WIDTH, height: WORLD_HEIGHT };
  const margin = getEnemyCullMargin();

  match.enemies = match.enemies.filter((enemy) =>
    isEnemyWithinValidBounds(enemy.position, bounds, margin),
  );
}

function getFirstActivePlayer(players: readonly PlayerState[]): PlayerState | null {
  return players.find((player) => !player.isEliminated) ?? null;
}

function getClosestActivePlayer(
  position: Vector2,
  players: readonly PlayerState[],
): PlayerState | null {
  let closestPlayer: PlayerState | null = null;
  let closestDistance = Infinity;

  for (const player of players) {
    if (player.isEliminated) {
      continue;
    }

    const distance = Math.hypot(
      player.position.x - position.x,
      player.position.y - position.y,
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestPlayer = player;
    }
  }

  return closestPlayer;
}

function createEnemyState(lobbyCode: string, targetPosition: Vector2): EnemyState {
  const nextEnemyId = (enemyIds.get(lobbyCode) ?? 0) + 1;
  enemyIds.set(lobbyCode, nextEnemyId);

  return {
    id: `enemy-${nextEnemyId}`,
    position: getEnemySpawnPosition(
      targetPosition,
      { width: WORLD_WIDTH, height: WORLD_HEIGHT },
      WORLD_GATES,
      [],
      SERVER_VIEWPORT,
    ),
  };
}

function createPlayerState(playerId: string, index: number): PlayerState {
  const centerX = WORLD_WIDTH / 2;
  const centerY = WORLD_HEIGHT / 2;
  const offset = index - 1.5;

  return {
    id: playerId,
    position: {
      x: centerX + offset * SPAWN_SPACING,
      y: centerY,
    },
    lives: INITIAL_LIVES,
    isEliminated: false,
    survivalTimeSeconds: 0,
    score: 0,
  };
}

function clampInputAxis(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value));
}
