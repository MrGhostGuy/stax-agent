const http = require('http');
http.get('http://localhost:3000/', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Length:', data.length);
    console.log('Has AUTO-INIT:', data.includes('AUTO-INIT'));
    console.log('Has var officeLogs:', data.includes('var officeLogs'));
    console.log('Has onReady:', data.includes('onReady'));
    console.log('Has BOM:', data.charCodeAt(0) === 0xFEFF);
    
    // Check for the specific bug fixes
    const jsMatch = data.match(/<script>([\s\S]+?)<\/script>/);
    if (jsMatch) {
      const js = jsMatch[1];
      console.log('\nJS checks:');
      console.log('officeLogs declared as var:', /var officeLogs/.test(js));
      console.log('officeComms declared as var:', /var officeComms/.test(js));
      console.log('agentPositions declared as var:', /var agentPositions/.test(js));
      console.log('subagentData declared as var:', /var subagentData/.test(js));
      console.log('lrnr in destructuring:', /var\[ar,tr,sr,sysr,lr,cr,lrnr,fr,dr\]/.test(js));
      console.log('init is function:', /function init\(\)/.test(js));
      console.log('connectWS is function:', /function connectWS\(\)/.test(js));
      console.log('navTo is function:', /function navTo\(page\)/.test(js));
      console.log('sendChat is function:', /async function sendChat\(\)/.test(js));
      console.log('claw3d-proxy in iframe:', /claw3d-proxy/.test(js));
    }
    process.exit(0);
  });
}).on('error', (e) => { console.log('Error:', e.message); process.exit(1); });
