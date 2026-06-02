// Generate PNG profile pic using pure Node.js (no native deps needed)
const fs = require('fs');
const path = require('path');

// Create a simple PNG manually - 512x512 with gradient
// We'll use a minimal approach: create a BMP first, then convert

// Actually let's just create a simple valid PNG using built-in modules
// We don't need sharp or canvas - let's use the approach of creating a base64 PNG

// Simplest approach: create SVG and render via canvas in browser
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1" />
      <stop offset="100%" style="stop-color:#06b6d4" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)" />
  <text x="256" y="300" font-family="Arial,sans-serif" font-size="180" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle">NGA</text>
</svg>`;

const svgPath = path.join('C:\\Users\\kency\\.openclaw\\workspace', 'niceguyapi-profile.svg');
fs.writeFileSync(svgPath, svg);
console.log('SVG saved to:', svgPath);
console.log('Open this SVG in a browser and screenshot/save as PNG for profile picture use.');
