const ws = require('C:\\Users\\kency\\perfect-dashboard\\node_modules\\ws');
const c = new ws('ws://localhost:3000');
c.on('open', () => { console.log('WS connected!'); c.close(); process.exit(0); });
c.on('error', (e) => { console.log('WS error:', e.message); process.exit(1); });
setTimeout(() => { console.log('Timeout'); process.exit(1); }, 5000);
