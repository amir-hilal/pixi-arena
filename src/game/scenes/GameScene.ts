import { Player, type Position } from '../entities/Player';
import { MovementSystem } from '../systems/MovementSystem';
import { InputManager } from '../core/InputManager';
import type { Renderer } from '../core/Renderer';

const INITIAL_PLAYER_POSITION_RATIO = 0.5;

export class GameScene {
  private readonly inputManager = new InputManager();
  private readonly movementSystem = new MovementSystem();
  private player: Player | null = null;
  private isInitialized = false;

  public constructor(private readonly renderer: Renderer) {}

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.inputManager.initialize();
    this.player = new Player(this.getInitialPlayerPosition());
    this.renderer.addToStage(this.player.renderable);
    this.isInitialized = true;
  }

  public update(deltaSeconds: number): void {
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

  public destroy(): void {
    this.inputManager.destroy();

    if (this.player !== null) {
      this.renderer.removeFromStage(this.player.renderable);
      this.player.renderable.destroy();
      this.player = null;
    }

    this.isInitialized = false;
  }

  private getInitialPlayerPosition(): Position {
    const viewportSize = this.renderer.getViewportSize();

    return {
      x: viewportSize.width * INITIAL_PLAYER_POSITION_RATIO,
      y: viewportSize.height * INITIAL_PLAYER_POSITION_RATIO,
    };
  }
}
