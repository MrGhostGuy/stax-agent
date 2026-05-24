const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

let db;

function init() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'stax.db');
  db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = DELETE');
  db.exec('PRAGMA foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      potential_revenue TEXT,
      effort_level TEXT CHECK(effort_level IN ('low', 'medium', 'high')),
      time_to_profit TEXT,
      confidence_score REAL DEFAULT 0.0,
      roi_score REAL DEFAULT 0.0,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'researching', 'actioned', 'dismissed', 'expired')),
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kalshi_markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      yes_bid REAL,
      yes_ask REAL,
      no_bid REAL,
      no_ask REAL,
      last_price REAL,
      volume REAL,
      status TEXT,
      stax_probability REAL,
      edge_score REAL DEFAULT 0.0,
      confidence REAL DEFAULT 0.0,
      analysis TEXT,
      flagged INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id TEXT NOT NULL,
      stax_probability REAL NOT NULL,
      market_implied_prob REAL,
      edge REAL,
      confidence REAL,
      recommendation TEXT CHECK(recommendation IN ('strong_yes', 'lean_yes', 'neutral', 'lean_no', 'strong_no')),
      reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (market_id) REFERENCES kalshi_markets(market_id)
    );

    CREATE TABLE IF NOT EXISTS execution_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
    );

    CREATE TABLE IF NOT EXISTS capital_config (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      enabled INTEGER DEFAULT 0,
      max_bet_amount REAL DEFAULT 0,
      max_daily_deploy REAL DEFAULT 0,
      daily_deploy_used REAL DEFAULT 0,
      last_reset DATE,
      platforms TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      opportunities_found INTEGER DEFAULT 0,
      kalshi_edges_found INTEGER DEFAULT 0,
      top_opportunities TEXT,
      top_kalshi_picks TEXT,
      summary TEXT,
      delivered INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scout_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT,
      url TEXT,
      last_scanned DATETIME,
      status TEXT DEFAULT 'active',
      scan_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
    CREATE INDEX IF NOT EXISTS idx_opportunities_score ON opportunities(roi_score DESC);
    CREATE INDEX IF NOT EXISTS idx_kalshi_edge ON kalshi_markets(edge_score DESC);
    CREATE INDEX IF NOT EXISTS idx_kalshi_flagged ON kalshi_markets(flagged);
  `);

  // Insert default capital config if not exists
  const existing = db.prepare('SELECT id FROM capital_config WHERE id = 1').get();
  if (!existing) {
    db.prepare('INSERT INTO capital_config (id) VALUES (1)').run();
  }

  return db;
}

function getDb() {
  if (!db) {
    return init();
  }
  return db;
}

module.exports = { init, getDb, db: () => db };
