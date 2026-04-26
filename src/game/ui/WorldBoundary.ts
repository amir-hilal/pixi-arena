import { Graphics } from 'pixi.js';
import { WORLD_WIDTH, WORLD_HEIGHT, BOUNDARY_WALL_THICKNESS } from '../utils/world';

// Half-width of the gate opening on each side (full opening = 120 units).
const GATE_HALF = 60;
// Gate post dimensions.
const POST_W = 26;
const POST_OVERHANG = 12;   // how far the post protrudes beyond the wall face

// Colors — muted stone/wood palette that matches the ground.
const WALL_COLOR    = 0x3a3530;  // dark stone
const WALL_EDGE     = 0x52504a;  // lighter highlight on outer edge
const MORTAR_COLOR  = 0x26221e;  // mortar joint lines
const POST_COLOR    = 0x28201a;  // very dark gate posts
const TRIM_COLOR    = 0x9c7c36;  // warm brass/metal trim rings
const HEADER_COLOR  = 0x4a3c28;  // arching header bar

/**
 * Draws the boundary fence and four cardinal gates around the 3000×3000 world.
 * Add `renderable` to worldContainer so it scrolls with the camera.
 *
 * Collision: the player is clamped to world bounds by MovementSystem (accounting
 * for BOUNDARY_WALL_THICKNESS). Enemies enter through gate spawn points and do
 * not collide with boundary walls — they only collide with obstacles.
 */
export class WorldBoundary {
  public readonly renderable: Graphics;

  public constructor() {
    this.renderable = new Graphics();
    this.build(this.renderable);
  }

  private build(g: Graphics): void {
    const W  = WORLD_WIDTH;
    const H  = WORLD_HEIGHT;
    const T  = BOUNDARY_WALL_THICKNESS;
    const cx = W / 2;
    const cy = H / 2;

    // ── North wall ──────────────────────────────────────────────────────────
    this.wallH(g, 0,       0,     cx - GATE_HALF,      T);
    this.wallH(g, cx + GATE_HALF, 0, W - cx - GATE_HALF, T);
    this.gateH(g, cx, 0, T);

    // ── South wall ──────────────────────────────────────────────────────────
    this.wallH(g, 0,              H - T, cx - GATE_HALF,      T, true);
    this.wallH(g, cx + GATE_HALF, H - T, W - cx - GATE_HALF, T, true);
    this.gateH(g, cx, H - T, T);

    // ── West wall (between the N and S corner blocks, gate gap at cy) ───────
    this.wallV(g, 0, T,       T, cy - GATE_HALF - T);
    this.wallV(g, 0, cy + GATE_HALF, T, H - T - cy - GATE_HALF);
    this.gateV(g, cy, 0, T);

    // ── East wall ────────────────────────────────────────────────────────────
    this.wallV(g, W - T, T,             T, cy - GATE_HALF - T, true);
    this.wallV(g, W - T, cy + GATE_HALF, T, H - T - cy - GATE_HALF, true);
    this.gateV(g, cy, W - T, T);
  }

  // ── Horizontal wall segment ───────────────────────────────────────────────

  private wallH(g: Graphics, x: number, y: number, w: number, h: number, flip = false): void {
    if (w <= 0 || h <= 0) {
      return;
    }

    g.rect(x, y, w, h).fill(WALL_COLOR);
    // Outer-edge highlight: top edge for North wall (flip=false), bottom edge for South wall (flip=true).
    const hy = flip ? y + h - 3 : y;
    g.rect(x, hy, w, 3).fill(WALL_EDGE);
    // Vertical mortar joints — anchored to the non-highlighted face so the 3px
    // highlight strip is never overdrawn.
    const step = 44;
    const mortarY = flip ? y : y + 3;

    for (let jx = x + step; jx < x + w; jx += step) {
      g.rect(Math.round(jx), mortarY, 2, h - 3).fill(MORTAR_COLOR);
    }
  }

  // ── Vertical wall segment ─────────────────────────────────────────────────

  private wallV(g: Graphics, x: number, y: number, w: number, h: number, flip = false): void {
    if (w <= 0 || h <= 0) {
      return;
    }

    g.rect(x, y, w, h).fill(WALL_COLOR);
    // Outer-edge highlight: left edge for West wall (flip=false), right edge for East wall (flip=true).
    const hx = flip ? x + w - 3 : x;
    g.rect(hx, y, 3, h).fill(WALL_EDGE);
    // Horizontal mortar joints
    const step = 44;

    for (let jy = y + step; jy < y + h; jy += step) {
      g.rect(x + 3, Math.round(jy), w - 3, 2).fill(MORTAR_COLOR);
    }
  }

  // ── Horizontal gate (N / S walls) ─────────────────────────────────────────

  private gateH(g: Graphics, cx: number, wallY: number, wallT: number): void {
    const pw  = POST_W;
    const ph  = wallT + POST_OVERHANG * 2;
    const py  = wallY - POST_OVERHANG;
    const lx  = cx - GATE_HALF - pw / 2;
    const rx  = cx + GATE_HALF - pw / 2;

    // Left and right posts
    g.rect(lx, py, pw, ph).fill(POST_COLOR);
    g.rect(rx, py, pw, ph).fill(POST_COLOR);

    // Brass trim rings on each post
    g.rect(lx + 3, py + 5,      pw - 6, 4).fill(TRIM_COLOR);
    g.rect(lx + 3, py + ph - 9, pw - 6, 4).fill(TRIM_COLOR);
    g.rect(rx + 3, py + 5,      pw - 6, 4).fill(TRIM_COLOR);
    g.rect(rx + 3, py + ph - 9, pw - 6, 4).fill(TRIM_COLOR);

    // Header bar spanning from left post to right post outer face
    g.rect(lx, py, GATE_HALF * 2 + pw, 7).fill(HEADER_COLOR);
  }

  // ── Vertical gate (W / E walls) ───────────────────────────────────────────

  private gateV(g: Graphics, cy: number, wallX: number, wallT: number): void {
    const pw  = wallT + POST_OVERHANG * 2;
    const ph  = POST_W;
    const px  = wallX - POST_OVERHANG;
    const ty  = cy - GATE_HALF - ph / 2;
    const by_ = cy + GATE_HALF - ph / 2;

    // Top and bottom posts
    g.rect(px, ty,  pw, ph).fill(POST_COLOR);
    g.rect(px, by_, pw, ph).fill(POST_COLOR);

    // Brass trim rings
    g.rect(px + 5,      ty  + 3, 4, ph - 6).fill(TRIM_COLOR);
    g.rect(px + pw - 9, ty  + 3, 4, ph - 6).fill(TRIM_COLOR);
    g.rect(px + 5,      by_ + 3, 4, ph - 6).fill(TRIM_COLOR);
    g.rect(px + pw - 9, by_ + 3, 4, ph - 6).fill(TRIM_COLOR);

    // Side bar spanning from top post to bottom post outer face
    g.rect(px, ty, 7, GATE_HALF * 2 + ph).fill(HEADER_COLOR);
  }
}
