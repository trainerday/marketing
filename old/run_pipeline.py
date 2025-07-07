#!/usr/bin/env python3
"""
Marketing Video Pipeline Runner
Run the complete 9-step processing pipeline or individual steps.
"""

import sys
import subprocess
from pathlib import Path

STEPS = [
    "1_extract_audio_chapters.py",
    "2_transcribe_audio.py", 
    "3_generate_master_script.py",
    "4_verify_script.py",
    "5_audio_timing.py",
    "6_match_video_timing.py",
    "7_create_background_music.py",
    "8_process_voice.py",
    "9_final_assembly_and_add_overlays.py"
]

DESCRIPTIONS = [
    "Extract audio + split video by chapters",
    "Transcribe audio to text",
    "Generate marketing script", 
    "✅ VERIFY script quality (manual review)",
    "Calculate chapter timing data",
    "Combine video chapters with audio",
    "Create professional background music",
    "Process voice with Resemble AI", 
    "Final assembly + title/logo overlays"
]

def show_pipeline():
    """Show the complete pipeline."""
    print("MARKETING VIDEO PROCESSING PIPELINE")
    print("=" * 50)
    for i, (step, desc) in enumerate(zip(STEPS, DESCRIPTIONS), 1):
        print(f"{i:2d}. {step:<35} - {desc}")
    print()

def run_step(step_num, project_dir):
    """Run a specific step."""
    if step_num < 1 or step_num > len(STEPS):
        print(f"✗ Invalid step number: {step_num}")
        return False
    
    step_file = Path("processing-steps") / STEPS[step_num - 1]
    if not step_file.exists():
        print(f"✗ Step file not found: {step_file}")
        return False
    
    print(f"\n🚀 Running Step {step_num}: {DESCRIPTIONS[step_num - 1]}")
    print("-" * 60)
    
    cmd = ["python3", str(step_file), project_dir]
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print(f"✅ Step {step_num} completed successfully!")
        return True
    else:
        print(f"❌ Step {step_num} failed!")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 run_pipeline.py <project_dir>              # Show pipeline")
        print("  python3 run_pipeline.py <project_dir> <step_num>   # Run specific step")
        print("  python3 run_pipeline.py <project_dir> all          # Run all steps")
        print()
        show_pipeline()
        sys.exit(1)
    
    project_dir = sys.argv[1]
    
    if not Path(project_dir).exists():
        print(f"✗ Project directory not found: {project_dir}")
        sys.exit(1)
    
    if len(sys.argv) == 2:
        # Just show pipeline
        show_pipeline()
        return
    
    command = sys.argv[2]
    
    if command == "all":
        print("🚀 Running complete pipeline...")
        for step_num in range(1, len(STEPS) + 1):
            if step_num == 4:  # Verification step
                print(f"\n⚠️  Step 4 is manual verification - please run separately:")
                print(f"   python3 processing-steps/4_verify_script.py {project_dir}")
                input("Press Enter to continue after verification...")
                continue
                
            if not run_step(step_num, project_dir):
                print(f"\n❌ Pipeline stopped at step {step_num}")
                sys.exit(1)
        
        print("\n🎉 Complete pipeline finished successfully!")
        
    else:
        try:
            step_num = int(command)
            run_step(step_num, project_dir)
        except ValueError:
            print(f"✗ Invalid command: {command}")
            sys.exit(1)

if __name__ == "__main__":
    main()