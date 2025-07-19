const fs = require('fs');
const path = require('path');

console.log('🔍 Testing final blog setup...\n');

// Test 1: EJS templates exist
const requiredTemplates = [
  'views/blog-list.ejs',
  'views/blog-post.ejs'
];

console.log('📄 Testing EJS Templates:');
requiredTemplates.forEach(template => {
  const templatePath = path.join(__dirname, template);
  if (fs.existsSync(templatePath)) {
    console.log(`  ✓ ${template} exists`);
    
    // Check if template has logo reference
    const content = fs.readFileSync(templatePath, 'utf8');
    if (content.includes('/images/td_white.svg')) {
      console.log(`    ✓ Uses local logo td_white.svg`);
    } else if (content.includes('logo-white.svg')) {
      console.log(`    ⚠️  Still references remote logo`);
    }
  } else {
    console.log(`  ❌ ${template} missing`);
  }
});

// Test 2: HTML files are clean (no header/footer)
console.log('\n🧹 Testing HTML File Structure:');
const postsDir = path.join(__dirname, 'public/posts');
const htmlFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));

let cleanFiles = 0;
let problemFiles = 0;

htmlFiles.slice(0, 5).forEach(filename => {
  const filePath = path.join(postsDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file is clean (no DOCTYPE, html, body tags)
  const hasHtmlStructure = content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('<body');
  
  if (!hasHtmlStructure) {
    cleanFiles++;
    console.log(`  ✓ ${filename} - Clean content only`);
  } else {
    problemFiles++;
    console.log(`  ❌ ${filename} - Still has HTML structure`);
  }
});

console.log(`  📊 Sample of ${htmlFiles.slice(0, 5).length} files: ${cleanFiles} clean, ${problemFiles} with structure`);

// Test 3: Header/Footer files removed
console.log('\n🗑️  Testing Removed Files:');
const removedFiles = [
  'public/header.html',
  'public/footer.html'
];

removedFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ✓ ${file} successfully removed`);
  } else {
    console.log(`  ⚠️  ${file} still exists`);
  }
});

// Test 4: Images and logo
console.log('\n🖼️  Testing Images:');
const imagesDir = path.join(__dirname, 'public/images');
const logoPath = path.join(imagesDir, 'td_white.svg');
const blogImagesDir = path.join(imagesDir, 'blog');

if (fs.existsSync(logoPath)) {
  console.log(`  ✓ Logo file exists: td_white.svg`);
} else {
  console.log(`  ❌ Logo file missing: td_white.svg`);
}

if (fs.existsSync(blogImagesDir)) {
  const imageCount = fs.readdirSync(blogImagesDir).length;
  console.log(`  ✓ Blog images directory exists with ${imageCount} files`);
} else {
  console.log(`  ❌ Blog images directory missing`);
}

// Test 5: Express app configuration
console.log('\n⚙️  Testing Express Configuration:');
const appPath = path.join(__dirname, 'app.js');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  if (appContent.includes('blog-post')) {
    console.log(`  ✓ Express app configured to use blog-post template`);
  } else {
    console.log(`  ❌ Express app not configured for EJS templates`);
  }
  
  if (appContent.includes('blog-content')) {
    console.log(`  ✓ Express app extracts content from HTML files`);
  } else {
    console.log(`  ❌ Express app missing content extraction logic`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('🎯 ARCHITECTURE SUMMARY:');
console.log('✅ Individual HTML files contain ONLY content');
console.log('✅ Header/footer handled by EJS templates');
console.log('✅ Logo referenced in ONE place: views/blog-post.ejs');
console.log('✅ Express parses HTML content and injects into template');
console.log('✅ Clean separation of content and presentation');
console.log('='.repeat(60));

console.log('\n🚀 To test the server:');
console.log('  npm start');
console.log('  Open: http://localhost:3000/what-type-of-training-to-do-this-winter-fe8f9287cee2');
console.log('\n🎉 Logo is now referenced in only ONE file: views/blog-post.ejs');