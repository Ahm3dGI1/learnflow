/**
 * Firebase Configuration and Initialization
 * 
 * Configures and initializes Firebase services for LearnFlow application.
 * Loads configuration from environment variables and exports initialized
 * Firebase Auth instance for use throughout the application.
 * 
 * Environment variables required:
 * - REACT_APP_FIREBASE_API_KEY: Firebase API key
 * - REACT_APP_FIREBASE_AUTH_DOMAIN: Authentication domain
 * - REACT_APP_FIREBASE_PROJECT_ID: Firebase project ID
 * - REACT_APP_FIREBASE_STORAGE_BUCKET: Cloud Storage bucket
 * - REACT_APP_FIREBASE_MESSAGING_SENDER_ID: Cloud Messaging sender ID
 * - REACT_APP_FIREBASE_APP_ID: Firebase app ID
 * 
 * @module firebase
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Firebase Configuration Object
 * 
 * Loads all configuration values from environment variables for security.
 * Configuration includes project identification, authentication domain,
 * and service endpoints. measurementId is optional for Firebase JS SDK
 * v7.20.0 and later.
 */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Debug: Log configuration (remove in production)
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  storageBucket: firebaseConfig.storageBucket || 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
  appId: firebaseConfig.appId || 'MISSING'
});

// Initialize Firebase app instance with configuration
const app = initializeApp(firebaseConfig);

/**
 * Firebase Authentication Instance
 * 
 * Initialized Auth instance for managing user authentication.
 * Supports email/password and Google OAuth sign-in methods.
 * 
 * @type {Auth}
 * @example
 * import { auth } from './firebase';
 * import { signInWithEmailAndPassword } from 'firebase/auth';
 * 
 * await signInWithEmailAndPassword(auth, email, password);
 */
export const auth = getAuth(app);