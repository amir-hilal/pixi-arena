export interface Scene {
  initialize(): void;
  update(deltaSeconds: number): void;
  destroy(): void;
  resize?(width: number, height: number): void;
}
