import type { InputDirection } from '../core/InputManager';
import type { Player } from '../entities/Player';
import { BOUNDARY_WALL_THICKNESS } from '../utils/world';
import { applyPlayerInput, clampPlayerToBounds } from '../../shared/simulation/movement';

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

export class MovementSystem {
  public update(update: MovementUpdate): void {
    applyPlayerInput(
      update.player.position,
      update.movementDirection,
      update.player.speed,
      update.deltaSeconds,
    );
    clampPlayerToBounds(
      update.player.position,
      update.player.radius,
      update.bounds,
      BOUNDARY_WALL_THICKNESS,
    );
    update.player.renderable.position.set(
      update.player.position.x,
      update.player.position.y,
    );
  }
}
