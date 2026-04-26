import type { InputDirection } from '../core/InputManager';
import type { Player } from '../entities/Player';
import type { PlayerState, InputState, WorldState } from '../../shared/types/index';
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

    // Pre-Phase C: Player does not yet extend PlayerState. The shared functions only
    // access state.position, which is the same Vector2 reference as player.position.
    // This cast will be removed in Phase C when Player becomes a view wrapper over PlayerState.
    const state = player as unknown as PlayerState;

    const input: InputState = { dx: movementDirection.x, dy: movementDirection.y };

    const world: WorldState = {
      width: bounds.width,
      height: bounds.height,
      boundaryThickness: BOUNDARY_WALL_THICKNESS,
      obstacles: [],
      gates: [],
    };

    applyPlayerInput(state, input, deltaSeconds, player.speed);
    clampPlayerToBounds(state, world, player.radius);

    player.renderable.position.set(player.position.x, player.position.y);
  }
}
