const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const FILE_PATH = 'index.html';
const REPO = 'MrGhostGuy/niceguyapi';
const BRANCH = 'main';

async function getToken() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        'User-Agent': 'NiceGuyAPI-Deploy',
        'Accept': 'application/vnd.github.v3+json',
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        // Try to get token from gh config
        try {
          const config = fs.readFileSync('C:\\Users\\kency\\.config\\gh\\hosts.yml', 'utf8');
          const match = config.match(/oauth_token:\s*(\S+)/);
          if (match) { resolve(match[1]); return; }
        } catch(e) {}
        resolve(null);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function push() {
  let token;
  try {
    token = execSync('gh auth token 2>nul', { encoding: 'utf8' }).trim();
  } catch(e) {}
  if (!token) { console.error('No token available'); process.exit(1); }
  
  const content = fs.readFileSync(FILE_PATH, 'utf8');
  const b64 = Buffer.from(content).toString('base64');
  
  // Get existing SHA
  let sha = null;
  await new Promise((resolve) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}/contents/${FILE_PATH}`,
      method: 'GET',
      headers: {
        'User-Agent': 'NiceGuyAPI-Deploy',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { const j = JSON.parse(d); sha = j.sha || null; } catch(e) {}
        resolve();
      });
    });
    req.on('error', () => resolve());
    req.end();
  });
  
  const body = JSON.stringify({
    message: 'v5.4.3 — aurora glow, left slide-out neon menu, orbitron title, removed top tabs',
    content: b64,
    branch: BRANCH,
    ...(sha && { sha })
  });
  
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}/contents/${FILE_PATH}`,
      method: 'PUT',
      headers: {
        'User-Agent': 'NiceGuyAPI-Deploy',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log(d.slice(0, 500));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('SUCCESS: File pushed to GitHub');
        } else {
          console.error('FAILED');
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

push().catch(e => console.error('Error:', e.message));
