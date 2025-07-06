# Marketing Video Automation - Simplified Process

## Overview
Streamlined 9-step pipeline for creating professional marketing videos from ScreenFlow recordings.

## Technologies
- **FFmpeg**: All video/audio processing (local)
- **OpenAI API**: Transcription and script enhancement
- **Manual Assets**: Resemble.ai voice, Epidemic Sound music, Artgrid b-roll

## Process Steps

### 1. Extract Audio & Chapters
- Extract audio track from MP4 video files
- Get chapter markers from ScreenFlow recordings
- Split MP4 into individual chapter video files
- **Output**: audio.wav, chapters.json, chapter video files

### 2. Transcribe Audio
- Simple speech-to-text of original recording using OpenAI Whisper
- **Output**: transcript.json with basic text

### 3. Generate Master Script
- Break transcript into chapters
- Send to GPT for polishing and enhancement
- **Output**: master_script.txt (ready for review/editing)

### 4. Manual Review & Voice Generation
- Alex reviews and edits master script
- Generate voice using Resemble.ai web interface
- Add a-roll.wav to project folder

### 5. Audio Translation with Timing
- Send audio to GPT to create time markers
- Map audio segments to video chapters
- **Output**: audio_timing.json

### 6. Split Audio into Chapters
- Divide a-roll.wav into chapter segments based on timing data
- **Output**: chapter_1.wav, chapter_2.wav, etc.

### 7. Match Video to Audio Timing
- Extend or trim video chapters to match audio length + 1 second
- Use freeze frame extension or cutting as needed
- **Output**: timed_chapter_videos/

### 8. Create Music Track
- Simple background music preparation
- Future: Advanced audio level mixing
- **Output**: background_music.wav

### 9. Final Assembly
- Combine music, b-roll intro/outro, and chapter files
- Future: Overlays (talking head, titles)
- **Output**: final_video.mp4

## File Structure
```
current-project/
├── orig-video.mp4              # Input recording
├── master_script.txt           # Polished script (for manual editing)
├── a-roll.wav                  # Generated voice (manual)
├── background_music.mp3        # Background music (manual)
├── b-roll.mp4                  # Intro/outro video (manual)
├── final_video.mp4             # Final output
└── temp/                       # All intermediate files
    ├── audio.wav               # Extracted audio
    ├── chapters.json           # Chapter timing data
    ├── transcript.json         # Speech-to-text
    ├── master_script.json      # Script data for processing
    ├── audio_timing.json       # Audio timing markers
    ├── chapter_1.wav           # Split audio files
    ├── chapter_2.wav
    ├── chapter_3.wav
    ├── background_music.wav    # Processed music track
    ├── chapters/               # Split video files
    │   ├── chapter_1.mp4
    │   ├── chapter_2.mp4
    │   └── chapter_3.mp4
    └── timed_chapter_videos/   # Video files matched to audio
        ├── chapter_1.mp4
        ├── chapter_2.mp4
        └── chapter_3.mp4
```

## Manual Assets Required
- **Resemble.ai**: Generated voice files (a-roll.wav)
- **Epidemic Sound**: Background music
- **Artgrid**: 10-second b-roll video

## Usage
```bash
python 1_extract_audio_chapters.py current-project/orig-video.mp4
python 2_transcribe_audio.py current-project/
python 3_generate_master_script.py current-project/
# Manual: Review script, generate voice, add a-roll.wav
python 5_audio_timing.py current-project/
python 6_split_audio.py current-project/
python 7_match_video_timing.py current-project/
python 8_create_music.py current-project/
python 9_final_assembly.py current-project/
```

Total automation time: ~30 minutes from recording to final video.