#!/usr/bin/env python3
"""
Step 1: Extract Audio & Chapters
- Extract audio track from MP4 video files (MP4 required for chapter markers)
- Get chapter markers from ScreenFlow recordings  
- Split MP4 into individual chapter video files
"""

import subprocess
import json
import sys
from pathlib import Path

def run_command(cmd, description):
    """Run command with error handling."""
    try:
        print(f"  {description}...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print(f"  ✓ {description} completed")
            return result.stdout.strip() if result.stdout else True
        else:
            print(f"  ✗ {description} failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Error in {description}: {e}")
        return False

def extract_audio(video_file, temp_dir):
    """Extract audio from video file."""
    audio_file = temp_dir / "audio.wav"
    
    # Clean up existing audio file
    if audio_file.exists():
        audio_file.unlink()
        print(f"  Removed existing {audio_file.name}")
    
    cmd = [
        'ffmpeg', '-i', str(video_file),
        '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2',
        '-y', str(audio_file)
    ]
    
    if run_command(cmd, "Extracting audio"):
        return audio_file
    return None

def extract_chapters(video_file, temp_dir):
    """Extract chapter markers from video file."""
    chapters_file = temp_dir / "chapters.json"
    
    # Clean up existing chapters file
    if chapters_file.exists():
        chapters_file.unlink()
        print(f"  Removed existing {chapters_file.name}")
    
    # Get chapters using ffprobe
    cmd = [
        'ffprobe', '-v', 'quiet', '-print_format', 'json',
        '-show_chapters', str(video_file)
    ]
    
    result = run_command(cmd, "Extracting chapter markers")
    if not result:
        return None
    
    try:
        probe_data = json.loads(result)
        chapters = probe_data.get('chapters', [])
        
        if not chapters:
            print("  ⚠ No chapters found, creating single chapter")
            # Get video duration
            duration_cmd = [
                'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                '-of', 'csv=p=0', str(video_file)
            ]
            duration_result = subprocess.run(duration_cmd, capture_output=True, text=True)
            duration = float(duration_result.stdout.strip()) if duration_result.returncode == 0 else 60.0
            
            chapters = [{
                'id': 0,
                'time_base': '1/1000',
                'start': 0,
                'start_time': '0.000000',
                'end': int(duration * 1000),
                'end_time': str(duration),
                'tags': {'title': 'Chapter 1'}
            }]
        
        # Convert to simplified format
        simple_chapters = []
        for i, chapter in enumerate(chapters):
            simple_chapters.append({
                'index': i + 1,
                'start_time': float(chapter['start_time']),
                'end_time': float(chapter['end_time']),
                'duration': float(chapter['end_time']) - float(chapter['start_time']),
                'title': chapter.get('tags', {}).get('title', f'Chapter {i + 1}')
            })
        
        # Save chapters
        with open(chapters_file, 'w') as f:
            json.dump({'chapters': simple_chapters}, f, indent=2)
        
        print(f"  Found {len(simple_chapters)} chapters")
        return chapters_file
        
    except Exception as e:
        print(f"  ✗ Error processing chapters: {e}")
        return None

def split_video_by_chapters(video_file, chapters_file, temp_dir):
    """Split video into chapter files."""
    with open(chapters_file, 'r') as f:
        data = json.load(f)
    
    chapters = data['chapters']
    chapter_videos = []
    
    # Create chapters directory and clean up existing files
    chapters_dir = temp_dir / "original-chapters"
    if chapters_dir.exists():
        # Remove all existing chapter files
        for existing_file in chapters_dir.glob("chapter_*.mp4"):
            existing_file.unlink()
            print(f"  Removed existing {existing_file.name}")
    else:
        chapters_dir.mkdir(exist_ok=True)
    
    for chapter in chapters:
        chapter_num = chapter['index']
        start_time = chapter['start_time']
        duration = chapter['duration']
        
        chapter_file = chapters_dir / f"chapter_{chapter_num}.mov"
        
        cmd = [
            'ffmpeg', '-i', str(video_file),
            '-ss', str(start_time), '-t', str(duration),
            '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le', '-an',
            '-y', str(chapter_file)
        ]
        
        if run_command(cmd, f"Creating chapter {chapter_num} ({duration:.1f}s)"):
            chapter_videos.append(chapter_file)
        else:
            return None
    
    return chapter_videos

def main():
    if len(sys.argv) != 2:
        print("Usage: python 1_extract_audio_chapters.py <video_file>")
        print("Example: python 1_extract_audio_chapters.py current-project/human-provided-content/orig_screencast.mp4")
        sys.exit(1)
    
    video_file = Path(sys.argv[1])
    if not video_file.exists():
        print(f"✗ Video file not found: {video_file}")
        sys.exit(1)
    
    # Use project root (go up from human-provided-content to main directory)
    if "human-provided-content" in str(video_file):
        project_dir = video_file.parent.parent
    else:
        project_dir = video_file.parent
    temp_dir = project_dir / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    print("Step 1: Extract Audio & Chapters")
    print("=" * 50)
    print(f"Processing: {video_file.name}")
    print(f"Temp files in: {temp_dir}")
    
    # Extract audio
    audio_file = extract_audio(video_file, temp_dir)
    if not audio_file:
        sys.exit(1)
    
    # Extract chapters
    chapters_file = extract_chapters(video_file, temp_dir)
    if not chapters_file:
        sys.exit(1)
    
    # Split video by chapters
    chapter_videos = split_video_by_chapters(video_file, chapters_file, temp_dir)
    if not chapter_videos:
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("STEP 1 COMPLETED!")
    print("=" * 50)
    print("Created files:")
    print(f"  ✓ {audio_file.name}")
    print(f"  ✓ {chapters_file.name}")
    print(f"  ✓ {len(chapter_videos)} chapter video files")
    print("\nNext: python 2_transcribe_audio.py temp-assets/")

if __name__ == "__main__":
    main()