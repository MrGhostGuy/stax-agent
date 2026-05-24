const http = require('http');
http.get('http://localhost:3002/', (res) => {
    console.log('Status:', res.statusCode);
    console.log('CSP:', res.headers['content-security-policy'] || 'none');
    console.log('X-Frame-Options:', res.headers['x-frame-options'] || 'none');
    res.on('data', () => {});
    res.on('end', () => process.exit(0));
});
