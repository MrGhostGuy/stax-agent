const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\kency\\Desktop\\qr-generator';
const server = http.createServer((req, res) => {
  let filePath = path.join(dir, req.url === '/' ? 'index_fixed.html' : req.url);
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  const contentType = types[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(9191, () => {
  console.log('QR Generator server running at http://localhost:9191');
});
