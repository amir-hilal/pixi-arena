import { Obstacle, type ObstacleType } from '../entities/Obstacle';
import { WORLD_OBSTACLE_DEFINITIONS } from '../../shared/constants/obstacles';

export class ObstacleSystem {
  private readonly obstacles: Obstacle[] = [];

  /** Creates all obstacles and returns them so the caller can add renderables to the scene. */
  public initialize(): readonly Obstacle[] {
    for (const def of WORLD_OBSTACLE_DEFINITIONS) {
      this.obstacles.push(
        new Obstacle(
          { x: def.x, y: def.y, width: def.width, height: def.height },
          def.type as ObstacleType,
        ),
      );
    }

    return this.obstacles;
  }

  public getObstacles(): readonly Obstacle[] {
    return this.obstacles;
  }

  /**
   * Clears all obstacles and returns them so the caller can remove and
   * destroy their renderables before the scene tears down.
   */
  public destroy(): Obstacle[] {
    const obstacles = [...this.obstacles];
    this.obstacles.length = 0;

    return obstacles;
  }
}
