# Celora Wallet Extension - Icon Placeholders

The extension requires icons in the following sizes:
- **icon16.png** - 16x16px (browser toolbar)
- **icon48.png** - 48x48px (extension management page)
- **icon128.png** - 128x128px (Chrome Web Store listing)

## Temporary Solution (Development Only)

For development testing, you can use placeholder icons:

1. Create simple colored squares in any image editor
2. Save as PNG with transparent background
3. Dimensions must be exact (16x16, 48x48, 128x128)

## Production Icons

For Chrome Web Store submission, you'll need professional icons:

### Design Guidelines
- Use Celora brand colors (purple gradient: #8B5CF6 to #D946EF)
- Include recognizable Solana/wallet symbol
- Clear visibility at all sizes
- Transparent or white background
- PNG format with alpha channel

### Recommended Tools
- Figma (free, vector-based)
- Adobe Illustrator
- Canva (has icon templates)
- GIMP (free, open-source)

### Quick Online Generators
- https://favicon.io/ (basic shapes)
- https://realfavicongenerator.net/ (from text/emoji)
- https://www.icoconverter.com/ (resize images)

## Current Status
⚠️ **Icons not yet created** - Extension will not load without these files.

To test immediately, create placeholder files:
```bash
# Windows PowerShell
cd d:\CeloraV2\extension\assets
# Create 1x1 transparent PNGs and rename to proper sizes
# Or download placeholder icons from the web
```

The manifest.json references:
- `assets/icon16.png`
- `assets/icon48.png`
- `assets/icon128.png`

Extension will fail to load in Chrome until these files exist.
