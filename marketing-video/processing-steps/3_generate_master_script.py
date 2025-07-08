#!/usr/bin/env python3
"""
Step 3: Generate Master Script
- Break transcript into chapters
- Send to GPT for polishing and enhancement
"""

import os
import sys
import json
import glob
from pathlib import Path
from openai import OpenAI

def generate_script(transcript_data, chapters_data):
    """Generate polished script using GPT."""
    try:
        print("  Connecting to OpenAI...")
        client = OpenAI()
        
        # Create chapter breakdown
        chapters = chapters_data['chapters']
        transcript_text = transcript_data['text']
        duration = transcript_data['duration']
        
        # Calculate rough chapter segments from transcript
        chapter_segments = []
        words_per_second = len(transcript_text.split()) / duration
        
        for i, chapter in enumerate(chapters):
            start_time = chapter['start_time']
            chapter_duration = chapter['duration']
            
            # Estimate word positions
            start_word_pos = int(start_time * words_per_second)
            end_word_pos = int((start_time + chapter_duration) * words_per_second)
            
            words = transcript_text.split()
            chapter_text = ' '.join(words[start_word_pos:end_word_pos])
            
            chapter_segments.append({
                'chapter': i + 1,
                'title': chapter['title'],
                'duration': chapter_duration,
                'original_text': chapter_text.strip()
            })
        
        print("  Generating enhanced script with GPT...")
        
        # Create prompt for script enhancement
        prompt = f"""You are creating polished video scripts from rough transcripts of software demonstrations.

TRANSCRIPT TO ENHANCE:
{transcript_text}

CHAPTER BREAKDOWN:
{json.dumps(chapter_segments, indent=2)}

Please create a polished, professional script that:

1. **Preserves exact product terminology** - Keep all specific feature names, UI elements, and technical terms exactly as spoken
2. **Improves clarity and flow** - Make the language more engaging and clear while maintaining the original meaning
3. **Maintains natural pacing** - Keep the conversational tone appropriate for voice-over
4. **Stays concise** - Target 75-80 words per chapter for natural delivery timing
5. **Breaks into clear segments** - Each chapter should be a complete thought

Return a JSON object with this structure:
{{
  "chapters": [
    {{
      "chapter": 1,
      "title": "Chapter title",
      "original_text": "original transcript text",
      "enhanced_script": "polished script text",
      "word_count": 75
    }}
  ]
}}

Focus on making this sound professional but conversational, like an expert explaining features to a colleague."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional scriptwriter specializing in software demonstration videos. You excel at polishing rough transcripts while preserving technical accuracy."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        print("  ✓ Script generation completed")
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"  ✗ Script generation failed: {e}")
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python 3_generate_master_script.py <directory>")
        print("Example: python 3_generate_master_script.py current-project/")
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
    transcript_file = temp_dir / "transcript.json"
    chapters_file = temp_dir / "chapters.json"
    
    if not transcript_file.exists():
        print(f"✗ Transcript file not found: {transcript_file}")
        print("Run step 2 first: python 2_transcribe_audio.py temp-assets/")
        sys.exit(1)
    
    if not chapters_file.exists():
        print(f"✗ Chapters file not found: {chapters_file}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    # Load data
    with open(transcript_file, 'r') as f:
        transcript_data = json.load(f)
    
    with open(chapters_file, 'r') as f:
        chapters_data = json.load(f)
    
    script_review_file = directory / "script-for-review-sentences.txt"  # Keep in main dir for review
    script_generated_file = directory / "script-generated.txt"  # Auto-generated, can be overwritten
    script_final_file = directory / "resemble-a-roll.txt"  # Manual edits - matches resemble-a-roll.wav
    
    print("Step 3: Generate Master Script")
    print("=" * 50)
    
    # Check for project-config.json and create from template if needed
    project_config_file = directory / "project-config.json"
    if not project_config_file.exists():
        print("  Setting up project configuration...")
        template_file = directory.parent / "video-templates" / "project-config-template.json"
        if template_file.exists():
            import shutil
            shutil.copy2(template_file, project_config_file)
            print(f"  ✓ Created {project_config_file.name} from template")
            print(f"  ⚠️  IMPORTANT: Update project-config.json with your project settings!")
        else:
            print(f"  ⚠️  Template not found: {template_file}")
            print(f"  Please create project-config.json manually in {directory}/")
    else:
        print(f"  ✓ Found existing {project_config_file.name}")
    
    # Clean up any existing auto-generated files (but never resemble-a-roll.txt)
    cleanup_patterns = [
        str(directory / "script-for-review-sentences.txt"),
        str(directory / "script-generated.txt")
    ]
    
    for pattern in cleanup_patterns:
        for file_path in glob.glob(pattern):
            try:
                os.unlink(file_path)
                print(f"  Cleaned up: {Path(file_path).name}")
            except OSError:
                pass
    
    print(f"Processing {len(chapters_data['chapters'])} chapters")
    
    # Generate script
    script_response = generate_script(transcript_data, chapters_data)
    if not script_response:
        sys.exit(1)
    
    try:
        # Parse JSON response
        script_data = json.loads(script_response)
        
        # Create readable text file for review
        script_text = "# Script for Review\n\n"
        script_text += "## Generated Enhanced Scripts\n\n"
        
        for chapter in script_data['chapters']:
            script_text += f"### Chapter {chapter['chapter']}: {chapter['title']}\n"
            script_text += f"**Words:** {chapter['word_count']}\n\n"
            script_text += f"**Enhanced Script:**\n{chapter['enhanced_script']}\n\n"
            script_text += f"**Original Text:**\n{chapter['original_text']}\n\n"
            script_text += "---\n\n"
        
        # Save review script
        with open(script_review_file, 'w') as f:
            f.write(script_text)
        
        # Create simple final script file (one line per sentence, no chapter headers)
        final_script_lines = []
        for i, chapter in enumerate(script_data['chapters']):
            # Split enhanced script into sentences and add each as a separate line
            sentences = chapter['enhanced_script'].replace('. ', '.\n').split('\n')
            for sentence in sentences:
                sentence = sentence.strip()
                if sentence:
                    final_script_lines.append(sentence)
                    final_script_lines.append("")  # Empty line after each sentence
            
            # Add extra empty line between chapters (except after last chapter)
            if i < len(script_data['chapters']) - 1:
                final_script_lines.append("")
        
        # Save generated script (can be overwritten)
        with open(script_generated_file, 'w') as f:
            f.write('\n'.join(final_script_lines))
        
        # Check if manual final script exists
        if script_final_file.exists():
            print(f"  ✓ Preserving existing manual edits: {script_final_file.name}")
        else:
            # Copy generated script as starting point for manual editing
            with open(script_final_file, 'w') as f:
                f.write('\n'.join(final_script_lines))
            print(f"  ✓ Created initial {script_final_file.name} for manual editing")
        
        print("\n" + "=" * 50)
        print("STEP 3 COMPLETED!")
        print("=" * 50)
        print("Created files:")
        print(f"  ✓ {script_review_file.name} (for review)")
        print(f"  ✓ {script_generated_file.name} (auto-generated)")
        if not script_final_file.exists():
            print(f"  ✓ {script_final_file.name} (copy for manual editing)")
        else:
            print(f"  → {script_final_file.name} (preserved manual edits)")
        print(f"\nScript summary:")
        for chapter in script_data['chapters']:
            print(f"  Chapter {chapter['chapter']}: {chapter['word_count']} words")
        
        print(f"\n🔧 PROJECT CONFIGURATION:")
        print(f"   1. UPDATE project-config.json with your project settings:")
        print(f"      - Update branding (title_line1, title_line2)")
        print(f"      - Set audio levels if needed")
        print(f"      - Verify intro/outro file paths")
        print(f"      - Check music and b-roll video paths")
        print(f"")
        print(f"📝 ITERATIVE SCRIPT REFINEMENT PROCESS:")
        print(f"   2. Review script quality in '{script_review_file.name}'")
        print(f"   3. Edit/update the script in '{script_final_file.name}'")
        print(f"   4. Run verification: python 4_verify_script.py {directory}/")
        print(f"   5. REPEAT steps 3-4 until you achieve the quality score you want")
        print(f"      (Keep editing and verifying until perfect)")
        print(f"")
        print(f"📢 VOICE GENERATION PROCESS:")
        print(f"   6. Listen to script in Resemble.ai preview before generating")
        print(f"   7. Make final edits to '{script_final_file.name}' if needed")
        print(f"   8. Re-verify with step 4 after any final edits")
        print(f"   9. Generate chapter audio files using Resemble.ai:")
        print(f"      - Create separate audio files for each chapter")
        print(f"      - Save as: resemble-chapters/1.wav, 2.wav, 3.wav, etc.")
        print(f"      - ⚠️  CRITICAL: Files must be in 'resemble-chapters/' folder")
        print(f"      - ⚠️  CRITICAL: Files must be named 'N.wav' (N = chapter number)")
        print(f"   10. OPTIONAL: Generate full A-roll audio as: {directory}/a-roll.wav")
        print(f"       (This is optional - chapter files are the primary requirement)")
        print(f"")
        print(f"✅ FINAL READINESS CHECK:")
        print(f"   - Ensure project-config.json is updated with your settings")
        print(f"   - Ensure '{script_final_file.name}' contains your final script")
        print(f"   - Ensure resemble-chapters/N.wav files exist for all chapters")
        print(f"   - OPTIONAL: Ensure '{directory}/a-roll.wav' exists if you want full audio")
        print(f"   - Then run: python 5_audio_timing.py {directory}/")
        print(f"\n💡 TIP: The review file shows original vs enhanced text.")
        print(f"    The verification step helps ensure professional quality.")
        print(f"    Take time to perfect your script - it's worth the effort!")
        
    except json.JSONDecodeError as e:
        print(f"✗ Error parsing script response: {e}")
        print("Raw response:")
        print(script_response)
        sys.exit(1)

if __name__ == "__main__":
    main()