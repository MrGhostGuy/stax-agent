const fs = require('fs');
const path = require('path');

const files = [
  'server/index.js',
  'index.html',
  'index.js',
  'package.json',
  'render.yaml',
  'Dockerfile',
  'fly.toml',
];

const replacements = [
  // Display names
  [/GhostAPI/g, 'NiceGuyAPI'],
  [/ghostapi\.dev/g, 'niceguyapi.dev'],
  // URLs
  [/ghostapi-1v1f/g, 'niceguyapi-1v1f'],
  // Env vars
  [/GHOSTAPI_/g, 'NICEGUYAPI_'],
  // DB path
  [/ghostapi\.db/g, 'niceguyapi.db'],
  // Secret prefix
  [/ghost-dev-secret/g, 'niceguy-dev-secret'],
  [/ghost-2026-secret/g, 'niceguy-2026-secret'],
  // Lowercase references in text
  [/the GhostAPI/g, 'the NiceGuyAPI'],
  [/GhostAPI v1/g, 'NiceGuyAPI v1'],
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`UPDATED: ${file}`);
  } else {
    console.log(`NO CHANGE: ${file}`);
  }
}

console.log('\nDone! Test with: grep -ri ghostapi server/index.js index.html');
