import { Text } from 'pixi.js';
import { Player, type Position } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { CollisionSystem } from '../systems/CollisionSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { InputManager } from '../core/InputManager';
import type { Renderer } from '../core/Renderer';

const INITIAL_PLAYER_POSITION_RATIO = 0.5;
const INITIAL_SCORE = 0;
const SCORE_PER_ENEMY = 1;
const SCORE_TEXT_X = 16;
const SCORE_TEXT_Y = 12;
const SCORE_TEXT_COLOR = 0xffffff;
const SCORE_TEXT_SIZE = 20;

export class GameScene {
  private readonly collisionSystem = new CollisionSystem();
  private readonly enemySystem = new EnemySystem();
  private readonly inputManager = new InputManager();
  private readonly movementSystem = new MovementSystem();
  private player: Player | null = null;
  private score = INITIAL_SCORE;
  private scoreText: Text | null = null;
  private isInitialized = false;

  public constructor(private readonly renderer: Renderer) {}

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.inputManager.initialize();
    this.score = INITIAL_SCORE;
    this.scoreText = this.createScoreText();
    this.renderer.addToStage(this.scoreText);
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
    this.resolvePlayerEnemyCollisions(this.player);
  }

  public destroy(): void {
    this.inputManager.destroy();
    this.removeEnemies(this.enemySystem.destroy());

    if (this.player !== null) {
      this.renderer.removeFromStage(this.player.renderable);
      this.player.renderable.destroy();
      this.player = null;
    }

    if (this.scoreText !== null) {
      this.renderer.removeFromStage(this.scoreText);
      this.scoreText.destroy();
      this.scoreText = null;
    }

    this.score = INITIAL_SCORE;
    this.isInitialized = false;
  }

  private getInitialPlayerPosition(): Position {
    const viewportSize = this.renderer.getViewportSize();

    return {
      x: viewportSize.width * INITIAL_PLAYER_POSITION_RATIO,
      y: viewportSize.height * INITIAL_PLAYER_POSITION_RATIO,
    };
  }

  private createScoreText(): Text {
    const scoreText = new Text({
      style: {
        fill: SCORE_TEXT_COLOR,
        fontSize: SCORE_TEXT_SIZE,
      },
      text: this.getScoreLabel(),
    });

    scoreText.position.set(SCORE_TEXT_X, SCORE_TEXT_Y);

    return scoreText;
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

  private resolvePlayerEnemyCollisions(player: Player): void {
    const collidedEnemies = this.collisionSystem.checkPlayerEnemyCollision(
      player,
      this.enemySystem.getEnemies(),
    );

    if (collidedEnemies.length === 0) {
      return;
    }

    const removedEnemies = this.enemySystem.removeEnemies(collidedEnemies);

    this.addScore(removedEnemies.length * SCORE_PER_ENEMY);
    this.removeEnemies(removedEnemies);
  }

  private addScore(points: number): void {
    this.score += points;

    if (this.scoreText !== null) {
      this.scoreText.text = this.getScoreLabel();
    }
  }

  private getScoreLabel(): string {
    return `Score: ${this.score}`;
  }
}
