#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('[1] Reading modified HTML from workspace...');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
console.log('  Size:', html.length, 'chars');

// Check if already deployed
if (!html.includes('ngFadeIn')) {
  console.log('ERROR: index.html does not contain mobile menu code');
  console.log('Run niceguyapi-deploy-fix.js first to generate it.');
  process.exit(1);
}

console.log('[2] Getting current SHA from GitHub...');
const sha = execSync('gh api repos/MrGhostGuy/niceguyapi/contents/index.html --jq ".sha"', { encoding: 'utf8' }).trim();
console.log('  SHA:', sha.slice(0,8));

console.log('[3] Pushing to GitHub via gh api...');
// Write base64 content to a temp file for gh to read
const contentB64 = Buffer.from(html).toString('base64');

// Use a small Node helper script to write and execute the gh command with proper encoding
const helperCode = `
const { execSync } = require('child_process');
const content = Buffer.from(process.env.NG_CONTENT, 'base64').toString('utf8');
const b64 = Buffer.from(content).toString('base64');
execSync('gh api --method PUT repos/MrGhostGuy/niceguyapi/contents/index.html -f message="feat: mobile hamburger menu + premium tab transitions" -f content="' + b64 + '" -f sha="' + sha + '" -f');
`;
fs.writeFileSync(__dirname + '/_push-helper.js', helperCode);
execSync('node _push-helper.js', {
  env: { ...process.env, NG_CONTENT: contentB64 },
  stdio: 'inherit',
  cwd: __dirname
});

console.log('\n✅ DEPLOYED!');
console.log('Live at: https://mrghostguy.github.io/niceguyapi/ (~30s)');

// Cleanup
try { fs.unlinkSync(__dirname + '/_push-helper.js'); } catch(e) {}
