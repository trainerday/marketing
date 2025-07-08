# Step 0: Setup Checklist

Complete this checklist before starting the video pipeline:

## ☐ 1. Prepare Your Screencast
- [ ] Record your screen demo and export as `orig_screencast.mp4` (MP4 required for chapter markers)
- [ ] Place file in: `current-project/human-provided-content/orig_screencast.mp4`

## ☐ 2. Set Up Project Configuration
- [ ] Copy `video-templates/project-config-template.json` to `current-project/human-provided-content/project-config.json`
- [ ] Edit `current-project/human-provided-content/project-config.json` and update:
  - [ ] `branding.title_line1` and `title_line2` (your video title)
  - [ ] `music.a_roll_background` (subtle background music path)
  - [ ] `music.b_roll_background` (energetic intro/outro music path)
  - [ ] `audio_levels` (adjust volumes if needed)

## ☐ 3. Verify Required Assets Exist
Check that all files referenced in your human-provided-content/project-config.json actually exist:
- [ ] B-roll video file (specified in `b_roll_video`)
- [ ] A-roll background music (specified in `music.a_roll_background`)
- [ ] B-roll background music (specified in `music.b_roll_background`)
- [ ] Intro video (specified in `intro_outro.intro_video`)
- [ ] Outro video (specified in `intro_outro.outro_video`)
- [ ] Assembly template (specified in `assembly_template`)

## ☐ 4. Validate Configuration
Test your configuration:
```bash
python3 "Step 1 - Validate Configuration.py" current-project/
```
This will check all files exist and configuration is valid.

## Ready? Start Step 2:
Run the script creation process:
```bash
python3 "Step 2 - Create Script.py" current-project/
```

## Support:
Need help with the video pipeline? Visit our support forums: https://forums.trainerday.com