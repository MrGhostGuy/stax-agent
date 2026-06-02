const db = require('better-sqlite3')('data/stax.db');
const rows = db.prepare("SELECT title, category, effort, potential, time_to_revenue, stax_score, confidence, description FROM opportunities WHERE created_at > datetime('now','-1 hour') ORDER BY stax_score DESC, confidence DESC LIMIT 15").all();
console.log(JSON.stringify(rows, null, 2));
