# TrainerDay Blog - Express Application

A lightweight Express.js blog application converted from WordPress, featuring URL rewriting and local image hosting. Maintains all existing URLs while providing fast, standalone hosting with TrainerDay brand styling.

## ✨ Features

- **URL Rewriting**: Maps WordPress URLs to static HTML files
- **Local Images**: All 183 blog images downloaded and served locally
- **TrainerDay Branding**: Consistent styling with brand colors and typography
- **Mobile Responsive**: Works perfectly on all devices
- **Fast Loading**: Static HTML files with no database dependencies
- **SEO Friendly**: Proper meta tags and structured content

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Start the Server
```bash
npm start          # Production server (port 3000)
npm run dev        # Development with auto-reload
```

### Blog Setup (if needed)
```bash
npm run setup-blog # Extract posts, download images, update paths
```

## 📁 Project Structure

```
td-blog/
├── app.js                 # Express app with content parsing & EJS rendering
├── routes/index.js        # Blog list and routing logic
├── views/
│   ├── blog-list.ejs      # Blog homepage template
│   └── blog-post.ejs      # Individual blog post template
├── public/
│   ├── stylesheets/       # TrainerDay brand CSS
│   ├── posts/             # 77 clean HTML content files (no header/footer)
│   └── images/
│       ├── td_white.svg   # TrainerDay logo
│       └── blog/          # 183 downloaded blog images
├── data/
│   └── blog-content.xml   # WordPress export file
└── scripts/
    ├── extract-posts.js   # Convert XML to clean HTML content
    ├── download-images.js # Download all images
    ├── update-image-paths.js # Update HTML to use local images
    └── clean-html-files.js # Remove header/footer from HTML files
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm run extract-posts` | Convert WordPress XML to clean HTML content files |
| `npm run download-images` | Download all images from WordPress |
| `npm run update-images` | Update HTML files to use local images |
| `npm run clean-html` | Remove header/footer from HTML files |
| `npm run setup-blog` | Run all setup steps (extract + download + update + clean) |

## 🌐 URL Structure

The application maintains the exact WordPress URL structure:

### Original WordPress URLs
```
https://blog.trainerday.com/what-type-of-training-to-do-this-winter-fe8f9287cee2
https://blog.trainerday.com/the-ultimate-way-zone-2-training-cef54a104bee
```

### Express App URLs (localhost)
```
http://localhost:3000/what-type-of-training-to-do-this-winter-fe8f9287cee2
http://localhost:3000/the-ultimate-way-zone-2-training-cef54a104bee
```

### Special URLs
- `/` or `/blog` - Blog list page with all posts
- Any WordPress post slug automatically serves corresponding HTML file

## 🎨 TrainerDay Brand Colors

The application uses the official TrainerDay color palette:

```css
--marketing-black: #000000     /* Headers & banners */
--darkest-blue: #171626        /* App headers, dark backgrounds */
--medium-dark: #201F2D         /* Content sections */
--light-background: #F4F5F9    /* Main backgrounds */
--primary-red: #F60406         /* CTA buttons, highlights */
--workout-blue: #577DE2        /* Charts, accents */
```

## 📊 Blog Statistics

- **Total Posts**: 77 published posts
- **Images**: 183 images (all local)
- **Date Range**: 2022-2024
- **Categories**: Cycling Training, Workouts, Apps
- **File Size**: ~25MB total (including images)

## 🔄 URL Rewriting Logic

The Express middleware automatically:

1. Checks if URL matches static files or API routes
2. Converts `/post-slug` to `/public/posts/post-slug.html`
3. Serves the HTML file if it exists
4. Falls back to 404 if no matching file

```javascript
// Example: /what-type-of-training → /public/posts/what-type-of-training.html
app.use('/', function(req, res, next) {
  const fileName = req.path.substring(1) + '.html';
  const filePath = path.join(__dirname, 'public', 'posts', fileName);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});
```

## 🖼️ Image Management

All images are automatically:
- Downloaded from WordPress to `/public/images/blog/`
- Renamed with year-month prefix to avoid conflicts
- Updated in all HTML files to use local paths
- Served efficiently through Express static middleware

### Image URL Transformation
```
FROM: https://blog.trainerday.com/wp-content/uploads/2024/03/image.jpg
TO:   /images/blog/2024-03-image.jpg
```

## 🎯 Content Features

Each blog post includes:
- **Responsive Layout**: Works on all devices
- **TrainerDay Branding**: Consistent header/footer
- **Call-to-Action**: Links to TrainerDay app
- **YouTube Embeds**: Converted from WordPress shortcodes
- **SEO Meta Tags**: Title and description for each post
- **Navigation**: Back to blog link

## 🔧 Customization

### Adding New Posts
1. Add to WordPress XML file
2. Run `npm run extract-posts`
3. Images will auto-download and update

### Updating Styles
- Edit `/public/stylesheets/style.css`
- Follows TrainerDay brand guidelines
- Uses CSS custom properties for colors

### Header/Footer Changes
- Edit `/public/header.html` and `/public/footer.html`
- Changes apply to all blog posts automatically

## 🚀 Deployment

For production deployment:

1. **Build**: All files are ready (no build step needed)
2. **Environment**: Set `NODE_ENV=production`
3. **Port**: Configure with `PORT` environment variable
4. **Static Files**: Ensure `/public` directory is accessible
5. **Process Manager**: Use PM2 or similar for process management

### Example PM2 Configuration
```json
{
  "name": "td-blog",
  "script": "./bin/www",
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

## ⚡ Performance

- **Static HTML**: No database queries
- **Local Images**: Fast loading from filesystem
- **Minimal Dependencies**: Lightweight Express setup
- **Caching**: Can add CDN or reverse proxy caching
- **File Size**: Average post ~50KB, images ~150KB each

## 🔍 SEO Features

- Clean, semantic HTML structure
- Proper meta titles and descriptions
- Fast loading times
- Mobile-responsive design
- Structured content with proper headings
- Internal linking between posts

## 📝 Content Structure

Each blog post follows this structure:
- Header with navigation
- Article title and metadata
- Main content with styled elements
- Call-to-action section
- Navigation back to blog
- Footer with links

## 🛠️ Development

### File Watching
```bash
npm run dev  # Auto-restarts on file changes
```

### Testing
```bash
node test-server.js  # Verify all files exist
```

### Debugging
- Check console logs for URL rewriting
- Verify file paths in `/public/posts/`
- Test image loading in browser dev tools

## 📧 Support

For issues or questions about this blog conversion:
- Check the original WordPress export in `/data/blog-content.xml`
- Verify file permissions on `/public` directory
- Ensure all dependencies are installed with `npm install`

---

**🎉 Your WordPress blog is now a fast, standalone Express application with all URLs preserved and images served locally!**