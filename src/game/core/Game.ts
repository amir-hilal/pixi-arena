import { Player, type Position } from '../entities/Player';
import { MovementSystem } from '../systems/MovementSystem';
import { InputManager } from './InputManager';
import { Loop } from './Loop';
import { Renderer } from './Renderer';

const INITIAL_PLAYER_POSITION_RATIO = 0.5;

export class Game {
  private readonly inputManager = new InputManager();
  private readonly movementSystem = new MovementSystem();
  private readonly renderer = new Renderer();
  private readonly loop = new Loop((deltaSeconds) => {
    this.update(deltaSeconds);
    this.render();
  });
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;
  private player: Player | null = null;

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
    this.inputManager.destroy();
    this.renderer.destroy();
    this.player = null;
    this.initializationPromise = null;
    this.isInitialized = false;
  }

  private async initializeGame(container: HTMLElement): Promise<void> {
    await this.renderer.initialize(container);
    this.inputManager.initialize();
    this.player = new Player(this.getInitialPlayerPosition());
    this.renderer.addToStage(this.player.renderable);
    this.isInitialized = true;
  }

  private update(deltaSeconds: number): void {
    if (this.player === null) {
      return;
    }

    this.movementSystem.update({
      bounds: this.renderer.getViewportSize(),
      deltaSeconds,
      inputManager: this.inputManager,
      player: this.player,
    });
  }

  private render(): void {
    this.renderer.render();
  }

  private getInitialPlayerPosition(): Position {
    const viewportSize = this.renderer.getViewportSize();

    return {
      x: viewportSize.width * INITIAL_PLAYER_POSITION_RATIO,
      y: viewportSize.height * INITIAL_PLAYER_POSITION_RATIO,
    };
  }
}
