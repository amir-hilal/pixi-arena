import { Text } from 'pixi.js';
import type { SocketClient } from '../../api/SocketClient';
import type { AudioManager } from '../core/AudioManager';
import type { Renderer } from '../core/Renderer';
import type { Scene } from './Scene';

export interface LobbyPlayerPayload {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
}

export interface LobbyStatePayload {
  lobbyCode: string;
  players: LobbyPlayerPayload[];
  status: 'waiting' | 'countdown' | 'playing';
  maxPlayers: 4;
}

export interface LobbyErrorPayload {
  message: string;
}

export interface MatchCountdownPayload {
  secondsRemaining: number;
}

export interface MatchStartedPayload {
  matchId: string;
  initialState: {
    tick: number;
    players: [];
    enemies: [];
    elapsedSeconds: number;
  };
}

interface MultiplayerIncomingEvents {
  'lobby:state': LobbyStatePayload;
  'lobby:error': LobbyErrorPayload;
  'match:countdown': MatchCountdownPayload;
  'match:started': MatchStartedPayload;
}

interface MultiplayerOutgoingEvents {
  'lobby:create': { playerName: string };
  'lobby:join': { lobbyCode: string; playerName: string };
  'lobby:leave': undefined;
  'lobby:startMatch': undefined;
}

export type MultiplayerSocketClient = SocketClient<
  MultiplayerIncomingEvents,
  MultiplayerOutgoingEvents
>;

const TITLE_TEXT = 'Multiplayer';
const CREATE_LOBBY_TEXT = 'Create Lobby';
const JOIN_LOBBY_TEXT = 'Join Lobby';
const BACK_TEXT = 'Back';
const DEFAULT_DISPLAY_NAME = 'Player';
const DISPLAY_NAME_STORAGE_KEY = 'pixi-arena.displayName';
const TITLE_TEXT_SIZE = 38;
const MENU_TEXT_SIZE = 20;
const STATUS_TEXT_SIZE = 16;
const CENTER_Y_RATIO = 0.34;
const NAME_TEXT_Y_OFFSET = 50;
const CREATE_TEXT_Y_OFFSET = 92;
const JOIN_TEXT_Y_OFFSET = 128;
const BACK_TEXT_Y_OFFSET = 164;
const STATUS_TEXT_Y_OFFSET = 212;
const TEXT_COLOR = 0xffffff;
const STATUS_TEXT_COLOR = 0xcbd5e1;

export class MultiplayerMenuScene implements Scene {
  private titleText: Text | null = null;
  private displayNameText: Text | null = null;
  private createLobbyText: Text | null = null;
  private joinLobbyText: Text | null = null;
  private backText: Text | null = null;
  private statusText: Text | null = null;
  private displayName = DEFAULT_DISPLAY_NAME;

  public constructor(
    private readonly renderer: Renderer,
    private readonly audioManager: AudioManager,
    private readonly socketClient: MultiplayerSocketClient,
    private readonly onBack: () => void,
    private readonly onLobbyReady: (state: LobbyStatePayload) => void,
  ) {}

  public initialize(): void {
    this.displayName = this.getStoredDisplayName();
    this.socketClient.on('lobby:state', this.handleLobbyState);
    this.socketClient.on('lobby:error', this.handleLobbyError);

    this.titleText = this.createCenteredText(TITLE_TEXT, TITLE_TEXT_SIZE, 0);
    this.displayNameText = this.createMenuText(
      this.getDisplayNameLabel(),
      NAME_TEXT_Y_OFFSET,
    );
    this.displayNameText.on('pointertap', this.handleEditDisplayName);
    this.createLobbyText = this.createMenuText(
      CREATE_LOBBY_TEXT,
      CREATE_TEXT_Y_OFFSET,
    );
    this.createLobbyText.on('pointertap', this.handleCreateLobby);
    this.joinLobbyText = this.createMenuText(
      JOIN_LOBBY_TEXT,
      JOIN_TEXT_Y_OFFSET,
    );
    this.joinLobbyText.on('pointertap', this.handleJoinLobby);
    this.backText = this.createMenuText(BACK_TEXT, BACK_TEXT_Y_OFFSET);
    this.backText.on('pointertap', this.handleBack);
    this.statusText = this.createCenteredText(
      'Connect a server to create or join lobbies.',
      STATUS_TEXT_SIZE,
      STATUS_TEXT_Y_OFFSET,
      STATUS_TEXT_COLOR,
    );

    this.renderer.addToStage(this.titleText);
    this.renderer.addToStage(this.displayNameText);
    this.renderer.addToStage(this.createLobbyText);
    this.renderer.addToStage(this.joinLobbyText);
    this.renderer.addToStage(this.backText);
    this.renderer.addToStage(this.statusText);
  }

  public update(_deltaSeconds: number): void {}

  public resize(width: number, height: number): void {
    const centerY = height * CENTER_Y_RATIO;

    this.titleText?.position.set(width / 2, centerY);
    this.displayNameText?.position.set(width / 2, centerY + NAME_TEXT_Y_OFFSET);
    this.createLobbyText?.position.set(width / 2, centerY + CREATE_TEXT_Y_OFFSET);
    this.joinLobbyText?.position.set(width / 2, centerY + JOIN_TEXT_Y_OFFSET);
    this.backText?.position.set(width / 2, centerY + BACK_TEXT_Y_OFFSET);
    this.statusText?.position.set(width / 2, centerY + STATUS_TEXT_Y_OFFSET);
  }

  public destroy(): void {
    this.socketClient.off('lobby:state', this.handleLobbyState);
    this.socketClient.off('lobby:error', this.handleLobbyError);

    if (this.displayNameText !== null) {
      this.displayNameText.off('pointertap', this.handleEditDisplayName);
      this.destroyText(this.displayNameText);
      this.displayNameText = null;
    }

    if (this.createLobbyText !== null) {
      this.createLobbyText.off('pointertap', this.handleCreateLobby);
      this.destroyText(this.createLobbyText);
      this.createLobbyText = null;
    }

    if (this.joinLobbyText !== null) {
      this.joinLobbyText.off('pointertap', this.handleJoinLobby);
      this.destroyText(this.joinLobbyText);
      this.joinLobbyText = null;
    }

    if (this.backText !== null) {
      this.backText.off('pointertap', this.handleBack);
      this.destroyText(this.backText);
      this.backText = null;
    }

    this.destroyText(this.statusText);
    this.statusText = null;
    this.destroyText(this.titleText);
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

  private getStoredDisplayName(): string {
    return localStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ?? DEFAULT_DISPLAY_NAME;
  }

  private saveDisplayName(displayName: string): void {
    this.displayName = displayName;
    localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName);

    if (this.displayNameText !== null) {
      this.displayNameText.text = this.getDisplayNameLabel();
    }
  }

  private getDisplayNameLabel(): string {
    return `Name: ${this.displayName}`;
  }

  private requestDisplayName(): string | null {
    const value = window.prompt('Display name', this.displayName);
    const displayName = value?.trim();

    return displayName === undefined || displayName.length === 0
      ? null
      : displayName;
  }

  private setStatus(message: string): void {
    if (this.statusText !== null) {
      this.statusText.text = message;
    }
  }

  private ensureDisplayName(): boolean {
    if (this.displayName.trim().length > 0) {
      return true;
    }

    const displayName = this.requestDisplayName();

    if (displayName === null) {
      this.setStatus('Display name is required.');
      return false;
    }

    this.saveDisplayName(displayName);
    return true;
  }

  private readonly handleEditDisplayName = (): void => {
    const displayName = this.requestDisplayName();

    if (displayName !== null) {
      this.saveDisplayName(displayName);
      this.setStatus('Display name saved.');
    }
  };

  private readonly handleCreateLobby = (): void => {
    this.audioManager.unlock();

    if (!this.ensureDisplayName()) {
      return;
    }

    if (!this.socketClient.isConnected()) {
      this.setStatus('Server not connected yet.');
      return;
    }

    this.socketClient.emit('lobby:create', { playerName: this.displayName });
    this.setStatus('Creating lobby...');
  };

  private readonly handleJoinLobby = (): void => {
    this.audioManager.unlock();

    if (!this.ensureDisplayName()) {
      return;
    }

    const lobbyCode = window.prompt('Lobby code')?.trim().toUpperCase();

    if (lobbyCode === undefined || lobbyCode.length === 0) {
      this.setStatus('Lobby code is required.');
      return;
    }

    if (!this.socketClient.isConnected()) {
      this.setStatus('Server not connected yet.');
      return;
    }

    this.socketClient.emit('lobby:join', {
      lobbyCode,
      playerName: this.displayName,
    });
    this.setStatus(`Joining ${lobbyCode}...`);
  };

  private readonly handleBack = (): void => {
    this.audioManager.unlock();
    this.onBack();
  };

  private readonly handleLobbyState = (state: LobbyStatePayload): void => {
    this.onLobbyReady(state);
  };

  private readonly handleLobbyError = (error: LobbyErrorPayload): void => {
    this.setStatus(error.message);
  };
}
