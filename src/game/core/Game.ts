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
    this.renderer.destroy();
    this.initializationPromise = null;
    this.isInitialized = false;
  }

  private async initializeGame(container: HTMLElement): Promise<void> {
    await this.renderer.initialize(container);
    this.isInitialized = true;
  }

  private update(_deltaSeconds: number): void {
    // Intentionally empty until scenes and systems are introduced.
  }

  private render(): void {
    this.renderer.render();
  }
}
