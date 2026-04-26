import { WORLD_WIDTH, WORLD_HEIGHT } from '../../shared/constants/world';

export {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  BOUNDARY_WALL_THICKNESS,
  GATE_SPAWN_INSET,
  WORLD_GATES,
} from '../../shared/constants/world';

// GateState re-exported as Gate for backward compatibility with existing imports.
export type { GateState as Gate } from '../../shared/types/index';

export interface WorldBounds {
  width: number;
  height: number;
}

export function getWorldBounds(): WorldBounds {
  return { width: WORLD_WIDTH, height: WORLD_HEIGHT };
}
