// Configuration
const FOLDER_ID = '180V-h3mTTXPnhFE2nMFrv2oWM9m6Xi0J'; // Google Drive folder ID

function doPost(e) {
  try {
    // Create a new Google Doc
    const doc = DocumentApp.create('New Document');
    
    // Get the file from Drive
    const file = DriveApp.getFileById(doc.getId());
    
    // Move the file to the specified folder
    const folder = DriveApp.getFolderById(FOLDER_ID);
    file.moveTo(folder);
    
    // Get the URLs
    const editUrl = doc.getUrl();
    const webViewUrl = `https://docs.google.com/document/d/${doc.getId()}/preview`;
    const embedUrl = `https://docs.google.com/document/d/${doc.getId()}/preview`;
    
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    // Return the data in the format expected by the garage interface
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: {
        id: doc.getId(),
        title: 'New Document',
        createdAt: new Date().toISOString(),
        status: 'draft',
        views: 0,
        googleDocUrl: editUrl,
        googleDocWebViewUrl: webViewUrl,
        googleDocEmbedUrl: embedUrl
      }
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
    
  } catch (error) {
    // Return error as JSON
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
  }
}

// Handle OPTIONS request for CORS preflight
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
} 