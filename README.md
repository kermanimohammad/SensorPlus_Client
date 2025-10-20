# Frontend Build Package

This folder contains all the necessary files for deploying the Digital Twin frontend application.

## Contents:
- `index.html` - Main application file
- `404.html` - SPA fallback for GitHub Pages
- `CNAME` - Custom domain configuration
- `favicon.svg` - Application icon
- `vite.svg` - Vite logo
- `assets/` - All JavaScript and CSS files
- `icons/` - All SVG icons
- `models/` - All 3D model files (.glb)

## Version: 2025.0.1.25
**Build Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Deployment:
Simply push the contents of this folder to your hosting platform or GitHub Pages.

## Build Process:
1. Version incremented in version.json and package.json
2. `npm run build` executed
3. All dist contents copied to frontend-build folder
4. Ready for deployment
