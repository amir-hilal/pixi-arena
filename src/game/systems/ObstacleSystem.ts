import { Obstacle } from '../entities/Obstacle';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/world';

// NOTE: Enemies do not avoid obstacles — they path directly toward the player
// and will pass through obstacles. Pathfinding is deferred to a future milestone.

const PLAYER_START_X = WORLD_WIDTH / 2;
const PLAYER_START_Y = WORLD_HEIGHT / 2;
// Obstacles whose center falls within this radius of the player start are skipped.
const PLAYER_SAFE_RADIUS = 380;

interface ObstacleDef {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Hand-placed layout for a 3000×3000 world.
// Each entry is in world coordinates (top-left corner).
const OBSTACLE_DEFINITIONS: ReadonlyArray<ObstacleDef> = [
  // --- Outer corners ---
  { x: 200,  y: 200,  width: 200, height: 70  },
  { x: 500,  y: 350,  width: 70,  height: 200 },
  { x: 2600, y: 200,  width: 200, height: 70  },
  { x: 2230, y: 350,  width: 70,  height: 200 },
  { x: 200,  y: 2600, width: 200, height: 70  },
  { x: 500,  y: 2200, width: 70,  height: 200 },
  { x: 2600, y: 2600, width: 200, height: 70  },
  { x: 2230, y: 2200, width: 70,  height: 200 },

  // --- Mid-zone clusters ---
  { x: 750,  y: 750,  width: 180, height: 60  },
  { x: 1000, y: 600,  width: 60,  height: 180 },
  { x: 2050, y: 750,  width: 180, height: 60  },
  { x: 1940, y: 600,  width: 60,  height: 180 },
  { x: 750,  y: 2060, width: 180, height: 60  },
  { x: 1000, y: 2160, width: 60,  height: 180 },
  { x: 2050, y: 2060, width: 180, height: 60  },
  { x: 1940, y: 2160, width: 60,  height: 180 },

  // --- Inner ring around center (all >380 units from (1500,1500)) ---
  { x: 950,  y: 1200, width: 240, height: 60  },
  { x: 1200, y: 950,  width: 60,  height: 240 },
  { x: 1760, y: 1200, width: 240, height: 60  },
  { x: 1760, y: 950,  width: 60,  height: 240 },
  { x: 950,  y: 1800, width: 240, height: 60  },
  { x: 1200, y: 1820, width: 60,  height: 240 },
  { x: 1760, y: 1800, width: 240, height: 60  },
  { x: 1760, y: 1820, width: 60,  height: 240 },
];

export class ObstacleSystem {
  private readonly obstacles: Obstacle[] = [];

  /** Creates all obstacles and returns them so the caller can add renderables to the scene. */
  public initialize(): readonly Obstacle[] {
    for (const def of OBSTACLE_DEFINITIONS) {
      if (this.isTooCloseToPlayerStart(def)) {
        continue;
      }

      this.obstacles.push(new Obstacle(def));
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
