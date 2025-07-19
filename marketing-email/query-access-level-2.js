const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

async function queryAccessLevel2Users() {
  const username = process.env.username.replace(/['"]/g, '');
  const password = process.env.password.replace(/['"]/g, '');
  const host = process.env.host.replace(/['"]/g, '');
  
  // Construct MongoDB connection string
  const connectionString = `${host}/admin?authSource=admin&tls=true`;
  
  console.log('Connecting to MongoDB...');
  console.log('Host:', host);
  console.log('Username:', username);
  console.log('Database: trainerday-production');
  console.log('Collection: users');
  
  const client = new MongoClient(connectionString, {
    auth: {
      username: username,
      password: password
    },
    tls: true,
    tlsCAFile: path.join(__dirname, 'ca-certificate.crt'),
    serverSelectionTimeoutMS: 5000
  });

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('trainerday-production');
    const collection = db.collection('users');
    
    // Count users with accessLevel = 2
    console.log('\nQuerying users with accessLevel = 2...');
    const count = await collection.countDocuments({ accessLevel: 2 });
    console.log(`✓ Found ${count} users with accessLevel = 2`);
    
    // Get sample users with accessLevel = 2
    console.log('\nSample users with accessLevel = 2:');
    const sampleUsers = await collection.find(
      { accessLevel: 2 },
      { 
        projection: { 
          email: 1, 
          username: 1, 
          accessLevel: 1, 
          createdAt: 1,
          _id: 0
        } 
      }
    ).limit(5).toArray();
    
    console.log('Sample data:');
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Username: ${user.username}, AccessLevel: ${user.accessLevel}, Created: ${user.createdAt}`);
    });
    
    // Also get distribution of access levels for context
    console.log('\nAccess level distribution:');
    const accessLevelStats = await collection.aggregate([
      {
        $group: {
          _id: '$accessLevel',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();
    
    accessLevelStats.forEach(stat => {
      console.log(`Access Level ${stat._id}: ${stat.count} users`);
    });
    
    return {
      accessLevel2Count: count,
      sampleUsers: sampleUsers,
      accessLevelDistribution: accessLevelStats
    };
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✓ MongoDB connection closed');
  }
}

// Run the query
queryAccessLevel2Users()
  .then(results => {
    console.log('\n=== QUERY RESULTS ===');
    console.log(`Total users with accessLevel = 2: ${results.accessLevel2Count}`);
  })
  .catch(error => {
    console.error('Failed to query database:', error);
    process.exit(1);
  });