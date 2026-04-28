/**
 * Leaderboard Firestore repository.
 * Handles reading and writing leaderboard scores.
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from './firestore';
import { getFirebaseEnvironment } from './config';
import type { LeaderboardScore } from './types';

const LEADERBOARD_COLLECTION = 'leaderboard';

/**
 * Add a new leaderboard score.
 * Returns the document ID of the created score.
 */
export async function addLeaderboardScore(
  displayName: string,
  survivalTimeSeconds: number,
  score: number,
): Promise<string> {
  const db = getDb();
  const environment = getFirebaseEnvironment();

  const scoreRecord: Omit<LeaderboardScore, 'id'> = {
    displayName,
    survivalTimeSeconds,
    score,
    environment,
    recordedAt: serverTimestamp() as unknown as Date,
  };

  const docRef = await addDoc(
    collection(db, LEADERBOARD_COLLECTION),
    scoreRecord,
  );

  return docRef.id;
}

/**
 * Get top leaderboard scores for the current environment.
 * Returns the top N scores ordered by survival time (descending), then score (descending).
 */
export async function getTopLeaderboardScores(
  topCount: number = 100,
): Promise<LeaderboardScore[]> {
  const db = getDb();
  const environment = getFirebaseEnvironment();

  const q = query(
    collection(db, LEADERBOARD_COLLECTION),
    where('environment', '==', environment),
    orderBy('survivalTimeSeconds', 'desc'),
    orderBy('score', 'desc'),
    limit(topCount),
  );

  const querySnapshot = await getDocs(q);
  const scores: LeaderboardScore[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    scores.push({
      id: doc.id,
      displayName: data.displayName as string,
      survivalTimeSeconds: data.survivalTimeSeconds as number,
      score: data.score as number,
      environment: data.environment as 'local' | 'development' | 'production',
      recordedAt: data.recordedAt?.toDate?.() ?? new Date(),
    });
  });

  return scores;
}

/**
 * Get all scores for a specific player in the current environment.
 * Returns scores ordered by survival time (descending).
 */
export async function getPlayerLeaderboardScores(
  displayName: string,
): Promise<LeaderboardScore[]> {
  const db = getDb();
  const environment = getFirebaseEnvironment();

  const q = query(
    collection(db, LEADERBOARD_COLLECTION),
    where('environment', '==', environment),
    where('displayName', '==', displayName),
    orderBy('survivalTimeSeconds', 'desc'),
  );

  const querySnapshot = await getDocs(q);
  const scores: LeaderboardScore[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    scores.push({
      id: doc.id,
      displayName: data.displayName as string,
      survivalTimeSeconds: data.survivalTimeSeconds as number,
      score: data.score as number,
      environment: data.environment as 'local' | 'development' | 'production',
      recordedAt: data.recordedAt?.toDate?.() ?? new Date(),
    });
  });

  return scores;
}
