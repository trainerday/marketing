const fs = require('fs');
const path = require('path');

// Get all HTML files in posts directory
const postsDir = path.join(__dirname, 'public/posts');
const htmlFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));

console.log(`🧹 Cleaning ${htmlFiles.length} HTML files to remove header/footer...`);

let cleaned = 0;

htmlFiles.forEach((filename, index) => {
  const filePath = path.join(postsDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  
  try {
    // Extract just the blog content section
    const contentMatch = content.match(/<div class="blog-content"[^>]*>([\s\S]*?)<\/div>/);
    
    if (contentMatch) {
      const cleanContent = contentMatch[1];
      
      // Write only the content without header/footer
      fs.writeFileSync(filePath, cleanContent.trim(), 'utf8');
      cleaned++;
      
      if (cleaned <= 5 || index % 10 === 0) {
        console.log(`✓ Cleaned ${filename}`);
      }
    } else {
      console.log(`⚠️  Could not extract content from ${filename}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning ${filename}:`, error.message);
  }
});

console.log(`\n📊 Cleaning Summary:`);
console.log(`✅ Files cleaned: ${cleaned}/${htmlFiles.length}`);
console.log(`🎯 HTML files now contain only pure content`);
console.log(`📝 Header/footer will be provided by EJS template`);

console.log(`\n🔧 Next: Update extract-posts.js for future posts...`);

// Update extract-posts.js to generate clean content files
const extractPostsPath = path.join(__dirname, 'extract-posts.js');
let extractContent = fs.readFileSync(extractPostsPath, 'utf8');

// Find and replace the HTML generation section
const oldHtmlGeneration = /const htmlContent = `\${header}[\s\S]*?\${footerTemplate}`;/;

const newHtmlGeneration = `// Generate only the content (no header/footer)
    const cleanContent = content
      // Add some basic styling for standalone content
      .replace(/<h2>/g, '<h2 style="color: #ffffff; font-size: 1.8rem; font-weight: 600; margin: 30px 0 15px 0;">')
      .replace(/<h3>/g, '<h3 style="color: #ffffff; font-size: 1.4rem; font-weight: 600; margin: 25px 0 10px 0;">')
      .replace(/<p>/g, '<p style="color: var(--light-background); line-height: 1.6; margin-bottom: 15px;">')
      .replace(/<ul>/g, '<ul style="color: var(--light-background); line-height: 1.6; margin-bottom: 15px; padding-left: 20px;">')
      .replace(/<ol>/g, '<ol style="color: var(--light-background); line-height: 1.6; margin-bottom: 15px; padding-left: 20px;">')
      .replace(/<li>/g, '<li style="margin-bottom: 5px;">')
      .replace(/<a /g, '<a style="color: var(--primary-red); text-decoration: underline;" ')
      .replace(/<img /g, '<img style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;" ');`;

if (extractContent.match(oldHtmlGeneration)) {
  extractContent = extractContent.replace(oldHtmlGeneration, newHtmlGeneration);
  
  // Also update the file write section
  extractContent = extractContent.replace(
    /fs\.writeFileSync\(filePath, htmlContent, 'utf8'\);/,
    'fs.writeFileSync(filePath, cleanContent.trim(), \'utf8\');'
  );
  
  fs.writeFileSync(extractPostsPath, extractContent, 'utf8');
  console.log(`✅ Updated extract-posts.js to generate clean content files`);
} else {
  console.log(`ℹ️  extract-posts.js structure has changed, manual update needed`);
}

console.log(`\n🎉 All HTML files are now clean content only!`);
console.log(`🔄 Header/footer/navigation handled by EJS template`);
console.log(`📍 Logo reference centralized in blog-post.ejs template`);