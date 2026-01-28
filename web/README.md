# Strokecovery Landing Page

## Test Locally

### Option 1: Simple (Just open the file)
```
Double-click on index.html to open in browser
```

### Option 2: Local Server (Recommended for testing)

Using Python:
```bash
cd web
python -m http.server 8000
# Open http://localhost:8000
```

Using Node.js (npx):
```bash
cd web
npx serve
# Open http://localhost:3000
```

Using VS Code:
- Install "Live Server" extension
- Right-click index.html → "Open with Live Server"

## Deploy to AWS S3

1. Create S3 bucket
2. Enable static website hosting
3. Upload files
4. Set bucket policy for public access

See docs/TECHNICAL.md for detailed instructions.
