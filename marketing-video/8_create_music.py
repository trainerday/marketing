#!/usr/bin/env python3
"""
Step 8: Create Music Track
- Simple background music preparation
- Future: Advanced audio level mixing
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

def get_total_video_duration(timing_data):
    """Calculate total video duration needed."""
    # B-roll intro (10s) + chapters + B-roll outro (10s)
    chapter_timings = timing_data['chapter_timings']
    total_chapter_duration = sum(timing['duration'] + 1.0 for timing in chapter_timings)  # +1s each for video extension
    
    broll_intro_duration = 10.0
    broll_outro_duration = 10.0
    
    total_duration = broll_intro_duration + total_chapter_duration + broll_outro_duration
    return total_duration

def create_background_music(music_source, total_duration, output_file):
    """Create background music track for full video duration."""
    
    # First check if we have a music source
    if not music_source.exists():
        print(f"  ⚠ Music source not found: {music_source}")
        print(f"  Please download background music from Epidemic Sound")
        print(f"  Save as: {music_source}")
        return False
    
    # Create background music track at low volume for full duration
    cmd = [
        'ffmpeg', '-i', str(music_source),
        '-filter_complex', f'[0:a]volume=0.3,atrim=0:{total_duration},aloop=loop=-1:size=2048000000[out]',
        '-map', '[out]', '-t', str(total_duration),
        '-y', str(output_file)
    ]
    
    return run_command(cmd, f"Creating background music track ({total_duration:.1f}s)")

def main():
    if len(sys.argv) != 2:
        print("Usage: python 8_create_music.py <directory>")
        print("Example: python 8_create_music.py temp-assets/")
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
    timing_file = temp_dir / "audio_timing.json"
    
    if not timing_file.exists():
        print(f"✗ Timing file not found: {timing_file}")
        print("Run step 5 first: python 5_audio_timing.py temp-assets/")
        sys.exit(1)
    
    print("Step 8: Create Music Track")
    print("=" * 50)
    
    # Load timing data
    with open(timing_file, 'r') as f:
        timing_data = json.load(f)
    
    # Calculate total duration
    total_duration = get_total_video_duration(timing_data)
    print(f"Total video duration needed: {total_duration:.1f} seconds")
    
    # Look for music source files
    music_sources = [
        directory / "background_music.mp3",
        directory / "background.mp3",
        directory / "music.mp3"
    ]
    
    music_source = None
    for source in music_sources:
        if source.exists():
            music_source = source
            break
    
    if not music_source:
        music_source = music_sources[0]  # Default to background_music.mp3
    
    # Create music track
    background_music_file = temp_dir / "background_music.wav"
    
    if create_background_music(music_source, total_duration, background_music_file):
        print("\n" + "=" * 50)
        print("STEP 8 COMPLETED!")
        print("=" * 50)
        print("Created files:")
        print(f"  ✓ {background_music_file.name}")
        print(f"\nMusic setup:")
        print(f"  Duration: {total_duration:.1f} seconds")
        print(f"  Volume: 30% (background level)")
        print(f"  Source: {music_source.name}")
        print(f"\nNext: python 9_final_assembly.py {directory}/")
    else:
        print("\n" + "=" * 50)
        print("STEP 8 MANUAL SETUP REQUIRED")
        print("=" * 50)
        print("Please download background music:")
        print("1. Go to Epidemic Sound")
        print("2. Search for 'subtle ambient corporate' or similar")
        print(f"3. Download and save as: {music_source}")
        print(f"4. Then re-run: python 8_create_music.py {directory}/")

if __name__ == "__main__":
    main()