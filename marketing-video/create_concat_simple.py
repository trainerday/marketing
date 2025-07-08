#!/usr/bin/env python3
"""Simple script to create video concat list"""

from pathlib import Path
import json
import sys

def create_simple_concat_list(directory):
    temp_dir = Path(directory) / "temp"
    temp_final_dir = temp_dir / "temp_final"
    temp_final_dir.mkdir(exist_ok=True)
    
    # Load timing data
    timing_file = temp_dir / "audio_timing.json"
    with open(timing_file, 'r') as f:
        timing_data = json.load(f)
    
    chapter_timings = timing_data['chapter_timings']
    
    # File paths (ProRes files are in temp_prores subdirectory)
    prores_dir = temp_dir / "temp_prores"
    broll_file = prores_dir / "b-roll_prores.mov"
    intro1_file = prores_dir / "intro1_prores.mov"
    outro1_file = prores_dir / "outro1_prores.mov"
    timed_videos_dir = temp_dir / "timed_chapter_videos"
    
    # Create concat list
    concat_list = temp_final_dir / "video_concat.txt"
    
    with open(concat_list, 'w') as f:
        # Add b-roll intro
        f.write(f"file '{broll_file.resolve()}'\n")
        
        # Add intro talking head
        f.write(f"file '{intro1_file.resolve()}'\n")
        
        # Add chapters
        for timing in chapter_timings:
            chapter_num = timing['chapter']
            chapter_file = timed_videos_dir / f"chapter_{chapter_num}.mov"
            if chapter_file.exists():
                f.write(f"file '{chapter_file.resolve()}'\n")
            else:
                print(f"Missing: {chapter_file}")
        
        # Add outro talking head
        f.write(f"file '{outro1_file.resolve()}'\n")
    
    print(f"Created: {concat_list}")
    return concat_list

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python create_concat_simple.py <project_dir>")
        sys.exit(1)
    
    create_simple_concat_list(sys.argv[1])