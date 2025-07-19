#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SEARCH_INDEX_PATH = path.join(__dirname, 'public', 'search-index.json');

function validateSearchIndex() {
  console.log('🔍 Validating search-index.json...');
  
  try {
    // Check if file exists
    if (!fs.existsSync(SEARCH_INDEX_PATH)) {
      throw new Error(`Search index file not found at: ${SEARCH_INDEX_PATH}`);
    }
    
    // Read and parse JSON
    const content = fs.readFileSync(SEARCH_INDEX_PATH, 'utf8');
    const data = JSON.parse(content);
    
    // Validate structure
    if (!data.posts || !Array.isArray(data.posts)) {
      throw new Error('Missing or invalid "posts" array');
    }
    
    if (!data.tags || !Array.isArray(data.tags)) {
      throw new Error('Missing or invalid "tags" array');
    }
    
    if (!data.categories || !Array.isArray(data.categories)) {
      throw new Error('Missing or invalid "categories" array');
    }
    
    if (!data.difficulties || !Array.isArray(data.difficulties)) {
      throw new Error('Missing or invalid "difficulties" array');
    }
    
    // Validate each post has required fields
    const requiredFields = ['title', 'slug', 'excerpt', 'category', 'difficulty', 'tags'];
    data.posts.forEach((post, index) => {
      requiredFields.forEach(field => {
        if (!post[field]) {
          throw new Error(`Post ${index} missing required field: ${field}`);
        }
      });
      
      if (!Array.isArray(post.tags)) {
        throw new Error(`Post ${index} "tags" must be an array`);
      }
      
      // Check for empty strings in tags
      post.tags.forEach((tag, tagIndex) => {
        if (typeof tag !== 'string' || tag.trim() === '') {
          throw new Error(`Post ${index} has empty tag at index ${tagIndex}`);
        }
      });
      
      // Validate difficulty is one of the allowed values
      if (!data.difficulties.includes(post.difficulty)) {
        throw new Error(`Post ${index} has invalid difficulty: ${post.difficulty}`);
      }
      
      // Validate category is one of the allowed values  
      if (!data.categories.includes(post.category)) {
        throw new Error(`Post ${index} has invalid category: ${post.category}`);
      }
    });
    
    // Check for duplicate difficulty levels in individual post tags
    data.posts.forEach((post, index) => {
      const hasDifficultyInTags = post.tags.some(tag => 
        data.difficulties.includes(tag.toLowerCase())
      );
      if (hasDifficultyInTags) {
        throw new Error(`Post ${index} has difficulty level duplicated in tags: ${post.tags.filter(tag => data.difficulties.includes(tag.toLowerCase())).join(', ')}`);
      }
    });
    
    console.log(`✅ Search index validation passed!`);
    console.log(`   📊 Posts: ${data.posts.length}`);
    console.log(`   🏷️  Tags: ${data.tags.length}`);
    console.log(`   📂 Categories: ${data.categories.length}`);
    console.log(`   📈 Difficulties: ${data.difficulties.length}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Search index validation failed:`);
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateSearchIndex();
}

module.exports = { validateSearchIndex };