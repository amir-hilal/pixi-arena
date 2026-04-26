import { Enemy } from '../entities/Enemy';
import type { Position } from '../entities/Player';
import type { Gate } from '../utils/world';

interface Bounds {
  width: number;
  height: number;
}

interface EnemyUpdate {
  bounds: Bounds;
  deltaSeconds: number;
  gates: readonly Gate[];
  playerPosition: Position;
  survivalTimeSeconds: number;
}

interface EnemyUpdateResult {
  removedEnemies: Enemy[];
  spawnedEnemies: Enemy[];
}

const SPAWN_INTERVAL_SECONDS = 1.5;
const SPAWN_INTERVAL_SCALE_FACTOR = 0.02;
const MINIMUM_SPAWN_INTERVAL_SECONDS = 0.45;
const SPAWN_RADIUS_MIN = 400;
const SPAWN_RADIUS_MAX = 800;
const TWO_PI = Math.PI * 2;
// If the world-clamped spawn lands closer to the player than this, fall back
// to the nearest gate instead.
const GATE_FALLBACK_MIN_DIST = SPAWN_RADIUS_MIN * 0.6;

export class EnemySystem {
  private readonly enemies: Enemy[] = [];
  private elapsedSpawnSeconds = 0;

  public getEnemies(): readonly Enemy[] {
    return this.enemies;
  }

  public update(update: EnemyUpdate): EnemyUpdateResult {
    const spawnedEnemies = this.spawnEnemies(
      update.deltaSeconds,
      update.bounds,
      update.playerPosition,
      update.gates,
      update.survivalTimeSeconds,
    );

    this.moveEnemiesTowardPlayer(
      update.playerPosition,
      update.deltaSeconds,
    );

    const removedEnemies = this.removeInvalidEnemies(update.bounds);

    return { removedEnemies, spawnedEnemies };
  }

  public destroy(): Enemy[] {
    const removedEnemies = [...this.enemies];

    this.enemies.length = 0;
    this.elapsedSpawnSeconds = 0;

    return removedEnemies;
  }

  public removeEnemies(enemiesToRemove: readonly Enemy[]): Enemy[] {
    const removedEnemies: Enemy[] = [];

    for (const enemy of enemiesToRemove) {
      const index = this.enemies.indexOf(enemy);

      if (index === -1) {
        continue;
      }

      removedEnemies.push(enemy);
      this.enemies.splice(index, 1);
    }

    return removedEnemies;
  }

  private spawnEnemies(
    deltaSeconds: number,
    bounds: Bounds,
    playerPosition: Position,
    gates: readonly Gate[],
    survivalTimeSeconds: number,
  ): Enemy[] {
    this.elapsedSpawnSeconds += deltaSeconds;

    const spawnIntervalSeconds = this.getSpawnIntervalSeconds(
      survivalTimeSeconds,
    );

    if (this.elapsedSpawnSeconds < spawnIntervalSeconds) {
      return [];
    }

    this.elapsedSpawnSeconds = 0;

    const enemy = new Enemy(this.getSpawnPosition(playerPosition, bounds, gates));
    this.enemies.push(enemy);

    return [enemy];
  }

  private getSpawnIntervalSeconds(survivalTimeSeconds: number): number {
    return Math.max(
      MINIMUM_SPAWN_INTERVAL_SECONDS,
      SPAWN_INTERVAL_SECONDS -
        survivalTimeSeconds * SPAWN_INTERVAL_SCALE_FACTOR,
    );
  }

  private getSpawnPosition(playerPosition: Position, bounds: Bounds, gates: readonly Gate[]): Position {
    const angle = Math.random() * TWO_PI;
    const radius = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    const x = Math.min(
      Math.max(0, playerPosition.x + Math.cos(angle) * radius),
      bounds.width,
    );
    const y = Math.min(
      Math.max(0, playerPosition.y + Math.sin(angle) * radius),
      bounds.height,
    );

    // If world-edge clamping pulled the point too close to the player, fall back
    // to the nearest gate so enemies always enter from a believable entry point.
    const actualDist = Math.hypot(x - playerPosition.x, y - playerPosition.y);

    if (actualDist < GATE_FALLBACK_MIN_DIST && gates.length > 0) {
      return this.getNearestGateSpawn(playerPosition, gates);
    }

    return { x, y };
  }

  private getNearestGateSpawn(playerPosition: Position, gates: readonly Gate[]): Position {
    let nearestX = gates[0].spawnX;
    let nearestY = gates[0].spawnY;
    let nearestDist = Infinity;

    for (const gate of gates) {
      const dist = Math.hypot(
        gate.spawnX - playerPosition.x,
        gate.spawnY - playerPosition.y,
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestX = gate.spawnX;
        nearestY = gate.spawnY;
      }
    }

    return { x: nearestX, y: nearestY };
  }

  private moveEnemiesTowardPlayer(
    playerPosition: Position,
    deltaSeconds: number,
  ): void {
    for (const enemy of this.enemies) {
      const movementX = playerPosition.x - enemy.position.x;
      const movementY = playerPosition.y - enemy.position.y;
      const movementLength = Math.hypot(movementX, movementY);

      if (movementLength === 0) {
        continue;
      }

      const distance = enemy.speed * deltaSeconds;

      enemy.position.x += (movementX / movementLength) * distance;
      enemy.position.y += (movementY / movementLength) * distance;
      enemy.renderable.position.set(enemy.position.x, enemy.position.y);
    }
  }

  private removeInvalidEnemies(bounds: Bounds): Enemy[] {
    const removedEnemies: Enemy[] = [];
    const CULL_MARGIN = SPAWN_RADIUS_MAX + 100;

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];

      if (this.isEnemyWithinValidBounds(enemy, bounds, CULL_MARGIN)) {
        continue;
      }

      removedEnemies.push(enemy);
      this.enemies.splice(index, 1);
    }

    return removedEnemies;
  }

  private isEnemyWithinValidBounds(
    enemy: Enemy,
    bounds: Bounds,
    margin: number,
  ): boolean {
    return (
      enemy.position.x >= -margin &&
      enemy.position.x <= bounds.width + margin &&
      enemy.position.y >= -margin &&
      enemy.position.y <= bounds.height + margin
    );
  }
}
