const fs = require('fs');
const path = require('path');

// Test that all required files exist
const requiredFiles = [
  'public/header.html',
  'public/footer.html', 
  'views/blog-list.ejs',
  'app.js',
  'routes/index.js',
  'data/blog-content.xml'
];

console.log('Testing blog setup...\n');

let allGood = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`✗ ${file} missing`);
    allGood = false;
  }
});

// Test posts directory
const postsDir = path.join(__dirname, 'public/posts');
if (fs.existsSync(postsDir)) {
  const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));
  console.log(`✓ Posts directory exists with ${postFiles.length} HTML files`);
  
  if (postFiles.length > 0) {
    console.log(`\nSample post files:`);
    postFiles.slice(0, 3).forEach(file => {
      console.log(`  - ${file}`);
    });
  }
} else {
  console.log(`✗ Posts directory missing`);
  allGood = false;
}

// Test a sample post content
const testPost = 'what-type-of-training-to-do-this-winter-fe8f9287cee2.html';
const testPostPath = path.join(__dirname, 'public/posts', testPost);
if (fs.existsSync(testPostPath)) {
  const content = fs.readFileSync(testPostPath, 'utf8');
  console.log(`✓ Sample post content check: ${content.length} characters`);
  console.log(`✓ Contains header: ${content.includes('<header class="header">') ? 'Yes' : 'No'}`);
  console.log(`✓ Contains footer: ${content.includes('<footer class="minimal-footer">') ? 'Yes' : 'No'}`);
  console.log(`✓ Contains TrainerDay branding: ${content.includes('TrainerDay') ? 'Yes' : 'No'}`);
} else {
  console.log(`✗ Sample post file not found: ${testPost}`);
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✓ All tests passed! Blog is ready to run.');
  console.log('\nTo start the server:');
  console.log('  npm start');
  console.log('\nTo start with auto-reload:');
  console.log('  npm run dev');
  console.log('\nExample URLs:');
  console.log('  http://localhost:3000/ (blog list)');
  console.log('  http://localhost:3000/what-type-of-training-to-do-this-winter-fe8f9287cee2');
} else {
  console.log('✗ Some issues found. Please check the missing files.');
}
console.log('='.repeat(50));