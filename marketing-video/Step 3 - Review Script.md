# Step 3: Review Script

## Perfect Your Script (Most Important Step!)

**⚠️ Take time here - this saves hours later!**

### 1. Edit & Verify Loop
1. **Open:** `current-project/script-for-review.txt`
2. **Edit:** Fix errors, improve messaging, add your voice
3. **Verify:** Run verification script:
   ```bash
   python3 processing-steps/4_verify_script.py current-project/
   ```
4. **Repeat:** Keep editing and verifying until script is perfect

### 2. Listen & Refine
1. **Generate voice:** Use Resemble AI to test your script
2. **Listen:** Does it sound natural and engaging?
3. **Edit script:** Fix awkward phrasing, timing issues
4. **Verify again:** Run verification script
5. **Repeat:** Until you're completely satisfied

## Voice Options

**Option A:** Let Resemble AI generate voice from your script (automatic)

**Option B:** Record your own voice and save as `current-project/resemble-a-roll.wav`

## Next Step

Only proceed when script is perfect:
```bash
python3 "Step 5 - Create Final Video.py" current-project/
```