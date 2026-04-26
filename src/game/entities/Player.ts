import { Graphics } from 'pixi.js';
import { PLAYER_RADIUS, PLAYER_SPEED } from '../../shared/constants/player';
import type { PlayerState, Vector2 } from '../../shared/types/index';

/** World-space position. Aliased to Vector2 for shared simulation compatibility. */
export type Position = Vector2;

const PLAYER_COLOR = 0x4fd1c5;

export class Player {
  public readonly renderable: Graphics;
  public readonly radius = PLAYER_RADIUS;
  public readonly speed = PLAYER_SPEED;

  public constructor(public readonly state: PlayerState) {
    this.renderable = new Graphics()
      .circle(0, 0, this.radius)
      .fill(PLAYER_COLOR);

    this.syncRenderable();
  }

  public get position(): Position {
    return this.state.position;
  }

  public syncRenderable(): void {
    this.renderable.position.set(this.position.x, this.position.y);
  }
}
