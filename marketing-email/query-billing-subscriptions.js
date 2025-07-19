const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config');

async function queryBillingSubscriptions() {
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
    const collection = db.collection('billing_user_subscriptions');
    
    // Count total active subscriptions
    const activeCount = await collection.countDocuments({ status: 'active' });
    console.log(`\n📊 Total Active Subscriptions: ${activeCount}`);
    
    // Get breakdown by subscription type/name
    const pipeline = [
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];
    
    const subscriptionBreakdown = await collection.aggregate(pipeline).toArray();
    
    console.log('\n📋 Breakdown by Subscription Type:');
    console.log('─'.repeat(50));
    
    if (subscriptionBreakdown.length > 0) {
      subscriptionBreakdown.forEach(sub => {
        const name = sub._id || 'Unknown';
        console.log(`${name}: ${sub.count}`);
      });
    } else {
      console.log('No active subscriptions found or no name field');
    }
    
    // Get additional stats
    const totalSubscriptions = await collection.countDocuments();
    const inactiveCount = totalSubscriptions - activeCount;
    
    console.log('\n📈 Summary Statistics:');
    console.log('─'.repeat(50));
    console.log(`Total Subscriptions: ${totalSubscriptions}`);
    console.log(`Active Subscriptions: ${activeCount}`);
    console.log(`Inactive Subscriptions: ${inactiveCount}`);
    console.log(`Active Rate: ${((activeCount / totalSubscriptions) * 100).toFixed(2)}%`);
    
    // Sample document to understand structure
    const sampleDoc = await collection.findOne({ status: 'active' });
    if (sampleDoc) {
      console.log('\n🔍 Sample Active Subscription Document:');
      console.log('─'.repeat(50));
      console.log(JSON.stringify(sampleDoc, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

// Run the query
queryBillingSubscriptions().catch(console.error);