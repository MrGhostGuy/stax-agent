const http = require('http');
const { execSync } = require('child_process');

// Find the dashboard server PID by checking which node process is listening on port 3000
try {
  const output = execSync('netstat -ano | findstr ":3000" | findstr LISTENING', { encoding: 'utf8' });
  const lines = output.trim().split('\n');
  if (lines.length > 0) {
    const pid = lines[0].trim().split(/\s+/).pop();
    console.log('Killing dashboard server PID:', pid);
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
  }
} catch(e) {
  console.log('No existing dashboard server found');
}

setTimeout(() => {
  // Start the dashboard server
  const { spawn } = require('child_process');
  const child = spawn('node', ['server.js'], {
    cwd: 'C:\\Users\\kency\\perfect-dashboard',
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log('Started server PID:', child.pid);
  
  // Wait and verify
  setTimeout(() => {
    http.get('http://localhost:3000/', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('Server response:', res.statusCode);
        console.log('Length:', data.length);
        console.log('Has AUTO-INIT:', data.includes('AUTO-INIT'));
        console.log('Has var officeLogs:', data.includes('var officeLogs'));
        console.log('Has onReady:', data.includes('onReady'));
        process.exit(0);
      });
    }).on('error', (e) => {
      console.log('Server not ready:', e.message);
      process.exit(1);
    });
  }, 4000);
}, 2000);
