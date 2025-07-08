#!/usr/bin/env python3
"""
Step 8: Process Voice Files
- Apply limiting and normalization to all voice tracks
- Process intro, outro, and chapter audio files independently
- Use EBU R128 loudness normalization and limiting for broadcast quality
- Save processed files to temp/processed_voice/
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

def process_voice_file(input_file, output_file, description):
    """Apply normalization and limiting to a voice file."""
    if not input_file.exists():
        print(f"  ⚠ Skipping {description} - file not found: {input_file}")
        return True
    
    # FFmpeg command with normalize → limit to -5dB with 4:1 ratio → normalize again
    cmd = [
        'ffmpeg', '-i', str(input_file),
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,compand=attacks=0.3:decays=0.8:points=-80/-80|-5/-5|20/-5,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1',
        '-y', str(output_file)
    ]
    
    return run_command(cmd, f"Processing {description}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python 8_process_voice.py <directory>")
        print("Example: python 8_process_voice.py current-project/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    # Load project config to get intro/outro file paths
    project_config_file = directory / "human-provided-content" / "project-config.json"
    if not project_config_file.exists():
        print(f"✗ Project config file not found: {project_config_file}")
        print("human-provided-content/project-config.json is required to specify intro/outro files")
        sys.exit(1)
    
    with open(project_config_file, 'r') as f:
        project_config = json.load(f)
    
    temp_dir = directory / "temp"
    processed_voice_dir = temp_dir / "processed_voice"
    timed_chapters_dir = temp_dir / "timed_chapters"
    
    # Create output directory
    processed_voice_dir.mkdir(parents=True, exist_ok=True)
    
    print("Step 8: Process Voice Files")
    print("=" * 50)
    print("Applying EBU R128 normalization and limiting to all voice tracks...")
    
    processed_files = []
    
    # Process intro voice (if configured and exists)
    intro_outro_config = project_config.get('intro_outro', {})
    intro_audio_path = intro_outro_config.get('intro_audio')
    if intro_audio_path:
        intro_audio_file = directory.parent / intro_audio_path
        if intro_audio_file.exists():
            intro_processed = processed_voice_dir / "intro1_processed.wav"
            if process_voice_file(intro_audio_file, intro_processed, "intro voice"):
                processed_files.append("intro1_processed.wav")
        else:
            print(f"  ⚠ Intro audio file not found: {intro_audio_file}")
    else:
        print("  ⚠ No intro audio file configured")
    
    # Process chapter voices from resemble-chapters (primary source)
    resemble_chapters_dir = directory / "human-provided-content" / "resemble-chapters"
    if resemble_chapters_dir.exists():
        for i in range(1, 10):  # Support up to 9 chapters
            chapter_audio = resemble_chapters_dir / f"{i}.wav"
            if chapter_audio.exists():
                chapter_processed = processed_voice_dir / f"chapter_{i}_processed.wav"
                if process_voice_file(chapter_audio, chapter_processed, f"chapter {i} voice"):
                    processed_files.append(f"chapter_{i}_processed.wav")
    else:
        # Fallback: check timed_chapters if resemble-chapters doesn't exist
        if timed_chapters_dir.exists():
            for i in range(1, 10):  # Support up to 9 chapters
                chapter_audio = timed_chapters_dir / f"chapter_{i}.wav"
                if chapter_audio.exists():
                    chapter_processed = processed_voice_dir / f"chapter_{i}_processed.wav"
                    if process_voice_file(chapter_audio, chapter_processed, f"chapter {i} voice"):
                        processed_files.append(f"chapter_{i}_processed.wav")
    
    # Process outro voice (if configured and exists)
    outro_audio_path = intro_outro_config.get('outro_audio')
    if outro_audio_path:
        outro_audio_file = directory.parent / outro_audio_path
        if outro_audio_file.exists():
            outro_processed = processed_voice_dir / "outro1_processed.wav"
            if process_voice_file(outro_audio_file, outro_processed, "outro voice"):
                processed_files.append("outro1_processed.wav")
        else:
            print(f"  ⚠ Outro audio file not found: {outro_audio_file}")
    else:
        print("  ⚠ No outro audio file configured")
    
    print("\n" + "=" * 50)
    print("STEP 8 COMPLETED!")
    print("=" * 50)
    print("Processed voice files:")
    for file in processed_files:
        print(f"  ✓ {file}")
    
    print(f"\nAudio processing applied:")
    print(f"  1. Initial EBU R128 loudness normalization (I=-16 LUFS, TP=-1.5dBFS, LRA=11LU)")
    print(f"  2. 4:1 compressor/limiter to -5dB (attack=0.3s, decay=0.8s)")
    print(f"  3. Final EBU R128 loudness normalization (I=-16 LUFS, TP=-1.5dBFS, LRA=11LU)")
    print(f"  4. Standardized to 48kHz mono")
    
    print(f"\nNext: python 9_final_assembly.py {directory}/")

if __name__ == "__main__":
    main()