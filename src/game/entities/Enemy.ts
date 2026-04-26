import { Graphics } from 'pixi.js';
import type { Position } from './Player';
import { ENEMY_RADIUS, ENEMY_SPEED } from '../../shared/constants/enemy';
import type { EnemyState } from '../../shared/types/index';

const ENEMY_COLOR = 0xf56565;

export class Enemy {
  public readonly renderable: Graphics;
  public readonly radius = ENEMY_RADIUS;
  public readonly speed = ENEMY_SPEED;

  public constructor(public readonly state: EnemyState) {
    this.renderable = new Graphics()
      .circle(0, 0, this.radius)
      .fill(ENEMY_COLOR);

    this.syncRenderable();
  }

  public get position(): Position {
    return this.state.position;
  }

  public syncRenderable(): void {
    this.renderable.position.set(this.position.x, this.position.y);
  }
}
