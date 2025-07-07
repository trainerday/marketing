#!/usr/bin/env python3
"""
Full test: B-roll + Full A-roll (all chapters) + B-roll with audio overlay.
Audio starts 0.5 seconds after video transition.
"""

import subprocess
from pathlib import Path

def get_audio_duration(audio_file):
    """Get audio file duration."""
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(audio_file)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"✗ Error getting duration for {audio_file}: {e}")
    return None

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

def create_full_video():
    """Create full concatenated video with all chapters and proper audio timing."""
    
    temp_dir = Path("temp-assets")
    
    # Input files
    broll_video = temp_dir / "b-roll.mp4"        # 4.4s
    main_video = temp_dir / "1.mp4"              # Main video
    background_music = temp_dir / "background.mp3"
    
    # Chapter audio files
    chapter_files = []
    total_voice_duration = 0
    
    for i in range(1, 10):  # Check for chapters 1-9
        audio_file = temp_dir / f"1_{i}.wav"
        if audio_file.exists():
            duration = get_audio_duration(audio_file)
            if duration:
                chapter_files.append({
                    'file': audio_file,
                    'duration': duration
                })
                total_voice_duration += duration
                print(f"Found Chapter {i}: {duration:.1f}s")
            else:
                break
        else:
            break
    
    if not chapter_files:
        print("✗ No chapter audio files found")
        return False
    
    print(f"Total voice duration: {total_voice_duration:.1f}s")
    
    # Check files exist
    for file in [broll_video, main_video, background_music]:
        if not file.exists():
            print(f"✗ Missing file: {file}")
            return False
    
    print("Creating full concatenated video...")
    broll_duration = 4.4
    audio_delay = broll_duration + 1.0  # B-roll duration + 1s delay
    total_expected = broll_duration + total_voice_duration + broll_duration
    print(f"Structure: B-roll({broll_duration}s) + A-roll({total_voice_duration:.1f}s) + B-roll({broll_duration}s) = ~{total_expected:.1f}s")
    print(f"Audio delay: {audio_delay}s")
    
    # Step 1: Extract the a-roll portion that matches our voice duration
    # We need to extract from the original video the sections that correspond to our chapters
    
    # Load chapter timing data
    chapters_file = temp_dir / "1_chapters.json"
    if not chapters_file.exists():
        print("✗ Chapter timing data not found")
        return False
    
    import json
    with open(chapters_file, 'r') as f:
        chapters_data = json.load(f)
    
    original_chapters = chapters_data['chapters']
    
    # Extract each chapter video segment
    chapter_videos = []
    for i, chapter_audio in enumerate(chapter_files):
        if i < len(original_chapters):
            original_chapter = original_chapters[i]
            start_time = original_chapter['start_time']
            duration = chapter_audio['duration']
            
            chapter_video = temp_dir / f"chapter_{i+1}_video.mp4"
            cmd = [
                'ffmpeg', '-i', str(main_video),
                '-ss', str(start_time), '-t', str(duration),
                '-c', 'copy', '-y', str(chapter_video)
            ]
            
            if not run_ffmpeg(cmd, f"Extracting chapter {i+1} video ({duration:.1f}s)"):
                return False
            
            chapter_videos.append(chapter_video)
    
    # Step 2: Create concat list for videos
    concat_list = temp_dir / "full_concat_list.txt"
    with open(concat_list, 'w') as f:
        # B-roll intro
        f.write(f"file '{broll_video.resolve()}'\n")
        # All chapter videos
        for chapter_video in chapter_videos:
            f.write(f"file '{chapter_video.resolve()}'\n")
        # B-roll outro
        f.write(f"file '{broll_video.resolve()}'\n")
    
    # Step 3: Create video with crossfade on first transition
    # First concatenate b-roll + first chapter with crossfade
    first_transition = temp_dir / "first_transition.mp4"
    cmd = [
        'ffmpeg', '-i', str(broll_video), '-i', str(chapter_videos[0]),
        '-filter_complex', 
        f'[0:v]fps=30[v0]; [1:v]fps=30[v1]; [v0][v1]xfade=transition=fade:duration=1.5:offset=3.0[v]',
        '-map', '[v]', '-y', str(first_transition)
    ]
    
    if not run_ffmpeg(cmd, "Creating first transition with crossfade"):
        return False
    
    # Then concatenate remaining chapters normally
    if len(chapter_videos) > 1:
        remaining_concat_list = temp_dir / "remaining_concat_list.txt"
        with open(remaining_concat_list, 'w') as f:
            f.write(f"file '{first_transition.resolve()}'\n")
            for chapter_video in chapter_videos[1:]:
                f.write(f"file '{chapter_video.resolve()}'\n")
            f.write(f"file '{broll_video.resolve()}'\n")
        
        video_only = temp_dir / "full_video_concat.mp4"
        cmd = [
            'ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(remaining_concat_list),
            '-c', 'copy', '-y', str(video_only)
        ]
    else:
        # Only one chapter, add outro
        video_only = temp_dir / "full_video_concat.mp4"
        cmd = [
            'ffmpeg', '-i', str(first_transition), '-i', str(broll_video),
            '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]',
            '-map', '[v]', '-y', str(video_only)
        ]
    
    if not run_ffmpeg(cmd, "Concatenating remaining video clips"):
        return False
    
    # Step 4: Get actual video duration
    probe_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(video_only)]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("✗ Could not get video duration")
        return False
    
    total_duration = float(result.stdout.strip())
    print(f"  Actual video duration: {total_duration:.1f}s")
    
    # Step 5: Create background music track (low volume, full duration)
    bg_music = temp_dir / "full_bg_music.wav"
    cmd = [
        'ffmpeg', '-i', str(background_music),
        '-filter_complex', f'[0:a]volume=0.3,atrim=0:{total_duration}[out]',
        '-map', '[out]', '-y', str(bg_music)
    ]
    
    if not run_ffmpeg(cmd, "Creating background music track"):
        return False
    
    # Step 6: Create complete voice track by concatenating all chapter audio
    voice_concat_list = temp_dir / "voice_concat_list.txt"
    with open(voice_concat_list, 'w') as f:
        for chapter_audio in chapter_files:
            f.write(f"file '{chapter_audio['file'].resolve()}'\n")
    
    voice_combined = temp_dir / "voice_combined.wav"
    cmd = [
        'ffmpeg', '-f', 'concat', '-safe', '0', '-i', str(voice_concat_list),
        '-c', 'copy', '-y', str(voice_combined)
    ]
    
    if not run_ffmpeg(cmd, "Concatenating voice audio"):
        return False
    
    # Step 7: Create delayed voice track (starts after b-roll + 0.5s delay)
    voice_track = temp_dir / "voice_delayed.wav"
    delay_ms = int(audio_delay * 1000)  # Convert to milliseconds
    cmd = [
        'ffmpeg', '-i', str(voice_combined),
        '-filter_complex', f'[0:a]adelay={delay_ms}|{delay_ms}[delayed]; [delayed]atrim=0:{total_duration}[out]',
        '-map', '[out]', '-y', str(voice_track)
    ]
    
    if not run_ffmpeg(cmd, f"Creating delayed voice track ({audio_delay}s delay)"):
        return False
    
    # Step 8: Mix background music + voice
    mixed_audio = temp_dir / "full_mixed_audio.wav"
    cmd = [
        'ffmpeg', '-i', str(bg_music), '-i', str(voice_track),
        '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=longest[out]',
        '-map', '[out]', '-y', str(mixed_audio)
    ]
    
    if not run_ffmpeg(cmd, "Mixing audio tracks"):
        return False
    
    # Step 9: Combine video + audio
    output_file = temp_dir / "full_test_video.mp4"
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
        print(f"\n✓ Full video created: {output_file}")
        print(f"  Duration: {final_duration:.1f}s")
        print(f"  Structure: B-roll({broll_duration}s) → A-roll({total_voice_duration:.1f}s) → B-roll({broll_duration}s)")
        print(f"  Audio: Background music + Voice (starts at {audio_delay}s)")
        print(f"  Transition: 1.5s crossfade on first transition")
        print(f"  Chapters: {len(chapter_files)}")
        return True
    else:
        print("✗ Could not verify output file")
        return False

def main():
    print("Full Concatenation Test")
    print("=" * 50)
    
    success = create_full_video()
    
    if success:
        print("\n" + "=" * 50)
        print("FULL TEST COMPLETED!")
        print("=" * 50)
        print("This should now be:")
        print("1. Full length with all chapters")
        print("2. Voice starts 1s after video transition")
        print("3. 1.5s crossfade on first transition")
        print("4. Proper audio timing throughout")
    else:
        print("\n✗ Full test failed")

if __name__ == "__main__":
    main()