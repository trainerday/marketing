#!/usr/bin/env python3
"""
Generate Title Overlay
- Read title text from config file
- Create customized SVG from template 
- Convert to PNG for video overlay
"""

import sys
import json
import subprocess
from pathlib import Path

def load_config(config_file):
    """Load configuration from JSON file."""
    try:
        with open(config_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"✗ Error loading config: {e}")
        return None

def generate_title_svg(template_file, config, output_file):
    """Generate customized SVG from template using config values."""
    try:
        # Read template
        with open(template_file, 'r') as f:
            svg_content = f.read()
        
        # Replace placeholders with config values
        title_line1 = config.get('branding', {}).get('title_line1', 'DEFAULT TITLE')
        title_line2 = config.get('branding', {}).get('title_line2', 'DEFAULT SUBTITLE')
        
        svg_content = svg_content.replace('{{TITLE_LINE1}}', title_line1)
        svg_content = svg_content.replace('{{TITLE_LINE2}}', title_line2)
        
        # Write customized SVG
        with open(output_file, 'w') as f:
            f.write(svg_content)
        
        print(f"  ✓ Generated title SVG: {output_file}")
        print(f"    Line 1: {title_line1}")
        print(f"    Line 2: {title_line2}")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error generating SVG: {e}")
        return False

def convert_svg_to_png(svg_file, png_file):
    """Convert SVG to PNG using rsvg-convert."""
    try:
        cmd = [
            'rsvg-convert', 
            '--background-color=transparent',
            str(svg_file)
        ]
        
        with open(png_file, 'wb') as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
        
        if result.returncode == 0:
            print(f"  ✓ Converted to PNG: {png_file}")
            return True
        else:
            print(f"  ✗ SVG conversion failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"  ✗ Error converting SVG: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python generate_title_overlay.py <directory>")
        print("Example: python generate_title_overlay.py current-project/")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    # File paths
    config_file = directory / "video-template.json"
    template_file = Path("assets/video_title_template.svg")
    temp_dir = directory / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    output_svg = temp_dir / "title_overlay.svg"
    output_png = temp_dir / "title_overlay.png"
    
    print("Generating Title Overlay")
    print("=" * 50)
    
    # Load config
    config = load_config(config_file)
    if not config:
        sys.exit(1)
    
    # Generate customized SVG
    if not generate_title_svg(template_file, config, output_svg):
        sys.exit(1)
    
    # Convert to PNG
    if not convert_svg_to_png(output_svg, output_png):
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("🎨 TITLE OVERLAY READY!")
    print("=" * 50)
    print(f"  SVG: {output_svg}")
    print(f"  PNG: {output_png}")
    print("\nReady for video overlay integration!")

if __name__ == "__main__":
    main()