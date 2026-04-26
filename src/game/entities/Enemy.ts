import { Graphics } from 'pixi.js';
import type { Position } from './Player';
import { ENEMY_RADIUS, ENEMY_SPEED } from '../../shared/constants/enemy';

const ENEMY_COLOR = 0xf56565;

export class Enemy {
  public readonly renderable: Graphics;
  public readonly radius = ENEMY_RADIUS;
  public readonly speed = ENEMY_SPEED;

  public constructor(public readonly position: Position) {
    this.renderable = new Graphics()
      .circle(0, 0, this.radius)
      .fill(ENEMY_COLOR);

    this.renderable.position.set(position.x, position.y);
  }
}
