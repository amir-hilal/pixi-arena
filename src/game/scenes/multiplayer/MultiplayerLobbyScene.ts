import { Text } from 'pixi.js';
import type { AudioManager } from '../../core/AudioManager';
import type { Renderer } from '../../core/Renderer';
import type {
  LobbyErrorPayload,
  LobbyStatePayload,
  MatchCountdownPayload,
  MatchStartedPayload,
  MultiplayerSocketClient,
} from './MultiplayerMenuScene';
import type { Scene } from '../common/Scene';

const TITLE_TEXT = 'Lobby';
const START_MATCH_TEXT = 'Start Match';
const LEAVE_TEXT = 'Leave';
const TITLE_TEXT_SIZE = 36;
const CODE_TEXT_SIZE = 24;
const BODY_TEXT_SIZE = 18;
const CONTROL_TEXT_SIZE = 20;
const COUNTDOWN_TEXT_SIZE = 80;
const CENTER_Y_RATIO = 0.22;
const CODE_TEXT_Y_OFFSET = 52;
const COUNT_TEXT_Y_OFFSET = 92;
const PLAYERS_TEXT_Y_OFFSET = 142;
const START_TEXT_Y_OFFSET = 292;
const LEAVE_TEXT_Y_OFFSET = 332;
const STATUS_TEXT_Y_OFFSET = 382;
const TEXT_COLOR = 0xffffff;
const MUTED_TEXT_COLOR = 0xcbd5e1;
const ERROR_TEXT_COLOR = 0xfca5a5;
const COUNTDOWN_TEXT_COLOR = 0xfacc15;
const DISABLED_TEXT_COLOR = 0x64748b;
const WAITING_FOR_RETURN_TEXT = 'Waiting for all players to return...';

export class MultiplayerLobbyScene implements Scene {
  private titleText: Text | null = null;
  private lobbyCodeText: Text | null = null;
  private playerCountText: Text | null = null;
  private playersText: Text | null = null;
  private startMatchText: Text | null = null;
  private leaveText: Text | null = null;
  private statusText: Text | null = null;
  private countdownText: Text | null = null;
  private latestState: LobbyStatePayload;

  public constructor(
    private readonly renderer: Renderer,
    private readonly audioManager: AudioManager,
    private readonly socketClient: MultiplayerSocketClient,
    initialState: LobbyStatePayload,
    private readonly onLeave: () => void,
    private readonly onMatchStarted: (match: MatchStartedPayload) => void,
  ) {
    this.latestState = initialState;
  }

  public initialize(): void {
    this.socketClient.on('lobby:state', this.handleLobbyState);
    this.socketClient.on('match:countdown', this.handleMatchCountdown);
    this.socketClient.on('match:started', this.handleMatchStarted);
    this.socketClient.on('lobby:error', this.handleLobbyError);

    this.titleText = this.createCenteredText(TITLE_TEXT, TITLE_TEXT_SIZE, 0);
    this.lobbyCodeText = this.createCenteredText('', CODE_TEXT_SIZE, CODE_TEXT_Y_OFFSET);
    this.playerCountText = this.createCenteredText(
      '',
      BODY_TEXT_SIZE,
      COUNT_TEXT_Y_OFFSET,
      MUTED_TEXT_COLOR,
    );
    this.playersText = this.createCenteredText(
      '',
      BODY_TEXT_SIZE,
      PLAYERS_TEXT_Y_OFFSET,
    );
    this.startMatchText = this.createControlText(
      START_MATCH_TEXT,
      START_TEXT_Y_OFFSET,
    );
    this.startMatchText.on('pointertap', this.handleStartMatch);
    this.leaveText = this.createControlText(LEAVE_TEXT, LEAVE_TEXT_Y_OFFSET);
    this.leaveText.on('pointertap', this.handleLeave);
    this.statusText = this.createCenteredText(
      '',
      BODY_TEXT_SIZE,
      STATUS_TEXT_Y_OFFSET,
      MUTED_TEXT_COLOR,
    );
    this.countdownText = this.createCenteredText(
      '',
      COUNTDOWN_TEXT_SIZE,
      COUNT_TEXT_Y_OFFSET,
      COUNTDOWN_TEXT_COLOR,
    );
    this.countdownText.visible = false;

    this.renderer.addToStage(this.titleText);
    this.renderer.addToStage(this.lobbyCodeText);
    this.renderer.addToStage(this.playerCountText);
    this.renderer.addToStage(this.playersText);
    this.renderer.addToStage(this.startMatchText);
    this.renderer.addToStage(this.leaveText);
    this.renderer.addToStage(this.statusText);
    this.renderer.addToStage(this.countdownText);

    this.renderState();
  }

  public update(_deltaSeconds: number): void {}

  public resize(width: number, height: number): void {
    const centerY = height * CENTER_Y_RATIO;

    this.titleText?.position.set(width / 2, centerY);
    this.lobbyCodeText?.position.set(width / 2, centerY + CODE_TEXT_Y_OFFSET);
    this.playerCountText?.position.set(width / 2, centerY + COUNT_TEXT_Y_OFFSET);
    this.playersText?.position.set(width / 2, centerY + PLAYERS_TEXT_Y_OFFSET);
    this.startMatchText?.position.set(width / 2, centerY + START_TEXT_Y_OFFSET);
    this.leaveText?.position.set(width / 2, centerY + LEAVE_TEXT_Y_OFFSET);
    this.statusText?.position.set(width / 2, centerY + STATUS_TEXT_Y_OFFSET);
    this.countdownText?.position.set(width / 2, centerY + COUNT_TEXT_Y_OFFSET);
  }

  public destroy(): void {
    this.socketClient.off('lobby:state', this.handleLobbyState);
    this.socketClient.off('match:countdown', this.handleMatchCountdown);
    this.socketClient.off('match:started', this.handleMatchStarted);
    this.socketClient.off('lobby:error', this.handleLobbyError);

    if (this.startMatchText !== null) {
      this.startMatchText.off('pointertap', this.handleStartMatch);
    }

    if (this.leaveText !== null) {
      this.leaveText.off('pointertap', this.handleLeave);
    }

    this.destroyText(this.countdownText);
    this.destroyText(this.statusText);
    this.destroyText(this.leaveText);
    this.destroyText(this.startMatchText);
    this.destroyText(this.playersText);
    this.destroyText(this.playerCountText);
    this.destroyText(this.lobbyCodeText);
    this.destroyText(this.titleText);

    this.countdownText = null;
    this.statusText = null;
    this.leaveText = null;
    this.startMatchText = null;
    this.playersText = null;
    this.playerCountText = null;
    this.lobbyCodeText = null;
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

  private renderState(): void {
    const playerCount = this.latestState.players.length;
    const isHost = this.isLocalPlayerHost();
    const canStartMatch = this.canStartMatch();

    if (this.lobbyCodeText !== null) {
      this.lobbyCodeText.text = `Code: ${this.latestState.lobbyCode}`;
    }

    if (this.playerCountText !== null) {
      this.playerCountText.text = `${playerCount} / ${this.latestState.maxPlayers}`;
    }

    if (this.playersText !== null) {
      this.playersText.text = this.latestState.players
        .map((player) =>
          `${player.name}${player.isHost ? ' (Host)' : ''} - ${this.getPlayerLocationLabel(player.location)}`,
        )
        .join('\n');
    }

    if (this.startMatchText !== null) {
      const isWaiting = this.latestState.status === 'waiting';

      this.startMatchText.visible = isHost;
      this.startMatchText.style.fill =
        isWaiting && canStartMatch ? TEXT_COLOR : DISABLED_TEXT_COLOR;
      this.startMatchText.cursor =
        isWaiting && canStartMatch ? 'pointer' : 'default';
    }

    if (this.statusText !== null) {
      if (this.latestState.status !== 'waiting') {
        this.statusText.text = `Status: ${this.latestState.status}`;
      } else if (!canStartMatch) {
        this.statusText.text = WAITING_FOR_RETURN_TEXT;
      } else {
        this.statusText.text = 'Waiting for players...';
      }

      this.statusText.style.fill = MUTED_TEXT_COLOR;
    }
  }

  private canStartMatch(): boolean {
    return this.latestState.players.every(
      (player) => !player.isConnected || player.location === 'lobby',
    );
  }

  private getPlayerLocationLabel(location: LobbyStatePayload['players'][number]['location']): string {
    if (location === 'lobby') {
      return 'In lobby';
    }

    if (location === 'results') {
      return 'In results';
    }

    return 'Playing';
  }

  private isLocalPlayerHost(): boolean {
    const socketId = this.socketClient.getId();

    return this.latestState.players.some(
      (player) => player.id === socketId && player.isHost,
    );
  }

  private setError(message: string): void {
    if (this.statusText !== null) {
      this.statusText.text = message;
      this.statusText.style.fill = ERROR_TEXT_COLOR;
    }
  }

  private readonly handleLobbyState = (state: LobbyStatePayload): void => {
    this.latestState = state;
    this.renderState();
  };

  private readonly handleMatchCountdown = (
    countdown: MatchCountdownPayload,
  ): void => {
    if (this.countdownText !== null) {
      this.countdownText.text = String(countdown.secondsRemaining);
      this.countdownText.visible = true;
    }

    if (this.statusText !== null) {
      this.statusText.text = 'Match starting...';
      this.statusText.style.fill = MUTED_TEXT_COLOR;
    }
  };

  private readonly handleMatchStarted = (match: MatchStartedPayload): void => {
    this.onMatchStarted(match);
  };

  private readonly handleLobbyError = (error: LobbyErrorPayload): void => {
    this.setError(error.message);
  };

  private readonly handleStartMatch = (): void => {
    this.audioManager.unlock();

    if (!this.isLocalPlayerHost()) {
      return;
    }

    if (!this.canStartMatch()) {
      this.setError(WAITING_FOR_RETURN_TEXT);
      return;
    }

    this.socketClient.emit('lobby:startMatch', undefined);
  };

  private readonly handleLeave = (): void => {
    this.audioManager.unlock();
    this.socketClient.emit('lobby:leave', undefined);
    this.onLeave();
  };
}
