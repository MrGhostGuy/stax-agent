const fs = require('fs');
const { execSync } = require('child_process');

const html = fs.readFileSync(__dirname + '/niceguyapi-socials.html', 'utf8');
const b64 = Buffer.from(html).toString('base64');

const body = JSON.stringify({
  message: 'feat: add blog and social posts aggregator page',
  content: b64,
  branch: 'main'
});

fs.writeFileSync(__dirname + '/_socials-body.json', body);

try {
  execSync('gh api --method PUT -H "Content-Type: application/json" repos/MrGhostGuy/niceguyapi/contents/niceguyapi-socials.html --input _socials-body.json', { stdio: 'inherit', cwd: __dirname });
  console.log('SOCIALS PAGE DEPLOYED!');
  console.log('https://mrghostguy.github.io/niceguyapi/niceguyapi-socials.html');
} catch(e) {
  console.error('Push failed:', e.message);
} finally {
  try { fs.unlinkSync(__dirname + '/_socials-body.json'); } catch(e) {}
}
