// Helper to save cron results as deliverables
// Usage: node save-deliverable.js "Title" "category" "content"

const http = require('http');

const [,, title, category, content] = process.argv;

if (!title || !content) {
  console.error('Usage: node save-deliverable.js "Title" "category" "content"');
  process.exit(1);
}

const data = JSON.stringify({
  id: `deliverable-${Date.now()}`,
  title,
  category: category || 'general',
  content,
  source: 'cron',
  tags: ['property-search', 'sand-springs'],
  status: 'completed'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/deliverables',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Deliverable saved:', JSON.parse(body).deliverable?.id || body);
  });
});

req.on('error', (e) => {
  console.error('Error saving deliverable:', e.message);
});

req.write(data);
req.end();