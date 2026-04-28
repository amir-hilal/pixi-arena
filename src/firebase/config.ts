/**
 * Firebase application initialization.
 * Configuration is loaded from Vite environment variables.
 * 
 * Required env variables (in .env.local or similar):
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 * - VITE_FIREBASE_ENVIRONMENT: 'local' | 'development' | 'production' (optional)
 * - VITE_APP_ENV: 'local' | 'development' | 'production' (fallback if Firebase env is not set)
 */

import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';

let firebaseApp: FirebaseApp | null = null;

/**
 * Initialize Firebase if not already initialized.
 * Returns the Firebase app instance.
 * Throws if required environment variables are missing.
 */
export function initializeFirebase(): FirebaseApp {
  if (firebaseApp !== null) {
    return firebaseApp;
  }

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (
    !apiKey
    || !authDomain
    || !projectId
    || !storageBucket
    || !messagingSenderId
    || !appId
  ) {
    throw new Error(
      'Firebase configuration incomplete. '
      + 'Ensure all VITE_FIREBASE_* environment variables are set.',
    );
  }

  firebaseApp = initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  });

  return firebaseApp;
}

/**
 * Get the current Firebase app instance.
 * Throws if Firebase has not been initialized yet.
 */
export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp === null) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }

  return firebaseApp;
}

/**
 * Get the current Firebase environment from env variables.
 * Defaults to 'local' if not set.
 */
export function getFirebaseEnvironment(): 'local' | 'development' | 'production' {
  const env = import.meta.env.VITE_FIREBASE_ENVIRONMENT
    ?? import.meta.env.VITE_APP_ENV
    ?? 'local';

  if (env !== 'local' && env !== 'development' && env !== 'production') {
    console.warn(
      `Invalid environment value: "${env}". Defaulting to "local".`,
    );
    return 'local';
  }

  return env;
}
