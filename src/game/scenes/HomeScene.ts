import { Text } from 'pixi.js';
import type { AudioManager } from '../core/AudioManager';
import type { Renderer } from '../core/Renderer';
import type { Scene } from './Scene';

const TITLE_TEXT = 'Pixi Arena';
const START_TEXT = 'Click to start';
const TITLE_TEXT_SIZE = 42;
const START_TEXT_SIZE = 20;
const TITLE_TEXT_Y_RATIO = 0.4;
const START_TEXT_Y_OFFSET = 56;
const TEXT_COLOR = 0xffffff;

export class HomeScene implements Scene {
  private titleText: Text | null = null;
  private startText: Text | null = null;

  public constructor(
    private readonly renderer: Renderer,
    private readonly audioManager: AudioManager,
    private readonly onStart: () => void,
  ) {}

  public initialize(): void {
    this.titleText = this.createCenteredText(TITLE_TEXT, TITLE_TEXT_SIZE, 0);
    this.startText = this.createCenteredText(
      START_TEXT,
      START_TEXT_SIZE,
      START_TEXT_Y_OFFSET,
    );
    this.startText.eventMode = 'static';
    this.startText.cursor = 'pointer';
    this.startText.on('pointertap', this.handleStart);

    this.renderer.addToStage(this.titleText);
    this.renderer.addToStage(this.startText);
  }

  public update(_deltaSeconds: number): void {}

  public resize(width: number, height: number): void {
    const centerY = height * TITLE_TEXT_Y_RATIO;

    this.titleText?.position.set(width / 2, centerY);
    this.startText?.position.set(width / 2, centerY + START_TEXT_Y_OFFSET);
  }

  public destroy(): void {
    if (this.startText !== null) {
      this.startText.off('pointertap', this.handleStart);
      this.renderer.removeFromStage(this.startText);
      this.startText.destroy();
      this.startText = null;
    }

    if (this.titleText !== null) {
      this.renderer.removeFromStage(this.titleText);
      this.titleText.destroy();
      this.titleText = null;
    }
  }

  private createCenteredText(
    text: string,
    fontSize: number,
    yOffset: number,
  ): Text {
    const viewportSize = this.renderer.getViewportSize();
    const displayText = new Text({
      anchor: 0.5,
      style: {
        fill: TEXT_COLOR,
        fontSize,
      },
      text,
    });

    displayText.position.set(
      viewportSize.width / 2,
      viewportSize.height * TITLE_TEXT_Y_RATIO + yOffset,
    );

    return displayText;
  }

  private readonly handleStart = (): void => {
    this.audioManager.unlock();
    this.audioManager.playStart();
    this.onStart();
  };
}
