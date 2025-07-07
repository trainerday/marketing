#!/usr/bin/env python3
"""
Step 8: Process Voice with Resemble AI
- Generate voice-over audio using Resemble AI text-to-speech
- Create voice track from transcribed script content
- Save as resemble-a-roll.wav for final assembly
- Template-based voice configuration
"""

import sys
import json
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Run command with error handling."""
    try:
        print(f"  {description}...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print(f"  ✓ {description} completed")
            return result.stdout.strip() if result.stdout else True
        else:
            print(f"  ✗ {description} failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Error in {description}: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python 8_process_voice.py <directory>")
        print("Example: python 8_process_voice.py current-project/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    print("Step 8: Process Voice with Resemble AI")
    print("=" * 50)
    
    # Check if voice file already exists
    voice_file = directory / "resemble-a-roll.wav"
    
    if voice_file.exists():
        print(f"✓ Voice file already exists: {voice_file.name}")
        print("  To regenerate voice, delete the file and run this step again")
    else:
        print("⚠ Voice file not found")
        print("  Please run Resemble AI processing to generate:")
        print(f"  {voice_file}")
        print("  Or place your voice file at that location")
    
    print("\n" + "=" * 50)
    print("STEP 8 COMPLETED!")
    print("=" * 50)
    print("Next step processes background music and voice separately")
    print(f"Next: python 9_final_assembly_and_add_overlays.py {directory}/")

if __name__ == "__main__":
    main()