const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET'
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const checks = [
      ['page-memory', body.includes('page-memory')],
      ['mem-panel-memory', body.includes('mem-panel-memory')],
      ['memory-content', body.includes('memory-content')],
      ['daily-files-list', body.includes('daily-files-list')],
      ['chat-history-list', body.includes('chat-history-list')],
      ['task-history-list', body.includes('task-history-list')],
      ['deliverables-list', body.includes('deliverables-list')],
      ['mem-projects-list', body.includes('mem-projects-list')],
      ['search-results-list', body.includes('search-results-list')],
      ['jorm-avatar', body.includes('jorm-avatar')],
      ['mem-tab-search', body.includes('mem-tab-search')],
      ['loadMemoryData', body.includes('loadMemoryData')],
      ['switchMemTab', body.includes('switchMemTab')],
      ['mem-search-bar', body.includes('mem-search-bar')],
      ['mem-stats', body.includes('mem-stats')],
      ['mem-tabs', body.includes('mem-tabs')],
      ['mem-content', body.includes('mem-content')]
    ];
    let pass = 0, fail = 0;
    checks.forEach(([name, found]) => {
      if (found) { console.log('OK   ' + name); pass++; }
      else { console.log('FAIL ' + name); fail++; }
    });
    console.log('\n' + pass + ' passed, ' + fail + ' failed');
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.end();
