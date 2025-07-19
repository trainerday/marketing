const { MongoClient } = require('mongodb');
const path = require('path');
const config = require('./config.js');

async function analyzeAppData() {
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
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('trainerday-production');
    const collection = db.collection('users');
    
    // Define date range: last 30 days (June 14 - July 14, 2025)
    const endDate = new Date('2025-07-14T23:59:59.999Z');
    const startDate = new Date('2025-06-14T00:00:00.000Z');
    
    console.log(`\n=== ANALYZING DATA FOR LAST 30 DAYS ===`);
    console.log(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // First, let's examine the data structure to understand what fields indicate app registration vs usage
    console.log('\n=== DATA STRUCTURE ANALYSIS ===');
    
    // Sample a few users to understand the data structure
    const sampleUsers = await collection.find({}).limit(5).toArray();
    console.log('\nSample user data structure:');
    sampleUsers.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`- _id: ${user._id}`);
      console.log(`- email: ${user.email}`);
      console.log(`- createdAt: ${user.createdAt}`);
      console.log(`- roles: ${JSON.stringify(user.roles)}`);
      console.log(`- lastMobileAppLogin: ${JSON.stringify(user.lastMobileAppLogin)}`);
      console.log(`- Other fields: ${Object.keys(user).filter(k => !['_id', 'email', 'createdAt', 'roles', 'lastMobileAppLogin'].includes(k)).join(', ')}`);
    });
    
    // Check unique roles to understand app registration indicators
    const uniqueRoles = await collection.distinct('roles');
    console.log(`\nUnique roles in database: ${JSON.stringify(uniqueRoles)}`);
    
    // === APP REGISTRATIONS ANALYSIS ===
    console.log('\n=== APP REGISTRATIONS (NEW USERS VIA APP) ===');
    
    // Method 1: Users with 'app-registrants' role created in last 30 days
    const appRegistrantsQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      roles: 'app-registrants'
    };
    
    const appRegistrants = await collection.find(appRegistrantsQuery).toArray();
    console.log(`\nUsers with 'app-registrants' role created in last 30 days: ${appRegistrants.length}`);
    
    if (appRegistrants.length > 0) {
      console.log('\nSample app registrants:');
      appRegistrants.slice(0, 3).forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Created: ${user.createdAt}, Roles: ${JSON.stringify(user.roles)}`);
      });
    }
    
    // Method 2: Check for other potential app registration indicators
    // Users created in last 30 days who have mobile app login data
    const usersWithAppDataQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      lastMobileAppLogin: { $exists: true, $ne: null }
    };
    
    const usersWithAppData = await collection.find(usersWithAppDataQuery).toArray();
    console.log(`\nUsers created in last 30 days with mobile app login data: ${usersWithAppData.length}`);
    
    // === APP LOGINS/USAGE ANALYSIS ===
    console.log('\n=== APP LOGINS/USAGE (ALL USERS WHO USED APP) ===');
    
    // Users who had mobile app activity in last 30 days (regardless of when they registered)
    const appUsageQuery = {
      'lastMobileAppLogin.loginDateUTC': { $gte: startDate, $lte: endDate }
    };
    
    const appUsageUsers = await collection.find(appUsageQuery).toArray();
    console.log(`\nUsers who used the app in last 30 days: ${appUsageUsers.length}`);
    
    if (appUsageUsers.length > 0) {
      console.log('\nSample app usage data:');
      appUsageUsers.slice(0, 3).forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Mobile Login: ${user.lastMobileAppLogin?.loginDateUTC}`);
        console.log(`   Roles: ${JSON.stringify(user.roles)}`);
      });
    }
    
    // === BREAKDOWN ANALYSIS ===
    console.log('\n=== DETAILED BREAKDOWN ===');
    
    // New users who registered AND used app in last 30 days
    const newAppUsersQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      'lastMobileAppLogin.loginDateUTC': { $gte: startDate, $lte: endDate }
    };
    
    const newAppUsers = await collection.find(newAppUsersQuery).toArray();
    console.log(`\nNew users who registered AND used app in last 30 days: ${newAppUsers.length}`);
    
    // Existing users who used app in last 30 days (registered before June 14)
    const existingAppUsersQuery = {
      createdAt: { $lt: startDate },
      'lastMobileAppLogin.loginDateUTC': { $gte: startDate, $lte: endDate }
    };
    
    const existingAppUsers = await collection.find(existingAppUsersQuery).toArray();
    console.log(`\nExisting users who used app in last 30 days: ${existingAppUsers.length}`);
    
    // === VERIFICATION ===
    console.log('\n=== VERIFICATION ===');
    console.log(`Total app usage (new + existing): ${newAppUsers.length + existingAppUsers.length}`);
    console.log(`Should equal total app usage count: ${appUsageUsers.length}`);
    console.log(`Match: ${(newAppUsers.length + existingAppUsers.length) === appUsageUsers.length ? 'YES' : 'NO'}`);
    
    // === SUMMARY ===
    console.log('\n=== SUMMARY ===');
    console.log(`1. App Registrations (new users via app): ${appRegistrants.length}`);
    console.log(`2. App Usage (all users who used app): ${appUsageUsers.length}`);
    console.log(`   - New users who used app: ${newAppUsers.length}`);
    console.log(`   - Existing users who used app: ${existingAppUsers.length}`);
    
    // Check overlap between app registrants and app users
    const appRegistrantEmails = new Set(appRegistrants.map(u => u.email));
    const appUserEmails = new Set(appUsageUsers.map(u => u.email));
    const overlap = [...appRegistrantEmails].filter(email => appUserEmails.has(email));
    
    console.log(`\n=== OVERLAP ANALYSIS ===`);
    console.log(`App registrants who also used app: ${overlap.length}`);
    console.log(`App registrants who never logged in: ${appRegistrants.length - overlap.length}`);
    
    // === CLARIFICATION OF PREVIOUS ANALYSIS ===
    console.log('\n=== CLARIFICATION ===');
    console.log('Previous analysis confusion:');
    console.log('- "App login as meaningful action" likely referred to app USAGE (lastMobileAppLogin)');
    console.log('- This includes both new registrations AND existing users using the app');
    console.log('- The distinction is:');
    console.log('  * App Registration = new account created via mobile app');
    console.log('  * App Usage = any user (new or existing) actively using the mobile app');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

analyzeAppData();