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

const supportedInputCodes = new Set<string>(SUPPORTED_INPUT_CODES);

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
}
