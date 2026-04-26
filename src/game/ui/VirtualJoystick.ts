import { Container, Graphics, Point } from 'pixi.js';
import type { InputDirection } from '../core/InputManager';

const COARSE_POINTER_QUERY = '(pointer: coarse)';
const JOYSTICK_RADIUS = 56;
const KNOB_RADIUS = 22;
const BASE_COLOR = 0xffffff;
const KNOB_COLOR = 0x4fd1c5;
const BASE_ALPHA = 0.18;
const KNOB_ALPHA = 0.72;
const INACTIVE_ALPHA = 0;
const ACTIVE_START_ALPHA = 1;
const ACTIVE_DRAG_ALPHA = 0.64;
const NEUTRAL_DIRECTION = 0;
const PRIMARY_POINTER_BUTTON = 0;
const TOUCH_POINTER_TYPE = 'touch';
const POINTER_EVENT_OPTIONS: AddEventListenerOptions = {
  passive: false,
};

export class VirtualJoystick {
  public readonly renderable = new Container();

  private readonly base = new Graphics();
  private readonly knob = new Graphics();
  private readonly globalPointerPosition = new Point();
  private activePointerId: number | null = null;
  private captureTarget: Element | null = null;
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

  public constructor() {
    this.draw();
    this.bindEvents();
  }

  public getDirection(): InputDirection {
    return this.direction;
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
    this.renderable.visible = false;
  }

  private bindEvents(): void {
    window.addEventListener(
      'pointerdown',
      this.handleGlobalPointerDown,
      POINTER_EVENT_OPTIONS,
    );
  }

  private unbindEvents(): void {
    window.removeEventListener('pointerdown', this.handleGlobalPointerDown);
    this.unbindGlobalPointerEvents();
  }

  private readonly handleGlobalPointerDown = (event: PointerEvent): void => {
    if (
      this.activePointerId !== null ||
      event.button !== PRIMARY_POINTER_BUTTON ||
      event.pointerType !== TOUCH_POINTER_TYPE
    ) {
      return;
    }

    event.preventDefault();
    if (!this.capturePointer(event)) {
      this.activePointerId = null;
      return;
    }

    this.activePointerId = event.pointerId;
    this.renderable.position.set(event.clientX, event.clientY);
    this.renderable.visible = true;
    this.renderable.alpha = ACTIVE_START_ALPHA;
    this.bindGlobalPointerEvents();
    this.updateDirection(event.clientX, event.clientY);
  };

  private readonly handleGlobalPointerMove = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.renderable.alpha = ACTIVE_DRAG_ALPHA;
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
    window.addEventListener(
      'pointermove',
      this.handleGlobalPointerMove,
      POINTER_EVENT_OPTIONS,
    );
    window.addEventListener(
      'pointerup',
      this.handleGlobalPointerEnd,
      POINTER_EVENT_OPTIONS,
    );
    window.addEventListener(
      'pointercancel',
      this.handleGlobalPointerEnd,
      POINTER_EVENT_OPTIONS,
    );
  }

  private unbindGlobalPointerEvents(): void {
    window.removeEventListener('pointermove', this.handleGlobalPointerMove);
    window.removeEventListener('pointerup', this.handleGlobalPointerEnd);
    window.removeEventListener('pointercancel', this.handleGlobalPointerEnd);
  }

  private updateDirection(globalX: number, globalY: number): void {
    this.globalPointerPosition.set(globalX, globalY);
    const localPosition = this.renderable.toLocal(this.globalPointerPosition);
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

  private capturePointer(event: PointerEvent): boolean {
    if (!(event.target instanceof Element)) {
      return false;
    }

    this.captureTarget = event.target;

    try {
      this.captureTarget.setPointerCapture(event.pointerId);
    } catch {
      this.captureTarget = null;
      return false;
    }

    return true;
  }

  private releasePointerCapture(): void {
    if (this.activePointerId === null || this.captureTarget === null) {
      return;
    }

    try {
      if (this.captureTarget.hasPointerCapture(this.activePointerId)) {
        this.captureTarget.releasePointerCapture(this.activePointerId);
      }
    } catch {
      // Capture may already be gone after browser cancellation or target removal.
    }

    this.captureTarget = null;
  }

  private reset(): void {
    this.releasePointerCapture();
    this.unbindGlobalPointerEvents();
    this.activePointerId = null;
    this.direction = {
      x: NEUTRAL_DIRECTION,
      y: NEUTRAL_DIRECTION,
    };
    this.knob.position.set(0, 0);
    this.renderable.alpha = INACTIVE_ALPHA;
    this.renderable.visible = false;
  }
}
