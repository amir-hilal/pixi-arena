import type { EnemyState, PlayerState } from '../types/index';
import { circlesOverlap } from './collision';

export interface PlayerDamageState extends Pick<PlayerState, 'position'> {
  radius: number;
}

export interface EnemyDamageState extends Pick<EnemyState, 'position'> {
  radius: number;
}

export function collectEnemyCollisions<TEnemy extends EnemyDamageState>(
  player: PlayerDamageState,
  enemies: readonly TEnemy[],
): TEnemy[] {
  return enemies.filter((enemy) => circlesOverlap(player, enemy));
}

export function applyDamage(player: PlayerState, damage: number): void {
  player.lives = Math.max(0, player.lives - damage);
  player.isEliminated = player.lives === 0;
}

export function computeWinner(
  players: readonly PlayerState[],
): PlayerState | null {
  const survivors = players.filter((player) => !player.isEliminated);

  if (survivors.length !== 1) {
    return null;
  }

  return survivors[0];
}
