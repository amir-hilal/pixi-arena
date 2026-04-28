import { Enemy } from '../entities/Enemy';
import type { Position } from '../entities/Player';
import type { Gate } from '../utils/world';
import type { ObstacleRect } from '../entities/Obstacle';
import type { EnemyState } from '../../shared/types/index';
import {
  getEnemyCullMargin,
  getEnemySpawnIntervalSeconds,
  getEnemySpawnPosition,
  isEnemyWithinValidBounds,
  stepEnemyTowardPosition,
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
}

interface EnemyUpdateResult {
  removedEnemies: Enemy[];
  spawnedEnemies: Enemy[];
}

export class EnemySystem {
  private readonly enemies: Enemy[] = [];
  private elapsedSpawnSeconds = 0;
  private nextEnemyId = 0;

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
    this.nextEnemyId = 0;

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

    const enemy = new Enemy(this.createEnemyState(
      getEnemySpawnPosition(playerPosition, bounds, gates, obstacles),
    ));
    this.enemies.push(enemy);

    return [enemy];
  }

  private createEnemyState(position: Position): EnemyState {
    const id = `enemy-${this.nextEnemyId}`;
    this.nextEnemyId += 1;

    return { id, position };
  }

  private moveEnemiesTowardPlayer(
    playerPosition: Position,
    deltaSeconds: number,
  ): void {
    for (const enemy of this.enemies) {
      stepEnemyTowardPosition(
        enemy.state.position,
        playerPosition,
        deltaSeconds,
        enemy.speed,
      );
      enemy.syncRenderable();
    }
  }

  private removeInvalidEnemies(bounds: Bounds): Enemy[] {
    const removedEnemies: Enemy[] = [];
    const cullMargin = getEnemyCullMargin();

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];

      if (isEnemyWithinValidBounds(enemy.state.position, bounds, cullMargin)) {
        continue;
      }

      removedEnemies.push(enemy);
      this.enemies.splice(index, 1);
    }

    return removedEnemies;
  }
}
