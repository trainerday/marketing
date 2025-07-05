const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function findUser() {
  let client;
  
  try {
    // Parse .env values
    const username = process.env.username.replace(/['"]/g, '');
    const password = process.env.password.replace(/['"]/g, '');
    const host = process.env.host.replace(/['"]/g, '');
    
    const uri = `${host}/admin?authSource=admin&tls=true`;
    
    const options = {
      auth: { username, password },
      tls: true,
      tlsCAFile: path.join(__dirname, 'ca-certificate.crt'),
      serverSelectionTimeoutMS: 5000,
    };
    
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri, options);
    await client.connect();
    
    const db = client.db('trainerday-production');
    const collection = db.collection('users');
    
    // Search variations
    const searchEmail = 'tom@thesmokycat.co.uk';
    console.log(`\nSearching for email: ${searchEmail}`);
    
    // Try exact match
    let user = await collection.findOne({ email: searchEmail });
    
    if (!user) {
      // Try case insensitive
      user = await collection.findOne({ 
        email: { $regex: new RegExp(`^${searchEmail}$`, 'i') } 
      });
    }
    
    if (!user) {
      // Search for partial match
      console.log('\nSearching for partial matches...');
      const partialMatches = await collection.find({ 
        email: { $regex: 'thesmokycat', $options: 'i' } 
      }).limit(10).toArray();
      
      if (partialMatches.length > 0) {
        console.log('\nFound partial matches:');
        partialMatches.forEach(u => {
          console.log(`- ${u.email} (userId: ${u.userId})`);
        });
      }
    }
    
    if (user) {
      console.log('\n✅ Found user:');
      console.log(`Email: ${user.email}`);
      console.log(`userId: ${user.userId}`);
      console.log(`Username: ${user.username || 'N/A'}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Updated: ${user.updatedAt}`);
    } else {
      console.log('\n❌ User not found');
      
      // Find the user with the highest userId
      console.log('\nFinding user with highest userId...');
      const highestUser = await collection.find({ email: { $exists: true, $ne: null, $ne: '' } })
        .sort({ userId: -1 })
        .limit(1)
        .toArray();
      
      if (highestUser.length > 0) {
        console.log(`\nHighest userId: ${highestUser[0].userId}`);
        console.log(`Email: ${highestUser[0].email}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Connection closed');
    }
  }
}

findUser();