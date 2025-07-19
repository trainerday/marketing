# TrainerDay Static Site Builder

This project provides a static site generation system for TrainerDay pages that can be served both via Node.js server and as static HTML files for WordPress.

## Overview

The system consists of:
- **server.js**: Express server for development and testing
- **builder.js**: Static HTML generator for production deployment
- **templates/**: Header and footer templates
- **pages/**: Individual page content files
- **pages/assets/**: CSS, images, and JavaScript files

## Creating a New Page

### 1. Create Content File

Create a new HTML content file in `/pages/` directory:

```bash
touch pages/your-page-content.html
```

Example content structure:
```html
<style>
/* Page-specific styles */
.your-page-container {
    padding: 40px 0;
    text-align: center;
}
</style>

<div class="your-page-container">
    <h1>Your Page Title</h1>
    <p>Your page content goes here...</p>
    <a href="/download/" class="btn btn-primary">Call to Action</a>
</div>
```

### 2. Add Route to server.js

Edit `server.js` and add your route to the routes object:

```javascript
const routes = {
  '/': { content: 'home-content.html', title: 'TrainerDay - Cycling App', minimal: false },
  // ... existing routes
  '/your-page': { content: 'your-page-content.html', title: 'Your Page Title - TrainerDay', minimal: false }
};
```

**Route parameters:**
- `content`: Filename of your content file
- `title`: Page title for `<title>` tag
- `minimal`: `true` for minimal footer, `false` for full footer

### 3. Add Route to builder.js

Edit `builder.js` and add the same route configuration:

```javascript
const routes = {
  '/': { content: 'home-content.html', title: 'TrainerDay - Cycling App', minimal: false },
  // ... existing routes
  '/your-page': { content: 'your-page-content.html', title: 'Your Page Title - TrainerDay', minimal: false }
};
```

### 4. Test with Development Server

Start the development server:
```bash
node server.js
```

Visit: `http://localhost:3000/your-page`

### 5. Generate Static HTML

Build the static HTML file:

```bash
# Build all pages
node builder.js

# Build specific page
node builder.js /your-page

# List available routes
node builder.js --list
```

Generated files are saved to `/wp-output/` directory.

### 6. Add htaccess Rewrite Rule

Add the rewrite rule to your `.htaccess` file:

```apache
<IfModule mod_rewrite.c>
RewriteEngine On

# Static page rewrites
RewriteRule ^your-page/?$ your-page.html [L,QSA]
# ... other existing rules

# WordPress rules (keep at bottom)
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
```

**Rewrite rule explanation:**
- `^your-page/?$`: Matches `/your-page` and `/your-page/`
- `your-page.html`: File to serve
- `[L,QSA]`: Last rule, Query String Append

## Assets and Images

### Adding Images
1. Place images in `/pages/assets/images/`
2. Reference in content: `/assets/images/your-image.jpg`
3. Images are automatically served by both server and static deployment

### CSS Styles
- Global styles: `/pages/assets/css/styles.css`
- Page-specific styles: Add `<style>` block in content file
- Mobile responsive: Use existing breakpoints (`@media (max-width: 768px)`)

## Templates

### Header Template (`templates/header.html`)
- Contains `<head>`, navigation, analytics
- Uses `{{TITLE}}` placeholder for page title
- Includes authentication logic for Sign Up/Login buttons

### Footer Templates
- `templates/footer.html`: Full footer with links and app download buttons
- `templates/footer-minimal.html`: Minimal footer with basic links only

## Common Patterns

### Authentication-Aware Elements
Use these classes for elements that change based on login state:
- `.auth-link`: Show when logged out (Sign Up/Login)
- `.webapp-link`: Show when logged in (Go to App)
- `.upgrade-link`: Show when logged in (upgrade buttons)

### Button Styles
Standard button classes:
- `.btn.btn-primary`: Primary red button
- `.btn.btn-secondary`: Secondary button
- `.download-cta`: Download app button styling

### Responsive Design
```css
/* Desktop */
.your-element { }

/* Tablet */
@media (max-width: 1024px) and (min-width: 769px) { }

/* Mobile */
@media (max-width: 768px) { }
```

## Deployment Workflow

1. **Development**: Use `node server.js` for live testing
2. **Build**: Run `node builder.js` to generate static files
3. **Deploy**: Copy files from `/wp-output/` to web server
4. **Configure**: Add htaccess rewrite rules
5. **Test**: Verify pages load correctly in production

## Troubleshooting

### Page Not Loading
- Check route is added to both `server.js` and `builder.js`
- Verify content file exists in `/pages/` directory
- Check htaccess rewrite rule syntax
- Clear browser cache

### Images Not Loading
- Verify image path starts with `/assets/images/`
- Check image file exists in `/pages/assets/images/`
- Ensure image file extension matches reference

### Styles Not Applied
- Check CSS syntax in `<style>` blocks
- Verify global styles are in `/pages/assets/css/styles.css`
- Test responsive breakpoints on different screen sizes

## Examples

See existing pages for reference:
- `pages/home-content.html`: Hero section with pricing
- `pages/404-content.html`: Full-screen background with overlay
- `pages/jetblack-content.html`: Split layout with branding
- `pages/coach-jack-content.html`: Product page with features