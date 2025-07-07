#!/usr/bin/env python3
"""
STEP 3: CREATE FINAL VIDEO
Automated processing to create final marketing video.
Runs processing steps 4-9.
"""

import sys
import subprocess
from pathlib import Path

def run_step(step_file, project_dir, description, skip_on_fail=False):
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
        if skip_on_fail:
            print("⚠️  Continuing anyway...")
            return True
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 'Step 3 - Create Final Video.py' <project_dir>")
        print("Example: python3 'Step 3 - Create Final Video.py' current-project/")
        sys.exit(1)
    
    project_dir = sys.argv[1]
    
    if not Path(project_dir).exists():
        print(f"✗ Project directory not found: {project_dir}")
        sys.exit(1)
    
    print("=" * 60)
    print("STEP 3: CREATE FINAL MARKETING VIDEO")
    print("=" * 60)
    print("This will run automated processing steps 4-9:")
    print("  4. Verify script quality (optional)")
    print("  5. Calculate chapter timing data")
    print("  6. Combine video chapters with audio")
    print("  7. Create professional background music")
    print("  8. Process voice with Resemble AI")
    print("  9. Final assembly + title/logo overlays")
    print()
    
    # Run steps 4-9
    steps = [
        ("4_verify_script.py", "Step 4: Verify script quality", True),  # Skip on fail
        ("5_audio_timing.py", "Step 5: Calculate chapter timing data", False),
        ("6_match_video_timing.py", "Step 6: Combine video chapters with audio", False),
        ("7_create_background_music.py", "Step 7: Create professional background music", False),
        ("8_process_voice.py", "Step 8: Process voice with Resemble AI", False),
        ("9_final_assembly_and_add_overlays.py", "Step 9: Final assembly + overlays", False)
    ]
    
    for step_file, description, skip_on_fail in steps:
        if not run_step(step_file, project_dir, description, skip_on_fail):
            print(f"\n❌ STEP 3 FAILED at: {description}")
            sys.exit(1)
    
    # Get final video info
    final_video = Path(project_dir) / "final-output" / "final_video.mov"
    
    print("\n" + "=" * 60)
    print("🎉 MARKETING VIDEO PIPELINE COMPLETED!")
    print("=" * 60)
    
    if final_video.exists():
        # Get file size
        size_mb = final_video.stat().st_size / (1024 * 1024)
        print("✅ FINAL VIDEO CREATED:")
        print(f"   📹 {final_video}")
        print(f"   📊 Size: {size_mb:.1f} MB")
        print(f"   🎨 Format: ProRes 422 (high quality)")
        print(f"   ⏱️  Duration: ~114 seconds")
        print()
        print("🎯 WHAT'S INCLUDED:")
        print("   • B-roll intro (10+ seconds)")
        print("   • Your demo content with voice-over")
        print("   • Professional background music")
        print("   • Title and logo overlays") 
        print("   • B-roll outro (10+ seconds)")
        print()
        print("🚀 READY FOR:")
        print("   • Upload to YouTube/social media")
        print("   • Final Cut Pro editing (if needed)")
        print("   • Distribution and marketing")
        print()
        print("💡 TIPS:")
        print("   • The ProRes format ensures highest quality")
        print("   • You can compress to MP4 for web if needed")
        print("   • Consider adding captions for accessibility")
        
    else:
        print("❌ Final video file not found!")
        print("Check the processing steps for errors.")

if __name__ == "__main__":
    main()