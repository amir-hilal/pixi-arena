import { GameOverScene } from '../scenes/GameOverScene';
import { HomeScene } from '../scenes/HomeScene';
import { PlayingScene } from '../scenes/PlayingScene';
import { SceneManager } from '../scenes/SceneManager';
import { AudioManager } from './AudioManager';
import { Loop } from './Loop';
import { Renderer } from './Renderer';

export class Game {
  private readonly audioManager = new AudioManager();
  private readonly renderer = new Renderer();
  private readonly loop = new Loop((deltaSeconds) => {
    this.update(deltaSeconds);
    this.render();
  });
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;
  private sceneManager: SceneManager | null = null;

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
      new HomeScene(this.renderer, this.audioManager, this.startPlayingScene),
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
      new PlayingScene(
        this.renderer,
        this.audioManager,
        this.showGameOverScene,
      ),
    );
  };

  private readonly showHomeScene = (): void => {
    this.sceneManager?.setScene(
      new HomeScene(this.renderer, this.audioManager, this.startPlayingScene),
    );
  };

  private readonly showGameOverScene = (finalScore: number): void => {
    this.sceneManager?.setScene(
      new GameOverScene(
        this.renderer,
        this.audioManager,
        finalScore,
        this.startPlayingScene,
        this.showHomeScene,
      ),
    );
  };
}
