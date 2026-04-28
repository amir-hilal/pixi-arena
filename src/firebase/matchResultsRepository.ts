/**
 * Match Results Firestore repository.
 * Handles reading and writing match results.
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { getDb } from './firestore';
import { getFirebaseEnvironment } from './config';
import type { MatchResult, MatchResultPlayer } from './types';

const MATCH_RESULTS_COLLECTION = 'matchResults';

/**
 * Add a new match result.
 * Returns the document ID of the created match result.
 */
export async function addMatchResult(
  winnerDisplayName: string | null,
  players: MatchResultPlayer[],
  durationSeconds: number,
): Promise<string> {
  const db = getDb();
  const environment = getFirebaseEnvironment();

  const matchResult: Omit<MatchResult, 'id'> = {
    winnerDisplayName,
    players,
    durationSeconds,
    environment,
    finishedAt: new Date(),
  };

  const docRef = await addDoc(
    collection(db, MATCH_RESULTS_COLLECTION),
    matchResult,
  );

  return docRef.id;
}

/**
 * Get recent match results for the current environment.
 * Returns matches ordered by finish time (most recent first).
 */
export async function getRecentMatchResults(
  recentCount: number = 50,
): Promise<MatchResult[]> {
  const db = getDb();
  const environment = getFirebaseEnvironment();

  const q = query(
    collection(db, MATCH_RESULTS_COLLECTION),
    where('environment', '==', environment),
    orderBy('finishedAt', 'desc'),
    limit(recentCount),
  );

  const querySnapshot = await getDocs(q);
  const results: MatchResult[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    results.push({
      id: doc.id,
      winnerDisplayName: data.winnerDisplayName as string | null,
      players: (data.players as MatchResultPlayer[]) ?? [],
      durationSeconds: data.durationSeconds as number,
      environment: data.environment as 'local' | 'development' | 'production',
      finishedAt: data.finishedAt?.toDate?.() ?? new Date(),
    });
  });

  return results;
}

/**
 * Get all match results for a specific player in the current environment.
 * Returns matches ordered by finish time (most recent first).
 */
export async function getPlayerMatchResults(
  displayName: string,
): Promise<MatchResult[]> {
  const db = getDb();
  const environment = getFirebaseEnvironment();

  const q = query(
    collection(db, MATCH_RESULTS_COLLECTION),
    where('environment', '==', environment),
    where('players', 'array-contains', { displayName }),
  );

  const querySnapshot = await getDocs(q);
  const results: MatchResult[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    results.push({
      id: doc.id,
      winnerDisplayName: data.winnerDisplayName as string | null,
      players: (data.players as MatchResultPlayer[]) ?? [],
      durationSeconds: data.durationSeconds as number,
      environment: data.environment as 'local' | 'development' | 'production',
      finishedAt: data.finishedAt?.toDate?.() ?? new Date(),
    });
  });

  return results;
}
