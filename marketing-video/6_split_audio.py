#!/usr/bin/env python3
"""
Step 6: Split Audio into Chapters
- Divide a-roll.wav into chapter segments based on timing data
"""

import sys
import json
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Run command with error handling."""
    try:
        print(f"  {description}...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print(f"  ✓ {description} completed")
            return True
        else:
            print(f"  ✗ {description} failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Error in {description}: {e}")
        return False

def split_audio_file(a_roll_file, timing_data, temp_dir):
    """Split audio file into chapters."""
    chapter_timings = timing_data['chapter_timings']
    chapter_files = []
    
    for timing in chapter_timings:
        chapter_num = timing['chapter']
        start_time = timing['start_time']
        duration = timing['duration']
        
        chapter_file = temp_dir / f"chapter_{chapter_num}.wav"
        
        cmd = [
            'ffmpeg', '-i', str(a_roll_file),
            '-ss', str(start_time), '-t', str(duration),
            '-c', 'copy', '-y', str(chapter_file)
        ]
        
        if run_command(cmd, f"Creating chapter {chapter_num} audio ({duration:.1f}s)"):
            chapter_files.append(chapter_file)
        else:
            return None
    
    return chapter_files

def main():
    if len(sys.argv) != 2:
        print("Usage: python 6_split_audio.py <directory>")
        print("Example: python 6_split_audio.py temp-assets/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    temp_dir = directory / "temp"
    if not temp_dir.exists():
        print(f"✗ Temp directory not found: {temp_dir}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    # Check required files
    a_roll_file = directory / "a-roll.wav"  # Manual file stays in main dir
    timing_file = temp_dir / "audio_timing.json"
    
    if not a_roll_file.exists():
        print(f"✗ Audio file not found: {a_roll_file}")
        print("Generate voice using Resemble.ai and save as 'a-roll.wav'")
        sys.exit(1)
    
    if not timing_file.exists():
        print(f"✗ Timing file not found: {timing_file}")
        print("Run step 5 first: python 5_audio_timing.py temp-assets/")
        sys.exit(1)
    
    print("Step 6: Split Audio into Chapters")
    print("=" * 50)
    
    # Load timing data
    with open(timing_file, 'r') as f:
        timing_data = json.load(f)
    
    print(f"Processing: {a_roll_file.name}")
    print(f"Splitting into {len(timing_data['chapter_timings'])} chapters")
    
    # Split audio
    chapter_files = split_audio_file(a_roll_file, timing_data, temp_dir)
    if not chapter_files:
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("STEP 6 COMPLETED!")
    print("=" * 50)
    print("Created files:")
    for chapter_file in chapter_files:
        print(f"  ✓ {chapter_file.name}")
    
    print(f"\nNext: python 7_match_video_timing.py {directory}/")

if __name__ == "__main__":
    main()