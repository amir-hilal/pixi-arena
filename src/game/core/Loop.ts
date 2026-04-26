type FrameCallback = (deltaSeconds: number) => void;

const MILLISECONDS_PER_SECOND = 1000;
const INITIAL_FRAME_TIME = 0;
const MAX_DELTA_SECONDS = 0.1;

export class Loop {
  private animationFrameId: number | null = null;
  private previousFrameTime = INITIAL_FRAME_TIME;

  public constructor(private readonly onFrame: FrameCallback) {}

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.previousFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    if (this.animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.previousFrameTime = INITIAL_FRAME_TIME;
  }

  private readonly tick = (currentFrameTime: number): void => {
    const elapsedMilliseconds = currentFrameTime - this.previousFrameTime;
    const deltaSeconds = Math.min(
      elapsedMilliseconds / MILLISECONDS_PER_SECOND,
      MAX_DELTA_SECONDS,
    );

    this.previousFrameTime = currentFrameTime;
    this.onFrame(deltaSeconds);
    this.animationFrameId = requestAnimationFrame(this.tick);
  };
}
