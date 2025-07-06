# Marketing Video Automation Session Notes

## Current Status: Testing Step-by-Step Pipeline

### What We've Accomplished

#### 1. **Completely Rewrote Video Pipeline** 
- **Simplified from 8 complex scripts to 8 focused scripts**
- **Removed dependencies**: Suno (music), Shotstack (cloud rendering), Runway (video generation)
- **New stack**: FFmpeg (local) + OpenAI APIs + Manual assets (Resemble.ai, Epidemic Sound, Artgrid)

#### 2. **Clean Project Structure**
- **Renamed**: `temp-assets/` → `current-project/` (much better naming)
- **Organized**: All intermediate files go in `current-project/temp/` subdirectory
- **Git ignore**: Created comprehensive `.gitignore` for clean repo
- **Template**: Created `video-template.json` with music assets and settings

#### 3. **Robust File Management**
- **Auto-cleanup**: Each step removes its output files before running
- **Dynamic cleanup**: Uses glob patterns, not hardcoded filenames
- **Temp directory**: Keeps main directory clean with only essential files

### Current Pipeline Progress

#### ✅ **Step 1: Extract Audio & Chapters** - COMPLETED
- **Input**: `current-project/orig-video.mp4` (ScreenFlow recording with chapter markers)
- **Output**: 
  - `temp/audio.wav` (91.6s full audio track)
  - `temp/chapters.json` (3 chapters: 23.6s, 44.7s, 23.3s)
  - `temp/chapters/chapter_1.mp4, chapter_2.mp4, chapter_3.mp4` (video-only, no audio)
- **Key improvement**: Chapter videos are now silent (prevent audio conflicts)

#### ✅ **Step 2: Transcribe Audio** - COMPLETED  
- **Input**: `temp/audio.wav`
- **Output**: `temp/transcript.json` 
- **Result**: Full transcription starting with "We have considerably simplified the way Coach Jack works with regards to hours and minutes..."
- **API**: OpenAI Whisper for speech-to-text

#### 🟡 **Step 3: Generate Master Script** - READY TO RUN
- **Next command**: `python 3_generate_master_script.py current-project/`
- **Purpose**: Use GPT-4 to enhance transcription into polished marketing script
- **Output**: `master_script.txt` (for manual editing) + `temp/master_script.json` (for processing)

### Available Assets

#### **Music Library** (from `assets/music/`)
- **A-roll background**: `ES_Falconeer - Lovren.mp3` (subtle, for voice-over)
- **B-roll background**: `ES_Spaghetti on the Island - Thompson Town Flowers.mp3` (energetic, for intro/outro)
- **Alternatives**: 9 other tracks organized by mood (ambient, energetic, corporate)

#### **Project Files Ready**
```
current-project/
├── orig-video.mp4              # ✅ ScreenFlow recording (91.6s, 3 chapters)
├── a-roll.wav                  # ✅ Generated voice (manual from Resemble.ai)
├── b-roll.mp4                  # ✅ Intro/outro video (manual from Artgrid)
├── background_music.mp3        # ✅ Copied from Falconeer track
├── video-template.json         # ✅ Configuration template
└── temp/                       # ✅ Steps 1-2 completed
    ├── audio.wav               # Original audio extraction
    ├── chapters.json           # Chapter timing data
    ├── transcript.json         # OpenAI transcription
    └── chapters/               # Silent video chapters
        ├── chapter_1.mp4
        ├── chapter_2.mp4
        └── chapter_3.mp4
```

### Remaining Pipeline Steps

#### **Step 3**: Generate Master Script (NEXT)
- Use GPT-4 to polish transcription into marketing copy
- Target 75-80 words per chapter
- Preserve technical terminology while improving flow

#### **Manual Step 4**: Review & Voice Generation
- Edit `master_script.txt` 
- Generate voice using Resemble.ai web interface → `a-roll.wav`
- Ensure background music and b-roll are ready

#### **Steps 5-9**: Automated Assembly
- **Step 5**: Audio timing markers (GPT-4 creates timing data)
- **Step 6**: Split audio into chapters
- **Step 7**: Match video timing (extend/trim videos to audio + 1s)
- **Step 8**: Create music track (process background music)
- **Step 9**: Final assembly (combine everything with FFmpeg)

### Key Technical Decisions

#### **FFmpeg-Based Local Processing**
- **Why**: Complete control, no API costs, faster iteration
- **Benefits**: Professional crossfade transitions, precise audio mixing, no cloud dependencies

#### **Clean File Organization**
- **Main directory**: Only files user interacts with
- **Temp directory**: All intermediate processing files
- **Auto-cleanup**: Fresh start every run

#### **Robust Error Handling**
- Each step validates inputs and provides clear next-step instructions
- Dynamic file cleanup prevents conflicts
- Comprehensive logging for troubleshooting

### Current Test Video Details
- **Source**: ScreenFlow recording about "Coach Jack hours and minutes simplification"
- **Duration**: 91.6 seconds total
- **Chapters**: 3 segments with natural chapter markers
- **Content**: Software demonstration with original voice narration

### Environment Setup
- **FFmpeg**: Installed at `/opt/homebrew/bin/`
- **OpenAI API**: Key loaded from `.env` file
- **Python**: OpenAI library available
- **Git**: Comprehensive `.gitignore` created

### Next Action
Run Step 3 to generate enhanced marketing script:
```bash
export $(cat .env | xargs) && python 3_generate_master_script.py current-project/
```

### Strategy Notes
- **Testing approach**: One step at a time with verification
- **Quality focus**: Each step must work reliably before proceeding
- **Scalability**: Generic code that works for any video length/chapter count
- **Professional output**: Targeting broadcast-quality marketing videos

### Future Enhancements (Post-Testing)
- **Overlays**: Transparent PNG overlays, talking head intro/outro
- **Advanced audio**: Ducking, keyframe volume control, professional mixing
- **Templates**: Multiple video templates for different content types
- **Batch processing**: Handle multiple videos in sequence

This represents a complete rewrite from complex cloud-based pipeline to streamlined local processing with professional results.