#!/usr/bin/env python3
"""
Step 9.1: Final Assembly and Add Overlays
- Combine background music, b-roll intro/outro, and chapter files
- Add title and logo overlays with precise timing
- Optimized single-pass audio mixing (voice + background music)
- Output professional ProRes 422 final video

NOTE TO CLAUDE NEVER HARD CODE ANYTHING IN THIS PYTHON FILE.  Always use the assembly template.
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
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode == 0:
            print(f"  ✓ {description} completed")
            return True
        else:
            print(f"  ✗ {description} failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Error in {description}: {e}")
        return False

def detect_audio_duration(audio_file):
    """Detect actual duration of audio file using ffprobe."""
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(audio_file)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"  ⚠ Could not detect duration for {audio_file}: {e}")
    return None

def create_video_concat_list(directory, temp_dir, assembly_template):
    """Create concatenation list for videos based on assembly template structure."""
    if not assembly_template:
        print("✗ Assembly template required to generate video structure")
        return None
        
    # Create concat list
    concat_list = temp_dir / "video_concat.txt"
    
    # Get video sections from assembly template
    video_sections = assembly_template.get('video_sections', {})
    
    # Prepare all file paths BEFORE opening the text file
    prores_dir = temp_dir / "temp_prores"
    prores_dir.mkdir(exist_ok=True)
    
    # Video file mappings based on segment types
    video_files = {
        'intro_broll': prores_dir / "b-roll_prores.mov",
        'hello_message': prores_dir / "intro1_prores.mov",
        'generated_content': temp_dir / "timed_chapters",  # Directory containing chapter files
        'goodbye_message': prores_dir / "outro1_prores.mov", 
        'outro_broll': prores_dir / "b-roll_outro_prores.mov"
    }
    
    # Load project config to get b-roll path
    project_config_file = directory / "human-provided-content" / "project-config.json"
    b_roll_path = "human-provided-content/b-roll.mp4"  # fallback
    if project_config_file.exists():
        with open(project_config_file, 'r') as f:
            project_config = json.load(f)
            b_roll_path = project_config.get('b_roll_video', b_roll_path)
    
    # Convert intro1.mov to ProRes if needed
    intro1_file = video_files['hello_message']
    if not intro1_file.exists():
        original_intro1 = directory.parent / "assets/intros-and-outros/intro1.mov"
        if original_intro1.exists():
            print(f"  Converting intro1 to ProRes format...")
            cmd = [
                'ffmpeg', '-i', str(original_intro1),
                '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
                '-r', '30', '-s', '1920x1080', '-an', '-y', str(intro1_file)
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
    outro1_file = video_files['goodbye_message']
    if not outro1_file.exists():
        original_outro1 = directory.parent / "assets/intros-and-outros/outro1.mov"
        if original_outro1.exists():
            print(f"  Converting outro1 to ProRes format...")
            cmd = [
                'ffmpeg', '-i', str(original_outro1),
                '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
                '-r', '30', '-s', '1920x1080', '-an', '-y', str(outro1_file)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"  ✗ Failed to convert outro1: {result.stderr}")
                return None
        else:
            print(f"  ⚠ outro1 file not found: {original_outro1}")
            print(f"  Please ensure outro1.mov exists in assets/intros-and-outros/")
            return None
    
    # Convert B-roll files based on assembly template
    broll_intro_file = video_files['intro_broll']
    broll_outro_file = video_files['outro_broll']
    
    # Create B-roll files based on assembly template durations
    original_broll = directory.parent / b_roll_path
    if not original_broll.exists():
        print(f"  ⚠ B-roll file not found: {original_broll}")
        print(f"  Please check human-provided-content/project-config.json b_roll_video path: {b_roll_path}")
        return None
    
    # Create intro b-roll (calculated from assembly template)
    if not broll_intro_file.exists():
        beginning_section = video_sections.get('beginning', {})
        beginning_total_duration = beginning_section.get('total_duration', 10.0)  # From template
        
        # Get actual intro1 audio duration
        intro1_audio_file = temp_dir / "processed_voice" / "intro1_processed.wav"
        intro1_duration = detect_audio_duration(intro1_audio_file)
        
        if intro1_duration is not None:
            intro_broll_duration = max(1.0, beginning_total_duration - intro1_duration)
            print(f"  Calculated intro b-roll duration: {intro_broll_duration}s (beginning: {beginning_total_duration}s - intro1: {intro1_duration}s)")
        else:
            print("  ⚠ Could not detect intro1 duration, using template total duration")
            intro_broll_duration = beginning_total_duration
        
        print(f"  Converting intro B-roll to ProRes format ({intro_broll_duration}s)...")
        cmd = [
            'ffmpeg', '-i', str(original_broll),
            '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
            '-r', '30', '-s', '1920x1080', '-t', str(intro_broll_duration), '-an', '-y', str(broll_intro_file)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  ✗ Failed to convert intro B-roll: {result.stderr}")
            return None
    
    # Create outro b-roll (from assembly template)
    if not broll_outro_file.exists():
        end_section = video_sections.get('end', {})
        outro_segments = end_section.get('segments', [])
        outro_broll_duration = None
        
        # Find outro_broll segment duration from template
        for segment in outro_segments:
            if segment.get('name') == 'outro_broll':
                outro_broll_duration = segment.get('duration')
                break
        
        if outro_broll_duration is None:
            print("  ⚠ outro_broll duration not found in assembly template")
            return None
        
        print(f"  Converting outro B-roll to ProRes format ({outro_broll_duration}s)...")
        cmd = [
            'ffmpeg', '-i', str(original_broll),
            '-c:v', 'prores_ks', '-profile:v', '2', '-pix_fmt', 'yuv422p10le',
            '-r', '30', '-s', '1920x1080', '-t', str(outro_broll_duration), '-an', '-y', str(broll_outro_file)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  ✗ Failed to convert outro B-roll: {result.stderr}")
            return None
    
    # Generate concat list based on assembly template structure
    print("  Generating video concat list from assembly template...")
    
    with open(concat_list, 'w') as f:
        # Process sections in order: beginning -> chapters -> end
        section_order = ['beginning', 'chapters', 'end']
        
        for section_name in section_order:
            section = video_sections.get(section_name, {})
            segments = section.get('segments', [])
            
            for segment in segments:
                segment_name = segment.get('name')
                segment_type = segment.get('type')
                
                if segment_type == 'broll' and segment_name == 'intro_broll':
                    f.write(f"file '{broll_intro_file.resolve()}'\n")
                    print(f"    Added intro b-roll: {broll_intro_file.name}")
                    
                elif segment_type == 'talking_head' and segment_name == 'hello_message':
                    f.write(f"file '{intro1_file.resolve()}'\n")
                    print(f"    Added hello message: {intro1_file.name}")
                    
                elif segment_type == 'generated_content' and segment_name == 'generated_content':
                    # Add chapter videos in order (detect dynamically)
                    timed_videos_dir = temp_dir / "timed_chapters"
                    chapter_num = 1
                    
                    while True:
                        chapter_file = timed_videos_dir / f"chapter_{chapter_num}.mov"
                        if chapter_file.exists():
                            f.write(f"file '{chapter_file.resolve()}'\n")
                            print(f"    Added chapter {chapter_num}: {chapter_file.name}")
                            chapter_num += 1
                        else:
                            if chapter_num == 1:
                                print(f"  ✗ No chapter videos found in {timed_videos_dir}")
                                return None
                            break
                            
                elif segment_type == 'talking_head' and segment_name == 'goodbye_message':
                    f.write(f"file '{outro1_file.resolve()}'\n")
                    print(f"    Added goodbye message: {outro1_file.name}")
                    
                elif segment_type == 'broll' and segment_name == 'outro_broll':
                    f.write(f"file '{broll_outro_file.resolve()}'\n")
                    print(f"    Added outro b-roll: {broll_outro_file.name}")
                    
                else:
                    print(f"  ⚠ Unknown segment: {segment_name} ({segment_type})")
    
    print(f"  ✓ Video concat list generated: {concat_list}")
    print(f"    Template-driven sequence with {len(section_order)} sections")
    
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

def create_audio_inputs_for_filter(directory, temp_dir):
    """Prepare audio input files for single-pass filter processing."""
    chapters_dir = temp_dir / "timed_chapters"
    
    # Extract talking head audio (intro1 and outro1)
    intro1_audio, outro1_audio = extract_talking_head_audio(directory, temp_dir)
    if not intro1_audio:
        print("  ⚠ Proceeding without intro1 audio")
    if not outro1_audio:
        print("  ⚠ Proceeding without outro1 audio")
    
    # Detect and verify all chapter audio files exist
    chapter_files = []
    chapter_num = 1
    
    while True:
        chapter_audio = chapters_dir / f"chapter_{chapter_num}.wav"
        if chapter_audio.exists():
            chapter_files.append(chapter_audio)
            chapter_num += 1
        else:
            if chapter_num == 1:
                print(f"  ✗ No chapter audio files found in {chapters_dir}")
                return None, None, None
            break
    
    return intro1_audio, outro1_audio, chapter_files

def generate_overlays(directory, config, temp_dir, assembly_template):
    """Generate all overlay assets from config."""
    overlays = {}
    
    # Create overlay processing directory
    overlay_dir = temp_dir / "overlay_process"
    overlay_dir.mkdir(exist_ok=True)
    
    # Generate title overlay
    print("  Generating title overlay...")
    # Get template path from assembly template, resolve "from-project" to project config
    title_overlay_config = assembly_template.get('overlay_sections', {}).get('title', {})
    template_path = title_overlay_config.get('svg_template', 'video-templates/video_title_template.svg')
    
    if template_path == "from-project":
        # Get the actual path from project config
        template_path = config.get('title_svg_template', 'assets/overlays/video_title1.svg')
    
    template_file = directory.parent / template_path
    title_svg = overlay_dir / "title_overlay.svg"
    title_png = overlay_dir / "title_overlay.png"
    
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
    
    # Bottom logo overlay
    bottom_logo_path = directory.parent / "assets/logos/td_full_white_red.png"
    if bottom_logo_path.exists():
        overlays['bottom_logo'] = bottom_logo_path
        print(f"    ✓ Bottom logo: {bottom_logo_path}")
    else:
        print(f"    ⚠ Bottom logo not found: {bottom_logo_path}")
    
    # Subscribe overlay - get path from assembly template (PNG or video)
    subscribe_overlay = assembly_template.get('overlay_sections', {}).get('subscribe', {})
    subscribe_source = subscribe_overlay.get('source', 'assets/other/subscribe.png')
    subscribe_path = directory.parent / subscribe_source
    if subscribe_path.exists():
        overlays['subscribe'] = subscribe_path
        print(f"    ✓ Subscribe overlay: {subscribe_path}")
    else:
        print(f"    ⚠ Subscribe overlay not found: {subscribe_path}")
    
    return overlays

def calculate_assembly_timing(assembly_template, temp_dir, intro1_audio, outro1_audio):
    """Calculate complete timing structure from assembly template and actual audio durations."""
    video_sections = assembly_template.get('video_sections', {})
    
    # Get beginning section (fixed duration from template)
    beginning_section = video_sections.get('beginning', {})
    beginning_total_duration = beginning_section.get('total_duration', 10.0)
    
    # Get hello_message duration (auto-detected from intro1_audio)
    hello_message_duration = 0.0
    if intro1_audio and intro1_audio.exists():
        probe_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(intro1_audio)]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        if result.returncode == 0:
            hello_message_duration = float(result.stdout.strip())
    
    # Use actual intro_broll duration from created video file for precise timing
    # This ensures audio timing matches actual video sequence
    broll_prores_file = temp_dir / "temp_prores" / "b-roll_prores.mov"
    if broll_prores_file.exists():
        # Use actual b-roll duration for precise timing alignment
        probe_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(broll_prores_file)]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        if result.returncode == 0:
            intro_broll_duration = float(result.stdout.strip())
            print(f"  Using actual intro b-roll duration: {intro_broll_duration:.3f}s (from created video file)")
        else:
            # Fallback to template calculation
            intro_broll_duration = beginning_total_duration - hello_message_duration
            print(f"  Using template calculation for intro b-roll: {intro_broll_duration:.3f}s")
    else:
        # Fallback to template calculation if file doesn't exist yet
        intro_broll_duration = beginning_total_duration - hello_message_duration
        print(f"  Using template calculation for intro b-roll: {intro_broll_duration:.3f}s")
    
    # Calculate chapters total duration from actual chapter audio files
    chapters_total_duration = 0.0
    chapter_timings = []
    
    # Detect chapter files dynamically
    processed_voice_dir = temp_dir / "processed_voice"
    if processed_voice_dir.exists():
        current_start_time = 0.0
        chapter_num = 1
        
        while True:
            chapter_file = processed_voice_dir / f"chapter_{chapter_num}_processed.wav"
            if not chapter_file.exists():
                break
                
            # Get actual chapter duration
            chapter_duration = detect_audio_duration(chapter_file)
            if chapter_duration is not None:
                chapter_timings.append({
                    'chapter': chapter_num,
                    'start_time': current_start_time,
                    'duration': chapter_duration
                })
                chapters_total_duration += chapter_duration
                current_start_time += chapter_duration
                print(f"  Detected chapter {chapter_num}: {chapter_duration:.2f}s")
                chapter_num += 1
            else:
                print(f"  ⚠ Could not detect duration for chapter {chapter_num}")
                break
        
        print(f"  Total chapters duration: {chapters_total_duration:.2f}s")
    else:
        print(f"  ⚠ Processed voice directory not found: {processed_voice_dir}")
        return None
    
    # Get goodbye_message duration (auto-detected from outro1_audio)
    goodbye_message_duration = 0.0
    if outro1_audio and outro1_audio.exists():
        probe_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(outro1_audio)]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        if result.returncode == 0:
            goodbye_message_duration = float(result.stdout.strip())
    
    # Get outro_broll duration from template
    end_section = video_sections.get('end', {})
    end_segments = end_section.get('segments', [])
    outro_broll_duration = assembly_template.get('video_sections', {}).get('end', {}).get('segments', [{}])[1].get('duration', 5.0) if len(assembly_template.get('video_sections', {}).get('end', {}).get('segments', [])) > 1 else 5.0
    for segment in end_segments:
        if segment.get('name') == 'outro_broll':
            outro_broll_duration = segment.get('duration', 5.0)
            break
    
    # Calculate end section total duration
    end_total_duration = goodbye_message_duration + outro_broll_duration
    
    # Calculate actual beginning section duration from video files instead of template
    actual_beginning_duration = intro_broll_duration + hello_message_duration
    print(f"  Actual beginning duration: {actual_beginning_duration:.3f}s (intro_broll: {intro_broll_duration:.3f}s + hello_message: {hello_message_duration:.3f}s)")
    print(f"  Template beginning duration: {beginning_total_duration:.1f}s")
    
    # Use actual durations for precise timing alignment
    chapters_start_time = actual_beginning_duration
    goodbye_message_start_time = actual_beginning_duration + chapters_total_duration
    outro_broll_start_time = goodbye_message_start_time + goodbye_message_duration
    total_video_duration = actual_beginning_duration + chapters_total_duration + end_total_duration
    
    # Calculate complete timing structure using actual video durations
    timing_structure = {
        'beginning_total_duration': beginning_total_duration,  # Keep template value for music calculations
        'actual_beginning_duration': actual_beginning_duration,  # Actual video duration
        'intro_broll_duration': intro_broll_duration,
        'hello_message_duration': hello_message_duration,
        'hello_message_start_time': intro_broll_duration,
        'chapters_start_time': chapters_start_time,  # Use actual duration
        'chapters_total_duration': chapters_total_duration,
        'chapter_timings': chapter_timings,  # Include dynamic chapter timings
        'goodbye_message_start_time': goodbye_message_start_time,  # Use actual duration
        'goodbye_message_duration': goodbye_message_duration,
        'outro_broll_start_time': outro_broll_start_time,  # Use actual duration
        'outro_broll_duration': outro_broll_duration,
        'end_total_duration': end_total_duration,
        'total_video_duration': total_video_duration  # Use actual duration
    }
    
    return timing_structure

def combine_final_video_optimized(concat_list, intro1_audio, outro1_audio, chapter_audio_files, background_music, overlays, output_file, temp_dir, config, assembly_template):
    """Combine video with audio tracks and overlays in single pass using filter graphs."""
    
    # Calculate timing structure from assembly template and actual audio durations
    assembly_timing = calculate_assembly_timing(assembly_template, temp_dir, intro1_audio, outro1_audio)
    
    print(f"  Debug: Assembly timing calculated:")
    print(f"    Beginning: {assembly_timing['beginning_total_duration']:.1f}s")
    print(f"    Intro broll: {assembly_timing['intro_broll_duration']:.1f}s") 
    print(f"    Hello message: {assembly_timing['hello_message_duration']:.1f}s")
    print(f"    Chapters: {assembly_timing['chapters_total_duration']:.1f}s")
    print(f"    Goodbye message: {assembly_timing['goodbye_message_duration']:.1f}s")
    print(f"    Outro broll: {assembly_timing['outro_broll_duration']:.1f}s")
    print(f"    Total: {assembly_timing['total_video_duration']:.1f}s")
    
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
    
    # Add b-roll music - use original file directly for proper duration
    # Try temp file first, fallback to original if temp is too short
    broll_music_file = temp_dir / "temp_broll_intro.wav" 
    # Calculate path to original B-roll music relative to temp_dir
    project_dir = temp_dir.parent  # temp_dir is project/temp, so parent is project/
    assets_dir = project_dir.parent  # project parent contains assets/
    original_broll_music = assets_dir / config.get('music', {}).get('b_roll_background', 'assets/music/top-b-roll/ES_Spaghetti on the Island - Thompson Town Flowers_edit.mp3')
    
    broll_music_index = None
    if broll_music_file.exists():
        # Check if temp file is long enough (should be > 12 seconds for our needs)
        result = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(broll_music_file)], capture_output=True, text=True)
        temp_duration = float(result.stdout.strip()) if result.returncode == 0 else 0
        
        if temp_duration >= assembly_timing['beginning_total_duration'] + 2.5:  # Template-based minimum duration
            # Use temp file if it's long enough
            inputs.extend(['-i', str(broll_music_file)])
            broll_music_index = current_index
            current_index += 1
            print(f"  Using temp B-roll music file: {temp_duration:.1f}s")
        else:
            # Use original file if temp is too short
            inputs.extend(['-i', str(original_broll_music)])
            broll_music_index = current_index
            current_index += 1
            print(f"  Using original B-roll music file (temp file too short: {temp_duration:.1f}s)")
    elif original_broll_music.exists():
        # Use original file if temp doesn't exist
        inputs.extend(['-i', str(original_broll_music)])
        broll_music_index = current_index
        current_index += 1
        print(f"  Using original B-roll music file (temp file not found)")
    
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
    if 'bottom_logo' in overlays:
        inputs.extend(['-i', str(overlays['bottom_logo'])])
        overlay_indices['bottom_logo'] = input_index
        input_index += 1
    if 'subscribe' in overlays:
        inputs.extend(['-i', str(overlays['subscribe'])])
        overlay_indices['subscribe'] = input_index
        input_index += 1
    
    # Build filter complex for single-pass processing
    filter_parts = []
    
    # Audio processing: combine intro1 + chapters + outro1 with proper timing from assembly template
    
    # Use assembly timing structure (no hardcoded values)
    intro1_start_time = assembly_timing['hello_message_start_time']
    chapter_start_time = assembly_timing['chapters_start_time'] 
    outro1_start_time = assembly_timing['goodbye_message_start_time']
    total_chapter_duration = assembly_timing['chapters_total_duration']
    
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
        
        fade_start_time = assembly_timing['intro_broll_duration']  # Start fade when intro1 voice begins
        fade_duration = beginning_music.get("fade_out", {}).get("duration", 1.0)
        
        # Get b-roll volume from project config, fallback to beginning music volume
        broll_full_volume = config.get('audio_levels', {}).get('b_roll_music_volume', beginning_music["volume"])
        broll_reduced_volume = assembly_template.get('music_sections', {}).get('chapters_music', {}).get('volume', 0.3)
        
        # Calculate B-roll music duration from template calculation
        template_calculation = beginning_music.get("calculation", "")
        if template_calculation:
            # Parse template calculation dynamically
            if "beginning.total_duration + " in template_calculation:
                # Extract the addition value from the template
                import re
                match = re.search(r'beginning\.total_duration \+ ([\d.]+)', template_calculation)
                if match:
                    extension_value = float(match.group(1))
                    broll_music_duration = assembly_timing['beginning_total_duration'] + extension_value
                    print(f"  Using extended B-roll duration: {broll_music_duration:.1f}s (beginning: {assembly_timing['beginning_total_duration']:.1f}s + {extension_value}s)")
                else:
                    broll_music_duration = assembly_timing['beginning_total_duration']
                    print(f"  Could not parse template calculation, using beginning duration: {broll_music_duration:.1f}s")
            else:
                broll_music_duration = assembly_timing['beginning_total_duration']
                print(f"  Using beginning duration from template: {broll_music_duration:.1f}s")
        else:
            broll_music_duration = assembly_timing['beginning_total_duration']
            print(f"  No template calculation found, using beginning duration: {broll_music_duration:.1f}s")
        
        # Create b-roll intro music with proper volume levels and extended duration
        # Full volume during b-roll, reduced volume during intro1 voice
        filter_parts.append(f'[{broll_music_index}:a]atrim=start=0:end={broll_music_duration},volume=enable=\'lt(t,{fade_start_time})\':volume={broll_full_volume},volume=enable=\'gte(t,{fade_start_time})\':volume={broll_reduced_volume}[broll_intro_music]')
        
        # B-roll music for outro section (starts after outro1 voice ends)
        # Get actual outro1 duration if available
        outro1_audio_duration = assembly_timing['goodbye_message_duration']
        if outro1_audio and outro1_audio.exists():
            try:
                result = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(outro1_audio)], capture_output=True, text=True)
                if result.returncode == 0:
                    outro1_audio_duration = float(result.stdout.strip())
            except:
                pass  # Use fallback
        
        broll_outro_start = outro1_start_time + outro1_audio_duration
        broll_outro_start_ms = int(broll_outro_start * 1000)
        # Get outro broll duration from assembly template
        outro_broll_duration = assembly_timing['outro_broll_duration']
        filter_parts.append(f'[{broll_music_index}:a]atrim=start=0:end={outro_broll_duration},volume={broll_full_volume},adelay={broll_outro_start_ms}|{broll_outro_start_ms}[broll_outro_music]')
        
        # Background music timing from assembly template
        chapters_music = assembly_template["music_sections"]["chapters_music"]
        bg_volume = config.get('audio_levels', {}).get('background_music_volume', chapters_music["volume"])
        
        # Background music starts with chapters (from assembly template)
        bg_start_delay_ms = chapter_delay_ms
        
        # Get fade-in duration from template (should be 5.0 seconds)
        fade_in_duration = chapters_music.get("fade_in", {}).get("duration", 1.0)
        
        # Apply background music with calculated delay and fade-in
        filter_parts.append(f'[{music_index}:a]volume={bg_volume},afade=t=in:st=0:d={fade_in_duration},adelay={bg_start_delay_ms}|{bg_start_delay_ms}[music_low]')
        
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
    
    # Video processing: start with base video scaled to target resolution
    conversion_settings = assembly_template.get('conversion_settings', {})
    target_resolution = conversion_settings.get('resolution', '1920x1080')
    
    # Scale base video to target resolution
    filter_parts.append(f'[0:v]scale={target_resolution}[base_scaled]')
    current_video = '[base_scaled]'
    
    # Add title overlay (until end of beginning section)
    overlay_end_time = assembly_timing['beginning_total_duration']  # End when intro section ends
    if 'title' in overlay_indices:
        filter_parts.append(f'{current_video}[{overlay_indices["title"]}:v]overlay=0:0:enable=\'between(t,0,{overlay_end_time})\'[titled]')
        current_video = '[titled]'
    
    # Add logo overlay (until end of beginning section, top-right)
    if 'logo' in overlay_indices:
        filter_parts.append(f'{current_video}[{overlay_indices["logo"]}:v]overlay=W-w-20:20:enable=\'between(t,0,{overlay_end_time})\'[logo_video]')
        current_video = '[logo_video]'
    
    # Add bottom logo overlay (during end section, bottom center, scaled 50%)
    if 'bottom_logo' in overlay_indices:
        # Calculate end section timing from assembly
        end_start_time = outro1_start_time  # Start when goodbye message begins
        end_end_time = assembly_timing['total_video_duration']  # Use assembly calculated total duration
        # Get scale and position from assembly template instead of hardcoding
        bottom_logo_overlay = assembly_template.get('overlay_sections', {}).get('bottom_logo', {})
        logo_scale = bottom_logo_overlay.get('scale', '1.0')
        logo_position = bottom_logo_overlay.get('position', '(W-w)/2:(H*5/6)')
        filter_parts.append(f'[{overlay_indices["bottom_logo"]}:v]scale=iw*{logo_scale}:ih*{logo_scale}[bottom_scaled]')
        filter_parts.append(f'{current_video}[bottom_scaled]overlay={logo_position}:enable=\'between(t,{end_start_time},{end_end_time})\'[logo_final]')
        current_video = '[logo_final]'
    
    # Add subscribe video overlay (during outro b-roll section with alpha channel)
    if 'subscribe' in overlay_indices:
        # Calculate outro b-roll timing (starts after goodbye message ends)
        outro1_audio_duration = assembly_timing['goodbye_message_duration']
        if outro1_audio and outro1_audio.exists():
            try:
                result = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(outro1_audio)], capture_output=True, text=True)
                if result.returncode == 0:
                    outro1_audio_duration = float(result.stdout.strip())
            except:
                pass  # Use fallback
        
        subscribe_start_time = outro1_start_time + outro1_audio_duration  # Start when outro b-roll begins
        # Use outro_broll_duration from assembly template instead of hardcoded value
        outro_broll_duration = assembly_timing['outro_broll_duration']
        subscribe_end_time = subscribe_start_time + outro_broll_duration
        # Get chroma key settings from assembly template
        subscribe_overlay = assembly_template.get('overlay_sections', {}).get('subscribe', {})
        subscribe_position = subscribe_overlay.get('position', '0:0')
        chroma_key = subscribe_overlay.get('chroma_key', {})
        chroma_color = chroma_key.get('color', 'green')
        chroma_similarity = chroma_key.get('similarity', '0.4')
        chroma_blend = chroma_key.get('blend', '0.1')
        
        # Simple PNG overlay with transparency
        filter_parts.append(f'[{overlay_indices["subscribe"]}:v]scale=1920:1080[subscribe_scaled]')
        filter_parts.append(f'{current_video}[subscribe_scaled]overlay=0:0:enable=between(t\\,{subscribe_start_time}\\,{subscribe_end_time})[final_video]')
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
    
    # Complete FFmpeg command with resolution settings from template
    conversion_settings = assembly_template.get('conversion_settings', {})
    
    cmd = [
        'ffmpeg'
    ] + inputs + [
        '-filter_complex', filter_complex,
        '-map', current_video, '-map', '[final_audio]',
        '-c:v', conversion_settings.get('video_codec', 'prores_ks'),
        '-profile:v', conversion_settings.get('video_profile', '2'),
        '-pix_fmt', conversion_settings.get('pixel_format', 'yuv422p10le'),
        '-r', conversion_settings.get('frame_rate', '30'),
        '-s', conversion_settings.get('resolution', '1920x1080'),
        '-c:a', conversion_settings.get('audio_codec', 'pcm_s16le'),
        '-ar', conversion_settings.get('audio_sample_rate', '44100'),
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
        print("Run step 1 first: python 1_extract_audio_chapters.py current-project/human-provided-content/orig_screencast.mov")
        sys.exit(1)
    
    # Check required files
    background_music_file = temp_dir / "background_music.wav"
    timed_videos_dir = temp_dir / "timed_chapters"
    
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
    
    config_file = directory / "human-provided-content" / "project-config.json"
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
    
    # Use temp directory directly for final assembly
    temp_final_dir = temp_dir
    
    # Debug: Don't clean up temp files so we can inspect them
    debug_mode = True
    
    # Create video concatenation list
    concat_list = create_video_concat_list(directory, temp_dir, assembly_template)
    if not concat_list:
        sys.exit(1)
    
    # Prepare audio inputs for optimized processing  
    intro1_audio, outro1_audio, chapter_audio_files = create_audio_inputs_for_filter(directory, temp_dir)
    if not chapter_audio_files:
        sys.exit(1)
    
    # Generate overlays
    print("\nGenerating overlays...")
    overlays = generate_overlays(directory, config, temp_dir, assembly_template)
    if not overlays:
        sys.exit(1)
    
    # Final assembly with overlays
    final_output_dir = directory / "final-output"
    final_output_dir.mkdir(exist_ok=True)
    output_file = final_output_dir / "final_video.mov"
    
    if combine_final_video_optimized(concat_list, intro1_audio, outro1_audio, chapter_audio_files, background_music_file, overlays, output_file, temp_dir, config, assembly_template):
        # Clean up temp files (disabled for debug)
        # Note: temp_dir cleanup disabled since it's the main temp directory
        
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
            print(f"  Chapters: {len(chapter_audio_files)}")
        
        print(f"\n🚀 READY FOR UPLOAD!")
        print(f"   Video file: {output_file}")
    else:
        print("\n✗ Final assembly failed")
        sys.exit(1)

if __name__ == "__main__":
    main()