const http = require('http');
const { execSync } = require('child_process');
const { spawn } = require('child_process');
const fs = require('fs');

// Step 1: Find and kill the dashboard server (PID listening on port 3000)
try {
  const output = execSync('netstat -ano | findstr ":3000" | findstr LISTENING', { encoding: 'utf8' });
  const lines = output.trim().split('\n');
  if (lines.length > 0) {
    const pid = lines[0].trim().split(/\s+/).pop();
    console.log('Killing dashboard server PID:', pid);
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    console.log('Killed successfully');
  }
} catch(e) {
  console.log('No dashboard server running on port 3000');
}

// Step 2: Wait, then start the new server
setTimeout(() => {
  console.log('Starting dashboard server with updated server.js...');
  const child = spawn('node', ['server.js'], {
    cwd: 'C:\\Users\\kency\\perfect-dashboard',
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log('Started PID:', child.pid);

  // Step 3: Verify after 4 seconds
  setTimeout(() => {
    http.get('http://localhost:3000/', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('\n=== VERIFICATION ===');
        console.log('Status:', res.statusCode);
        console.log('Length:', data.length);
        console.log('Has AUTO-INIT:', data.includes('AUTO-INIT'));
        console.log('iframe src:', data.match(/id="claw3d-frame"[^>]*src="([^"]+)"/)?.[1] || 'not found');
        
        // Test the proxy
        http.get('http://localhost:3000/claw3d-proxy/', (proxyRes) => {
          console.log('Proxy status:', proxyRes.statusCode);
          console.log('Proxy CSP:', proxyRes.headers['content-security-policy'] || 'STRIPPED ✓');
          console.log('Proxy X-Frame:', proxyRes.headers['x-frame-options'] || 'STRIPPED ✓');
          process.exit(0);
        }).on('error', (e) => {
          console.log('Proxy error:', e.message);
          process.exit(1);
        });
      });
    }).on('error', (e) => {
      console.log('Server not ready:', e.message);
      process.exit(1);
    });
  }, 4000);
}, 2000);
