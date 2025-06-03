require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });
const docs = google.docs({ version: 'v1', auth });

// Environment variables
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

app.post('/create_doc', async (req, res) => {
  try {
    const { title, content } = req.body;

    // Create Google Doc
    const doc = await docs.documents.create({
      requestBody: {
        title: title,
        body: {
          content: [
            {
              paragraph: {
                elements: [
                  {
                    textRun: {
                      content: content
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    });

    // Get file details
    const file = await drive.files.get({
      fileId: doc.data.documentId,
      fields: 'id, name, webViewLink'
    });

    // Move to shared folder
    await drive.files.update({
      fileId: file.data.id,
      addParents: FOLDER_ID,
      fields: 'id, name, webViewLink'
    });

    // Create Firestore document
    const docRef = await admin.firestore().collection('documents').add({
      title: title,
      content: content,
      docId: file.data.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      editUrl: `https://docs.google.com/document/d/${file.data.id}/edit`,
      viewUrl: file.data.webViewLink
    });

    // Send Discord notification
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `New document created: ${title}\nEdit URL: https://docs.google.com/document/d/${file.data.id}/edit`
      })
    });

    res.json({
      success: true,
      docId: file.data.id,
      editUrl: `https://docs.google.com/document/d/${file.data.id}/edit`,
      viewUrl: file.data.webViewLink
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 