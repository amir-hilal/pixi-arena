export const WORLD_WIDTH = 3000;
export const WORLD_HEIGHT = 3000;

export interface WorldBounds {
  width: number;
  height: number;
}

export function getWorldBounds(): WorldBounds {
  return { width: WORLD_WIDTH, height: WORLD_HEIGHT };
}
