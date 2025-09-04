// Firebase Configuration for Landing Page
// This allows the landing page to access the real branch count

// Firebase configuration - will be dynamically generated during deployment
// This should be injected by GitHub Actions via window.__FIREBASE_CONFIG__
const firebaseConfig = window.__FIREBASE_CONFIG__;

if (!firebaseConfig) {
  console.error('❌ Firebase configuration not found. Make sure GitHub Actions is properly configured to inject window.__FIREBASE_CONFIG__');
}

// Initialize Firebase
if (typeof firebase !== 'undefined' && firebaseConfig) {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    
    // Function to get branch count
    window.getBranchCount = async function() {
        try {
            // Try to get count from 'prompts' collection first
            let snapshot = await db.collection('prompts').get();
            if (!snapshot.empty) {
                return snapshot.size;
            }
            
            // Fallback to 'branches' collection
            snapshot = await db.collection('branches').get();
            return snapshot.size;
        } catch (error) {
            console.warn('Could not fetch branch count from Firebase:', error);
            return null;
        }
    };
} else {
    console.warn('Firebase not loaded or config not available');
}
