const fs = require('fs');
const path = require('path');

// Function to combine header, content, and footer into complete HTML
function buildCompletePage(contentFile, title = 'TrainerDay - Cycling App', useMinimalFooter = false) {
  const headerPath = path.join(__dirname, 'templates/header.html');
  const footerPath = useMinimalFooter 
    ? path.join(__dirname, 'templates/footer-minimal.html')
    : path.join(__dirname, 'templates/footer.html');
  const contentPath = path.join(__dirname, 'pages', contentFile);
  
  try {
    let header = fs.readFileSync(headerPath, 'utf8');
    const footer = fs.readFileSync(footerPath, 'utf8');
    const content = fs.readFileSync(contentPath, 'utf8');
    
    // Replace title placeholder
    header = header.replace('{{TITLE}}', title);
    
    return header + content + footer;
  } catch (error) {
    console.error(`Error building page: ${error.message}`);
    return null;
  }
}

// Routes configuration from server.js
const routes = {
  '/': { content: 'home-content.html', title: 'TrainerDay - Cycling App', minimal: false },
  '/privacy-policy': { content: 'privacy-content.html', title: 'Privacy Policy - TrainerDay', minimal: true },
  '/terms-and-conditions': { content: 'terms-content.html', title: 'Terms and Conditions - TrainerDay', minimal: true },
  '/contact': { content: 'contact-content.html', title: 'Contact - TrainerDay', minimal: false },
  '/pricing': { content: 'pricing-content.html', title: 'Pricing - TrainerDay', minimal: false },
  '/api': { content: 'api-content.html', title: 'API Documentation - TrainerDay', minimal: false },
  '/download': { content: 'download-content.html', title: 'Download - TrainerDay', minimal: false },
  '/coach-jack': { content: 'coach-jack-content.html', title: 'Coach Jack\'s 100% Custom Training Plans - TrainerDay', minimal: false },
  '/jetblack': { content: 'jetblack-content.html', title: 'JetBlack Partnership - 20 Free Training Sessions - TrainerDay', minimal: false },
  '/register': { content: 'register-content.html', title: 'Join TrainerDay - Free Cycling Training', minimal: false },
  '/login': { content: 'login-content.html', title: 'Sign In - TrainerDay', minimal: false },
  '/404': { content: '404-content.html', title: '404 - Page Not Found - TrainerDay', minimal: false }
};


// Function to build all pages or a specific page
function buildPages(specificRoute = null) {
  const outputDir = path.join(__dirname, 'wp-output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const routesToBuild = specificRoute ? { [specificRoute]: routes[specificRoute] } : routes;
  
  Object.entries(routesToBuild).forEach(([route, config]) => {
    if (!config) {
      console.error(`Route ${route} not found`);
      return;
    }
    
    // Skip PHP generation for login/register - use HTML forms instead
    
    const html = buildCompletePage(config.content, config.title, config.minimal);
    if (html) {
      // Create filename from route
      let filename = route === '/' ? 'index.html' : route.substring(1).replace(/\//g, '-') + '.html';
      const outputPath = path.join(outputDir, filename);
      
      fs.writeFileSync(outputPath, html, 'utf8');
      console.log(`Built: ${filename}`);
    } else {
      console.error(`Failed to build page for route: ${route}`);
    }
  });
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Building all pages...');
    buildPages();
    console.log('\nPages built in ./wp-output/ directory');
    console.log('You can now copy these complete HTML files to WordPress or any other platform.');
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Usage:');
    console.log('  node builder.js                    Build all pages');
    console.log('  node builder.js [route]            Build specific page');
    console.log('  node builder.js --list             List available routes');
    console.log('');
    console.log('Examples:');
    console.log('  node builder.js /coach-jack        Build only coach-jack page');
    console.log('  node builder.js /                  Build only home page');
  } else if (args[0] === '--list') {
    console.log('Available routes:');
    Object.keys(routes).forEach(route => {
      console.log(`  ${route}`);
    });
  } else {
    const route = args[0];
    if (routes[route]) {
      console.log(`Building page for route: ${route}`);
      buildPages(route);
      console.log(`\nPage built in ./wp-output/ directory`);
    } else {
      console.error(`Route "${route}" not found. Use --list to see available routes.`);
    }
  }
}

module.exports = { buildCompletePage, buildPages };