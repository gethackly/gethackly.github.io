// Import Firebase configuration
import { firebaseConfig } from './config.js';

// Initialize Firebase using the CDN global
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Export Firebase services
export { db, auth };

// Make services available globally
window.db = db;
window.auth = auth;
window.firebaseApp = app; 