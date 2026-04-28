/**
 * Best-effort persistence of match results and leaderboard scores.
 * Called once when MatchResultsScene is shown.
 * Errors are caught and logged; navigation is never blocked.
 */

import type { MatchResult } from '../shared/types/index';
import type { MatchResultPlayer } from './types';
import { addMatchResult } from './matchResultsRepository';
import { addLeaderboardScore } from './leaderboardRepository';

/**
 * Persist a completed match result and leaderboard score entries.
 * Best-effort: catches all errors, never throws.
 *
 * @param result - Authoritative match result from the server.
 * @returns A promise that resolves when all writes have been attempted.
 */
export async function persistMatchResult(result: MatchResult): Promise<void> {
  const players: MatchResultPlayer[] = result.players.map((p) => ({
    displayName: p.name,
    rank: p.rank,
    survivalTimeSeconds: p.survivalTimeSeconds,
    score: p.score,
    isEliminated: p.id !== result.winnerId,
  }));

  const winnerName =
    result.winnerId === null
      ? null
      : (result.players.find((p) => p.id === result.winnerId)?.name ?? null);

  const saves: Promise<unknown>[] = [
    addMatchResult(result.matchId, winnerName, players, result.durationSeconds).catch((err) => {
      console.error('[Firebase] Failed to save match result:', err);
    }),
    ...result.players.map((p) =>
      addLeaderboardScore(p.name, p.survivalTimeSeconds, p.score).catch((err) => {
        console.error(`[Firebase] Failed to save leaderboard score for ${p.name}:`, err);
      }),
    ),
  ];

  await Promise.allSettled(saves);
}
