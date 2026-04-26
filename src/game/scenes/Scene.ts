export interface Scene {
  initialize(): void;
  update(deltaSeconds: number): void;
  destroy(): void;
}
