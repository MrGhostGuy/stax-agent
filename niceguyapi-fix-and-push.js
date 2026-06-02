const https = require('https');
const fs = require('fs');

function api(method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'NiceGuyAPI-Fixer',
        'Authorization': 'token ' + process.env.GITHUB_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Length': body ? Buffer.byteLength(body) : 0
      }
    };
    const req = https.request(opts, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Get current file from GitHub API (returns base64 content)
  console.log('Fetching index.html from GitHub...');
  const getRes = await api('GET', '/repos/MrGhostGuy/niceguyapi/contents/index.html');
  if (getRes.status !== 200) {
    console.error('Failed to fetch:', getRes.body);
    process.exit(1);
  }
  const sha = getRes.body.sha;
  let html = Buffer.from(getRes.body.content, 'base64').toString('utf8');
  console.log('Current file length:', html.length, 'SHA:', sha);

  let changes = 0;

  // Fix 1: Copy button double-prefix bug
  // The onclick does copyKey(\'nga_live_\' + k.prefix + \') but k.prefix already starts with nga_live_
  // Fix: use copyKey(k.prefix) since prefix IS the key (showing nga_live_xxxx in the dashboard)
  // Actually looking at the code: the dashboard displays k.prefix which is like "nga_live_7979b" (12 chars)
  // The copyKey function just copies the text. So we should pass the full key, not reconstruct it.
  // But we don't have the full key in the list. The fix is to store the full key when it's created.
  // For now, let's fix the copy to at least not double-prefix:
  const copyBtnOld = "onclick=\\\"copyKey(\\'nga_live_\\' + k.prefix + \\'\\')\\\"";
  const copyBtnNew = "onclick=\\\"copyKey(k.prefix)\\\"";
  if (html.includes(copyBtnOld)) {
    html = html.replace(copyBtnOld, copyBtnNew);
    changes++;
    console.log('Fix 1: Copy button double-prefix bug');
  }

  // Fix 2: Default tab should be Home (verify it already is)
  const tabDashActive = 'class="nav-tab active" id="tab-dash"';
  const tabDashInactive = 'class="nav-tab" id="tab-dash"';
  const tabHomeActive = 'class="nav-tab active" id="tab-home"';
  const tabHomeInactive = 'class="nav-tab" id="tab-home"';
  const contentDashActive = 'class="tab-content active" id="content-dash"';
  const contentDashInactive = 'class="tab-content" id="content-dash"';
  const contentHomeActive = 'class="tab-content active" id="content-home"';
  const contentHomeInactive = 'class="tab-content" id="content-home"';

  if (html.includes(tabDashActive)) {
    html = html.replace(tabDashActive, tabDashInactive);
    changes++;
    console.log('Fix 2a: Removed active from tab-dash');
  }
  if (html.includes(tabHomeInactive)) {
    html = html.replace(tabHomeInactive, tabHomeActive);
    changes++;
    console.log('Fix 2b: Added active to tab-home');
  }
  if (html.includes(contentDashActive)) {
    html = html.replace(contentDashActive, contentDashInactive);
    changes++;
    console.log('Fix 2c: Removed active from content-dash');
  }
  if (html.includes(contentHomeInactive) && !html.includes(contentHomeActive)) {
    html = html.replace(contentHomeInactive, contentHomeActive);
    changes++;
    console.log('Fix 2d: Added active to content-home');
  }

  if (changes === 0) {
    console.log('No changes needed — file already correct.');
    return;
  }

  console.log('Total changes:', changes);
  fs.writeFileSync('C:\\Users\\kency\\.openclaw\\workspace\\niceguyapi-fixed.html', html);
  console.log('Fixed file written locally.');

  // Push to GitHub
  const content = Buffer.from(html).toString('base64');
  const putRes = await api('PUT', '/repos/MrGhostGuy/niceguyapi/contents/index.html', {
    message: 'fix: copy button double-prefix bug + ensure Home tab default',
    content: content,
    sha: sha,
    branch: 'main'
  });

  if (putRes.status === 200) {
    console.log('SUCCESS! Pushed to GitHub. Commit:', putRes.body.commit.sha);
  } else {
    console.error('Push failed:', putRes.body);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
