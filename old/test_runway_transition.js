#!/usr/bin/env node

const RunwayML = require('@runwayml/sdk');
const fs = require('fs');
const path = require('path');

// Initialize Runway client
const client = new RunwayML({
  apiKey: 'key_88df1b0b07eda2b6544130b256d85d26525aa8a0502181884a6463a153a7b2f1f7f85a71766f8f605366835fa97cbebf64306ed4fe03a1dd3453811c4ca55681'
});

async function uploadFile(filePath, filename) {
  try {
    console.log(`  Uploading ${filename} to Runway...`);
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload file - try different SDK methods
    let upload;
    try {
      upload = await client.uploads.create({
        filename: filename,
        file: fileBuffer
      });
    } catch (e1) {
      try {
        upload = await client.upload({
          filename: filename,
          file: fileBuffer
        });
      } catch (e2) {
        try {
          upload = await client.createUpload({
            filename: filename,
            file: fileBuffer
          });
        } catch (e3) {
          console.log('    Available client methods:', Object.keys(client));
          throw new Error(`All upload methods failed: ${e1.message}, ${e2.message}, ${e3.message}`);
        }
      }
    }
    
    console.log(`    ✓ Upload complete: ${upload.id}`);
    return upload.id;
    
  } catch (error) {
    console.log(`    ✗ Error uploading ${filename}:`, error.message);
    return null;
  }
}

async function createTransitionVideo(brollAssetId, arollAssetId) {
  try {
    console.log('Creating video timeline...');
    
    // Create a simple timeline with crossfade transition
    const timeline = {
      tracks: [
        {
          type: 'video',
          clips: [
            {
              assetId: brollAssetId,
              start: 0,
              end: 6, // 6 seconds (5s + 1s overlap)
              assetStart: 0,
              assetEnd: 5, // Use first 5 seconds of b-roll
              transitions: {
                out: {
                  type: 'crossfade',
                  duration: 1.0
                }
              }
            },
            {
              assetId: arollAssetId,
              start: 5, // Start 1s before b-roll ends
              end: 10,  // Total 10 seconds
              assetStart: 0,
              assetEnd: 5, // Use first 5 seconds of a-roll
              transitions: {
                in: {
                  type: 'crossfade',
                  duration: 1.0
                }
              }
            }
          ]
        }
      ],
      duration: 10
    };
    
    // Save timeline for inspection
    fs.writeFileSync(
      path.join(__dirname, 'temp-assets', 'runway_test_timeline.json'),
      JSON.stringify(timeline, null, 2)
    );
    console.log('✓ Timeline saved: temp-assets/runway_test_timeline.json');
    
    // Submit render job
    console.log('Submitting render to Runway...');
    const render = await client.video.render({
      timeline: timeline,
      output: {
        format: 'mp4',
        resolution: '1920x1080',
        fps: 30
      }
    });
    
    console.log(`✓ Render submitted: ${render.id}`);
    return render.id;
    
  } catch (error) {
    console.log('✗ Error creating video:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
    return null;
  }
}

async function waitForRender(renderId) {
  try {
    console.log('Checking render status...');
    
    let attempt = 0;
    const maxAttempts = 120; // 10 minutes max wait
    
    while (attempt < maxAttempts) {
      const render = await client.video.renders.get(renderId);
      
      if (render.status === 'completed') {
        console.log('✓ Render completed!');
        console.log(`  Download URL: ${render.output.url}`);
        return render.output.url;
      } else if (render.status === 'failed') {
        console.log('✗ Render failed:', render.error || 'Unknown error');
        return null;
      } else {
        if (attempt % 6 === 0) { // Print every 30 seconds
          const progress = render.progress || 0;
          console.log(`  Status: ${render.status} (${progress}% complete)`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempt++;
    }
    
    console.log('✗ Render timed out after 10 minutes');
    return null;
    
  } catch (error) {
    console.log('✗ Error checking render status:', error.message);
    return null;
  }
}

async function downloadVideo(downloadUrl, outputPath) {
  try {
    console.log('Downloading video...');
    
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✓ Video downloaded: ${outputPath}`);
    return true;
    
  } catch (error) {
    console.log('✗ Error downloading video:', error.message);
    return false;
  }
}

async function main() {
  console.log('Testing Runway API transition...');
  console.log('='.repeat(50));
  
  // Debug the SDK structure
  console.log('Runway client structure:');
  console.log('Available methods:', Object.keys(client));
  console.log('Tasks methods:', client.tasks ? Object.keys(client.tasks) : 'No tasks');
  
  const tempDir = path.join(__dirname, 'temp-assets');
  const brollFile = path.join(tempDir, 'b-roll_5sec.mp4');
  const arollFile = path.join(tempDir, '1_5sec.mp4');
  
  // Check if files exist
  if (!fs.existsSync(brollFile)) {
    console.log(`✗ B-roll file not found: ${brollFile}`);
    return;
  }
  
  if (!fs.existsSync(arollFile)) {
    console.log(`✗ A-roll file not found: ${arollFile}`);
    return;
  }
  
  try {
    // Upload files
    console.log('Uploading assets...');
    const brollAssetId = await uploadFile(brollFile, 'b-roll.mp4');
    if (!brollAssetId) {
      console.log('✗ Failed to upload b-roll');
      return;
    }
    
    const arollAssetId = await uploadFile(arollFile, 'main-video.mp4');
    if (!arollAssetId) {
      console.log('✗ Failed to upload a-roll');
      return;
    }
    
    // Create video
    const renderId = await createTransitionVideo(brollAssetId, arollAssetId);
    if (!renderId) {
      return;
    }
    
    // Wait for completion
    const downloadUrl = await waitForRender(renderId);
    if (!downloadUrl) {
      return;
    }
    
    // Download final video
    const outputFile = path.join(tempDir, 'runway_transition_test.mp4');
    const success = await downloadVideo(downloadUrl, outputFile);
    
    if (success) {
      console.log('\n' + '='.repeat(50));
      console.log('RUNWAY TEST COMPLETED!');
      console.log('='.repeat(50));
      console.log(`Test video: ${outputFile}`);
      console.log('Duration: 10 seconds');
      console.log('Transition: 1s crossfade at 5-6s mark');
    }
    
  } catch (error) {
    console.log('✗ Unexpected error:', error.message);
  }
}

// Run the test
main().catch(console.error);