// Firebase Configuration
// This file will be dynamically generated during deployment with GitHub Actions

// Check if we have the dynamic config from GitHub Actions
if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) {
  // Use the dynamically generated config from GitHub Actions
  const firebaseConfig = window.__FIREBASE_CONFIG__;
  
  // Initialize Firebase with the dynamic config
  if (typeof firebase !== 'undefined') {
    const app = firebase.initializeApp(firebaseConfig);
    const analytics = firebase.analytics();
    const db = firebase.firestore();
    
    // Export for use in other modules
    window.firebaseApp = app;
    window.firebaseAnalytics = analytics;
    window.firebaseDb = db;
  }
} else {
  // No fallback - require proper configuration
  console.error('❌ Firebase configuration not found. Make sure GitHub Actions is properly configured to inject window.__FIREBASE_CONFIG__');
}

// Export a function to get the Firebase instance
export function getFirebaseApp() {
  return window.firebaseApp;
}

export function getFirebaseAnalytics() {
  return window.firebaseAnalytics;
}

export function getFirebaseDb() {
  return window.firebaseDb;
}
