const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/?v=' + Date.now(),
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
};
http.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const hasOfficeLogs = data.includes('let officeLogs');
    const hasOnReady = data.includes('onReady');
    const hasInit = data.includes('function init()');
    console.log('Length:', data.length);
    console.log('Has officeLogs declaration:', hasOfficeLogs);
    console.log('Has onReady:', hasOnReady);
    console.log('Has init:', hasInit);
    
    // Check if officeLogs is declared before storeAgentLog
    const officeLogsPos = data.indexOf('let officeLogs');
    const storeAgentLogPos = data.indexOf('function storeAgentLog');
    console.log('officeLogs position:', officeLogsPos);
    console.log('storeAgentLog position:', storeAgentLogPos);
    console.log('officeLogs BEFORE storeAgentLog:', officeLogsPos < storeAgentLogPos);
  });
}).on('error', (e) => console.log('Error:', e.message));
