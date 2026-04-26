import { Text } from 'pixi.js';
import type { Renderer } from '../core/Renderer';
import type { MatchStartedPayload } from './MultiplayerMenuScene';
import type { Scene } from './Scene';

const TITLE_TEXT = 'Multiplayer Match';
const PLACEHOLDER_TEXT = 'Match scene placeholder';
const TITLE_TEXT_SIZE = 34;
const BODY_TEXT_SIZE = 18;
const TITLE_Y_RATIO = 0.42;
const BODY_TEXT_Y_OFFSET = 48;
const TEXT_COLOR = 0xffffff;
const MUTED_TEXT_COLOR = 0xcbd5e1;

export class MultiplayerPlayingScene implements Scene {
  private titleText: Text | null = null;
  private matchText: Text | null = null;

  public constructor(
    private readonly renderer: Renderer,
    private readonly match: MatchStartedPayload,
  ) {}

  public initialize(): void {
    this.titleText = this.createCenteredText(TITLE_TEXT, TITLE_TEXT_SIZE, 0);
    this.matchText = this.createCenteredText(
      `${PLACEHOLDER_TEXT}\n${this.match.matchId}`,
      BODY_TEXT_SIZE,
      BODY_TEXT_Y_OFFSET,
      MUTED_TEXT_COLOR,
    );

    this.renderer.addToStage(this.titleText);
    this.renderer.addToStage(this.matchText);
  }

  public update(_deltaSeconds: number): void {}

  public resize(width: number, height: number): void {
    const centerY = height * TITLE_Y_RATIO;

    this.titleText?.position.set(width / 2, centerY);
    this.matchText?.position.set(width / 2, centerY + BODY_TEXT_Y_OFFSET);
  }

  public destroy(): void {
    this.destroyText(this.matchText);
    this.destroyText(this.titleText);
    this.matchText = null;
    this.titleText = null;
  }

  private createCenteredText(
    text: string,
    fontSize: number,
    yOffset: number,
    fill = TEXT_COLOR,
  ): Text {
    const viewportSize = this.renderer.getViewportSize();
    const displayText = new Text({
      anchor: 0.5,
      style: {
        align: 'center',
        fill,
        fontSize,
      },
      text,
    });

    displayText.position.set(
      viewportSize.width / 2,
      viewportSize.height * TITLE_Y_RATIO + yOffset,
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
