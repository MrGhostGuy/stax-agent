const fs = require('fs');
const path = require('path');

const files = ['index.html', 'ghostapi/index.html'];

const replacements = [
  [/GhostAPI/g, 'NiceGuyAPI'],
  [/ghostapi\.dev/g, 'niceguyapi.dev'],
  [/ghostapi-1v1f/g, 'niceguyapi-1v1f'],
  [/GHOSTAPI_/g, 'NICEGUYAPI_'],
  [/ghost-api/g, 'niceguyapi'],
  [/ghostapi/g, 'niceguyapi'],
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) { console.log(`SKIP: ${file}`); continue; }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (from.test(content)) { content = content.replace(from, to); changed = true; }
  }
  if (changed) { fs.writeFileSync(filePath, content, 'utf8'); console.log(`UPDATED: ${file}`); }
  else { console.log(`NO CHANGE: ${file}`); }
}
console.log('Done!');
