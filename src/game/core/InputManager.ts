const SUPPORTED_INPUT_CODES = [
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'KeyA',
  'KeyD',
  'KeyS',
  'KeyW',
] as const;

export type InputCode = (typeof SUPPORTED_INPUT_CODES)[number];

export interface InputDirection {
  x: number;
  y: number;
}

const supportedInputCodes = new Set<string>(SUPPORTED_INPUT_CODES);
const NEGATIVE_X_KEYS: InputCode[] = ['ArrowLeft', 'KeyA'];
const POSITIVE_X_KEYS: InputCode[] = ['ArrowRight', 'KeyD'];
const NEGATIVE_Y_KEYS: InputCode[] = ['ArrowUp', 'KeyW'];
const POSITIVE_Y_KEYS: InputCode[] = ['ArrowDown', 'KeyS'];
const NEGATIVE_AXIS_VALUE = -1;
const POSITIVE_AXIS_VALUE = 1;
const NEUTRAL_AXIS_VALUE = 0;

export class InputManager {
  private readonly pressedKeys = new Set<string>();
  private isListening = false;

  public initialize(): void {
    if (this.isListening) {
      return;
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.isListening = true;
  }

  public destroy(): void {
    if (!this.isListening) {
      return;
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.pressedKeys.clear();
    this.isListening = false;
  }

  public isPressed(inputCode: InputCode): boolean {
    return this.pressedKeys.has(inputCode);
  }

  public getMovementDirection(): InputDirection {
    return {
      x: this.getAxisValue(NEGATIVE_X_KEYS, POSITIVE_X_KEYS),
      y: this.getAxisValue(NEGATIVE_Y_KEYS, POSITIVE_Y_KEYS),
    };
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (supportedInputCodes.has(event.code)) {
      event.preventDefault();
      this.pressedKeys.add(event.code);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (supportedInputCodes.has(event.code)) {
      event.preventDefault();
      this.pressedKeys.delete(event.code);
    }
  };

  private getAxisValue(
    negativeKeys: InputCode[],
    positiveKeys: InputCode[],
  ): number {
    const negativeValue = this.isAnyPressed(negativeKeys)
      ? NEGATIVE_AXIS_VALUE
      : NEUTRAL_AXIS_VALUE;
    const positiveValue = this.isAnyPressed(positiveKeys)
      ? POSITIVE_AXIS_VALUE
      : NEUTRAL_AXIS_VALUE;

    return negativeValue + positiveValue;
  }

  private isAnyPressed(inputCodes: InputCode[]): boolean {
    return inputCodes.some((inputCode) => this.isPressed(inputCode));
  }
}
