const Database = require('better-sqlite3');
const db = new Database('data/stax.db');
const rows = db.prepare("SELECT title, category, effort, potential, time_to_revenue, stax_score, confidence, description FROM opportunities WHERE created_at > datetime('now','-12 hours') ORDER BY stax_score DESC, confidence DESC LIMIT 20").all();
console.log(JSON.stringify(rows, null, 2));
