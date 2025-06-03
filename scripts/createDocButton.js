// Replace with your deployed Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJMoFA6eQF0NaHlPMpB4q0VYvSnhdfqajZuh8NCDkAHwE8_aM2_PYifiBUjUGucFOr5w/exec';

async function createNewDoc() {
    const button = document.getElementById('createDocButton');
    const resultDiv = document.getElementById('result');
    
    try {
        // Disable button and show loading state
        button.disabled = true;
        button.textContent = 'Creating...';
        resultDiv.textContent = '';
        
        console.log('Sending request to:', SCRIPT_URL);
        
        // Send POST request to the Google Apps Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            throw new Error('Invalid response from server');
        }
        
        console.log('Parsed response:', data);
        
        if (data.success && data.data) {
            // Create clickable link
            const link = document.createElement('a');
            link.href = data.data.googleDocWebViewUrl;
            link.textContent = 'Open your new document';
            link.target = '_blank';
            resultDiv.appendChild(link);
            
            // If we have access to the db object, store the document in Firestore
            if (typeof db !== 'undefined') {
                await db.collection('documents').doc(data.data.id).set({
                    ...data.data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } else {
            resultDiv.textContent = 'Error: ' + (data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error in createNewDoc:', error);
        resultDiv.textContent = 'Error: ' + error.message;
    } finally {
        // Reset button state
        button.disabled = false;
        button.textContent = 'Create New Document';
    }
} 