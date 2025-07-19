const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets (CSS, images, JS)
app.use('/assets', express.static(path.join(__dirname, 'pages/assets')));

// Function to combine header, content, and footer
function buildPage(contentFile, title = 'TrainerDay - Cycling App', useMinimalFooter = false) {
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

// Clean URL routes mapping to content files, titles, and footer type
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
  '/zone2': { content: 'zone2-content.html', title: 'Zone 2 - TrainerDay - Indoor Cycling', minimal: false },
  '/register': { content: 'register-content.html', title: 'Join TrainerDay - Free Cycling Training', minimal: false },
  '/login': { content: 'login-content.html', title: 'Sign In - TrainerDay', minimal: false },
  '/404': { content: '404-content.html', title: '404 - Page Not Found - TrainerDay', minimal: false }
};


// Set up routes
Object.entries(routes).forEach(([route, config]) => {
  app.get(route, (req, res) => {
    const html = buildPage(config.content, config.title, config.minimal);
    if (html) {
      res.send(html);
    } else {
      res.status(500).send('Error building page');
    }
  });
  
  // Also handle routes with trailing slash
  if (route !== '/') {
    app.get(route + '/', (req, res) => {
      const html = buildPage(config.content, config.title, config.minimal);
      if (html) {
        res.send(html);
      } else {
        console.log(err);
        res.status(500).send('Error building page');
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Available routes:');
  Object.keys(routes).forEach(route => {
    console.log(`  http://localhost:${PORT}${route}`);
  });
});