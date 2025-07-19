const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config');

async function analyzeUserEngagementFast() {
  // MongoDB connection using the same pattern as working scripts
  const username = config.mongodb.username.replace(/['"]/g, '');
  const password = config.mongodb.password.replace(/['"]/g, '');
  const host = config.mongodb.host.replace(/['"]/g, '');
  
  const uri = `${host}/admin?authSource=admin&tls=true`;
  
  const options = {
    auth: { username, password },
    tls: true,
    tlsCAFile: path.join(__dirname, 'ca-certificate.crt'),
    serverSelectionTimeoutMS: 5000,
  };
  
  const client = new MongoClient(uri, options);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('trainerday-production');
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`\n=== Analyzing Users Registered Since ${thirtyDaysAgo.toISOString().split('T')[0]} ===`);
    
    // Get users registered in last 30 days
    const recentUsers = await db.collection('users').find({
      createdAt: { $gte: thirtyDaysAgo }
    }).toArray();
    
    console.log(`Total users registered in last 30 days: ${recentUsers.length}`);
    
    if (recentUsers.length === 0) {
      console.log('No users found in the last 30 days');
      return;
    }
    
    // Initialize counters
    let usersWithAppLogin = 0;
    let usersWithSubscription = 0;
    let usersWithActivity = 0;
    let usersWithAnyAction = 0;
    let usersWithNoAction = 0;
    
    console.log('\n=== Processing Users in Batches ===');
    
    // Process users in batches for efficiency
    for (let i = 0; i < recentUsers.length; i++) {
      const user = recentUsers[i];
      const userId = user._id;
      const createdAt = user.createdAt;
      const threeDaysAfterRegistration = new Date(createdAt);
      threeDaysAfterRegistration.setDate(threeDaysAfterRegistration.getDate() + 3);
      
      let hasAppLogin = false;
      let hasSubscription = false;
      let hasActivity = false;
      
      // Check 1: Mobile App Login within 3 days
      if (user.lastMobileAppLogin && user.lastMobileAppLogin.loginDateUTC) {
        const loginDate = new Date(user.lastMobileAppLogin.loginDateUTC);
        if (loginDate >= createdAt && loginDate <= threeDaysAfterRegistration) {
          hasAppLogin = true;
        }
      }
      
      // Check 2: Subscription within 3 days (batch query would be more efficient but let's keep it simple)
      const subscriptions = await db.collection('billing_user_subscriptions').find({
        userId: userId,
        createdAt: { 
          $gte: createdAt, 
          $lte: threeDaysAfterRegistration 
        }
      }).limit(1).toArray();
      
      if (subscriptions.length > 0) {
        hasSubscription = true;
      }
      
      // Check 3: Check workouts collection for saved activities
      const workouts = await db.collection('workouts').find({
        userId: userId,
        createdAt: { 
          $gte: createdAt, 
          $lte: threeDaysAfterRegistration 
        }
      }).limit(1).toArray();
      
      if (workouts.length > 0) {
        hasActivity = true;
      }
      
      // Update counters
      if (hasAppLogin) usersWithAppLogin++;
      if (hasSubscription) usersWithSubscription++;
      if (hasActivity) usersWithActivity++;
      
      const hasAnyAction = hasAppLogin || hasSubscription || hasActivity;
      if (hasAnyAction) {
        usersWithAnyAction++;
      } else {
        usersWithNoAction++;
      }
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`Processed ${i + 1}/${recentUsers.length} users...`);
      }
    }
    
    // Calculate percentages
    const totalUsers = recentUsers.length;
    const appLoginPercentage = ((usersWithAppLogin / totalUsers) * 100).toFixed(1);
    const subscriptionPercentage = ((usersWithSubscription / totalUsers) * 100).toFixed(1);
    const activityPercentage = ((usersWithActivity / totalUsers) * 100).toFixed(1);
    const anyActionPercentage = ((usersWithAnyAction / totalUsers) * 100).toFixed(1);
    const noActionPercentage = ((usersWithNoAction / totalUsers) * 100).toFixed(1);
    
    // Print comprehensive analysis
    console.log('\n' + '='.repeat(60));
    console.log('USER ENGAGEMENT ANALYSIS - LAST 30 DAYS');
    console.log('='.repeat(60));
    
    console.log(`\n📊 OVERVIEW:`);
    console.log(`Total new registrations: ${totalUsers}`);
    console.log(`Analysis period: ${thirtyDaysAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`);
    
    console.log(`\n🎯 ENGAGEMENT WITHIN FIRST 3 DAYS:`);
    console.log(`Users with ANY meaningful action: ${usersWithAnyAction} (${anyActionPercentage}%)`);
    console.log(`Users with NO meaningful actions: ${usersWithNoAction} (${noActionPercentage}%)`);
    
    console.log(`\n📱 BREAKDOWN BY ACTION TYPE:`);
    console.log(`Downloaded/Used App: ${usersWithAppLogin} (${appLoginPercentage}%)`);
    console.log(`Created Subscription: ${usersWithSubscription} (${subscriptionPercentage}%)`);
    console.log(`Saved Workout/Activity: ${usersWithActivity} (${activityPercentage}%)`);
    
    // Additional insights
    console.log(`\n💡 KEY INSIGHTS:`);
    
    if (parseFloat(anyActionPercentage) < 20) {
      console.log(`⚠️  Low engagement: Only ${anyActionPercentage}% of new users take meaningful action`);
    } else if (parseFloat(anyActionPercentage) < 40) {
      console.log(`📈 Moderate engagement: ${anyActionPercentage}% of new users take meaningful action`);
    } else {
      console.log(`🎉 Good engagement: ${anyActionPercentage}% of new users take meaningful action`);
    }
    
    if (parseFloat(appLoginPercentage) > parseFloat(subscriptionPercentage) && parseFloat(appLoginPercentage) > parseFloat(activityPercentage)) {
      console.log(`📱 App login is the most common first action (${appLoginPercentage}%)`);
    } else if (parseFloat(subscriptionPercentage) > parseFloat(activityPercentage)) {
      console.log(`💳 Subscription creation is the most common first action (${subscriptionPercentage}%)`);
    } else {
      console.log(`🏃 Saving workouts is the most common first action (${activityPercentage}%)`);
    }
    
    console.log(`📊 ${noActionPercentage}% of users register but take no immediate action`);
    
    // Save results to a JSON file for further analysis
    const analysisResults = {
      analysisDate: new Date().toISOString(),
      period: {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      totalNewUsers: totalUsers,
      engagement: {
        usersWithAnyAction: usersWithAnyAction,
        usersWithNoAction: usersWithNoAction,
        anyActionPercentage: parseFloat(anyActionPercentage),
        noActionPercentage: parseFloat(noActionPercentage)
      },
      actionBreakdown: {
        appLogin: { count: usersWithAppLogin, percentage: parseFloat(appLoginPercentage) },
        subscription: { count: usersWithSubscription, percentage: parseFloat(subscriptionPercentage) },
        activity: { count: usersWithActivity, percentage: parseFloat(activityPercentage) }
      }
    };
    
    // Write results to file
    const fs = require('fs');
    fs.writeFileSync('./output/user-engagement-analysis.json', JSON.stringify(analysisResults, null, 2));
    console.log('\n💾 Results saved to ./output/user-engagement-analysis.json');
    
    return analysisResults;
    
  } catch (error) {
    console.error('Error analyzing user engagement:', error);
  } finally {
    await client.close();
  }
}

// Run the analysis
analyzeUserEngagementFast().then(results => {
  if (results) {
    console.log('\n✅ Analysis completed successfully');
  }
}).catch(error => {
  console.error('Failed to run analysis:', error);
});