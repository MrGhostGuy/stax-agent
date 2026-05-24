const http = require('http');
http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // Check iframe src
    const iframeMatch = data.match(/id="claw3d-frame"[^>]*src="([^"]+)"/);
    console.log('iframe src:', iframeMatch ? iframeMatch[1] : 'not found');
    
    // Check claw3d-proxy in any form
    console.log('Has claw3d-proxy:', data.includes('claw3d-proxy'));
    
    // Check the proxy route in server.js
    const fs = require('fs');
    const server = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\server.js', 'utf8');
    console.log('Server has proxy route:', server.includes('/claw3d-proxy'));
    console.log('Server has CSP stripping:', server.includes('content-security-policy'));
    
    process.exit(0);
  });
}).on('error', (e) => { console.log('Error:', e.message); process.exit(1); });
