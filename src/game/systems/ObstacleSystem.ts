import { Obstacle, type ObstacleType } from '../entities/Obstacle';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/world';

// NOTE: Enemies resolve obstacle collisions by pushback and do not path-find
// around obstacles. They may temporarily press against an obstacle edge while
// pursuing the player but will not pass through it.

const PLAYER_START_X = WORLD_WIDTH / 2;
const PLAYER_START_Y = WORLD_HEIGHT / 2;
// Obstacles whose center falls within this radius of the player start are skipped.
const PLAYER_SAFE_RADIUS = 380;

interface ObstacleDef {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
}

// Hand-crafted layout for a 3000×3000 world. Obstacles are grouped by distance
// from player spawn (1500, 1500) and arranged to create cover, corridors, and
// escape routes rather than random clutter.
const OBSTACLE_DEFINITIONS: ReadonlyArray<ObstacleDef> = [
  // ── Inner cover ring (r ≈ 520–560) ───────────────────────────────────────────
  // Bush clusters in diagonal directions — close enough for quick cover.
  { type: 'bush', x: 1100, y: 1060, width: 110, height: 80 },
  { type: 'bush', x: 1820, y: 1060, width: 110, height: 80 },
  { type: 'bush', x: 1100, y: 1870, width: 110, height: 80 },
  { type: 'bush', x: 1820, y: 1870, width: 110, height: 80 },

  // ── Cardinal rock formations (r ≈ 730) ─────────────────────────────────────────
  // Blocking the direct N/S/W/E routes; forces diagonal movement.
  { type: 'rock', x: 1380, y: 720,  width: 150, height: 90  },
  { type: 'rock', x: 1460, y: 2190, width: 150, height: 90  },
  { type: 'rock', x: 720,  y: 1380, width: 90,  height: 150 },
  { type: 'rock', x: 2190, y: 1460, width: 90,  height: 150 },

  // ── L-shaped broken wall covers (r ≈ 730–760) ──────────────────────────────
  // Two-piece corners in each quadrant; player can hide in the inside corner.
  // NW
  { type: 'wall', x: 900,  y: 900,  width: 180, height: 40  },
  { type: 'wall', x: 900,  y: 940,  width: 40,  height: 140 },
  // NE
  { type: 'wall', x: 1880, y: 900,  width: 180, height: 40  },
  { type: 'wall', x: 2020, y: 940,  width: 40,  height: 140 },
  // SW
  { type: 'wall', x: 900,  y: 2060, width: 180, height: 40  },
  { type: 'wall', x: 900,  y: 1920, width: 40,  height: 140 },
  // SE
  { type: 'wall', x: 1880, y: 2060, width: 180, height: 40  },
  { type: 'wall', x: 2020, y: 1920, width: 40,  height: 140 },

  // ── Crate clusters (r ≈ 920) ───────────────────────────────────────────────────────
  // Small dense cover on W and E flanks.
  { type: 'crate', x: 600,  y: 1100, width: 80, height: 80 },
  { type: 'crate', x: 2320, y: 1100, width: 80, height: 80 },
  { type: 'crate', x: 600,  y: 1860, width: 80, height: 80 },
  { type: 'crate', x: 2320, y: 1860, width: 80, height: 80 },

  // ── Mid-outer rock formations (r ≈ 1100–1300) ────────────────────────────────
  { type: 'rock', x: 700,  y: 700,  width: 130, height: 90 },
  { type: 'rock', x: 2140, y: 700,  width: 130, height: 90 },
  { type: 'rock', x: 700,  y: 2210, width: 130, height: 90 },
  { type: 'rock', x: 2140, y: 2210, width: 130, height: 90 },

  // ── Tree groups at outer corners (r ≈ 1540) ──────────────────────────────────
  { type: 'tree', x: 350,  y: 350,  width: 130, height: 130 },
  { type: 'tree', x: 2520, y: 350,  width: 130, height: 130 },
  { type: 'tree', x: 350,  y: 2520, width: 130, height: 130 },
  { type: 'tree', x: 2520, y: 2520, width: 130, height: 130 },

  // ── Edge bushes (r ≈ 1090–1120, world texture) ────────────────────────────────
  { type: 'bush', x: 1080, y: 400,  width: 90, height: 70 },
  { type: 'bush', x: 1820, y: 400,  width: 90, height: 70 },
  { type: 'bush', x: 1080, y: 2530, width: 90, height: 70 },
  { type: 'bush', x: 1820, y: 2530, width: 90, height: 70 },
  { type: 'bush', x: 400,  y: 1080, width: 70, height: 90 },
  { type: 'bush', x: 400,  y: 1820, width: 70, height: 90 },
  { type: 'bush', x: 2530, y: 1080, width: 70, height: 90 },
  { type: 'bush', x: 2530, y: 1820, width: 70, height: 90 },

  // ── Border rocks (world-edge framing) ───────────────────────────────────────────
  { type: 'rock', x: 200,  y: 600,  width: 80,  height: 150 },
  { type: 'rock', x: 200,  y: 2050, width: 80,  height: 150 },
  { type: 'rock', x: 2720, y: 600,  width: 80,  height: 150 },
  { type: 'rock', x: 2720, y: 2050, width: 80,  height: 150 },
  { type: 'rock', x: 600,  y: 200,  width: 150, height: 80  },
  { type: 'rock', x: 2050, y: 200,  width: 150, height: 80  },
  { type: 'rock', x: 600,  y: 2720, width: 150, height: 80  },
  { type: 'rock', x: 2050, y: 2720, width: 150, height: 80  },
];

export class ObstacleSystem {
  private readonly obstacles: Obstacle[] = [];

  /** Creates all obstacles and returns them so the caller can add renderables to the scene. */
  public initialize(): readonly Obstacle[] {
    for (const def of OBSTACLE_DEFINITIONS) {
      if (this.isTooCloseToPlayerStart(def)) {
        continue;
      }

      this.obstacles.push(
        new Obstacle(
          { x: def.x, y: def.y, width: def.width, height: def.height },
          def.type,
        ),
      );
    }

    return this.obstacles;
  }

  public getObstacles(): readonly Obstacle[] {
    return this.obstacles;
  }

  /**
   * Clears all obstacles and returns them so the caller can remove and
   * destroy their renderables before the scene tears down.
   */
  public destroy(): Obstacle[] {
    const obstacles = [...this.obstacles];
    this.obstacles.length = 0;

    return obstacles;
  }

  private isTooCloseToPlayerStart(def: ObstacleDef): boolean {
    const centerX = def.x + def.width / 2;
    const centerY = def.y + def.height / 2;
    const dx = centerX - PLAYER_START_X;
    const dy = centerY - PLAYER_START_Y;

    return Math.hypot(dx, dy) < PLAYER_SAFE_RADIUS;
  }
}
