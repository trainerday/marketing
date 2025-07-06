#!/usr/bin/env python3
"""
Step 5: Audio Translation with Timing
- Send audio to GPT to create time markers
- Map audio segments to video chapters
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from openai import OpenAI

def get_audio_duration(audio_file):
    """Get audio file duration."""
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(audio_file)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"✗ Error getting duration: {e}")
    return None

def parse_script_final(script_final_file):
    """Parse script-final.txt into structured data (no chapter headers, double spaced)."""
    try:
        with open(script_final_file, 'r') as f:
            content = f.read().strip()
        
        # Split by double empty lines to separate chapters
        chapter_blocks = content.split('\n\n\n')
        chapters = []
        
        for i, block in enumerate(chapter_blocks):
            if block.strip():
                # Get all sentences in this chapter block
                sentences = [line.strip() for line in block.split('\n') if line.strip()]
                script_text = ' '.join(sentences).strip()
                
                chapters.append({
                    'chapter': i + 1,
                    'title': f"Chapter {i + 1}",
                    'enhanced_script': script_text,
                    'word_count': len(script_text.split())
                })
        
        return {'chapters': chapters}
    
    except Exception as e:
        print(f"✗ Error parsing script file: {e}")
        return None

def create_audio_timing(master_script_data, a_roll_duration, chapters_data):
    """Generate audio timing using GPT."""
    try:
        print("  Connecting to OpenAI...")
        client = OpenAI()
        
        chapters = master_script_data['chapters']
        video_chapters = chapters_data['chapters']
        
        print("  Generating audio timing with GPT...")
        
        prompt = f"""You need to create precise timing markers for splitting a {a_roll_duration:.1f} second audio file into chapter segments.

CHAPTERS TO TIME:
{json.dumps(chapters, indent=2)}

ORIGINAL VIDEO TIMING (for reference):
{json.dumps(video_chapters, indent=2)}

The a-roll.wav file contains the enhanced script read sequentially. Create timing markers that:

1. **Start at 0.0 seconds** - First chapter begins immediately
2. **Account for natural pauses** - Add 0.5-1.0 second gaps between chapters for breathing
3. **Distribute proportionally** - Base timing on script word counts and complexity
4. **End at {a_roll_duration:.1f} seconds** - Must use full audio duration

Return a JSON object with this structure:
{{
  "total_duration": {a_roll_duration},
  "chapter_timings": [
    {{
      "chapter": 1,
      "start_time": 0.0,
      "end_time": 25.5,
      "duration": 25.5
    }},
    {{
      "chapter": 2,
      "start_time": 26.0,
      "end_time": 48.3,
      "duration": 22.3
    }}
  ]
}}

Make sure all chapters fit within the total duration and timings are logical."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an audio timing specialist. You excel at creating precise timing markers for audio segmentation based on content analysis."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        print("  ✓ Audio timing generated")
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"  ✗ Audio timing failed: {e}")
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python 5_audio_timing.py <directory>")
        print("Example: python 5_audio_timing.py temp-assets/")
        sys.exit(1)
    
    # Check for OpenAI API key
    if not os.getenv('OPENAI_API_KEY'):
        print("✗ OPENAI_API_KEY environment variable not set")
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
    a_roll_file = directory / "a-roll.wav"  # Manual file stays in main dir
    script_final_file = directory / "script-final.txt"
    chapters_file = temp_dir / "chapters.json"
    
    if not a_roll_file.exists():
        print(f"✗ Audio file not found: {a_roll_file}")
        print("Generate voice using Resemble.ai and save as 'a-roll.wav'")
        sys.exit(1)
    
    if not script_final_file.exists():
        print(f"✗ Script file not found: {script_final_file}")
        print("Run step 3 first: python 3_generate_master_script.py current-project/")
        sys.exit(1)
    
    if not chapters_file.exists():
        print(f"✗ Chapters file not found: {chapters_file}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    print("Step 5: Audio Translation with Timing")
    print("=" * 50)
    
    # Get audio duration
    print(f"Analyzing: {a_roll_file.name}")
    a_roll_duration = get_audio_duration(a_roll_file)
    if not a_roll_duration:
        sys.exit(1)
    
    print(f"  Audio duration: {a_roll_duration:.1f} seconds")
    
    # Load script and chapters
    master_script_data = parse_script_final(script_final_file)
    if not master_script_data:
        print("✗ Failed to parse script file")
        sys.exit(1)
    
    with open(chapters_file, 'r') as f:
        chapters_data = json.load(f)
    
    # Generate timing
    timing_response = create_audio_timing(master_script_data, a_roll_duration, chapters_data)
    if not timing_response:
        sys.exit(1)
    
    try:
        # Extract JSON from response (handle markdown formatting)
        response_text = timing_response.strip()
        
        # Look for JSON block in markdown
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            json_text = response_text[start:end].strip()
        elif "{" in response_text:
            # Find the JSON object
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            json_text = response_text[start:end]
        else:
            json_text = response_text
        
        # Parse timing response
        timing_data = json.loads(json_text)
        
        # Save timing data
        timing_file = temp_dir / "audio_timing.json"
        with open(timing_file, 'w') as f:
            json.dump(timing_data, f, indent=2)
        
        print("\n" + "=" * 50)
        print("STEP 5 COMPLETED!")
        print("=" * 50)
        print("Created files:")
        print(f"  ✓ {timing_file.name}")
        print(f"\nTiming breakdown:")
        
        for timing in timing_data['chapter_timings']:
            chapter_num = timing['chapter']
            duration = timing['duration']
            print(f"  Chapter {chapter_num}: {duration:.1f}s")
        
        print(f"\nNext: python 6_split_audio.py {directory}/")
        
    except json.JSONDecodeError as e:
        print(f"✗ Error parsing timing response: {e}")
        print("Raw response:")
        print(timing_response)
        sys.exit(1)

if __name__ == "__main__":
    main()