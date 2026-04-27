import {
  INITIAL_LIVES,
  PLAYER_RADIUS,
  PLAYER_SPEED,
} from '../src/shared/constants/player.js';
import { POINTS_PER_SECOND } from '../src/shared/constants/simulation.js';
import {
  ENEMY_RADIUS,
  ENEMY_SPEED,
} from '../src/shared/constants/enemy.js';
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
import {
  applyDamage,
  collectEnemyCollisions,
  computeWinner,
} from '../src/shared/simulation/damage.js';
import type {
  EnemyState,
  InputState,
  MatchResult,
  MatchSnapshot,
  PlayerResult,
  PlayerState,
  Vector2,
  WorldState,
} from '../src/shared/types/index.js';
import type {
  LobbyState,
  MatchFinishedPayload,
  PlayerEliminatedPayload,
  ServerMatchState,
} from './types.js';

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

interface MatchTickResult {
  snapshot: MatchSnapshot;
  eliminations: PlayerEliminatedPayload[];
  finished: MatchFinishedPayload | null;
}

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
  onPlayerEliminated: (elimination: PlayerEliminatedPayload) => void,
  onMatchFinished: (finished: MatchFinishedPayload) => void,
): void {
  clearMatchInterval(lobby.lobbyCode);

  const interval = setInterval(() => {
    const result = stepMatch(lobby);

    if (result !== null) {
      for (const elimination of result.eliminations) {
        onPlayerEliminated(elimination);
      }

      onSnapshot(result.snapshot);

      if (result.finished !== null) {
        onMatchFinished(result.finished);
        stopMatchLoop(lobby.lobbyCode);
      }
    }
  }, TICK_INTERVAL_MS);

  tickIntervals.set(lobby.lobbyCode, interval);
}

export function stopMatchLoop(lobbyCode: string): void {
  clearMatchInterval(lobbyCode);
  latestInputs.delete(lobbyCode);
  enemySpawnTimers.delete(lobbyCode);
  enemyIds.delete(lobbyCode);
}

function clearMatchInterval(lobbyCode: string): void {
  const interval = tickIntervals.get(lobbyCode);

  if (interval !== undefined) {
    clearInterval(interval);
    tickIntervals.delete(lobbyCode);
  }
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

function stepMatch(lobby: LobbyState): MatchTickResult | null {
  const match = lobby.match;

  if (
    match === undefined ||
    lobby.status !== 'playing' ||
    match.phase !== 'playing'
  ) {
    return null;
  }

  const matchInputs = latestInputs.get(lobby.lobbyCode);

  for (const player of match.players) {
    if (player.isEliminated) {
      continue;
    }

    const input = matchInputs?.get(player.id) ?? { dx: 0, dy: 0 };

    applyPlayerInput(player, input, TICK_DELTA_SECONDS, PLAYER_SPEED);
    clampPlayerToBounds(player, worldState, PLAYER_RADIUS);
    player.survivalTimeSeconds += TICK_DELTA_SECONDS;
    player.score += POINTS_PER_SECOND * TICK_DELTA_SECONDS;
  }

  spawnEnemies(lobby, match);
  moveEnemies(match);
  const eliminations = resolveEnemyCollisions(match);
  cullEnemies(match);

  match.tick += 1;
  match.elapsedSeconds += TICK_DELTA_SECONDS;
  const finished = resolveMatchFinished(lobby, match);

  return {
    snapshot: getMatchSnapshot(match),
    eliminations,
    finished,
  };
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

function resolveEnemyCollisions(
  match: ServerMatchState,
): PlayerEliminatedPayload[] {
  const hitEnemyIds = new Set<string>();
  const newlyEliminatedIds = new Set<string>();
  const enemyColliders = match.enemies.map((enemy) => ({
    id: enemy.id,
    position: enemy.position,
    radius: ENEMY_RADIUS,
  }));

  for (const player of match.players) {
    if (player.isEliminated) {
      continue;
    }

    const hits = collectEnemyCollisions(
      {
        position: player.position,
        radius: PLAYER_RADIUS,
      },
      enemyColliders.filter((enemy) => !hitEnemyIds.has(enemy.id)),
    );

    if (hits.length === 0) {
      continue;
    }

    for (const enemy of hits) {
      hitEnemyIds.add(enemy.id);
    }

    applyDamage(player, hits.length);

    if (player.isEliminated) {
      newlyEliminatedIds.add(player.id);
    }
  }

  if (hitEnemyIds.size > 0) {
    match.enemies = match.enemies.filter((enemy) => !hitEnemyIds.has(enemy.id));
  }

  return createEliminationPayloads(match.players, newlyEliminatedIds);
}

function resolveMatchFinished(
  lobby: LobbyState,
  match: ServerMatchState,
): MatchFinishedPayload | null {
  const activePlayers = match.players.filter((player) => !player.isEliminated);

  if (activePlayers.length > 1) {
    return null;
  }

  match.phase = 'finished';

  return {
    result: createMatchResult(lobby, match),
  };
}

function createMatchResult(
  lobby: LobbyState,
  match: ServerMatchState,
): MatchResult {
  const winner = computeWinner(match.players);

  return {
    matchId: match.matchId,
    winnerId: winner?.id ?? null,
    players: createPlayerResults(lobby, match),
    durationSeconds: match.elapsedSeconds,
  };
}

function createPlayerResults(
  lobby: LobbyState,
  match: ServerMatchState,
): PlayerResult[] {
  const playerNames = new Map(
    lobby.players.map((player) => [player.id, player.name]),
  );
  const orderedPlayers = rankPlayers(match.players);

  return orderedPlayers.map((player, index) => ({
    id: player.id,
    name: playerNames.get(player.id) ?? 'Player',
    rank: index + 1,
    survivalTimeSeconds: player.survivalTimeSeconds,
    score: Math.floor(player.score),
  }));
}

function createEliminationPayloads(
  players: readonly PlayerState[],
  newlyEliminatedIds: ReadonlySet<string>,
): PlayerEliminatedPayload[] {
  if (newlyEliminatedIds.size === 0) {
    return [];
  }

  const ranks = new Map(
    rankPlayers(players).map((player, index) => [player.id, index + 1]),
  );

  return players
    .filter((player) => newlyEliminatedIds.has(player.id))
    .map((player) => ({
      playerId: player.id,
      rank: ranks.get(player.id) ?? players.length,
    }));
}

function rankPlayers(players: readonly PlayerState[]): PlayerState[] {
  const originalIndexes = new Map(
    players.map((player, index) => [player.id, index]),
  );

  return [...players].sort((a, b) => {
    if (a.isEliminated !== b.isEliminated) {
      return a.isEliminated ? 1 : -1;
    }

    const survivalDelta = b.survivalTimeSeconds - a.survivalTimeSeconds;

    if (survivalDelta !== 0) {
      return survivalDelta;
    }

    // Same-tick eliminations use lobby/player insertion order as the tie-breaker.
    return (originalIndexes.get(a.id) ?? 0) - (originalIndexes.get(b.id) ?? 0);
  });
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
