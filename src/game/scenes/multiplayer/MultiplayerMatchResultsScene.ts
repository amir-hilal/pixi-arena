import { Text } from 'pixi.js';
import type { MatchResult, PlayerResult } from '../../../shared/types/index';
import type { AudioManager } from '../../core/AudioManager';
import type { Renderer } from '../../core/Renderer';
import type {
  LobbyStatePayload,
  MultiplayerSocketClient,
} from './MultiplayerMenuScene';
import type { Scene } from '../common/Scene';

const TITLE_TEXT = 'Match Results';
const BACK_TO_LOBBY_TEXT = 'Back to Lobby';
const HOME_TEXT = 'Home';
const NO_WINNER_TEXT = 'No winner';
const TITLE_TEXT_SIZE = 36;
const WINNER_TEXT_SIZE = 22;
const RESULTS_TEXT_SIZE = 17;
const CONTROL_TEXT_SIZE = 20;
const STATUS_TEXT_SIZE = 14;
const CENTER_Y_RATIO = 0.2;
const WINNER_TEXT_Y_OFFSET = 52;
const RESULTS_TEXT_Y_OFFSET = 112;
const BACK_TEXT_Y_OFFSET = 332;
const HOME_TEXT_Y_OFFSET = 370;
const STATUS_TEXT_Y_OFFSET = 414;
const TEXT_COLOR = 0xffffff;
const MUTED_TEXT_COLOR = 0xcbd5e1;

export class MultiplayerMatchResultsScene implements Scene {
  private titleText: Text | null = null;
  private winnerText: Text | null = null;
  private resultsText: Text | null = null;
  private backToLobbyText: Text | null = null;
  private homeText: Text | null = null;
  private statusText: Text | null = null;
  private latestLobbyState: LobbyStatePayload | null;

  public constructor(
    private readonly renderer: Renderer,
    private readonly audioManager: AudioManager,
    private readonly socketClient: MultiplayerSocketClient,
    private readonly result: MatchResult,
    initialLobbyState: LobbyStatePayload | null,
    private readonly onBackToLobby: (state: LobbyStatePayload) => void,
    private readonly onHome: () => void,
  ) {
    this.latestLobbyState = initialLobbyState;
  }

  public initialize(): void {
    this.socketClient.on('lobby:state', this.handleLobbyState);

    this.titleText = this.createCenteredText(TITLE_TEXT, TITLE_TEXT_SIZE, 0);
    this.winnerText = this.createCenteredText(
      this.getWinnerLabel(),
      WINNER_TEXT_SIZE,
      WINNER_TEXT_Y_OFFSET,
    );
    this.resultsText = this.createCenteredText(
      this.getResultsLabel(),
      RESULTS_TEXT_SIZE,
      RESULTS_TEXT_Y_OFFSET,
    );
    this.backToLobbyText = this.createControlText(
      BACK_TO_LOBBY_TEXT,
      BACK_TEXT_Y_OFFSET,
    );
    this.backToLobbyText.on('pointertap', this.handleBackToLobby);
    this.homeText = this.createControlText(HOME_TEXT, HOME_TEXT_Y_OFFSET);
    this.homeText.on('pointertap', this.handleHome);
    this.statusText = this.createCenteredText(
      this.getStatusLabel(),
      STATUS_TEXT_SIZE,
      STATUS_TEXT_Y_OFFSET,
      MUTED_TEXT_COLOR,
    );

    this.renderer.addToStage(this.titleText);
    this.renderer.addToStage(this.winnerText);
    this.renderer.addToStage(this.resultsText);
    this.renderer.addToStage(this.backToLobbyText);
    this.renderer.addToStage(this.homeText);
    this.renderer.addToStage(this.statusText);
  }

  public update(_deltaSeconds: number): void {}

  public resize(width: number, height: number): void {
    const centerY = height * CENTER_Y_RATIO;

    this.titleText?.position.set(width / 2, centerY);
    this.winnerText?.position.set(width / 2, centerY + WINNER_TEXT_Y_OFFSET);
    this.resultsText?.position.set(width / 2, centerY + RESULTS_TEXT_Y_OFFSET);
    this.backToLobbyText?.position.set(width / 2, centerY + BACK_TEXT_Y_OFFSET);
    this.homeText?.position.set(width / 2, centerY + HOME_TEXT_Y_OFFSET);
    this.statusText?.position.set(width / 2, centerY + STATUS_TEXT_Y_OFFSET);
  }

  public destroy(): void {
    this.socketClient.off('lobby:state', this.handleLobbyState);

    if (this.backToLobbyText !== null) {
      this.backToLobbyText.off('pointertap', this.handleBackToLobby);
    }

    if (this.homeText !== null) {
      this.homeText.off('pointertap', this.handleHome);
    }

    this.destroyText(this.statusText);
    this.destroyText(this.homeText);
    this.destroyText(this.backToLobbyText);
    this.destroyText(this.resultsText);
    this.destroyText(this.winnerText);
    this.destroyText(this.titleText);

    this.statusText = null;
    this.homeText = null;
    this.backToLobbyText = null;
    this.resultsText = null;
    this.winnerText = null;
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
      viewportSize.height * CENTER_Y_RATIO + yOffset,
    );

    return displayText;
  }

  private createControlText(text: string, yOffset: number): Text {
    const displayText = this.createCenteredText(text, CONTROL_TEXT_SIZE, yOffset);

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

  private getWinnerLabel(): string {
    const winner = this.result.players.find(
      (player) => player.id === this.result.winnerId,
    );

    return winner === undefined ? NO_WINNER_TEXT : `Winner: ${winner.name}`;
  }

  private getResultsLabel(): string {
    const localPlayerId = this.socketClient.getId();

    return [...this.result.players]
      .sort((a, b) => a.rank - b.rank)
      .map((player) => this.getPlayerResultLabel(player, player.id === localPlayerId))
      .join('\n');
  }

  private getPlayerResultLabel(
    player: PlayerResult,
    isLocalPlayer: boolean,
  ): string {
    const localMarker = isLocalPlayer ? ' (You)' : '';
    const survivalSeconds = Math.floor(player.survivalTimeSeconds);

    return `#${player.rank} ${player.name}${localMarker}  ${survivalSeconds}s  ${player.score} pts`;
  }

  private getStatusLabel(): string {
    if (this.latestLobbyState === null) {
      return 'Waiting for lobby state...';
    }

    return `Lobby ${this.latestLobbyState.lobbyCode} is ${this.latestLobbyState.status}.`;
  }

  private updateStatus(): void {
    if (this.statusText !== null) {
      this.statusText.text = this.getStatusLabel();
    }
  }

  private readonly handleLobbyState = (state: LobbyStatePayload): void => {
    this.latestLobbyState = state;
    this.updateStatus();
  };

  private readonly handleBackToLobby = (): void => {
    this.audioManager.unlock();

    if (
      this.latestLobbyState === null ||
      this.latestLobbyState.status !== 'waiting'
    ) {
      this.updateStatus();
      return;
    }

    this.onBackToLobby(this.latestLobbyState);
  };

  private readonly handleHome = (): void => {
    this.audioManager.unlock();
    this.socketClient.emit('lobby:leave', undefined);
    this.onHome();
  };
}
