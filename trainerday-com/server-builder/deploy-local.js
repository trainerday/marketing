const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const LOCAL_CONFIG = {
  sitesDir: '/Users/alex/Sites/td-testit2',
  nginxConfigPath: '/Users/alex/.config/valet/Nginx/td-testit2.test',
  nginxTemplatePath: path.join(__dirname, 'templates/td-testit2.test'),
  outputDir: path.join(__dirname, 'wp-output'),
  assetsDir: path.join(__dirname, 'pages/assets')
};

// Routes that need Nginx location blocks
const STATIC_ROUTES = [
  { path: '/privacy-policy', file: 'privacy-policy.html' },
  { path: '/terms-and-conditions', file: 'terms-and-conditions.html' },
  { path: '/api', file: 'api.html' },
  { path: '/pricing', file: 'pricing.html' },
  { path: '/coach-jack', file: 'coach-jack.html' },
  { path: '/404', file: '404.html' },
  { path: '/download', file: 'download.html' },
  { path: '/jetblack', file: 'jetblack.html' },
  { path: '/jb', file: 'jetblack.html' }, // alias
  { path: '/contact-us', file: 'contact.html' },
  { path: '/register', file: 'register.html' },
  { path: '/login', file: 'login.html' }
];

function generateNginxConfig() {
  console.log('Generating Nginx configuration...');
  
  // Read the template
  const template = fs.readFileSync(LOCAL_CONFIG.nginxTemplatePath, 'utf8');
  
  // Generate location blocks for static routes
  const locationBlocks = STATIC_ROUTES.map(route => {
    return `    location ~ ^${route.path}/?$ {
        root /Users/alex/Sites/td-testit2;
        try_files /${route.file} =404;
    }`;
  }).join('\n\n');
  
  // Replace the custom static file rewrites section
  const updatedConfig = template.replace(
    /# Custom static file rewrites[\s\S]*?(?=\n    # Serve index\.html for root path)/,
    `# Custom static file rewrites
${locationBlocks}

`
  );
  
  return updatedConfig;
}

function updateNginxConfig() {
  console.log('Updating Nginx configuration...');
  
  const newConfig = generateNginxConfig();
  
  // Check if config exists and if it's different
  if (fs.existsSync(LOCAL_CONFIG.nginxConfigPath)) {
    const existingConfig = fs.readFileSync(LOCAL_CONFIG.nginxConfigPath, 'utf8');
    if (existingConfig === newConfig) {
      console.log('Nginx config is already up to date.');
      return false;
    }
  }
  
  // Write new config
  fs.writeFileSync(LOCAL_CONFIG.nginxConfigPath, newConfig, 'utf8');
  console.log(`Updated: ${LOCAL_CONFIG.nginxConfigPath}`);
  return true;
}

function copyFiles(forceUpdate = false) {
  console.log('Copying files to local site...');
  
  // Ensure sites directory exists
  if (!fs.existsSync(LOCAL_CONFIG.sitesDir)) {
    fs.mkdirSync(LOCAL_CONFIG.sitesDir, { recursive: true });
    console.log(`Created directory: ${LOCAL_CONFIG.sitesDir}`);
    forceUpdate = true; // Force update if directory didn't exist
  }
  
  // Copy HTML files from wp-output
  if (!fs.existsSync(LOCAL_CONFIG.outputDir)) {
    throw new Error('Output directory does not exist. Run builder first.');
  }
  
  const htmlFiles = fs.readdirSync(LOCAL_CONFIG.outputDir)
    .filter(file => file.endsWith('.html'));
  
  if (htmlFiles.length === 0) {
    throw new Error('No HTML files found in output directory. Run builder first.');
  }
  
  let filesChanged = false;
  
  // Copy each HTML file only if content has changed or forced
  htmlFiles.forEach(file => {
    const srcPath = path.join(LOCAL_CONFIG.outputDir, file);
    const destPath = path.join(LOCAL_CONFIG.sitesDir, file);
    
    let needsCopy = forceUpdate;
    
    // Check if file exists and content differs
    if (!needsCopy && fs.existsSync(destPath)) {
      const srcContent = fs.readFileSync(srcPath, 'utf8');
      const destContent = fs.readFileSync(destPath, 'utf8');
      needsCopy = srcContent !== destContent;
    } else if (!needsCopy) {
      needsCopy = true; // File doesn't exist, needs copy
    }
    
    if (needsCopy) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file}`);
      filesChanged = true;
    } else {
      console.log(`Skipped: ${file} (no changes)`);
    }
  });
  
  // Copy assets directory
  if (fs.existsSync(LOCAL_CONFIG.assetsDir)) {
    const assetsDestDir = path.join(LOCAL_CONFIG.sitesDir, 'assets');
    
    // Remove existing assets directory and copy fresh
    // (Assets are typically small and checking each file would be complex)
    if (fs.existsSync(assetsDestDir)) {
      fs.rmSync(assetsDestDir, { recursive: true, force: true });
    }
    
    copyDirectory(LOCAL_CONFIG.assetsDir, assetsDestDir);
    console.log('Copied: assets directory');
    filesChanged = true;
  }
  
  if (filesChanged) {
    console.log(`Deployed ${htmlFiles.length} HTML files and assets to ${LOCAL_CONFIG.sitesDir}`);
  } else {
    console.log('No file changes detected - skipped copying');
  }
  
  return filesChanged;
}

function copyDirectory(src, dest) {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function restartValet() {
  console.log('Restarting Valet...');
  try {
    execSync('valet restart', { stdio: 'pipe' });
    console.log('Valet restarted successfully');
  } catch (error) {
    console.log('Note: Could not restart Valet automatically. You may need to run:');
    console.log('  valet restart');
  }
}

function deployLocal() {
  console.log('🚀 Starting local deployment to td-testit2.test...');
  
  try {
    // Build pages first
    console.log('Building pages...');
    const { buildPages } = require('./builder.js');
    buildPages();
    console.log('✅ Pages built successfully');
    
    // Update Nginx config and check if routing changed
    const configChanged = updateNginxConfig();
    
    // Copy files (force update if config changed to ensure routing works)
    const filesChanged = copyFiles(configChanged);
    
    // Only restart Valet if config changed
    if (configChanged) {
      restartValet();
      console.log('🔄 Nginx configuration updated - Valet restarted');
    } else if (filesChanged) {
      console.log('📄 Files updated - no Valet restart needed');
    } else {
      console.log('⚡ No changes detected - deployment skipped');
    }
    
    console.log('✅ Local deployment completed successfully!');
    console.log('🌐 Site available at: https://td-testit2.test');
    
  } catch (error) {
    console.error('❌ Local deployment failed:', error.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  node deploy-local.js            Deploy to local Valet site');
    console.log('  node deploy-local.js --help     Show this help');
    console.log('');
    console.log('This script will:');
    console.log('  1. Build all static HTML pages');
    console.log('  2. Update Nginx configuration with current routes');
    console.log('  3. Copy HTML files and assets to /Users/alex/Sites/td-testit2');
    console.log('  4. Restart Valet if configuration changed');
    console.log('');
    console.log('Site will be available at: https://td-testit2.test');
    process.exit(0);
  }
  
  deployLocal();
}

module.exports = { deployLocal };