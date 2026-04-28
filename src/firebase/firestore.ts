/**
 * Firestore database instance and initialization.
 * Lazy-initializes on first access.
 */

import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { initializeFirebase } from './config';

let firestoreDb: Firestore | null = null;

/**
 * Get the Firestore database instance.
 * Initializes Firebase if not already done.
 */
export function getDb(): Firestore {
  if (firestoreDb === null) {
    const app = initializeFirebase();
    firestoreDb = getFirestore(app);
  }

  return firestoreDb;
}
