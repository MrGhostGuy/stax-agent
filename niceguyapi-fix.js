const https = require('https');
const fs = require('fs');

// Read GitHub token from environment
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN environment variable required');
  process.exit(1);
}

// Read the fixed HTML from the browser-extracted version
let html = fs.readFileSync('C:\\Users\\kency\\.openclaw\\workspace\\niceguyapi-browser.html', 'utf8');

// Apply the 4 fixes
// 1. Make tab-home active (remove active from tab-dash first to avoid two actives)
html = html.replace('class="nav-tab active" id="tab-dash"', 'class="nav-tab" id="tab-dash"');
html = html.replace('class="nav-tab" id="tab-home"', 'class="nav-tab active" id="tab-home"');
// 2. Make content-home active, content-dash inactive
html = html.replace('class="tab-content active" id="content-dash"', 'class="tab-content" id="content-dash"');
html = html.replace('<div class="tab-content" id="content-home">', '<div class="tab-content active" id="content-home">');

// Write fixed file
fs.writeFileSync('C:\\Users\\kency\\.openclaw\\workspace\\niceguyapi-fixed.html', html);
console.log('Fixed HTML written. Length:', html.length);

// Get current file SHA
function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'User-Agent': 'NiceGuyAPI-Fixer',
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch(e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Get current SHA
  const getRes = await api('GET', '/repos/MrGhostGuy/niceguyapi/contents/index.html');
  if (getRes.status !== 200) {
    console.error('Failed to get file:', getRes.body);
    process.exit(1);
  }
  const sha = getRes.body.sha;
  console.log('Current SHA:', sha);

  // Encode content to base64
  const content = Buffer.from(html).toString('base64');

  // Push update
  const putRes = await api('PUT', '/repos/MrGhostGuy/niceguyapi/contents/index.html', {
    message: 'fix: set Home tab as default active tab instead of Dashboard',
    content: content,
    sha: sha,
    branch: 'main'
  });

  if (putRes.status === 200) {
    console.log('SUCCESS! File updated. Commit:', putRes.body.commit.sha);
  } else {
    console.error('Failed to update:', putRes.body);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
