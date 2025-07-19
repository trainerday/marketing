const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const config = require('./config');

// Get email type from command line argument
const emailType = process.argv[2];
if (!emailType || !config.emailTypes[emailType]) {
  console.error('Usage: node generate-content.js <email-type>');
  console.error('Available types:', Object.keys(config.emailTypes).join(', '));
  process.exit(1);
}

const emailConfig = config.emailTypes[emailType];
console.log(`📊 Generating ${emailType} content...\n`);

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Step 1: Fetch GitHub PRs
console.log('1. Fetching GitHub PRs since September 2024...');
try {
  const repos = [
    'mobile-app-rn', 'main-app-web', 'realtime-webview-web', 'blog-v2-web',
    'billing-svc', 'auth-svc', 'notification-svc', 'file-svc', 'sync-svc',
    'garmin-web', 'job-runner-svc', 'intervals-icu-web', 'landing-page-v3-web',
    'logger-svc', 'user-svc', 'web-tests'
  ];

  const allPRs = [];
  const sinceDate = '2024-09-01';

  for (const repo of repos) {
    try {
      const cmd = `gh pr list --repo TrainerDay/${repo} --state merged --limit 100 --json number,title,author,mergedAt,repository --search "merged:>=${sinceDate}"`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const prs = JSON.parse(output);
      allPRs.push(...prs);
    } catch (e) {
      // Repo might not exist or no PRs
    }
  }

  console.log(`  Found ${allPRs.length} merged PRs`);
  
  // Save PR data
  const prData = {
    pullRequests: allPRs,
    summary: {
      totalPRs: allPRs.length,
      byRepository: {},
      byAuthor: {}
    }
  };
  
  // Calculate summaries
  allPRs.forEach(pr => {
    const repo = pr.repository.name;
    const author = pr.author.login;
    
    if (!prData.summary.byRepository[repo]) {
      prData.summary.byRepository[repo] = 0;
    }
    prData.summary.byRepository[repo]++;
    
    if (!prData.summary.byAuthor[author]) {
      prData.summary.byAuthor[author] = { total: 0 };
    }
    prData.summary.byAuthor[author].total++;
  });
  
  fs.writeFileSync(path.join(outputDir, 'trainerday-prs-since-sept-2024.json'), JSON.stringify(prData, null, 2));
  
} catch (error) {
  console.error('Error fetching PRs:', error.message);
  console.log('Continuing with content generation...');
}

// Step 2: Generate development summary
console.log('\n2. Creating development summary...');

const devSummary = `# TrainerDay Development Summary
## September 2024 - Present

Hey TrainerDay Community! 👋

We've been hard at work making your training experience smoother, faster, and more enjoyable. Here's a friendly rundown of what's new and improved:

### 📱 Mobile App Enhancements

• **Revolutionary Bluetooth Connectivity** - You can now choose which device provides power, cadence, or heart rate data - mix and match your sensors!
• **Ramp Test Improvements** - Enhanced RPM tracking and test logic for more accurate FTP measurements
• **Apple Watch Fixes** - Resolved connectivity issues for seamless workout tracking
• **Heart Rate Zone Updates** - Added HR+ mode and improved zone calculations
• **Speed & Distance Tracking** - More accurate metrics during your rides
• **Sound Improvements** - Better audio cues with customizable beep options
• **Auto-Pause Enhancement** - Fixed issues with old workouts auto-pausing incorrectly
• **Device Capabilities** - Better management of device connections and capabilities

### 💻 Web Platform Updates

• **Training Plans** - Smoother plan selection and better navigation
• **Workout Creation** - Improved tables and editing experience
• **Outdoor Workouts** - Better descriptions and interval handling for outdoor rides
• **Multi-Language Support** - Added German, Italian, and French translations
• **Performance Boost** - Migrated key components to modern Vue 3 for faster loading
• **Plan Management** - Enhanced plan merging and source switching

### 💳 Billing & Subscription Improvements

• **Flexible Subscriptions** - Better management for users with multiple subscriptions
• **Payment Processing** - Enhanced authorize.net integration with automatic profile syncing
• **Email Notifications** - Clearer subscription change notifications
• **Admin Tools** - Added search for duplicate subscriptions to prevent billing issues

### 🔗 Third-Party Integrations

• **Strava Enhancements** - Now free for all users! Better activity search, improved stress calculations based on heart rate, and fixed sync issues
• **Garmin Updates** - Smoother outdoor interval handling
• **Wahoo Support** - Better device naming and connectivity
• **Dropbox Fixes** - Resolved queue processing issues

### 🚀 Performance & Stability

• **Faster Load Times** - Optimized code for quicker app startup
• **Bug Squashing** - Fixed over 300 reported issues
• **Better Error Handling** - More informative error messages
• **Crash Prevention** - Resolved random iOS crashes
• **Memory Optimization** - Reduced app memory usage

### 🔮 Coming Soon

• **Calendar View in Mobile App** - Full calendar integration right in the app for easier workout planning
• **Apple Health** - Saving data to Apple Health without needing an Apple Watch
• **VO2 Max Calculations** - Track your fitness improvements with new VO2 Max metrics
• **Some Big Secret Stuff...**

## Our Amazing Dev Team 🌟

Special thanks to our incredible dev team who made all this possible:
• **Alex K** - The Pixel Perfectionist ✨
• **Grigory** - Captain Feature Ship 🚢
• **Andrey** - 1,095 Day Running Streak Legend 🏃‍♂️
• **Rodion** - AI's Best Friend 🤖
• **Marek** - Master of Quality Quest 🗡️
• **Dan** - Bug Detection Specialist 🔍

## A Personal Note from Alex V 💬

<blockquote style="border-left: 6px solid #0068A5; margin: 30px 0; padding: 20px 20px 20px 30px; background: linear-gradient(to right, #f0f7fc 0%, #ffffff 100%); font-family: Georgia, serif; font-style: italic;">
  <p style="font-size: 18px; color: #333; margin: 0 0 15px 0;">
    "Your feedback drives everything we build..."
  </p>
  <p style="font-size: 16px; color: #555; margin: 0 0 15px 0; font-style: normal; line-height: 1.6;">
    I can't believe it's been 285 days since our last update! I've been heads-down with the team, obsessing over every detail to make TrainerDay the best it can be. Your patience and continued support mean everything to us.
  </p>
  <p style="font-size: 16px; color: #555; margin: 0 0 15px 0; font-style: normal; line-height: 1.6;">
    The Bluetooth connectivity update? That came directly from YOUR feedback. The performance improvements? Because YOU told us where things felt sluggish. This isn't just our app - it's yours, and we build it together.
  </p>
  <p style="font-size: 16px; color: #555; margin: 0 0 15px 0; font-style: normal; line-height: 1.6;">
    Keep the feedback coming. Seriously. I read every email, every forum post, every review. It's how we know what to build next.
  </p>
  <p style="font-size: 16px; color: #555; margin: 0 0 15px 0; font-style: normal; line-height: 1.6;">
    See you on the virtual roads,
  </p>
  <footer style="font-style: normal;">
    <strong style="font-size: 22px; color: #0068A5;">— Alex V</strong><br>
    <small style="color: #666;">Founder & Chief Cycling Enthusiast 🚴‍♂️</small><br>
    <small style="color: #666;">alex@trainerday.com</small>
  </footer>
</blockquote>

---
*P.S. Always the lowest prices. We're committed to keeping TrainerDay accessible to everyone who loves to ride.*`;

fs.writeFileSync(path.join(outputDir, 'development-summary-since-sept-2024.md'), devSummary);

console.log('\n✅ Content generation complete!');
console.log('Files created:');
console.log('  - output/trainerday-prs-since-sept-2024.json');
console.log('  - output/development-summary-since-sept-2024.md');