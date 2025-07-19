const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config');

async function exploreActivityCollections() {
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
    
    // Get collections that might contain user activities
    const collections = await db.listCollections().toArray();
    const potentialActivityCollections = collections.filter(c => 
      c.name.includes('activity') || 
      c.name.includes('workout') || 
      c.name.includes('plan') || 
      c.name.includes('training') ||
      c.name.includes('event') ||
      c.name.includes('calendar') ||
      c.name.includes('strava') ||
      c.name.includes('garmin')
    );
    
    console.log('\n=== Potential Activity Collections ===');
    potentialActivityCollections.forEach(c => console.log(`- ${c.name}`));
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get a sample of recent users
    const sampleUsers = await db.collection('users').find({
      createdAt: { $gte: thirtyDaysAgo }
    }).limit(5).toArray();
    
    console.log('\n=== Checking Sample Users for Activity ===');
    
    for (const user of sampleUsers) {
      console.log(`\nUser: ${user.email} (registered: ${user.createdAt.toISOString().split('T')[0]})`);
      const threeDaysAfter = new Date(user.createdAt);
      threeDaysAfter.setDate(threeDaysAfter.getDate() + 3);
      
      // Check each potential activity collection
      for (const collection of potentialActivityCollections) {
        try {
          const count = await db.collection(collection.name).countDocuments({
            userId: user._id,
            createdAt: { 
              $gte: user.createdAt, 
              $lte: threeDaysAfter 
            }
          });
          
          if (count > 0) {
            console.log(`  ✓ ${collection.name}: ${count} records`);
            
            // Get a sample document to understand structure
            const sample = await db.collection(collection.name).findOne({
              userId: user._id,
              createdAt: { 
                $gte: user.createdAt, 
                $lte: threeDaysAfter 
              }
            });
            
            if (sample) {
              console.log(`    Sample fields: ${Object.keys(sample).slice(0, 5).join(', ')}`);
            }
          }
        } catch (error) {
          // Skip collections that don't have userId field
        }
      }
    }
    
    // Check for collections that might use different user field names
    console.log('\n=== Checking Alternative User Field Names ===');
    const alternativeFields = ['user_id', 'userID', 'email', 'username'];
    
    for (const collection of potentialActivityCollections.slice(0, 3)) { // Check first 3 to avoid too much output
      console.log(`\nChecking ${collection.name} for alternative user fields:`);
      
      try {
        const sampleDoc = await db.collection(collection.name).findOne({});
        if (sampleDoc) {
          const fields = Object.keys(sampleDoc);
          const userFields = fields.filter(field => 
            alternativeFields.some(alt => field.toLowerCase().includes(alt.toLowerCase())) ||
            field.toLowerCase().includes('user')
          );
          console.log(`  User-related fields: ${userFields.join(', ')}`);
          
          // Check if this collection has recent activity
          const recentCount = await db.collection(collection.name).countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
          });
          console.log(`  Recent records (last 30 days): ${recentCount}`);
        }
      } catch (error) {
        console.log(`  Error checking ${collection.name}: ${error.message}`);
      }
    }
    
    // Summary of findings
    console.log('\n=== SUMMARY ===');
    console.log('Collections checked for user activity:');
    potentialActivityCollections.forEach(c => console.log(`- ${c.name}`));
    
    console.log('\nNext steps for deeper analysis:');
    console.log('1. Check collections with alternative user field names');
    console.log('2. Extend analysis period to 7 days');
    console.log('3. Look for indirect activity indicators');
    console.log('4. Check if activity data exists but with different date fields');
    
  } catch (error) {
    console.error('Error exploring collections:', error);
  } finally {
    await client.close();
  }
}

// Run the exploration
exploreActivityCollections().catch(console.error);