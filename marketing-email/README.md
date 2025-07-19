# Marketing Email

Email automation system for sending marketing campaigns.

## Configuration

All configuration is centralized in `config.js` including:
- BigMailer API settings
- MongoDB connection details
- Email type definitions

## Email Types

The system supports two email types:
- **All-Monthly**: Sent to all users (List ID: `71a953b3-ef1d-4d20-91ba-10e896fe18a5`)
- **Insiders-Monthly**: Sent to TrainerDay Insiders (List ID: `b4f91dc9-c499-4d62-ad5d-ac14e55bec29`)

## Usage

### Step 1: Sync Users
```bash
node workflows/sync-users.js
```
Syncs all users from MongoDB to BigMailer (runs for both email types).

### Step 2: Generate Content
```bash
# Generate content for all users
node workflows/generate-content.js All-Monthly

# Generate content for insiders
node workflows/generate-content.js Insiders-Monthly
```

### Step 3: Create Campaign
```bash
# Create campaign for all users
node workflows/create-campaign.js All-Monthly

# Create campaign for insiders  
node workflows/create-campaign.js Insiders-Monthly
```

### Step 4: Campaign Stats
```bash
node workflows/campaign-stats.js
```

## Development

```bash
npm run dev     # Start development server with nodemon
npm start       # Start production server
```