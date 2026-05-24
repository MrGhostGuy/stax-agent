#!/usr/bin/env node

/**
 * Stax Scheduler — Runs scans on a schedule using node-cron.
 * 
 * Schedule:
 *   - Full scan (scout + kalshi) every 6 hours
 *   - Daily briefing at 8:00 AM
 *   - Stats cleanup (old records) weekly
 */

const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const { BriefingEngine } = require('./modules/briefing_engine');
const config = require('./modules/config');

const staxPath = path.join(__dirname, 'stax.js');

function runStax(args, label) {
  return new Promise((resolve) => {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] Starting: ${label}`);
    
    const proc = spawn('node', [staxPath, ...args], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    proc.on('close', (code) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[${new Date().toISOString()}] Finished: ${label} (exit ${code}, ${elapsed}s)`);
      if (code !== 0) {
        console.error(`  stderr: ${stderr.slice(0, 500)}`);
      }
      resolve({ code, stdout, stderr });
    });
  });
}

// Every 6 hours: full scan
const scanJob = cron.schedule('0 */6 * * *', async () => {
  await runStax([], 'Full Scan Cycle');
}, { timezone: 'America/Chicago' });

// Daily at 8:00 AM: briefing with Discord delivery
const briefingJob = cron.schedule('0 8 * * *', async () => {
  await runStax(['--briefing'], 'Daily Briefing');
  
  // Deliver to Discord if configured
  if (config.discordWebhook) {
    const engine = new BriefingEngine();
    const result = await engine.deliverToDiscord(config.discordWebhook);
    console.log(`[Discord] Delivered briefing: ${result.success ? 'ok' : result.error}`);
  }
}, { timezone: 'America/Chicago' });

// Weekly on Sunday at midnight: cleanup old records
const cleanupJob = cron.schedule('0 0 * * 0', async () => {
  const { getDb } = require('./lib/db');
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const expired = db.prepare("UPDATE opportunities SET status = 'expired' WHERE created_at < ? AND status = 'new'").run(thirtyDaysAgo);
  const oldLogs = db.prepare('DELETE FROM execution_log WHERE created_at < ?').run(thirtyDaysAgo);
  
  console.log(`[Cleanup] Expired ${expired.changes} old opportunities, removed ${oldLogs.changes} old log entries`);
}, { timezone: 'America/Chicago' });

console.log('🏗️  Stax Scheduler started');
console.log('   Full scan: every 6 hours');
console.log('   Daily briefing: 8:00 AM CT');
if (config.discordWebhook) {
  console.log('   Discord delivery: ENABLED');
} else {
  console.log('   Discord: Set STAX_DISCORD_WEBHOOK env var to enable');
}
console.log('   Weekly cleanup: Sunday midnight CT');
console.log('');

// Run an immediate scan on startup
runStax([], 'Startup Scan').then(() => {
  console.log('\n🏗️  Startup scan complete. Scheduler is now running.\n');
  
  // Deliver to Discord if configured
  if (config.discordWebhook) {
    const engine = new BriefingEngine();
    engine.deliverToDiscord(config.discordWebhook).then(result => {
      console.log(`[Discord] Startup briefing: ${result.success ? 'delivered' : result.error}`);
    });
  }
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n🏗️  Stax Scheduler shutting down.');
  scanJob.stop();
  briefingJob.stop();
  cleanupJob.stop();
  process.exit(0);
});