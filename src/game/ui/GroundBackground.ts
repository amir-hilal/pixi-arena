import { Graphics } from 'pixi.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/world';

const TILE_SIZE = 200;
const TILE_COLOR_A = 0x131a12;
const TILE_COLOR_B = 0x172019;

export class GroundBackground {
  public readonly renderable: Graphics;

  public constructor() {
    this.renderable = this.build();
  }

  public destroy(): void {
    this.renderable.destroy();
  }

  private build(): Graphics {
    const graphics = new Graphics();
    const cols = Math.ceil(WORLD_WIDTH / TILE_SIZE);
    const rows = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const color = (row + col) % 2 === 0 ? TILE_COLOR_A : TILE_COLOR_B;

        graphics
          .rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          .fill(color);
      }
    }

    return graphics;
  }
}
