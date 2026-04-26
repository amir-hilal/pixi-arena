import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { circlesOverlap } from '../../shared/simulation/collision';

export class CollisionSystem {
  public checkPlayerEnemyCollision(
    player: Player,
    enemies: readonly Enemy[],
  ): Enemy[] {
    return enemies.filter((enemy) => circlesOverlap(player, enemy));
  }
}
