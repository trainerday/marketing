#!/usr/bin/env python3
"""
Step 2: Transcribe Audio
- Simple speech-to-text of original recording using OpenAI Whisper
"""

import os
import sys
import json
from pathlib import Path
from openai import OpenAI

def transcribe_audio(audio_file):
    """Transcribe audio using OpenAI Whisper."""
    try:
        print("  Connecting to OpenAI...")
        client = OpenAI()
        
        print("  Uploading audio for transcription...")
        with open(audio_file, 'rb') as f:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json"
            )
        
        print("  ✓ Transcription completed")
        return response
        
    except Exception as e:
        print(f"  ✗ Transcription failed: {e}")
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python 2_transcribe_audio.py <directory>")
        print("Example: python 2_transcribe_audio.py current-project/")
        sys.exit(1)
    
    # Check for OpenAI API key
    if not os.getenv('OPENAI_API_KEY'):
        print("✗ OPENAI_API_KEY environment variable not set")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    if not directory.exists():
        print(f"✗ Directory not found: {directory}")
        sys.exit(1)
    
    temp_dir = directory / "temp"
    if not temp_dir.exists():
        print(f"✗ Temp directory not found: {temp_dir}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    audio_file = temp_dir / "audio.wav"
    if not audio_file.exists():
        print(f"✗ Audio file not found: {audio_file}")
        print("Run step 1 first: python 1_extract_audio_chapters.py orig-video.mp4")
        sys.exit(1)
    
    transcript_file = temp_dir / "transcript.json"
    
    # Clean up existing transcript file
    if transcript_file.exists():
        transcript_file.unlink()
        print(f"  Removed existing {transcript_file.name}")
    
    print("Step 2: Transcribe Audio")
    print("=" * 50)
    print(f"Transcribing: {audio_file.name}")
    
    # Transcribe audio
    transcript = transcribe_audio(audio_file)
    if not transcript:
        sys.exit(1)
    
    # Save transcript
    transcript_data = {
        'text': transcript.text,
        'segments': transcript.segments,
        'duration': transcript.duration
    }
    
    with open(transcript_file, 'w') as f:
        json.dump(transcript_data, f, indent=2)
    
    print("\n" + "=" * 50)
    print("STEP 2 COMPLETED!")
    print("=" * 50)
    print("Created files:")
    print(f"  ✓ {transcript_file.name}")
    print(f"\nTranscription preview:")
    print(f"  Duration: {transcript.duration:.1f} seconds")
    print(f"  Text: {transcript.text[:100]}...")
    print("\nNext: python 3_generate_master_script.py temp-assets/")

if __name__ == "__main__":
    main()