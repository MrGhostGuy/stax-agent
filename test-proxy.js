const http = require('http');
http.get('http://localhost:3000/claw3d-proxy/', (res) => {
    console.log('Status:', res.statusCode);
    console.log('CSP:', res.headers['content-security-policy'] || 'STRIPPED');
    console.log('X-Frame-Options:', res.headers['x-frame-options'] || 'STRIPPED');
    res.on('data', () => {});
    res.on('end', () => process.exit(0));
}).on('error', (e) => { console.log('Error:', e.message); process.exit(1); });
