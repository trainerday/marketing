#!/usr/bin/env python3
"""
Step 7: Upload to YouTube
- Upload ready_for_youtube.mov to YouTube using the YouTube Data API
- Generate metadata from project config
- Handle authentication and upload process
"""

import sys
import json
import os
from pathlib import Path
import pickle
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# YouTube API scopes
SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'

def authenticate_youtube():
    """Authenticate with YouTube API using OAuth2."""
    creds = None
    token_file = Path.home() / '.youtube_credentials.pickle'
    
    # Load existing credentials
    if token_file.exists():
        with open(token_file, 'rb') as token:
            creds = pickle.load(token)
    
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # You need to create credentials.json from Google Cloud Console
            credentials_file = Path(__file__).parent / 'credentials.json'
            if not credentials_file.exists():
                print("❌ Missing credentials.json file!")
                print("\nTo set up YouTube API access:")
                print("1. Go to https://console.cloud.google.com/")
                print("2. Create a new project or select existing one")
                print("3. Enable YouTube Data API v3")
                print("4. Create OAuth 2.0 credentials (Desktop application)")
                print("5. Download the JSON file and save as 'credentials.json' in the project root")
                print(f"6. Expected location: {credentials_file}")
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                str(credentials_file), SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open(token_file, 'wb') as token:
            pickle.dump(creds, token)
    
    return build(API_SERVICE_NAME, API_VERSION, credentials=creds)

def generate_metadata_from_config(config):
    """Generate YouTube metadata from project config."""
    # Use youtube_title if specified, otherwise fall back to branding
    title = config.get('youtube_title')
    if not title:
        branding = config.get('branding', {})
        title_line1 = branding.get('title_line1', 'Video Update')
        title_line2 = branding.get('title_line2', 'New Features')
        title = f"{title_line1}: {title_line2}"
    
    # Ensure title is within YouTube's limits (max 100 characters)
    if len(title) > 100:
        title = title[:97] + "..."
    
    # Generate description using title_line2 if available, otherwise use title
    branding = config.get('branding', {})
    title_line2 = branding.get('title_line2', title.split(': ')[-1] if ': ' in title else 'Latest Updates')
    
    # Generate description
    description = f"""🎯 {title_line2}

In this video, I'll walk you through the latest updates and features.

🔗 Links:
- Website: https://trainerday.com
- Support: https://forums.trainerday.com

#TrainerDay #FeatureUpdate #CyclingTech #TrainingApp"""

    # Generate tags
    tags = [
        "TrainerDay",
        "feature update",
        "cycling",
        "training",
        "demo",
        "tutorial"
    ]
    
    # Add branding-based tags if available
    title_line1 = branding.get('title_line1', '')
    if title_line1:
        tags.append(title_line1.lower().replace(' ', ''))
    if title_line2:
        tags.append(title_line2.lower().replace(' ', ''))
    
    # Remove empty tags and limit to 15 tags
    tags = [tag for tag in tags if tag.strip()][:15]
    
    return {
        'title': title,
        'description': description,
        'tags': tags,
        'category_id': '28',  # Science & Technology
        'privacy_status': 'unlisted'  # Start as unlisted for review
    }

def upload_video(youtube, video_file, metadata):
    """Upload video to YouTube."""
    print(f"  Uploading video: {video_file.name}")
    print(f"  Title: {metadata['title']}")
    print(f"  Privacy: {metadata['privacy_status']}")
    
    # Prepare request body
    body = {
        'snippet': {
            'title': metadata['title'],
            'description': metadata['description'],
            'tags': metadata['tags'],
            'categoryId': metadata['category_id']
        },
        'status': {
            'privacyStatus': metadata['privacy_status']
        }
    }
    
    # Create media upload object
    media = MediaFileUpload(
        str(video_file),
        chunksize=-1,  # Upload in one chunk
        resumable=True,
        mimetype='video/*'
    )
    
    # Execute upload request
    insert_request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=media
    )
    
    # Upload with progress
    response = None
    while response is None:
        try:
            status, response = insert_request.next_chunk()
            if status:
                progress = int(status.progress() * 100)
                print(f"  Upload progress: {progress}%")
        except Exception as e:
            print(f"  Upload error: {e}")
            return None
    
    return response

def main():
    if len(sys.argv) != 2:
        print("Usage: python 'Step 7 - Upload to YouTube.py' <directory>")
        print("Example: python 'Step 7 - Upload to YouTube.py' current-project/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"❌ Directory not found: {directory}")
        sys.exit(1)
    
    # Check for video file
    video_file = directory / "human-provided-content" / "ready_for_youtube.mov"
    if not video_file.exists():
        print(f"❌ Video file not found: {video_file}")
        print("Make sure you have completed all previous steps and have the final video ready.")
        sys.exit(1)
    
    # Load project config
    config_file = directory / "human-provided-content" / "project-config.json"
    if not config_file.exists():
        print(f"❌ Project config not found: {config_file}")
        sys.exit(1)
    
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    print("Step 7: Upload to YouTube")
    print("=" * 50)
    
    # Authenticate with YouTube
    print("🔐 Authenticating with YouTube...")
    print("⚠️  IMPORTANT: Make sure to sign in with the @TrainerDay account when prompted!")
    youtube = authenticate_youtube()
    if not youtube:
        sys.exit(1)
    
    print("✅ Authentication successful!")
    
    # Get channel info to confirm correct account
    try:
        channels_response = youtube.channels().list(part='snippet', mine=True).execute()
        if channels_response['items']:
            channel_title = channels_response['items'][0]['snippet']['title']
            print(f"📺 Uploading to channel: {channel_title}")
        else:
            print("⚠️  No YouTube channel found for this account")
    except Exception as e:
        print(f"⚠️  Could not verify channel: {e}")
    
    # Generate metadata
    print("\n📝 Generating video metadata...")
    metadata = generate_metadata_from_config(config)
    
    print(f"  Title: {metadata['title']}")
    print(f"  Tags: {', '.join(metadata['tags'][:5])}...")  # Show first 5 tags
    print(f"  Privacy: {metadata['privacy_status']}")
    
    # Confirm upload
    print(f"\n📹 Ready to upload: {video_file.name}")
    file_size_mb = video_file.stat().st_size / (1024 * 1024)
    print(f"  File size: {file_size_mb:.1f} MB")
    
    # Get file duration
    try:
        import subprocess
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', 
            '-of', 'csv=p=0', str(video_file)
        ], capture_output=True, text=True)
        if result.returncode == 0:
            duration = float(result.stdout.strip())
            minutes = int(duration // 60)
            seconds = int(duration % 60)
            print(f"  Duration: {minutes}:{seconds:02d}")
    except:
        pass
    
    # Check if running in interactive mode
    try:
        confirm = input("\n🚀 Upload to YouTube? (y/n): ").lower().strip()
        if confirm != 'y':
            print("Upload cancelled.")
            sys.exit(0)
    except EOFError:
        # Auto-confirm if running non-interactively
        print("\n🚀 Auto-confirming upload (non-interactive mode)...")
        confirm = 'y'
    
    # Upload video
    print("\n📤 Starting upload...")
    response = upload_video(youtube, video_file, metadata)
    
    if response:
        video_id = response['id']
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        
        print("\n" + "=" * 50)
        print("🎉 UPLOAD SUCCESSFUL!")
        print("=" * 50)
        print(f"Video ID: {video_id}")
        print(f"Video URL: {video_url}")
        print(f"Title: {metadata['title']}")
        print(f"Privacy: {metadata['privacy_status']}")
        
        print("\n📋 Next Steps:")
        print("1. Review your video on YouTube")
        print("2. Add custom thumbnail if needed")
        print("3. Adjust title/description if needed")
        print("4. Change privacy to 'Public' when ready")
        print("5. Add to playlists")
        print("6. Share the link!")
        
        # Save video info
        video_info = {
            'video_id': video_id,
            'video_url': video_url,
            'upload_metadata': metadata,
            'upload_timestamp': str(Path(video_file).stat().st_mtime)
        }
        
        info_file = directory / "youtube_upload_info.json"
        with open(info_file, 'w') as f:
            json.dump(video_info, f, indent=2)
        
        print(f"\n💾 Upload info saved to: {info_file.name}")
        
    else:
        print("\n❌ Upload failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()