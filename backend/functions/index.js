require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
    credentials: require('./service-account.json'),
    scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });

exports.create_doc = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const { title, content } = req.body;

            // Create Google Doc
            const doc = await google.docs({ version: 'v1', auth }).documents.create({
                requestBody: {
                    title: title || 'Untitled Document'
                }
            });

            // Get the file from Drive
            const file = await drive.files.get({
                fileId: doc.data.documentId,
                fields: 'id, name, webViewLink, webContentLink'
            });

            // Move to shared folder
            await drive.files.update({
                fileId: file.data.id,
                addParents: '180V-h3mTTXPnhFE2nMFrv2oWM9m6Xi0J',
                fields: 'id, parents'
            });

            // Create Firestore document
            const docRef = await admin.firestore().collection('documents').add({
                title: title || 'Untitled Document',
                content: content || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'draft',
                views: 0,
                googleDocUrl: file.data.webContentLink,
                googleDocWebViewUrl: file.data.webViewLink,
                googleDocEmbedUrl: `https://docs.google.com/document/d/${file.data.id}/preview`
            });

            // Send Discord notification
            const webhookUrl = 'https://discord.com/api/webhooks/1373614407715913869/NCrCS6bK6tkWQB4dWNjPPT9AL5AmTnInHn93U_zS7EUhtkwSS_Cgpo4yN4wd1Mts5Gny';
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `New document created: ${title || 'Untitled Document'}`
                })
            });

            // Return success response
            res.status(200).json({
                success: true,
                documentId: docRef.id,
                googleDocUrl: file.data.webContentLink,
                googleDocWebViewUrl: file.data.webViewLink,
                googleDocEmbedUrl: `https://docs.google.com/document/d/${file.data.id}/preview`
            });

        } catch (error) {
            console.error('Error creating document:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
}); 