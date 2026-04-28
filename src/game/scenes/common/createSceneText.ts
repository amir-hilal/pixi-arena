import { Text } from 'pixi.js';
import type { Renderer } from '../../core/Renderer';

interface SceneTextOptions {
  align?: 'left' | 'center' | 'right';
  anchor?: number | { x: number; y: number };
  fill?: number;
  fontSize: number;
  text: string;
}

const DEFAULT_TEXT_COLOR = 0xffffff;

export function createSceneText({
  align,
  anchor,
  fill = DEFAULT_TEXT_COLOR,
  fontSize,
  text,
}: SceneTextOptions): Text {
  return new Text({
    anchor,
    style: {
      align,
      fill,
      fontSize,
    },
    text,
  });
}

export function destroySceneText(renderer: Renderer, text: Text | null): void {
  if (text === null) {
    return;
  }

  renderer.removeFromStage(text);
  text.destroy();
}
