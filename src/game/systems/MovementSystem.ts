import type { InputCode, InputManager } from '../core/InputManager';
import type { Player } from '../entities/Player';

interface ViewportBounds {
  width: number;
  height: number;
}

interface MovementUpdate {
  bounds: ViewportBounds;
  deltaSeconds: number;
  inputManager: InputManager;
  player: Player;
}

const NEGATIVE_X_KEYS: InputCode[] = ['ArrowLeft', 'KeyA'];
const POSITIVE_X_KEYS: InputCode[] = ['ArrowRight', 'KeyD'];
const NEGATIVE_Y_KEYS: InputCode[] = ['ArrowUp', 'KeyW'];
const POSITIVE_Y_KEYS: InputCode[] = ['ArrowDown', 'KeyS'];
const NEGATIVE_AXIS_VALUE = -1;
const POSITIVE_AXIS_VALUE = 1;
const NEUTRAL_AXIS_VALUE = 0;

export class MovementSystem {
  public update(update: MovementUpdate): void {
    const movementX = this.getAxisValue(
      update.inputManager,
      NEGATIVE_X_KEYS,
      POSITIVE_X_KEYS,
    );
    const movementY = this.getAxisValue(
      update.inputManager,
      NEGATIVE_Y_KEYS,
      POSITIVE_Y_KEYS,
    );

    this.movePlayer(update.player, movementX, movementY, update.deltaSeconds);
    this.keepPlayerInBounds(update.player, update.bounds);
    this.syncRenderable(update.player);
  }

  private getAxisValue(
    inputManager: InputManager,
    negativeKeys: InputCode[],
    positiveKeys: InputCode[],
  ): number {
    const negativeValue = this.isAnyPressed(inputManager, negativeKeys)
      ? NEGATIVE_AXIS_VALUE
      : NEUTRAL_AXIS_VALUE;
    const positiveValue = this.isAnyPressed(inputManager, positiveKeys)
      ? POSITIVE_AXIS_VALUE
      : NEUTRAL_AXIS_VALUE;

    return negativeValue + positiveValue;
  }

  private isAnyPressed(
    inputManager: InputManager,
    inputCodes: InputCode[],
  ): boolean {
    return inputCodes.some((inputCode) => inputManager.isPressed(inputCode));
  }

  private movePlayer(
    player: Player,
    movementX: number,
    movementY: number,
    deltaSeconds: number,
  ): void {
    const movementLength = Math.hypot(movementX, movementY);

    if (movementLength === NEUTRAL_AXIS_VALUE) {
      return;
    }

    const normalizedX = movementX / movementLength;
    const normalizedY = movementY / movementLength;
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
