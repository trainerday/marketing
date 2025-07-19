const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
const ftp = require('basic-ftp');

// Configuration
const config = {
  production: {
    type: 'sftp', // or 'ftp'
    host: '157.245.124.109',
    username: 'root',
    privateKey: process.env.WORDPRESS_SSH_PRIVATE_KEY, // Set this environment variable
    remotePath: '/var/www/html/'
  },
  staging: {
    type: 'ftp',
    host: process.env.WORDPRESS_STAGE_FTP_SERVER, // Set these environment variables
    username: process.env.WORDPRESS_STAGE_FTP_USER,
    password: process.env.WORDPRESS_STAGE_FTP_PASSWORD,
    remotePath: 'web.uat.trainerday.com/public_html/'
  }
};

// SFTP Upload function
async function uploadViaSFTP(config, localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log('SFTP connection established');
      
      conn.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Upload files recursively
        uploadDirectory(sftp, localDir, remoteDir)
          .then(() => {
            conn.end();
            resolve();
          })
          .catch((error) => {
            conn.end();
            reject(error);
          });
      });
    });
    
    conn.on('error', reject);
    
    // Connect with private key
    conn.connect({
      host: config.host,
      username: config.username,
      privateKey: config.privateKey
    });
  });
}

// FTP Upload function
async function uploadViaFTP(config, localDir, remoteDir) {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  
  try {
    await client.access({
      host: config.host,
      user: config.username,
      password: config.password,
      secure: false
    });
    
    console.log('FTP connection established');
    
    // Upload directory
    await client.ensureDir(remoteDir);
    await client.clearWorkingDir();
    await client.uploadFromDir(localDir);
    
    console.log('FTP upload completed');
  } catch (err) {
    console.error('FTP upload failed:', err);
    throw err;
  } finally {
    client.close();
  }
}

// Recursive directory upload for SFTP
async function uploadDirectory(sftp, localDir, remoteDir) {
  const files = fs.readdirSync(localDir);
  
  // Ensure remote directory exists
  try {
    await new Promise((resolve, reject) => {
      sftp.mkdir(remoteDir, (err) => {
        // Ignore error if directory already exists
        resolve();
      });
    });
  } catch (err) {
    // Directory might already exist
  }
  
  for (const file of files) {
    const localFilePath = path.join(localDir, file);
    const remoteFilePath = path.posix.join(remoteDir, file);
    const stat = fs.statSync(localFilePath);
    
    if (stat.isDirectory()) {
      // Recursively upload subdirectory
      await uploadDirectory(sftp, localFilePath, remoteFilePath);
    } else {
      // Upload file
      await new Promise((resolve, reject) => {
        sftp.fastPut(localFilePath, remoteFilePath, (err) => {
          if (err) {
            console.error(`Failed to upload ${file}:`, err);
            reject(err);
          } else {
            console.log(`Uploaded: ${file}`);
            resolve();
          }
        });
      });
    }
  }
}

// Main deploy function
async function deploy(environment = 'production') {
  const deployConfig = config[environment];
  
  if (!deployConfig) {
    console.error(`Unknown environment: ${environment}`);
    console.log('Available environments:', Object.keys(config).join(', '));
    return;
  }
  
  console.log(`Deploying to ${environment}...`);
  
  const { buildPages } = require('./builder.js');
  const outputDir = path.join(__dirname, 'wp-output');
  
  try {
    // Build all pages first
    console.log('Building pages...');
    buildPages();
    
    // Check if output directory exists and has files
    if (!fs.existsSync(outputDir)) {
      throw new Error('Output directory does not exist. Run builder first.');
    }
    
    const files = fs.readdirSync(outputDir);
    if (files.length === 0) {
      throw new Error('No files to deploy. Run builder first.');
    }
    
    console.log(`Found ${files.length} files to deploy`);
    
    // Deploy based on configuration
    if (deployConfig.type === 'sftp') {
      if (!deployConfig.privateKey) {
        throw new Error('WORDPRESS_SSH_PRIVATE_KEY environment variable not set');
      }
      await uploadViaSFTP(deployConfig, outputDir, deployConfig.remotePath);
    } else if (deployConfig.type === 'ftp') {
      if (!deployConfig.host || !deployConfig.username || !deployConfig.password) {
        throw new Error('FTP environment variables not set (WORDPRESS_STAGE_FTP_SERVER, WORDPRESS_STAGE_FTP_USER, WORDPRESS_STAGE_FTP_PASSWORD)');
      }
      await uploadViaFTP(deployConfig, outputDir, deployConfig.remotePath);
    }
    
    console.log(`✅ Deployment to ${environment} completed successfully!`);
    
  } catch (error) {
    console.error(`❌ Deployment failed:`, error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  node deploy.js [environment]');
    console.log('');
    console.log('Environments:');
    console.log('  production (default) - Deploy to production server via SFTP');
    console.log('  staging              - Deploy to staging server via FTP');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  Production:');
    console.log('    WORDPRESS_SSH_PRIVATE_KEY - SSH private key for server access');
    console.log('  Staging:');
    console.log('    WORDPRESS_STAGE_FTP_SERVER - FTP server hostname');
    console.log('    WORDPRESS_STAGE_FTP_USER - FTP username');
    console.log('    WORDPRESS_STAGE_FTP_PASSWORD - FTP password');
    console.log('');
    console.log('Examples:');
    console.log('  node deploy.js                Deploy to production');
    console.log('  node deploy.js staging        Deploy to staging');
    process.exit(0);
  }
  
  deploy(environment);
}

module.exports = { deploy };