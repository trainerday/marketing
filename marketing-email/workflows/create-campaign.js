const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Get email type from command line argument
const emailType = process.argv[2];
if (!emailType || !config.emailTypes[emailType]) {
  console.error('Usage: node create-campaign.js <email-type>');
  console.error('Available types:', Object.keys(config.emailTypes).join(', '));
  process.exit(1);
}

const emailConfig = config.emailTypes[emailType];
const BIGMAILER_API_KEY = config.bigmailer.apiKey;
const BRAND_ID = config.bigmailer.brandId;
const LIST_ID = emailConfig.listId;

console.log(`📧 Creating ${emailType} campaign...\n`);

// Read the development summary
const devSummary = fs.readFileSync(path.join(__dirname, 'output', 'development-summary-since-sept-2024.md'), 'utf8');

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
            reject(new Error(`API Error ${res.statusCode}: ${parsedData.message}`));
          }
        } catch (e) {
          if (res.statusCode === 200) {
            resolve({ id: 'success' });
          } else {
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
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

function convertMarkdownToHTML(markdown) {
  // First, extract any existing HTML blocks (like blockquotes)
  const htmlBlocks = [];
  let blockIndex = 0;
  
  // Replace HTML blocks with placeholders
  markdown = markdown.replace(/<blockquote[\s\S]*?<\/blockquote>/g, (match) => {
    htmlBlocks.push(match);
    return `___HTMLBLOCK_${blockIndex++}___`;
  });
  
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3 style="color: #0068A5; font-size: 20px; margin: 25px 0 15px 0; font-weight: 600;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color: #0068A5; font-size: 24px; margin: 30px 0 20px 0; font-weight: 600;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color: #0068A5; font-size: 28px; margin: 0 0 25px 0; font-weight: 700;">$1</h1>')
    // Bold and italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #333; font-weight: 600;">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em style="font-style: italic;">$1</em>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border: none; border-top: 2px solid #e0e0e0; margin: 30px 0;">');

  // Process lists with tight spacing
  const lines = html.split('\n');
  let inList = false;
  let processedLines = [];
  
  for (let line of lines) {
    if (line.startsWith('• ')) {
      if (!inList) {
        processedLines.push('<ul style="margin: 10px 0 15px 0; padding-left: 25px; list-style-type: disc;">');
        inList = true;
      }
      processedLines.push(`<li style="margin: 3px 0; line-height: 1.5;">${line.substring(2)}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push('</ul>');
  }
  
  html = processedLines.join('\n');
  
  // Convert paragraphs with tight spacing
  html = html.split(/\n\n+/).map(para => {
    para = para.trim();
    if (para.startsWith('<') || para === '' || para.startsWith('___HTMLBLOCK_')) {
      return para;
    }
    return `<p style="margin: 10px 0; line-height: 1.5; color: #333;">${para}</p>`;
  }).join('\n');
  
  // Restore HTML blocks
  html = html.replace(/___HTMLBLOCK_(\d+)___/g, (match, index) => {
    return htmlBlocks[parseInt(index)];
  });
  
  return html;
}

async function createCampaign() {
  console.log('📧 Creating email campaign in BigMailer...\n');
  
  try {
    // Read the email template
    const emailTemplate = fs.readFileSync(path.join(__dirname, 'email-template.html'), 'utf8');
    
    // Convert markdown to HTML
    const htmlContent = convertMarkdownToHTML(devSummary);
    
    // Replace the placeholder in the template with our content
    const emailHTML = emailTemplate.replace(
      '<!-- EMAIL CONTENT GOES HERE -->',
      htmlContent
    ).replace(
      '<!-- This placeholder will be replaced with the converted markdown content -->',
      ''
    ).replace(
      /<!-- Example content structure:[\s\S]*?-->/,
      ''
    );
    
    // Create text version
    const textContent = devSummary
      .replace(/#{1,3} /g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^• /gm, '- ');
    
    // Create campaign name with date
    const today = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const campaignData = {
      name: `${today} Development Update`,
      subject: `🚀 285 days, 300+ improvements, and counting...`,
      from: {
        email: 'support@send.trainerday.com',
        name: 'Alex V from TrainerDay'
      },
      reply_to: {
        email: 'support@trainerday.com',
        name: 'TrainerDay Support'
      },
      preview: 'Your favorite cycling app just got better - see what we\'ve been building for you',
      html: emailHTML,
      text: textContent,
      track_opens: true,
      track_clicks: true,
      track_text_clicks: true,
      list_ids: [LIST_ID]
    };
    
    console.log('Creating campaign:', campaignData.name);
    console.log('Subject:', campaignData.subject);
    
    const result = await makeRequest(`/brands/${BRAND_ID}/bulk-campaigns`, 'POST', campaignData);
    
    console.log('\n✅ Campaign created successfully!');
    console.log('Campaign ID:', result.id);
    console.log('\n📋 Next steps:');
    console.log('1. Log into BigMailer: https://app.bigmailer.io/');
    console.log('2. Go to Campaigns > Bulk Campaigns');
    console.log(`3. Find "${campaignData.name}"`);
    console.log('4. Send a test email to verify formatting');
    console.log('5. Schedule or send the campaign');
    
    // Save campaign details
    const campaignInfo = {
      id: result.id,
      name: campaignData.name,
      createdAt: new Date().toISOString(),
      subject: campaignData.subject
    };
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    fs.writeFileSync(path.join(outputDir, 'last-campaign-created.json'), JSON.stringify(campaignInfo, null, 2));
    
  } catch (error) {
    console.error('❌ Error creating campaign:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check your BigMailer API key in .env');
    console.error('- Verify you have access to the brand');
    console.error('- Check if the list ID exists');
  }
}

createCampaign();