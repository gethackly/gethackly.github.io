// Initialize Firebase using compat SDK and expose Firestore as window.db
(function initFirebaseCompat() {
    if (window.firebaseInitialized) return;
    
    function tryInit() {
        if (!window.firebase || !window.firebase.initializeApp) {
            // Retry shortly until Firebase compat is available
            setTimeout(tryInit, 50);
            return;
        }
        
        // Check if we have the dynamic config from GitHub Actions
        let firebaseConfig;
        
        if (window.__FIREBASE_CONFIG__) {
            // Use the dynamically generated config from GitHub Actions
            firebaseConfig = window.__FIREBASE_CONFIG__;

        } else {
            // Fallback for local development
            firebaseConfig = {
                apiKey: "YOUR_API_KEY",
                authDomain: "YOUR_AUTH_DOMAIN",
                projectId: "YOUR_PROJECT_ID",
                storageBucket: "YOUR_STORAGE_BUCKET",
                messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
                appId: "YOUR_APP_ID",
                measurementId: "YOUR_MEASUREMENT_ID"
            };
            console.warn('⚠️ Using fallback Firebase config. For production, ensure GitHub Actions generates the config.');
        }
        
        try {
            const app = window.firebase.initializeApp(firebaseConfig);
            const db = window.firebase.firestore(app);
            const auth = window.firebase.auth(app);
            
            window.firebaseApp = app;
            window.db = db;
            window.auth = auth;
            window.firebaseInitialized = true;

            // Notify listeners that Firestore is ready
            try {
                window.dispatchEvent(new Event('firebase-ready'));
            } catch (_) {}
        } catch (error) {
            console.error('❌ Failed to initialize Firebase:', error);
        }
    }
    
    tryInit();
})();


