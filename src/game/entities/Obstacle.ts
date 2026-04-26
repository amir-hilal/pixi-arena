import { Graphics } from 'pixi.js';

export interface ObstacleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ObstacleType = 'rock' | 'bush' | 'tree' | 'wall' | 'crate';

// Colors chosen to complement the dark checkerboard ground (0x131a12 / 0x172019).
const ROCK_MAIN   = 0x5c5a50;
const ROCK_LIGHT  = 0x706e62;
const ROCK_SHADOW = 0x363430;

const BUSH_DARK   = 0x243d1c;
const BUSH_MID    = 0x2e5124;
const BUSH_LIGHT  = 0x3a6630;

const TREE_TRUNK  = 0x3a2a1a;
const TREE_DARK   = 0x1a3318;
const TREE_MID    = 0x21421e;
const TREE_LIGHT  = 0x2a5226;

const WALL_STONE  = 0x4a4640;
const WALL_DARK   = 0x2e2c28;
const WALL_LIGHT  = 0x5e5a54;

const CRATE_WOOD  = 0x5c4a2a;
const CRATE_DARK  = 0x3e3018;
const CRATE_LIGHT = 0x7a6038;

export class Obstacle {
  public readonly renderable: Graphics;
  public readonly rect: ObstacleRect;

  public constructor(rect: ObstacleRect, type: ObstacleType) {
    this.rect = rect;
    this.renderable = new Graphics();
    this.renderable.position.set(rect.x, rect.y);
    buildObstacleGraphics(this.renderable, rect.width, rect.height, type);
  }
}

function buildObstacleGraphics(
  g: Graphics,
  w: number,
  h: number,
  type: ObstacleType,
): void {
  switch (type) {
    case 'rock':  buildRock(g, w, h);  break;
    case 'bush':  buildBush(g, w, h);  break;
    case 'tree':  buildTree(g, w, h);  break;
    case 'wall':  buildWall(g, w, h);  break;
    case 'crate': buildCrate(g, w, h); break;
  }
}

// ── Rock cluster ─────────────────────────────────────────────────────────────
// Overlapping boulder ellipses with a shadow base and lit highlight stones.
function buildRock(g: Graphics, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;

  // Ground shadow
  g.ellipse(cx + 3, cy + 5, w * 0.46, h * 0.3).fill(ROCK_SHADOW);
  // Back boulder (darker, behind main mass)
  g.ellipse(cx + w * 0.18, cy - h * 0.05, w * 0.3, h * 0.36).fill(ROCK_SHADOW);
  // Main boulders
  g.ellipse(cx - w * 0.14, cy + h * 0.04, w * 0.38, h * 0.42).fill(ROCK_MAIN);
  g.ellipse(cx + w * 0.18, cy - h * 0.05, w * 0.28, h * 0.34).fill(ROCK_MAIN);
  // Lit surface highlights
  g.ellipse(cx - w * 0.08, cy - h * 0.12, w * 0.22, h * 0.2).fill(ROCK_LIGHT);
  g.ellipse(cx + w * 0.26, cy + h * 0.14, w * 0.12, h * 0.16).fill(ROCK_LIGHT);
}

// ── Bush cluster ─────────────────────────────────────────────────────────────
// Overlapping circles suggesting dense foliage; three tonal layers.
function buildBush(g: Graphics, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const r  = Math.min(w, h) * 0.22;

  // Back foliage row
  g.circle(cx - w * 0.22, cy + h * 0.1,  r * 0.85).fill(BUSH_DARK);
  g.circle(cx + w * 0.22, cy + h * 0.05, r * 0.9 ).fill(BUSH_DARK);
  g.circle(cx,            cy + h * 0.12, r        ).fill(BUSH_DARK);
  // Mid foliage
  g.circle(cx - w * 0.16, cy - h * 0.04, r * 0.8 ).fill(BUSH_MID);
  g.circle(cx + w * 0.16, cy - h * 0.06, r * 0.75).fill(BUSH_MID);
  // Front highlight
  g.circle(cx,            cy - h * 0.06, r * 0.65).fill(BUSH_LIGHT);
}

// ── Tree group ───────────────────────────────────────────────────────────────
// Three tree silhouettes: trunk + layered canopy ellipses.
// Back trees drawn first so the center tree renders on top.
function buildTree(g: Graphics, w: number, h: number): void {
  const baseY = h * 0.8;

  drawSingleTree(g, w * 0.25, baseY * 0.9, w * 0.22, h * 0.62);
  drawSingleTree(g, w * 0.75, baseY * 0.9, w * 0.2,  h * 0.58);
  drawSingleTree(g, w * 0.5,  baseY,       w * 0.28, h * 0.78);
}

function drawSingleTree(
  g: Graphics,
  cx: number,
  baseY: number,
  canopyW: number,
  canopyH: number,
): void {
  const trunkW = Math.max(3, canopyW * 0.12);
  const trunkH = canopyH * 0.22;

  g.rect(cx - trunkW / 2, baseY - trunkH, trunkW, trunkH).fill(TREE_TRUNK);
  g.ellipse(cx,                  baseY - canopyH * 0.82, canopyW * 0.48, canopyH * 0.36).fill(TREE_DARK);
  g.ellipse(cx - canopyW * 0.12, baseY - canopyH * 0.6,  canopyW * 0.42, canopyH * 0.32).fill(TREE_MID);
  g.ellipse(cx + canopyW * 0.1,  baseY - canopyH * 0.62, canopyW * 0.38, canopyH * 0.3 ).fill(TREE_MID);
  g.ellipse(cx,                  baseY - canopyH * 0.48, canopyW * 0.32, canopyH * 0.24).fill(TREE_LIGHT);
}

// ── Broken wall ──────────────────────────────────────────────────────────────
// Filled stone rectangle with alternating brick-course lines.
function buildWall(g: Graphics, w: number, h: number): void {
  g.rect(0, 0, w, h).fill(WALL_STONE);

  const rows = Math.max(2, Math.round(h / 14));
  const rowH = h / rows;

  // Horizontal mortar joints
  for (let row = 1; row < rows; row++) {
    g.rect(0, Math.round(row * rowH) - 1, w, 2).fill(WALL_DARK);
  }

  // Vertical brick joints — offset every other row
  const cols = Math.max(2, Math.round(w / 22));
  const colW = w / cols;

  for (let row = 0; row < rows; row++) {
    const startX = (row % 2 === 0) ? colW * 0.5 : 0;
    const y0 = Math.round(row * rowH) + 1;
    const y1 = Math.round((row + 1) * rowH) - 1;

    for (let x = startX; x < w; x += colW) {
      g.rect(Math.round(x) - 1, y0, 2, y1 - y0).fill(WALL_DARK);
    }
  }

  // Top and left edge highlights for depth
  g.rect(0, 0, w, 2).fill(WALL_LIGHT);
  g.rect(0, 0, 2, h).fill(WALL_LIGHT);
}

// ── Crate cluster ────────────────────────────────────────────────────────────
// Two wooden crates side-by-side or stacked, with plank-line detail.
function buildCrate(g: Graphics, w: number, h: number): void {
  if (w >= h) {
    const half = Math.floor(w / 2) - 2;
    drawSingleCrate(g, 0,        0, half,          h);
    drawSingleCrate(g, half + 4, 0, w - half - 4,  h);
  } else {
    const half = Math.floor(h / 2) - 2;
    drawSingleCrate(g, 0, 0,        w, half);
    drawSingleCrate(g, 0, half + 4, w, h - half - 4);
  }
}

function drawSingleCrate(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const t = 4;

  g.rect(x, y, w, h).fill(CRATE_WOOD);
  // Corner reinforcements
  g.rect(x,         y,         w, t).fill(CRATE_LIGHT);
  g.rect(x,         y + h - t, w, t).fill(CRATE_DARK);
  g.rect(x,         y,         t, h).fill(CRATE_LIGHT);
  g.rect(x + w - t, y,         t, h).fill(CRATE_DARK);
  // Cross-plank lines
  g.rect(x + w / 2 - 1,  y + t,         2,          h - t * 2).fill(CRATE_DARK);
  g.rect(x + t,           y + h / 2 - 1, w - t * 2, 2         ).fill(CRATE_DARK);
}
