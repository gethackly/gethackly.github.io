import os
import time
import logging
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from google.cloud import firestore
import firebase_admin
from firebase_admin import credentials as fb_credentials, storage
from datetime import datetime
import openai
from google.cloud.firestore import SERVER_TIMESTAMP

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('prompt_extractor.log')
    ]
)
logger = logging.getLogger(__name__)

# Initialize Google Drive API
SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/datastore',  # Firestore scope
]
CREDENTIALS_FILE = 'service-account.json'
DOWNLOADS_DIR = 'downloads'
FIREBASE_PROJECT_ID = 'hackly-mvp.firebasestorage.app'

if not os.path.exists(DOWNLOADS_DIR):
    os.makedirs(DOWNLOADS_DIR)

class AIProcessor:
    def __init__(self):
        """Initialize the AI processor with OpenAI API key."""
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        self.client = openai.OpenAI(api_key=api_key)
        logger.info("AI Processor initialized successfully")

    def process_text(self, text_content):
        """Process text content using OpenAI API (v1+ syntax)."""
        try:
            # Generate summary
            summary_response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes text."},
                    {"role": "user", "content": f"Summarize this text in 2-3 sentences: {text_content}"}
                ],
                max_tokens=150
            )
            
            # Extract key points
            points_response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that extracts key points from text."},
                    {"role": "user", "content": f"List 3-5 key points from this text: {text_content}"}
                ],
                max_tokens=200
            )
            
            # Analyze sentiment
            sentiment_response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that analyzes text sentiment."},
                    {"role": "user", "content": f"Analyze the sentiment of this text (positive/negative/neutral): {text_content}"}
                ],
                max_tokens=50
            )
            
            return {
                'summary': summary_response.choices[0].message.content,
                'keyPoints': points_response.choices[0].message.content.split('\n'),
                'sentiment': sentiment_response.choices[0].message.content,
                'lastProcessed': SERVER_TIMESTAMP
            }
        except Exception as e:
            logger.error(f"AI processing failed: {str(e)}")
            raise

    def evaluate_prompt(self, prompt_text):
        """Evaluate coding prompt for accuracy, reliability, complexity, and overall (composite) score. Ultra-strict, coding-focused rubric. Default to low scores unless flawless. Complexity is only high for advanced, multi-faceted projects."""
        try:
            system_prompt = (
                "You are an expert evaluator for coding project prompts. You must be extremely strict, skeptical, and critical. "
                "Default to low scores unless the prompt is truly world-class. Only a flawless, fully specified, production-ready prompt should score above 80. "
                "Most prompts should score below 60 unless they are exceptionally detailed and leave nothing to guess. "
                "Penalize any missing, vague, or assumed detail harshly. If you have to guess or infer anything, deduct many points. "
                "Do NOT provide any justifications or explanations, only numeric scores.\n\n"
                "For each of the following criteria, give a score from 0 (very poor) to 100 (perfect):\n"
                "- Accuracy: How precise and unambiguous is the prompt?\n"
                "- Reliability: How well does the prompt anticipate edge cases, errors, and security issues?\n"
                "- Complexity: How challenging and advanced is the project described? Only give a high score if the project requires advanced logic, architecture, or multiple components. Simple or standard projects (like an uninnovative Todo App) should score low on complexity, even if precise.\n"
                "Then, provide an overall score (0–100) that is a composite of the three.\n\n"
                "Use this calibration (be extremely strict):\n"
                "- 80–100: Flawless, fully specified, production-ready. No ambiguity, all details present, nothing left to guess.\n"
                "- 60–80: Very strong, only minor details missing, but the AI has to guess some things.\n"
                "- 40–60: Good guidelines but the AI has to guess a lot of things in order to build this.\n"
                "- 20–40: Mediocre, significant gaps or ambiguities.\n"
                "- 0–20: Poor, vague, or unusable as a coding prompt.\n\n"
                "Return your answer as a JSON object with this structure (no justifications, only scores):\n\n"
                "{\n  'evaluation': {\n    'accuracy': ...,\n    'reliability': ...,\n    'complexity': ...,\n    'overall': ...\n  }\n}"
            )
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Prompt to evaluate:\n{prompt_text}"}
                ],
                max_tokens=200
            )
            import json
            import re
            content = response.choices[0].message.content
            match = re.search(r'\{[\s\S]*\}', content)
            if match:
                json_str = match.group(0)
                try:
                    evaluation = json.loads(json_str.replace("'", '"'))
                except Exception as e:
                    logger.error(f"Failed to parse AI evaluation JSON: {e}\nRaw content: {json_str}")
                    evaluation = {"raw": content}
            else:
                logger.error(f"No JSON found in AI response. Raw content: {content}")
                evaluation = {"raw": content}
            return evaluation
        except Exception as e:
            logger.error(f"AI prompt evaluation failed: {str(e)}")
            raise

def init_services():
    """Initialize Firestore, Drive, and Firebase Storage services"""
    credentials_gcp = service_account.Credentials.from_service_account_file(
        CREDENTIALS_FILE, scopes=SCOPES
    )
    db = firestore.Client(credentials=credentials_gcp)
    drive_service = build('drive', 'v3', credentials=credentials_gcp)
    # Initialize Firebase Admin only once
    if not firebase_admin._apps:
        cred = fb_credentials.Certificate(CREDENTIALS_FILE)
        firebase_admin.initialize_app(cred, {
            'storageBucket': FIREBASE_PROJECT_ID
        })
    bucket = storage.bucket()
    return db, drive_service, bucket

def download_google_doc_as_txt(drive_service, file_id, output_path):
    """Download a Google Doc as plain text and save it locally."""
    try:
        request = drive_service.files().export_media(fileId=file_id, mimeType='text/plain')
        with open(output_path, 'wb') as f:
            f.write(request.execute())
        with open(output_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to download Google Doc {file_id} as txt: {str(e)}")
        return None

def upload_txt_to_firebase(bucket, local_path, file_id):
    """Upload a txt file to Firebase Storage and return the public URL."""
    try:
        blob = bucket.blob(f'txts/{file_id}.txt')
        blob.upload_from_filename(local_path)
        blob.make_public()  # Optional: make the file publicly accessible
        return blob.public_url
    except Exception as e:
        logger.error(f"Failed to upload {local_path} to Firebase Storage: {str(e)}")
        return None

def process_documents(db, drive_service, bucket, ai_processor):
    """Process documents that need text extraction and AI processing"""
    try:
        docs = db.collection('documents').where('textFileRequested', '==', True).stream()
        total_docs = len(list(db.collection('documents').stream()))
        logger.info(f"Total documents in collection: {total_docs}")
        processed = False
        for doc in docs:
            processed = True
            doc_data = doc.to_dict()
            logger.info(f"Processing document {doc.id}")
            logger.info(f"Document fields: {list(doc_data.keys())}")
            logger.info(f"Document status: {doc_data.get('status', 'unknown')}")
            logger.info(f"AI processing status: {doc_data.get('aiProcessingStatus', 'unknown')}")
            doc_id = doc_data.get('docId')
            if not doc_id:
                logger.error(f"Document {doc.id} has no docId field. Available fields: {list(doc_data.keys())}")
                continue
            logger.info(f"Processing Google Doc with docId: {doc_id}")
            txt_path = os.path.join(DOWNLOADS_DIR, f'{doc_id}.txt')
            text_content = download_google_doc_as_txt(drive_service, doc_id, txt_path)
            txt_url = upload_txt_to_firebase(bucket, txt_path, doc_id) if text_content else None
            if text_content and txt_url:
                doc.reference.update({
                    'textFileRequested': False,
                    'textContent': text_content,
                    'txtFileUrl': txt_url,
                    'lastProcessed': SERVER_TIMESTAMP,
                    'status': 'completed',
                    'charCount': len(text_content),
                    'wordCount': len(text_content.split()),
                    'aiProcessingStatus': 'pending'
                })
                try:
                    # Evaluate prompt using the new method
                    ai_eval = ai_processor.evaluate_prompt(text_content)
                    logger.info(f"AI evaluation for document {doc_id}: {ai_eval}")
                    try:
                        doc.reference.update({
                            'aiEvaluation': ai_eval,
                            'aiProcessingStatus': 'completed'
                        })
                        logger.info(f"Successfully updated Firestore with AI evaluation for document {doc_id}")
                    except Exception as firestore_update_error:
                        logger.error(f"Failed to update Firestore for document {doc_id}: {firestore_update_error}")
                    logger.info(f"Successfully processed document {doc_id} with AI evaluation")
                except Exception as e:
                    logger.error(f"AI evaluation failed for document {doc_id}: {str(e)}", exc_info=True)
                    try:
                        doc.reference.update({
                            'aiProcessingStatus': 'failed',
                            'aiProcessingError': str(e)
                        })
                    except Exception as firestore_update_error:
                        logger.error(f"Failed to update Firestore with AI error for document {doc_id}: {firestore_update_error}")
            else:
                doc.reference.update({
                    'textFileRequested': False,
                    'status': 'failed',
                    'error': 'Failed to download/upload txt',
                    'lastProcessed': SERVER_TIMESTAMP
                })
                logger.error(f"Failed to process document: {doc_id}")
        if not processed:
            logger.info("No documents to process")
    except Exception as e:
        logger.error(f"Error in process_documents: {str(e)}")

def main():
    logger.info("Starting Prompt Extractor Service with AI Processing")
    try:
        db, drive_service, bucket = init_services()
        ai_processor = AIProcessor()
        logger.info("Successfully initialized all services")
        while True:
            process_documents(db, drive_service, bucket, ai_processor)
            time.sleep(30)
    except Exception as e:
        logger.error(f"Fatal error in main loop: {str(e)}")
        raise

if __name__ == "__main__":
    main() 