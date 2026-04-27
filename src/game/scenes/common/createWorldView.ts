import { Container } from 'pixi.js';
import type { Renderer } from '../../core/Renderer';
import { ObstacleSystem } from '../../systems/ObstacleSystem';
import { GroundBackground } from '../../ui/GroundBackground';
import { WorldBoundary } from '../../ui/WorldBoundary';

export interface WorldView {
  boundary: WorldBoundary;
  container: Container;
  ground: GroundBackground;
  obstacleSystem: ObstacleSystem;
}

export function createWorldView(renderer: Renderer): WorldView {
  const container = new Container();
  const ground = new GroundBackground();
  const boundary = new WorldBoundary();
  const obstacleSystem = new ObstacleSystem();

  renderer.addToStage(container);
  container.addChild(ground.renderable);
  container.addChild(boundary.renderable);

  for (const obstacle of obstacleSystem.initialize()) {
    container.addChild(obstacle.renderable);
  }

  return {
    boundary,
    container,
    ground,
    obstacleSystem,
  };
}

export function destroyWorldView(
  renderer: Renderer,
  worldView: WorldView | null,
): void {
  if (worldView === null) {
    return;
  }

  worldView.obstacleSystem.destroy();
  renderer.removeFromStage(worldView.container);
  worldView.container.destroy({ children: true });
}
