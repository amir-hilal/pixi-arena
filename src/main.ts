import './styles.css';
import { Game } from './game/core/Game';

const APP_CONTAINER_ID = 'app';

async function bootstrap(): Promise<void> {
  const appContainer = document.getElementById(APP_CONTAINER_ID);

  if (appContainer === null) {
    throw new Error(`Missing #${APP_CONTAINER_ID} container.`);
  }

  const game = new Game();

  await game.initialize(appContainer);
  game.start();
}

void bootstrap();
