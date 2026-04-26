import { Enemy } from '../entities/Enemy';
import type { Position } from '../entities/Player';

interface Bounds {
  width: number;
  height: number;
}

interface EnemyUpdate {
  bounds: Bounds;
  deltaSeconds: number;
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

    const enemy = new Enemy(this.getSpawnPosition(playerPosition, bounds));
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

  private getSpawnPosition(playerPosition: Position, bounds: Bounds): Position {
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

    return { x, y };
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
