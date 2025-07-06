#!/usr/bin/env python3
"""
Step 9: Final Assembly
- Combine music, b-roll intro/outro, and chapter files
- Future: Overlays (talking head, titles)
"""

import sys
import json
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Run command with error handling."""
    try:
        print(f"  {description}...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            print(f"  ✓ {description} completed")
            return True
        else:
            print(f"  ✗ {description} failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Error in {description}: {e}")
        return False

def create_video_concat_list(directory, timing_data, source_temp_dir, output_temp_dir):
    """Create concatenation list for videos."""
    chapter_timings = timing_data['chapter_timings']
    
    # Create concat list
    concat_list = output_temp_dir / "video_concat.txt"
    
    with open(concat_list, 'w') as f:
        # B-roll intro (10 seconds)
        broll_file = directory / "b-roll.mp4"
        if broll_file.exists():
            f.write(f"file '{broll_file.resolve()}'\n")
        else:
            print(f"  ⚠ B-roll file not found: {broll_file}")
            print(f"  Please download 10-second b-roll from Artgrid and save as: {broll_file}")
            return None
        
        # Chapter videos
        timed_videos_dir = source_temp_dir / "timed_chapter_videos"
        for timing in chapter_timings:
            chapter_num = timing['chapter']
            chapter_file = timed_videos_dir / f"chapter_{chapter_num}.mp4"
            if chapter_file.exists():
                f.write(f"file '{chapter_file.resolve()}'\n")
            else:
                print(f"  ✗ Chapter video not found: {chapter_file}")
                return None
        
        # B-roll outro (10 seconds) - reuse same b-roll
        f.write(f"file '{broll_file.resolve()}'\n")
    
    return concat_list

def create_audio_track(directory, timing_data, temp_dir):
    """Create complete audio track with timing."""
    chapter_timings = timing_data['chapter_timings']
    
    # Calculate timing
    broll_intro_duration = 10.0
    total_chapter_duration = sum(timing['duration'] for timing in chapter_timings)
    voice_start_time = broll_intro_duration + 1.0  # Start voice 1 second after b-roll ends
    
    # Create voice track with delay
    voice_concat_list = temp_dir / "voice_concat.txt"
    with open(voice_concat_list, 'w') as f:
        for timing in chapter_timings:
            chapter_num = timing['chapter']
            chapter_audio = temp_dir / f"chapter_{chapter_num}.wav"
            if chapter_audio.exists():
                f.write(f"file '{chapter_audio.resolve()}'\n")
            else:
                print(f"  ✗ Chapter audio not found: {chapter_audio}")
                return None
    
    # Concatenate voice files
    voice_combined = temp_dir / "voice_combined.wav"
    cmd = [
        'ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(voice_concat_list),
        '-c', 'copy', '-y', str(voice_combined)
    ]
    
    if not run_command(cmd, "Combining voice chapters"):
        return None
    
    # Create delayed voice track
    voice_delayed = temp_dir / "voice_delayed.wav"
    delay_ms = int(voice_start_time * 1000)
    total_duration = broll_intro_duration + total_chapter_duration + 10.0 + 2.0  # Extra padding
    
    cmd = [
        'ffmpeg', '-i', str(voice_combined),
        '-filter_complex', f'[0:a]adelay={delay_ms}|{delay_ms}[delayed]; [delayed]atrim=0:{total_duration}[out]',
        '-map', '[out]', '-y', str(voice_delayed)
    ]
    
    if not run_command(cmd, f"Adding {voice_start_time:.1f}s delay to voice"):
        return None
    
    return voice_delayed

def combine_final_video(concat_list, voice_track, background_music, output_file):
    """Combine video with audio tracks."""
    
    # First create video without audio - re-encode to ensure consistent codec
    video_only = output_file.parent / "temp_video_only.mp4"
    cmd = [
        'ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(concat_list),
        '-c:v', 'libx264', '-crf', '23', '-preset', 'medium',
        '-pix_fmt', 'yuv420p', '-an', '-y', str(video_only)
    ]
    
    if not run_command(cmd, "Concatenating and re-encoding video clips"):
        return False
    
    # Then combine with audio tracks
    cmd = [
        'ffmpeg', 
        '-i', str(video_only),
        '-i', str(voice_track),
        '-i', str(background_music),
        '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=longest[audio]',
        '-map', '0:v', '-map', '[audio]',
        '-c:v', 'copy', '-c:a', 'aac',
        '-y', str(output_file)
    ]
    
    return run_command(cmd, "Adding audio tracks to video")

def main():
    if len(sys.argv) != 2:
        print("Usage: python 9_final_assembly.py <directory>")
        print("Example: python 9_final_assembly.py current-project/")
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
    background_music_file = temp_dir / "background_music.wav"
    timed_videos_dir = temp_dir / "timed_chapter_videos"
    
    if not timing_file.exists():
        print(f"✗ Timing file not found: {timing_file}")
        print("Run step 5 first: python 5_audio_timing.py temp-assets/")
        sys.exit(1)
    
    if not background_music_file.exists():
        print(f"✗ Background music not found: {background_music_file}")
        print("Run step 8 first: python 8_create_music.py temp-assets/")
        sys.exit(1)
    
    if not timed_videos_dir.exists():
        print(f"✗ Timed videos not found: {timed_videos_dir}")
        print("Run step 7 first: python 7_match_video_timing.py temp-assets/")
        sys.exit(1)
    
    print("Step 9: Final Assembly")
    print("=" * 50)
    
    # Load timing data
    with open(timing_file, 'r') as f:
        timing_data = json.load(f)
    
    # Create temp directory for final assembly
    temp_final_dir = temp_dir / "temp_final"
    temp_final_dir.mkdir(exist_ok=True)
    
    # Create video concatenation list
    concat_list = create_video_concat_list(directory, timing_data, temp_dir, temp_final_dir)
    if not concat_list:
        sys.exit(1)
    
    # Create audio track
    voice_track = create_audio_track(directory, timing_data, temp_dir)
    if not voice_track:
        sys.exit(1)
    
    # Final assembly
    output_file = directory / "final_video.mp4"
    
    if combine_final_video(concat_list, voice_track, background_music_file, output_file):
        # Clean up temp files
        import shutil
        shutil.rmtree(temp_final_dir)
        
        print("\n" + "=" * 50)
        print("🎉 FINAL VIDEO COMPLETED!")
        print("=" * 50)
        print("Created files:")
        print(f"  ✓ {output_file.name}")
        
        # Get video info
        probe_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(output_file)]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        if result.returncode == 0:
            duration = float(result.stdout.strip())
            print(f"\nVideo details:")
            print(f"  Duration: {duration:.1f} seconds")
            print(f"  Structure: B-roll intro (10s) → Chapters → B-roll outro (10s)")
            print(f"  Audio: Voice + Background music")
            print(f"  Chapters: {len(timing_data['chapter_timings'])}")
        
        print(f"\n🚀 READY FOR UPLOAD!")
        print(f"   Video file: {output_file}")
    else:
        print("\n✗ Final assembly failed")
        sys.exit(1)

if __name__ == "__main__":
    main()