import { Text } from 'pixi.js';
import { INITIAL_LIVES } from '../../../shared/constants/player';
import { POINTS_PER_SECOND } from '../../../shared/constants/simulation';
import { circleRectPushback } from '../../../shared/simulation/collision';
import {
  applyDamage,
  collectEnemyCollisions,
  computeWinner,
  type PlayerDamageState,
} from '../../../shared/simulation/damage';
import type { PlayerState } from '../../../shared/types/index';
import { Camera } from '../../core/Camera';
import { InputManager } from '../../core/InputManager';
import type { InputDirection } from '../../core/InputManager';
import type { AudioManager } from '../../core/AudioManager';
import type { Renderer } from '../../core/Renderer';
import type { Enemy } from '../../entities/Enemy';
import type { ObstacleRect } from '../../entities/Obstacle';
import { Player, type Position } from '../../entities/Player';
import { EnemySystem } from '../../systems/EnemySystem';
import { MovementSystem } from '../../systems/MovementSystem';
import { VirtualJoystick } from '../../ui/VirtualJoystick';
import { getWorldBounds, WORLD_GATES } from '../../utils/world';
import type { Scene } from '../common/Scene';
import {
  createSceneText,
  destroySceneText,
} from '../common/createSceneText';
import {
  createWorldView,
  destroyWorldView,
  type WorldView,
} from '../common/createWorldView';

const INITIAL_PLAYER_POSITION_RATIO = 0.5;
const INITIAL_SCORE = 0;
const INITIAL_SURVIVAL_TIME_SECONDS = 0;
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

// Shared structural type used by both Player and Enemy for obstacle collision.
interface CircleCollider {
  position: Position;
  radius: number;
}

export class SinglePlayerPlayingScene implements Scene {
  private readonly camera = new Camera();
  private readonly enemySystem = new EnemySystem();
  private readonly inputManager = new InputManager();
  private readonly movementSystem = new MovementSystem();
  private player: Player | null = null;
  private worldView: WorldView | null = null;
  private livesText: Text | null = null;
  private displayedScore = INITIAL_SCORE;
  private scoreText: Text | null = null;
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
    this.displayedScore = INITIAL_SCORE;
    this.displayedSurvivalSeconds = INITIAL_SURVIVAL_TIME_SECONDS;
    this.player = new Player(this.createInitialPlayerState());
    this.scoreText = this.createScoreText();
    this.timerText = this.createTimerText();
    this.livesText = this.createLivesText();
    this.worldView = createWorldView(this.renderer);
    this.renderer.addToStage(this.scoreText);
    this.renderer.addToStage(this.timerText);
    this.renderer.addToStage(this.livesText);
    this.worldView.container.addChild(this.player.renderable);
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
    this.resolvePlayerObstacleCollisions(this.player);
    this.camera.update(this.player.position, this.renderer.getViewportSize());
    this.updateDamageFeedback(deltaSeconds);
    this.syncWorldContainerPosition();
    this.updateEnemies(deltaSeconds, this.player);
    this.resolveEnemyObstacleCollisions();
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
      this.worldView?.container.removeChild(this.player.renderable);
      this.player.renderable.destroy();
      this.player = null;
    }

    destroyWorldView(this.renderer, this.worldView);
    this.worldView = null;

    destroySceneText(this.renderer, this.scoreText);
    destroySceneText(this.renderer, this.livesText);
    destroySceneText(this.renderer, this.timerText);
    this.scoreText = null;
    this.livesText = null;
    this.timerText = null;

    this.resetDamageFeedback();
    this.displayedScore = INITIAL_SCORE;
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

  private createInitialPlayerState(): PlayerState {
    return {
      id: 'single-player',
      position: this.getInitialPlayerPosition(),
      lives: INITIAL_LIVES,
      isEliminated: false,
      survivalTimeSeconds: INITIAL_SURVIVAL_TIME_SECONDS,
      score: INITIAL_SCORE,
    };
  }

  private createScoreText(): Text {
    const scoreText = createSceneText({
      fill: SCORE_TEXT_COLOR,
      fontSize: SCORE_TEXT_SIZE,
      text: this.getScoreLabel(),
    });

    scoreText.position.set(SCORE_TEXT_X, SCORE_TEXT_Y);

    return scoreText;
  }

  private createTimerText(): Text {
    const timerText = createSceneText({
      fill: TIMER_TEXT_COLOR,
      fontSize: TIMER_TEXT_SIZE,
      text: this.getTimerLabel(),
    });

    timerText.position.set(TIMER_TEXT_X, TIMER_TEXT_Y);

    return timerText;
  }

  private createLivesText(): Text {
    const livesText = createSceneText({
      fill: LIVES_TEXT_COLOR,
      fontSize: LIVES_TEXT_SIZE,
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

  private getObstacles() {
    return this.worldView?.obstacleSystem.getObstacles() ?? [];
  }

  private updateEnemies(deltaSeconds: number, player: Player): void {
    const viewport = this.renderer.getViewportSize();
    const result = this.enemySystem.update({
      bounds: getWorldBounds(),
      deltaSeconds,
      gates: WORLD_GATES,
      obstacles: this.getObstacles().map((o) => o.rect),
      playerPosition: player.position,
      survivalTimeSeconds: player.state.survivalTimeSeconds,
      viewport: {
        worldLeft:   -this.camera.x,
        worldTop:    -this.camera.y,
        worldRight:  -this.camera.x + viewport.width,
        worldBottom: -this.camera.y + viewport.height,
      },
    });

    for (const enemy of result.spawnedEnemies) {
      this.worldView?.container.addChild(enemy.renderable);
    }

    this.removeEnemies(result.removedEnemies);
  }

  private removeEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      this.worldView?.container.removeChild(enemy.renderable);
      enemy.renderable.destroy();
    }
  }

  private resolvePlayerObstacleCollisions(player: Player): void {
    for (const obstacle of this.getObstacles()) {
      this.resolveCircleRectCollision(player, obstacle.rect);
    }

    // Re-sync renderable after position corrections.
    player.syncRenderable();
  }

  private resolveEnemyObstacleCollisions(): void {
    const obstacles = this.getObstacles();

    for (const enemy of this.enemySystem.getEnemies()) {
      for (const obstacle of obstacles) {
        this.resolveCircleRectCollision(enemy, obstacle.rect);
      }

      // Re-sync renderable once after all obstacle corrections for this enemy.
      enemy.syncRenderable();
    }
  }

  private resolveCircleRectCollision(circle: CircleCollider, rect: ObstacleRect): void {
    const pushback = circleRectPushback(circle.position, circle.radius, rect);

    if (pushback === null) {
      return;
    }

    circle.position.x += pushback.x;
    circle.position.y += pushback.y;
  }

  private resolvePlayerEnemyCollisions(player: Player): void {
    const collidedEnemies = collectEnemyCollisions(
      this.toPlayerDamageState(player),
      this.enemySystem.getEnemies(),
    );

    if (collidedEnemies.length === 0) {
      return;
    }

    const removedEnemies = this.enemySystem.removeEnemies(collidedEnemies);

    if (removedEnemies.length === 0) {
      return;
    }

    const playerState = this.damagePlayer(player, removedEnemies.length);
    this.removeEnemies(removedEnemies);

    if (computeWinner([playerState]) === null) {
      this.onGameOver(this.getDisplayScore());
      return;
    }

    this.startDamageFeedback();
  }

  private damagePlayer(player: Player, damage: number): PlayerState {
    applyDamage(player.state, damage);
    this.updateLivesText();

    return player.state;
  }

  private toPlayerDamageState(player: Player): PlayerDamageState {
    return {
      position: player.position,
      radius: player.radius,
    };
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
    if (this.worldView !== null) {
      this.worldView.container.position.set(
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
    if (this.player === null) {
      return;
    }

    this.player.state.score += POINTS_PER_SECOND * deltaSeconds;
    this.player.state.survivalTimeSeconds += deltaSeconds;
    this.updateScoreText();
    this.updateTimerText();
  }

  private getDisplayScore(): number {
    return Math.floor(this.player?.state.score ?? INITIAL_SCORE);
  }

  private getScoreLabel(): string {
    return `Score: ${this.displayedScore}`;
  }

  private getLivesLabel(): string {
    return `Lives: ${this.player?.state.lives ?? INITIAL_LIVES}`;
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
      this.player?.state.survivalTimeSeconds ?? INITIAL_SURVIVAL_TIME_SECONDS,
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
