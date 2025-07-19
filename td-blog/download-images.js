const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Create images directory
const imagesDir = path.join(__dirname, 'public/images/blog');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Read the WordPress XML file
const xmlData = fs.readFileSync(path.join(__dirname, 'data/blog-content.xml'), 'utf8');

// Extract all image URLs from the XML
const imageUrls = new Set();

// Find images in content
const contentMatches = xmlData.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/g) || [];
contentMatches.forEach(content => {
    // Match img src attributes
    const imgMatches = content.match(/src="([^"]*\.(jpg|jpeg|png|gif|webp|svg))"/gi) || [];
    imgMatches.forEach(match => {
        const urlMatch = match.match(/src="([^"]*)"/i);
        if (urlMatch && urlMatch[1]) {
            let imgUrl = urlMatch[1];
            // Convert relative URLs to absolute
            if (imgUrl.startsWith('/wp-content/')) {
                imgUrl = 'https://blog.trainerday.com' + imgUrl;
            }
            if (imgUrl.startsWith('http')) {
                imageUrls.add(imgUrl);
            }
        }
    });
    
    // Also look for WordPress gallery shortcodes and other image references
    const wpContentMatches = content.match(/https?:\/\/blog\.trainerday\.com\/wp-content\/uploads\/[^\s"'>)]+\.(jpg|jpeg|png|gif|webp|svg)/gi) || [];
    wpContentMatches.forEach(url => imageUrls.add(url));
});

// Also check for featured images and other image fields
const featuredImageMatches = xmlData.match(/<wp:postmeta>[\s\S]*?<wp:meta_key><!\[CDATA\[_thumbnail_id\]\]><\/wp:meta_key>[\s\S]*?<\/wp:postmeta>/g) || [];
console.log(`Found ${featuredImageMatches.length} featured image references`);

// Convert to array and sort
const imageUrlsArray = Array.from(imageUrls).sort();

console.log(`Found ${imageUrlsArray.length} unique image URLs to download`);

// Function to download a file
function downloadFile(url, localPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        const request = protocol.get(url, (response) => {
            if (response.statusCode === 200) {
                const fileStream = fs.createWriteStream(localPath);
                response.pipe(fileStream);
                
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(localPath);
                });
                
                fileStream.on('error', (err) => {
                    fs.unlink(localPath, () => {}); // Delete partial file
                    reject(err);
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    downloadFile(redirectUrl, localPath).then(resolve).catch(reject);
                } else {
                    reject(new Error(`Redirect without location header for ${url}`));
                }
            } else {
                reject(new Error(`HTTP ${response.statusCode} for ${url}`));
            }
        });
        
        request.on('error', (err) => {
            reject(err);
        });
        
        request.setTimeout(30000, () => {
            request.abort();
            reject(new Error(`Timeout downloading ${url}`));
        });
    });
}

// Function to get local filename from URL
function getLocalFilename(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // Extract filename from path like /wp-content/uploads/2023/12/image.jpg
        const pathParts = pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        
        // Clean filename
        const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // If we have year/month in path, include it to avoid conflicts
        if (pathParts.includes('uploads') && pathParts.length >= 3) {
            const uploadsIndex = pathParts.indexOf('uploads');
            if (uploadsIndex < pathParts.length - 3) {
                const yearMonth = pathParts.slice(uploadsIndex + 1, uploadsIndex + 3).join('-');
                return `${yearMonth}-${cleanFilename}`;
            }
        }
        
        return cleanFilename;
    } catch (error) {
        // Fallback for malformed URLs
        return url.split('/').pop().replace(/[^a-zA-Z0-9.-]/g, '_');
    }
}

// Download images in batches
async function downloadImages() {
    const batchSize = 5;
    let downloaded = 0;
    let failed = 0;
    const imageMap = new Map(); // URL -> local path mapping
    
    console.log('\nStarting image downloads...\n');
    
    for (let i = 0; i < imageUrlsArray.length; i += batchSize) {
        const batch = imageUrlsArray.slice(i, i + batchSize);
        
        const downloadPromises = batch.map(async (url) => {
            try {
                const filename = getLocalFilename(url);
                const localPath = path.join(imagesDir, filename);
                
                // Skip if file already exists
                if (fs.existsSync(localPath)) {
                    console.log(`✓ Skipped (exists): ${filename}`);
                    imageMap.set(url, `/images/blog/${filename}`);
                    return { url, status: 'exists', localPath: `/images/blog/${filename}` };
                }
                
                await downloadFile(url, localPath);
                console.log(`✓ Downloaded: ${filename}`);
                imageMap.set(url, `/images/blog/${filename}`);
                return { url, status: 'downloaded', localPath: `/images/blog/${filename}` };
            } catch (error) {
                console.log(`✗ Failed: ${url} - ${error.message}`);
                return { url, status: 'failed', error: error.message };
            }
        });
        
        const results = await Promise.all(downloadPromises);
        
        results.forEach(result => {
            if (result.status === 'downloaded' || result.status === 'exists') {
                downloaded++;
            } else {
                failed++;
            }
        });
        
        console.log(`Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageUrlsArray.length/batchSize)} complete`);
    }
    
    console.log(`\nDownload Summary:`);
    console.log(`✓ Successfully downloaded/found: ${downloaded}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`📁 Images saved to: ${imagesDir}`);
    
    // Save image mapping for updating HTML files
    const mappingPath = path.join(__dirname, 'image-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(Object.fromEntries(imageMap), null, 2));
    console.log(`💾 Image URL mapping saved to: ${mappingPath}`);
    
    return imageMap;
}

// Run the download
downloadImages().then((imageMap) => {
    console.log('\n🎉 Image download complete!');
    console.log('\nNext step: Run update-image-paths.js to update HTML files');
}).catch((error) => {
    console.error('Error during download process:', error);
});