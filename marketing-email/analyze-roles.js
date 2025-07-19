require('dotenv').config();
const { MongoClient } = require('mongodb');

const config = {
  mongodb: {
    username: process.env.username,
    password: process.env.password,
    host: process.env.host
  }
};

async function analyzeRoles() {
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

    // Get all unique roles
    console.log('\n=== UNIQUE ROLES ANALYSIS ===');
    const rolesAggregation = await usersCollection.aggregate([
      { $unwind: '$roles' },
      { $group: { _id: '$roles', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('All unique roles in the database:');
    rolesAggregation.forEach(role => {
      console.log(`  ${role._id}: ${role.count} users`);
    });

    // Get recent users with different roles
    console.log('\n=== RECENT USERS BY ROLE ===');
    
    // App registrants
    const appRegistrants = await usersCollection
      .find({ roles: 'app-registrants' })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`\nApp registrants (${appRegistrants.length} recent samples):`);
    appRegistrants.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.email}) - Created: ${user.createdAt}`);
      console.log(`     Last mobile app login: ${user.lastMobileAppLogin ? JSON.stringify(user.lastMobileAppLogin) : 'N/A'}`);
    });

    // Check for web registrants or other roles
    const otherRoles = rolesAggregation.filter(role => role._id !== 'app-registrants');
    
    for (const roleInfo of otherRoles.slice(0, 3)) {
      const usersWithRole = await usersCollection
        .find({ roles: roleInfo._id })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      
      console.log(`\n${roleInfo._id} (${usersWithRole.length} recent samples):`);
      usersWithRole.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username} (${user.email}) - Created: ${user.createdAt}`);
        console.log(`     Last mobile app login: ${user.lastMobileAppLogin ? JSON.stringify(user.lastMobileAppLogin) : 'N/A'}`);
      });
    }

    // Analyze lastMobileAppLogin patterns
    console.log('\n=== MOBILE APP LOGIN ANALYSIS ===');
    
    const usersWithMobileLogin = await usersCollection.countDocuments({
      'lastMobileAppLogin.loginDateUTC': { $ne: null }
    });
    
    const usersWithoutMobileLogin = await usersCollection.countDocuments({
      'lastMobileAppLogin.loginDateUTC': null
    });
    
    console.log(`Users with mobile app login history: ${usersWithMobileLogin}`);
    console.log(`Users without mobile app login history: ${usersWithoutMobileLogin}`);

    // Get some examples of users with mobile app login
    const mobileUsers = await usersCollection
      .find({ 'lastMobileAppLogin.loginDateUTC': { $ne: null } })
      .sort({ 'lastMobileAppLogin.loginDateUTC': -1 })
      .limit(5)
      .toArray();
    
    console.log('\nRecent mobile app users:');
    mobileUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} - Roles: ${JSON.stringify(user.roles)}`);
      console.log(`     Last mobile login: ${user.lastMobileAppLogin.loginDateUTC} (v${user.lastMobileAppLogin.appVersion})`);
    });

    // Check for users without the roles field
    const usersWithoutRoles = await usersCollection.countDocuments({
      roles: { $exists: false }
    });
    
    console.log(`\nUsers without roles field: ${usersWithoutRoles}`);

    // Sample users without roles
    if (usersWithoutRoles > 0) {
      const noRolesUsers = await usersCollection
        .find({ roles: { $exists: false } })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      
      console.log('\nSample users without roles:');
      noRolesUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username} (${user.email}) - Created: ${user.createdAt}`);
        console.log(`     Last mobile app login: ${user.lastMobileAppLogin ? JSON.stringify(user.lastMobileAppLogin) : 'N/A'}`);
      });
    }

    // Historical analysis - check when roles were introduced
    console.log('\n=== HISTORICAL ANALYSIS ===');
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const oldUsersWithRoles = await usersCollection.countDocuments({
      createdAt: { $lt: oneYearAgo },
      roles: { $exists: true }
    });
    
    const oldUsersWithoutRoles = await usersCollection.countDocuments({
      createdAt: { $lt: oneYearAgo },
      roles: { $exists: false }
    });
    
    console.log(`Old users (>1 year) with roles: ${oldUsersWithRoles}`);
    console.log(`Old users (>1 year) without roles: ${oldUsersWithoutRoles}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

analyzeRoles().catch(console.error);