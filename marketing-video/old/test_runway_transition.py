#!/usr/bin/env python3
"""
Test Runway API with simple b-roll to a-roll transition.
Creates a 10-second video: 5s b-roll + 5s main content with 1s crossfade.
"""

import os
import sys
import json
import requests
import time
from pathlib import Path

def upload_file_to_runway(api_key, file_path, filename):
    """Upload a file to Runway ML."""
    try:
        print(f"  Uploading {filename} to Runway...")
        
        # Step 1: Get upload URL  
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Runway-Version': '2024-09-13'
        }
        
        upload_request = {
            "filename": filename,
            "use": "input"
        }
        
        response = requests.post(
            "https://api.runwayml.com/v1/uploads",
            headers=headers,
            json=upload_request,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"    ✗ Failed to get upload URL: {response.status_code} - {response.text}")
            return None
        
        upload_data = response.json()
        upload_url = upload_data['url']
        asset_id = upload_data['id']
        
        # Step 2: Upload file to the signed URL
        print(f"    Uploading file data...")
        with open(file_path, 'rb') as f:
            upload_response = requests.put(upload_url, data=f, timeout=300)
            
            if upload_response.status_code not in [200, 201, 204]:
                print(f"    ✗ Upload failed: {upload_response.status_code}")
                return None
        
        print(f"    ✓ Upload complete: {asset_id}")
        return asset_id
        
    except Exception as e:
        print(f"    ✗ Error uploading {filename}: {e}")
        return None

def create_runway_timeline(broll_asset_id, aroll_asset_id):
    """Create a simple timeline with crossfade transition."""
    
    timeline = {
        "tracks": [
            {
                "type": "video",
                "clips": [
                    {
                        "asset_id": broll_asset_id,
                        "start": 0,
                        "end": 6,  # 6 seconds (5s + 1s overlap)
                        "asset_start": 0,
                        "asset_end": 5,  # Use first 5 seconds of b-roll
                        "transitions": {
                            "out": {
                                "type": "crossfade",
                                "duration": 1.0
                            }
                        }
                    },
                    {
                        "asset_id": aroll_asset_id,
                        "start": 5,  # Start 1s before b-roll ends
                        "end": 10,   # Total 10 seconds
                        "asset_start": 0,
                        "asset_end": 5,  # Use first 5 seconds of a-roll
                        "transitions": {
                            "in": {
                                "type": "crossfade", 
                                "duration": 1.0
                            }
                        }
                    }
                ]
            }
        ],
        "duration": 10
    }
    
    return timeline

def render_runway_video(api_key, timeline):
    """Submit video render to Runway."""
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Runway-Version': '2024-09-13'
        }
        
        render_data = {
            "timeline": timeline,
            "output": {
                "format": "mp4",
                "resolution": "1920x1080",
                "fps": 30
            }
        }
        
        print(f"Submitting render to Runway...")
        
        response = requests.post(
            "https://api.runwayml.com/v1/video/render",
            headers=headers,
            json=render_data,
            timeout=30
        )
        
        if response.status_code == 201:
            result = response.json()
            render_id = result['id']
            print(f"✓ Render submitted: {render_id}")
            return render_id
        else:
            print(f"✗ Error submitting render: {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Error submitting render: {e}")
        return None

def check_runway_render_status(api_key, render_id):
    """Check render status and wait for completion."""
    print(f"Checking render status...")
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Runway-Version': '2024-09-13'
    }
    
    max_attempts = 120  # 10 minutes max wait
    
    for attempt in range(max_attempts):
        try:
            response = requests.get(
                f"https://api.runwayml.com/v1/video/render/{render_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                status = result['status']
                
                if status == 'completed':
                    download_url = result['output']['url']
                    print(f"✓ Render completed!")
                    print(f"  Download URL: {download_url}")
                    return download_url
                    
                elif status == 'failed':
                    error = result.get('error', 'Unknown error')
                    print(f"✗ Render failed: {error}")
                    return None
                    
                else:
                    if attempt % 6 == 0:  # Print every 30 seconds
                        progress = result.get('progress', 0)
                        print(f"  Status: {status} ({progress}% complete)")
            
            time.sleep(5)
            
        except Exception as e:
            print(f"  Error checking status: {e}")
            time.sleep(5)
    
    print(f"✗ Render timed out after 10 minutes")
    return None

def download_video(download_url, output_file):
    """Download the final rendered video."""
    try:
        print(f"Downloading video...")
        
        response = requests.get(download_url, timeout=300)
        
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

def main():
    """Test Runway transition."""
    print("Testing Runway API transition...")
    print("=" * 50)
    
    api_key = "key_88df1b0b07eda2b6544130b256d85d26525aa8a0502181884a6463a153a7b2f1f7f85a71766f8f605366835fa97cbebf64306ed4fe03a1dd3453811c4ca55681"
    
    # File paths
    temp_dir = Path("temp-assets")
    broll_file = temp_dir / "b-roll.mp4"
    aroll_file = temp_dir / "1.mp4"  # Main video file
    
    if not broll_file.exists():
        print(f"✗ B-roll file not found: {broll_file}")
        return
    
    if not aroll_file.exists():
        print(f"✗ A-roll file not found: {aroll_file}")
        return
    
    # Upload files
    print("Uploading assets...")
    broll_asset_id = upload_file_to_runway(api_key, broll_file, "b-roll.mp4")
    if not broll_asset_id:
        print("✗ Failed to upload b-roll")
        return
    
    aroll_asset_id = upload_file_to_runway(api_key, aroll_file, "main-video.mp4")
    if not aroll_asset_id:
        print("✗ Failed to upload a-roll")
        return
    
    # Create timeline
    timeline = create_runway_timeline(broll_asset_id, aroll_asset_id)
    
    # Save timeline for inspection
    timeline_file = temp_dir / "runway_test_timeline.json"
    with open(timeline_file, 'w') as f:
        json.dump(timeline, f, indent=2)
    print(f"✓ Timeline saved: {timeline_file}")
    
    # Render video
    render_id = render_runway_video(api_key, timeline)
    if not render_id:
        return
    
    # Wait for completion
    download_url = check_runway_render_status(api_key, render_id)
    if not download_url:
        return
    
    # Download final video
    output_file = temp_dir / "runway_transition_test.mp4"
    success = download_video(download_url, output_file)
    
    if success:
        print(f"\n" + "=" * 50)
        print("RUNWAY TEST COMPLETED!")
        print("=" * 50)
        print(f"Test video: {output_file}")
        print(f"Duration: 10 seconds")
        print(f"Transition: 1s crossfade at 5-6s mark")

if __name__ == "__main__":
    main()