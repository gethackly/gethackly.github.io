// Your web app's Firebase configuration (from firebase-credentials.json, adapted for client-side)
const firebaseConfig = {
  apiKey: "AIzaSyA2Qw1vQvQw1vQvQw1vQvQw1vQw1vQw1vQ", // <-- You must get this from your Firebase console (not in service account)
  authDomain: "prompt-evaluation-system.firebaseapp.com",
  projectId: "prompt-evaluation-system",
  storageBucket: "prompt-evaluation-system.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Fetch the global scores from Firestore and update the dashboard
async function fetchScores() {
  try {
    const doc = await db.collection('evaluations').doc('global').get();
    if (doc.exists) {
      const data = doc.data();
      
      // Update Accuracy
      const accuracyValue = (data.global_accuracy ?? '--');
      const accuracyMetric = document.querySelectorAll('.metric')[0];
      accuracyMetric.querySelector('.metric-value').textContent = accuracyValue + '%';
      accuracyMetric.querySelector('.metric-bar-fill').style.width = (accuracyValue === '--' ? 0 : accuracyValue) + '%';
      
      // Update Complexity
      const complexityValue = (data.global_complexity ?? '--');
      const complexityMetric = document.querySelectorAll('.metric')[1];
      complexityMetric.querySelector('.metric-value').textContent = complexityValue + '%';
      complexityMetric.querySelector('.metric-bar-fill').style.width = (complexityValue === '--' ? 0 : complexityValue) + '%';
      
      // Update Reliability
      const reliabilityValue = (data.global_reliability ?? '--');
      const reliabilityMetric = document.querySelectorAll('.metric')[2];
      reliabilityMetric.querySelector('.metric-value').textContent = reliabilityValue + '%';
      reliabilityMetric.querySelector('.metric-bar-fill').style.width = (reliabilityValue === '--' ? 0 : reliabilityValue) + '%';
    } else {
      console.log('No such document!');
    }
  } catch (error) {
    console.error('Error fetching scores:', error);
  }
}

// Call the function on page load
fetchScores(); 
