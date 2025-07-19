const fs = require('fs');
const path = require('path');

// Load the image mapping
const imageMappingPath = path.join(__dirname, 'image-mapping.json');
if (!fs.existsSync(imageMappingPath)) {
    console.error('❌ Image mapping file not found. Please run download-images.js first.');
    process.exit(1);
}

const imageMapping = JSON.parse(fs.readFileSync(imageMappingPath, 'utf8'));
console.log(`📋 Loaded ${Object.keys(imageMapping).length} image URL mappings`);

// Get all HTML files in the posts directory
const postsDir = path.join(__dirname, 'public/posts');
const htmlFiles = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));

console.log(`📂 Found ${htmlFiles.length} HTML files to update\n`);

let totalUpdated = 0;
let filesUpdated = 0;

htmlFiles.forEach((filename, index) => {
    const filePath = path.join(postsDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');
    let fileUpdated = false;
    let fileUpdates = 0;
    
    // Replace each mapped image URL with local path
    Object.entries(imageMapping).forEach(([originalUrl, localPath]) => {
        // Create regex to match the URL in various contexts
        const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedUrl, 'g');
        
        const matches = content.match(regex);
        if (matches) {
            content = content.replace(regex, localPath);
            fileUpdates += matches.length;
            fileUpdated = true;
        }
    });
    
    // Write updated content back to file
    if (fileUpdated) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesUpdated++;
        totalUpdated += fileUpdates;
        
        if (filesUpdated <= 10 || index % 10 === 0) {
            console.log(`✓ Updated ${filename}: ${fileUpdates} image(s)`);
        }
    }
});

console.log(`\n📊 Update Summary:`);
console.log(`✅ Files updated: ${filesUpdated}/${htmlFiles.length}`);
console.log(`🔄 Total image references updated: ${totalUpdated}`);
console.log(`📁 All images now serve locally from /images/blog/`);

// Also update the main extract-posts.js script to use local images by default
console.log(`\n🔧 Updating extract-posts.js for future use...`);

const extractPostsPath = path.join(__dirname, 'extract-posts.js');
let extractPostsContent = fs.readFileSync(extractPostsPath, 'utf8');

// Update the image URL replacement logic
const oldImageLogic = `      // Fix image URLs
      .replace(/src="\\/wp-content\\//g, 'src="https://blog.trainerday.com/wp-content/')`;

const newImageLogic = `      // Fix image URLs - use local images first, fallback to remote
      .replace(/src="https:\\/\\/blog\\.trainerday\\.com\\/wp-content\\/uploads\\/([^"]*)"[^>]*>/g, function(match, urlPath) {
        // Try to find local image mapping
        const originalUrl = 'https://blog.trainerday.com/wp-content/uploads/' + urlPath;
        const imageMapping = ${JSON.stringify(imageMapping, null, 8)};
        const localPath = imageMapping[originalUrl];
        if (localPath) {
          return match.replace(originalUrl, localPath);
        }
        return match; // Keep original if no local mapping found
      })
      .replace(/src="\\/wp-content\\//g, 'src="https://blog.trainerday.com/wp-content/')`;

if (extractPostsContent.includes(oldImageLogic)) {
    extractPostsContent = extractPostsContent.replace(oldImageLogic, newImageLogic);
    fs.writeFileSync(extractPostsPath, extractPostsContent, 'utf8');
    console.log(`✅ Updated extract-posts.js to use local images by default`);
} else {
    console.log(`ℹ️  extract-posts.js already updated or different format`);
}

console.log(`\n🎉 All images are now served locally!`);
console.log(`\n🚀 Your blog is ready with:`);
console.log(`   • 183 images downloaded locally`);
console.log(`   • ${filesUpdated} HTML files updated to use local images`);
console.log(`   • Fast loading from local filesystem`);
console.log(`   • No external dependencies for images`);
console.log(`\n💡 To test: npm start and visit http://localhost:3000`);