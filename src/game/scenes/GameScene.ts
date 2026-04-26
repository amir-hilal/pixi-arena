import { Player, type Position } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { InputManager } from '../core/InputManager';
import type { Renderer } from '../core/Renderer';

const INITIAL_PLAYER_POSITION_RATIO = 0.5;

export class GameScene {
  private readonly enemySystem = new EnemySystem();
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
    this.updateEnemies(deltaSeconds, this.player);
  }

  public destroy(): void {
    this.inputManager.destroy();
    this.removeEnemies(this.enemySystem.destroy());

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

  private updateEnemies(deltaSeconds: number, player: Player): void {
    const result = this.enemySystem.update({
      bounds: this.renderer.getViewportSize(),
      deltaSeconds,
      playerPosition: player.position,
    });

    for (const enemy of result.spawnedEnemies) {
      this.renderer.addToStage(enemy.renderable);
    }

    this.removeEnemies(result.removedEnemies);
  }

  private removeEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      this.renderer.removeFromStage(enemy.renderable);
      enemy.renderable.destroy();
    }
  }
}
