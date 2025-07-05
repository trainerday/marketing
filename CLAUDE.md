# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Basic Memory Project
Switch to the basic-memory project "td-business" when working in this repository. The location for the main information is under the folder in basic memory called. marketing/marketing-projects

## Repository Structure

This is a marketing automation repository with multiple projects:

- **`marketing-email/`** - Email automation system (primary active project)
- **`marketing-content/`** - Content generation tools
- **`marketing-video/`** - Video marketing automation (planned)

## marketing-email Project

### Common Commands
```bash
cd marketing-email
npm run dev     # Start development server with nodemon
npm start       # Start production server

# Manual workflow execution
node step1-sync-users.js         # Sync users from MongoDB to BigMailer
node step2-generate-content.js   # Generate marketing content from GitHub PRs
node step3-create-campaign.js    # Create email campaign in BigMailer
node step4-campaign-stats.js     # Get campaign performance statistics
```

### Architecture
4-step email automation workflow:
1. **User Sync** - MongoDB users → BigMailer contacts
2. **Content Generation** - GitHub PRs → Marketing content
3. **Campaign Creation** - Content → HTML email campaigns
4. **Analytics** - Campaign performance tracking

### Key Components
- **Database**: MongoDB with TLS authentication
- **Email Service**: BigMailer API integration
- **Content Processing**: GitHub CLI + Markdown conversion
- **Progress Tracking**: Checkpoint-based synchronization

### Environment Setup
Required `.env` variables in `marketing-email/`:
- `BIGMAILER_API_KEY` - BigMailer authentication
- `username`, `password`, `host` - MongoDB credentials

### BigMailer Configuration
- API Docs: https://docs.bigmailer.io/reference/
- Brand ID: `55e9e9e3-0564-41c1-ba79-faa7516c009d`
- List ID: `71a953b3-ef1d-4d20-91ba-10e896fe18a5`