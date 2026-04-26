import { Graphics } from 'pixi.js';

export interface ObstacleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OBSTACLE_FILL_COLOR = 0x2d3748;
const OBSTACLE_STROKE_COLOR = 0x4a5568;
const OBSTACLE_STROKE_WIDTH = 2;

export class Obstacle {
  public readonly renderable: Graphics;
  public readonly rect: ObstacleRect;

  public constructor(rect: ObstacleRect) {
    this.rect = rect;
    this.renderable = new Graphics()
      .rect(0, 0, rect.width, rect.height)
      .fill(OBSTACLE_FILL_COLOR)
      .stroke({ color: OBSTACLE_STROKE_COLOR, width: OBSTACLE_STROKE_WIDTH });
    this.renderable.position.set(rect.x, rect.y);
  }
}
