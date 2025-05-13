# api/gdrive_helper.py
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
import json
import re

class GoogleDriveHelper:
    def __init__(self, client_id, client_secret, refresh_token):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.service = None

    def authenticate(self):
        creds = Credentials.from_authorized_user_info({
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': self.refresh_token,
            'token_uri': 'https://oauth2.googleapis.com/token',
        })

        self.service = build('drive', 'v3', credentials=creds)
        return self.service

    def upload_file(self, file_content, filename, folder_url):
        """Upload a file to Google Drive and return the shareable link"""
        try:
            # Get folder ID from URL
            folder_id = self._get_folder_id_from_url(folder_url)
            if not folder_id:
                raise ValueError("Invalid folder URL")
            
            # Prepare the file metadata
            file_metadata = {
                'name': filename,
                'parents': [folder_id]
            }

            # Create media with larger chunk size for better performance
            fh = io.BytesIO(file_content)
            media = MediaIoBaseUpload(
                fh, 
                mimetype='application/x-hdf5' if filename.endswith('.h5') else 'application/json',
                resumable=True,
                chunksize=262144  # 256KB chunks
            )

            # Upload file
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webContentLink',
                supportsAllDrives=True
            ).execute()

            # Create shareable link
            self.service.permissions().create(
                fileId=file.get('id'),
                body={'type': 'anyone', 'role': 'reader'},
                fields='id'
            ).execute()

            # Get the download link
            download_url = file.get('webContentLink')
            if not download_url:
                download_url = f"https://drive.google.com/uc?export=download&id={file.get('id')}"

            return {'weights_url': download_url}

        except Exception as e:
            print(f"Error uploading to Google Drive: {str(e)}")
            raise

    def _get_folder_id_from_url(self, folder_url):
        """Extract folder ID from Google Drive URL"""
        # Handle different Google Drive URL formats
        patterns = [
            r'folders/([a-zA-Z0-9-_]+)',  # matches folders/FOLDER_ID
            r'id=([a-zA-Z0-9-_]+)',       # matches id=FOLDER_ID
            r'drive/([a-zA-Z0-9-_]+)',    # matches drive/FOLDER_ID
            r'([a-zA-Z0-9-_]{33})',       # matches a standalone folder ID
        ]
        
        for pattern in patterns:
            match = re.search(pattern, folder_url)
            if match:
                return match.group(1)
        
        # If no patterns match but the URL is clean (just the ID)
        clean_url = folder_url.strip('/')
        if re.match(r'^[a-zA-Z0-9-_]{33}$', clean_url):
            return clean_url
            
        return None