import type { InputDirection } from '../core/InputManager';
import type { Player } from '../entities/Player';
import { BOUNDARY_WALL_THICKNESS } from '../utils/world';

interface Bounds {
  width: number;
  height: number;
}

interface MovementUpdate {
  bounds: Bounds;
  deltaSeconds: number;
  movementDirection: InputDirection;
  player: Player;
}

const NEUTRAL_AXIS_VALUE = 0;

export class MovementSystem {
  public update(update: MovementUpdate): void {
    this.movePlayer(
      update.player,
      update.movementDirection,
      update.deltaSeconds,
    );
    this.keepPlayerInBounds(update.player, update.bounds);
    this.syncRenderable(update.player);
  }

  private movePlayer(
    player: Player,
    movementDirection: InputDirection,
    deltaSeconds: number,
  ): void {
    const movementLength = Math.hypot(
      movementDirection.x,
      movementDirection.y,
    );

    if (movementLength === NEUTRAL_AXIS_VALUE) {
      return;
    }

    const normalizedX = movementDirection.x / movementLength;
    const normalizedY = movementDirection.y / movementLength;
    const distance = player.speed * deltaSeconds;

    player.position.x += normalizedX * distance;
    player.position.y += normalizedY * distance;
  }

  private keepPlayerInBounds(player: Player, bounds: Bounds): void {
    // Keep the player inside the visual boundary walls, not just world edge.
    const minCoord = BOUNDARY_WALL_THICKNESS + player.radius;
    const maximumX = Math.max(minCoord, bounds.width  - BOUNDARY_WALL_THICKNESS - player.radius);
    const maximumY = Math.max(minCoord, bounds.height - BOUNDARY_WALL_THICKNESS - player.radius);

    player.position.x = this.clamp(player.position.x, minCoord, maximumX);
    player.position.y = this.clamp(player.position.y, minCoord, maximumY);
  }

  private syncRenderable(player: Player): void {
    player.renderable.position.set(player.position.x, player.position.y);
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }
}
