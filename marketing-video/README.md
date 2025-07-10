# Video Templates

> **Note**: Open the basic memory project "td-business" for additional context. The full video production process is documented at: marketing/marketing-projects/marketing-video/full-video-production-process

This directory contains configuration templates for the automated video marketing system.

## Template Files

### `assembly-template1.json`
Defines the video assembly structure with dynamic timing calculations:
- **Video sections**: Beginning (intro + b-roll), chapters (generated content), end (goodbye + outro)
- **Voice sections**: Audio timing and volume for different segments
- **Music sections**: Background music with fade transitions
- **Overlay sections**: Logo and title positioning with calculated timing
- **Conversion settings**: ProRes codec specifications for high-quality output

### `project-config-template.json`
Project-specific configuration template:
- **Music assets**: Background track selections for different video types
- **Audio levels**: Volume settings for background music
- **Branding**: Customizable title text
- **Intro/outro**: Asset file paths for opening and closing segments
- **B-roll video**: Default cycling footage
- **Assembly reference**: Links to the assembly template

## Video Production Steps (Root Directory)

The marketing-video project follows a 7-step automated workflow:

### Manual Setup
- **Step 0**: Manual configuration and asset preparation

### Validation & Script Generation
- **Step 1**: `Step 1 - Validate Configuration.py` - Validates project configuration and assets
- **Step 2**: `Step 2 - Create Script.py` - Generates video script from content
- **Step 3**: `Step 3 - Review Script.md` - Manual script review checkpoint
- **Step 4**: `Step 4 - Verify Script.py` - Automated script verification

### Video Production
- **Step 5**: `Step 5 - Create Final Video.py` - Assembles final video with all components
- **Step 6**: `Step 6 - Add Annotations.md` - Manual annotation and overlay addition
- **Step 7**: `Step 7 - Upload to YouTube.py` - Automated YouTube upload with metadata

The templates in this directory provide the structure for consistent video formatting across all automated productions.