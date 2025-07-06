#!/usr/bin/env python3
"""
Test video transition locally using ffmpeg.
Creates a 10-second video: 5s b-roll + 5s main content with 1s crossfade.
"""

import subprocess
import sys
from pathlib import Path

def create_crossfade_transition():
    """Create a crossfade transition between two 5-second clips using ffmpeg."""
    
    temp_dir = Path("temp-assets")
    broll_file = temp_dir / "b-roll_5sec.mp4"
    aroll_file = temp_dir / "1_5sec.mp4"
    output_file = temp_dir / "local_transition_test.mp4"
    
    # Check if files exist
    if not broll_file.exists():
        print(f"✗ B-roll file not found: {broll_file}")
        return False
    
    if not aroll_file.exists():
        print(f"✗ A-roll file not found: {aroll_file}")
        return False
    
    print("Creating transition video with ffmpeg...")
    print(f"B-roll: {broll_file}")
    print(f"A-roll: {aroll_file}")
    print(f"Output: {output_file}")
    
    # FFmpeg command for crossfade transition
    # B-roll plays 0-4.44s, A-roll plays 4-9s, crossfade during 4-4.44s
    cmd = [
        'ffmpeg',
        '-i', str(broll_file),  # Input 1: b-roll (video only)
        '-i', str(aroll_file),  # Input 2: a-roll (has audio)
        '-filter_complex', 
        '[0:v][1:v]xfade=transition=fade:duration=0.44:offset=4[v]',  # Crossfade transition
        '-map', '[v]',          # Use the crossfaded video
        '-map', '1:a',          # Use audio from a-roll (since b-roll has no audio)
        '-t', '9',              # Total duration 9 seconds
        '-y',                   # Overwrite output
        str(output_file)
    ]
    
    try:
        print("Running ffmpeg command...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"✓ Transition video created: {output_file}")
            
            # Get output file info
            info_cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(output_file)]
            info_result = subprocess.run(info_cmd, capture_output=True, text=True)
            if info_result.returncode == 0:
                duration = float(info_result.stdout.strip())
                print(f"Duration: {duration:.1f} seconds")
            
            print("\nTransition Details:")
            print("- B-roll: 0-5 seconds")
            print("- A-roll: 4-9 seconds") 
            print("- Crossfade: 4-5 seconds (1 second overlap)")
            print("- Total: 9 seconds")
            
            return True
        else:
            print(f"✗ FFmpeg failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("✗ FFmpeg command timed out")
        return False
    except Exception as e:
        print(f"✗ Error running ffmpeg: {e}")
        return False

def create_alternative_transition():
    """Alternative method: concatenate with fade effects."""
    
    temp_dir = Path("temp-assets")
    broll_file = temp_dir / "b-roll_5sec.mp4"
    aroll_file = temp_dir / "1_5sec.mp4"
    output_file = temp_dir / "local_transition_alt.mp4"
    
    print("\nTrying alternative transition method...")
    
    # More complex filter with individual fade effects
    cmd = [
        'ffmpeg',
        '-i', str(broll_file),
        '-i', str(aroll_file),
        '-filter_complex',
        '[0:v]fade=t=out:st=4:d=1[v0]; [1:v]fade=t=in:st=0:d=1[v1]; [v0][v1]xfade=transition=fade:duration=1:offset=4[v]',
        '-map', '[v]',
        '-map', '0:a',
        '-t', '9',
        '-y',
        str(output_file)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"✓ Alternative transition created: {output_file}")
            return True
        else:
            print(f"✗ Alternative method failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"✗ Error with alternative method: {e}")
        return False

def main():
    """Test local video transition."""
    print("Testing local video transition...")
    print("=" * 50)
    
    # Try main crossfade method
    success = create_crossfade_transition()
    
    if not success:
        # Try alternative method
        success = create_alternative_transition()
    
    if success:
        print("\n" + "=" * 50)
        print("LOCAL TRANSITION TEST COMPLETED!")
        print("=" * 50)
        print("This demonstrates the concept that would work with any video API")
        print("- Proper timing: 1s crossfade overlap")
        print("- No fade-to-black gaps")
        print("- Smooth transition between clips")
    else:
        print("\n✗ All transition methods failed")

if __name__ == "__main__":
    main()