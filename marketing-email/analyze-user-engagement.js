const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config');

async function analyzeUserEngagement() {
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
    
    // First, let's explore available collections
    console.log('\n=== Available Collections ===');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(collectionNames);
    
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
    
    const engagementDetails = [];
    
    console.log('\n=== Analyzing Each User ===');
    
    for (const user of recentUsers) {
      const userId = user._id;
      const createdAt = user.createdAt;
      const threeDaysAfterRegistration = new Date(createdAt);
      threeDaysAfterRegistration.setDate(threeDaysAfterRegistration.getDate() + 3);
      
      console.log(`\nUser: ${user.email || userId} (registered: ${createdAt.toISOString().split('T')[0]})`);
      
      let actions = [];
      
      // Check 1: Mobile App Login within 3 days
      let hasAppLogin = false;
      if (user.lastMobileAppLogin && user.lastMobileAppLogin.loginDateUTC) {
        const loginDate = new Date(user.lastMobileAppLogin.loginDateUTC);
        if (loginDate >= createdAt && loginDate <= threeDaysAfterRegistration) {
          hasAppLogin = true;
          actions.push('app_login');
          console.log(`  ✓ Used app on ${loginDate.toISOString().split('T')[0]}`);
        }
      }
      
      // Check 2: Subscription within 3 days
      let hasSubscription = false;
      const subscriptions = await db.collection('billing_user_subscriptions').find({
        userId: userId,
        createdAt: { 
          $gte: createdAt, 
          $lte: threeDaysAfterRegistration 
        }
      }).toArray();
      
      if (subscriptions.length > 0) {
        hasSubscription = true;
        actions.push('subscription');
        console.log(`  ✓ Created subscription on ${subscriptions[0].createdAt.toISOString().split('T')[0]}`);
      }
      
      // Check 3: Saved Activity within 3 days
      // Let's check multiple potential collections for activities
      let hasActivity = false;
      const activityCollections = ['activities', 'workouts', 'training', 'user_activities', 'saved_activities'];
      
      for (const collectionName of activityCollections) {
        if (collectionNames.includes(collectionName)) {
          const activities = await db.collection(collectionName).find({
            userId: userId,
            createdAt: { 
              $gte: createdAt, 
              $lte: threeDaysAfterRegistration 
            }
          }).toArray();
          
          if (activities.length > 0) {
            hasActivity = true;
            actions.push(`${collectionName}`);
            console.log(`  ✓ Saved ${activities.length} item(s) in ${collectionName} on ${activities[0].createdAt.toISOString().split('T')[0]}`);
            break; // Found activity, no need to check other collections
          }
        }
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
        console.log('  ✗ No meaningful actions taken');
      }
      
      engagementDetails.push({
        userId: userId,
        email: user.email,
        createdAt: createdAt,
        actions: actions,
        hasAppLogin,
        hasSubscription,
        hasActivity,
        hasAnyAction
      });
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
    console.log(`Saved Activity: ${usersWithActivity} (${activityPercentage}%)`);
    
    console.log(`\n📋 DETAILED BREAKDOWN:`);
    engagementDetails.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || user.userId.toString().substring(0, 8) + '...'}`);
      console.log(`   Registered: ${user.createdAt.toISOString().split('T')[0]}`);
      if (user.actions.length > 0) {
        console.log(`   Actions: ${user.actions.join(', ')}`);
      } else {
        console.log(`   Actions: none`);
      }
    });
    
    // Save results to Basic Memory
    const analysisResults = {
      analysisDate: new Date().toISOString(),
      period: `${thirtyDaysAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
      totalNewUsers: totalUsers,
      engagement: {
        usersWithAnyAction: usersWithAnyAction,
        usersWithNoAction: usersWithNoAction,
        anyActionPercentage: anyActionPercentage,
        noActionPercentage: noActionPercentage
      },
      actionBreakdown: {
        appLogin: { count: usersWithAppLogin, percentage: appLoginPercentage },
        subscription: { count: usersWithSubscription, percentage: subscriptionPercentage },
        activity: { count: usersWithActivity, percentage: activityPercentage }
      },
      userDetails: engagementDetails
    };
    
    console.log('\n💾 Analysis complete! Results saved to analysis object.');
    return analysisResults;
    
  } catch (error) {
    console.error('Error analyzing user engagement:', error);
  } finally {
    await client.close();
  }
}

// Run the analysis
analyzeUserEngagement().then(results => {
  if (results) {
    console.log('\n✅ Analysis completed successfully');
  }
}).catch(error => {
  console.error('Failed to run analysis:', error);
});