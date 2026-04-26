import { Application, type Container } from 'pixi.js';

const BACKGROUND_COLOR = 0x101114;
const CANVAS_ACCESSIBILITY_LABEL = 'Pixi Arena game canvas';

interface ViewportSize {
  width: number;
  height: number;
}

export class Renderer {
  private application: Application | null = null;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized = false;

  public async initialize(container: HTMLElement): Promise<void> {
    if (this.initializationPromise !== null) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeApplication(container);
    return this.initializationPromise;
  }

  public render(): void {
    if (!this.isInitialized || this.application === null) {
      throw new Error('Renderer must be initialized before it can render.');
    }

    this.application.render();
  }

  public addToStage(renderable: Container): void {
    const application = this.getInitializedApplication();

    application.stage.addChild(renderable);
  }

  public removeFromStage(renderable: Container): void {
    const application = this.getInitializedApplication();

    application.stage.removeChild(renderable);
  }

  public getViewportSize(): ViewportSize {
    const application = this.getInitializedApplication();

    return {
      height: application.screen.height,
      width: application.screen.width,
    };
  }

  public destroy(): void {
    this.application?.destroy(true);
    this.application = null;
    this.initializationPromise = null;
    this.isInitialized = false;
  }

  private async initializeApplication(container: HTMLElement): Promise<void> {
    const application = new Application();

    await application.init({
      autoStart: false,
      background: BACKGROUND_COLOR,
      resizeTo: container,
    });

    this.application = application;
    this.isInitialized = true;
    this.mountCanvas(container, application);
  }

  private mountCanvas(container: HTMLElement, application: Application): void {
    const canvas = application.canvas;

    canvas.setAttribute('aria-label', CANVAS_ACCESSIBILITY_LABEL);
    container.appendChild(canvas);
  }

  private getInitializedApplication(): Application {
    if (!this.isInitialized || this.application === null) {
      throw new Error('Renderer must be initialized before use.');
    }

    return this.application;
  }
}
