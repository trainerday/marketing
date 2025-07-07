#!/usr/bin/env python3
"""
STEP 1: CREATE SCRIPT
Automated processing to create marketing script from demo video.
Runs processing steps 1-3.
"""

import sys
import subprocess
from pathlib import Path

def run_step(step_file, project_dir, description):
    """Run a processing step."""
    print(f"\n🚀 {description}")
    print("-" * 60)
    
    step_path = Path("processing-steps") / step_file
    cmd = ["python3", str(step_path), project_dir]
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print(f"✅ {description} - COMPLETED!")
        return True
    else:
        print(f"❌ {description} - FAILED!")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 'Step 1 - Create Script.py' <project_dir>")
        print("Example: python3 'Step 1 - Create Script.py' current-project/")
        sys.exit(1)
    
    project_dir = sys.argv[1]
    
    if not Path(project_dir).exists():
        print(f"✗ Project directory not found: {project_dir}")
        sys.exit(1)
    
    print("=" * 60)
    print("STEP 1: CREATE MARKETING SCRIPT FROM DEMO VIDEO")
    print("=" * 60)
    print("This will run automated processing steps 1-3:")
    print("  1. Extract audio + split video by chapters")
    print("  2. Transcribe audio to text")
    print("  3. Generate marketing script")
    print()
    
    # Run steps 1-3
    steps = [
        ("1_extract_audio_chapters.py", "Step 1: Extract audio + split video by chapters"),
        ("2_transcribe_audio.py", "Step 2: Transcribe audio to text"),
        ("3_generate_master_script.py", "Step 3: Generate marketing script")
    ]
    
    for step_file, description in steps:
        if not run_step(step_file, project_dir, description):
            print(f"\n❌ STEP 1 FAILED at: {description}")
            sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🎉 STEP 1 COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print("Created files:")
    print(f"  📄 {project_dir}/temp/chapters.json")
    print(f"  🎵 {project_dir}/temp/audio.wav")
    print(f"  📝 {project_dir}/temp/transcription.txt")
    print(f"  📜 {project_dir}/temp/marketing_script.txt")
    print()
    print("NEXT STEP:")
    print("🔍 Review and edit the generated script:")
    print(f"   📝 {project_dir}/temp/marketing_script.txt")
    print()
    print("Then run:")
    print('🚀 "Step 2 - Human Review.txt" - Read instructions')
    print('🚀 python3 "Step 3 - Create Final Video.py" current-project/')

if __name__ == "__main__":
    main()