#!/usr/bin/env python3
"""
Step 4: Script Verification
- Analyze edited script for quality and issues
- Provide content verification report
- Check for grammar, flow, and video script quality
"""

import os
import sys
import json
import glob
from pathlib import Path
from openai import OpenAI

def verify_script_quality(script_content, chapters_data):
    """Verify script quality using GPT."""
    try:
        print("  Connecting to OpenAI...")
        client = OpenAI()
        
        video_chapters = chapters_data['chapters']
        
        print("  Analyzing script quality with GPT...")
        
        prompt = f"""You are a professional video script analyst. Please analyze this marketing video script for quality and provide a comprehensive report.

SCRIPT TO ANALYZE:
{script_content}

ORIGINAL VIDEO STRUCTURE (for reference):
- Total duration: {sum(ch['duration'] for ch in video_chapters):.1f} seconds
- {len(video_chapters)} chapters
- Chapter breakdown: {json.dumps(video_chapters, indent=2)}

Please provide a detailed analysis covering:

1. **OVERALL QUALITY SCORE** (1-10 scale)
   - Rate the script's effectiveness as a marketing video script

2. **CONTENT ANALYSIS**
   - Clarity and coherence of the message
   - Professional tone and marketing effectiveness
   - Technical accuracy and terminology usage
   - Flow between chapters and logical progression

3. **GRAMMAR AND LANGUAGE**
   - Grammar errors or awkward phrasing
   - Sentence structure and readability
   - Consistency in tone and style

4. **VIDEO SCRIPT SUITABILITY**
   - Appropriateness for voice-over delivery
   - Pacing and natural speech patterns
   - Engagement factor for video audience
   - Call-to-action effectiveness

5. **POTENTIAL ISSUES**
   - Redundancy or unnecessary repetition
   - Confusing or unclear statements
   - Missing important information
   - Overly technical or overly simple language

6. **RECOMMENDATIONS**
   - Specific improvements to consider
   - Suggested edits or rephrasing
   - Overall strategic suggestions

7. **SUGGESTED REVISION**
   - Provide a complete revised version of the script incorporating all your recommendations
   - Format it exactly like the original with chapter headers and one sentence per line
   - Example format:
     Chapter 1
     First sentence.
     Second sentence.
     
     Chapter 2
     First sentence.
     Second sentence.

Please format your response as a structured report with clear headings and actionable feedback. Be honest about both strengths and areas for improvement."""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional video script analyst with expertise in marketing content, technical documentation, and video production. You provide detailed, constructive feedback to help improve script quality."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        
        print("  ✓ Script verification completed")
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"  ✗ Script verification failed: {e}")
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python 4_verify_script.py <directory>")
        print("Example: python 4_verify_script.py current-project/")
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
    script_final_file = directory / "script-final.txt"
    chapters_file = temp_dir / "chapters.json"
    
    if not script_final_file.exists():
        print(f"✗ Script file not found: {script_final_file}")
        print("Run step 3 first: python 3_generate_master_script.py current-project/")
        sys.exit(1)
    
    if not chapters_file.exists():
        print(f"✗ Chapters file not found: {chapters_file}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    print("Step 4: Script Verification")
    print("=" * 50)
    
    # Clean up any existing output files
    cleanup_patterns = [
        str(directory / "script-verification-report.txt")
    ]
    
    for pattern in cleanup_patterns:
        for file_path in glob.glob(pattern):
            try:
                os.unlink(file_path)
                print(f"  Cleaned up: {Path(file_path).name}")
            except OSError:
                pass
    
    # Load script and chapters
    with open(script_final_file, 'r') as f:
        script_content = f.read()
    
    with open(chapters_file, 'r') as f:
        chapters_data = json.load(f)
    
    print(f"Analyzing script: {script_final_file.name}")
    print(f"  Script length: {len(script_content.split())} words")
    print(f"  Video chapters: {len(chapters_data['chapters'])}")
    
    # Verify script
    verification_report = verify_script_quality(script_content, chapters_data)
    if not verification_report:
        sys.exit(1)
    
    # Save verification report
    report_file = directory / "script-verification-report.txt"
    with open(report_file, 'w') as f:
        f.write("# Script Verification Report\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"**Script File:** {script_final_file.name}\n")
        f.write(f"**Analysis Date:** {Path().cwd()}\n")
        f.write(f"**Word Count:** {len(script_content.split())} words\n\n")
        f.write(verification_report)
    
    print("\n" + "=" * 50)
    print("STEP 4 COMPLETED!")
    print("=" * 50)
    print("Created files:")
    print(f"  ✓ {report_file.name} (verification report)")
    
    print(f"\n📝 NEXT STEPS:")
    print(f"   1. Review the verification report in '{report_file.name}'")
    print(f"   2. Make any recommended edits to '{script_final_file.name}' if needed")
    print(f"   3. Re-run this step if you make significant changes")
    print(f"   4. Generate voice using Resemble.ai with the final script")
    print(f"   5. Save generated voice as: {directory}/a-roll.wav")
    print(f"      ⚠️  IMPORTANT: File must be named exactly 'a-roll.wav'")
    print(f"   6. Then run: python 5_audio_timing.py {directory}/")
    print(f"\n💡 TIP: This verification helps ensure your script is")
    print(f"    professional and effective before voice generation.")

if __name__ == "__main__":
    main()