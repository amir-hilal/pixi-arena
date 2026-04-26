import type { Scene } from './Scene';

export class SceneManager {
  private activeScene: Scene | null = null;

  public setScene(scene: Scene): void {
    this.activeScene?.destroy();
    this.activeScene = scene;
    this.activeScene.initialize();
  }

  public resize(width: number, height: number): void {
    this.activeScene?.resize?.(width, height);
  }

  public update(deltaSeconds: number): void {
    this.activeScene?.update(deltaSeconds);
  }

  public destroy(): void {
    this.activeScene?.destroy();
    this.activeScene = null;
  }
}
