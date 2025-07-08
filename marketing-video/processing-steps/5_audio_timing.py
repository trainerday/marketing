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
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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
    """Parse resemble-a-roll.txt into structured data (no chapter headers, double spaced)."""
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
        
        # Extract the last sentence of each chapter for timing analysis
        chapter_ending_sentences = []
        for i, chapter in enumerate(chapters):
            chapter_text = chapter['enhanced_script'].strip()
            # Split into sentences and get the last one
            sentences = [s.strip() for s in chapter_text.split('.') if s.strip()]
            if sentences:
                last_sentence = sentences[-1] + '.'
                chapter_ending_sentences.append({
                    'chapter': chapter['chapter'],
                    'last_sentence': last_sentence
                })
                
        print(f"  Looking for {len(chapter_ending_sentences)} chapter ending sentences")

        # Get the full script content for subtitle generation
        full_script = ""
        for chapter in chapters:
            full_script += chapter['enhanced_script'] + " "
        
        prompt = f"""Create a detailed subtitle/timing document for this script that will be read as a {a_roll_duration:.1f} second audio file.

SCRIPT TO TIME:
{full_script.strip()}

Generate a JSON subtitle document with sentence-by-sentence timing estimates based on:
- Normal speaking pace (140-160 words per minute)
- Natural pauses between sentences (0.5-1 second)
- Chapter breaks with longer pauses (1-2 seconds)
- Total duration must be exactly {a_roll_duration:.1f} seconds

Return a JSON object with this structure:
{{
  "total_duration": {a_roll_duration},
  "subtitles": [
    {{
      "start_time": 0.0,
      "end_time": 3.2,
      "text": "First sentence here."
    }},
    {{
      "start_time": 3.7,
      "end_time": 7.1,
      "text": "Second sentence here."
    }}
  ]
}}

Include EVERY sentence with start_time and end_time. The last subtitle should end at exactly {a_roll_duration:.1f} seconds."""

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
    a_roll_file = directory / "resemble-a-roll.wav"  # Voice file matches script file
    script_final_file = directory / "resemble-a-roll.txt"
    chapters_file = temp_dir / "chapters.json"
    
    if not a_roll_file.exists():
        print(f"✗ Audio file not found: {a_roll_file}")
        print("Generate voice using Resemble.ai and save as 'resemble-a-roll.wav'")
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
        
        # Parse subtitle response
        subtitle_data = json.loads(json_text)
        
        # Find chapter endings in the subtitle data
        chapter_end_times = []
        for sentence_info in chapter_ending_sentences:
            last_sentence = sentence_info['last_sentence'].strip()
            # Find this sentence in the subtitles
            for subtitle in subtitle_data['subtitles']:
                if last_sentence.lower() in subtitle['text'].lower() or subtitle['text'].lower() in last_sentence.lower():
                    chapter_end_times.append(subtitle['end_time'])
                    print(f"  Found Chapter {sentence_info['chapter']} ending at {subtitle['end_time']:.1f}s: \"{subtitle['text']}\"")
                    break
        
        # Convert to chapter timing format
        timing_data = {
            "total_duration": subtitle_data['total_duration'],
            "chapter_timings": []
        }
        
        for i, end_time in enumerate(chapter_end_times):
            start_time = 0.0 if i == 0 else chapter_end_times[i-1]
            duration = end_time - start_time
            
            timing_data["chapter_timings"].append({
                "chapter": i + 1,
                "start_time": start_time,
                "duration": duration
            })
        
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