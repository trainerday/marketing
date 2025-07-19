const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config');

async function comprehensiveEngagementAnalysis() {
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
    
    console.log(`\n=== COMPREHENSIVE USER ENGAGEMENT ANALYSIS ===`);
    console.log(`Period: ${thirtyDaysAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`);
    
    // Get total count of recent users
    const totalRecentUsers = await db.collection('users').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    console.log(`Total users registered in last 30 days: ${totalRecentUsers}`);
    
    const results = {};
    
    // 1. App Login Analysis
    console.log('\n1. APP LOGIN ANALYSIS');
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
    console.log(`Users who used app within 3 days: ${usersWithAppLogin} (${(usersWithAppLogin/totalRecentUsers*100).toFixed(1)}%)`);
    results.appLogin = { count: usersWithAppLogin, percentage: (usersWithAppLogin/totalRecentUsers*100).toFixed(1) };
    
    // 2. Subscription Analysis  
    console.log('\n2. SUBSCRIPTION ANALYSIS');
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
    console.log(`Users who created subscription within 3 days: ${usersWithSubscription} (${(usersWithSubscription/totalRecentUsers*100).toFixed(1)}%)`);
    results.subscription = { count: usersWithSubscription, percentage: (usersWithSubscription/totalRecentUsers*100).toFixed(1) };
    
    // 3. Activity Metrics Analysis (NEW!)
    console.log('\n3. ACTIVITY METRICS ANALYSIS');
    const activityMetricsUsers = await db.collection('activity_metrics').aggregate([
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
    
    const usersWithActivityMetrics = activityMetricsUsers.length > 0 ? activityMetricsUsers[0].uniqueUsers : 0;
    console.log(`Users with activity metrics within 3 days: ${usersWithActivityMetrics} (${(usersWithActivityMetrics/totalRecentUsers*100).toFixed(1)}%)`);
    results.activityMetrics = { count: usersWithActivityMetrics, percentage: (usersWithActivityMetrics/totalRecentUsers*100).toFixed(1) };
    
    // 4. Calendar Events Analysis (NEW!)
    console.log('\n4. CALENDAR EVENTS ANALYSIS');
    const calendarEventUsers = await db.collection('calendar_events').aggregate([
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
    
    const usersWithCalendarEvents = calendarEventUsers.length > 0 ? calendarEventUsers[0].uniqueUsers : 0;
    console.log(`Users with calendar events within 3 days: ${usersWithCalendarEvents} (${(usersWithCalendarEvents/totalRecentUsers*100).toFixed(1)}%)`);
    results.calendarEvents = { count: usersWithCalendarEvents, percentage: (usersWithCalendarEvents/totalRecentUsers*100).toFixed(1) };
    
    // 5. Plans Analysis (NEW!)
    console.log('\n5. TRAINING PLANS ANALYSIS');
    const planUsers = await db.collection('plans').aggregate([
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
    
    const usersWithPlans = planUsers.length > 0 ? planUsers[0].uniqueUsers : 0;
    console.log(`Users with training plans within 3 days: ${usersWithPlans} (${(usersWithPlans/totalRecentUsers*100).toFixed(1)}%)`);
    results.plans = { count: usersWithPlans, percentage: (usersWithPlans/totalRecentUsers*100).toFixed(1) };
    
    // 6. Strava Activities Analysis (NEW!)
    console.log('\n6. STRAVA ACTIVITIES ANALYSIS');
    const stravaActivityUsers = await db.collection('strava_activities').aggregate([
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
    
    const usersWithStravaActivities = stravaActivityUsers.length > 0 ? stravaActivityUsers[0].uniqueUsers : 0;
    console.log(`Users with Strava activities within 3 days: ${usersWithStravaActivities} (${(usersWithStravaActivities/totalRecentUsers*100).toFixed(1)}%)`);
    results.stravaActivities = { count: usersWithStravaActivities, percentage: (usersWithStravaActivities/totalRecentUsers*100).toFixed(1) };
    
    // 7. Combined Analysis
    console.log('\n7. COMBINED ENGAGEMENT ANALYSIS');
    const usersWithAnyEngagement = await db.collection('users').aggregate([
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
          from: 'activity_metrics',
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
          as: 'activityMetrics'
        }
      },
      {
        $lookup: {
          from: 'calendar_events',
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
          as: 'calendarEvents'
        }
      },
      {
        $lookup: {
          from: 'plans',
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
          as: 'plans'
        }
      },
      {
        $lookup: {
          from: 'strava_activities',
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
          as: 'stravaActivities'
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
          hasActivityMetrics: { $gt: [{ $size: '$activityMetrics' }, 0] },
          hasCalendarEvents: { $gt: [{ $size: '$calendarEvents' }, 0] },
          hasPlans: { $gt: [{ $size: '$plans' }, 0] },
          hasStravaActivities: { $gt: [{ $size: '$stravaActivities' }, 0] }
        }
      },
      {
        $addFields: {
          hasAnyAction: {
            $or: ['$hasAppLogin', '$hasSubscription', '$hasActivityMetrics', '$hasCalendarEvents', '$hasPlans', '$hasStravaActivities']
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
          usersWithActivityMetrics: { $sum: { $cond: ['$hasActivityMetrics', 1, 0] } },
          usersWithCalendarEvents: { $sum: { $cond: ['$hasCalendarEvents', 1, 0] } },
          usersWithPlans: { $sum: { $cond: ['$hasPlans', 1, 0] } },
          usersWithStravaActivities: { $sum: { $cond: ['$hasStravaActivities', 1, 0] } }
        }
      }
    ]).toArray();
    
    const finalCombinedResults = usersWithAnyEngagement[0];
    const totalEngaged = finalCombinedResults.usersWithAnyAction;
    const totalNotEngaged = totalRecentUsers - totalEngaged;
    
    console.log(`\nCOMBINED RESULTS:`);
    console.log(`Users with ANY meaningful action: ${totalEngaged} (${(totalEngaged/totalRecentUsers*100).toFixed(1)}%)`);
    console.log(`Users with NO meaningful actions: ${totalNotEngaged} (${(totalNotEngaged/totalRecentUsers*100).toFixed(1)}%)`);
    
    // Final comprehensive summary
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE USER ENGAGEMENT ANALYSIS - FINAL RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📊 OVERVIEW:`);
    console.log(`Total new registrations: ${totalRecentUsers}`);
    console.log(`Analysis period: ${thirtyDaysAgo.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`);
    
    console.log(`\n🎯 OVERALL ENGAGEMENT (First 3 Days):`);
    console.log(`Users with ANY meaningful action: ${totalEngaged} (${(totalEngaged/totalRecentUsers*100).toFixed(1)}%)`);
    console.log(`Users with NO meaningful actions: ${totalNotEngaged} (${(totalNotEngaged/totalRecentUsers*100).toFixed(1)}%)`);
    
    console.log(`\n📱 DETAILED BREAKDOWN BY ACTION TYPE:`);
    console.log(`1. App Login: ${results.appLogin.count} (${results.appLogin.percentage}%)`);
    console.log(`2. Activity Metrics: ${results.activityMetrics.count} (${results.activityMetrics.percentage}%)`);
    console.log(`3. Calendar Events: ${results.calendarEvents.count} (${results.calendarEvents.percentage}%)`);
    console.log(`4. Training Plans: ${results.plans.count} (${results.plans.percentage}%)`);
    console.log(`5. Strava Integration: ${results.stravaActivities.count} (${results.stravaActivities.percentage}%)`);
    console.log(`6. Subscriptions: ${results.subscription.count} (${results.subscription.percentage}%)`);
    
    console.log(`\n💡 KEY INSIGHTS:`);
    const engagementRate = (totalEngaged/totalRecentUsers*100);
    if (engagementRate < 30) {
      console.log(`⚠️  Low engagement: Only ${engagementRate.toFixed(1)}% of new users take meaningful action`);
    } else if (engagementRate < 50) {
      console.log(`📈 Moderate engagement: ${engagementRate.toFixed(1)}% of new users take meaningful action`);
    } else {
      console.log(`🎉 Good engagement: ${engagementRate.toFixed(1)}% of new users take meaningful action`);
    }
    
    // Find most common action
    const actions = [
      { name: 'App Login', count: parseInt(results.appLogin.count) },
      { name: 'Activity Metrics', count: parseInt(results.activityMetrics.count) },
      { name: 'Calendar Events', count: parseInt(results.calendarEvents.count) },
      { name: 'Training Plans', count: parseInt(results.plans.count) },
      { name: 'Strava Integration', count: parseInt(results.stravaActivities.count) }
    ];
    
    const mostCommonAction = actions.reduce((prev, current) => (prev.count > current.count) ? prev : current);
    console.log(`📱 Most common first action: ${mostCommonAction.name} (${mostCommonAction.count} users)`);
    
    console.log(`📊 ${(totalNotEngaged/totalRecentUsers*100).toFixed(1)}% of users register but take no immediate action`);
    
    // Save comprehensive results
    const comprehensiveResults = {
      analysisDate: new Date().toISOString(),
      period: {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      totalNewUsers: totalRecentUsers,
      overallEngagement: {
        usersWithAnyAction: totalEngaged,
        usersWithNoAction: totalNotEngaged,
        anyActionPercentage: parseFloat((totalEngaged/totalRecentUsers*100).toFixed(1)),
        noActionPercentage: parseFloat((totalNotEngaged/totalRecentUsers*100).toFixed(1))
      },
      detailedBreakdown: {
        appLogin: results.appLogin,
        activityMetrics: results.activityMetrics,
        calendarEvents: results.calendarEvents,
        plans: results.plans,
        stravaActivities: results.stravaActivities,
        subscription: results.subscription
      },
      insights: {
        engagementLevel: engagementRate >= 50 ? 'good' : engagementRate >= 30 ? 'moderate' : 'low',
        mostCommonAction: mostCommonAction.name,
        activationRate: parseFloat((totalEngaged/totalRecentUsers*100).toFixed(1))
      }
    };
    
    // Write results to file
    const fs = require('fs');
    fs.writeFileSync('./output/comprehensive-user-engagement-analysis.json', JSON.stringify(comprehensiveResults, null, 2));
    console.log('\n💾 Comprehensive results saved to ./output/comprehensive-user-engagement-analysis.json');
    
    return comprehensiveResults;
    
  } catch (error) {
    console.error('Error in comprehensive analysis:', error);
  } finally {
    await client.close();
  }
}

// Run the comprehensive analysis
comprehensiveEngagementAnalysis().then(results => {
  if (results) {
    console.log('\n✅ Comprehensive analysis completed successfully');
  }
}).catch(error => {
  console.error('Failed to run comprehensive analysis:', error);
});