# 🏗️ Stax — Autonomous Money-Making Opportunity Agent

Stax continuously scans the internet for money-making opportunities and analyzes Kalshi prediction market edges. It delivers a daily briefing with the top plays.

## Architecture

```
stax/
├── stax.js                    # Main entry point
├── package.json               # Dependencies
├── README.md                  # This file
├── lib/
│   └── db.js                  # SQLite database layer
├── modules/
│   ├── opportunity_scout.js   # Scans GitHub, Reddit, HN, trends
│   ├── kalshi_scanner.js      # Kalshi prediction market analysis
│   ├── briefing_engine.js     # Daily briefing generator
│   ├── execution_tracker.js   # Action logging & performance stats
│   └── capital_deployer.js    # 🔒 Capital deployment (LOCKED by default)
└── data/
    └── stax.db                # SQLite database (auto-created)
```

## Modules

### 1. Opportunity Scout
Scans multiple sources for money-making opportunities:
- **GitHub Trending** — Trending repos that signal market demand
- **Reddit** (r/entrepreneur, r/sideproject, r/smallbusiness, r/passive_income, r/flipper) — Pain points, gaps, "I wish there was X" posts
- **Hacker News Show HN** — Side projects with traction
- **Google Trends** — Trending search terms for content opportunities

Each opportunity is scored by ROI potential, effort level, and time-to-profit.

### 2. Kalshi Prediction Market Scanner
Monitors Kalshi markets for mispriced odds:
- Fetches active markets from Kalshi's public Gamma API
- Calculates Stax's probability estimate using category analysis, volume signals, and market structure
- Compares against market-implied probability to find edges
- Flags markets with significant edge + confidence

### 3. Daily Briefing Engine
Compiles the best opportunities and Kalshi picks into a formatted daily report.

### 4. Execution Tracker
Logs all actions, tracks which opportunities you pursued, and generates performance stats.

### 5. Capital Deployer 🔒
**LOCKED BY DEFAULT.** Can only be activated by explicit user command. When enabled:
- User sets max bet amount, daily limit, and allowed platforms
- All deployments require explicit user approval
- Can be disabled at any time

## Usage

```bash
# Install dependencies
npm install

# Run full cycle (scout + kalshi + briefing)
node stax.js

# Run individual modules
node stax.js --scout      # Opportunity scan only
node stax.js --kalshi     # Kalshi scan only
node stax.js --briefing   # Generate today's briefing
node stax.js --stats      # Show performance stats
node stax.js --status     # Full system status

# Capital deployment (locked by default)
node stax.js --capital-enable 50 500 kalshi    # Enable with $50 max bet, $500 daily, kalshi platform
node stax.js --capital-disable                 # Disable and lock
```

## Database

SQLite database at `data/stax.db` with tables:
- `opportunities` — All discovered opportunities
- `kalshi_markets` — Tracked prediction markets
- `predictions` — Stax's probability predictions
- `execution_log` — Action history
- `capital_config` — Capital deployment settings
- `daily_briefings` — Generated briefings
- `scout_sources` — Monitored sources

## Scheduling

### Option A: Built-in Scheduler (recommended)

```bash
# Start the scheduler (runs scans automatically)
node scheduler.js

# Or on Windows
double-click start.bat
```

Schedule:
- **Full scan** (scout + kalshi) every 6 hours
- **Daily briefing** at 8:00 AM CT
- **Weekly cleanup** of old records on Sunday midnight

### Option B: System Cron / Task Scheduler

Run `node stax.js` on any schedule you prefer using Windows Task Scheduler or cron.

### Option C: OpenClaw Cron

Use OpenClaw's built-in cron system to schedule Stax runs.

## Safety

- Capital deployment is **completely locked** until explicitly enabled
- No autonomous fund movement — ever, without your direct permission
- All opportunities are suggestions — you decide what to act on
- Kalshi analysis is for informational purposes — do your own research before placing bets
