#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const XML_PATH = path.join(__dirname, 'data', 'blog-content.xml');
const SEARCH_INDEX_PATH = path.join(__dirname, 'public', 'search-index.json');
const POSTS_DIR = path.join(__dirname, 'public', 'posts');

function extractTitlesFromXML() {
  console.log('📖 Extracting proper titles and dates from WordPress XML...');
  
  try {
    const xmlContent = fs.readFileSync(XML_PATH, 'utf8');
    
    // Parse WordPress XML to extract titles, slugs, and dates
    const postDataMap = new Map();
    
    // Regex to match WordPress items with title and post_name
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlContent)) !== null) {
      const itemContent = match[1];
      
      // Extract title
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      if (!titleMatch) continue;
      
      const title = titleMatch[1].trim();
      
      // Extract post_name (which becomes the slug)
      const slugMatch = itemContent.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/);
      if (!slugMatch) continue;
      
      const slug = slugMatch[1].trim();
      
      // Extract post date
      const dateMatch = itemContent.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/);
      const postDate = dateMatch ? dateMatch[1].trim() : null;
      
      // Only include actual blog posts (not images or attachments)
      const postTypeMatch = itemContent.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/);
      if (!postTypeMatch || postTypeMatch[1] !== 'post') continue;
      
      // Skip empty titles or image titles
      if (!title || title.length < 3 || /^[a-zA-Z0-9_-]+$/.test(title)) continue;
      
      postDataMap.set(slug, { title, date: postDate });
      console.log(`Found: "${title}" -> ${slug} (${postDate})`);
    }
    
    console.log(`✅ Extracted ${postDataMap.size} proper titles and dates from XML`);
    return postDataMap;
    
  } catch (error) {
    console.error('❌ Error reading XML:', error.message);
    return new Map();
  }
}

function updateSearchIndexWithProperTitles(postDataMap) {
  console.log('🔄 Updating search index with proper titles and dates...');
  
  try {
    const searchIndex = JSON.parse(fs.readFileSync(SEARCH_INDEX_PATH, 'utf8'));
    let updatedCount = 0;
    
    searchIndex.posts.forEach(post => {
      const postData = postDataMap.get(post.slug);
      if (postData) {
        let updated = false;
        
        // Update title if different
        if (postData.title && postData.title !== post.title) {
          console.log(`Updating title: "${post.title}" -> "${postData.title}"`);
          post.title = postData.title;
          updated = true;
          
          // Also update the HTML file
          const htmlPath = path.join(POSTS_DIR, post.slug + '.html');
          if (fs.existsSync(htmlPath)) {
            updateHtmlTitle(htmlPath, postData.title);
          }
        }
        
        // Add date if not present
        if (postData.date && !post.date) {
          console.log(`Adding date: ${post.slug} -> ${postData.date}`);
          post.date = postData.date;
          updated = true;
        }
        
        if (updated) updatedCount++;
      }
    });
    
    // Sort posts by date (newest first)
    searchIndex.posts.sort((a, b) => {
      const dateA = new Date(a.date || '1970-01-01');
      const dateB = new Date(b.date || '1970-01-01');
      return dateB - dateA; // Newest first
    });
    
    // Write updated search index
    fs.writeFileSync(SEARCH_INDEX_PATH, JSON.stringify(searchIndex, null, 2), 'utf8');
    
    console.log(`✅ Updated ${updatedCount} posts with titles/dates and sorted by date`);
    
  } catch (error) {
    console.error('❌ Error updating search index:', error.message);
  }
}

function updateHtmlTitle(htmlPath, title) {
  try {
    let content = fs.readFileSync(htmlPath, 'utf8');
    
    // Replace existing h1 title
    const h1Regex = /<h1>.*?<\/h1>/;
    if (h1Regex.test(content)) {
      content = content.replace(h1Regex, `<h1>${title}</h1>`);
    } else {
      // Add h1 title at the beginning if not exists
      content = `<h1>${title}</h1>\n` + content;
    }
    
    fs.writeFileSync(htmlPath, content, 'utf8');
    console.log(`Updated HTML title: ${path.basename(htmlPath)}`);
    
  } catch (error) {
    console.error(`Error updating ${htmlPath}:`, error.message);
  }
}

// Main function
function main() {
  console.log('🚀 Extracting proper titles and dates from WordPress XML export...');
  
  const postDataMap = extractTitlesFromXML();
  
  if (postDataMap.size > 0) {
    updateSearchIndexWithProperTitles(postDataMap);
    console.log('✅ Title and date extraction completed!');
  } else {
    console.log('❌ No post data found in XML file');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractTitlesFromXML, updateSearchIndexWithProperTitles };