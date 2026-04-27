import { Graphics, Text } from 'pixi.js';
import { ENEMY_RADIUS } from '../../../shared/constants/enemy';
import { PLAYER_RADIUS } from '../../../shared/constants/player';
import type {
  EnemyState,
  MatchSnapshot,
  PlayerState,
} from '../../../shared/types/index';
import { Camera } from '../../core/Camera';
import type { InputDirection, InputManager } from '../../core/InputManager';
import type { Renderer } from '../../core/Renderer';
import { VirtualJoystick } from '../../ui/VirtualJoystick';
import type {
  LobbyStatePayload,
  MatchFinishedPayload,
  MatchStartedPayload,
  MultiplayerSocketClient,
  PlayerEliminatedPayload,
} from './MultiplayerMenuScene';
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

const LOCAL_PLAYER_COLOR = 0x4fd1c5;
const REMOTE_PLAYER_COLOR = 0xfacc15;
const ELIMINATED_PLAYER_COLOR = 0x64748b;
const ENEMY_COLOR = 0xf56565;
const MUTED_TEXT_COLOR = 0xcbd5e1;
const TITLE_TEXT_SIZE = 18;
const STATUS_TEXT_SIZE = 14;
const ELIMINATED_TEXT_SIZE = 32;
const SCORE_TEXT_X = 16;
const SCORE_TEXT_Y = 12;
const TIMER_TEXT_X = 16;
const TIMER_TEXT_Y = 40;
const LIVES_TEXT_X = 16;
const LIVES_TEXT_Y = 68;
const STATUS_TEXT_X = 16;
const STATUS_TEXT_Y = 96;
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

export class MultiplayerPlayingScene implements Scene {
  private readonly camera = new Camera();
  private readonly playerRenderables = new Map<string, Graphics>();
  private readonly enemyRenderables = new Map<string, Graphics>();
  private worldView: WorldView | null = null;
  private scoreText: Text | null = null;
  private timerText: Text | null = null;
  private livesText: Text | null = null;
  private statusText: Text | null = null;
  private eliminatedText: Text | null = null;
  private virtualJoystick: VirtualJoystick | null = null;
  private latestSnapshot: MatchSnapshot;
  private latestLobbyState: LobbyStatePayload | null = null;
  private previousLocalLives: number | null = null;
  private damageFlashSeconds = 0;
  private damageShakeSeconds = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private matchFinished = false;

  public constructor(
    private readonly renderer: Renderer,
    private readonly inputManager: InputManager,
    private readonly socketClient: MultiplayerSocketClient,
    match: MatchStartedPayload,
    private readonly onMatchFinished: (
      payload: MatchFinishedPayload,
      lobbyState: LobbyStatePayload | null,
    ) => void,
  ) {
    this.latestSnapshot = match.initialState;
  }

  public initialize(): void {
    this.inputManager.initialize();
    this.socketClient.on('match:snapshot', this.handleMatchSnapshot);
    this.socketClient.on('player:eliminated', this.handlePlayerEliminated);
    this.socketClient.on('match:finished', this.handleMatchFinished);
    this.socketClient.on('lobby:state', this.handleLobbyState);

    this.worldView = createWorldView(this.renderer);

    this.scoreText = createSceneText({ fontSize: TITLE_TEXT_SIZE, text: '' });
    this.timerText = createSceneText({ fontSize: TITLE_TEXT_SIZE, text: '' });
    this.livesText = createSceneText({ fontSize: TITLE_TEXT_SIZE, text: '' });
    this.statusText = createSceneText({
      fill: MUTED_TEXT_COLOR,
      fontSize: STATUS_TEXT_SIZE,
      text: '',
    });
    this.eliminatedText = createSceneText({
      align: 'center',
      anchor: 0.5,
      fill: 0xfca5a5,
      fontSize: ELIMINATED_TEXT_SIZE,
      text: 'Eliminated',
    });
    this.eliminatedText.visible = false;

    this.renderer.addToStage(this.scoreText);
    this.renderer.addToStage(this.timerText);
    this.renderer.addToStage(this.livesText);
    this.renderer.addToStage(this.statusText);
    this.renderer.addToStage(this.eliminatedText);
    this.initializeVirtualJoystick();
    this.renderSnapshot();
    this.resizeViewportUi();
  }

  public update(deltaSeconds: number): void {
    this.updateDamageFeedback(deltaSeconds);

    if (this.matchFinished || this.isLocalPlayerEliminated()) {
      return;
    }

    const direction = this.getMovementDirection();

    this.socketClient.emit('player:input', {
      dx: direction.x,
      dy: direction.y,
    });
  }

  public resize(width: number, height: number): void {
    this.scoreText?.position.set(SCORE_TEXT_X, SCORE_TEXT_Y);
    this.timerText?.position.set(TIMER_TEXT_X, TIMER_TEXT_Y);
    this.livesText?.position.set(LIVES_TEXT_X, LIVES_TEXT_Y);
    this.statusText?.position.set(STATUS_TEXT_X, STATUS_TEXT_Y);
    this.eliminatedText?.position.set(width / 2, height * 0.32);
    this.updateCamera();
  }

  public destroy(): void {
    this.socketClient.off('match:snapshot', this.handleMatchSnapshot);
    this.socketClient.off('player:eliminated', this.handlePlayerEliminated);
    this.socketClient.off('match:finished', this.handleMatchFinished);
    this.socketClient.off('lobby:state', this.handleLobbyState);
    this.inputManager.destroy();
    this.destroyVirtualJoystick();

    this.playerRenderables.clear();
    this.enemyRenderables.clear();
    destroyWorldView(this.renderer, this.worldView);
    this.worldView = null;

    destroySceneText(this.renderer, this.eliminatedText);
    destroySceneText(this.renderer, this.statusText);
    destroySceneText(this.renderer, this.livesText);
    destroySceneText(this.renderer, this.timerText);
    destroySceneText(this.renderer, this.scoreText);
    this.eliminatedText = null;
    this.statusText = null;
    this.livesText = null;
    this.timerText = null;
    this.scoreText = null;
    this.previousLocalLives = null;
    this.damageFlashSeconds = 0;
    this.damageShakeSeconds = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  private resizeViewportUi(): void {
    const viewport = this.renderer.getViewportSize();

    this.resize(viewport.width, viewport.height);
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

  private readonly handleMatchSnapshot = (snapshot: MatchSnapshot): void => {
    this.latestSnapshot = snapshot;
    this.updateLocalDamageState();
    this.updateEliminatedOverlayFromSnapshot();
    this.renderSnapshot();
  };

  private readonly handlePlayerEliminated = (
    elimination: PlayerEliminatedPayload,
  ): void => {
    if (elimination.playerId === this.socketClient.getId()) {
      this.showEliminatedOverlay();
    }
  };

  private readonly handleMatchFinished = (
    payload: MatchFinishedPayload,
  ): void => {
    this.matchFinished = true;
    this.onMatchFinished(payload, this.latestLobbyState);
  };

  private readonly handleLobbyState = (state: LobbyStatePayload): void => {
    this.latestLobbyState = state;
  };

  private renderSnapshot(): void {
    this.syncPlayerRenderables();
    this.syncEnemyRenderables();
    this.renderPlayers();
    this.renderEnemies();
    this.updateUi();
    this.updateCamera();
  }

  private syncPlayerRenderables(): void {
    const snapshotPlayerIds = new Set(
      this.latestSnapshot.players.map((player) => player.id),
    );

    for (const [playerId, renderable] of this.playerRenderables.entries()) {
      if (!snapshotPlayerIds.has(playerId)) {
        this.worldView?.container.removeChild(renderable);
        renderable.destroy();
        this.playerRenderables.delete(playerId);
      }
    }

    for (const player of this.latestSnapshot.players) {
      if (!this.playerRenderables.has(player.id)) {
        const renderable = new Graphics();

        this.drawPlayerRenderable(renderable, player);
        this.playerRenderables.set(player.id, renderable);
        this.worldView?.container.addChild(renderable);
      }
    }
  }

  private syncEnemyRenderables(): void {
    const snapshotEnemyIds = new Set(
      this.latestSnapshot.enemies.map((enemy) => enemy.id),
    );

    for (const [enemyId, renderable] of this.enemyRenderables.entries()) {
      if (!snapshotEnemyIds.has(enemyId)) {
        this.worldView?.container.removeChild(renderable);
        renderable.destroy();
        this.enemyRenderables.delete(enemyId);
      }
    }

    for (const enemy of this.latestSnapshot.enemies) {
      if (!this.enemyRenderables.has(enemy.id)) {
        const renderable = new Graphics()
          .circle(0, 0, ENEMY_RADIUS)
          .fill(ENEMY_COLOR);

        this.enemyRenderables.set(enemy.id, renderable);
        this.worldView?.container.addChild(renderable);
      }
    }
  }

  private renderPlayers(): void {
    for (const player of this.latestSnapshot.players) {
      this.renderPlayer(player);
    }
  }

  private renderEnemies(): void {
    for (const enemy of this.latestSnapshot.enemies) {
      this.renderEnemy(enemy);
    }
  }

  private renderPlayer(player: PlayerState): void {
    const renderable = this.playerRenderables.get(player.id);

    if (renderable === undefined) {
      return;
    }

    this.drawPlayerRenderable(renderable, player);
    renderable.position.set(player.position.x, player.position.y);
  }

  private renderEnemy(enemy: EnemyState): void {
    const renderable = this.enemyRenderables.get(enemy.id);

    if (renderable === undefined) {
      return;
    }

    renderable.position.set(enemy.position.x, enemy.position.y);
  }

  private drawPlayerRenderable(renderable: Graphics, player: PlayerState): void {
    const isLocalPlayer = player.id === this.socketClient.getId();
    const color = player.isEliminated
      ? ELIMINATED_PLAYER_COLOR
      : isLocalPlayer
        ? LOCAL_PLAYER_COLOR
        : REMOTE_PLAYER_COLOR;

    renderable
      .clear()
      .circle(0, 0, PLAYER_RADIUS)
      .fill(color);
  }

  private updateCamera(): void {
    const followedPlayer = this.getCameraTargetPlayer();

    if (followedPlayer === null) {
      return;
    }

    this.camera.update(followedPlayer.position, this.renderer.getViewportSize());
    this.syncWorldContainerPosition();
  }

  private getCameraTargetPlayer(): PlayerState | null {
    const localPlayer = this.getLocalPlayer();

    if (localPlayer !== null) {
      return localPlayer;
    }

    return this.latestSnapshot.players[0] ?? null;
  }

  private updateUi(): void {
    const localPlayer = this.getLocalPlayer();

    if (this.scoreText !== null) {
      this.scoreText.text = `Score: ${Math.floor(localPlayer?.score ?? 0)}`;
    }

    if (this.timerText !== null) {
      this.timerText.text = `Survival Time: ${this.formatSurvivalTime(
        localPlayer?.survivalTimeSeconds ?? this.latestSnapshot.elapsedSeconds,
      )}`;
    }

    if (this.livesText !== null) {
      this.livesText.text = `Lives: ${localPlayer?.lives ?? '-'}`;
    }

    if (this.statusText !== null) {
      this.statusText.text = `Players: ${this.latestSnapshot.players.length}  Enemies: ${this.latestSnapshot.enemies.length}`;
    }
  }

  private formatSurvivalTime(totalSeconds: number): string {
    const wholeSeconds = Math.floor(totalSeconds);
    const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
    const seconds = wholeSeconds % SECONDS_PER_MINUTE;
    const formattedMinutes = minutes.toString().padStart(
      TIMER_PART_PADDING_LENGTH,
      TIMER_PART_PADDING_VALUE,
    );
    const formattedSeconds = seconds.toString().padStart(
      TIMER_PART_PADDING_LENGTH,
      TIMER_PART_PADDING_VALUE,
    );

    return `${formattedMinutes}:${formattedSeconds}`;
  }

  private updateLocalDamageState(): void {
    const localPlayer = this.getLocalPlayer();

    if (localPlayer === null) {
      return;
    }

    if (
      this.previousLocalLives !== null &&
      localPlayer.lives < this.previousLocalLives
    ) {
      this.startDamageFeedback();
    }

    this.previousLocalLives = localPlayer.lives;
  }

  private startDamageFeedback(): void {
    this.damageFlashSeconds = DAMAGE_FLASH_DURATION_SECONDS;
    this.damageShakeSeconds = DAMAGE_SHAKE_DURATION_SECONDS;
  }

  private updateDamageFeedback(deltaSeconds: number): void {
    this.updatePlayerFlash(deltaSeconds);
    this.updateStageShake(deltaSeconds);
  }

  private updatePlayerFlash(deltaSeconds: number): void {
    const localRenderable = this.getLocalPlayerRenderable();

    if (localRenderable === null) {
      return;
    }

    this.damageFlashSeconds = Math.max(0, this.damageFlashSeconds - deltaSeconds);
    localRenderable.alpha =
      this.damageFlashSeconds > 0 ? DAMAGED_PLAYER_ALPHA : DEFAULT_PLAYER_ALPHA;
  }

  private updateStageShake(deltaSeconds: number): void {
    if (this.damageShakeSeconds <= 0) {
      return;
    }

    this.damageShakeSeconds = Math.max(0, this.damageShakeSeconds - deltaSeconds);

    if (this.damageShakeSeconds === 0) {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.syncWorldContainerPosition();
      return;
    }

    const shakeProgress = this.damageShakeSeconds * DAMAGE_SHAKE_FREQUENCY;

    this.shakeOffsetX = Math.sin(shakeProgress) * DAMAGE_SHAKE_INTENSITY;
    this.shakeOffsetY = Math.cos(shakeProgress) * DAMAGE_SHAKE_INTENSITY;
    this.syncWorldContainerPosition();
  }

  private syncWorldContainerPosition(): void {
    this.worldView?.container.position.set(
      this.camera.x + this.shakeOffsetX,
      this.camera.y + this.shakeOffsetY,
    );
  }

  private updateEliminatedOverlayFromSnapshot(): void {
    if (this.isLocalPlayerEliminated()) {
      this.showEliminatedOverlay();
    }
  }

  private isLocalPlayerEliminated(): boolean {
    return this.getLocalPlayer()?.isEliminated === true;
  }

  private getLocalPlayer(): PlayerState | null {
    const socketId = this.socketClient.getId();

    if (socketId === null) {
      return null;
    }

    return this.latestSnapshot.players.find((player) => player.id === socketId) ?? null;
  }

  private getLocalPlayerRenderable(): Graphics | null {
    const socketId = this.socketClient.getId();

    if (socketId === null) {
      return null;
    }

    return this.playerRenderables.get(socketId) ?? null;
  }

  private showEliminatedOverlay(): void {
    if (this.eliminatedText !== null) {
      this.eliminatedText.visible = true;
    }
  }

}
