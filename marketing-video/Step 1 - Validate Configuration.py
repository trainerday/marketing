#!/usr/bin/env python3
"""
Step 1: Validate Configuration
Verify that all required files exist and project configuration is valid.
"""

import json
import sys
from pathlib import Path

def validate_configuration(project_dir):
    """Validate project configuration and all referenced assets."""
    project_path = Path(project_dir)
    
    print("Step 1: Validate Configuration")
    print("=" * 50)
    
    # Check main screencast file (must be MP4 for chapter markers)
    screencast = project_path / "human-provided-content" / "orig_screencast.mp4"
    if screencast.exists():
        size_mb = screencast.stat().st_size / (1024 * 1024)
        print(f"✓ Screencast found: {screencast} ({size_mb:.1f} MB)")
    else:
        print(f"✗ Screencast missing: {screencast}")
        print("  NOTE: File must be MP4 format to preserve chapter markers")
        return False
    
    # Check project config
    config_file = project_path / "human-provided-content" / "project-config.json"
    if not config_file.exists():
        print(f"✗ Project config missing: {config_file}")
        print("  Copy video-templates/project-config-template.json to human-provided-content/project-config.json")
        return False
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        print(f"✓ Project config loaded: {config_file}")
    except json.JSONDecodeError as e:
        print(f"✗ Project config invalid JSON: {e}")
        return False
    
    # Validate required sections
    required_sections = ['music', 'branding', 'intro_outro', 'b_roll_video', 'assembly_template']
    for section in required_sections:
        if section not in config:
            print(f"✗ Missing config section: {section}")
            return False
        print(f"✓ Config section present: {section}")
    
    # Check referenced assets
    print("\nValidating referenced assets:")
    
    # B-roll video
    broll_path = Path(config['b_roll_video'])
    if broll_path.exists():
        print(f"✓ B-roll video: {broll_path}")
    else:
        print(f"✗ B-roll video missing: {broll_path}")
        return False
    
    # Music files
    for music_type, path in config['music'].items():
        music_file = Path(path)
        if music_file.exists():
            print(f"✓ {music_type}: {music_file}")
        else:
            print(f"✗ {music_type} missing: {music_file}")
            return False
    
    # Intro/outro files
    for io_type, path in config['intro_outro'].items():
        io_file = Path(path)
        if io_file.exists():
            print(f"✓ {io_type}: {io_file}")
        else:
            print(f"✗ {io_type} missing: {io_file}")
            return False
    
    # Assembly template
    template = Path('video-templates') / config['assembly_template']
    if template.exists():
        print(f"✓ Assembly template: {template}")
    else:
        print(f"✗ Assembly template missing: {template}")
        return False
    
    # Validate branding info
    branding = config.get('branding', {})
    if branding.get('title_line1') and branding.get('title_line2'):
        print(f"✓ Branding: '{branding['title_line1']}' / '{branding['title_line2']}'")
    else:
        print("⚠ Warning: title_line1 or title_line2 not set in branding section")
    
    print("\n" + "=" * 50)
    print("🎉 CONFIGURATION VALID!")
    print("=" * 50)
    print("All required files found and configuration is valid.")
    print("\nNext step:")
    print("Follow instructions in 'Step 2 - Create Script.md'")
    
    return True

def main():
    if len(sys.argv) != 2:
        print("Usage: python 'Step 1 - Validate Configuration.py' <project_directory>")
        print("Example: python 'Step 1 - Validate Configuration.py' current-project/")
        sys.exit(1)
    
    project_dir = sys.argv[1]
    if not validate_configuration(project_dir):
        print("\n✗ Configuration validation failed!")
        print("Please fix the issues above before proceeding.")
        sys.exit(1)

if __name__ == "__main__":
    main()