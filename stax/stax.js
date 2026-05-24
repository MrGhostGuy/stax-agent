#!/usr/bin/env node

/**
 * Stax — Autonomous Money-Making Opportunity Agent
 * 
 * Modules:
 *   1. Opportunity Scout — Scans GitHub, Reddit, HN, trends
 *   2. Kalshi Scanner — Monitors prediction markets for edges
 *   3. Briefing Engine — Compiles daily reports
 *   4. Execution Tracker — Logs actions, tracks performance
 *   5. Capital Deployer — (LOCKED) Autonomous fund deployment
 * 
 * Usage:
 *   node stax.js           — Run full cycle (scan + briefing)
 *   node stax.js --scout   — Run opportunity scan only
 *   node stax.js --kalshi  — Run Kalshi scan only
 *   node stax.js --briefing — Generate today's briefing
 *   node stax.js --stats   — Show performance stats
 *   node stax.js --status  — Show full system status
 */

const { init } = require('./lib/db');
const { OpportunityScout } = require('./modules/opportunity_scout');
const { KalshiScanner } = require('./modules/kalshi_scanner');
const { BriefingEngine } = require('./modules/briefing_engine');
const { ExecutionTracker } = require('./modules/execution_tracker');
const { CapitalDeployer } = require('./modules/capital_deployer');

async function main() {
  // Initialize database
  init();

  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  console.log('\n🏗️  STAX v1.0 — Autonomous Money-Making Agent');
  console.log('═══════════════════════════════════════════════\n');

  switch (command) {
    case '--scout':
    case 'scout': {
      const scout = new OpportunityScout();
      const results = await scout.runFullScan();
      console.log(`\nFound ${results.length} opportunities.`);
      if (results.length > 0) {
        console.log('\nTop 5:');
        results.slice(0, 5).forEach((r, i) => {
          console.log(`  ${i + 1}. [${r.roi_score.toFixed(0)}] ${r.title}`);
          console.log(`     ${r.category} | ${r.potential_revenue} | ${r.effort_level} effort`);
        });
      }
      break;
    }

    case '--kalshi':
    case 'kalshi': {
      const scanner = new KalshiScanner();
      const results = await scanner.runFullScan();
      const flagged = results.filter(r => r.edge > 0.08 && r.confidence > 45);
      console.log(`\nAnalyzed ${results.length} markets, ${flagged.length} flagged.`);
      if (flagged.length > 0) {
        console.log('\nTop Edges:');
        flagged.slice(0, 5).forEach((r, i) => {
          const dir = r.edge_direction === 'yes' ? '📈 YES' : '📉 NO';
          console.log(`  ${i + 1}. ${r.title}`);
          console.log(`     Edge: ${(r.edge * 100).toFixed(1)}% ${dir} | Confidence: ${r.confidence.toFixed(0)}%`);
          console.log(`     Market: ${(r.market_implied_prob * 100).toFixed(1)}% → Stax: ${(r.stax_probability * 100).toFixed(1)}%`);
        });
      }
      break;
    }

    case '--briefing':
    case 'briefing': {
      const engine = new BriefingEngine();
      const briefing = engine.generateBriefing();
      const text = engine.formatBriefingText(briefing);
      console.log(text);
      break;
    }

    case '--stats':
    case 'stats': {
      const tracker = new ExecutionTracker();
      const stats = tracker.getStats();
      console.log(tracker.formatStats(stats));
      break;
    }

    case '--status':
    case 'status': {
      const tracker = new ExecutionTracker();
      const stats = tracker.getStats();
      const capital = new CapitalDeployer();
      const capStatus = capital.getStatus();

      console.log(tracker.formatStats(stats));
      console.log('\n');
      console.log(capital.formatStatus(capStatus));
      break;
    }

    case '--capital-enable': {
      const capital = new CapitalDeployer();
      const maxBet = parseFloat(args[1]) || 0;
      const maxDaily = parseFloat(args[2]) || 0;
      const platforms = args.slice(3);
      const result = capital.enable({ maxBetAmount: maxBet, maxDailyDeploy: maxDaily, platforms });
      console.log(result.success ? `✅ ${result.message}` : `❌ ${result.error}`);
      break;
    }

    case '--capital-disable': {
      const capital = new CapitalDeployer();
      const result = capital.disable();
      console.log(`🔒 ${result.message}`);
      break;
    }

    case 'full':
    default: {
      // Full cycle: scout + kalshi + briefing
      console.log('Running full Stax cycle...\n');

      // 1. Opportunity Scout
      const scout = new OpportunityScout();
      const opportunities = await scout.runFullScan();

      // 2. Kalshi Scanner
      const scanner = new KalshiScanner();
      const kalshiResults = await scanner.runFullScan();
      const flagged = kalshiResults.filter(r => r.edge > 0.08 && r.confidence > 45);

      // 3. Generate Briefing
      const engine = new BriefingEngine();
      const briefing = engine.generateBriefing();
      const text = engine.formatBriefingText(briefing);
      console.log(text);

      // 4. Show stats
      const tracker = new ExecutionTracker();
      const stats = tracker.getStats();
      console.log(`\n📊 Total tracked: ${stats.opportunities.total} opportunities, ${stats.kalshi.edgesFound} Kalshi edges`);
      break;
    }
  }

  console.log('\n🏗️  Stax cycle complete.\n');
}

main().catch(err => {
  console.error('[Stax] Fatal error:', err);
  process.exit(1);
});

