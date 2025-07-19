#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SEARCH_INDEX_PATH = path.join(__dirname, 'public', 'search-index.json');
const SITEMAP_PATH = path.join(__dirname, 'public', 'sitemap.xml');

function generateSitemap() {
  console.log('🗺️  Generating sitemap.xml from search index...');
  
  try {
    // Read search index
    const searchIndex = JSON.parse(fs.readFileSync(SEARCH_INDEX_PATH, 'utf8'));
    
    const baseUrl = 'https://blog.trainerday.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Start XML structure
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;

    // Add blog posts
    searchIndex.posts.forEach(post => {
      // Convert WordPress date to ISO format for lastmod
      let lastmod = currentDate; // fallback
      if (post.date) {
        try {
          const postDate = new Date(post.date);
          lastmod = postDate.toISOString().split('T')[0];
        } catch (e) {
          console.warn(`Invalid date for ${post.slug}: ${post.date}`);
        }
      }
      
      // Determine priority based on category and recency
      let priority = '0.7'; // default
      if (post.category === 'Beginner') priority = '0.8';
      if (post.category === 'Features') priority = '0.9';
      
      // Higher priority for recent posts (within last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (post.date && new Date(post.date) > sixMonthsAgo) {
        priority = Math.min(parseFloat(priority) + 0.1, 1.0).toString();
      }
      
      sitemap += `  <url>
    <loc>${baseUrl}/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>
`;
    });
    
    // Close XML structure
    sitemap += `</urlset>`;
    
    // Write sitemap file
    fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
    
    console.log(`✅ Sitemap generated successfully!`);
    console.log(`📊 URLs included:`);
    console.log(`   - Homepage: 1`);
    console.log(`   - Blog posts: ${searchIndex.posts.length}`);
    console.log(`   - Total URLs: ${searchIndex.posts.length + 1}`);
    console.log(`📝 Saved to: ${SITEMAP_PATH}`);
    
    // Generate robots.txt if it doesn't exist
    generateRobotsTxt();
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error.message);
    process.exit(1);
  }
}

function generateRobotsTxt() {
  const robotsPath = path.join(__dirname, 'public', 'robots.txt');
  
  if (!fs.existsSync(robotsPath)) {
    console.log('🤖 Generating robots.txt...');
    
    const robotsContent = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://blog.trainerday.com/sitemap.xml

# Block common bot paths
Disallow: /node_modules/
Disallow: /.git/
Disallow: /package.json
Disallow: /package-lock.json
`;

    fs.writeFileSync(robotsPath, robotsContent, 'utf8');
    console.log('✅ robots.txt generated successfully!');
  } else {
    console.log('ℹ️  robots.txt already exists, skipping...');
  }
}

// Run if called directly
if (require.main === module) {
  generateSitemap();
}

module.exports = { generateSitemap };