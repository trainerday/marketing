#!/usr/bin/env python3
"""
Step 7: Match Video to Audio Timing
- Extend or trim video chapters to match audio length + 1 second
- Use freeze frame extension or cutting as needed
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

def get_video_duration(video_file):
    """Get video file duration."""
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(video_file)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"✗ Error getting duration: {e}")
    return None

def get_audio_duration(audio_file):
    """Get audio file duration."""
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(audio_file)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"✗ Error getting duration: {e}")
    return None

def match_video_to_audio(chapter_video, chapter_audio, output_file):
    """Match video duration to audio duration + 1 second."""
    video_duration = get_video_duration(chapter_video)
    audio_duration = get_audio_duration(chapter_audio)
    
    if not video_duration or not audio_duration:
        return False
    
    target_duration = audio_duration + 1.0  # Audio + 1 second
    
    print(f"    Video: {video_duration:.1f}s, Audio: {audio_duration:.1f}s, Target: {target_duration:.1f}s")
    
    if video_duration >= target_duration:
        # Video is longer - trim it and add audio
        cmd = [
            'ffmpeg', '-i', str(chapter_video), '-i', str(chapter_audio),
            '-t', str(target_duration),
            '-c:v', 'copy', '-c:a', 'aac', '-y', str(output_file)
        ]
        return run_command(cmd, f"Trimming video to {target_duration:.1f}s and adding audio")
    
    else:
        # Video is shorter - extend with freeze frame and add audio
        freeze_duration = target_duration - video_duration
        
        cmd = [
            'ffmpeg', '-i', str(chapter_video), '-i', str(chapter_audio),
            '-filter_complex', 
            f'[0:v]split[main][freeze]; [freeze]trim=start={video_duration-0.1},setpts=PTS-STARTPTS,loop=loop=-1:size=1:start=0,trim=duration={freeze_duration}[frozen]; [main][frozen]concat=n=2:v=1:a=0[out]',
            '-map', '[out]', '-map', '1:a', '-c:a', 'aac', '-y', str(output_file)
        ]
        return run_command(cmd, f"Extending video with freeze frame (+{freeze_duration:.1f}s) and adding audio")

def process_chapter_videos(chapters_dir, timing_data, temp_dir):
    """Process all chapter videos to match audio timing."""
    chapter_timings = timing_data['chapter_timings']
    timed_videos = []
    
    for timing in chapter_timings:
        chapter_num = timing['chapter']
        
        # Find corresponding files
        chapter_video = chapters_dir / f"chapter_{chapter_num}.mp4"
        chapter_audio = temp_dir / f"chapter_{chapter_num}.wav"
        timed_video = temp_dir / "timed_chapter_videos" / f"chapter_{chapter_num}.mp4"
        
        if not chapter_video.exists():
            print(f"✗ Chapter video not found: {chapter_video}")
            return None
        
        if not chapter_audio.exists():
            print(f"✗ Chapter audio not found: {chapter_audio}")
            return None
        
        # Create output directory
        timed_video.parent.mkdir(exist_ok=True)
        
        # Match video to audio timing
        if match_video_to_audio(chapter_video, chapter_audio, timed_video):
            timed_videos.append(timed_video)
        else:
            return None
    
    return timed_videos

def main():
    if len(sys.argv) != 2:
        print("Usage: python 7_match_video_timing.py <directory>")
        print("Example: python 7_match_video_timing.py temp-assets/")
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
    
    # Check required files and directories
    timing_file = temp_dir / "audio_timing.json"
    chapters_dir = temp_dir / "chapters"
    
    if not timing_file.exists():
        print(f"✗ Timing file not found: {timing_file}")
        print("Run step 5 first: python 5_audio_timing.py temp-assets/")
        sys.exit(1)
    
    if not chapters_dir.exists():
        print(f"✗ Chapters directory not found: {chapters_dir}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    print("Step 7: Match Video to Audio Timing")
    print("=" * 50)
    
    # Load timing data
    with open(timing_file, 'r') as f:
        timing_data = json.load(f)
    
    print(f"Processing {len(timing_data['chapter_timings'])} chapters")
    
    # Process videos
    timed_videos = process_chapter_videos(chapters_dir, timing_data, temp_dir)
    if not timed_videos:
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("STEP 7 COMPLETED!")
    print("=" * 50)
    print("Created files in timed_chapter_videos/:")
    for video_file in timed_videos:
        print(f"  ✓ {video_file.name}")
    
    print(f"\nNext: python 8_create_final_audio.py {directory}/")

if __name__ == "__main__":
    main()