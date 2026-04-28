import { PLAYER_SAFE_RADIUS } from './simulation';
import { WORLD_HEIGHT, WORLD_WIDTH } from './world';
import type { Rect } from '../types/index';

export type ObstacleVisualType = 'rock' | 'bush' | 'tree' | 'wall' | 'crate';

export interface WorldObstacleDefinition extends Rect {
  type: ObstacleVisualType;
}

const PLAYER_START_X = WORLD_WIDTH / 2;
const PLAYER_START_Y = WORLD_HEIGHT / 2;

const RAW_WORLD_OBSTACLE_DEFINITIONS: readonly WorldObstacleDefinition[] = [
  { type: 'bush', x: 1100, y: 1060, width: 110, height: 80 },
  { type: 'bush', x: 1820, y: 1060, width: 110, height: 80 },
  { type: 'bush', x: 1100, y: 1870, width: 110, height: 80 },
  { type: 'bush', x: 1820, y: 1870, width: 110, height: 80 },

  { type: 'rock', x: 1380, y: 720, width: 150, height: 90 },
  { type: 'rock', x: 1460, y: 2190, width: 150, height: 90 },
  { type: 'rock', x: 720, y: 1380, width: 90, height: 150 },
  { type: 'rock', x: 2190, y: 1460, width: 90, height: 150 },

  { type: 'wall', x: 900, y: 900, width: 180, height: 40 },
  { type: 'wall', x: 900, y: 940, width: 40, height: 140 },
  { type: 'wall', x: 1880, y: 900, width: 180, height: 40 },
  { type: 'wall', x: 2020, y: 940, width: 40, height: 140 },
  { type: 'wall', x: 900, y: 2060, width: 180, height: 40 },
  { type: 'wall', x: 900, y: 1920, width: 40, height: 140 },
  { type: 'wall', x: 1880, y: 2060, width: 180, height: 40 },
  { type: 'wall', x: 2020, y: 1920, width: 40, height: 140 },

  { type: 'crate', x: 600, y: 1100, width: 80, height: 80 },
  { type: 'crate', x: 2320, y: 1100, width: 80, height: 80 },
  { type: 'crate', x: 600, y: 1860, width: 80, height: 80 },
  { type: 'crate', x: 2320, y: 1860, width: 80, height: 80 },

  { type: 'rock', x: 700, y: 700, width: 130, height: 90 },
  { type: 'rock', x: 2140, y: 700, width: 130, height: 90 },
  { type: 'rock', x: 700, y: 2210, width: 130, height: 90 },
  { type: 'rock', x: 2140, y: 2210, width: 130, height: 90 },

  { type: 'tree', x: 350, y: 350, width: 130, height: 130 },
  { type: 'tree', x: 2520, y: 350, width: 130, height: 130 },
  { type: 'tree', x: 350, y: 2520, width: 130, height: 130 },
  { type: 'tree', x: 2520, y: 2520, width: 130, height: 130 },

  { type: 'bush', x: 1080, y: 400, width: 90, height: 70 },
  { type: 'bush', x: 1820, y: 400, width: 90, height: 70 },
  { type: 'bush', x: 1080, y: 2530, width: 90, height: 70 },
  { type: 'bush', x: 1820, y: 2530, width: 90, height: 70 },
  { type: 'bush', x: 400, y: 1080, width: 70, height: 90 },
  { type: 'bush', x: 400, y: 1820, width: 70, height: 90 },
  { type: 'bush', x: 2530, y: 1080, width: 70, height: 90 },
  { type: 'bush', x: 2530, y: 1820, width: 70, height: 90 },

  { type: 'rock', x: 200, y: 600, width: 80, height: 150 },
  { type: 'rock', x: 200, y: 2050, width: 80, height: 150 },
  { type: 'rock', x: 2720, y: 600, width: 80, height: 150 },
  { type: 'rock', x: 2720, y: 2050, width: 80, height: 150 },
  { type: 'rock', x: 600, y: 200, width: 150, height: 80 },
  { type: 'rock', x: 2050, y: 200, width: 150, height: 80 },
  { type: 'rock', x: 600, y: 2720, width: 150, height: 80 },
  { type: 'rock', x: 2050, y: 2720, width: 150, height: 80 },
];

function isTooCloseToPlayerStart(obstacle: Rect): boolean {
  const centerX = obstacle.x + obstacle.width / 2;
  const centerY = obstacle.y + obstacle.height / 2;
  const dx = centerX - PLAYER_START_X;
  const dy = centerY - PLAYER_START_Y;

  return Math.hypot(dx, dy) < PLAYER_SAFE_RADIUS;
}

export const WORLD_OBSTACLE_DEFINITIONS: readonly WorldObstacleDefinition[] =
  RAW_WORLD_OBSTACLE_DEFINITIONS.filter(
    (obstacle) => !isTooCloseToPlayerStart(obstacle),
  );

export const WORLD_OBSTACLE_RECTS: readonly Rect[] =
  WORLD_OBSTACLE_DEFINITIONS.map(({ type: _type, ...rect }) => rect);
