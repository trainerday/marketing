# TrainerDay Static Site Builder

This repository contains a Node.js-based static site generator for TrainerDay pages that can be served both via Express server and as static HTML files for WordPress deployment.

## Overview

This project generates static HTML pages from modular content files and templates. All pages are managed through version control and can be developed locally before deployment to WordPress.

## Structure

- `server-builder/` - Main application directory
  - `server.js` - Express development server
  - `builder.js` - Static HTML generator for production
  - `deploy.js` - Deployment automation script
  - `pages/` - Content files and assets
    - `*-content.html` - Individual page content files
    - `assets/` - Static assets organized by type:
      - `css/` - Stylesheets (global styles.css)
      - `js/` - JavaScript files
      - `images/` - Image assets
  - `templates/` - Reusable page templates
    - `header.html` - Site header with navigation
    - `footer.html` - Full footer with links and downloads
    - `footer-minimal.html` - Minimal footer version
  - `wp-output/` - Generated static HTML files ready for deployment

## Development Workflow

### Local Development
```bash
cd server-builder
npm run dev           # Start development server with nodemon
node server.js        # Start development server on localhost:3000
node deploy-local.js  # Deploy to Laravel Valet (https://td-testit2.test)
```

### Build Static Files
```bash
node builder.js        # Build all pages
node builder.js /page  # Build specific page
node builder.js --list # List available routes
```

### Deployment to WordPress

#### Production Deployment (SFTP)
```bash
node deploy.js  # Deploy to production server (157.245.124.109)
```
**Requirements:**
- `WORDPRESS_SSH_PRIVATE_KEY` environment variable

#### Staging Deployment (FTP)
```bash
node deploy.js staging  # Deploy to staging server
```
**Requirements:**
- `WORDPRESS_STAGE_FTP_SERVER` environment variable
- `WORDPRESS_STAGE_FTP_USER` environment variable
- `WORDPRESS_STAGE_FTP_PASSWORD` environment variable

#### Local Deployment (Valet)
```bash
node deploy-local.js  # Deploy to /Users/alex/Sites/td-testit2
```
- Automatically updates Nginx configuration
- Accessible at `https://td-testit2.test`
- Restarts Valet when needed

## Creating New Pages

1. **Create content file**: Add `your-page-content.html` in `pages/`
2. **Add routes**: Update route configuration in both `server.js` and `builder.js`
3. **Test locally**: Use development server to preview changes
4. **Build static**: Generate HTML files with builder script
5. **Deploy**: Copy from `wp-output/` to production server

## Asset Management

All assets use absolute paths (`/assets/`) that work consistently in both development and production environments. No build-time URL processing required.

## Environment Setup

### Required Environment Variables

#### Production Deployment
- `WORDPRESS_SSH_PRIVATE_KEY` - SSH private key for production server access

#### Staging Deployment  
- `WORDPRESS_STAGE_FTP_SERVER` - Staging FTP server hostname
- `WORDPRESS_STAGE_FTP_USER` - FTP username
- `WORDPRESS_STAGE_FTP_PASSWORD` - FTP password

### Deployment Targets
- **Local**: Laravel Valet site at `https://td-testit2.test` (Nginx)
- **Staging**: `web.uat.trainerday.com` (FTP/Apache)
- **Production**: `157.245.124.109` (SFTP/Apache)