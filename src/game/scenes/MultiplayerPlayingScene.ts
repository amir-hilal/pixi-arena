import { Graphics, Text } from 'pixi.js';
import { ENEMY_RADIUS } from '../../shared/constants/enemy';
import { PLAYER_RADIUS } from '../../shared/constants/player';
import { WORLD_WIDTH } from '../../shared/constants/world';
import type {
  EnemyState,
  MatchSnapshot,
  PlayerState,
} from '../../shared/types/index';
import type { InputManager } from '../core/InputManager';
import type { Renderer } from '../core/Renderer';
import type {
  MatchFinishedPayload,
  MatchStartedPayload,
  MultiplayerSocketClient,
  PlayerEliminatedPayload,
} from './MultiplayerMenuScene';
import type { Scene } from './Scene';

const LOCAL_PLAYER_COLOR = 0x4fd1c5;
const REMOTE_PLAYER_COLOR = 0xfacc15;
const ENEMY_COLOR = 0xf56565;
const TEXT_COLOR = 0xffffff;
const MUTED_TEXT_COLOR = 0xcbd5e1;
const TITLE_TEXT_SIZE = 18;
const STATUS_TEXT_SIZE = 14;
const ELIMINATED_TEXT_SIZE = 32;
const WORLD_MARGIN = 32;

export class MultiplayerPlayingScene implements Scene {
  private readonly playerRenderables = new Map<string, Graphics>();
  private readonly enemyRenderables = new Map<string, Graphics>();
  private statusText: Text | null = null;
  private tickText: Text | null = null;
  private eliminatedText: Text | null = null;
  private resultText: Text | null = null;
  private latestSnapshot: MatchSnapshot;
  private matchFinished = false;

  public constructor(
    private readonly renderer: Renderer,
    private readonly inputManager: InputManager,
    private readonly socketClient: MultiplayerSocketClient,
    match: MatchStartedPayload,
  ) {
    this.latestSnapshot = match.initialState;
  }

  public initialize(): void {
    this.inputManager.initialize();
    this.socketClient.on('match:snapshot', this.handleMatchSnapshot);
    this.socketClient.on('player:eliminated', this.handlePlayerEliminated);
    this.socketClient.on('match:finished', this.handleMatchFinished);

    this.statusText = new Text({
      style: {
        fill: TEXT_COLOR,
        fontSize: TITLE_TEXT_SIZE,
      },
      text: 'Multiplayer Match',
    });
    this.tickText = new Text({
      style: {
        fill: MUTED_TEXT_COLOR,
        fontSize: STATUS_TEXT_SIZE,
      },
      text: '',
    });
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
    this.resultText = new Text({
      anchor: 0.5,
      style: {
        align: 'center',
        fill: TEXT_COLOR,
        fontSize: TITLE_TEXT_SIZE,
      },
      text: '',
    });
    this.resultText.visible = false;

    this.renderer.addToStage(this.statusText);
    this.renderer.addToStage(this.tickText);
    this.renderer.addToStage(this.eliminatedText);
    this.renderer.addToStage(this.resultText);
    this.renderSnapshot();
  }

  public update(_deltaSeconds: number): void {
    if (this.matchFinished || this.isLocalPlayerEliminated()) {
      return;
    }

    const direction = this.inputManager.getMovementDirection();

    this.socketClient.emit('player:input', {
      dx: direction.x,
      dy: direction.y,
    });
  }

  public resize(width: number, _height: number): void {
    this.statusText?.position.set(WORLD_MARGIN, WORLD_MARGIN);
    this.tickText?.position.set(WORLD_MARGIN, WORLD_MARGIN + 26);
    this.eliminatedText?.position.set(width / 2, WORLD_MARGIN + 120);
    this.resultText?.position.set(width / 2, WORLD_MARGIN + 170);
    this.renderPlayers(width);
    this.renderEnemies(width);
  }

  public destroy(): void {
    this.socketClient.off('match:snapshot', this.handleMatchSnapshot);
    this.socketClient.off('player:eliminated', this.handlePlayerEliminated);
    this.socketClient.off('match:finished', this.handleMatchFinished);
    this.inputManager.destroy();

    for (const renderable of this.playerRenderables.values()) {
      this.renderer.removeFromStage(renderable);
      renderable.destroy();
    }

    for (const renderable of this.enemyRenderables.values()) {
      this.renderer.removeFromStage(renderable);
      renderable.destroy();
    }

    this.playerRenderables.clear();
    this.enemyRenderables.clear();
    this.destroyText(this.resultText);
    this.destroyText(this.eliminatedText);
    this.destroyText(this.tickText);
    this.destroyText(this.statusText);
    this.resultText = null;
    this.eliminatedText = null;
    this.tickText = null;
    this.statusText = null;
  }

  private readonly handleMatchSnapshot = (snapshot: MatchSnapshot): void => {
    this.latestSnapshot = snapshot;
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
    this.showMatchFinished(payload);
  };

  private renderSnapshot(): void {
    if (this.tickText !== null) {
      this.tickText.text = `Tick ${this.latestSnapshot.tick}`;
    }

    this.syncPlayerRenderables();
    this.syncEnemyRenderables();
    this.renderPlayers(this.renderer.getViewportSize().width);
    this.renderEnemies(this.renderer.getViewportSize().width);
  }

  private syncPlayerRenderables(): void {
    const snapshotPlayerIds = new Set(
      this.latestSnapshot.players.map((player) => player.id),
    );

    for (const [playerId, renderable] of this.playerRenderables.entries()) {
      if (!snapshotPlayerIds.has(playerId)) {
        this.renderer.removeFromStage(renderable);
        renderable.destroy();
        this.playerRenderables.delete(playerId);
      }
    }

    for (const player of this.latestSnapshot.players) {
      if (!this.playerRenderables.has(player.id)) {
        const color =
          player.id === this.socketClient.getId()
            ? LOCAL_PLAYER_COLOR
            : REMOTE_PLAYER_COLOR;
        const renderable = new Graphics()
          .circle(0, 0, PLAYER_RADIUS)
          .fill(color);

        this.playerRenderables.set(player.id, renderable);
        this.renderer.addToStage(renderable);
      }
    }
  }

  private renderPlayers(viewportWidth: number): void {
    const scale = this.getWorldScale(viewportWidth);

    for (const player of this.latestSnapshot.players) {
      this.renderPlayer(player, scale);
    }
  }

  private syncEnemyRenderables(): void {
    const snapshotEnemyIds = new Set(
      this.latestSnapshot.enemies.map((enemy) => enemy.id),
    );

    for (const [enemyId, renderable] of this.enemyRenderables.entries()) {
      if (!snapshotEnemyIds.has(enemyId)) {
        this.renderer.removeFromStage(renderable);
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
        this.renderer.addToStage(renderable);
      }
    }
  }

  private renderEnemies(viewportWidth: number): void {
    const scale = this.getWorldScale(viewportWidth);

    for (const enemy of this.latestSnapshot.enemies) {
      this.renderEnemy(enemy, scale);
    }
  }

  private renderPlayer(player: PlayerState, scale: number): void {
    const renderable = this.playerRenderables.get(player.id);

    if (renderable === undefined) {
      return;
    }

    renderable.position.set(
      WORLD_MARGIN + player.position.x * scale,
      WORLD_MARGIN + 64 + player.position.y * scale,
    );
    renderable.scale.set(scale);
  }

  private renderEnemy(enemy: EnemyState, scale: number): void {
    const renderable = this.enemyRenderables.get(enemy.id);

    if (renderable === undefined) {
      return;
    }

    renderable.position.set(
      WORLD_MARGIN + enemy.position.x * scale,
      WORLD_MARGIN + 64 + enemy.position.y * scale,
    );
    renderable.scale.set(scale);
  }

  private getWorldScale(viewportWidth: number): number {
    const availableWidth = Math.max(1, viewportWidth - WORLD_MARGIN * 2);

    return Math.min(1, availableWidth / WORLD_WIDTH);
  }

  private updateEliminatedOverlayFromSnapshot(): void {
    if (this.isLocalPlayerEliminated()) {
      this.showEliminatedOverlay();
    }
  }

  private isLocalPlayerEliminated(): boolean {
    const socketId = this.socketClient.getId();
    const localPlayer = this.latestSnapshot.players.find(
      (player) => player.id === socketId,
    );

    return localPlayer?.isEliminated === true;
  }

  private showEliminatedOverlay(): void {
    if (this.eliminatedText !== null) {
      this.eliminatedText.visible = true;
    }
  }

  private showMatchFinished(payload: MatchFinishedPayload): void {
    const socketId = this.socketClient.getId();
    const winnerId = payload.result.winnerId;
    const message =
      winnerId === null
        ? 'Match finished: no winner'
        : winnerId === socketId
          ? 'Match finished: you won'
          : 'Match finished';

    if (this.resultText !== null) {
      this.resultText.text = message;
      this.resultText.visible = true;
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
