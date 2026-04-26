import { Text } from 'pixi.js';
import { Player, type Position } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { CollisionSystem } from '../systems/CollisionSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { InputManager } from '../core/InputManager';
import type { Renderer } from '../core/Renderer';
import type { Scene } from './Scene';

const INITIAL_PLAYER_POSITION_RATIO = 0.5;
const INITIAL_SCORE = 0;
const INITIAL_LIVES = 3;
const SCORE_TEXT_X = 16;
const SCORE_TEXT_Y = 12;
const SCORE_TEXT_COLOR = 0xffffff;
const SCORE_TEXT_SIZE = 20;
const LIVES_TEXT_X = 16;
const LIVES_TEXT_Y = 40;
const LIVES_TEXT_COLOR = 0xffffff;
const LIVES_TEXT_SIZE = 20;

export class PlayingScene implements Scene {
  private readonly collisionSystem = new CollisionSystem();
  private readonly enemySystem = new EnemySystem();
  private readonly inputManager = new InputManager();
  private readonly movementSystem = new MovementSystem();
  private player: Player | null = null;
  private lives = INITIAL_LIVES;
  private livesText: Text | null = null;
  private score = INITIAL_SCORE;
  private scoreText: Text | null = null;
  private isInitialized = false;

  public constructor(
    private readonly renderer: Renderer,
    private readonly onGameOver: (finalScore: number) => void,
  ) {}

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.inputManager.initialize();
    this.lives = INITIAL_LIVES;
    this.score = INITIAL_SCORE;
    this.scoreText = this.createScoreText();
    this.livesText = this.createLivesText();
    this.renderer.addToStage(this.scoreText);
    this.renderer.addToStage(this.livesText);
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

    if (this.livesText !== null) {
      this.renderer.removeFromStage(this.livesText);
      this.livesText.destroy();
      this.livesText = null;
    }

    this.lives = INITIAL_LIVES;
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

  private createLivesText(): Text {
    const livesText = new Text({
      style: {
        fill: LIVES_TEXT_COLOR,
        fontSize: LIVES_TEXT_SIZE,
      },
      text: this.getLivesLabel(),
    });

    livesText.position.set(LIVES_TEXT_X, LIVES_TEXT_Y);

    return livesText;
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

    if (removedEnemies.length === 0) {
      return;
    }

    this.damagePlayer(removedEnemies.length);
    this.removeEnemies(removedEnemies);

    if (this.lives <= 0) {
      this.onGameOver(this.score);
    }
  }

  private damagePlayer(damage: number): void {
    this.lives = Math.max(0, this.lives - damage);
    this.updateLivesText();
  }

  private getScoreLabel(): string {
    return `Score: ${this.score}`;
  }

  private getLivesLabel(): string {
    return `Lives: ${this.lives}`;
  }

  private updateLivesText(): void {
    if (this.livesText !== null) {
      this.livesText.text = this.getLivesLabel();
    }
  }
}
