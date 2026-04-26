import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/world';
import type { Vector2 } from '../../shared/types/index';

interface ViewportSize {
  width: number;
  height: number;
}

export class Camera {
  public x = 0;
  public y = 0;

  public update(playerPosition: Vector2, viewport: ViewportSize): void {
    const targetX = viewport.width / 2 - playerPosition.x;
    const targetY = viewport.height / 2 - playerPosition.y;
    const minOffsetX = Math.min(0, viewport.width - WORLD_WIDTH);
    const minOffsetY = Math.min(0, viewport.height - WORLD_HEIGHT);

    this.x = Math.min(0, Math.max(minOffsetX, targetX));
    this.y = Math.min(0, Math.max(minOffsetY, targetY));
  }
}
