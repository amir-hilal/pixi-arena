import { Enemy } from '../entities/Enemy';
import type { Position } from '../entities/Player';
import type { Gate } from '../utils/world';
import type { ObstacleRect } from '../entities/Obstacle';
import {
  getEnemyCullMargin,
  getEnemySpawnIntervalSeconds,
  getEnemySpawnPosition,
  isEnemyWithinValidBounds,
  stepEnemyTowardPosition,
  type ViewportRect,
} from '../../shared/simulation/enemyBehavior';

interface Bounds {
  width: number;
  height: number;
}

interface EnemyUpdate {
  bounds: Bounds;
  deltaSeconds: number;
  gates: readonly Gate[];
  obstacles: readonly ObstacleRect[];
  playerPosition: Position;
  survivalTimeSeconds: number;
  viewport: ViewportRect;
}

interface EnemyUpdateResult {
  removedEnemies: Enemy[];
  spawnedEnemies: Enemy[];
}

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
      update.obstacles,
      update.viewport,
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
    obstacles: readonly ObstacleRect[],
    viewport: ViewportRect,
    survivalTimeSeconds: number,
  ): Enemy[] {
    this.elapsedSpawnSeconds += deltaSeconds;

    const spawnIntervalSeconds = getEnemySpawnIntervalSeconds(
      survivalTimeSeconds,
    );

    if (this.elapsedSpawnSeconds < spawnIntervalSeconds) {
      return [];
    }

    this.elapsedSpawnSeconds = 0;

    const enemy = new Enemy(
      getEnemySpawnPosition(playerPosition, bounds, gates, obstacles, viewport),
    );
    this.enemies.push(enemy);

    return [enemy];
  }

  private moveEnemiesTowardPlayer(
    playerPosition: Position,
    deltaSeconds: number,
  ): void {
    for (const enemy of this.enemies) {
      stepEnemyTowardPosition(
        enemy.position,
        playerPosition,
        deltaSeconds,
        enemy.speed,
      );
      enemy.renderable.position.set(enemy.position.x, enemy.position.y);
    }
  }

  private removeInvalidEnemies(bounds: Bounds): Enemy[] {
    const removedEnemies: Enemy[] = [];
    const cullMargin = getEnemyCullMargin();

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];

      if (isEnemyWithinValidBounds(enemy.position, bounds, cullMargin)) {
        continue;
      }

      removedEnemies.push(enemy);
      this.enemies.splice(index, 1);
    }

    return removedEnemies;
  }
}
