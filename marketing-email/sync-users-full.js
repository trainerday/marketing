const { MongoClient } = require('mongodb');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const BIGMAILER_BRAND_ID = '55e9e9e3-0564-41c1-ba79-faa7516c009d';
const ALL_CONTACTS_LIST_ID = '71a953b3-ef1d-4d20-91ba-10e896fe18a5';
const REQUESTS_PER_SECOND = 2; // Reduced to avoid rate limits
const DELAY_BETWEEN_REQUESTS = 1000 / REQUESTS_PER_SECOND; // 500ms between requests

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

  // Get users with userId > 113558 for updating firstname
  async getUsersToUpdate() {
    const usersCollection = this.db.collection('users');
    
    const query = {
      userId: { $gt: 113558 },
      email: { $exists: true, $ne: null, $ne: '' }
    };
    
    const users = await usersCollection.find(query)
      .sort({ userId: 1 })
      .project({
        email: 1,
        username: 1,
        userId: 1
      })
      .toArray();
    
    return users;
  }

  // Get users created since Sept 1, 2024
  async getUsersCreatedSinceDate() {
    const usersCollection = this.db.collection('users');
    
    const query = {
      createdAt: { $gte: new Date('2024-09-01T00:00:00.000Z') },
      email: { $exists: true, $ne: null, $ne: '' }
    };
    
    const users = await usersCollection.find(query)
      .sort({ createdAt: 1 })
      .project({
        email: 1,
        username: 1,
        userId: 1,
        createdAt: 1
      })
      .toArray();
    
    return users;
  }

  // Make BigMailer API request with retry logic
  async makeApiRequest(options, postData = null, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await new Promise((resolve, reject) => {
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

        // If successful or client error (not rate limit), return
        if (response.statusCode === 200 || response.statusCode === 201 || 
            (response.statusCode >= 400 && response.statusCode < 429)) {
          return response;
        }

        // If rate limited, wait and retry
        if (response.statusCode === 429 || 
            (response.data && response.data.type === 'rate_limit_error')) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited. Waiting ${waitTime/1000}s before retry ${attempt}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        return response;
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Process contacts with throttling
  async processContactsThrottled(contacts, operation, operationName) {
    const results = { success: 0, failed: 0, errors: [] };
    const startTime = Date.now();
    
    console.log(`\n=== ${operationName} ${contacts.length} contacts (${REQUESTS_PER_SECOND} req/sec) ===\n`);
    
    for (let i = 0; i < contacts.length; i++) {
      const user = contacts[i];
      const requestStartTime = Date.now();
      
      try {
        let contactData;
        
        if (operation === 'update') {
          contactData = {
            email: user.email,
            firstname: user.username || ''
          };
        } else {
          contactData = {
            email: user.email,
            firstname: user.username || '',
            list_ids: [ALL_CONTACTS_LIST_ID]
          };
        }

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
        } else {
          results.failed++;
          results.errors.push({
            email: user.email,
            userId: user.userId,
            error: response.data
          });
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: user.email,
          userId: user.userId,
          error: error.message
        });
      }
      
      // Progress update
      if ((i + 1) % 100 === 0 || i === contacts.length - 1) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = Math.round((i + 1) / elapsed);
        const remaining = contacts.length - (i + 1);
        const eta = remaining > 0 ? Math.round(remaining / rate) : 0;
        
        console.log(`Progress: ${i + 1}/${contacts.length} | Success: ${results.success} | Failed: ${results.failed} | Rate: ${rate}/sec | ETA: ${eta}s`);
      }
      
      // Throttle requests
      const requestTime = Date.now() - requestStartTime;
      if (requestTime < DELAY_BETWEEN_REQUESTS) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS - requestTime));
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\nCompleted in ${totalTime.toFixed(1)}s (${Math.round(contacts.length / totalTime)} contacts/sec)`);
    
    return results;
  }

  // Main function
  async run() {
    try {
      console.log('Starting update and sync process (THROTTLED VERSION)...\n');
      console.log(`Rate limit: ${REQUESTS_PER_SECOND} requests/second\n`);
      
      await this.connectToMongo();
      
      // Check where we left off
      let syncStatus = {};
      try {
        syncStatus = JSON.parse(fs.readFileSync('./bigmailer-sync-status.json', 'utf8'));
      } catch (e) {
        console.log('No previous sync status found');
      }
      
      // STEP 1: Update firstname for users with userId > 113558
      const usersToUpdate = await this.getUsersToUpdate();
      console.log(`Found ${usersToUpdate.length} users with userId > 113558 to update firstname`);
      
      let updateResults = { success: 0, failed: 0, errors: [] };
      
      if (usersToUpdate.length > 0 && !syncStatus.firstnameUpdateCompleted) {
        console.log(`First user to update: ${usersToUpdate[0].email} (userId: ${usersToUpdate[0].userId}, username: ${usersToUpdate[0].username || 'NO USERNAME'})`);
        console.log(`Last user to update: ${usersToUpdate[usersToUpdate.length-1].email} (userId: ${usersToUpdate[usersToUpdate.length-1].userId}, username: ${usersToUpdate[usersToUpdate.length-1].username || 'NO USERNAME'})`);
        
        updateResults = await this.processContactsThrottled(usersToUpdate, 'update', 'STEP 1: Updating firstname for');
        
        console.log('\nUpdate firstname results:');
        console.log(`✅ Successful: ${updateResults.success}`);
        console.log(`❌ Failed: ${updateResults.failed}`);
        
        // Mark firstname update as completed
        syncStatus.firstnameUpdateCompleted = true;
        syncStatus.totalFirstnameUpdates = updateResults.success;
        fs.writeFileSync('./bigmailer-sync-status.json', JSON.stringify(syncStatus, null, 2));
      } else if (syncStatus.firstnameUpdateCompleted) {
        console.log('Firstname updates already completed in previous run, skipping...');
      }
      
      // STEP 2: Add new users created since Sept 1, 2024
      const newUsers = await this.getUsersCreatedSinceDate();
      console.log(`\nFound ${newUsers.length} users created since Sept 1, 2024 with email addresses`);
      
      if (newUsers.length > 0) {
        console.log(`First new user: ${newUsers[0].email} (created: ${newUsers[0].createdAt}, username: ${newUsers[0].username || 'NO USERNAME'})`);
        console.log(`Last new user: ${newUsers[newUsers.length-1].email} (created: ${newUsers[newUsers.length-1].createdAt}, username: ${newUsers[newUsers.length-1].username || 'NO USERNAME'})`);
        
        const addResults = await this.processContactsThrottled(newUsers, 'add', 'STEP 2: Adding');
        
        console.log('\nAdd new contacts results:');
        console.log(`✅ Successful: ${addResults.success}`);
        console.log(`❌ Failed: ${addResults.failed}`);
        
        if (addResults.errors.length > 0) {
          console.log('\nAdd errors (first 5):');
          addResults.errors.slice(0, 5).forEach(err => {
            console.log(`- ${err.email} (userId: ${err.userId}): ${JSON.stringify(err.error)}`);
          });
        }
        
        // Update sync status
        syncStatus.lastFullSyncDate = new Date().toISOString();
        syncStatus.totalContactsAdded = addResults.success;
        fs.writeFileSync('./bigmailer-sync-status.json', JSON.stringify(syncStatus, null, 2));
        
        console.log('\n✅ Sync status updated');
      }
      
      console.log('\n=== FINAL SUMMARY ===');
      console.log(`Firstname updates: ${syncStatus.totalFirstnameUpdates || updateResults.success}`);
      console.log(`New contacts added: ${syncStatus.totalContactsAdded || 0}`);
      
    } catch (error) {
      console.error('Process failed:', error.message);
    } finally {
      if (this.mongoClient) {
        await this.mongoClient.close();
        console.log('\n✅ MongoDB connection closed');
      }
    }
  }
}

// Run the sync
const sync = new ContactSync();
sync.run();