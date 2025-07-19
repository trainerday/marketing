const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config');

async function analyzeUserEngagementOptimized() {
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
    
    // Get total count of recent users
    const totalRecentUsers = await db.collection('users').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    console.log(`Total users registered in last 30 days: ${totalRecentUsers}`);
    
    if (totalRecentUsers === 0) {
      console.log('No users found in the last 30 days');
      return;
    }
    
    console.log('\n=== Analyzing App Logins ===');
    
    // 1. Count users who used app within 3 days of registration
    const usersWithAppLogin = await db.collection('users').countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      $expr: {
        $and: [
          { $ne: ["$lastMobileAppLogin.loginDateUTC", null] },
          { $gte: ["$lastMobileAppLogin.loginDateUTC", "$createdAt"] },
          { $lte: ["$lastMobileAppLogin.loginDateUTC", { $add: ["$createdAt", 3 * 24 * 60 * 60 * 1000] }] }
        ]
      }
    });
    
    console.log(`Users who used app within 3 days: ${usersWithAppLogin}`);
    
    console.log('\n=== Analyzing Subscriptions ===');
    
    // 2. Count users who created subscription within 3 days of registration
    const subscriptionUsers = await db.collection('billing_user_subscriptions').aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: {
          'user.createdAt': { $gte: thirtyDaysAgo },
          $expr: {
            $and: [
              { $gte: ['$createdAt', '$user.createdAt'] },
              { $lte: ['$createdAt', { $add: ['$user.createdAt', 3 * 24 * 60 * 60 * 1000] }] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$userId'
        }
      },
      {
        $count: 'uniqueUsers'
      }
    ]).toArray();
    
    const usersWithSubscription = subscriptionUsers.length > 0 ? subscriptionUsers[0].uniqueUsers : 0;
    console.log(`Users who created subscription within 3 days: ${usersWithSubscription}`);
    
    console.log('\n=== Analyzing Workouts/Activities ===');
    
    // 3. Count users who saved workouts within 3 days of registration
    const workoutUsers = await db.collection('workouts').aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: {
          'user.createdAt': { $gte: thirtyDaysAgo },
          $expr: {
            $and: [
              { $gte: ['$createdAt', '$user.createdAt'] },
              { $lte: ['$createdAt', { $add: ['$user.createdAt', 3 * 24 * 60 * 60 * 1000] }] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$userId'
        }
      },
      {
        $count: 'uniqueUsers'
      }
    ]).toArray();
    
    const usersWithActivity = workoutUsers.length > 0 ? workoutUsers[0].uniqueUsers : 0;
    console.log(`Users who saved workouts within 3 days: ${usersWithActivity}`);
    
    console.log('\n=== Calculating Combined Engagement ===');
    
    // 4. Get users with ANY action (complex aggregation)
    const usersWithAnyAction = await db.collection('users').aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $lookup: {
          from: 'billing_user_subscriptions',
          let: { userId: '$_id', userCreatedAt: '$createdAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $gte: ['$createdAt', '$$userCreatedAt'] },
                    { $lte: ['$createdAt', { $add: ['$$userCreatedAt', 3 * 24 * 60 * 60 * 1000] }] }
                  ]
                }
              }
            }
          ],
          as: 'subscriptions'
        }
      },
      {
        $lookup: {
          from: 'workouts',
          let: { userId: '$_id', userCreatedAt: '$createdAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $gte: ['$createdAt', '$$userCreatedAt'] },
                    { $lte: ['$createdAt', { $add: ['$$userCreatedAt', 3 * 24 * 60 * 60 * 1000] }] }
                  ]
                }
              }
            }
          ],
          as: 'workouts'
        }
      },
      {
        $addFields: {
          hasAppLogin: {
            $and: [
              { $ne: ['$lastMobileAppLogin.loginDateUTC', null] },
              { $gte: ['$lastMobileAppLogin.loginDateUTC', '$createdAt'] },
              { $lte: ['$lastMobileAppLogin.loginDateUTC', { $add: ['$createdAt', 3 * 24 * 60 * 60 * 1000] }] }
            ]
          },
          hasSubscription: { $gt: [{ $size: '$subscriptions' }, 0] },
          hasWorkout: { $gt: [{ $size: '$workouts' }, 0] }
        }
      },
      {
        $addFields: {
          hasAnyAction: {
            $or: ['$hasAppLogin', '$hasSubscription', '$hasWorkout']
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          usersWithAnyAction: { $sum: { $cond: ['$hasAnyAction', 1, 0] } },
          usersWithAppLogin: { $sum: { $cond: ['$hasAppLogin', 1, 0] } },
          usersWithSubscription: { $sum: { $cond: ['$hasSubscription', 1, 0] } },
          usersWithWorkout: { $sum: { $cond: ['$hasWorkout', 1, 0] } }
        }
      }
    ]).toArray();
    
    let finalResults;
    if (usersWithAnyAction.length > 0) {
      const result = usersWithAnyAction[0];
      finalResults = {
        totalUsers: result.totalUsers,
        usersWithAnyAction: result.usersWithAnyAction,
        usersWithAppLogin: result.usersWithAppLogin,
        usersWithSubscription: result.usersWithSubscription,
        usersWithActivity: result.usersWithWorkout
      };
    } else {
      // Fallback to individual counts
      finalResults = {
        totalUsers: totalRecentUsers,
        usersWithAnyAction: Math.max(usersWithAppLogin, usersWithSubscription, usersWithActivity),
        usersWithAppLogin: usersWithAppLogin,
        usersWithSubscription: usersWithSubscription,
        usersWithActivity: usersWithActivity
      };
    }
    
    // Calculate derived values
    finalResults.usersWithNoAction = finalResults.totalUsers - finalResults.usersWithAnyAction;
    
    // Calculate percentages
    const appLoginPercentage = ((finalResults.usersWithAppLogin / finalResults.totalUsers) * 100).toFixed(1);
    const subscriptionPercentage = ((finalResults.usersWithSubscription / finalResults.totalUsers) * 100).toFixed(1);
    const activityPercentage = ((finalResults.usersWithActivity / finalResults.totalUsers) * 100).toFixed(1);
    const anyActionPercentage = ((finalResults.usersWithAnyAction / finalResults.totalUsers) * 100).toFixed(1);
    const noActionPercentage = ((finalResults.usersWithNoAction / finalResults.totalUsers) * 100).toFixed(1);
    
    // Print comprehensive analysis
    console.log('\n' + '='.repeat(60));
    console.log('USER ENGAGEMENT ANALYSIS - LAST 30 DAYS');
    console.log('='.repeat(60));
    
    console.log(`\n📊 OVERVIEW:`);
    console.log(`Total new registrations: ${finalResults.totalUsers}`);
    console.log(`Analysis period: ${thirtyDaysAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`);
    
    console.log(`\n🎯 ENGAGEMENT WITHIN FIRST 3 DAYS:`);
    console.log(`Users with ANY meaningful action: ${finalResults.usersWithAnyAction} (${anyActionPercentage}%)`);
    console.log(`Users with NO meaningful actions: ${finalResults.usersWithNoAction} (${noActionPercentage}%)`);
    
    console.log(`\n📱 BREAKDOWN BY ACTION TYPE:`);
    console.log(`Downloaded/Used App: ${finalResults.usersWithAppLogin} (${appLoginPercentage}%)`);
    console.log(`Created Subscription: ${finalResults.usersWithSubscription} (${subscriptionPercentage}%)`);
    console.log(`Saved Workout/Activity: ${finalResults.usersWithActivity} (${activityPercentage}%)`);
    
    // Additional insights
    console.log(`\n💡 KEY INSIGHTS:`);
    
    if (parseFloat(anyActionPercentage) < 20) {
      console.log(`⚠️  Low engagement: Only ${anyActionPercentage}% of new users take meaningful action`);
    } else if (parseFloat(anyActionPercentage) < 40) {
      console.log(`📈 Moderate engagement: ${anyActionPercentage}% of new users take meaningful action`);
    } else {
      console.log(`🎉 Good engagement: ${anyActionPercentage}% of new users take meaningful action`);
    }
    
    const mostCommonAction = Math.max(
      parseFloat(appLoginPercentage),
      parseFloat(subscriptionPercentage),
      parseFloat(activityPercentage)
    );
    
    if (parseFloat(appLoginPercentage) === mostCommonAction) {
      console.log(`📱 App usage is the most common first action (${appLoginPercentage}%)`);
    } else if (parseFloat(subscriptionPercentage) === mostCommonAction) {
      console.log(`💳 Subscription creation is the most common first action (${subscriptionPercentage}%)`);
    } else {
      console.log(`🏃 Saving workouts is the most common first action (${activityPercentage}%)`);
    }
    
    console.log(`📊 ${noActionPercentage}% of users register but take no immediate action`);
    
    // Action overlap analysis
    console.log(`\n📈 ENGAGEMENT RATE ANALYSIS:`);
    console.log(`- App engagement rate: ${appLoginPercentage}%`);
    console.log(`- Premium conversion rate (subscriptions): ${subscriptionPercentage}%`);
    console.log(`- Content creation rate (workouts): ${activityPercentage}%`);
    console.log(`- Overall 3-day activation rate: ${anyActionPercentage}%`);
    
    // Save results to a JSON file for further analysis
    const analysisResults = {
      analysisDate: new Date().toISOString(),
      period: {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      totalNewUsers: finalResults.totalUsers,
      engagement: {
        usersWithAnyAction: finalResults.usersWithAnyAction,
        usersWithNoAction: finalResults.usersWithNoAction,
        anyActionPercentage: parseFloat(anyActionPercentage),
        noActionPercentage: parseFloat(noActionPercentage)
      },
      actionBreakdown: {
        appLogin: { count: finalResults.usersWithAppLogin, percentage: parseFloat(appLoginPercentage) },
        subscription: { count: finalResults.usersWithSubscription, percentage: parseFloat(subscriptionPercentage) },
        activity: { count: finalResults.usersWithActivity, percentage: parseFloat(activityPercentage) }
      },
      insights: {
        engagementLevel: parseFloat(anyActionPercentage) >= 40 ? 'good' : parseFloat(anyActionPercentage) >= 20 ? 'moderate' : 'low',
        mostCommonAction: parseFloat(appLoginPercentage) === mostCommonAction ? 'app_login' : 
                         parseFloat(subscriptionPercentage) === mostCommonAction ? 'subscription' : 'activity'
      }
    };
    
    // Write results to file
    const fs = require('fs');
    fs.writeFileSync('./output/user-engagement-analysis-final.json', JSON.stringify(analysisResults, null, 2));
    console.log('\n💾 Results saved to ./output/user-engagement-analysis-final.json');
    
    return analysisResults;
    
  } catch (error) {
    console.error('Error analyzing user engagement:', error);
  } finally {
    await client.close();
  }
}

// Run the analysis
analyzeUserEngagementOptimized().then(results => {
  if (results) {
    console.log('\n✅ Analysis completed successfully');
  }
}).catch(error => {
  console.error('Failed to run analysis:', error);
});