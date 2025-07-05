const { MongoClient } = require('mongodb');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const BIGMAILER_BRAND_ID = '55e9e9e3-0564-41c1-ba79-faa7516c009d';
const ALL_CONTACTS_LIST_ID = '71a953b3-ef1d-4d20-91ba-10e896fe18a5';
const BATCH_SIZE = 100;
const SYNC_STATUS_FILE = './bigmailer-sync-status.json';

class ContactSync {
  constructor() {
    this.apiKey = process.env.BIGMAILER_API_KEY;
    this.mongoClient = null;
    this.db = null;
  }

  // Connect to MongoDB
  async connectToMongo() {
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