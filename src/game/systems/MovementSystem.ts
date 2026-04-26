import type { InputDirection } from '../core/InputManager';
import type { Player } from '../entities/Player';
import type { InputState, WorldState } from '../../shared/types/index';
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
    const { player, movementDirection, bounds, deltaSeconds } = update;
    const input: InputState = { dx: movementDirection.x, dy: movementDirection.y };

    const world: WorldState = {
      width: bounds.width,
      height: bounds.height,
      boundaryThickness: BOUNDARY_WALL_THICKNESS,
      obstacles: [],
      gates: [],
    };

    applyPlayerInput(player.state, input, deltaSeconds, player.speed);
    clampPlayerToBounds(player.state, world, player.radius);

    player.syncRenderable();
  }
}
