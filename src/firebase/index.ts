/**
 * Firebase persistence layer exports.
 * Provides initialization, Firestore access, and repository functions.
 * 
 * To use:
 * 1. Ensure environment variables are set (see config.ts)
 * 2. Call initializeFirebase() once at app startup, or let repositories initialize on first use
 * 3. Use leaderboardRepository.* and matchResultsRepository.* for data access
 */

export { initializeFirebase, getFirebaseApp, getFirebaseEnvironment } from './config';
export { getDb } from './firestore';
export * from './types';
export * as leaderboardRepository from './leaderboardRepository';
export * as matchResultsRepository from './matchResultsRepository';
