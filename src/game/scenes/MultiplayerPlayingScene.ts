import { Container, Graphics, Text } from 'pixi.js';
import { ENEMY_RADIUS } from '../../shared/constants/enemy';
import { PLAYER_RADIUS } from '../../shared/constants/player';
import type {
  EnemyState,
  MatchSnapshot,
  PlayerState,
} from '../../shared/types/index';
import { Camera } from '../core/Camera';
import type { InputDirection, InputManager } from '../core/InputManager';
import type { Renderer } from '../core/Renderer';
import { ObstacleSystem } from '../systems/ObstacleSystem';
import { GroundBackground } from '../ui/GroundBackground';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { WorldBoundary } from '../ui/WorldBoundary';
import type {
  LobbyStatePayload,
  MatchFinishedPayload,
  MatchStartedPayload,
  MultiplayerSocketClient,
  PlayerEliminatedPayload,
} from './MultiplayerMenuScene';
import type { Scene } from './Scene';

const LOCAL_PLAYER_COLOR = 0x4fd1c5;
const REMOTE_PLAYER_COLOR = 0xfacc15;
const ELIMINATED_PLAYER_COLOR = 0x64748b;
const ENEMY_COLOR = 0xf56565;
const TEXT_COLOR = 0xffffff;
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
const DAMAGED_PLAYER_ALPHA = 0.35;
const DEFAULT_PLAYER_ALPHA = 1;
const NEUTRAL_DIRECTION = 0;

export class MultiplayerPlayingScene implements Scene {
  private readonly camera = new Camera();
  private readonly obstacleSystem = new ObstacleSystem();
  private readonly playerRenderables = new Map<string, Graphics>();
  private readonly enemyRenderables = new Map<string, Graphics>();
  private worldContainer: Container | null = null;
  private ground: GroundBackground | null = null;
  private boundary: WorldBoundary | null = null;
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

    this.worldContainer = new Container();
    this.renderer.addToStage(this.worldContainer);

    this.ground = new GroundBackground();
    this.worldContainer.addChild(this.ground.renderable);

    this.boundary = new WorldBoundary();
    this.worldContainer.addChild(this.boundary.renderable);

    for (const obstacle of this.obstacleSystem.initialize()) {
      this.worldContainer.addChild(obstacle.renderable);
    }

    this.scoreText = this.createScreenText('', TITLE_TEXT_SIZE);
    this.timerText = this.createScreenText('', TITLE_TEXT_SIZE);
    this.livesText = this.createScreenText('', TITLE_TEXT_SIZE);
    this.statusText = this.createScreenText('', STATUS_TEXT_SIZE, MUTED_TEXT_COLOR);
    this.eliminatedText = new Text({
      anchor: 0.5,
      style: {
        align: 'center',
        fill: 0xfca5a5,
        fontSize: ELIMINATED_TEXT_SIZE,
      },
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

    this.obstacleSystem.destroy();
    this.playerRenderables.clear();
    this.enemyRenderables.clear();

    if (this.worldContainer !== null) {
      this.renderer.removeFromStage(this.worldContainer);
      this.worldContainer.destroy({ children: true });
      this.worldContainer = null;
    }

    this.ground = null;
    this.boundary = null;

    this.destroyText(this.eliminatedText);
    this.destroyText(this.statusText);
    this.destroyText(this.livesText);
    this.destroyText(this.timerText);
    this.destroyText(this.scoreText);
    this.eliminatedText = null;
    this.statusText = null;
    this.livesText = null;
    this.timerText = null;
    this.scoreText = null;
    this.previousLocalLives = null;
    this.damageFlashSeconds = 0;
  }

  private createScreenText(text: string, fontSize: number, fill = TEXT_COLOR): Text {
    return new Text({
      style: {
        fill,
        fontSize,
      },
      text,
    });
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
        this.worldContainer?.removeChild(renderable);
        renderable.destroy();
        this.playerRenderables.delete(playerId);
      }
    }

    for (const player of this.latestSnapshot.players) {
      if (!this.playerRenderables.has(player.id)) {
        const renderable = new Graphics();

        this.drawPlayerRenderable(renderable, player);
        this.playerRenderables.set(player.id, renderable);
        this.worldContainer?.addChild(renderable);
      }
    }
  }

  private syncEnemyRenderables(): void {
    const snapshotEnemyIds = new Set(
      this.latestSnapshot.enemies.map((enemy) => enemy.id),
    );

    for (const [enemyId, renderable] of this.enemyRenderables.entries()) {
      if (!snapshotEnemyIds.has(enemyId)) {
        this.worldContainer?.removeChild(renderable);
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
        this.worldContainer?.addChild(renderable);
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
    this.worldContainer?.position.set(this.camera.x, this.camera.y);
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
  }

  private updateDamageFeedback(deltaSeconds: number): void {
    const localRenderable = this.getLocalPlayerRenderable();

    if (localRenderable === null) {
      return;
    }

    this.damageFlashSeconds = Math.max(0, this.damageFlashSeconds - deltaSeconds);
    localRenderable.alpha =
      this.damageFlashSeconds > 0 ? DAMAGED_PLAYER_ALPHA : DEFAULT_PLAYER_ALPHA;
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

  private destroyText(text: Text | null): void {
    if (text === null) {
      return;
    }

    this.renderer.removeFromStage(text);
    text.destroy();
  }
}
