import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Configurazione Web pubblica. Le variabili .env possono sovrascriverla.
const e = import.meta.env;
export const firebaseConfig = {
  apiKey: e.VITE_FIREBASE_API_KEY || 'AIzaSyBs0AH6Jc59z_JhAxx6vHhdJ-IhkIBCiaw',
  authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || 'marketplace-2a219.firebaseapp.com',
  projectId: e.VITE_FIREBASE_PROJECT_ID || 'marketplace-2a219',
  storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET || 'marketplace-2a219.firebasestorage.app',
  messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID || '1017653161342',
  appId: e.VITE_FIREBASE_APP_ID || '1:1017653161342:web:4d516233ba13fb706f972f',
  measurementId: e.VITE_FIREBASE_MEASUREMENT_ID || 'G-LQFNFZE3H4',
};
export const configured = true;
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
