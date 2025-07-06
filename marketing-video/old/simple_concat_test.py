#!/usr/bin/env python3
"""
Simple test: B-roll + A-roll + B-roll with audio overlay.
No transitions, just basic concatenation to get the fundamentals working.
"""

import subprocess
from pathlib import Path

def run_ffmpeg(cmd, description):
    """Run FFmpeg command with error handling."""
    try:
        print(f"  {description}...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print(f"  ✓ {description} completed")
            return True
        else:
            print(f"  ✗ {description} failed:")
            print(f"    STDERR: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Error in {description}: {e}")
        return False

def create_simple_video():
    """Create simple concatenated video with audio."""
    
    temp_dir = Path("temp-assets")
    
    # Input files
    broll_video = temp_dir / "b-roll.mp4"        # 4.4s
    main_video = temp_dir / "1.mp4"              # Main video
    chapter1_audio = temp_dir / "1_1.wav"        # 20s audio
    background_music = temp_dir / "background.mp3"
    
    # Check files exist
    for file in [broll_video, main_video, chapter1_audio, background_music]:
        if not file.exists():
            print(f"✗ Missing file: {file}")
            return False
    
    print("Creating simple concatenated video...")
    print(f"Structure: B-roll(4.4s) + Chapter1(20s) + B-roll(4.4s) = ~28.8s")
    
    # Step 1: Extract exactly 20 seconds from main video (chapter 1)
    chapter1_video = temp_dir / "chapter1_20s.mp4"
    cmd = [
        'ffmpeg', '-i', str(main_video),
        '-ss', '0', '-t', '20',  # Extract first 20 seconds
        '-c', 'copy', '-y', str(chapter1_video)
    ]
    
    if not run_ffmpeg(cmd, "Extracting 20s from main video"):
        return False
    
    # Step 2: Create concat list for videos
    concat_list = temp_dir / "concat_list.txt"
    with open(concat_list, 'w') as f:
        f.write(f"file '{broll_video.resolve()}'\n")
        f.write(f"file '{chapter1_video.resolve()}'\n")
        f.write(f"file '{broll_video.resolve()}'\n")  # Same b-roll for outro
    
    # Step 3: Concatenate videos (this gives us video track)
    video_only = temp_dir / "video_concat.mp4"
    cmd = [
        'ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(concat_list),
        '-c', 'copy', '-y', str(video_only)
    ]
    
    if not run_ffmpeg(cmd, "Concatenating video clips"):
        return False
    
    # Step 4: Create audio track
    # - Background music (low volume, full duration)
    # - Chapter audio (normal volume, starts after b-roll intro)
    
    # Get total video duration first
    probe_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(video_only)]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("✗ Could not get video duration")
        return False
    
    total_duration = float(result.stdout.strip())
    print(f"  Total video duration: {total_duration:.1f}s")
    
    # Create background music track (low volume, full duration)
    bg_music = temp_dir / "bg_music.wav"
    cmd = [
        'ffmpeg', '-i', str(background_music),
        '-filter_complex', f'[0:a]volume=0.3,atrim=0:{total_duration}[out]',
        '-map', '[out]', '-y', str(bg_music)
    ]
    
    if not run_ffmpeg(cmd, "Creating background music track"):
        return False
    
    # Create voice track (starts at 4.4s - after b-roll intro)
    voice_track = temp_dir / "voice_track.wav"
    cmd = [
        'ffmpeg', '-i', str(chapter1_audio),
        '-filter_complex', f'[0:a]adelay=4400|4400[delayed]; [delayed]atrim=0:{total_duration}[out]',  # 4.4s delay in milliseconds
        '-map', '[out]', '-y', str(voice_track)
    ]
    
    if not run_ffmpeg(cmd, "Creating delayed voice track"):
        return False
    
    # Mix background music + voice
    mixed_audio = temp_dir / "mixed_audio.wav"
    cmd = [
        'ffmpeg', '-i', str(bg_music), '-i', str(voice_track),
        '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=longest[out]',
        '-map', '[out]', '-y', str(mixed_audio)
    ]
    
    if not run_ffmpeg(cmd, "Mixing audio tracks"):
        return False
    
    # Step 5: Combine video + audio
    output_file = temp_dir / "simple_test_video.mp4"
    cmd = [
        'ffmpeg', '-i', str(video_only), '-i', str(mixed_audio),
        '-c:v', 'copy', '-c:a', 'aac',
        '-y', str(output_file)
    ]
    
    if not run_ffmpeg(cmd, "Adding audio to video"):
        return False
    
    # Verify output
    probe_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(output_file)]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    if result.returncode == 0:
        final_duration = float(result.stdout.strip())
        print(f"\n✓ Final video created: {output_file}")
        print(f"  Duration: {final_duration:.1f}s")
        print(f"  Structure: B-roll(4.4s) → A-roll(20s) → B-roll(4.4s)")
        print(f"  Audio: Background music + Voice (starts at 4.4s)")
        return True
    else:
        print("✗ Could not verify output file")
        return False

def main():
    print("Simple Concatenation Test")
    print("=" * 50)
    
    success = create_simple_video()
    
    if success:
        print("\n" + "=" * 50)
        print("BASIC TEST COMPLETED!")
        print("=" * 50)
        print("Next steps:")
        print("1. Test the video plays correctly")
        print("2. Verify audio timing (voice starts after b-roll)")
        print("3. Check video speed is normal")
        print("4. Then we can add transitions")
    else:
        print("\n✗ Basic test failed")

if __name__ == "__main__":
    main()