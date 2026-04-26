import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/world';

interface ViewportSize {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

export class Camera {
  public x = 0;
  public y = 0;

  public update(playerPosition: Position, viewport: ViewportSize): void {
    const targetX = viewport.width / 2 - playerPosition.x;
    const targetY = viewport.height / 2 - playerPosition.y;

    this.x = Math.min(0, Math.max(viewport.width - WORLD_WIDTH, targetX));
    this.y = Math.min(0, Math.max(viewport.height - WORLD_HEIGHT, targetY));
  }
}
