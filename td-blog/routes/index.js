var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router();

// Load blog post data
let blogPosts = [];
try {
  const xmlData = fs.readFileSync(path.join(__dirname, '../data/blog-content.xml'), 'utf8');
  // Basic XML parsing for blog posts - this could be enhanced with a proper XML parser
  const postMatches = xmlData.match(/<item>[\s\S]*?<\/item>/g) || [];
  
  blogPosts = postMatches.map(post => {
    const titleMatch = post.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = post.match(/<link>(.*?)<\/link>/);
    const dateMatch = post.match(/<pubDate>(.*?)<\/pubDate>/);
    const statusMatch = post.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/);
    const contentMatch = post.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    
    if (titleMatch && linkMatch && statusMatch && statusMatch[1] === 'publish') {
      const url = linkMatch[1].replace('https://blog.trainerday.com', '');
      const excerpt = contentMatch ? contentMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) + '...' : '';
      
      return {
        title: titleMatch[1],
        url: url,
        date: dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : '',
        excerpt: excerpt
      };
    }
    return null;
  }).filter(post => post !== null).sort((a, b) => new Date(b.date) - new Date(a.date));
} catch (error) {
  console.error('Error parsing blog posts:', error);
}

/* GET home page / blog list. */
router.get('/', function(req, res, next) {
  res.render('blog-list', { 
    title: 'TrainerDay Blog - For the obsessed cyclist',
    posts: blogPosts
  });
});

/* GET blog page (alias for home). */
router.get('/blog', function(req, res, next) {
  res.render('blog-list', { 
    title: 'TrainerDay Blog - For the obsessed cyclist',
    posts: blogPosts
  });
});

module.exports = router;
