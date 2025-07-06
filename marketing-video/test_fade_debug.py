#!/usr/bin/env python3
"""
Debug fade transitions - simplified test
"""

import subprocess
from pathlib import Path

def test_simple_fade():
    """Test basic fade functionality."""
    
    b_roll_music = Path("assets/music/top-b-roll/ES_Spaghetti on the Island - Thompson Town Flowers.mp3")
    output_file = Path("current-project/temp/fade_debug.wav")
    
    # Test parameters similar to our real scenario
    total_duration = 20.0
    broll_volume = 0.8
    fade_duration = 3.0
    fadeout_start = 8.0  # Start fade at 8s
    fadein_start = 15.0  # Fade back in at 15s
    
    # Simple test: B-roll with fadeout and fadein
    filter_complex = f"""
    [0:a]aloop=loop=-1:size=2e+09,atrim=duration={total_duration},volume={broll_volume}[broll_base];
    [broll_base]afade=t=out:st={fadeout_start}:d={fade_duration}[broll_fadeout];
    [broll_fadeout]afade=t=in:st={fadein_start}:d={fade_duration}[out]
    """
    
    cmd = [
        'ffmpeg', 
        '-i', str(b_roll_music),
        '-filter_complex', filter_complex,
        '-map', '[out]',
        '-t', str(total_duration),
        '-y', str(output_file)
    ]
    
    print("Testing fade transitions...")
    print(f"Expected: Full volume 0-8s, fade out 8-11s, silence 11-15s, fade in 15-18s, full volume 18-20s")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Test completed: {output_file}")
            print("Listen to this file to verify fade behavior")
        else:
            print(f"✗ Test failed: {result.stderr}")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    test_simple_fade()