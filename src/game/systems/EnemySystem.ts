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
const SPAWN_SIDE_COUNT = 4;
const TOP_SIDE_INDEX = 0;
const RIGHT_SIDE_INDEX = 1;
const BOTTOM_SIDE_INDEX = 2;
const ENEMY_SPAWN_OFFSET = 20;
const MINIMUM_RANDOM_VALUE = 0;

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

    const enemy = new Enemy(this.getSpawnPosition(bounds));
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

  private getSpawnPosition(bounds: Bounds): Position {
    const sideIndex = Math.floor(Math.random() * SPAWN_SIDE_COUNT);
    const x = this.getRandomValue(bounds.width);
    const y = this.getRandomValue(bounds.height);

    if (sideIndex === TOP_SIDE_INDEX) {
      return { x, y: -ENEMY_SPAWN_OFFSET };
    }

    if (sideIndex === RIGHT_SIDE_INDEX) {
      return { x: bounds.width + ENEMY_SPAWN_OFFSET, y };
    }

    if (sideIndex === BOTTOM_SIDE_INDEX) {
      return { x, y: bounds.height + ENEMY_SPAWN_OFFSET };
    }

    return { x: -ENEMY_SPAWN_OFFSET, y };
  }

  private getRandomValue(maximum: number): number {
    return Math.random() * Math.max(maximum, MINIMUM_RANDOM_VALUE);
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

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];

      if (this.isEnemyWithinValidBounds(enemy, bounds)) {
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
  ): boolean {
    const minimumX = -enemy.radius - ENEMY_SPAWN_OFFSET;
    const maximumX = bounds.width + enemy.radius + ENEMY_SPAWN_OFFSET;
    const minimumY = -enemy.radius - ENEMY_SPAWN_OFFSET;
    const maximumY = bounds.height + enemy.radius + ENEMY_SPAWN_OFFSET;

    return (
      enemy.position.x >= minimumX &&
      enemy.position.x <= maximumX &&
      enemy.position.y >= minimumY &&
      enemy.position.y <= maximumY
    );
  }
}
