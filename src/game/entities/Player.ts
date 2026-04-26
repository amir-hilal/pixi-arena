import { Graphics } from 'pixi.js';
import { PLAYER_RADIUS, PLAYER_SPEED } from '../../shared/constants/player';

export interface Position {
  x: number;
  y: number;
}

const PLAYER_COLOR = 0x4fd1c5;

export class Player {
  public readonly renderable: Graphics;
  public readonly radius = PLAYER_RADIUS;
  public readonly speed = PLAYER_SPEED;

  public constructor(public readonly position: Position) {
    this.renderable = new Graphics()
      .circle(0, 0, this.radius)
      .fill(PLAYER_COLOR);

    this.renderable.position.set(position.x, position.y);
  }
}
