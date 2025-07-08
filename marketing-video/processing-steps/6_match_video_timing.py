#!/usr/bin/env python3
"""
Step 6: Match Video to Audio Timing
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
    """Match video duration to audio duration (video-only output)."""
    video_duration = get_video_duration(chapter_video)
    audio_duration = get_audio_duration(chapter_audio)
    
    if not video_duration or not audio_duration:
        return False
    
    print(f"    Video: {video_duration:.1f}s, Audio: {audio_duration:.1f}s")
    
    # Create video-only file matching audio duration (no audio track)
    # If video is shorter, extend with freeze frame; if longer, trim to audio duration
    if video_duration < audio_duration:
        # Extend video with freeze frame (hold last frame) to match audio duration
        extension_duration = audio_duration - video_duration
        temp_frame = output_file.parent / f"temp_lastframe_{output_file.stem}.png"
        temp_freeze_video = output_file.parent / f"temp_freeze_{output_file.stem}.mov"
        
        # Extract frame from ~20 frames before the end (to avoid black frames)
        frame_time = max(0, video_duration - (20/30))  # 20 frames at 30fps = 0.67s before end
        extract_cmd = [
            'ffmpeg', '-ss', str(frame_time), '-i', str(chapter_video),
            '-vframes', '1', '-q:v', '1', '-y', str(temp_frame)
        ]
        
        if not run_command(extract_cmd, "Extracting last frame"):
            return False
        
        # Create freeze frame video
        freeze_cmd = [
            'ffmpeg', '-loop', '1', '-i', str(temp_frame),
            '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
            '-t', str(extension_duration), '-r', '30', '-y', str(temp_freeze_video)
        ]
        
        if not run_command(freeze_cmd, f"Creating freeze frame video ({extension_duration:.1f}s)"):
            return False
        
        # Concatenate original + freeze frame
        concat_file = output_file.parent / f"temp_concat_{output_file.stem}.txt"
        with open(concat_file, 'w') as f:
            f.write(f"file '{chapter_video.resolve()}'\n")
            f.write(f"file '{temp_freeze_video.resolve()}'\n")
        
        concat_cmd = [
            'ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(concat_file),
            '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
            '-an', '-y', str(output_file)
        ]
        
        result = run_command(concat_cmd, f"Concatenating with freeze frame")
        
        # Clean up temp files
        for temp_file in [temp_frame, temp_freeze_video, concat_file]:
            if temp_file.exists():
                temp_file.unlink()
        
        return result
    else:
        # Trim video to match audio duration
        cmd = [
            'ffmpeg', '-i', str(chapter_video),
            '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
            '-t', str(audio_duration), '-an', '-y', str(output_file)
        ]
        return run_command(cmd, f"Trimming video to {audio_duration:.1f}s")

def process_chapter_videos(chapters_dir, timing_data, temp_dir):
    """Process all chapter videos to match audio timing."""
    chapter_timings = timing_data['chapter_timings']
    timed_videos = []
    chapters_audio_dir = temp_dir / "timed_chapters"
    
    for timing in chapter_timings:
        chapter_num = timing['chapter']
        
        # Find corresponding files
        chapter_video = chapters_dir / f"chapter_{chapter_num}.mov"
        chapter_audio = chapters_audio_dir / f"chapter_{chapter_num}.wav"
        timed_video = temp_dir / "timed_chapters" / f"chapter_{chapter_num}.mov"
        
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
        print("Usage: python 6_match_video_timing.py <directory>")
        print("Example: python 6_match_video_timing.py temp-assets/")
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
    chapters_dir = temp_dir / "original-chapters"
    
    if not timing_file.exists():
        print(f"✗ Timing file not found: {timing_file}")
        print("Run step 5 first: python 5_audio_timing.py temp-assets/")
        sys.exit(1)
    
    if not chapters_dir.exists():
        print(f"✗ Chapters directory not found: {chapters_dir}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    print("Step 6: Match Video to Audio Timing")
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
    print("STEP 6 COMPLETED!")
    print("=" * 50)
    print("Created files in timed_chapter_videos/:")
    for video_file in timed_videos:
        print(f"  ✓ {video_file.name}")
    
    print(f"\nNext: python 7_create_background_music.py {directory}/")

if __name__ == "__main__":
    main()