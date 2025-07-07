# Step 0: Setup

## Required Files

Place these files before starting:

**Demo Video:**
- `current-project/original-content/video.mp4` (your screen recording)

**B-roll Video:**
- `current-project/original-content/b-roll.mp4` (10-11 seconds from Artgrid)

**Background Music:**
- Download 2 tracks from Epidemic Sound
- Place in `assets/music/` folder with any filenames
- Update `video-template.json` with the actual filenames

## Configuration

Edit `current-project/video-template.json`:
- Update `title_line1` and `title_line2` for your video
- Update `a_roll_background` and `b_roll_background` with your music filenames
  - A-roll: Subtle background music for voice sections
  - B-roll: Energetic music for intro/outro

## Next Step

```bash
python3 "Step 1 - Create Script.py" current-project/
```