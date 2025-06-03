// Assumes config.js is loaded before this file and provides `firebaseConfig`

// Initialize Firebase using the CDN global
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// If you need to use db and auth elsewhere, attach to window (optional)
window.db = db;
window.auth = auth; 