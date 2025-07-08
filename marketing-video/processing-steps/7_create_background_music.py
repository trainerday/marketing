#!/usr/bin/env python3
"""
Step 7: Create Background Music Track
- Generate background music from A-roll and B-roll music files
- Apply professional audio processing (normalization, limiting)
- Create background_music.wav for final assembly
- Template-based audio configuration
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

def detect_file_duration(file_path):
    """Get duration of audio/video file using ffprobe."""
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(file_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"  ⚠ Could not detect duration for {file_path}: {e}")
    return 0.0

def get_video_timing_structure_from_files(project_dir, project_config):
    """Calculate video timing structure from actual processed files."""
    intro_outro_config = project_config.get('intro_outro', {})
    
    # Detect intro duration (if configured)
    intro_duration = 0.0
    intro_video_path = intro_outro_config.get('intro_video')
    if intro_video_path:
        intro_file = project_dir.parent / intro_video_path
        if intro_file.exists():
            intro_duration = detect_file_duration(intro_file)
            print(f"  Detected intro duration: {intro_duration:.1f}s")
        else:
            print(f"  ⚠ Intro video file not found: {intro_file}")
    else:
        print("  ⚠ No intro video file configured")
    
    # Detect chapter durations from processed audio files
    processed_voice_dir = project_dir / "temp" / "processed_voice"
    total_chapters_duration = 0.0
    chapter_count = 0
    
    if processed_voice_dir.exists():
        for i in range(1, 10):  # Support up to 9 chapters
            chapter_file = processed_voice_dir / f"chapter_{i}_processed.wav"
            if chapter_file.exists():
                duration = detect_file_duration(chapter_file)
                total_chapters_duration += duration
                chapter_count += 1
                print(f"  Detected chapter {i} duration: {duration:.1f}s")
    
    # Detect outro duration (if configured)
    outro_duration = 0.0
    outro_video_path = intro_outro_config.get('outro_video')
    if outro_video_path:
        outro_file = project_dir.parent / outro_video_path
        if outro_file.exists():
            outro_duration = detect_file_duration(outro_file)
            print(f"  Detected outro duration: {outro_duration:.1f}s")
        else:
            print(f"  ⚠ Outro video file not found: {outro_file}")
    else:
        print("  ⚠ No outro video file configured")
    
    # Calculate timing structure
    voice_start_time = intro_duration
    voice_end_time = voice_start_time + total_chapters_duration
    total_duration = intro_duration + total_chapters_duration + outro_duration
    
    return {
        'intro_duration': intro_duration,
        'outro_duration': outro_duration, 
        'voice_start_time': voice_start_time,
        'voice_end_time': voice_end_time,
        'total_chapters_duration': total_chapters_duration,
        'total_duration': total_duration,
        'chapter_count': chapter_count
    }

def create_advanced_music_track(template_config, timing_structure, output_file, directory):
    """Create sophisticated music track by building B-roll and A-roll separately, then mixing."""
    
    music_config = template_config['music']
    audio_levels = template_config['audio_levels']
    
    # Get music file paths - resolve relative to parent directory
    a_roll_music = directory.parent / music_config['a_roll_background']
    b_roll_music = directory.parent / music_config['b_roll_background']
    
    # Check if music files exist
    if not a_roll_music.exists():
        print(f"  ⚠ A-roll music not found: {a_roll_music}")
        return False
    
    if not b_roll_music.exists():
        print(f"  ⚠ B-roll music not found: {b_roll_music}")
        return False
    
    total_duration = timing_structure['total_duration']
    voice_start = timing_structure['voice_start_time']
    voice_end = timing_structure['voice_end_time']
    
    # Keep at full volume - volume reduction will happen in step 9 final mixing
    bg_volume = 1.0  # Full volume for temp files
    broll_volume = 1.0  # Full volume for temp files
    
    # Simple timing structure based on actual files
    intro_duration = timing_structure['intro_duration']
    outro_duration = timing_structure['outro_duration']
    
    # Fade settings
    fade_duration = 2.0  # Standard fade duration
    
    # Music sections:
    # 1. B-roll music during intro (with fade out before voice)
    # 2. A-roll background music during chapters (lower volume)
    # 3. B-roll music during outro (with fade in after voice)
    
    broll_fadeout_start = max(0, voice_start - fade_duration) if intro_duration > 0 else 0
    broll_fadein_start = voice_end if outro_duration > 0 else voice_end
    
    # Step 1: Create intro B-roll track (fades out at beginning)
    temp_dir = output_file.parent
    broll_intro_track = temp_dir / "temp_broll_intro.wav"
    
    # Create intro B-roll with fade out from 9s to 11s, then silence
    cmd_broll_intro = [
        'ffmpeg', '-i', str(b_roll_music),
        '-af', f'volume={broll_volume},afade=t=out:st={broll_fadeout_start}:d={fade_duration}',
        '-t', str(voice_start),  # Only until voice starts
        '-y', str(broll_intro_track)
    ]
    
    if not run_command(cmd_broll_intro, "Creating intro B-roll track"):
        return False
    
    # Step 2: Create outro B-roll track (fades in at end, fades out at very end)
    broll_outro_track = temp_dir / "temp_broll_outro.wav"
    outro_fade_in_duration = 1.0  # 1 second fade-in
    outro_fade_out_duration = 2.0  # 2 second fade-out at end
    outro_duration = total_duration - broll_fadein_start  # Duration of outro section
    
    # Prevent negative fade times
    if outro_duration <= outro_fade_out_duration:
        # If outro section is too short, adjust fade durations
        outro_fade_out_duration = max(0.5, outro_duration * 0.5)  # Use half of available time, min 0.5s
        outro_fadeout_start = max(0, outro_duration - outro_fade_out_duration)
    else:
        outro_fadeout_start = outro_duration - outro_fade_out_duration
    
    cmd_broll_outro = [
        'ffmpeg', '-i', str(b_roll_music),
        '-af', f'volume={broll_volume},afade=t=in:d={outro_fade_in_duration},afade=t=out:st={outro_fadeout_start}:d={outro_fade_out_duration},adelay={int(broll_fadein_start*1000)}|{int(broll_fadein_start*1000)}',
        '-t', str(total_duration),
        '-y', str(broll_outro_track)
    ]
    
    if not run_command(cmd_broll_outro, "Creating outro B-roll track"):
        return False
    
    # Step 3: Create A-roll track with fades and delay
    aroll_track = temp_dir / "temp_aroll.wav"
    a_roll_start = voice_start
    a_roll_end = voice_end
    aroll_duration = a_roll_end - a_roll_start
    
    # Get fade durations from assembly template
    assembly_data = template_config.get('assembly_template_data', {})
    music_sections = assembly_data.get('music_sections', {})
    chapters_music = music_sections.get('chapters_music', {})
    aroll_fade_in_duration = chapters_music.get('fade_in', {}).get('duration', 5.0)
    aroll_fade_out_duration = chapters_music.get('fade_out', {}).get('duration', 1.0)
    
    # Create A-roll starting at 9s with 2s fade-in (9-11s)
    cmd_aroll = [
        'ffmpeg', '-i', str(a_roll_music),
        '-af', f'volume={bg_volume},afade=t=in:d={aroll_fade_in_duration},afade=t=out:st={aroll_duration-aroll_fade_out_duration}:d={aroll_fade_out_duration},adelay={a_roll_start*1000}|{a_roll_start*1000}',
        '-t', str(total_duration),
        '-y', str(aroll_track)
    ]
    
    if not run_command(cmd_aroll, "Creating A-roll track with fades and delay"):
        return False
    
    # Step 4: Mix all three tracks (intro B-roll, A-roll, outro B-roll)
    cmd_mix = [
        'ffmpeg', 
        '-i', str(broll_intro_track),
        '-i', str(aroll_track),
        '-i', str(broll_outro_track),
        '-filter_complex', '[0:a][1:a][2:a]amix=inputs=3:duration=longest[out]',
        '-map', '[out]',
        '-t', str(total_duration),
        '-y', str(output_file)
    ]
    
    success = run_command(cmd_mix, "Mixing intro B-roll, A-roll, and outro B-roll tracks")
    
    # Keep temp files for debugging - don't delete them
    print(f"  Debug files kept: {broll_intro_track.name}, {aroll_track.name}, {broll_outro_track.name}")
    
    return success

def create_final_audio_track(timing_structure, background_music_file, a_roll_file, output_file, voice_volume=1.0):
    """Create complete audio track with background music + a-roll voice."""
    
    if not a_roll_file.exists():
        print(f"  ⚠ A-roll audio not found: {a_roll_file}")
        return False
    
    voice_start = timing_structure['voice_start_time']
    total_duration = timing_structure['total_duration']
    
    # Step 1: Normalize and limit the voice track for consistent levels
    temp_dir = output_file.parent
    normalized_voice = temp_dir / "voice_normalized.wav"
    
    cmd_normalize = [
        'ffmpeg', '-i', str(a_roll_file),
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=level_in=1:level_out=0.708:limit=0.708:attack=5:release=50',  # EBU R128 + limiter to -3dB
        '-y', str(normalized_voice)
    ]
    
    if not run_command(cmd_normalize, "Normalizing and limiting voice track"):
        return False
    
    # Step 2: Mix background music with normalized voice at proper timing
    filter_complex = f"""
    [0:a]volume=1.0[bg];
    [1:a]adelay={voice_start*1000}|{voice_start*1000},volume={voice_volume}[voice];
    [bg][voice]amix=inputs=2:duration=longest[out]
    """
    
    cmd = [
        'ffmpeg', 
        '-i', str(background_music_file),  # Input 0: Background music
        '-i', str(normalized_voice),       # Input 1: Normalized voice
        '-filter_complex', filter_complex,
        '-map', '[out]',
        '-t', str(total_duration),
        '-y', str(output_file)
    ]
    
    return run_command(cmd, f"Creating final audio track with voice ({total_duration:.1f}s)")

def main():
    if len(sys.argv) != 2:
        print("Usage: python 7_create_background_music.py <directory>")
        print("Example: python 7_create_background_music.py current-project/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    temp_dir = directory / "temp"
    if not temp_dir.exists():
        print(f"✗ Temp directory not found: {temp_dir}")
        print("Run step 1 first: python 1_extract_audio_chapters.py current-project/human-provided-content/orig_screencast.mov")
        sys.exit(1)
    
    # Check if processed voice files exist
    processed_voice_dir = temp_dir / "processed_voice"
    if not processed_voice_dir.exists():
        print(f"✗ Processed voice directory not found: {processed_voice_dir}")
        print("Run step 8 first: python 8_process_voice.py current-project/")
        sys.exit(1)
    
    # Check for project config (needed for music file paths and volume levels)
    config_file = directory / "human-provided-content" / "project-config.json"
    if not config_file.exists():
        print(f"✗ Project config file not found: {config_file}")
        print("Project config file is required for music file paths and volume levels")
        sys.exit(1)
    
    print("Step 7: Create Final Audio Track")
    print("=" * 50)
    print("Detecting timing from actual processed files...")
    
    # Load minimal config (just music paths and volumes)
    with open(config_file, 'r') as f:
        project_config = json.load(f)
    
    # Load assembly template for fade durations
    assembly_template_name = project_config.get('assembly_template', 'assembly-template1.json')
    assembly_template_file = directory.parent / "video-templates" / assembly_template_name
    if assembly_template_file.exists():
        with open(assembly_template_file, 'r') as f:
            assembly_template = json.load(f)
        project_config['assembly_template_data'] = assembly_template
    else:
        print(f"⚠ Assembly template not found: {assembly_template_file}")
        project_config['assembly_template_data'] = {}
    
    # Calculate timing structure from actual files
    timing_structure = get_video_timing_structure_from_files(directory, project_config)
    
    print(f"Video timing structure:")
    print(f"  Intro: {timing_structure['intro_duration']:.1f}s")
    print(f"  Chapters: {timing_structure['voice_start_time']:.1f}s - {timing_structure['voice_end_time']:.1f}s ({timing_structure['total_chapters_duration']:.1f}s total)")
    print(f"  Outro: {timing_structure['outro_duration']:.1f}s")
    print(f"  Total duration: {timing_structure['total_duration']:.1f}s")
    print(f"  Found {timing_structure['chapter_count']} chapters")
    
    # Focus on just creating the individual tracks for debugging
    background_music_file = temp_dir / "background_music.wav"
    
    if not create_advanced_music_track(project_config, timing_structure, background_music_file, directory):
        print("\n" + "=" * 50)
        print("STEP 8 FAILED")
        print("=" * 50)
        print("Please check that music files exist:")
        print(f"  A-roll: {project_config['music']['a_roll_background']}")
        print(f"  B-roll: {project_config['music']['b_roll_background']}")
        sys.exit(1)
    
    # Background music creation completed
    print(f"✓ Background music track created successfully")
    
    print("\n" + "=" * 50)
    print("STEP 7 COMPLETED!")
    print("=" * 50)
    print("Created files:")
    print(f"  ✓ {background_music_file.name} (mixed B-roll + A-roll)")
    print(f"  ✓ temp_broll.wav (B-roll only)")
    print(f"  ✓ temp_aroll.wav (A-roll only)")
    
    print(f"\nBackground music setup:")
    print(f"  A-roll music: {project_config['music']['a_roll_background']}")
    print(f"  B-roll music: {project_config['music']['b_roll_background']}")
    print(f"  Total duration: {timing_structure['total_duration']:.1f}s")
    print(f"  Fade transitions: B-roll 2.0s (9-11s), A-roll 2.0s (10-12s)")
    print(f"  B-roll starts at full volume from beginning")
    print(f"\nNext: python 8_process_voice.py {directory}/")

if __name__ == "__main__":
    main()