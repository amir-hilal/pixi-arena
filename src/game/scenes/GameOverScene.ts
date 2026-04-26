import { Text } from 'pixi.js';
import type { Renderer } from '../core/Renderer';
import type { Scene } from './Scene';

const GAME_OVER_TEXT = 'Game Over';
const RESTART_TEXT = 'Click to restart';
const SCORE_TEXT_PREFIX = 'Final Score';
const GAME_OVER_TEXT_SIZE = 38;
const SCORE_TEXT_SIZE = 22;
const RESTART_TEXT_SIZE = 20;
const CENTER_Y_RATIO = 0.38;
const SCORE_TEXT_Y_OFFSET = 54;
const RESTART_TEXT_Y_OFFSET = 94;
const TEXT_COLOR = 0xffffff;

export class GameOverScene implements Scene {
  private gameOverText: Text | null = null;
  private restartText: Text | null = null;
  private scoreText: Text | null = null;

  public constructor(
    private readonly renderer: Renderer,
    private readonly finalScore: number,
    private readonly onRestart: () => void,
  ) {}

  public initialize(): void {
    this.gameOverText = this.createCenteredText(
      GAME_OVER_TEXT,
      GAME_OVER_TEXT_SIZE,
      0,
    );
    this.scoreText = this.createCenteredText(
      `${SCORE_TEXT_PREFIX}: ${this.finalScore}`,
      SCORE_TEXT_SIZE,
      SCORE_TEXT_Y_OFFSET,
    );
    this.restartText = this.createCenteredText(
      RESTART_TEXT,
      RESTART_TEXT_SIZE,
      RESTART_TEXT_Y_OFFSET,
    );
    this.restartText.eventMode = 'static';
    this.restartText.cursor = 'pointer';
    this.restartText.on('pointertap', this.onRestart);

    this.renderer.addToStage(this.gameOverText);
    this.renderer.addToStage(this.scoreText);
    this.renderer.addToStage(this.restartText);
  }

  public update(_deltaSeconds: number): void {}

  public destroy(): void {
    if (this.restartText !== null) {
      this.restartText.off('pointertap', this.onRestart);
      this.renderer.removeFromStage(this.restartText);
      this.restartText.destroy();
      this.restartText = null;
    }

    this.destroyText(this.scoreText);
    this.scoreText = null;
    this.destroyText(this.gameOverText);
    this.gameOverText = null;
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
      viewportSize.height * CENTER_Y_RATIO + yOffset,
    );

    return displayText;
  }

  private destroyText(text: Text | null): void {
    if (text === null) {
      return;
    }

    this.renderer.removeFromStage(text);
    text.destroy();
  }
}
