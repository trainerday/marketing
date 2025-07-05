# Claude Development Notes

## Connected OS Project
This development project is connected to the OS project: **email-automation**

To access the OS project management files, use:
`memory://os-projects/email-automation/kanban-board`

## Quick Links
- Kanban Board: `os-projects/email-automation/kanban-board`
- Tech Standards: `os-projects/email-automation/project-standards-and-dev-notes/tech-standards`
- Design Standards: `os-projects/email-automation/project-standards-and-dev-notes/design-standards`
- Testing: `os-projects/email-automation/stage-testing/task-list-and-status`

## Development Notes

### BigMailer API Documentation
- **API Docs URL**: https://docs.bigmailer.io/reference/
- **Key Endpoints**:
  - List Brands: https://docs.bigmailer.io/reference/listbrands
  - List Campaigns: https://docs.bigmailer.io/reference/listcampaigns
  - Get Campaign: https://docs.bigmailer.io/reference/getcampaign
  - Create Campaign: https://docs.bigmailer.io/reference/createcampaign
  - Campaign Statistics: https://docs.bigmailer.io/reference/getcampaignstatistics

### API Configuration
- **API Key**: Stored in `.env` as `BIGMAILER_API_KEY`
- **Brand ID**: `55e9e9e3-0564-41c1-ba79-faa7516c009d` (TrainerDay)
- **List ID**: `71a953b3-ef1d-4d20-91ba-10e896fe18a5` (All Contacts)