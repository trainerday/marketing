#!/usr/bin/env python3
"""
Step 9.1: Final Assembly and Add Overlays
- Combine background music, b-roll intro/outro, and chapter files
- Add title and logo overlays with precise timing
- Optimized single-pass audio mixing (voice + background music)
- Output professional ProRes 422 final video
"""

import sys
import json
import subprocess
from pathlib import Path

# Assembly template will be loaded from JSON file - no hardcoded config

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

def create_video_concat_list(directory, timing_data, temp_dir, output_temp_dir, assembly_template=None):
    """Create concatenation list for videos."""
    chapter_timings = timing_data['chapter_timings']
    
    # Create concat list
    concat_list = output_temp_dir / "video_concat.txt"
    
    # Prepare all file paths BEFORE opening the text file
    prores_dir = temp_dir / "temp_prores"
    prores_dir.mkdir(exist_ok=True)
    intro1_file = prores_dir / "intro1_prores.mov"
    outro1_file = prores_dir / "outro1_prores.mov"
    broll_file = prores_dir / "b-roll_prores.mov"
    broll_outro_file = prores_dir / "b-roll_outro_prores.mov"
    
    # Load project config to get b-roll path
    project_config_file = directory / "project-config.json"
    b_roll_path = "original-content/b-roll.mp4"  # fallback
    if project_config_file.exists():
        with open(project_config_file, 'r') as f:
            project_config = json.load(f)
            b_roll_path = project_config.get('b_roll_video', b_roll_path)
    
    # Convert intro1.mov to ProRes if needed
    if not intro1_file.exists():
        original_intro1 = directory.parent / "assets/intros-and-outros/intro1.mov"
        if original_intro1.exists():
            print(f"  Converting intro1 to ProRes format...")
            cmd = [
                'ffmpeg', '-i', str(original_intro1),
                '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
                '-r', '30', '-an', '-y', str(intro1_file)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"  ✗ Failed to convert intro1: {result.stderr}")
                return None
        else:
            print(f"  ⚠ intro1 file not found: {original_intro1}")
            print(f"  Please ensure intro1.mov exists in assets/intros-and-outros/")
            return None
    
    # Convert outro1.mov to ProRes if needed
    if not outro1_file.exists():
        original_outro1 = directory.parent / "assets/intros-and-outros/outro1.mov"
        if original_outro1.exists():
            print(f"  Converting outro1 to ProRes format...")
            cmd = [
                'ffmpeg', '-i', str(original_outro1),
                '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
                '-r', '30', '-an', '-y', str(outro1_file)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"  ✗ Failed to convert outro1: {result.stderr}")
                return None
        else:
            print(f"  ⚠ outro1 file not found: {original_outro1}")
            print(f"  Please ensure outro1.mov exists in assets/intros-and-outros/")
            return None
    
    # Convert and trim B-roll to match assembly template duration
    if not broll_file.exists():
        original_broll = directory.parent / b_roll_path
        if original_broll.exists():
            # Get b-roll duration from assembly template
            if assembly_template:
                # Calculate intro broll duration: total beginning - hello message duration
                # Since hello message is auto_detected, we'll use the default from template
                broll_duration_config = assembly_template["video_sections"]["beginning"]["total_duration"]
                # Subtract estimated intro1 duration (will be auto-detected later)
                broll_duration_config = 6.68  # Use template default for now
            else:
                broll_duration_config = 6.68  # fallback
            print(f"  Converting B-roll to ProRes format ({broll_duration_config} seconds)...")
            print(f"  Using b-roll: {b_roll_path}")
            cmd = [
                'ffmpeg', '-i', str(original_broll),
                '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
                '-r', '30', '-t', str(broll_duration_config), '-an', '-y', str(broll_file)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"  ✗ Failed to convert B-roll: {result.stderr}")
                return None
        else:
            print(f"  ⚠ B-roll file not found: {original_broll}")
            print(f"  Please check project-config.json b_roll_video path: {b_roll_path}")
            return None
    
    # Write concat list to file
    with open(concat_list, 'w') as f:
        # Add b-roll (6.68s) then intro1 (4.32s) 
        f.write(f"file '{broll_file.resolve()}'\n")
        f.write(f"file '{intro1_file.resolve()}'\n")
        
        # Chapter videos
        timed_videos_dir = temp_dir / "timed_chapters"
        for timing in chapter_timings:
            chapter_num = timing['chapter']
            chapter_file = timed_videos_dir / f"chapter_{chapter_num}.mov"
            if chapter_file.exists():
                f.write(f"file '{chapter_file.resolve()}'\n")
            else:
                print(f"  ✗ Chapter video not found: {chapter_file}")
                return None
        
        # Outro talking head (3 seconds)
        f.write(f"file '{outro1_file.resolve()}'\n")
        
        # B-roll outro (5 seconds) - final b-roll with fade out
        if not broll_outro_file.exists():
            original_broll = directory.parent / b_roll_path
            if original_broll.exists():
                print(f"  Converting B-roll outro to ProRes format (5 seconds)...")
                cmd = [
                    'ffmpeg', '-i', str(original_broll),
                    '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
                    '-r', '30', '-t', '5', '-an', '-y', str(broll_outro_file)
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"  ✗ Failed to convert B-roll outro: {result.stderr}")
                    return None
            else:
                print(f"  ⚠ B-roll file not found for outro: {original_broll}")
                return None
        
        f.write(f"file '{broll_outro_file.resolve()}'\n")
    
    return concat_list

def extract_talking_head_audio(directory, temp_dir):
    """Use pre-processed intro1 and outro1 audio from processed_voice directory."""
    # Use pre-processed audio files instead of extracting from video
    intro1_audio = temp_dir / "processed_voice" / "intro1_processed.wav"
    outro1_audio = temp_dir / "processed_voice" / "outro1_processed.wav"
    
    # Check intro1 audio
    if intro1_audio.exists():
        print(f"  ✓ intro1 audio found: {intro1_audio}")
    else:
        print(f"  ⚠ intro1 processed audio not found: {intro1_audio}")
        intro1_audio = None
    
    # Check outro1 audio
    if outro1_audio.exists():
        print(f"  ✓ outro1 audio found: {outro1_audio}")
    else:
        print(f"  ⚠ outro1 processed audio not found: {outro1_audio}")
        outro1_audio = None
    
    return intro1_audio, outro1_audio

def create_audio_inputs_for_filter(directory, timing_data, temp_dir):
    """Prepare audio input files for single-pass filter processing."""
    chapter_timings = timing_data['chapter_timings']
    chapters_dir = temp_dir / "timed_chapters"
    
    # Extract talking head audio (intro1 and outro1)
    intro1_audio, outro1_audio = extract_talking_head_audio(directory, temp_dir)
    if not intro1_audio:
        print("  ⚠ Proceeding without intro1 audio")
    if not outro1_audio:
        print("  ⚠ Proceeding without outro1 audio")
    
    # Verify all chapter audio files exist
    chapter_files = []
    for timing in chapter_timings:
        chapter_num = timing['chapter']
        chapter_audio = chapters_dir / f"chapter_{chapter_num}.wav"
        if chapter_audio.exists():
            chapter_files.append(chapter_audio)
        else:
            print(f"  ✗ Chapter audio not found: {chapter_audio}")
            return None, None, None
    
    return intro1_audio, outro1_audio, chapter_files

def generate_overlays(directory, config, temp_dir):
    """Generate all overlay assets from config."""
    overlays = {}
    
    # Generate title overlay
    print("  Generating title overlay...")
    template_file = directory.parent / "video-templates/video_title_template.svg"
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
    logo_path = directory.parent / "assets/logos/td.png"
    if logo_path.exists():
        overlays['logo'] = logo_path
        print(f"    ✓ Logo: {logo_path}")
    else:
        print(f"    ⚠ Logo not found: {logo_path}")
    
    return overlays

def combine_final_video_optimized(concat_list, intro1_audio, outro1_audio, chapter_audio_files, background_music, overlays, timing_data, output_file, temp_dir, config, assembly_template):
    """Combine video with audio tracks and overlays in single pass using filter graphs."""
    
    # Build FFmpeg inputs
    inputs = ['-f', 'concat', '-safe', '0', '-i', str(concat_list)]  # 0: video
    
    # Add intro1 audio if available
    current_index = 1
    intro1_index = None
    if intro1_audio:
        inputs.extend(['-i', str(intro1_audio)])
        intro1_index = current_index
        current_index += 1
    
    # Add outro1 audio if available
    outro1_index = None
    if outro1_audio:
        inputs.extend(['-i', str(outro1_audio)])
        outro1_index = current_index
        current_index += 1
    
    # Add chapter audio inputs
    chapter_audio_indices = []
    for audio_file in chapter_audio_files:
        inputs.extend(['-i', str(audio_file)])
        chapter_audio_indices.append(current_index)
        current_index += 1
    
    # Add background music
    music_index = current_index
    inputs.extend(['-i', str(background_music)])
    current_index += 1
    
    # Add b-roll music if available
    broll_music_file = temp_dir / "temp_broll_intro.wav"
    broll_music_index = None
    if broll_music_file.exists():
        inputs.extend(['-i', str(broll_music_file)])
        broll_music_index = current_index
        current_index += 1
    
    # Add overlay inputs
    input_index = current_index
    overlay_indices = {}
    if 'title' in overlays:
        inputs.extend(['-i', str(overlays['title'])])
        overlay_indices['title'] = input_index
        input_index += 1
    if 'logo' in overlays:
        inputs.extend(['-i', str(overlays['logo'])])
        overlay_indices['logo'] = input_index
        input_index += 1
    
    # Build filter complex for single-pass processing
    filter_parts = []
    
    # Audio processing: combine intro1 + chapters + outro1 with proper timing
    # Calculate actual durations from video files instead of hardcoding
    
    # Get actual B-roll duration
    broll_file = temp_dir / "temp_prores" / "b-roll_prores.mov"
    if broll_file.exists():
        result = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(broll_file)], capture_output=True, text=True)
        broll_duration = float(result.stdout.strip()) if result.returncode == 0 else 6.68
    else:
        broll_duration = 6.68  # fallback
    
    # Get actual intro1 duration  
    intro1_file = temp_dir / "temp_prores" / "intro1_prores.mov"
    if intro1_file.exists():
        result = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(intro1_file)], capture_output=True, text=True)
        intro1_duration = float(result.stdout.strip()) if result.returncode == 0 else 4.32
    else:
        intro1_duration = 4.32  # fallback
    
    intro1_start_time = broll_duration  # intro1 audio starts when intro1 video starts
    intro_duration = broll_duration + intro1_duration  # Total intro section = b-roll + intro1
    chapter_start_time = intro_duration  # Chapters start immediately after intro section
    
    # Calculate outro1 timing - starts after chapters end
    total_chapter_duration = sum(timing['duration'] for timing in timing_data['chapter_timings'])
    outro1_start_time = chapter_start_time + total_chapter_duration
    
    intro1_delay_ms = int(intro1_start_time * 1000)  # intro1 starts at 6.68s
    chapter_delay_ms = int(chapter_start_time * 1000)  # chapters start at 12s
    outro1_delay_ms = int(outro1_start_time * 1000)  # outro1 starts after chapters
    
    # Build complete voice track: intro1 + chapters + outro1 with dynamic timing
    voice_streams = []
    
    # Add intro1 audio with calculated delay
    if intro1_index:
        filter_parts.append(f'[{intro1_index}:a]adelay={intro1_delay_ms}|{intro1_delay_ms}[intro1_delayed]')
        voice_streams.append('[intro1_delayed]')
    
    # Add chapter audio with calculated delay
    if chapter_audio_indices:
        if len(chapter_audio_indices) > 1:
            chapter_concat_inputs = ''.join(f'[{i}:a]' for i in chapter_audio_indices)
            filter_parts.append(f'{chapter_concat_inputs}concat=n={len(chapter_audio_indices)}:v=0:a=1[chapters_concat]')
            chapters_stream = '[chapters_concat]'
        else:
            chapters_stream = f'[{chapter_audio_indices[0]}:a]'
        
        filter_parts.append(f'{chapters_stream}adelay={chapter_delay_ms}|{chapter_delay_ms}[chapters_delayed]')
        voice_streams.append('[chapters_delayed]')
    
    # Add outro1 audio with calculated delay
    if outro1_index:
        filter_parts.append(f'[{outro1_index}:a]adelay={outro1_delay_ms}|{outro1_delay_ms}[outro1_delayed]')
        voice_streams.append('[outro1_delayed]')
    
    # Mix all voice streams together at full volume (prevent auto-reduction)
    if len(voice_streams) > 1:
        voice_inputs = ''.join(voice_streams)
        # Use amix with normalize=0 to prevent automatic volume reduction
        filter_parts.append(f'{voice_inputs}amix=inputs={len(voice_streams)}:duration=longest:normalize=0[voice_complete]')
        voice_stream = '[voice_complete]'
    elif len(voice_streams) == 1:
        voice_stream = voice_streams[0]
    else:
        # No voice audio available
        voice_stream = None
    
    # Create complete audio track: b-roll music (intro) + voice+bg music (middle) + b-roll music (outro)
    if broll_music_index:
        # B-roll music for intro section with configurable fade down when intro1 voice starts
        # Get configuration from assembly template
        beginning_music = assembly_template["music_sections"]["beginning_music"]
        end_music = assembly_template["music_sections"]["end_music"]
        
        fade_start_time = broll_duration  # Start fade when intro1 voice begins
        fade_duration = beginning_music.get("fade_out", {}).get("duration", 1.0)
        
        # Get b-roll volume from project config, fallback to beginning music volume
        broll_full_volume = config.get('audio_levels', {}).get('b_roll_music_volume', beginning_music["volume"])
        broll_reduced_volume = 0.3  # Reduced volume during voice sections
        
        # Create b-roll intro music with proper volume levels
        # Full volume during b-roll, reduced volume during intro1 voice
        filter_parts.append(f'[{broll_music_index}:a]atrim=start=0:end={intro_duration},volume=enable=\'lt(t,{fade_start_time})\':volume={broll_full_volume},volume=enable=\'gte(t,{fade_start_time})\':volume={broll_reduced_volume}[broll_intro_music]')
        
        # B-roll music for outro section (starts after outro1 voice ends)
        # Get actual outro1 duration if available
        outro1_audio_duration = 3.0  # fallback
        if outro1_audio and outro1_audio.exists():
            try:
                result = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(outro1_audio)], capture_output=True, text=True)
                if result.returncode == 0:
                    outro1_audio_duration = float(result.stdout.strip())
            except:
                pass  # Use fallback
        
        broll_outro_start = outro1_start_time + outro1_audio_duration
        broll_outro_start_ms = int(broll_outro_start * 1000)
        filter_parts.append(f'[{broll_music_index}:a]atrim=start=0:end=5,adelay={broll_outro_start_ms}|{broll_outro_start_ms}[broll_outro_music]')
        
        # Background music timing from assembly template
        chapters_music = assembly_template["music_sections"]["chapters_music"]
        bg_volume = config.get('audio_levels', {}).get('background_music_volume', chapters_music["volume"])
        
        # Background music starts with chapters (from assembly template)
        bg_start_delay_ms = chapter_delay_ms
        
        # Apply background music with calculated delay
        filter_parts.append(f'[{music_index}:a]volume={bg_volume},adelay={bg_start_delay_ms}|{bg_start_delay_ms}[music_low]')
        
        # Combine all audio layers:
        # - broll_intro_music: plays during intro section (full volume) and intro1 voice (reduced volume)
        # - voice_stream: intro1 + chapters + outro1 voices at full volume with proper delays  
        # - music_low: background music only during chapters (delayed)
        # - broll_outro_music: plays during outro section
        filter_parts.append(f'[broll_intro_music]{voice_stream}[music_low][broll_outro_music]amix=inputs=4:duration=longest:normalize=0[final_audio]')
    else:
        # Fallback: no b-roll music available, use background music only
        chapters_music = assembly_template["music_sections"]["chapters_music"]
        bg_volume = config.get('audio_levels', {}).get('background_music_volume', chapters_music["volume"])
        filter_parts.append(f'[{music_index}:a]volume={bg_volume}[music_low]')
        if voice_stream:
            filter_parts.append(f'{voice_stream}[music_low]amix=inputs=2:duration=longest:normalize=0[final_audio]')
        else:
            filter_parts.append(f'[music_low]copy[final_audio]')
    
    # Video processing: start with base video
    current_video = '[0:v]'
    
    # Add title overlay (until end of beginning section)
    overlay_end_time = intro_duration  # End when intro section ends (calculated from actual file durations)
    if 'title' in overlay_indices:
        filter_parts.append(f'{current_video}[{overlay_indices["title"]}:v]overlay=0:0:enable=\'between(t,0,{overlay_end_time})\'[titled]')
        current_video = '[titled]'
    
    # Add logo overlay (until end of beginning section, top-right)
    if 'logo' in overlay_indices:
        filter_parts.append(f'{current_video}[{overlay_indices["logo"]}:v]overlay=W-w-20:20:enable=\'between(t,0,{overlay_end_time})\'[final_video]')
        current_video = '[final_video]'
    else:
        # Rename current for consistency
        filter_parts.append(f'{current_video}copy[final_video]')
        current_video = '[final_video]'
    
    # Combine all filters
    filter_complex = '; '.join(filter_parts)
    
    # Debug: Print the filter complex
    print(f"  Debug: Filter complex:")
    for i, part in enumerate(filter_parts):
        print(f"    {i+1}: {part}")
    print(f"  Debug: intro1_start_time={intro1_start_time}, chapter_start_time={chapter_start_time}")
    print(f"  Debug: intro1_index={intro1_index}, outro1_index={outro1_index}")
    
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
    
    return run_command(cmd, "Single-pass final assembly with optimized audio processing")

def main():
    if len(sys.argv) != 2:
        print("Usage: python 9_final_assembly_and_add_overlays.py <directory>")
        print("Example: python 9_final_assembly_and_add_overlays.py current-project/")
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
    timed_videos_dir = temp_dir / "timed_chapters"
    
    if not timing_file.exists():
        print(f"✗ Timing file not found: {timing_file}")
        print("Run step 5 first: python 5_audio_timing.py temp-assets/")
        sys.exit(1)
    
    if not background_music_file.exists():
        print(f"✗ Background music not found: {background_music_file}")
        print("Run step 7 first: python 7_create_background_music.py current-project/")
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
    
    config_file = directory / "project-config.json"
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    # Load assembly template from config
    assembly_template_name = config.get('assembly_template', 'assembly-template1.json')
    assembly_template_file = directory.parent / "video-templates" / assembly_template_name
    
    if not assembly_template_file.exists():
        print(f"✗ Assembly template not found: {assembly_template_file}")
        sys.exit(1)
    
    with open(assembly_template_file, 'r') as f:
        assembly_template = json.load(f)
    
    # Create temp directory for final assembly
    temp_final_dir = temp_dir / "temp_final"
    temp_final_dir.mkdir(exist_ok=True)
    
    # Debug: Don't clean up temp files so we can inspect them
    debug_mode = True
    
    # Create video concatenation list
    concat_list = create_video_concat_list(directory, timing_data, temp_dir, temp_final_dir, assembly_template)
    if not concat_list:
        sys.exit(1)
    
    # Prepare audio inputs for optimized processing  
    intro1_audio, outro1_audio, chapter_audio_files = create_audio_inputs_for_filter(directory, timing_data, temp_dir)
    if not chapter_audio_files:
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
    
    if combine_final_video_optimized(concat_list, intro1_audio, outro1_audio, chapter_audio_files, background_music_file, overlays, timing_data, output_file, temp_dir, config, assembly_template):
        # Clean up temp files (disabled for debug)
        if not debug_mode:
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
            print(f"  Structure: B-roll (6.7s) + Intro1 talking (4.3s) → Chapters → B-roll outro (10s)")
            print(f"  Audio: Voice + Background music")
            print(f"  Chapters: {len(timing_data['chapter_timings'])}")
        
        print(f"\n🚀 READY FOR UPLOAD!")
        print(f"   Video file: {output_file}")
    else:
        print("\n✗ Final assembly failed")
        sys.exit(1)

if __name__ == "__main__":
    main()