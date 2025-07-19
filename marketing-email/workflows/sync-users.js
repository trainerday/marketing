const { MongoClient } = require('mongodb');
const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Configuration
const BIGMAILER_BRAND_ID = config.bigmailer.brandId;
const ALL_CONTACTS_LIST_ID = config.bigmailer.lists.allUsers;
const INSIDERS_LIST_ID = config.bigmailer.lists.insiders;
const BATCH_SIZE = 100;
const SYNC_STATUS_FILE = './bigmailer-sync-status.json';

class ContactSync {
  constructor() {
    this.apiKey = config.bigmailer.apiKey;
    this.mongoClient = null;
    this.db = null;
  }

  // Connect to MongoDB
  async connectToMongo() {
    const username = config.mongodb.username.replace(/['"]/g, '');
    const password = config.mongodb.password.replace(/['"]/g, '');
    const host = config.mongodb.host.replace(/['"]/g, '');
    
    const uri = `${host}/admin?authSource=admin&tls=true`;
    
    const options = {
      auth: { username, password },
      tls: true,
      tlsCAFile: path.join(__dirname, '..', 'ca-certificate.crt'),
      serverSelectionTimeoutMS: 5000,
    };
    
    this.mongoClient = new MongoClient(uri, options);
    await this.mongoClient.connect();
    this.db = this.mongoClient.db('trainerday-production');
    console.log('✅ Connected to MongoDB');
  }

  // Read sync status from local file
  async getSyncStatus() {
    try {
      if (fs.existsSync(SYNC_STATUS_FILE)) {
        const data = fs.readFileSync(SYNC_STATUS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('No previous sync status found');
    }
    
    return {
      lastUserId: 0,
      lastEmail: null,
      lastSyncTime: null,
      totalSynced: 0
    };
  }

  // Save sync status to local file
  async saveSyncStatus(status) {
    fs.writeFileSync(SYNC_STATUS_FILE, JSON.stringify(status, null, 2));
    console.log(`\n✅ Sync status saved to ${SYNC_STATUS_FILE}`);
  }

  // Find user by email to get their userId
  async findUserByEmail(email) {
    const usersCollection = this.db.collection('users');
    const user = await usersCollection.findOne({ email: email });
    return user;
  }

  // Get contacts that need syncing (userId greater than last synced)
  async getContactsToSync(lastUserId) {
    const usersCollection = this.db.collection('users');
    
    // Find users with userId greater than last synced
    const query = {
      userId: { $gt: lastUserId },
      email: { $exists: true, $ne: null, $ne: '' }
    };
    
    const users = await usersCollection.find(query)
      .sort({ userId: 1 }) // Sort by userId ascending
      .project({
        email: 1,
        username: 1,
        userId: 1,
        isPaid: 1,
        membershipLevels: 1,
        locale: 1,
        timezone: 1,
        roles: 1,
        ftp: 1,
        sportProfiles: 1,
        updatedAt: 1,
        createdAt: 1
      })
      .toArray();
    
    return users;
  }

  // Get all users with active annual subscriptions for insider list
  async getInsiderUsers() {
    const subscriptionsCollection = this.db.collection('billing_user_subscriptions');
    const usersCollection = this.db.collection('users');
    
    // Find all active subscriptions with "Yearly" or "Annual" in the name field
    const annualSubscriptions = await subscriptionsCollection.find({
      name: { $regex: /(yearly|annual)/i },
      status: 'active'
    }).project({
      userId: 1,
      name: 1,
      status: 1
    }).toArray();
    
    // Get unique userIds from annual subscriptions
    const annualUserIds = [...new Set(annualSubscriptions.map(sub => sub.userId))];
    
    // Get user details for these userIds
    const users = await usersCollection.find({
      userId: { $in: annualUserIds },
      email: { $exists: true, $ne: null, $ne: '' }
    }).project({
      email: 1,
      username: 1,
      userId: 1,
      isPaid: 1,
      membershipLevels: 1,
      locale: 1,
      timezone: 1,
      roles: 1,
      ftp: 1,
      sportProfiles: 1,
      updatedAt: 1,
      createdAt: 1
    }).toArray();
    
    console.log(`Found ${annualSubscriptions.length} annual subscriptions for ${users.length} users`);
    return users;
  }

  // Clear all contacts from insider list
  async clearInsiderList() {
    const options = {
      hostname: 'api.bigmailer.io',
      port: 443,
      path: `/v1/contacts/lists/${INSIDERS_LIST_ID}/clear`,
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    };

    const response = await this.makeApiRequest(options);
    if (response.statusCode === 200) {
      console.log('✅ Insider list cleared successfully');
    } else {
      console.error('❌ Failed to clear insider list:', response.data);
    }
    return response;
  }

  // Make BigMailer API request
  async makeApiRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: data ? JSON.parse(data) : null
            });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: data });
          }
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  // Upsert contacts to BigMailer
  async syncContactsBatch(contacts, syncStatus) {
    const results = { success: 0, failed: 0, errors: [] };
    let lastSuccessfulUser = null;
    
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(contacts.length/BATCH_SIZE)}...`);
      
      for (const user of batch) {
        try {
          const contactData = {
            email: user.email,
            name: user.username || '',
            list_ids: [ALL_CONTACTS_LIST_ID]
          };

          const postData = JSON.stringify(contactData);
          
          const options = {
            hostname: 'api.bigmailer.io',
            port: 443,
            path: `/v1/brands/${BIGMAILER_BRAND_ID}/contacts/upsert`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-API-Key': this.apiKey,
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const response = await this.makeApiRequest(options, postData);
          
          if (response.statusCode === 200 || response.statusCode === 201) {
            results.success++;
            lastSuccessfulUser = user;
            
            // Update sync status after each successful sync
            syncStatus.lastUserId = user.userId;
            syncStatus.lastEmail = user.email;
            syncStatus.totalSynced++;
            
            // Save progress every 50 successful syncs
            if (results.success % 50 === 0) {
              syncStatus.lastSyncTime = new Date().toISOString();
              await this.saveSyncStatus(syncStatus);
              console.log(`Progress saved: ${results.success} contacts synced`);
            }
          } else {
            results.failed++;
            results.errors.push({
              email: user.email,
              userId: user.userId,
              error: response.data
            });
            console.log(`❌ Failed: ${user.email} (userId: ${user.userId})`);
          }
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            email: user.email,
            userId: user.userId,
            error: error.message
          });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return { results, lastSuccessfulUser };
  }

  // Sync insiders to insider list (complete refresh)
  async syncInsidersList(insiderUsers) {
    const results = { success: 0, failed: 0, errors: [] };
    
    console.log(`\n📋 Syncing ${insiderUsers.length} insider users to insider list...`);
    
    for (let i = 0; i < insiderUsers.length; i += BATCH_SIZE) {
      const batch = insiderUsers.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing insider batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(insiderUsers.length/BATCH_SIZE)}...`);
      
      for (const user of batch) {
        try {
          const contactData = {
            email: user.email,
            name: user.username || '',
            list_ids: [INSIDERS_LIST_ID]
          };

          const postData = JSON.stringify(contactData);
          
          const options = {
            hostname: 'api.bigmailer.io',
            port: 443,
            path: `/v1/brands/${BIGMAILER_BRAND_ID}/contacts/upsert`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-API-Key': this.apiKey,
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const response = await this.makeApiRequest(options, postData);
          
          if (response.statusCode === 200 || response.statusCode === 201) {
            results.success++;
            console.log(`✅ ${user.email} (userId: ${user.userId})`);
          } else {
            results.failed++;
            results.errors.push({
              email: user.email,
              userId: user.userId,
              error: response.data
            });
            console.log(`❌ Failed: ${user.email} (userId: ${user.userId})`);
          }
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            email: user.email,
            userId: user.userId,
            error: error.message
          });
          console.log(`❌ Error: ${user.email} - ${error.message}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  // Main sync function
  async sync() {
    try {
      console.log('Starting contact sync...\n');
      
      // Connect to MongoDB
      await this.connectToMongo();
      
      // Get sync status
      const syncStatus = await this.getSyncStatus();
      console.log('Current sync status:', syncStatus);
      
      // If last email is provided, find that user to get their userId
      if (syncStatus.lastEmail === null && process.argv[2]) {
        const email = process.argv[2];
        console.log(`\nLooking up user with email: ${email}`);
        const user = await this.findUserByEmail(email);
        
        if (user) {
          syncStatus.lastUserId = user.userId;
          syncStatus.lastEmail = user.email;
          console.log(`Found user: ${user.email} with userId: ${user.userId}`);
        } else {
          console.log(`User with email ${email} not found`);
          return;
        }
      }
      
      // Get contacts to sync
      console.log(`\nFetching users with userId > ${syncStatus.lastUserId}...`);
      const contactsToSync = await this.getContactsToSync(syncStatus.lastUserId);
      console.log(`Found ${contactsToSync.length} contacts to sync`);
      
      if (contactsToSync.length === 0) {
        console.log('\nNo new contacts to sync.');
        return;
      }
      
      // Show first and last users to be synced
      console.log(`\nFirst user to sync: ${contactsToSync[0].email} (userId: ${contactsToSync[0].userId})`);
      console.log(`Last user to sync: ${contactsToSync[contactsToSync.length-1].email} (userId: ${contactsToSync[contactsToSync.length-1].userId})`);
      
      // Sync contacts
      const { results, lastSuccessfulUser } = await this.syncContactsBatch(contactsToSync, syncStatus);
      
      // Update final sync status
      if (lastSuccessfulUser) {
        syncStatus.lastSyncTime = new Date().toISOString();
        await this.saveSyncStatus(syncStatus);
      }

      // Sync insider users (complete refresh)
      console.log('\n' + '='.repeat(50));
      console.log('🔄 Starting insider list refresh...');
      console.log('='.repeat(50));
      
      // Clear existing insider list
      await this.clearInsiderList();
      
      // Get all insider users
      const insiderUsers = await this.getInsiderUsers();
      
      if (insiderUsers.length > 0) {
        // Sync insiders to insider list
        const insiderResults = await this.syncInsidersList(insiderUsers);
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 INSIDER SYNC RESULTS:');
        console.log(`✅ Successfully synced: ${insiderResults.success} insiders`);
        console.log(`❌ Failed: ${insiderResults.failed} insiders`);
        console.log('='.repeat(50));
        
        if (insiderResults.errors.length > 0) {
          console.log('\nInsider sync errors:');
          insiderResults.errors.forEach(error => {
            console.log(`- ${error.email}: ${error.error}`);
          });
        }
      } else {
        console.log('No insider users found.');
      }
      
      // Report results
      console.log('\n=== Sync Results ===');
      console.log(`✅ Successful: ${results.success}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`📊 Total synced all-time: ${syncStatus.totalSynced}`);
      
      if (syncStatus.lastEmail) {
        console.log(`\nLast successful sync: ${syncStatus.lastEmail} (userId: ${syncStatus.lastUserId})`);
      }
      
      if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.slice(0, 10).forEach(err => {
          console.log(`- ${err.email} (userId: ${err.userId}): ${JSON.stringify(err.error)}`);
        });
        if (results.errors.length > 10) {
          console.log(`... and ${results.errors.length - 10} more errors`);
        }
      }
      
    } catch (error) {
      console.error('Sync failed:', error.message);
    } finally {
      if (this.mongoClient) {
        await this.mongoClient.close();
        console.log('\n✅ MongoDB connection closed');
      }
    }
  }
}

// Usage:
// node sync-contacts-by-userid.js                    # Continue from last sync
// node sync-contacts-by-userid.js tom@thesmokycat.co.uk  # Start from specific user

const sync = new ContactSync();
sync.sync();