import { HomeScene } from '../scenes/HomeScene';
import { PlayingScene } from '../scenes/PlayingScene';
import { SceneManager } from '../scenes/SceneManager';
import { Loop } from './Loop';
import { Renderer } from './Renderer';

export class Game {
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
    this.renderer.destroy();
    this.initializationPromise = null;
    this.isInitialized = false;
  }

  private async initializeGame(container: HTMLElement): Promise<void> {
    await this.renderer.initialize(container);
    this.sceneManager = new SceneManager();
    this.sceneManager.setScene(
      new HomeScene(this.renderer, this.startPlayingScene),
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
    this.sceneManager?.setScene(new PlayingScene(this.renderer));
  };
}
