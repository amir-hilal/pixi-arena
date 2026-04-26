import { Container, Text } from 'pixi.js';
import { Player, type Position } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { CollisionSystem } from '../systems/CollisionSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { InputManager } from '../core/InputManager';
import type { InputDirection } from '../core/InputManager';
import type { AudioManager } from '../core/AudioManager';
import type { Renderer } from '../core/Renderer';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import type { Scene } from './Scene';
import { getWorldBounds } from '../utils/world';
import { Camera } from '../core/Camera';

const INITIAL_PLAYER_POSITION_RATIO = 0.5;
const INITIAL_SCORE = 0;
const INITIAL_SURVIVAL_TIME_SECONDS = 0;
const INITIAL_LIVES = 3;
const POINTS_PER_SECOND = 10;
const SCORE_TEXT_X = 16;
const SCORE_TEXT_Y = 12;
const SCORE_TEXT_COLOR = 0xffffff;
const SCORE_TEXT_SIZE = 20;
const LIVES_TEXT_X = 16;
const LIVES_TEXT_Y = 68;
const LIVES_TEXT_COLOR = 0xffffff;
const LIVES_TEXT_SIZE = 20;
const TIMER_TEXT_X = 16;
const TIMER_TEXT_Y = 40;
const TIMER_TEXT_COLOR = 0xffffff;
const TIMER_TEXT_SIZE = 20;
const SECONDS_PER_MINUTE = 60;
const TIMER_PART_PADDING_LENGTH = 2;
const TIMER_PART_PADDING_VALUE = '0';
const DAMAGE_FLASH_DURATION_SECONDS = 0.45;
const DAMAGE_SHAKE_DURATION_SECONDS = 0.28;
const DAMAGED_PLAYER_ALPHA = 0.35;
const DEFAULT_PLAYER_ALPHA = 1;
const DAMAGE_SHAKE_INTENSITY = 8;
const DAMAGE_SHAKE_FREQUENCY = 70;
const NEUTRAL_DIRECTION = 0;

export class PlayingScene implements Scene {
  private readonly camera = new Camera();
  private readonly collisionSystem = new CollisionSystem();
  private readonly enemySystem = new EnemySystem();
  private readonly inputManager = new InputManager();
  private readonly movementSystem = new MovementSystem();
  private player: Player | null = null;
  private worldContainer: Container | null = null;
  private lives = INITIAL_LIVES;
  private livesText: Text | null = null;
  private score = INITIAL_SCORE;
  private displayedScore = INITIAL_SCORE;
  private scoreText: Text | null = null;
  private survivalTimeSeconds = INITIAL_SURVIVAL_TIME_SECONDS;
  private displayedSurvivalSeconds = INITIAL_SURVIVAL_TIME_SECONDS;
  private timerText: Text | null = null;
  private virtualJoystick: VirtualJoystick | null = null;
  private damageFlashSeconds = 0;
  private damageShakeSeconds = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private isInitialized = false;

  public constructor(
    private readonly renderer: Renderer,
    private readonly audioManager: AudioManager,
    private readonly onGameOver: (finalScore: number) => void,
  ) {}

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.inputManager.initialize();
    this.lives = INITIAL_LIVES;
    this.score = INITIAL_SCORE;
    this.displayedScore = INITIAL_SCORE;
    this.survivalTimeSeconds = INITIAL_SURVIVAL_TIME_SECONDS;
    this.displayedSurvivalSeconds = INITIAL_SURVIVAL_TIME_SECONDS;
    this.scoreText = this.createScoreText();
    this.timerText = this.createTimerText();
    this.livesText = this.createLivesText();
    this.renderer.addToStage(this.scoreText);
    this.renderer.addToStage(this.timerText);
    this.renderer.addToStage(this.livesText);
    this.worldContainer = new Container();
    this.renderer.addToStage(this.worldContainer);
    this.player = new Player(this.getInitialPlayerPosition());
    this.worldContainer.addChild(this.player.renderable);
    this.initializeVirtualJoystick();
    this.isInitialized = true;
  }

  public update(deltaSeconds: number): void {
    if (this.player === null) {
      return;
    }

    this.updateSurvivalScore(deltaSeconds);
    this.movementSystem.update({
      bounds: getWorldBounds(),
      deltaSeconds,
      movementDirection: this.getMovementDirection(),
      player: this.player,
    });
    this.camera.update(this.player.position, this.renderer.getViewportSize());
    this.updateDamageFeedback(deltaSeconds);
    this.syncWorldContainerPosition();
    this.updateEnemies(deltaSeconds, this.player);
    this.resolvePlayerEnemyCollisions(this.player);
  }

  public resize(width: number, height: number): void {
    if (this.player !== null) {
      this.camera.update(this.player.position, { width, height });
      this.syncWorldContainerPosition();
    }
  }

  public destroy(): void {
    this.inputManager.destroy();
    this.destroyVirtualJoystick();
    this.removeEnemies(this.enemySystem.destroy());

    if (this.player !== null) {
      this.worldContainer?.removeChild(this.player.renderable);
      this.player.renderable.destroy();
      this.player = null;
    }

    if (this.worldContainer !== null) {
      this.renderer.removeFromStage(this.worldContainer);
      this.worldContainer.destroy();
      this.worldContainer = null;
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

    if (this.timerText !== null) {
      this.renderer.removeFromStage(this.timerText);
      this.timerText.destroy();
      this.timerText = null;
    }

    this.lives = INITIAL_LIVES;
    this.resetDamageFeedback();
    this.score = INITIAL_SCORE;
    this.displayedScore = INITIAL_SCORE;
    this.survivalTimeSeconds = INITIAL_SURVIVAL_TIME_SECONDS;
    this.displayedSurvivalSeconds = INITIAL_SURVIVAL_TIME_SECONDS;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.isInitialized = false;
  }

  private getInitialPlayerPosition(): Position {
    const worldBounds = getWorldBounds();

    return {
      x: worldBounds.width * INITIAL_PLAYER_POSITION_RATIO,
      y: worldBounds.height * INITIAL_PLAYER_POSITION_RATIO,
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

  private createTimerText(): Text {
    const timerText = new Text({
      style: {
        fill: TIMER_TEXT_COLOR,
        fontSize: TIMER_TEXT_SIZE,
      },
      text: this.getTimerLabel(),
    });

    timerText.position.set(TIMER_TEXT_X, TIMER_TEXT_Y);

    return timerText;
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

  private initializeVirtualJoystick(): void {
    if (!VirtualJoystick.isSupported()) {
      return;
    }

    this.virtualJoystick = new VirtualJoystick();
    this.renderer.addToStage(this.virtualJoystick.renderable);
  }

  private destroyVirtualJoystick(): void {
    if (this.virtualJoystick === null) {
      return;
    }

    this.renderer.removeFromStage(this.virtualJoystick.renderable);
    this.virtualJoystick.destroy();
    this.virtualJoystick = null;
  }

  private getMovementDirection(): InputDirection {
    const keyboardDirection = this.inputManager.getMovementDirection();
    const joystickDirection = this.virtualJoystick?.getDirection() ?? {
      x: NEUTRAL_DIRECTION,
      y: NEUTRAL_DIRECTION,
    };

    return {
      x: keyboardDirection.x + joystickDirection.x,
      y: keyboardDirection.y + joystickDirection.y,
    };
  }

  private updateEnemies(deltaSeconds: number, player: Player): void {
    const result = this.enemySystem.update({
      bounds: getWorldBounds(),
      deltaSeconds,
      playerPosition: player.position,
      survivalTimeSeconds: this.survivalTimeSeconds,
    });

    for (const enemy of result.spawnedEnemies) {
      this.worldContainer?.addChild(enemy.renderable);
    }

    this.removeEnemies(result.removedEnemies);
  }

  private removeEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      this.worldContainer?.removeChild(enemy.renderable);
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
      this.onGameOver(this.getDisplayScore());
      return;
    }

    this.startDamageFeedback();
  }

  private damagePlayer(damage: number): void {
    this.lives = Math.max(0, this.lives - damage);
    this.updateLivesText();
  }

  private startDamageFeedback(): void {
    this.audioManager.playDamage();
    this.startVisualDamageFeedback();
  }

  private startVisualDamageFeedback(): void {
    this.damageFlashSeconds = DAMAGE_FLASH_DURATION_SECONDS;
    this.damageShakeSeconds = DAMAGE_SHAKE_DURATION_SECONDS;
  }

  private updateDamageFeedback(deltaSeconds: number): void {
    this.updatePlayerFlash(deltaSeconds);
    this.updateStageShake(deltaSeconds);
  }

  private updatePlayerFlash(deltaSeconds: number): void {
    if (this.player === null || this.damageFlashSeconds <= 0) {
      return;
    }

    this.damageFlashSeconds = Math.max(0, this.damageFlashSeconds - deltaSeconds);
    this.player.renderable.alpha =
      this.damageFlashSeconds > 0 ? DAMAGED_PLAYER_ALPHA : DEFAULT_PLAYER_ALPHA;
  }

  private syncWorldContainerPosition(): void {
    if (this.worldContainer !== null) {
      this.worldContainer.position.set(
        this.camera.x + this.shakeOffsetX,
        this.camera.y + this.shakeOffsetY,
      );
    }
  }

  private updateStageShake(deltaSeconds: number): void {
    if (this.damageShakeSeconds <= 0) {
      return;
    }

    this.damageShakeSeconds = Math.max(0, this.damageShakeSeconds - deltaSeconds);

    if (this.damageShakeSeconds === 0) {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }

    const shakeProgress = this.damageShakeSeconds * DAMAGE_SHAKE_FREQUENCY;

    this.shakeOffsetX = Math.sin(shakeProgress) * DAMAGE_SHAKE_INTENSITY;
    this.shakeOffsetY = Math.cos(shakeProgress) * DAMAGE_SHAKE_INTENSITY;
  }

  private resetDamageFeedback(): void {
    this.damageFlashSeconds = 0;
    this.damageShakeSeconds = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    if (this.player !== null) {
      this.player.renderable.alpha = DEFAULT_PLAYER_ALPHA;
    }
  }

  private updateSurvivalScore(deltaSeconds: number): void {
    this.score += POINTS_PER_SECOND * deltaSeconds;
    this.survivalTimeSeconds += deltaSeconds;
    this.updateScoreText();
    this.updateTimerText();
  }

  private getDisplayScore(): number {
    return Math.floor(this.score);
  }

  private getScoreLabel(): string {
    return `Score: ${this.displayedScore}`;
  }

  private getLivesLabel(): string {
    return `Lives: ${this.lives}`;
  }

  private getTimerLabel(): string {
    const minutes = Math.floor(
      this.displayedSurvivalSeconds / SECONDS_PER_MINUTE,
    );
    const seconds = this.displayedSurvivalSeconds % SECONDS_PER_MINUTE;
    const formattedMinutes = this.formatTimerPart(minutes);
    const formattedSeconds = this.formatTimerPart(seconds);

    return `Survival Time: ${formattedMinutes}:${formattedSeconds}`;
  }

  private formatTimerPart(value: number): string {
    return value.toString().padStart(
      TIMER_PART_PADDING_LENGTH,
      TIMER_PART_PADDING_VALUE,
    );
  }

  private updateLivesText(): void {
    if (this.livesText !== null) {
      this.livesText.text = this.getLivesLabel();
    }
  }

  private updateScoreText(): void {
    const nextDisplayedScore = this.getDisplayScore();

    if (
      this.scoreText !== null &&
      nextDisplayedScore !== this.displayedScore
    ) {
      this.displayedScore = nextDisplayedScore;
      this.scoreText.text = this.getScoreLabel();
    }
  }

  private updateTimerText(): void {
    const nextDisplayedSurvivalSeconds = Math.floor(
      this.survivalTimeSeconds,
    );

    if (
      this.timerText !== null &&
      nextDisplayedSurvivalSeconds !== this.displayedSurvivalSeconds
    ) {
      this.displayedSurvivalSeconds = nextDisplayedSurvivalSeconds;
      this.timerText.text = this.getTimerLabel();
    }
  }
}
