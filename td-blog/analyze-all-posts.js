const fs = require('fs');
const path = require('path');

// Function to extract title from filename
function extractTitleFromFilename(filename) {
    const slug = filename.replace('.html', '');
    const titlePart = slug.replace(/-[a-f0-9]{12,}$/, ''); // Remove hash suffix
    return titlePart.split('-').map(word => {
        if (word.toLowerCase() === 'ftp' || word.toLowerCase() === 'vo2max' || 
            word.toLowerCase() === 'api' || word.toLowerCase() === 'cgm' ||
            word.toLowerCase() === 'cts' || word.toLowerCase() === 'hrv' ||
            word.toLowerCase() === 'ant' || word.toLowerCase() === 'wod' ||
            word.toLowerCase() === 'zwift' || word.toLowerCase() === 'garmin') {
            return word.toUpperCase();
        }
        if (word === 'vs') return 'vs';
        if (word === 'and') return 'and';
        if (word === 'or') return 'or';
        if (word === 'the') return 'the';
        if (word === 'of') return 'of';
        if (word === 'to') return 'to';
        if (word === 'in') return 'in';
        if (word === 'for') return 'for';
        if (word === 'with') return 'with';
        if (word === 'is') return 'is';
        if (word === 'on') return 'on';
        if (word === 'your') return 'your';
        if (word === 'our') return 'our';
        if (word === 'a') return 'a';
        if (word === 'an') return 'an';
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

// Function to extract text content from HTML
function extractTextFromHTML(html) {
    return html
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

// Function to create excerpt from content
function createExcerpt(content, maxLength = 150) {
    const text = extractTextFromHTML(content);
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) + '...' : truncated + '...';
}

// Function to categorize content
function categorizeContent(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    // Check for beginner content first (most specific)
    if (text.includes('beginner') || text.includes('101') || text.includes('basics') || 
        text.includes('getting started') || text.includes('setup') || text.includes('introduction') ||
        text.includes('indoor cycling 101') || text.includes('for beginners')) {
        return 'Beginner';
    }
    
    // Check for training content (physiological/performance focus)
    if (text.includes('training') || text.includes('ftp') || text.includes('zone') ||
        text.includes('interval') || text.includes('periodization') || text.includes('performance') ||
        text.includes('aerobic') || text.includes('anaerobic') || text.includes('threshold') ||
        text.includes('vo2max') || text.includes('polarized') || text.includes('coach jack') ||
        text.includes('power meter') || text.includes('heart rate training') ||
        text.includes('recovery') || text.includes('winter training') || text.includes('outdoor') ||
        text.includes('plan') || text.includes('cycling training') || text.includes('endurance') ||
        text.includes('w\'') || text.includes('ramp test') || text.includes('structured') ||
        text.includes('lactate') || text.includes('base') || text.includes('build') ||
        text.includes('insulin') || text.includes('calories') || text.includes('adaptation')) {
        return 'Training';
    }
    
    // Check for features content (technical/app functionality)
    if (text.includes('feature') || text.includes('new features') || text.includes('integration') ||
        text.includes('sync') || text.includes('calendar') || text.includes('connect') ||
        text.includes('export') || text.includes('import') || text.includes('login') || 
        text.includes('api') || text.includes('developer') || text.includes('mobile app') ||
        text.includes('workout editor') || text.includes('library') || text.includes('tagging') ||
        text.includes('platform') || text.includes('zwift workouts') || text.includes('garmin send') ||
        text.includes('trainingpeaks') || text.includes('bulk delete') || text.includes('big screen') ||
        text.includes('slopes') || text.includes('route') || text.includes('swimerg') ||
        text.includes('rowerg') || text.includes('wahoo elemnt')) {
        return 'Features';
    }
    
    // Default to Training for cycling-related content
    return 'Training';
}

// Function to determine difficulty
function determineDifficulty(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('advanced') || text.includes('w\'bal') || text.includes('wbal') ||
        text.includes('critical power') || text.includes('polarized') || text.includes('anaerobic') ||
        text.includes('periodization') || text.includes('vo2max') || text.includes('lactate')) {
        return 'advanced';
    }
    
    if (text.includes('beginner') || text.includes('101') || text.includes('basics') ||
        text.includes('getting started') || text.includes('setup') || text.includes('introduction') ||
        text.includes('simple')) {
        return 'beginner';
    }
    
    return 'intermediate';
}

// Function to generate tags
function generateTags(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    const tags = new Set();
    
    // Training concepts
    if (text.includes('zone 2') || text.includes('zone2')) tags.add('zone2');
    if (text.includes('ftp')) tags.add('ftp');
    if (text.includes('threshold')) tags.add('threshold');
    if (text.includes('interval')) tags.add('intervals');
    if (text.includes('vo2max') || text.includes('vo2')) tags.add('vo2max');
    if (text.includes('aerobic')) tags.add('aerobic');
    if (text.includes('anaerobic')) tags.add('anaerobic');
    if (text.includes('endurance')) tags.add('endurance');
    if (text.includes('polarized')) tags.add('polarized');
    if (text.includes('heart rate') || text.includes('heart-rate')) tags.add('heart-rate');
    if (text.includes('power')) tags.add('power');
    if (text.includes('base') && text.includes('build')) tags.add('base-building');
    if (text.includes('periodization')) tags.add('periodization');
    if (text.includes('recovery')) tags.add('recovery');
    if (text.includes('ramp test')) tags.add('ramp-test');
    if (text.includes('lactate')) tags.add('lactate-threshold');
    if (text.includes('w\'') || text.includes('w-prime') || text.includes('wbal')) tags.add('w-prime');
    if (text.includes('critical power')) tags.add('critical-power');
    if (text.includes('80/20') || text.includes('80-20')) tags.add('80-20');
    if (text.includes('winter')) tags.add('winter-training');
    if (text.includes('outdoor')) tags.add('outdoor');
    if (text.includes('structured')) tags.add('structured');
    
    // Equipment and platforms
    if (text.includes('smart trainer') || text.includes('smart-trainer')) tags.add('smart-trainer');
    if (text.includes('garmin')) tags.add('garmin');
    if (text.includes('zwift')) tags.add('zwift');
    if (text.includes('trainingpeaks')) tags.add('trainingpeaks');
    if (text.includes('trainerroad')) tags.add('trainerroad');
    if (text.includes('wahoo')) tags.add('wahoo');
    if (text.includes('bluetooth')) tags.add('bluetooth');
    if (text.includes('ant+') || text.includes('ant plus')) tags.add('ant+');
    if (text.includes('indoor')) tags.add('indoor');
    if (text.includes('mobile')) tags.add('mobile-app');
    if (text.includes('calendar')) tags.add('calendar');
    if (text.includes('sync')) tags.add('sync');
    if (text.includes('integration')) tags.add('integration');
    if (text.includes('export')) tags.add('export');
    if (text.includes('import')) tags.add('import');
    
    // Skill levels
    if (text.includes('beginner')) tags.add('beginner');
    if (text.includes('intermediate')) tags.add('intermediate');  
    if (text.includes('advanced')) tags.add('advanced');
    
    // Features and functionality
    if (text.includes('coach jack')) tags.add('coach-jack');
    if (text.includes('workout') && !text.includes('workout editor')) tags.add('workouts');
    if (text.includes('workout editor')) tags.add('workout-editor');
    if (text.includes('plans') || text.includes('training plan')) tags.add('training-plans');
    if (text.includes('library')) tags.add('library');
    if (text.includes('tag')) tags.add('tagging');
    if (text.includes('route')) tags.add('routes');
    if (text.includes('slope')) tags.add('slopes');
    if (text.includes('review')) tags.add('review');
    if (text.includes('setup')) tags.add('setup');
    if (text.includes('api')) tags.add('api');
    if (text.includes('developer')) tags.add('developer');
    
    // Specific topics
    if (text.includes('insulin') || text.includes('cgm')) tags.add('nutrition');
    if (text.includes('ankle')) tags.add('off-season');
    if (text.includes('calories')) tags.add('weight-loss');
    if (text.includes('coach') && !text.includes('coach jack')) tags.add('coaching');
    if (text.includes('swimerg') || text.includes('rowerg')) tags.add('cross-training');
    if (text.includes('roll')) tags.add('rollers');
    if (text.includes('speed') && text.includes('distance')) tags.add('metrics');
    
    return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

// Main processing function
function processAllPosts() {
    const postsDir = '/Users/alex/Documents/Projects/marketing/td-blog/public/posts';
    const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.html'));
    
    console.log(`Processing ${files.length} HTML files...`);
    
    const posts = [];
    const allTags = new Set();
    
    files.forEach((file, index) => {
        try {
            const filePath = path.join(postsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            const title = extractTitleFromFilename(file);
            const slug = file.replace('.html', '');
            const excerpt = createExcerpt(content);
            const category = categorizeContent(title, content);
            const difficulty = determineDifficulty(title, content);
            const tags = generateTags(title, content);
            
            // Add tags to global set
            tags.forEach(tag => allTags.add(tag));
            
            posts.push({
                title,
                slug,
                excerpt,
                category,
                difficulty,
                tags
            });
            
            console.log(`${index + 1}/${files.length}: ${title}`);
            
        } catch (error) {
            console.error(`Error processing ${file}:`, error.message);
        }
    });
    
    // Create final search index
    const searchIndex = {
        posts: posts.sort((a, b) => a.title.localeCompare(b.title)),
        tags: Array.from(allTags).sort(),
        categories: ["Training", "Features", "Beginner"],
        difficulties: ["beginner", "intermediate", "advanced"]
    };
    
    // Write the search index
    const outputPath = '/Users/alex/Documents/Projects/marketing/td-blog/public/search-index-complete.json';
    fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2));
    
    console.log(`\\nCompleted! Generated search index with ${posts.length} posts and ${allTags.size} unique tags.`);
    console.log(`Output saved to: ${outputPath}`);
    
    // Show statistics
    const categoryStats = {};
    const difficultyStats = {};
    
    posts.forEach(post => {
        categoryStats[post.category] = (categoryStats[post.category] || 0) + 1;
        difficultyStats[post.difficulty] = (difficultyStats[post.difficulty] || 0) + 1;
    });
    
    console.log('\\nCategory breakdown:');
    Object.entries(categoryStats).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} posts`);
    });
    
    console.log('\\nDifficulty breakdown:');
    Object.entries(difficultyStats).forEach(([diff, count]) => {
        console.log(`  ${diff}: ${count} posts`);
    });
    
    return searchIndex;
}

// Run the processing
if (require.main === module) {
    processAllPosts();
}

module.exports = { processAllPosts };