import { Text } from 'pixi.js';
import type { AudioManager } from '../core/AudioManager';
import type { Renderer } from '../core/Renderer';
import type { Scene } from './Scene';

const TITLE_TEXT = 'Pixi Arena';
const SINGLE_PLAYER_TEXT = 'Single Player';
const MULTIPLAYER_TEXT = 'Multiplayer';
const TITLE_TEXT_SIZE = 42;
const MENU_TEXT_SIZE = 20;
const TITLE_TEXT_Y_RATIO = 0.4;
const SINGLE_PLAYER_TEXT_Y_OFFSET = 56;
const MULTIPLAYER_TEXT_Y_OFFSET = 92;
const TEXT_COLOR = 0xffffff;

export class HomeScene implements Scene {
  private titleText: Text | null = null;
  private singlePlayerText: Text | null = null;
  private multiplayerText: Text | null = null;

  public constructor(
    private readonly renderer: Renderer,
    private readonly audioManager: AudioManager,
    private readonly onSinglePlayer: () => void,
    private readonly onMultiplayer: () => void,
  ) {}

  public initialize(): void {
    this.titleText = this.createCenteredText(TITLE_TEXT, TITLE_TEXT_SIZE, 0);
    this.singlePlayerText = this.createMenuText(
      SINGLE_PLAYER_TEXT,
      SINGLE_PLAYER_TEXT_Y_OFFSET,
    );
    this.singlePlayerText.on('pointertap', this.handleSinglePlayer);
    this.multiplayerText = this.createMenuText(
      MULTIPLAYER_TEXT,
      MULTIPLAYER_TEXT_Y_OFFSET,
    );
    this.multiplayerText.on('pointertap', this.handleMultiplayer);

    this.renderer.addToStage(this.titleText);
    this.renderer.addToStage(this.singlePlayerText);
    this.renderer.addToStage(this.multiplayerText);
  }

  public update(_deltaSeconds: number): void {}

  public resize(width: number, height: number): void {
    const centerY = height * TITLE_TEXT_Y_RATIO;

    this.titleText?.position.set(width / 2, centerY);
    this.singlePlayerText?.position.set(
      width / 2,
      centerY + SINGLE_PLAYER_TEXT_Y_OFFSET,
    );
    this.multiplayerText?.position.set(
      width / 2,
      centerY + MULTIPLAYER_TEXT_Y_OFFSET,
    );
  }

  public destroy(): void {
    if (this.singlePlayerText !== null) {
      this.singlePlayerText.off('pointertap', this.handleSinglePlayer);
      this.destroyText(this.singlePlayerText);
      this.singlePlayerText = null;
    }

    if (this.multiplayerText !== null) {
      this.multiplayerText.off('pointertap', this.handleMultiplayer);
      this.destroyText(this.multiplayerText);
      this.multiplayerText = null;
    }

    this.destroyText(this.titleText);
    this.titleText = null;
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

  private createMenuText(text: string, yOffset: number): Text {
    const displayText = this.createCenteredText(text, MENU_TEXT_SIZE, yOffset);

    displayText.eventMode = 'static';
    displayText.cursor = 'pointer';

    return displayText;
  }

  private destroyText(text: Text | null): void {
    if (text === null) {
      return;
    }

    this.renderer.removeFromStage(text);
    text.destroy();
  }

  private readonly handleSinglePlayer = (): void => {
    this.audioManager.unlock();
    this.audioManager.playStart();
    this.onSinglePlayer();
  };

  private readonly handleMultiplayer = (): void => {
    this.audioManager.unlock();
    this.onMultiplayer();
  };
}
