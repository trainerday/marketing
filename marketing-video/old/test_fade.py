#!/usr/bin/env python3
"""
Minimal fade test script to debug video transition issues.
Creates a simple 2-clip video to test fade transitions.
"""

import os
import sys
import json
import requests
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_shotstack_config():
    """Setup Shotstack API configuration."""
    stage = os.getenv('SHOTSTACK_STAGE', 'stage')
    
    if stage == 'stage':
        api_key = os.getenv('SHOTSTACK_SANDBOX_API_KEY')
    else:
        api_key = os.getenv('SHOTSTACK_PRODUCTION_API_KEY')
    
    if not api_key:
        print(f"✗ Error: Shotstack {stage} API key not found")
        sys.exit(1)
    
    return {
        'api_key': api_key,
        'stage': stage,
        'base_url': f'https://api.shotstack.io/{stage}'
    }

def create_simple_fade_timeline(video_url1, video_url2):
    """Create a simple 2-clip timeline to test fade transitions."""
    
    # Test different transition combinations
    test_cases = [
        {
            "name": "no_transitions",
            "clip1_out": "none",
            "clip2_in": "none"
        },
        {
            "name": "fade_out_only", 
            "clip1_out": "fade",
            "clip2_in": "none"
        },
        {
            "name": "fade_in_only",
            "clip1_out": "none", 
            "clip2_in": "fade"
        },
        {
            "name": "both_fade",
            "clip1_out": "fade",
            "clip2_in": "fade"
        }
    ]
    
    timelines = {}
    
    for test in test_cases:
        timeline = {
            "background": "#000000",
            "tracks": [
                {
                    "clips": [
                        {
                            "asset": {
                                "type": "video",
                                "src": video_url1,
                                "trim": 0,
                                "volume": 0
                            },
                            "start": 0,
                            "length": 5,  # 5 seconds
                            "transition": {
                                "in": "fade",
                                "out": test["clip1_out"]
                            }
                        },
                        {
                            "asset": {
                                "type": "video", 
                                "src": video_url2,
                                "trim": 0,
                                "volume": 0
                            },
                            "start": 5,  # Start immediately after first clip
                            "length": 5,  # 5 seconds
                            "transition": {
                                "in": test["clip2_in"],
                                "out": "fade"
                            }
                        }
                    ]
                }
            ]
        }
        timelines[test["name"]] = timeline
    
    return timelines

def render_test_video(config, timeline, test_name):
    """Submit test render to Shotstack."""
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
        
        print(f"Submitting {test_name} render...")
        
        response = requests.post(
            f"{config['base_url']}/render",
            headers=headers,
            json=render_data,
            timeout=30
        )
        
        if response.status_code == 201:
            result = response.json()
            render_id = result['response']['id']
            print(f"✓ {test_name} render submitted: {render_id}")
            return render_id
        else:
            print(f"✗ {test_name} render failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Error submitting {test_name} render: {e}")
        return None

def check_render_status(config, render_id, test_name):
    """Check render status and get download URL."""
    print(f"Checking {test_name} status...")
    
    headers = {
        'x-api-key': config["api_key"],
        'Content-Type': 'application/json'
    }
    
    max_attempts = 60  # 5 minutes max wait
    
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
                    print(f"✓ {test_name} completed: {download_url}")
                    return download_url
                    
                elif status == 'failed':
                    error = result['response'].get('error', 'Unknown error')
                    print(f"✗ {test_name} failed: {error}")
                    return None
                    
                else:
                    if attempt % 6 == 0:  # Print every 30 seconds
                        progress = result['response'].get('data', {}).get('progress', 0)
                        print(f"  {test_name}: {status} ({progress}%)")
            
            time.sleep(5)
            
        except Exception as e:
            print(f"  Error checking {test_name}: {e}")
            time.sleep(5)
    
    print(f"✗ {test_name} timed out")
    return None

def main():
    """Run fade transition tests."""
    print("Starting fade transition tests...")
    print("=" * 50)
    
    config = setup_shotstack_config()
    
    # Use the already uploaded video URLs from the previous run
    # (These should still be available in Shotstack)
    video_url1 = "https://shotstack-ingest-api-stage-sources.s3.ap-southeast-2.amazonaws.com/3szy0nl5bd/zzz01jzd-x0wsk-hqa31-1qsgx-e2exer/source.mp4"  # b-roll
    video_url2 = "https://shotstack-ingest-api-stage-sources.s3.ap-southeast-2.amazonaws.com/3szy0nl5bd/zzz01jzd-wzzye-mk23x-eq90a-rwp3jv/source.mp4"  # main video
    
    # Create test timelines
    timelines = create_simple_fade_timeline(video_url1, video_url2)
    
    # Test just one case first - the problematic "both_fade" scenario
    test_name = "both_fade"
    timeline = timelines[test_name]
    
    # Save timeline for inspection
    timeline_file = f"temp-assets/test_{test_name}_timeline.json"
    with open(timeline_file, 'w') as f:
        json.dump(timeline, f, indent=2)
    print(f"✓ Test timeline saved: {timeline_file}")
    
    # Render test video
    render_id = render_test_video(config, timeline, test_name)
    if not render_id:
        return
    
    # Wait for completion
    download_url = check_render_status(config, render_id, test_name)
    if not download_url:
        return
    
    # Download test video
    try:
        print(f"Downloading {test_name} test video...")
        response = requests.get(download_url, timeout=60)
        
        if response.status_code == 200:
            output_file = f"temp-assets/test_{test_name}.mp4"
            with open(output_file, 'wb') as f:
                f.write(response.content)
            print(f"✓ Test video saved: {output_file}")
        else:
            print(f"✗ Download failed: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error downloading: {e}")

if __name__ == "__main__":
    main()