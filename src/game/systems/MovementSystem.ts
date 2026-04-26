import type { InputDirection } from '../core/InputManager';
import type { Player } from '../entities/Player';

interface ViewportBounds {
  width: number;
  height: number;
}

interface MovementUpdate {
  bounds: ViewportBounds;
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

  private keepPlayerInBounds(player: Player, bounds: ViewportBounds): void {
    const maximumX = Math.max(player.radius, bounds.width - player.radius);
    const maximumY = Math.max(player.radius, bounds.height - player.radius);

    player.position.x = this.clamp(
      player.position.x,
      player.radius,
      maximumX,
    );
    player.position.y = this.clamp(
      player.position.y,
      player.radius,
      maximumY,
    );
  }

  private syncRenderable(player: Player): void {
    player.renderable.position.set(player.position.x, player.position.y);
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }
}
