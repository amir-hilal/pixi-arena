import { Graphics } from 'pixi.js';

export interface Position {
  x: number;
  y: number;
}

const PLAYER_COLOR = 0x4fd1c5;
const DEFAULT_PLAYER_RADIUS = 18;
const DEFAULT_PLAYER_SPEED = 260;

export class Player {
  public readonly renderable: Graphics;
  public readonly radius = DEFAULT_PLAYER_RADIUS;
  public readonly speed = DEFAULT_PLAYER_SPEED;

  public constructor(public readonly position: Position) {
    this.renderable = new Graphics()
      .circle(0, 0, this.radius)
      .fill(PLAYER_COLOR);

    this.renderable.position.set(position.x, position.y);
  }
}
