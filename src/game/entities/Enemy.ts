import { Graphics } from 'pixi.js';
import type { Position } from './Player';

const ENEMY_COLOR = 0xf56565;
const DEFAULT_ENEMY_RADIUS = 14;
const DEFAULT_ENEMY_SPEED = 110;

export class Enemy {
  public readonly renderable: Graphics;
  public readonly radius = DEFAULT_ENEMY_RADIUS;
  public readonly speed = DEFAULT_ENEMY_SPEED;

  public constructor(public readonly position: Position) {
    this.renderable = new Graphics()
      .circle(0, 0, this.radius)
      .fill(ENEMY_COLOR);

    this.renderable.position.set(position.x, position.y);
  }
}
