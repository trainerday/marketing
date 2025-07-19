# Dokku Deployment Setup for TrainerDay Projects

This document outlines how to deploy TrainerDay project components to different Dokku containers.

## Project Structure
The marketing repository contains multiple deployable components:

1. **web-trainer** - Vue.js frontend application
2. **web-trainer-api** - Node.js API server
3. **websockets-svc** - WebSocket service
4. **blog** - TrainerDay Blog (Express.js with PM2)

## Current Deployment Remotes
The marketing repository has these deployment remotes:

```bash
# Web Trainer Frontend
web-trainer	uat.trainerday.com:web-trainer (fetch/push)

# Additional remotes to be added:
# web-trainer-api	uat.trainerday.com:web-trainer-api (fetch/push)
# websockets-svc	uat.trainerday.com:websockets-svc (fetch/push)
# blog	prod.trainerday.com:blog (fetch/push)
```

## Setup Instructions for Parent Directory
From `/Users/alex/Documents/Projects/marketing` root, add these remotes:

```bash
# Add remotes for web-trainer deployments (note: must use dokku@ user)
git remote add web-trainer dokku@uat.trainerday.com:web-trainer
git remote add web-trainer-api dokku@uat.trainerday.com:web-trainer-api
git remote add websockets-svc dokku@uat.trainerday.com:websockets-svc

# Add remote for blog deployment (production only)
git remote add blog dokku@prod.trainerday.com:blog

# For production deployment (when ready)
# git remote add web-trainer-prod dokku@prod.trainerday.com:web-trainer
# git remote add web-trainer-api-prod dokku@prod.trainerday.com:web-trainer-api
# git remote add websockets-svc-prod dokku@prod.trainerday.com:websockets-svc
```

## Deployment Commands
Deploy specific subfolders to their respective containers:

```bash
# Deploy web-trainer frontend to UAT
git subtree push --prefix=web-trainer web-trainer master

# Deploy web-trainer API to UAT
git subtree push --prefix=web-trainer-api web-trainer-api master

# Deploy websockets service to UAT
git subtree push --prefix=websockets-svc websockets-svc master

# Deploy blog to production
git subtree push --prefix=td-blog blog master

# For production deployment (when ready)
# git subtree push --prefix=web-trainer web-trainer-prod master
# git subtree push --prefix=web-trainer-api web-trainer-api-prod master
# git subtree push --prefix=websockets-svc websockets-svc-prod master
```

## Service Descriptions

### web-trainer (Frontend)
- **Technology**: Vue.js application with Vuex state management
- **Features**: Workout interface, Bluetooth LE device support, real-time data visualization
- **Build**: Webpack build process creates static files for deployment
- **Port**: Typically serves on port 8080 or as configured

### web-trainer-api (API Server)
- **Technology**: Node.js/Express API server
- **Features**: User data management, video list services, route management
- **Dependencies**: External APIs for YouTube data and user authentication
- **Port**: Configurable, typically 3000

### websockets-svc (WebSocket Service)
- **Technology**: Node.js WebSocket server
- **Features**: Real-time workout data streaming, device communication
- **Purpose**: Handles live sensor data and workout synchronization
- **Port**: Configurable, typically 8081

### blog (TrainerDay Blog)
- **Technology**: Node.js/Express with PM2 process management
- **Features**: 77 blog posts, TrainerDay brand styling, responsive design
- **Content**: Converted WordPress blog with locally hosted images
- **Port**: Dynamic (uses `process.env.PORT || 3000` in ecosystem.config.js)
- **Process Manager**: PM2 for production stability and auto-restart
- **PM2 Config**: Uses ecosystem.config.js with `--no-daemon` flag for containers

## Notes
- Each service can be deployed independently to its own Dokku container
- Services communicate via configured endpoints and WebSocket connections
- Environment variables should be configured per service in Dokku
- The `--prefix` should match the subfolder path relative to the git root
- websocket-test-data-generator is excluded from deployment (development only)

## Environment Configuration
Each service will need appropriate environment variables configured in Dokku:

### Required for web-trainer (Frontend):

**NPM Token Setup:**
1. **Local Development**: Add to `.env` file:
   ```
   NPM_TOKEN=npm_your_token_here
   ```

2. **Remote Deployment**: Set in Dokku config:
   ```bash
   # Set NPM token for private package access
   ssh dokku@uat.trainerday.com config:set web-trainer NPM_TOKEN=npm_your_token_here
   
   # Set environment for stage configuration
   ssh dokku@uat.trainerday.com config:set web-trainer APP_ENV=stage
   ssh dokku@uat.trainerday.com config:set web-trainer STAGE_WEBSOCKET_URL=ws://websockets-svc.uat.trainerday.com
   ssh dokku@uat.trainerday.com config:set web-trainer STAGE_API_URL=https://web-trainer-api.uat.trainerday.com
   ```

3. **Getting NPM Token**: 
   - Login to npm: `npm login`
   - Create token: `npm token create --read-only`
   - Or get from team admin for @trainerday packages

### Required for web-trainer-api (API Server):
```bash
# Set environment for stage configuration
ssh dokku@uat.trainerday.com config:set web-trainer-api APP_ENV=stage
ssh dokku@uat.trainerday.com config:set web-trainer-api CORS_ORIGIN=https://web-trainer.uat.trainerday.com
ssh dokku@uat.trainerday.com config:set web-trainer-api STAGE_WEBSOCKET_URL=ws://websockets-svc.uat.trainerday.com
```

### Required for websockets-svc (WebSocket Service):
```bash
# Set environment for stage configuration
ssh dokku@uat.trainerday.com config:set websockets-svc APP_ENV=stage
```

### Required for blog (TrainerDay Blog):
```bash
# Set environment for production
ssh dokku@prod.trainerday.com config:set blog NODE_ENV=production
ssh dokku@prod.trainerday.com config:set blog PORT=3000

# Optional: Set custom domain (blog.trainerday.com)
ssh dokku@prod.trainerday.com domains:add blog blog.trainerday.com
```

## Important Notes
- **Always use `dokku@` user** in remote URLs, not `alex@`
- **NPM Token required** for private @trainerday packages 
- **Build from git root** - must run subtree push from `/Users/alex/Documents/Projects/marketing`
- **Deployment creates the app** - first push will create the Dokku app automatically
- **Check deployment logs** if build fails - most issues are environment related
- **PM2 Port Configuration**: For PM2 apps, always use `process.env.PORT || defaultPort` in ecosystem.config.js
- **Container Deployment**: PM2 must run with `--no-daemon` flag in containerized environments

## Successful Deployment Examples
```bash
# Deploy web-trainer from /Users/alex/Documents/Projects/marketing
git subtree push --prefix=web-trainer web-trainer master
# Result: https://web-trainer.uat.trainerday.com

# Deploy blog from /Users/alex/Documents/Projects/marketing  
git subtree push --prefix=td-blog blog master
# Result: https://blog.prod.trainerday.com (or configured custom domain)
```

## Testing the Deployment

After deployment, you can test the staging environment using the WebSocket data generator:

```bash
# From /Users/alex/Documents/Projects/td-main/websocket-test-data-generator
APP_ENV=stage node index.js
```

This will:
1. Connect to the staging WebSocket service
2. Send realistic training data (power, cadence, heart rate)
3. Display the data in real-time on the web-trainer frontend
4. Allow you to verify the complete data flow from WebSocket → API → Frontend

The data should appear within 1-2 seconds of starting the generator.

## Environment URLs

### Staging URLs
- **Frontend**: https://web-trainer.uat.trainerday.com
- **API**: https://web-trainer-api.uat.trainerday.com
- **WebSocket**: wss://websockets-svc.uat.trainerday.com
- **User API**: https://app.api.trainerday.com (production API for authentication)

### Production URLs
- **Blog**: https://blog.prod.trainerday.com (or custom domain: https://blog.trainerday.com)

## Troubleshooting

### PM2 Deployment Issues

**Problem**: 502 Bad Gateway after PM2 app deployment
**Cause**: Hardcoded PORT in ecosystem.config.js instead of using Dokku's dynamic PORT
**Solution**: Update ecosystem.config.js to use `process.env.PORT || defaultPort`

```javascript
// ❌ Wrong - hardcoded port
env_production: {
  NODE_ENV: 'production',
  PORT: 3000
}

// ✅ Correct - dynamic port
env: {
  PORT: process.env.PORT || 3000
}
```

**Example PM2 Configuration for Dokku:**
```javascript
module.exports = {
  apps: [{
    name: 'app-name',
    script: './bin/www',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      PORT: process.env.PORT || 3000
    }
  }]
};
```

**Package.json start script:**
```json
"start": "pm2 start ecosystem.config.js --env production --no-daemon"
```