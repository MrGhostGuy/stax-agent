/**
 * Stax Configuration
 * 
 * Loads settings from environment variables with sensible defaults.
 */

const config = {
  // Discord webhook URL for briefing delivery
  // Set via STAX_DISCORD_WEBHOOK env var
  discordWebhook: process.env.STAX_DISCORD_WEBHOOK || null,

  // Kalshi API base URL
  kalshiBaseUrl: 'https://gamma-api.kalshi.com',

  // Scan settings
  scanInterval: '0 */6 * * *',  // Every 6 hours
  briefingTime: '0 8 * * *',    // 8:00 AM daily
  cleanupTime: '0 0 * * 0',     // Sunday midnight

  // Opportunity scoring thresholds
  minRoiScore: 30,
  minKalshiEdge: 0.08,
  minKalshiConfidence: 45,

  // Data retention (days)
  dataRetentionDays: 30,

  // Timezone
  timezone: 'America/Chicago',
};

module.exports = config;
