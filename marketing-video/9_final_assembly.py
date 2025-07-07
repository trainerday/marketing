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
        # B-roll intro (10 seconds) - use ProRes version for compatibility
        broll_file = source_temp_dir / "b-roll_prores.mov"
        if not broll_file.exists():
            # Convert original B-roll to ProRes if needed
            original_broll = directory / "original-content/b-roll.mp4"
            if original_broll.exists():
                print(f"  Converting B-roll to ProRes format...")
                cmd = [
                    'ffmpeg', '-i', str(original_broll),
                    '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
                    '-r', '30', '-an', '-y', str(broll_file)
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"  ✗ Failed to convert B-roll: {result.stderr}")
                    return None
            else:
                print(f"  ⚠ B-roll file not found: {original_broll}")
                print(f"  Please download 10-second b-roll from Artgrid and save as: {original_broll}")
                return None
        
        f.write(f"file '{broll_file.resolve()}'\n")
        
        # Chapter videos
        timed_videos_dir = source_temp_dir / "timed_chapter_videos"
        for timing in chapter_timings:
            chapter_num = timing['chapter']
            chapter_file = timed_videos_dir / f"chapter_{chapter_num}.mov"
            if chapter_file.exists():
                f.write(f"file '{chapter_file.resolve()}'\n")
            else:
                print(f"  ✗ Chapter video not found: {chapter_file}")
                return None
        
        # B-roll outro (10 seconds) - reuse same ProRes b-roll
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
    chapters_dir = temp_dir / "chapters"
    with open(voice_concat_list, 'w') as f:
        for timing in chapter_timings:
            chapter_num = timing['chapter']
            chapter_audio = chapters_dir / f"chapter_{chapter_num}.wav"
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

def generate_overlays(directory, config, temp_dir):
    """Generate all overlay assets from config."""
    overlays = {}
    
    # Generate title overlay
    print("  Generating title overlay...")
    template_file = Path("assets/video_title_template.svg")
    title_svg = temp_dir / "title_overlay.svg"
    title_png = temp_dir / "title_overlay.png"
    
    try:
        # Read template and replace placeholders
        with open(template_file, 'r') as f:
            svg_content = f.read()
        
        title_line1 = config.get('branding', {}).get('title_line1', 'DEFAULT TITLE')
        title_line2 = config.get('branding', {}).get('title_line2', 'DEFAULT SUBTITLE')
        
        svg_content = svg_content.replace('{{TITLE_LINE1}}', title_line1)
        svg_content = svg_content.replace('{{TITLE_LINE2}}', title_line2)
        
        # Write customized SVG
        with open(title_svg, 'w') as f:
            f.write(svg_content)
        
        # Convert to PNG
        cmd = ['rsvg-convert', '--background-color=transparent', str(title_svg)]
        with open(title_png, 'wb') as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE)
        
        if result.returncode == 0:
            overlays['title'] = title_png
            print(f"    ✓ Title: {title_line1} / {title_line2}")
        else:
            print(f"    ✗ Failed to convert title SVG: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"    ✗ Error generating title overlay: {e}")
        return None
    
    # Logo overlay
    logo_path = Path("assets/logos/td.png")
    if logo_path.exists():
        overlays['logo'] = logo_path
        print(f"    ✓ Logo: {logo_path}")
    else:
        print(f"    ⚠ Logo not found: {logo_path}")
    
    return overlays

def combine_final_video(concat_list, voice_track, background_music, overlays, output_file):
    """Combine video with audio tracks and overlays in single pass."""
    
    # Build FFmpeg command with overlays
    inputs = [
        '-f', 'concat', '-safe', '0', '-i', str(concat_list),  # 0: video
        '-i', str(voice_track),                                 # 1: voice
        '-i', str(background_music)                            # 2: music
    ]
    
    input_index = 3
    filter_parts = []
    
    # Start with base video
    current_video = '[0:v]'
    
    # Add title overlay (first 5 seconds)
    if 'title' in overlays:
        inputs.extend(['-i', str(overlays['title'])])
        filter_parts.append(f'{current_video}[{input_index}:v]overlay=0:0:enable=\'between(t,0,5)\'[titled]')
        current_video = '[titled]'
        input_index += 1
    
    # Add logo overlay (first 5 seconds, top-right)
    if 'logo' in overlays:
        inputs.extend(['-i', str(overlays['logo'])])
        filter_parts.append(f'{current_video}[{input_index}:v]overlay=W-w-20:-20:enable=\'between(t,0,5)\'[final_video]')
        current_video = '[final_video]'
        input_index += 1
    else:
        # Rename current for consistency
        filter_parts.append(f'{current_video}copy[final_video]')
        current_video = '[final_video]'
    
    # Audio mixing
    filter_parts.append('[1:a][2:a]amix=inputs=2:duration=longest[final_audio]')
    
    # Combine all filters
    filter_complex = '; '.join(filter_parts)
    
    # Complete FFmpeg command
    cmd = [
        'ffmpeg'
    ] + inputs + [
        '-filter_complex', filter_complex,
        '-map', current_video, '-map', '[final_audio]',
        '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
        '-c:a', 'pcm_s16le',
        '-y', str(output_file)
    ]
    
    return run_command(cmd, "Final assembly with overlays")

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
    
    # Load timing data and config
    with open(timing_file, 'r') as f:
        timing_data = json.load(f)
    
    config_file = directory / "video-template.json"
    with open(config_file, 'r') as f:
        config = json.load(f)
    
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
    
    # Generate overlays
    print("\nGenerating overlays...")
    overlays = generate_overlays(directory, config, temp_final_dir)
    if not overlays:
        sys.exit(1)
    
    # Final assembly with overlays
    final_output_dir = directory / "final-output"
    final_output_dir.mkdir(exist_ok=True)
    output_file = final_output_dir / "final_video.mov"
    
    if combine_final_video(concat_list, voice_track, background_music_file, overlays, output_file):
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