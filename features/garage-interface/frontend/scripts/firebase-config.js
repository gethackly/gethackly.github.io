// Import Firebase configuration
import { firebaseConfig } from './config.js';

// Initialize Firebase using the CDN global
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Export Firebase services
export { db, auth };

// If you need to use db and auth elsewhere, attach to window (optional)
window.db = db;
window.auth = auth; 