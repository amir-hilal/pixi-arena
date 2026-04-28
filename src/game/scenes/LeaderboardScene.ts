import { Text } from 'pixi.js';
import { getTopLeaderboardScores } from '../../firebase/leaderboardRepository';
import type { LeaderboardScore } from '../../firebase/types';
import type { Renderer } from '../core/Renderer';
import type { Scene } from './common/Scene';

const TITLE_TEXT = 'Leaderboard';
const BACK_TEXT = 'Back';
const LOADING_TEXT = 'Loading...';
const EMPTY_TEXT = 'No scores yet.';
const ERROR_TEXT = 'Failed to load scores.';
const TITLE_TEXT_SIZE = 36;
const HEADER_TEXT_SIZE = 15;
const ROW_TEXT_SIZE = 15;
const BACK_TEXT_SIZE = 20;
const TEXT_COLOR = 0xffffff;
const HEADER_COLOR = 0xcbd5e1;
const TITLE_Y_RATIO = 0.08;
const HEADER_Y_RATIO = 0.2;
const ROWS_Y_RATIO = 0.26;
const BACK_Y_RATIO = 0.88;
const TOP_COUNT = 10;

export class LeaderboardScene implements Scene {
  private titleText: Text | null = null;
  private headerText: Text | null = null;
  private rowsText: Text | null = null;
  private backText: Text | null = null;
  private isDestroyed = false;

  public constructor(
    private readonly renderer: Renderer,
    private readonly onBack: () => void,
  ) {}

  public initialize(): void {
    const viewport = this.renderer.getViewportSize();
    const cx = viewport.width / 2;
    const h = viewport.height;

    this.titleText = this.makeText(TITLE_TEXT, TITLE_TEXT_SIZE, TEXT_COLOR);
    this.titleText.position.set(cx, h * TITLE_Y_RATIO);

    this.headerText = this.makeText(
      this.buildHeaderLine(),
      HEADER_TEXT_SIZE,
      HEADER_COLOR,
    );
    this.headerText.position.set(cx, h * HEADER_Y_RATIO);

    this.rowsText = this.makeText(LOADING_TEXT, ROW_TEXT_SIZE, TEXT_COLOR);
    this.rowsText.position.set(cx, h * ROWS_Y_RATIO);

    this.backText = this.makeText(BACK_TEXT, BACK_TEXT_SIZE, TEXT_COLOR);
    this.backText.eventMode = 'static';
    this.backText.cursor = 'pointer';
    this.backText.on('pointertap', this.handleBack);
    this.backText.position.set(cx, h * BACK_Y_RATIO);

    this.renderer.addToStage(this.titleText);
    this.renderer.addToStage(this.headerText);
    this.renderer.addToStage(this.rowsText);
    this.renderer.addToStage(this.backText);

    void this.loadScores();
  }

  public update(_deltaSeconds: number): void {}

  public resize(width: number, height: number): void {
    const cx = width / 2;

    this.titleText?.position.set(cx, height * TITLE_Y_RATIO);
    this.headerText?.position.set(cx, height * HEADER_Y_RATIO);
    this.rowsText?.position.set(cx, height * ROWS_Y_RATIO);
    this.backText?.position.set(cx, height * BACK_Y_RATIO);
  }

  public destroy(): void {
    this.isDestroyed = true;

    if (this.backText !== null) {
      this.backText.off('pointertap', this.handleBack);
    }

    this.removeText(this.backText);
    this.removeText(this.rowsText);
    this.removeText(this.headerText);
    this.removeText(this.titleText);

    this.backText = null;
    this.rowsText = null;
    this.headerText = null;
    this.titleText = null;
  }

  private makeText(text: string, fontSize: number, fill: number): Text {
    return new Text({
      anchor: { x: 0.5, y: 0 },
      style: {
        align: 'center',
        fill,
        fontSize,
      },
      text,
    });
  }

  private removeText(text: Text | null): void {
    if (text === null) {
      return;
    }

    this.renderer.removeFromStage(text);
    text.destroy();
  }

  private buildHeaderLine(): string {
    return '#    Name                   Time      Score';
  }

  private buildRows(scores: LeaderboardScore[]): string {
    return scores
      .map((s, i) => this.buildRow(i + 1, s))
      .join('\n');
  }

  private buildRow(rank: number, score: LeaderboardScore): string {
    const rankPart = String(rank).padEnd(5);
    const namePart = score.displayName.slice(0, 20).padEnd(22);
    const timePart = this.formatTime(score.survivalTimeSeconds).padEnd(10);
    const scorePart = String(Math.floor(score.score));

    return `${rankPart}${namePart}${timePart}${scorePart}`;
  }

  private formatTime(totalSeconds: number): string {
    const whole = Math.floor(totalSeconds);
    const m = Math.floor(whole / 60);
    const s = whole % 60;

    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private async loadScores(): Promise<void> {
    let scores: LeaderboardScore[];

    try {
      scores = await getTopLeaderboardScores(TOP_COUNT);
    } catch (err) {
      console.error('[Leaderboard] Failed to load scores:', err);

      if (!this.isDestroyed && this.rowsText !== null) {
        this.rowsText.text = ERROR_TEXT;
      }

      return;
    }

    if (this.isDestroyed || this.rowsText === null) {
      return;
    }

    this.rowsText.text = scores.length === 0
      ? EMPTY_TEXT
      : this.buildRows(scores);

    // Reposition rows text as content height may differ from the loading placeholder
    const viewport = this.renderer.getViewportSize();
    this.rowsText.position.set(viewport.width / 2, viewport.height * ROWS_Y_RATIO);
  }

  private readonly handleBack = (): void => {
    this.onBack();
  };
}
