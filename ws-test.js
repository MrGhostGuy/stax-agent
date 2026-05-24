const ws = require('C:\\Users\\kency\\perfect-dashboard\\node_modules\\ws');
const c = new ws('ws://localhost:3000');
c.on('open', () => { console.log('WS connected!'); c.close(); });
c.on('error', (e) => { console.log('WS error:', e.message); });
setTimeout(() => { console.log('timeout - WS state:', c.readyState); process.exit(0); }, 5000);
