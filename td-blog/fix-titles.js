#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SEARCH_INDEX_PATH = path.join(__dirname, 'public', 'search-index.json');
const POSTS_DIR = path.join(__dirname, 'public', 'posts');

// Function to clean up malformed titles
function cleanTitle(title) {
  // Remove file extension patterns like .html, .md
  title = title.replace(/\.(html|md)$/i, '');
  
  // Remove hash-like suffixes (letters/numbers after dash)
  title = title.replace(/[-_][a-f0-9]{8,}$/i, '');
  
  // Convert dashes and underscores to spaces
  title = title.replace(/[-_]/g, ' ');
  
  // Capitalize each word properly
  title = title.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Fix common abbreviations and terms
  const corrections = {
    'Ftp': 'FTP',
    'Api': 'API',
    'Apis': 'APIs',
    'Vo2max': 'VO2max',
    'Vo2Max': 'VO2max',
    'Hrv': 'HRV',
    'Cgm': 'CGM',
    'Zwift': 'Zwift',
    'Garmin': 'Garmin',
    'Wahoo': 'Wahoo',
    'Trainerday': 'TrainerDay',
    'Trainingpeaks': 'TrainingPeaks',
    'Trainerroad': 'TrainerRoad',
    'Wbal': 'W\'bal',
    'W Prime': 'W\'',
    'Cts': 'CTS',
    'Ergdb': 'ERGdb'
  };
  
  Object.keys(corrections).forEach(wrong => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    title = title.replace(regex, corrections[wrong]);
  });
  
  return title;
}

// Function to add h1 title to HTML file if missing
function addTitleToHtml(filePath, title) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if h1 already exists
    if (content.includes('<h1')) {
      console.log(`H1 already exists in ${path.basename(filePath)}`);
      return;
    }
    
    // Add h1 title at the beginning of content
    const titleHtml = `<h1>${title}</h1>\n`;
    content = titleHtml + content;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Added h1 title "${title}" to ${path.basename(filePath)}`);
    
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

// Main function
function fixTitles() {
  console.log('🔧 Fixing blog post titles...');
  
  try {
    // Read search index
    const searchIndex = JSON.parse(fs.readFileSync(SEARCH_INDEX_PATH, 'utf8'));
    
    let updatedCount = 0;
    
    // Fix titles in search index and corresponding HTML files
    searchIndex.posts.forEach(post => {
      const originalTitle = post.title;
      const cleanedTitle = cleanTitle(originalTitle);
      
      if (originalTitle !== cleanedTitle) {
        console.log(`Updating title: "${originalTitle}" → "${cleanedTitle}"`);
        post.title = cleanedTitle;
        updatedCount++;
      }
      
      // Add h1 title to HTML file
      const htmlPath = path.join(POSTS_DIR, post.slug + '.html');
      if (fs.existsSync(htmlPath)) {
        addTitleToHtml(htmlPath, cleanedTitle);
      }
    });
    
    // Write updated search index
    fs.writeFileSync(SEARCH_INDEX_PATH, JSON.stringify(searchIndex, null, 2), 'utf8');
    
    console.log(`✅ Fixed ${updatedCount} titles in search index`);
    console.log(`✅ Added h1 tags to HTML files`);
    
  } catch (error) {
    console.error('❌ Error fixing titles:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixTitles();
}

module.exports = { fixTitles, cleanTitle };