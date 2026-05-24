const { execSync } = require('child_process');
try {
  execSync('taskkill /F /IM node.exe', { stdio: 'ignore' });
  console.log('Killed all node processes');
} catch(e) { console.log('No node processes to kill'); }

setTimeout(() => {
  const { spawn } = require('child_process');
  const child = spawn('node', ['server.js'], {
    cwd: 'C:\\Users\\kency\\perfect-dashboard',
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log('Started server PID:', child.pid);
  
  setTimeout(() => {
    const http = require('http');
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
  }, 3000);
}, 2000);
