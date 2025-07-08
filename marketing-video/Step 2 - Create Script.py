#!/usr/bin/env python3
"""
Step 2: Create Script

Extract audio, transcribe, and generate your marketing script from the demo video.
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}")
    print(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✅ {description} - Success!")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - Failed!")
        print(f"Error: {e.stderr}")
        return False

def main():
    """Main function to run the script creation pipeline"""
    
    print("=" * 60)
    print("Step 2: Create Script")
    print("=" * 60)
    print("Extract audio, transcribe, and generate your marketing script from the demo video.")
    print()
    
    # Check if required files exist
    screencast_file = "current-project/human-provided-content/orig_screencast.mp4"
    if not os.path.exists(screencast_file):
        print(f"❌ Error: {screencast_file} not found!")
        print("Please ensure your screencast video is in the correct location.")
        sys.exit(1)
    
    # Step 1: Extract Audio and Chapters
    success = run_command([
        "python3", "processing-steps/1_extract_audio_chapters.py", 
        screencast_file
    ], "Extract Audio and Chapters")
    
    if not success:
        print("❌ Failed to extract audio and chapters. Stopping.")
        sys.exit(1)
    
    # Step 2: Transcribe Audio
    success = run_command([
        "python3", "processing-steps/2_transcribe_audio.py", 
        "current-project/"
    ], "Transcribe Audio")
    
    if not success:
        print("❌ Failed to transcribe audio. Stopping.")
        sys.exit(1)
    
    # Step 3: Generate Master Script
    success = run_command([
        "python3", "processing-steps/3_generate_master_script.py", 
        "current-project/"
    ], "Generate Master Script")
    
    if not success:
        print("❌ Failed to generate master script. Stopping.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ Step 2 Complete!")
    print("=" * 60)
    
    print("\n📁 Generated Files:")
    print("- current-project/temp/audio.wav - Extracted audio")
    print("- current-project/temp/chapters.json - Chapter timing data")
    print("- current-project/temp/original-chapters/ - Individual chapter video files")
    print("- current-project/temp/transcript.json - Audio transcription")
    print("- current-project/script-for-review-sentences.txt - Enhanced script for review")
    print("- current-project/script-generated.txt - Auto-generated script")
    
    print("\n📝 Next Steps:")
    print("1. Review script quality in 'script-for-review-sentences.txt'")
    print("2. Edit/update the script in 'human-provided-content/resemble-a-roll.txt'")
    print("3. Run verification: python processing-steps/4_verify_script.py current-project/")
    print("4. Generate voice files using Resemble.ai")
    print("5. Save chapter audio files as: resemble-chapters/1.wav, 2.wav, 3.wav, etc.")
    
    print("\n💡 TIP: Take time to perfect your script - it's worth the effort!")

if __name__ == "__main__":
    main()