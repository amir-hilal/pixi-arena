import {
  Container,
  Graphics,
  Point,
  type FederatedPointerEvent,
} from 'pixi.js';
import type { InputDirection } from '../core/InputManager';

interface ViewportSize {
  width: number;
  height: number;
}

const COARSE_POINTER_QUERY = '(pointer: coarse)';
const JOYSTICK_RADIUS = 56;
const KNOB_RADIUS = 22;
const JOYSTICK_MARGIN = 32;
const BASE_COLOR = 0xffffff;
const KNOB_COLOR = 0x4fd1c5;
const BASE_ALPHA = 0.18;
const KNOB_ALPHA = 0.72;
const INACTIVE_ALPHA = 0.72;
const ACTIVE_ALPHA = 1;
const NEUTRAL_DIRECTION = 0;
const PRIMARY_POINTER_BUTTON = 0;

export class VirtualJoystick {
  public readonly renderable = new Container();

  private readonly base = new Graphics();
  private readonly knob = new Graphics();
  private activePointerId: number | null = null;
  private direction: InputDirection = {
    x: NEUTRAL_DIRECTION,
    y: NEUTRAL_DIRECTION,
  };

  public static isSupported(): boolean {
    return (
      navigator.maxTouchPoints > 0 ||
      window.matchMedia(COARSE_POINTER_QUERY).matches
    );
  }

  public constructor(viewportSize: ViewportSize) {
    this.draw();
    this.position(viewportSize);
    this.bindEvents();
  }

  public getDirection(): InputDirection {
    return this.direction;
  }

  public resize(viewportSize: ViewportSize): void {
    this.position(viewportSize);
  }

  public destroy(): void {
    this.unbindEvents();
    this.reset();
    this.renderable.destroy({ children: true });
  }

  private draw(): void {
    this.base.circle(0, 0, JOYSTICK_RADIUS).fill(BASE_COLOR);
    this.base.alpha = BASE_ALPHA;

    this.knob.circle(0, 0, KNOB_RADIUS).fill(KNOB_COLOR);
    this.knob.alpha = KNOB_ALPHA;

    this.renderable.addChild(this.base, this.knob);
    this.renderable.alpha = INACTIVE_ALPHA;
  }

  private position(viewportSize: ViewportSize): void {
    this.renderable.position.set(
      JOYSTICK_MARGIN + JOYSTICK_RADIUS,
      viewportSize.height - JOYSTICK_MARGIN - JOYSTICK_RADIUS,
    );
  }

  private bindEvents(): void {
    this.renderable.eventMode = 'static';
    this.renderable.on('pointerdown', this.handlePointerDown);
  }

  private unbindEvents(): void {
    this.renderable.off('pointerdown', this.handlePointerDown);
    this.unbindGlobalPointerEvents();
  }

  private readonly handlePointerDown = (
    event: FederatedPointerEvent,
  ): void => {
    if (
      this.activePointerId !== null ||
      event.button !== PRIMARY_POINTER_BUTTON
    ) {
      return;
    }

    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.renderable.alpha = ACTIVE_ALPHA;
    this.bindGlobalPointerEvents();
    this.updateDirection(event.global.x, event.global.y);
  };

  private readonly handleGlobalPointerMove = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.updateDirection(event.clientX, event.clientY);
  };

  private readonly handleGlobalPointerEnd = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.reset();
  };

  private bindGlobalPointerEvents(): void {
    window.addEventListener('pointermove', this.handleGlobalPointerMove);
    window.addEventListener('pointerup', this.handleGlobalPointerEnd);
    window.addEventListener('pointercancel', this.handleGlobalPointerEnd);
  }

  private unbindGlobalPointerEvents(): void {
    window.removeEventListener('pointermove', this.handleGlobalPointerMove);
    window.removeEventListener('pointerup', this.handleGlobalPointerEnd);
    window.removeEventListener('pointercancel', this.handleGlobalPointerEnd);
  }

  private updateDirection(globalX: number, globalY: number): void {
    const localPosition = this.renderable.toLocal(new Point(globalX, globalY));
    const distance = Math.hypot(localPosition.x, localPosition.y);
    const clampedDistance = Math.min(distance, JOYSTICK_RADIUS);
    const strength = clampedDistance / JOYSTICK_RADIUS;
    const normalizedX =
      distance === NEUTRAL_DIRECTION
        ? NEUTRAL_DIRECTION
        : localPosition.x / distance;
    const normalizedY =
      distance === NEUTRAL_DIRECTION
        ? NEUTRAL_DIRECTION
        : localPosition.y / distance;

    this.direction = {
      x: normalizedX * strength,
      y: normalizedY * strength,
    };
    this.knob.position.set(
      normalizedX * clampedDistance,
      normalizedY * clampedDistance,
    );
  }

  private reset(): void {
    this.unbindGlobalPointerEvents();
    this.activePointerId = null;
    this.direction = {
      x: NEUTRAL_DIRECTION,
      y: NEUTRAL_DIRECTION,
    };
    this.knob.position.set(0, 0);
    this.renderable.alpha = INACTIVE_ALPHA;
  }
}
