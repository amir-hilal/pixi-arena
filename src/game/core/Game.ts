import { GameScene } from '../scenes/GameScene';
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
  private activeScene: GameScene | null = null;

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
    this.activeScene?.destroy();
    this.activeScene = null;
    this.renderer.destroy();
    this.initializationPromise = null;
    this.isInitialized = false;
  }

  private async initializeGame(container: HTMLElement): Promise<void> {
    await this.renderer.initialize(container);
    this.activeScene = new GameScene(this.renderer);
    this.activeScene.initialize();
    this.isInitialized = true;
  }

  private update(deltaSeconds: number): void {
    this.activeScene?.update(deltaSeconds);
  }

  private render(): void {
    this.renderer.render();
  }
}
