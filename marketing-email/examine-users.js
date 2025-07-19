require('dotenv').config();
const { MongoClient } = require('mongodb');

const config = {
  mongodb: {
    username: process.env.username,
    password: process.env.password,
    host: process.env.host
  }
};

async function examineUsers() {
  const uri = `${config.mongodb.host.replace('mongodb+srv://', `mongodb+srv://${config.mongodb.username}:${config.mongodb.password}@`)}/?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true`;
  const client = new MongoClient(uri, {
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('trainerday-production');
    const usersCollection = db.collection('users');

    // Get most recent users (sorted by createdAt descending)
    console.log('\n=== RECENT USERS (last 25) ===');
    const recentUsers = await usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();

    console.log(`Found ${recentUsers.length} recent users`);
    
    // Display field names and sample values for recent users
    if (recentUsers.length > 0) {
      console.log('\n--- Sample Recent User Fields ---');
      const sampleUser = recentUsers[0];
      console.log('All fields in most recent user:');
      Object.keys(sampleUser).forEach(key => {
        const value = sampleUser[key];
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
        console.log(`  ${key}: ${displayValue}`);
      });

      // Look for registration source indicators
      console.log('\n--- Registration Source Analysis ---');
      const potentialSourceFields = ['source', 'registrationSource', 'platform', 'origin', 'userAgent', 'clientType', 'app', 'web', 'device', 'registration'];
      
      potentialSourceFields.forEach(field => {
        const usersWithField = recentUsers.filter(user => user[field] !== undefined);
        if (usersWithField.length > 0) {
          console.log(`\n${field} field found in ${usersWithField.length} users:`);
          usersWithField.slice(0, 5).forEach((user, index) => {
            console.log(`  User ${index + 1}: ${JSON.stringify(user[field])}`);
          });
        }
      });

      // Check for any field containing "app", "web", "mobile", "ios", "android"
      console.log('\n--- Fields containing app/web/mobile keywords ---');
      recentUsers.forEach((user, userIndex) => {
        if (userIndex < 3) { // Only check first 3 users to avoid too much output
          Object.keys(user).forEach(key => {
            const value = user[key];
            const stringValue = typeof value === 'object' ? JSON.stringify(value).toLowerCase() : String(value).toLowerCase();
            if (stringValue.includes('app') || stringValue.includes('web') || stringValue.includes('mobile') || stringValue.includes('ios') || stringValue.includes('android')) {
              console.log(`  User ${userIndex + 1} - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
            }
          });
        }
      });
    }

    // Get some older users for comparison
    console.log('\n\n=== OLDER USERS (sample from 6 months ago) ===');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const olderUsers = await usersCollection
      .find({ createdAt: { $lt: sixMonthsAgo } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`Found ${olderUsers.length} older users (from before ${sixMonthsAgo.toISOString()})`);
    
    if (olderUsers.length > 0) {
      console.log('\n--- Sample Older User Fields ---');
      const sampleOlderUser = olderUsers[0];
      console.log('All fields in sample older user:');
      Object.keys(sampleOlderUser).forEach(key => {
        const value = sampleOlderUser[key];
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
        console.log(`  ${key}: ${displayValue}`);
      });

      // Check for registration source indicators in older users
      console.log('\n--- Registration Source Analysis (Older Users) ---');
      const potentialSourceFields = ['source', 'registrationSource', 'platform', 'origin', 'userAgent', 'clientType', 'app', 'web', 'device', 'registration'];
      
      potentialSourceFields.forEach(field => {
        const usersWithField = olderUsers.filter(user => user[field] !== undefined);
        if (usersWithField.length > 0) {
          console.log(`\n${field} field found in ${usersWithField.length} older users:`);
          usersWithField.slice(0, 3).forEach((user, index) => {
            console.log(`  User ${index + 1}: ${JSON.stringify(user[field])}`);
          });
        }
      });
    }

    // Get database stats
    console.log('\n=== DATABASE STATS ===');
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Total users in collection: ${totalUsers}`);
    
    const recentCount = await usersCollection.countDocuments({
      createdAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    console.log(`Users created in last 30 days: ${recentCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

examineUsers().catch(console.error);