#!/usr/bin/env python3
"""
Step 9: Create video using Shotstack API.
This script:
1. Analyzes all assets (video, audio chapters, music)
2. Calculates precise timing with freeze frames and gaps
3. Creates Shotstack timeline with proper audio mixing
4. Renders final video with b-roll intro/outro structure
"""

import os
import sys
import json
import requests
import time
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_audio_duration(audio_file):
    """Get audio file duration using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'csv=p=0', str(audio_file)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
        else:
            return None
    except Exception as e:
        print(f"✗ Error getting duration for {audio_file}: {e}")
        return None

def get_video_duration(video_file):
    """Get video file duration using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'csv=p=0', str(video_file)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
        else:
            return None
    except Exception as e:
        print(f"✗ Error getting video duration: {e}")
        return None

def setup_shotstack_config():
    """Setup Shotstack API configuration."""
    stage = os.getenv('SHOTSTACK_STAGE', 'stage')  # 'stage' or 'v1'
    
    if stage == 'stage':
        api_key = os.getenv('SHOTSTACK_SANDBOX_API_KEY')
    else:
        api_key = os.getenv('SHOTSTACK_PRODUCTION_API_KEY')
    
    if not api_key:
        print(f"✗ Error: Shotstack {stage} API key not found in environment variables.")
        print("Required keys in .env file:")
        print("  - SHOTSTACK_SANDBOX_API_KEY (for testing)")
        print("  - SHOTSTACK_PRODUCTION_API_KEY (for production)")
        print("  - SHOTSTACK_STAGE=stage (or v1 for production)")
        sys.exit(1)
    
    return {
        'api_key': api_key,
        'stage': stage,
        'base_url': f'https://api.shotstack.io/{stage}'
    }

def load_json_file(file_path):
    """Load JSON file safely."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"✗ Error loading {file_path}: {e}")
        return None

def analyze_video_assets(base_name, directory):
    """Analyze all video assets and calculate timing."""
    print(f"Analyzing assets for: {base_name}")
    print("="*60)
    
    # Load chapter data for original video timing
    chapters_file = directory / f"{base_name}_chapters.json"
    chapters_data = load_json_file(chapters_file)
    if not chapters_data:
        print("✗ Chapter data not found")
        return None
    
    # Check for main video file
    video_file = directory / f"{base_name}.mp4"
    if not video_file.exists():
        print(f"✗ Video file not found: {video_file}")
        return None
    
    # Get video duration
    video_duration = get_video_duration(video_file)
    if not video_duration:
        print("✗ Could not get video duration")
        return None
    
    # Analyze chapter audio files
    chapter_audio = []
    total_audio_duration = 0
    
    for i in range(1, 10):  # Check for up to 9 chapters
        audio_file = directory / f"{base_name}_{i}.wav"
        if audio_file.exists():
            duration = get_audio_duration(audio_file)
            if duration:
                chapter_audio.append({
                    'index': i,
                    'file': f"{base_name}_{i}.wav",
                    'duration': duration
                })
                total_audio_duration += duration
                print(f"Chapter {i}: {duration:.1f}s ({audio_file.name})")
            else:
                print(f"✗ Could not get duration for Chapter {i}")
        else:
            break  # No more chapters
    
    if not chapter_audio:
        print("✗ No chapter audio files found")
        return None
    
    # Check for music and b-roll files
    broll_music = directory / "b-roll.mp3"
    broll_video = directory / "b-roll.mp4"
    background_music = directory / "background.mp3"
    
    broll_duration = get_audio_duration(broll_music) if broll_music.exists() else None
    broll_video_duration = get_video_duration(broll_video) if broll_video.exists() else None
    background_duration = get_audio_duration(background_music) if background_music.exists() else None
    
    if not broll_music.exists():
        print("✗ b-roll.mp3 not found")
        return None
    if not broll_video.exists():
        print("✗ b-roll.mp4 not found")
        return None
    if not background_music.exists():
        print("✗ background.mp3 not found")
        return None
    
    print(f"\nMusic and b-roll files:")
    print(f"  - b-roll.mp3: {broll_duration:.1f}s")
    print(f"  - b-roll.mp4: {broll_video_duration:.1f}s")
    print(f"  - background.mp3: {background_duration:.1f}s")
    
    # Calculate timing structure
    broll_intro_duration = 10  # seconds
    broll_outro_duration = 8   # seconds
    chapter_gap = 0.5          # seconds between chapters
    
    # Calculate chapter timing with gaps
    chapter_timing = []
    current_time = broll_intro_duration  # Start after b-roll intro
    
    for i, chapter in enumerate(chapter_audio):
        chapter_start = current_time
        chapter_duration = chapter['duration']
        chapter_end = chapter_start + chapter_duration
        
        chapter_timing.append({
            'index': chapter['index'],
            'file': chapter['file'],
            'start_time': chapter_start,
            'duration': chapter_duration,
            'end_time': chapter_end
        })
        
        current_time = chapter_end + chapter_gap  # Add gap after chapter
    
    # Remove gap after last chapter
    total_content_duration = current_time - chapter_gap
    total_video_duration = total_content_duration + broll_outro_duration
    
    assets_analysis = {
        'base_name': base_name,
        'video_file': f"{base_name}.mp4",
        'original_video_duration': video_duration,
        'chapters_data': chapters_data,
        'chapter_audio': chapter_audio,
        'chapter_timing': chapter_timing,
        'total_audio_duration': total_audio_duration,
        'music': {
            'broll': 'b-roll.mp3',
            'broll_video': 'b-roll.mp4',
            'background': 'background.mp3',
            'broll_duration': broll_duration,
            'broll_video_duration': broll_video_duration,
            'background_duration': background_duration
        },
        'timing': {
            'broll_intro': broll_intro_duration,
            'broll_outro': broll_outro_duration,
            'chapter_gap': chapter_gap,
            'total_content': total_content_duration,
            'total_video': total_video_duration
        }
    }
    
    print(f"\nTiming Analysis:")
    print(f"  - B-roll intro: {broll_intro_duration}s")
    print(f"  - Main content: {total_content_duration - broll_intro_duration:.1f}s")
    print(f"  - B-roll outro: {broll_outro_duration}s")
    print(f"  - Total video: {total_video_duration:.1f}s")
    
    return assets_analysis

def create_shotstack_timeline(assets, uploaded_urls):
    """Create Shotstack timeline JSON."""
    timeline = {
        "background": "#000000",
        "tracks": []
    }
    
    # Fade configuration (used for both audio and video transitions)
    fade_duration = 1.0  # seconds - configurable fade time
    fade_type = "fade" if fade_duration <= 1.0 else "fadeSlow"  # Use appropriate fade type
    fade_overlap = fade_duration + 0.5  # Extra overlap to ensure audio fade completes
    
    # Add soundtrack if background music was successfully uploaded
    if "background.mp3" in uploaded_urls:
        timeline["soundtrack"] = {
            "src": uploaded_urls["background.mp3"],
            "effect": "fadeIn",
            "volume": 0.3  # Increased to 30% volume so it's more audible behind voice
        }
    
    # Video track
    video_track = {"clips": []}
    
    # B-roll intro (10 seconds) if b-roll video was uploaded
    current_start_time = 0
    if "b-roll.mp4" in uploaded_urls:
        broll_video_duration = assets['music']['broll_video_duration']
        needed_intro_duration = assets['timing']['broll_intro']
        
        # B-roll should extend for transition duration (e.g., 10s + 1s fade = 11s total)
        total_broll_time = needed_intro_duration + fade_duration
        
        if broll_video_duration >= total_broll_time:
            # B-roll is long enough, use it normally
            video_track["clips"].append({
                "asset": {
                    "type": "video",
                    "src": uploaded_urls["b-roll.mp4"],
                    "trim": 0,
                    "volume": 0  # Disable b-roll video audio (we use separate b-roll.mp3)
                },
                "start": 0,
                "length": total_broll_time,
                "transition": {
                    "in": "fade",
                    "out": "fade"  # Fade out during the last fade_duration seconds
                }
            })
        else:
            # B-roll is too short, use available video + freeze frame last frame
            # First clip: use all available b-roll video
            video_track["clips"].append({
                "asset": {
                    "type": "video",
                    "src": uploaded_urls["b-roll.mp4"],
                    "trim": 0,
                    "volume": 0  # Disable b-roll video audio (we use separate b-roll.mp3)
                },
                "start": 0,
                "length": broll_video_duration,
                "transition": {
                    "in": "fade",
                    "out": "none"  # No fade out, continue with freeze frame
                }
            })
            
            # Second clip: freeze frame the last frame for remaining time
            freeze_duration = total_broll_time - broll_video_duration
            if freeze_duration > 0:
                video_track["clips"].append({
                    "asset": {
                        "type": "video",
                        "src": uploaded_urls["b-roll.mp4"],
                        "trim": broll_video_duration - 0.1,  # Start from near the end (last frame)
                        "volume": 0  # Disable b-roll video audio (we use separate b-roll.mp3)
                    },
                    "start": broll_video_duration,
                    "length": freeze_duration,
                    "transition": {
                        "in": "none",
                        "out": "fade"  # Fade out during transition
                    }
                })
        
        current_start_time = needed_intro_duration
    
    # Main content video with freeze frames (only if main video was uploaded)
    if f"{assets['base_name']}.mp4" in uploaded_urls:
        original_chapters = assets['chapters_data']['chapters']
        
        for i, chapter_audio in enumerate(assets['chapter_audio']):
            chapter_index = chapter_audio['index'] - 1  # Convert to 0-based
            
            if chapter_index < len(original_chapters):
                original_chapter = original_chapters[chapter_index]
                original_start = original_chapter['start_time']
                original_duration = original_chapter['end_time'] - original_chapter['start_time']
                
                # Use audio duration to match the voice, add dissolve transitions
                needed_duration = chapter_audio['duration']
                
                # For smooth transitions between chapters
                if i == 0:
                    # First chapter - starts at intro end time, overlaps with b-roll fade
                    clip_start = current_start_time
                    clip_length = needed_duration + (fade_duration if i < len(assets['chapter_audio']) - 1 else 0)
                    transition_in = "fade"  # Fade in during b-roll fade out
                    transition_out = "fade" if i < len(assets['chapter_audio']) - 1 else "fade"
                else:
                    # Subsequent chapters - start earlier for overlap with previous chapter
                    clip_start = current_start_time - fade_duration
                    clip_length = needed_duration + (fade_duration if i < len(assets['chapter_audio']) - 1 else 0)
                    transition_in = "fade"
                    transition_out = "fade" if i < len(assets['chapter_audio']) - 1 else "fade"
                
                video_track["clips"].append({
                    "asset": {
                        "type": "video",
                        "src": uploaded_urls[f"{assets['base_name']}.mp4"],
                        "trim": original_start,
                        "volume": 0  # Disable original video audio
                    },
                    "start": clip_start,
                    "length": clip_length,
                    "transition": {
                        "in": transition_in,
                        "out": transition_out
                    }
                })
                
                current_start_time += needed_duration  # Move to next chapter position
    
    # B-roll outro (8 seconds) if b-roll video was uploaded
    if "b-roll.mp4" in uploaded_urls:
        # Calculate outro start time - start earlier for smooth transition overlap
        outro_start_time = current_start_time - fade_duration
        broll_video_duration = assets['music']['broll_video_duration']
        needed_outro_duration = assets['timing']['broll_outro']
        
        if broll_video_duration >= needed_outro_duration:
            # B-roll is long enough, use normally (start from beginning for outro)
            video_track["clips"].append({
                "asset": {
                    "type": "video",
                    "src": uploaded_urls["b-roll.mp4"],
                    "trim": 0,  # Start from beginning for outro
                    "volume": 0  # Disable b-roll video audio (we use separate b-roll.mp3)
                },
                "start": outro_start_time,
                "length": needed_outro_duration,
                "transition": {
                    "in": "fade",
                    "out": "fade"
                }
            })
        else:
            # B-roll is too short, loop it to fill the outro time
            loops_needed = int(needed_outro_duration / broll_video_duration) + 1
            current_clip_start = outro_start_time
            
            for i in range(loops_needed):
                clip_length = min(broll_video_duration, needed_outro_duration - (current_clip_start - outro_start_time))
                if clip_length <= 0:
                    break
                    
                video_track["clips"].append({
                    "asset": {
                        "type": "video",
                        "src": uploaded_urls["b-roll.mp4"],
                        "trim": 0,
                        "volume": 0  # Disable b-roll video audio (we use separate b-roll.mp3)
                    },
                    "start": current_clip_start,
                    "length": clip_length,
                    "transition": {
                        "in": "fade" if i == 0 else "none",
                        "out": "none" if current_clip_start + clip_length < outro_start_time + needed_outro_duration else "fade"
                    }
                })
                current_clip_start += clip_length
    
    timeline["tracks"].append(video_track)
    
    # Audio tracks
    audio_track = {"clips": []}
    
    # B-roll music (intro) if available
    current_audio_start = 0
    if "b-roll.mp3" in uploaded_urls:
        intro_length = assets['timing']['broll_intro'] + fade_overlap  # Extend by fade + overlap
        
        audio_track["clips"].append({
            "asset": {
                "type": "audio",
                "src": uploaded_urls["b-roll.mp3"],
                "trim": 0,
                "volume": 0.8  # 80% volume for b-roll music
            },
            "start": 0,
            "length": intro_length,
            "transition": {
                "out": fade_type
            }
        })
        current_audio_start = assets['timing']['broll_intro']
    
    # Chapter audio clips (voice - only add if successfully uploaded)
    for chapter_audio in assets['chapter_audio']:
        if chapter_audio['file'] in uploaded_urls:
            audio_track["clips"].append({
                "asset": {
                    "type": "audio",
                    "src": uploaded_urls[chapter_audio['file']]
                },
                "start": current_audio_start,
                "length": chapter_audio['duration']
            })
            current_audio_start += chapter_audio['duration'] + 0.5  # Add gap between audio chapters
        else:
            print(f"    ⚠ Skipping audio for {chapter_audio['file']} (upload failed)")
    
    # B-roll music (outro) if available
    if "b-roll.mp3" in uploaded_urls:
        # Calculate outro timing with proper fade overlap
        outro_length = assets['timing']['broll_outro'] + fade_overlap  # Extend by fade + overlap
        outro_audio_start = current_audio_start - fade_overlap  # Start earlier to ensure smooth overlap
        
        # Use end portion of b-roll track, ensuring enough duration for outro + fade
        broll_outro_start = assets['music']['broll_duration'] - outro_length
        
        # Ensure we don't go negative (if b-roll music is too short)
        if broll_outro_start < 0:
            broll_outro_start = 0
            outro_length = min(outro_length, assets['music']['broll_duration'])
        
        audio_track["clips"].append({
            "asset": {
                "type": "audio", 
                "src": uploaded_urls["b-roll.mp3"],
                "trim": broll_outro_start,
                "volume": 0.8  # 80% volume for b-roll music
            },
            "start": outro_audio_start,
            "length": outro_length,
            "transition": {
                "in": fade_type
            }
        })
    
    timeline["tracks"].append(audio_track)
    
    return timeline

def upload_file_to_shotstack(config, file_path, filename):
    """Upload a single file to Shotstack using signed URL and ingest it."""
    try:
        # Step 1: Request signed URL for upload
        headers = {
            'x-api-key': config["api_key"],
            'Accept': 'application/json'
        }
        
        upload_request_url = f"{config['base_url'].replace('/stage', '/ingest/stage')}/upload"
        
        print(f"    Requesting upload URL for {filename}...")
        response = requests.post(upload_request_url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"    ✗ Failed to get upload URL: {response.status_code} - {response.text}")
            return None
        
        upload_data = response.json()
        upload_url = upload_data['data']['attributes']['url']
        
        # Step 2: Upload file using PUT request (S3 signed URL)
        print(f"    Uploading file...")
        
        with open(file_path, 'rb') as f:
            upload_response = requests.put(upload_url, data=f, timeout=300)
            
            if upload_response.status_code not in [200, 201, 204]:
                print(f"    ✗ Upload failed: {upload_response.status_code} - {upload_response.text}")
                return None
        
        # Step 3: Create source using ingestion API 
        print(f"    Processing with ingestion API...")
        uploaded_s3_url = upload_url.split('?')[0]
        
        ingest_headers = {
            'x-api-key': config["api_key"],
            'Content-Type': 'application/json'
        }
        
        ingest_payload = {
            "url": uploaded_s3_url
        }
        
        ingest_url = f"{config['base_url'].replace('/stage', '/ingest/stage')}/sources"
        ingest_response = requests.post(ingest_url, headers=ingest_headers, json=ingest_payload, timeout=30)
        
        if ingest_response.status_code not in [200, 201]:
            print(f"    ✗ Ingestion failed: {ingest_response.status_code} - {ingest_response.text}")
            return None
        
        ingest_data = ingest_response.json()
        source_id = ingest_data['data']['id']
        
        print(f"    ✓ Source created: {source_id}")
        print(f"    Waiting for ingestion to complete...")
        
        # Poll the source status until ingestion is complete
        max_attempts = 60  # Wait up to 5 minutes
        for attempt in range(max_attempts):
            status_url = f"{config['base_url'].replace('/stage', '/ingest/stage')}/sources/{source_id}"
            status_response = requests.get(status_url, headers=ingest_headers, timeout=10)
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                status = status_data['data']['attributes']['status']
                
                if status == 'ready':
                    source_url = status_data['data']['attributes']['source']
                    print(f"    ✓ Ingestion complete: {source_url}")
                    return source_url
                elif status == 'failed':
                    error_msg = status_data['data']['attributes'].get('error', 'Unknown error')
                    print(f"    ✗ Ingestion failed: {error_msg}")
                    return None
                else:
                    if attempt % 6 == 0:  # Print status every 30 seconds
                        print(f"    Status: {status} ({attempt * 5}s elapsed)")
            
            time.sleep(5)
        
        print(f"    ✗ Ingestion timed out after {max_attempts * 5} seconds")
        return None
                
    except Exception as e:
        print(f"    ✗ Error uploading {filename}: {e}")
        return None

def upload_assets_to_shotstack(config, assets, directory):
    """Upload all assets to Shotstack."""
    print("\nUploading assets to Shotstack...")
    
    # List of files to upload
    files_to_upload = [
        f"{assets['base_name']}.mp4",
        "b-roll.mp3",
        "b-roll.mp4",
        "background.mp3"
    ]
    
    # Add chapter audio files
    for chapter in assets['chapter_audio']:
        files_to_upload.append(chapter['file'])
    
    uploaded_urls = {}
    
    for filename in files_to_upload:
        file_path = directory / filename
        if file_path.exists():
            print(f"  Uploading {filename}...")
            
            uploaded_url = upload_file_to_shotstack(config, file_path, filename)
            if uploaded_url:
                uploaded_urls[filename] = uploaded_url
            else:
                print(f"    ⚠ Failed to upload {filename}, continuing with other files...")
                # Continue with other files instead of failing completely
        else:
            print(f"    ✗ File not found: {filename}")
            # Continue with other files instead of failing completely
    
    if not uploaded_urls:
        print("✗ No files were successfully uploaded")
        return None
    
    return uploaded_urls

def render_video(config, timeline, assets):
    """Submit video render to Shotstack."""
    try:
        headers = {
            'x-api-key': config["api_key"],
            'Content-Type': 'application/json'
        }
        
        render_data = {
            "timeline": timeline,
            "output": {
                "format": "mp4",
                "aspectRatio": "16:9",
                "size": {
                    "width": 1920,
                    "height": 1080
                }
            }
        }
        
        print(f"\nSubmitting render to Shotstack...")
        
        response = requests.post(
            f"{config['base_url']}/render",
            headers=headers,
            json=render_data,
            timeout=30
        )
        
        if response.status_code == 201:
            result = response.json()
            render_id = result['response']['id']
            print(f"✓ Render submitted successfully!")
            print(f"  Render ID: {render_id}")
            return render_id
        else:
            print(f"✗ Error submitting render: {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Error submitting render: {e}")
        return None

def check_render_status(config, render_id, max_wait_minutes=10):
    """Check render status and wait for completion."""
    print(f"\nChecking render status...")
    
    headers = {
        'x-api-key': config["api_key"],
        'Content-Type': 'application/json'
    }
    
    max_attempts = max_wait_minutes * 12  # Check every 5 seconds
    
    for attempt in range(max_attempts):
        try:
            response = requests.get(
                f"{config['base_url']}/render/{render_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                status = result['response']['status']
                
                if status == 'done':
                    download_url = result['response']['url']
                    print(f"✓ Render completed!")
                    print(f"  Download URL: {download_url}")
                    return download_url
                    
                elif status == 'failed':
                    error = result['response'].get('error', 'Unknown error')
                    print(f"✗ Render failed: {error}")
                    return None
                    
                else:
                    if attempt % 12 == 0:  # Print status every minute
                        progress = result['response'].get('data', {}).get('progress', 0)
                        print(f"  Status: {status} ({progress}% complete) - {attempt//12 + 1}/{max_wait_minutes} minutes")
            
            time.sleep(5)
            
        except Exception as e:
            print(f"  Error checking status: {e}")
            time.sleep(5)
    
    print(f"✗ Render timed out after {max_wait_minutes} minutes")
    return None

def download_final_video(download_url, output_file):
    """Download the final rendered video."""
    try:
        print(f"\nDownloading final video...")
        
        response = requests.get(download_url, timeout=300)  # 5 minute timeout
        
        if response.status_code == 200:
            with open(output_file, 'wb') as f:
                f.write(response.content)
            print(f"✓ Video downloaded: {output_file}")
            return True
        else:
            print(f"✗ Download failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error downloading video: {e}")
        return False

def process_video_creation(base_name, directory):
    """Process complete video creation."""
    print(f"Creating video for: {base_name}")
    print("="*60)
    
    # Analyze assets
    assets = analyze_video_assets(base_name, directory)
    if not assets:
        return False
    
    # Setup Shotstack
    config = setup_shotstack_config()
    
    # Upload assets to Shotstack
    uploaded_urls = upload_assets_to_shotstack(config, assets, directory)
    if not uploaded_urls:
        print("✗ Failed to upload assets")
        return False
    
    # Create timeline
    timeline = create_shotstack_timeline(assets, uploaded_urls)
    
    # Save timeline for review
    timeline_file = directory / f"{base_name}_shotstack_timeline.json"
    try:
        with open(timeline_file, 'w') as f:
            json.dump(timeline, f, indent=2)
        print(f"✓ Timeline saved: {timeline_file}")
    except Exception as e:
        print(f"✗ Error saving timeline: {e}")
    
    # Render video
    render_id = render_video(config, timeline, assets)
    if not render_id:
        return False
    
    # Wait for completion
    download_url = check_render_status(config, render_id)
    if not download_url:
        return False
    
    # Download final video
    output_file = directory / f"{base_name}_final_video.mp4"
    success = download_final_video(download_url, output_file)
    
    if success:
        print(f"\n" + "="*60)
        print("VIDEO CREATION COMPLETED!")
        print("="*60)
        print(f"Final video: {output_file}")
        print(f"Duration: {assets['timing']['total_video']:.1f} seconds")
        print(f"Chapters: {len(assets['chapter_audio'])}")
    
    return success

def find_base_names(directory):
    """Find all base names that have all required assets."""
    directory_path = Path(directory)
    base_names = []
    
    # Look for video files with matching audio chapters
    for video_file in directory_path.glob("*.mp4"):
        base_name = video_file.stem
        
        # Check if has chapter audio files
        has_chapters = False
        for i in range(1, 4):  # Check for at least 1 chapter
            audio_file = directory_path / f"{base_name}_{i}.wav"
            if audio_file.exists():
                has_chapters = True
                break
        
        # Check if has music and b-roll files
        broll_music = directory_path / "b-roll.mp3"
        broll_video = directory_path / "b-roll.mp4"
        background_music = directory_path / "background.mp3"
        
        if has_chapters and broll_music.exists() and broll_video.exists() and background_music.exists():
            base_names.append(base_name)
    
    return sorted(base_names)

def main():
    """Main function."""
    if len(sys.argv) != 2:
        print("Usage: python 9_create_shotstack_video.py <directory>")
        print("Example: python 9_create_shotstack_video.py temp-assets/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    
    if not directory.exists() or not directory.is_dir():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    # Find files to process
    base_names = find_base_names(directory)
    
    if not base_names:
        print(f"✗ No complete video projects found in: {directory}")
        print("Required files:")
        print("  - {name}.mp4 (original video)")
        print("  - {name}_1.wav, {name}_2.wav, etc. (chapter audio)")
        print("  - b-roll.mp3 (intro/outro music)")
        print("  - b-roll.mp4 (intro/outro video)")
        print("  - background.mp3 (voice-over background music)")
        sys.exit(1)
    
    print(f"Found {len(base_names)} complete video project(s)")
    print("Projects:")
    for name in base_names:
        print(f"  - {name}")
    print()
    
    # Process each project
    successful_projects = []
    failed_projects = []
    
    for base_name in base_names:
        success = process_video_creation(base_name, directory)
        
        if success:
            successful_projects.append(base_name)
        else:
            failed_projects.append(base_name)
        
        print()
    
    # Final summary
    print("="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"Total projects processed: {len(base_names)}")
    print(f"Successful: {len(successful_projects)}")
    print(f"Failed: {len(failed_projects)}")
    
    if successful_projects:
        print("\n✓ Successfully created:")
        for project in successful_projects:
            print(f"  - {project}_final_video.mp4")
    
    if failed_projects:
        print("\n✗ Failed to create:")
        for project in failed_projects:
            print(f"  - {project}")

if __name__ == "__main__":
    main()