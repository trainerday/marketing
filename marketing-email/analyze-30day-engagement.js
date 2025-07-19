const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config');

async function analyze30DayEngagement() {
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
    
    // Calculate date ranges: 30-60 days ago (registration period)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    console.log(`\n=== 30-DAY USER ENGAGEMENT ANALYSIS (Extended Timeline) ===`);
    console.log(`Registration Period: ${sixtyDaysAgo.toISOString().split('T')[0]} to ${thirtyDaysAgo.toISOString().split('T')[0]} (May 15 - June 14, 2025)`);
    console.log(`Engagement Window: 30 days from each user's registration date`);
    
    // Get users who registered 30-60 days ago
    const usersInPeriod = await db.collection('users').find({
      createdAt: { 
        $gte: sixtyDaysAgo,
        $lt: thirtyDaysAgo 
      }
    }).toArray();
    
    const totalUsers = usersInPeriod.length;
    console.log(`\nTotal users registered in period: ${totalUsers}`);
    
    if (totalUsers === 0) {
      console.log('No users found in the specified period. Exiting analysis.');
      return;
    }
    
    const results = {};
    
    // 1. APP LOGIN ANALYSIS (within 30 days of registration)
    console.log('\n1. APP LOGIN ANALYSIS (30-day window)');
    const usersWithAppLogin = await db.collection('users').countDocuments({
      createdAt: { 
        $gte: sixtyDaysAgo,
        $lt: thirtyDaysAgo 
      },
      $expr: {
        $and: [
          { $ne: ["$lastMobileAppLogin.loginDateUTC", null] },
          { $gte: ["$lastMobileAppLogin.loginDateUTC", "$createdAt"] },
          { $lte: ["$lastMobileAppLogin.loginDateUTC", { $add: ["$createdAt", 30 * 24 * 60 * 60 * 1000] }] }
        ]
      }
    });
    
    console.log(`Users who used app within 30 days of registration: ${usersWithAppLogin} (${(usersWithAppLogin/totalUsers*100).toFixed(1)}%)`);
    results.appLogin = { count: usersWithAppLogin, percentage: parseFloat((usersWithAppLogin/totalUsers*100).toFixed(1)) };
    
    // 2. SUBSCRIPTION ANALYSIS (within 30 days of registration)
    console.log('\n2. SUBSCRIPTION ANALYSIS (30-day window)');
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
          'user.createdAt': { 
            $gte: sixtyDaysAgo,
            $lt: thirtyDaysAgo 
          },
          $expr: {
            $and: [
              { $gte: ['$createdAt', '$user.createdAt'] },
              { $lte: ['$createdAt', { $add: ['$user.createdAt', 30 * 24 * 60 * 60 * 1000] }] }
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
    console.log(`Users who created subscription within 30 days: ${usersWithSubscription} (${(usersWithSubscription/totalUsers*100).toFixed(1)}%)`);
    results.subscription = { count: usersWithSubscription, percentage: parseFloat((usersWithSubscription/totalUsers*100).toFixed(1)) };
    
    // 3. ACTIVITY METRICS ANALYSIS (within 30 days of registration)
    console.log('\n3. ACTIVITY METRICS ANALYSIS (30-day window)');
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
          'user.createdAt': { 
            $gte: sixtyDaysAgo,
            $lt: thirtyDaysAgo 
          },
          $expr: {
            $and: [
              { $gte: ['$createdAt', '$user.createdAt'] },
              { $lte: ['$createdAt', { $add: ['$user.createdAt', 30 * 24 * 60 * 60 * 1000] }] }
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
    console.log(`Users with activity metrics within 30 days: ${usersWithActivityMetrics} (${(usersWithActivityMetrics/totalUsers*100).toFixed(1)}%)`);
    results.activityMetrics = { count: usersWithActivityMetrics, percentage: parseFloat((usersWithActivityMetrics/totalUsers*100).toFixed(1)) };
    
    // 4. CALENDAR EVENTS ANALYSIS (within 30 days of registration)
    console.log('\n4. CALENDAR EVENTS ANALYSIS (30-day window)');
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
          'user.createdAt': { 
            $gte: sixtyDaysAgo,
            $lt: thirtyDaysAgo 
          },
          $expr: {
            $and: [
              { $gte: ['$createdAt', '$user.createdAt'] },
              { $lte: ['$createdAt', { $add: ['$user.createdAt', 30 * 24 * 60 * 60 * 1000] }] }
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
    console.log(`Users with calendar events within 30 days: ${usersWithCalendarEvents} (${(usersWithCalendarEvents/totalUsers*100).toFixed(1)}%)`);
    results.calendarEvents = { count: usersWithCalendarEvents, percentage: parseFloat((usersWithCalendarEvents/totalUsers*100).toFixed(1)) };
    
    // 5. TRAINING PLANS ANALYSIS (within 30 days of registration)
    console.log('\n5. TRAINING PLANS ANALYSIS (30-day window)');
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
          'user.createdAt': { 
            $gte: sixtyDaysAgo,
            $lt: thirtyDaysAgo 
          },
          $expr: {
            $and: [
              { $gte: ['$createdAt', '$user.createdAt'] },
              { $lte: ['$createdAt', { $add: ['$user.createdAt', 30 * 24 * 60 * 60 * 1000] }] }
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
    console.log(`Users with training plans within 30 days: ${usersWithPlans} (${(usersWithPlans/totalUsers*100).toFixed(1)}%)`);
    results.plans = { count: usersWithPlans, percentage: parseFloat((usersWithPlans/totalUsers*100).toFixed(1)) };
    
    // 6. STRAVA ACTIVITIES ANALYSIS (within 30 days of registration)
    console.log('\n6. STRAVA ACTIVITIES ANALYSIS (30-day window)');
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
          'user.createdAt': { 
            $gte: sixtyDaysAgo,
            $lt: thirtyDaysAgo 
          },
          $expr: {
            $and: [
              { $gte: ['$createdAt', '$user.createdAt'] },
              { $lte: ['$createdAt', { $add: ['$user.createdAt', 30 * 24 * 60 * 60 * 1000] }] }
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
    console.log(`Users with Strava activities within 30 days: ${usersWithStravaActivities} (${(usersWithStravaActivities/totalUsers*100).toFixed(1)}%)`);
    results.stravaActivities = { count: usersWithStravaActivities, percentage: parseFloat((usersWithStravaActivities/totalUsers*100).toFixed(1)) };
    
    // 7. COMPREHENSIVE COMBINED ANALYSIS (within 30 days of registration)
    console.log('\n7. COMPREHENSIVE COMBINED ANALYSIS (30-day window)');
    const usersWithAnyEngagement = await db.collection('users').aggregate([
      {
        $match: {
          createdAt: { 
            $gte: sixtyDaysAgo,
            $lt: thirtyDaysAgo 
          }
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
                    { $lte: ['$createdAt', { $add: ['$$userCreatedAt', 30 * 24 * 60 * 60 * 1000] }] }
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
                    { $lte: ['$createdAt', { $add: ['$$userCreatedAt', 30 * 24 * 60 * 60 * 1000] }] }
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
                    { $lte: ['$createdAt', { $add: ['$$userCreatedAt', 30 * 24 * 60 * 60 * 1000] }] }
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
                    { $lte: ['$createdAt', { $add: ['$$userCreatedAt', 30 * 24 * 60 * 60 * 1000] }] }
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
                    { $lte: ['$createdAt', { $add: ['$$userCreatedAt', 30 * 24 * 60 * 60 * 1000] }] }
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
              { $lte: ['$lastMobileAppLogin.loginDateUTC', { $add: ['$createdAt', 30 * 24 * 60 * 60 * 1000] }] }
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
    const totalNotEngaged = totalUsers - totalEngaged;
    
    console.log(`\nCOMBINED RESULTS (30-day engagement window):`);
    console.log(`Users with ANY meaningful action: ${totalEngaged} (${(totalEngaged/totalUsers*100).toFixed(1)}%)`);
    console.log(`Users with NO meaningful actions: ${totalNotEngaged} (${(totalNotEngaged/totalUsers*100).toFixed(1)}%)`);
    
    // Load previous 3-day analysis for comparison
    let previousAnalysis = null;
    try {
      const fs = require('fs');
      const previousData = fs.readFileSync('./output/user-engagement-analysis-final.json', 'utf8');
      previousAnalysis = JSON.parse(previousData);
    } catch (error) {
      console.log('Could not load previous 3-day analysis for comparison');
    }
    
    // FINAL COMPREHENSIVE SUMMARY WITH COMPARISON
    console.log('\n' + '='.repeat(80));
    console.log('30-DAY USER ENGAGEMENT ANALYSIS - FINAL RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📊 OVERVIEW:`);
    console.log(`Total users in analysis: ${totalUsers}`);
    console.log(`Registration period: ${sixtyDaysAgo.toISOString().split('T')[0]} to ${thirtyDaysAgo.toISOString().split('T')[0]}`);
    console.log(`Engagement tracking: 30 days from each user's registration date`);
    
    console.log(`\n🎯 OVERALL ENGAGEMENT (30-Day Window):`);
    console.log(`Users with ANY meaningful action: ${totalEngaged} (${(totalEngaged/totalUsers*100).toFixed(1)}%)`);
    console.log(`Users with NO meaningful actions: ${totalNotEngaged} (${(totalNotEngaged/totalUsers*100).toFixed(1)}%)`);
    
    console.log(`\n📱 DETAILED BREAKDOWN BY ACTION TYPE (30-Day Window):`);
    console.log(`1. App Login: ${results.appLogin.count} (${results.appLogin.percentage}%)`);
    console.log(`2. Activity Metrics: ${results.activityMetrics.count} (${results.activityMetrics.percentage}%)`);
    console.log(`3. Calendar Events: ${results.calendarEvents.count} (${results.calendarEvents.percentage}%)`);
    console.log(`4. Training Plans: ${results.plans.count} (${results.plans.percentage}%)`);
    console.log(`5. Strava Integration: ${results.stravaActivities.count} (${results.stravaActivities.percentage}%)`);
    console.log(`6. Subscriptions: ${results.subscription.count} (${results.subscription.percentage}%)`);
    
    // COMPARISON WITH PREVIOUS 3-DAY ANALYSIS
    if (previousAnalysis) {
      console.log(`\n📈 COMPARISON: 30-DAY vs 3-DAY ENGAGEMENT:`);
      const current30DayRate = parseFloat((totalEngaged/totalUsers*100).toFixed(1));
      const previous3DayRate = previousAnalysis.engagement.anyActionPercentage;
      const improvementRatio = (current30DayRate / previous3DayRate).toFixed(2);
      
      console.log(`3-Day Engagement Rate: ${previous3DayRate}% (${previousAnalysis.engagement.usersWithAnyAction}/${previousAnalysis.totalNewUsers} users)`);
      console.log(`30-Day Engagement Rate: ${current30DayRate}% (${totalEngaged}/${totalUsers} users)`);
      console.log(`Improvement Factor: ${improvementRatio}x (${(current30DayRate - previous3DayRate).toFixed(1)} percentage points higher)`);
      
      console.log(`\n🔍 DETAILED COMPARISON BY ACTION TYPE:`);
      if (previousAnalysis.actionBreakdown && previousAnalysis.actionBreakdown.appLogin) {
        console.log(`App Login: 3-day ${previousAnalysis.actionBreakdown.appLogin.percentage}% → 30-day ${results.appLogin.percentage}%`);
      }
      if (previousAnalysis.actionBreakdown && previousAnalysis.actionBreakdown.subscription) {
        console.log(`Subscriptions: 3-day ${previousAnalysis.actionBreakdown.subscription.percentage}% → 30-day ${results.subscription.percentage}%`);
      }
    }
    
    console.log(`\n💡 KEY INSIGHTS:`);
    const engagementRate = (totalEngaged/totalUsers*100);
    if (engagementRate < 30) {
      console.log(`⚠️  Low 30-day engagement: Only ${engagementRate.toFixed(1)}% of users take meaningful action within first month`);
    } else if (engagementRate < 50) {
      console.log(`📈 Moderate 30-day engagement: ${engagementRate.toFixed(1)}% of users take meaningful action within first month`);
    } else if (engagementRate < 70) {
      console.log(`🎉 Good 30-day engagement: ${engagementRate.toFixed(1)}% of users take meaningful action within first month`);
    } else {
      console.log(`🚀 Excellent 30-day engagement: ${engagementRate.toFixed(1)}% of users take meaningful action within first month`);
    }
    
    // Find most common action
    const actions = [
      { name: 'App Login', count: parseInt(results.appLogin.count) },
      { name: 'Activity Metrics', count: parseInt(results.activityMetrics.count) },
      { name: 'Calendar Events', count: parseInt(results.calendarEvents.count) },
      { name: 'Training Plans', count: parseInt(results.plans.count) },
      { name: 'Strava Integration', count: parseInt(results.stravaActivities.count) },
      { name: 'Subscriptions', count: parseInt(results.subscription.count) }
    ];
    
    const mostCommonAction = actions.reduce((prev, current) => (prev.count > current.count) ? prev : current);
    console.log(`📱 Most common action within 30 days: ${mostCommonAction.name} (${mostCommonAction.count} users)`);
    
    const dropoffRate = (totalNotEngaged/totalUsers*100).toFixed(1);
    console.log(`📊 ${dropoffRate}% of users register but take no meaningful action within their first 30 days`);
    
    if (previousAnalysis) {
      const prev3DayDropoff = previousAnalysis.engagement.noActionPercentage;
      const dropoffImprovement = (prev3DayDropoff - parseFloat(dropoffRate)).toFixed(1);
      console.log(`🔄 Dropoff improvement: ${prev3DayDropoff}% (3-day) → ${dropoffRate}% (30-day) = ${dropoffImprovement} pp reduction`);
    }
    
    // Generate comprehensive results object
    const comprehensiveResults = {
      analysisDate: new Date().toISOString(),
      analysisType: '30-day-engagement-window',
      registrationPeriod: {
        start: sixtyDaysAgo.toISOString().split('T')[0],
        end: thirtyDaysAgo.toISOString().split('T')[0],
        description: 'Users who registered 30-60 days ago'
      },
      engagementWindow: '30 days from registration date',
      totalUsers: totalUsers,
      overallEngagement: {
        usersWithAnyAction: totalEngaged,
        usersWithNoAction: totalNotEngaged,
        anyActionPercentage: parseFloat((totalEngaged/totalUsers*100).toFixed(1)),
        noActionPercentage: parseFloat((totalNotEngaged/totalUsers*100).toFixed(1))
      },
      detailedBreakdown: {
        appLogin: results.appLogin,
        activityMetrics: results.activityMetrics,
        calendarEvents: results.calendarEvents,
        plans: results.plans,
        stravaActivities: results.stravaActivities,
        subscription: results.subscription
      },
      comparison: previousAnalysis ? {
        previous3DayAnalysis: {
          anyActionPercentage: previousAnalysis.engagement.anyActionPercentage,
          totalUsers: previousAnalysis.totalNewUsers,
          usersWithAnyAction: previousAnalysis.engagement.usersWithAnyAction
        },
        improvements: {
          engagementRateIncrease: parseFloat((parseFloat((totalEngaged/totalUsers*100).toFixed(1)) - previousAnalysis.engagement.anyActionPercentage).toFixed(1)),
          improvementFactor: parseFloat((parseFloat((totalEngaged/totalUsers*100).toFixed(1)) / previousAnalysis.engagement.anyActionPercentage).toFixed(2))
        }
      } : null,
      insights: {
        engagementLevel: engagementRate >= 70 ? 'excellent' : engagementRate >= 50 ? 'good' : engagementRate >= 30 ? 'moderate' : 'low',
        mostCommonAction: mostCommonAction.name,
        activationRate: parseFloat((totalEngaged/totalUsers*100).toFixed(1)),
        recommendedActions: [
          dropoffRate > 50 ? 'High dropoff rate - focus on improving onboarding flow' : null,
          results.appLogin.percentage < 40 ? 'Low app usage - improve mobile app onboarding' : null,
          results.subscription.percentage < 5 ? 'Low subscription rate - review pricing and value proposition' : null,
          results.activityMetrics.percentage > results.appLogin.percentage ? 'Users engage with data more than app - leverage this insight' : null
        ].filter(Boolean)
      }
    };
    
    // Save comprehensive results
    const fs = require('fs');
    fs.writeFileSync('./output/30-day-engagement-analysis.json', JSON.stringify(comprehensiveResults, null, 2));
    console.log('\n💾 30-day engagement analysis saved to ./output/30-day-engagement-analysis.json');
    
    return comprehensiveResults;
    
  } catch (error) {
    console.error('Error in 30-day engagement analysis:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the 30-day engagement analysis
analyze30DayEngagement().then(results => {
  if (results) {
    console.log('\n✅ 30-day engagement analysis completed successfully');
  }
}).catch(error => {
  console.error('Failed to run 30-day engagement analysis:', error);
});