#!/usr/bin/env python3
"""
Step 9: Create video using FFmpeg with proper transitions.
This script:
1. Analyzes all assets (video, audio chapters, music)
2. Calculates precise timing with transitions
3. Creates FFmpeg command with crossfades and proper audio mixing
4. Renders final video locally with professional transitions
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def get_audio_duration(audio_file):
    """Get audio file duration using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'csv=p=0', str(audio_file)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
        else:
            return None
    except Exception as e:
        print(f"✗ Error getting duration for {audio_file}: {e}")
        return None

def get_video_duration(video_file):
    """Get video file duration using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'csv=p=0', str(video_file)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
        else:
            return None
    except Exception as e:
        print(f"✗ Error getting video duration: {e}")
        return None

def load_json_file(file_path):
    """Load JSON file safely."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"✗ Error loading {file_path}: {e}")
        return None

def analyze_video_assets(base_name, directory):
    """Analyze all video assets and calculate timing."""
    print(f"Analyzing assets for: {base_name}")
    print("="*60)
    
    # Load chapter data for original video timing
    chapters_file = directory / f"{base_name}_chapters.json"
    chapters_data = load_json_file(chapters_file)
    if not chapters_data:
        print("✗ Chapter data not found")
        return None
    
    # Check for main video file
    video_file = directory / f"{base_name}.mp4"
    if not video_file.exists():
        print(f"✗ Video file not found: {video_file}")
        return None
    
    # Get video duration
    video_duration = get_video_duration(video_file)
    if not video_duration:
        print("✗ Could not get video duration")
        return None
    
    # Analyze chapter audio files
    chapter_audio = []
    total_audio_duration = 0
    
    for i in range(1, 10):  # Check for up to 9 chapters
        audio_file = directory / f"{base_name}_{i}.wav"
        if audio_file.exists():
            duration = get_audio_duration(audio_file)
            if duration:
                chapter_audio.append({
                    'index': i,
                    'file': f"{base_name}_{i}.wav",
                    'duration': duration
                })
                total_audio_duration += duration
                print(f"Chapter {i}: {duration:.1f}s ({audio_file.name})")
            else:
                print(f"✗ Could not get duration for Chapter {i}")
        else:
            break  # No more chapters
    
    if not chapter_audio:
        print("✗ No chapter audio files found")
        return None
    
    # Check for music and b-roll files
    broll_music = directory / "b-roll.mp3"
    broll_video = directory / "b-roll.mp4"
    background_music = directory / "background.mp3"
    
    broll_duration = get_audio_duration(broll_music) if broll_music.exists() else None
    broll_video_duration = get_video_duration(broll_video) if broll_video.exists() else None
    background_duration = get_audio_duration(background_music) if background_music.exists() else None
    
    if not broll_music.exists():
        print("✗ b-roll.mp3 not found")
        return None
    if not broll_video.exists():
        print("✗ b-roll.mp4 not found")
        return None
    if not background_music.exists():
        print("✗ background.mp3 not found")
        return None
    
    print(f"\nMusic and b-roll files:")
    print(f"  - b-roll.mp3: {broll_duration:.1f}s")
    print(f"  - b-roll.mp4: {broll_video_duration:.1f}s")
    print(f"  - background.mp3: {background_duration:.1f}s")
    
    # Calculate timing structure
    broll_intro_duration = 10  # seconds
    broll_outro_duration = 8   # seconds
    chapter_gap = 0.5          # seconds between chapters (audio only)
    fade_duration = 1.0        # crossfade duration
    
    # Calculate chapter timing with gaps
    chapter_timing = []
    current_time = broll_intro_duration  # Start after b-roll intro
    
    for i, chapter in enumerate(chapter_audio):
        chapter_start = current_time
        chapter_duration = chapter['duration']
        chapter_end = chapter_start + chapter_duration
        
        chapter_timing.append({
            'index': chapter['index'],
            'file': chapter['file'],
            'start_time': chapter_start,
            'duration': chapter_duration,
            'end_time': chapter_end
        })
        
        current_time = chapter_end + chapter_gap  # Add gap after chapter
    
    # Remove gap after last chapter
    total_content_duration = current_time - chapter_gap
    total_video_duration = total_content_duration + broll_outro_duration
    
    assets_analysis = {
        'base_name': base_name,
        'video_file': f"{base_name}.mp4",
        'original_video_duration': video_duration,
        'chapters_data': chapters_data,
        'chapter_audio': chapter_audio,
        'chapter_timing': chapter_timing,
        'total_audio_duration': total_audio_duration,
        'music': {
            'broll': 'b-roll.mp3',
            'broll_video': 'b-roll.mp4',
            'background': 'background.mp3',
            'broll_duration': broll_duration,
            'broll_video_duration': broll_video_duration,
            'background_duration': background_duration
        },
        'timing': {
            'broll_intro': broll_intro_duration,
            'broll_outro': broll_outro_duration,
            'chapter_gap': chapter_gap,
            'fade_duration': fade_duration,
            'total_content': total_content_duration,
            'total_video': total_video_duration
        }
    }
    
    print(f"\nTiming Analysis:")
    print(f"  - B-roll intro: {broll_intro_duration}s")
    print(f"  - Main content: {total_content_duration - broll_intro_duration:.1f}s")
    print(f"  - B-roll outro: {broll_outro_duration}s")
    print(f"  - Total video: {total_video_duration:.1f}s")
    print(f"  - Fade duration: {fade_duration}s")
    
    return assets_analysis

def create_ffmpeg_video(assets, directory, output_file):
    """Create video using FFmpeg with proper transitions."""
    print(f"\nCreating video with FFmpeg...")
    
    fade_duration = assets['timing']['fade_duration']
    broll_intro = assets['timing']['broll_intro']
    broll_outro = assets['timing']['broll_outro']
    
    # Build complex filter for video composition
    video_inputs = []
    audio_inputs = []
    filter_parts = []
    
    # Input files
    inputs = ['-i', str(directory / assets['music']['broll_video'])]  # Input 0: b-roll video
    inputs.extend(['-i', str(directory / assets['video_file'])])       # Input 1: main video
    
    # Add chapter audio files
    chapter_input_map = {}
    input_index = 2
    for chapter in assets['chapter_audio']:
        inputs.extend(['-i', str(directory / chapter['file'])])
        chapter_input_map[chapter['index']] = input_index
        input_index += 1
    
    # Add music files
    inputs.extend(['-i', str(directory / assets['music']['broll'])])      # B-roll music
    inputs.extend(['-i', str(directory / assets['music']['background'])]) # Background music
    broll_music_input = input_index
    background_music_input = input_index + 1
    
    # Video timeline construction
    video_parts = []
    
    # 1. B-roll intro (with potential looping/freeze frame)
    broll_video_duration = assets['music']['broll_video_duration']
    if broll_video_duration >= (broll_intro + fade_duration):
        # B-roll is long enough
        video_parts.append(f"[0:v]trim=0:{broll_intro + fade_duration},setpts=PTS-STARTPTS[broll_intro]")
    else:
        # B-roll needs extension with freeze frame
        video_parts.append(f"[0:v]trim=0:{broll_video_duration},setpts=PTS-STARTPTS[broll_real]")
        freeze_duration = (broll_intro + fade_duration) - broll_video_duration
        video_parts.append(f"[0:v]trim={broll_video_duration-0.1}:{broll_video_duration},setpts=PTS-STARTPTS,loop=loop=-1:size=1:start=0,trim=0:{freeze_duration}[broll_freeze]")
        video_parts.append("[broll_real][broll_freeze]concat=n=2:v=1:a=0[broll_intro]")
    
    # 2. Main content chapters with transitions
    original_chapters = assets['chapters_data']['chapters']
    
    for i, chapter_audio in enumerate(assets['chapter_audio']):
        chapter_index = chapter_audio['index'] - 1  # Convert to 0-based
        
        if chapter_index < len(original_chapters):
            original_chapter = original_chapters[chapter_index]
            original_start = original_chapter['start_time']
            chapter_duration = chapter_audio['duration']
            
            # Extract chapter video segment
            if i < len(assets['chapter_audio']) - 1:
                # Not last chapter - extend for fade out
                extract_duration = chapter_duration + fade_duration
            else:
                # Last chapter - extend for outro transition
                extract_duration = chapter_duration + fade_duration
            
            video_parts.append(f"[1:v]trim={original_start}:{original_start + extract_duration},setpts=PTS-STARTPTS[chapter_{i+1}]")
    
    # 3. B-roll outro
    if broll_video_duration >= broll_outro:
        video_parts.append(f"[0:v]trim=0:{broll_outro},setpts=PTS-STARTPTS[broll_outro]")
    else:
        # Use all available b-roll + freeze frame
        video_parts.append(f"[0:v]trim=0:{broll_video_duration},setpts=PTS-STARTPTS[broll_outro_real]")
        freeze_duration = broll_outro - broll_video_duration
        video_parts.append(f"[0:v]trim={broll_video_duration-0.1}:{broll_video_duration},setpts=PTS-STARTPTS,loop=loop=-1:size=1:start=0,trim=0:{freeze_duration}[broll_outro_freeze]")
        video_parts.append("[broll_outro_real][broll_outro_freeze]concat=n=2:v=1:a=0[broll_outro]")
    
    # 4. Combine all video parts with crossfades
    concat_inputs = ["[broll_intro]"]
    for i in range(len(assets['chapter_audio'])):
        concat_inputs.append(f"[chapter_{i+1}]")
    concat_inputs.append("[broll_outro]")
    
    # Create crossfade transitions
    current_label = "broll_intro"
    for i in range(len(assets['chapter_audio'])):
        next_label = f"chapter_{i+1}"
        fade_label = f"fade_{i+1}"
        video_parts.append(f"[{current_label}][{next_label}]xfade=transition=fade:duration={fade_duration}:offset={broll_intro if i == 0 else 0}[{fade_label}]")
        current_label = fade_label
    
    # Final fade to outro
    final_fade_label = f"fade_outro"
    video_parts.append(f"[{current_label}][broll_outro]xfade=transition=fade:duration={fade_duration}:offset=0[{final_fade_label}]")
    
    # Audio mixing
    audio_parts = []
    
    # Background music (full duration, low volume)
    total_duration = assets['timing']['total_video']
    audio_parts.append(f"[{background_music_input}:a]volume=0.3,atrim=0:{total_duration}[bg_music]")
    
    # B-roll music intro with fade out
    intro_end = broll_intro + fade_duration
    audio_parts.append(f"[{broll_music_input}:a]volume=0.8,atrim=0:{intro_end},afade=t=out:st={broll_intro}:d={fade_duration}[broll_intro_audio]")
    
    # Chapter audio with gaps
    chapter_audio_parts = ["[broll_intro_audio]"]
    current_audio_time = intro_end
    
    for i, chapter_audio in enumerate(assets['chapter_audio']):
        chapter_input = chapter_input_map[chapter_audio['index']]
        chapter_duration = chapter_audio['duration']
        
        # Add silence gap
        if i > 0:  # No gap before first chapter
            gap_duration = assets['timing']['chapter_gap']
            audio_parts.append(f"aevalsrc=0:d={gap_duration}[gap_{i}]")
            chapter_audio_parts.append(f"[gap_{i}]")
        
        # Add chapter audio
        audio_parts.append(f"[{chapter_input}:a]volume=1.0[chapter_audio_{i+1}]")
        chapter_audio_parts.append(f"[chapter_audio_{i+1}]")
    
    # B-roll outro music with fade in
    outro_start = assets['timing']['total_content'] - fade_duration
    outro_duration = broll_outro + fade_duration
    broll_outro_trim_start = assets['music']['broll_duration'] - outro_duration
    if broll_outro_trim_start < 0:
        broll_outro_trim_start = 0
    
    audio_parts.append(f"[{broll_music_input}:a]volume=0.8,atrim={broll_outro_trim_start}:{broll_outro_trim_start + outro_duration},afade=t=in:st=0:d={fade_duration}[broll_outro_audio]")
    chapter_audio_parts.append("[broll_outro_audio]")
    
    # Concatenate all audio parts
    audio_parts.append(f"{''.join(chapter_audio_parts)}concat=n={len(chapter_audio_parts)}:v=0:a=1[voice_track]")
    
    # Mix background music with voice track
    audio_parts.append("[bg_music][voice_track]amix=inputs=2:duration=longest[final_audio]")
    
    # Combine all filter parts
    all_filter_parts = video_parts + audio_parts
    filter_complex = '; '.join(all_filter_parts)
    
    # Build complete FFmpeg command
    cmd = ['ffmpeg'] + inputs + [
        '-filter_complex', filter_complex,
        '-map', f'[{final_fade_label}]',  # Final video
        '-map', '[final_audio]',          # Final audio
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-y',  # Overwrite output
        str(output_file)
    ]
    
    # Save command for debugging
    cmd_file = directory / f"{assets['base_name']}_ffmpeg_command.txt"
    with open(cmd_file, 'w') as f:
        f.write(' '.join([f'"{arg}"' if ' ' in arg else arg for arg in cmd]))
    print(f"✓ FFmpeg command saved: {cmd_file}")
    
    return cmd

def render_video_with_ffmpeg(cmd, output_file):
    """Execute FFmpeg command to render video."""
    try:
        print("Rendering video with FFmpeg...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)  # 10 minute timeout
        
        if result.returncode == 0:
            print(f"✓ Video rendered successfully: {output_file}")
            
            # Get output file info
            info_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(output_file)]
            info_result = subprocess.run(info_cmd, capture_output=True, text=True)
            if info_result.returncode == 0:
                duration = float(info_result.stdout.strip())
                print(f"  Duration: {duration:.1f} seconds")
            
            return True
        else:
            print(f"✗ FFmpeg failed:")
            print(f"STDERR: {result.stderr}")
            print(f"STDOUT: {result.stdout}")
            return False
            
    except subprocess.TimeoutExpired:
        print("✗ FFmpeg rendering timed out (10 minutes)")
        return False
    except Exception as e:
        print(f"✗ Error running FFmpeg: {e}")
        return False

def process_video_creation(base_name, directory):
    """Process complete video creation with FFmpeg."""
    print(f"Creating video for: {base_name}")
    print("="*60)
    
    # Analyze assets
    assets = analyze_video_assets(base_name, directory)
    if not assets:
        return False
    
    # Create output filename
    output_file = directory / f"{base_name}_final_video.mp4"
    
    # Generate FFmpeg command
    cmd = create_ffmpeg_video(assets, directory, output_file)
    
    # Render video
    success = render_video_with_ffmpeg(cmd, output_file)
    
    if success:
        print(f"\n" + "="*60)
        print("VIDEO CREATION COMPLETED!")
        print("="*60)
        print(f"Final video: {output_file}")
        print(f"Duration: {assets['timing']['total_video']:.1f} seconds")
        print(f"Chapters: {len(assets['chapter_audio'])}")
        print("Features:")
        print("- Smooth crossfade transitions")
        print("- Proper audio mixing")
        print("- No fade-to-black gaps")
        print("- Generic timing system")
    
    return success

def find_base_names(directory):
    """Find all base names that have all required assets."""
    directory_path = Path(directory)
    base_names = []
    
    # Look for video files with matching audio chapters
    for video_file in directory_path.glob("*.mp4"):
        base_name = video_file.stem
        
        # Check if has chapter audio files
        has_chapters = False
        for i in range(1, 4):  # Check for at least 1 chapter
            audio_file = directory_path / f"{base_name}_{i}.wav"
            if audio_file.exists():
                has_chapters = True
                break
        
        # Check if has music and b-roll files
        broll_music = directory_path / "b-roll.mp3"
        broll_video = directory_path / "b-roll.mp4"
        background_music = directory_path / "background.mp3"
        
        if has_chapters and broll_music.exists() and broll_video.exists() and background_music.exists():
            base_names.append(base_name)
    
    return sorted(base_names)

def main():
    """Main function."""
    if len(sys.argv) != 2:
        print("Usage: python 9_create_ffmpeg_video.py <directory>")
        print("Example: python 9_create_ffmpeg_video.py temp-assets/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    
    if not directory.exists() or not directory.is_dir():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    # Find files to process
    base_names = find_base_names(directory)
    
    if not base_names:
        print(f"✗ No complete video projects found in: {directory}")
        print("Required files:")
        print("  - {name}.mp4 (original video)")
        print("  - {name}_1.wav, {name}_2.wav, etc. (chapter audio)")
        print("  - b-roll.mp3 (intro/outro music)")
        print("  - b-roll.mp4 (intro/outro video)")
        print("  - background.mp3 (voice-over background music)")
        sys.exit(1)
    
    print(f"Found {len(base_names)} complete video project(s)")
    print("Projects:")
    for name in base_names:
        print(f"  - {name}")
    print()
    
    # Process each project
    successful_projects = []
    failed_projects = []
    
    for base_name in base_names:
        success = process_video_creation(base_name, directory)
        
        if success:
            successful_projects.append(base_name)
        else:
            failed_projects.append(base_name)
        
        print()
    
    # Final summary
    print("="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print(f"Total projects processed: {len(base_names)}")
    print(f"Successful: {len(successful_projects)}")
    print(f"Failed: {len(failed_projects)}")
    
    if successful_projects:
        print("\n✓ Successfully created:")
        for project in successful_projects:
            print(f"  - {project}_final_video.mp4")
    
    if failed_projects:
        print("\n✗ Failed to create:")
        for project in failed_projects:
            print(f"  - {project}")

if __name__ == "__main__":
    main()