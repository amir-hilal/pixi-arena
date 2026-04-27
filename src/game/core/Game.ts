import { SocketClient } from '../../api/SocketClient';
import { HomeScene } from '../scenes/HomeScene';
import { SceneManager } from '../scenes/common/SceneManager';
import { MultiplayerLobbyScene } from '../scenes/multiplayer/MultiplayerLobbyScene';
import { MultiplayerMatchResultsScene } from '../scenes/multiplayer/MultiplayerMatchResultsScene';
import {
  MultiplayerMenuScene,
  type LobbyStatePayload,
  type MatchFinishedPayload,
  type MatchStartedPayload,
  type MultiplayerSocketClient,
} from '../scenes/multiplayer/MultiplayerMenuScene';
import { MultiplayerPlayingScene } from '../scenes/multiplayer/MultiplayerPlayingScene';
import { SinglePlayerGameOverScene } from '../scenes/single-player/SinglePlayerGameOverScene';
import { SinglePlayerPlayingScene } from '../scenes/single-player/SinglePlayerPlayingScene';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import { Loop } from './Loop';
import { Renderer } from './Renderer';

const DEFAULT_SOCKET_URL = 'http://localhost:3001';

export class Game {
  private readonly audioManager = new AudioManager();
  private readonly inputManager = new InputManager();
  private readonly renderer = new Renderer();
  private readonly socketClient: MultiplayerSocketClient = new SocketClient();
  private readonly loop = new Loop((deltaSeconds) => {
    this.update(deltaSeconds);
    this.render();
  });
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;
  private sceneManager: SceneManager | null = null;
  private latestLobbyState: LobbyStatePayload | null = null;

  public async initialize(container: HTMLElement): Promise<void> {
    if (this.initializationPromise !== null) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeGame(container);
    return this.initializationPromise;
  }

  public start(): void {
    if (!this.isInitialized) {
      throw new Error('Game must be initialized before it can start.');
    }

    this.loop.start();
  }

  public stop(): void {
    this.loop.stop();
  }

  public destroy(): void {
    this.stop();
    this.sceneManager?.destroy();
    this.sceneManager = null;
    this.socketClient.disconnect();
    this.audioManager.destroy();
    this.renderer.destroy();
    this.initializationPromise = null;
    this.isInitialized = false;
  }

  private async initializeGame(container: HTMLElement): Promise<void> {
    await this.renderer.initialize(container);
    this.sceneManager = new SceneManager();
    this.renderer.setResizeCallback((width, height) => {
      this.sceneManager?.resize(width, height);
    });
    this.sceneManager.setScene(
      new HomeScene(
        this.renderer,
        this.audioManager,
        this.startPlayingScene,
        this.showMultiplayerMenuScene,
      ),
    );
    this.isInitialized = true;
  }

  private update(deltaSeconds: number): void {
    this.sceneManager?.update(deltaSeconds);
  }

  private render(): void {
    this.renderer.render();
  }

  private readonly startPlayingScene = (): void => {
    this.sceneManager?.setScene(
      new SinglePlayerPlayingScene(
        this.renderer,
        this.audioManager,
        this.showGameOverScene,
      ),
    );
  };

  private readonly showHomeScene = (): void => {
    this.sceneManager?.setScene(
      new HomeScene(
        this.renderer,
        this.audioManager,
        this.startPlayingScene,
        this.showMultiplayerMenuScene,
      ),
    );
  };

  private readonly showMultiplayerMenuScene = (): void => {
    if (!this.socketClient.isConnected()) {
      this.socketClient.connect(getSocketUrl());
    }

    this.sceneManager?.setScene(
      new MultiplayerMenuScene(
        this.renderer,
        this.audioManager,
        this.socketClient,
        this.showHomeScene,
        this.showLobbyScene,
      ),
    );
  };

  private readonly showLobbyScene = (state: LobbyStatePayload): void => {
    this.latestLobbyState = state;

    this.sceneManager?.setScene(
      new MultiplayerLobbyScene(
        this.renderer,
        this.audioManager,
        this.socketClient,
        state,
        this.showMultiplayerMenuScene,
        this.showMultiplayerPlayingScene,
      ),
    );
  };

  private readonly showMultiplayerPlayingScene = (
    match: MatchStartedPayload,
  ): void => {
    this.sceneManager?.setScene(
      new MultiplayerPlayingScene(
        this.renderer,
        this.inputManager,
        this.socketClient,
        match,
        this.showMatchResultsScene,
      ),
    );
  };

  private readonly showMatchResultsScene = (
    payload: MatchFinishedPayload,
    lobbyState: LobbyStatePayload | null,
  ): void => {
    this.latestLobbyState = lobbyState ?? this.latestLobbyState;

    this.sceneManager?.setScene(
      new MultiplayerMatchResultsScene(
        this.renderer,
        this.audioManager,
        this.socketClient,
        payload.result,
        this.latestLobbyState,
        this.showLobbyScene,
        this.showHomeScene,
      ),
    );
  };

  private readonly showGameOverScene = (finalScore: number): void => {
    this.sceneManager?.setScene(
      new SinglePlayerGameOverScene(
        this.renderer,
        this.audioManager,
        finalScore,
        this.startPlayingScene,
        this.showHomeScene,
      ),
    );
  };
}

function getSocketUrl(): string {
  return (
    (import.meta.env.VITE_SOCKET_URL as string | undefined) ??
    DEFAULT_SOCKET_URL
  );
}
