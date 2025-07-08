#!/usr/bin/env python3
"""
Step 4: Verify Script
Analyze your edited script for quality and provide improvement recommendations.
"""

import subprocess
import sys
from pathlib import Path

def main():
    if len(sys.argv) != 2:
        print("Usage: python 'Step 4 - Verify Script.py' <project_directory>")
        print("Example: python 'Step 4 - Verify Script.py' current-project/")
        sys.exit(1)
    
    project_dir = sys.argv[1]
    project_path = Path(project_dir)
    
    print("Step 4: Verify Script")
    print("=" * 50)
    print("This step analyzes your edited script for quality and provides recommendations.")
    print()
    
    # Check if script file exists
    script_file = project_path / "human-provided-content" / "resemble-a-roll.txt"
    if not script_file.exists():
        print(f"✗ Script file not found: {script_file}")
        print("Please complete Step 3 (script generation) first.")
        sys.exit(1)
    
    print(f"✓ Found script file: {script_file}")
    print()
    
    # Run the verification script
    try:
        print("Running script verification...")
        result = subprocess.run([
            'python3', 'processing-steps/4_verify_script.py', project_dir
        ], check=True, capture_output=False)
        
        print("\n" + "=" * 50)
        print("STEP 4 COMPLETED!")
        print("=" * 50)
        print("✓ Script verification completed successfully")
        print()
        print("Next Steps:")
        print("1. Review the verification report in 'script-verification-report.txt'")
        print("2. Edit 'human-provided-content/resemble-a-roll.txt' if improvements are needed")
        print("3. Re-run this step if you make significant changes")
        print("4. When satisfied, generate voice audio using Resemble.ai")
        print("5. Follow the instructions in the verification report for next steps")
        
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Script verification failed with exit code {e.returncode}")
        print("Please check the error messages above and fix any issues.")
        sys.exit(1)
    except FileNotFoundError:
        print("\n✗ Could not find 'processing-steps/4_verify_script.py'")
        print("Please ensure you're running this from the correct directory.")
        sys.exit(1)

if __name__ == "__main__":
    main()