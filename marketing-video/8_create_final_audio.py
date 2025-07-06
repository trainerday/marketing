#!/usr/bin/env python3
"""
Step 8: Create Final Audio Track
- A-roll background music (subtle, for voice-over sections)
- B-roll background music (energetic, for intro/outro)
- Advanced volume mixing and fade transitions
- Complete final audio with voice integration
- Template-based configuration
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

def get_video_timing_structure(timing_data, template_config):
    """Calculate video timing structure with intro, chapters, and outro."""
    timing_config = template_config['timing']
    
    # Get durations from template
    b_roll_intro = timing_config['b_roll_intro_duration']
    b_roll_outro = timing_config['b_roll_outro_duration'] 
    voice_delay = timing_config['voice_delay_after_intro']
    
    # Calculate chapter timing
    chapter_timings = timing_data['chapter_timings']
    total_chapter_duration = sum(timing['duration'] + 1.0 for timing in chapter_timings)
    
    # Voice actually starts after intro + delay
    voice_start_time = b_roll_intro + voice_delay
    voice_end_time = voice_start_time + sum(timing['duration'] for timing in chapter_timings)
    
    # Total video duration
    total_duration = b_roll_intro + total_chapter_duration + b_roll_outro
    
    return {
        'b_roll_intro_duration': b_roll_intro,
        'b_roll_outro_duration': b_roll_outro,
        'voice_start_time': voice_start_time,
        'voice_end_time': voice_end_time,
        'total_chapter_duration': total_chapter_duration,
        'total_duration': total_duration
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
    
    # Volume levels from template
    bg_volume = audio_levels['background_music_volume']  # 0.3 for A-roll background
    broll_volume = audio_levels['b_roll_music_volume']   # 0.8 for B-roll sections
    
    # Config-driven timing
    timing_config = template_config['timing']
    b_roll_start_length = timing_config.get('b_roll_start_length', 10.0)
    broll_fade_duration = 2.0  # B-roll fade out over 2 seconds  
    aroll_fade_duration = 2.0  # A-roll fade in over 2 seconds (10-12s, but voice starts at 11s)
    fadeout_start = voice_start - broll_fade_duration  # 11 - 2 = 9s
    aroll_fadein_start = b_roll_start_length  # Start A-roll exactly at b_roll_start_length (10s)
    fadein_start = voice_end
    # Start A-roll at 10s and fade in over 2 seconds (10-12s) 
    a_roll_start = aroll_fadein_start  # 10s
    a_roll_end = voice_end + 2.0
    
    # Step 1: Create intro B-roll track (fades out at beginning)
    temp_dir = output_file.parent
    broll_intro_track = temp_dir / "temp_broll_intro.wav"
    
    # Create intro B-roll with fade out from 9s to 11s, then silence
    cmd_broll_intro = [
        'ffmpeg', '-i', str(b_roll_music),
        '-af', f'volume={broll_volume},afade=t=out:st={fadeout_start}:d={broll_fade_duration}',
        '-t', str(voice_start),  # Only until voice starts
        '-y', str(broll_intro_track)
    ]
    
    if not run_command(cmd_broll_intro, "Creating intro B-roll track"):
        return False
    
    # Step 2: Create outro B-roll track (fades in at end, fades out at very end)
    broll_outro_track = temp_dir / "temp_broll_outro.wav"
    outro_fade_in_duration = 1.0  # 1 second fade-in
    outro_fade_out_duration = 2.0  # 2 second fade-out at end
    outro_duration = total_duration - fadein_start  # Duration of outro section
    outro_fadeout_start = outro_duration - outro_fade_out_duration  # Start fade-out 2s before end
    
    cmd_broll_outro = [
        'ffmpeg', '-i', str(b_roll_music),
        '-af', f'volume={broll_volume},afade=t=in:d={outro_fade_in_duration},afade=t=out:st={outro_fadeout_start}:d={outro_fade_out_duration},adelay={fadein_start*1000}|{fadein_start*1000}',
        '-t', str(total_duration),
        '-y', str(broll_outro_track)
    ]
    
    if not run_command(cmd_broll_outro, "Creating outro B-roll track"):
        return False
    
    # Step 3: Create A-roll track with fades and delay
    aroll_track = temp_dir / "temp_aroll.wav"
    aroll_duration = a_roll_end - a_roll_start
    
    # Create A-roll starting at 9s with 2s fade-in (9-11s)
    cmd_aroll = [
        'ffmpeg', '-i', str(a_roll_music),
        '-af', f'volume={bg_volume},afade=t=in:d={aroll_fade_duration},afade=t=out:st={aroll_duration-aroll_fade_duration}:d={aroll_fade_duration},adelay={a_roll_start*1000}|{a_roll_start*1000}',
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
        print("Usage: python 8_create_final_audio.py <directory>")
        print("Example: python 8_create_final_audio.py current-project/")
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
    template_file = directory / "video-template.json"
    
    if not timing_file.exists():
        print(f"✗ Timing file not found: {timing_file}")
        print("Run step 5 first: python 5_audio_timing.py current-project/")
        sys.exit(1)
    
    if not template_file.exists():
        print(f"✗ Template file not found: {template_file}")
        print("Template file is required for advanced music mixing")
        sys.exit(1)
    
    print("Step 8: Create Final Audio Track")
    print("=" * 50)
    
    # Load configuration
    with open(timing_file, 'r') as f:
        timing_data = json.load(f)
    
    with open(template_file, 'r') as f:
        template_config = json.load(f)
    
    # Calculate video timing structure
    timing_structure = get_video_timing_structure(timing_data, template_config)
    
    print(f"Video timing structure:")
    print(f"  B-roll intro: {timing_structure['b_roll_intro_duration']:.1f}s")
    print(f"  Voice section: {timing_structure['voice_start_time']:.1f}s - {timing_structure['voice_end_time']:.1f}s")
    print(f"  B-roll outro: {timing_structure['b_roll_outro_duration']:.1f}s")
    print(f"  Total duration: {timing_structure['total_duration']:.1f}s")
    
    # Focus on just creating the individual tracks for debugging
    background_music_file = temp_dir / "background_music.wav"
    
    if not create_advanced_music_track(template_config, timing_structure, background_music_file, directory):
        print("\n" + "=" * 50)
        print("STEP 8 FAILED")
        print("=" * 50)
        print("Please check that music files exist:")
        print(f"  A-roll: {template_config['music']['a_roll_background']}")
        print(f"  B-roll: {template_config['music']['b_roll_background']}")
        sys.exit(1)
    
    # Create final audio with voice mixed in
    voice_file = directory / "a-roll.wav"
    final_audio_file = temp_dir / "audio_final.wav"
    
    if voice_file.exists():
        voice_volume = template_config['audio_levels']['voice_volume']
        voice_success = create_final_audio_track(timing_structure, background_music_file, voice_file, final_audio_file, voice_volume)
        if voice_success:
            print(f"  ✓ audio_final.wav (background music + voice)")
    else:
        print(f"  ⚠ Voice file not found: {voice_file.name}")
        voice_success = True
    
    print("\n" + "=" * 50)
    print("STEP 8 COMPLETED!")
    print("=" * 50)
    print("Created files:")
    print(f"  ✓ {background_music_file.name} (mixed B-roll + A-roll)")
    print(f"  ✓ temp_broll.wav (B-roll only)")
    print(f"  ✓ temp_aroll.wav (A-roll only)")
    
    print(f"\nAdvanced music setup:")
    print(f"  A-roll music: {template_config['music']['a_roll_background']}")
    print(f"  B-roll music: {template_config['music']['b_roll_background']}")
    print(f"  Total duration: {timing_structure['total_duration']:.1f}s")
    print(f"  Fade transitions: B-roll 2.0s (9-11s), A-roll 2.0s (10-12s)")
    print(f"  B-roll starts at full volume from beginning")
    if voice_success:
        print(f"  Voice starts at {timing_structure['voice_start_time']:.1f}s")
    print(f"\nNext: python 9_final_assembly.py {directory}/")

if __name__ == "__main__":
    main()