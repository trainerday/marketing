require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const BIGMAILER_API_KEY = process.env.BIGMAILER_API_KEY;
const BRAND_ID = '55e9e9e3-0564-41c1-ba79-faa7516c009d';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.bigmailer.io',
      port: 443,
      path: `/v1${path}`,
      method: method,
      headers: {
        'X-API-Key': BIGMAILER_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${parsedData.message || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function formatNumber(num) {
  return num.toLocaleString();
}

function formatPercentage(num) {
  return `${(num * 100).toFixed(2)}%`;
}

async function getCampaignStats() {
  console.log('📊 Fetching campaign statistics from BigMailer...\n');
  
  try {
    // First, try to read the last campaign info
    let campaignId;
    const lastCampaignPath = path.join(__dirname, 'output', 'last-campaign-created.json');
    
    if (fs.existsSync(lastCampaignPath)) {
      const lastCampaign = JSON.parse(fs.readFileSync(lastCampaignPath, 'utf8'));
      campaignId = lastCampaign.id;
      console.log(`Using last created campaign: ${lastCampaign.name}`);
      console.log(`Campaign ID: ${campaignId}\n`);
    } else {
      // If no last campaign file, get recent campaigns
      console.log('No last campaign file found. Fetching recent campaigns...\n');
      const campaigns = await makeRequest(`/brands/${BRAND_ID}/bulk-campaigns?page=1&page_size=10`);
      
      if (!campaigns.data || campaigns.data.length === 0) {
        console.log('No campaigns found.');
        return;
      }
      
      // Use the most recent campaign
      campaignId = campaigns.data[0].id;
      console.log(`Using most recent campaign: ${campaigns.data[0].name}`);
      console.log(`Campaign ID: ${campaignId}\n`);
    }
    
    // Get campaign details
    const campaign = await makeRequest(`/brands/${BRAND_ID}/bulk-campaigns/${campaignId}`);
    
    // BigMailer includes stats directly in the campaign object
    const stats = {
      count_recipient: campaign.num_sent + campaign.num_rejected,
      count_delivered: campaign.num_sent,
      count_bounce: campaign.num_hard_bounces + campaign.num_soft_bounces,
      count_hard_bounce: campaign.num_hard_bounces,
      count_soft_bounce: campaign.num_soft_bounces,
      count_open: campaign.num_opens,
      count_unique_open: campaign.num_opens, // Using regular opens as unique opens
      count_total_open: campaign.num_total_opens,
      count_click: campaign.num_clicks,
      count_unique_click: campaign.num_clicks, // Using regular clicks as unique clicks
      count_total_click: campaign.num_total_clicks,
      count_unsubscribe: campaign.num_unsubscribes,
      count_complaint: campaign.num_complaints
    };
    
    // Display campaign information
    console.log('📧 Campaign Details:');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Name: ${campaign.name}`);
    console.log(`Subject: ${campaign.subject}`);
    console.log(`Status: ${campaign.status}`);
    console.log(`Created: ${new Date(campaign.created * 1000).toLocaleString()}`);
    if (campaign.status !== 'draft') {
      console.log(`Status Date: ${new Date(campaign.created * 1000).toLocaleString()}`);
    }
    console.log();
    
    // Display statistics
    console.log('📈 Campaign Statistics:');
    console.log('═══════════════════════════════════════════════════');
    
    // Delivery stats
    console.log('Delivery:');
    console.log(`  • Recipients: ${formatNumber(stats.count_recipient)}`);
    console.log(`  • Delivered: ${formatNumber(stats.count_delivered)} (${formatPercentage(stats.count_delivered / stats.count_recipient)})`);
    console.log(`  • Bounced: ${formatNumber(stats.count_bounce)} (${formatPercentage(stats.count_bounce / stats.count_recipient)})`);
    console.log(`  • Soft Bounced: ${formatNumber(stats.count_soft_bounce)}`);
    console.log(`  • Hard Bounced: ${formatNumber(stats.count_hard_bounce)}`);
    console.log();
    
    // Engagement stats
    console.log('Engagement:');
    console.log(`  • Opened: ${formatNumber(stats.count_open)} (${formatPercentage(stats.count_open / stats.count_delivered)})`);
    console.log(`  • Unique Opens: ${formatNumber(stats.count_unique_open)} (${formatPercentage(stats.count_unique_open / stats.count_delivered)})`);
    console.log(`  • Clicked: ${formatNumber(stats.count_click)} (${formatPercentage(stats.count_click / stats.count_delivered)})`);
    console.log(`  • Unique Clicks: ${formatNumber(stats.count_unique_click)} (${formatPercentage(stats.count_unique_click / stats.count_delivered)})`);
    console.log();
    
    // Other stats
    console.log('Other:');
    console.log(`  • Unsubscribed: ${formatNumber(stats.count_unsubscribe)} (${formatPercentage(stats.count_unsubscribe / stats.count_delivered)})`);
    console.log(`  • Complaints: ${formatNumber(stats.count_complaint)} (${formatPercentage(stats.count_complaint / stats.count_delivered)})`);
    console.log();
    
    // Performance metrics
    if (stats.count_unique_open > 0) {
      const clickToOpenRate = stats.count_unique_click / stats.count_unique_open;
      console.log('Performance Metrics:');
      console.log(`  • Click-to-Open Rate: ${formatPercentage(clickToOpenRate)}`);
      console.log(`  • Engagement Rate: ${formatPercentage((stats.count_unique_open + stats.count_unique_click) / stats.count_delivered)}`);
      console.log();
    }
    
    // Save stats to file
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const statsData = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        created_at: new Date(campaign.created * 1000).toISOString(),
        sent_at: campaign.status !== 'draft' ? new Date(campaign.created * 1000).toISOString() : null
      },
      statistics: stats,
      fetchedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'last-campaign-stats.json'), 
      JSON.stringify(statsData, null, 2)
    );
    
    console.log('✅ Stats saved to output/last-campaign-stats.json');
    
  } catch (error) {
    console.error('❌ Error fetching campaign stats:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check your BigMailer API key in .env');
    console.error('- Verify the campaign ID exists');
    console.error('- Ensure you have access to view campaign statistics');
  }
}

// Run the script
getCampaignStats();