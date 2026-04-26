import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

export class CollisionSystem {
  public checkPlayerEnemyCollision(
    player: Player,
    enemies: readonly Enemy[],
  ): Enemy[] {
    return enemies.filter((enemy) => this.areCirclesColliding(player, enemy));
  }

  private areCirclesColliding(player: Player, enemy: Enemy): boolean {
    const distanceX = player.position.x - enemy.position.x;
    const distanceY = player.position.y - enemy.position.y;
    const collisionDistance = player.radius + enemy.radius;
    const squaredDistance = distanceX * distanceX + distanceY * distanceY;
    const squaredCollisionDistance = collisionDistance * collisionDistance;

    return squaredDistance <= squaredCollisionDistance;
  }
}
