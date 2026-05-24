const { getDb } = require('../lib/db'); const db = getDb();

/**
 * Capital Deployment Module
 * 
 * ⚠️ LOCKED BY DEFAULT — This module is completely dormant until
 * the user explicitly enables it and configures access.
 * 
 * When enabled, this module can execute transactions, place bets,
 * or deploy capital within parameters set by the user.
 * 
 * The user can revoke access at any time.
 */
class CapitalDeployer {
  constructor() {
    this._config = null;
  }

  /**
   * Get current capital config.
   */
  getConfig() {
    if (!this._config) {
      this._config = db.prepare('SELECT * FROM capital_config WHERE id = 1').get();
    }
    return this._config;
  }

  /**
   * Check if capital deployment is enabled.
   */
  isEnabled() {
    const config = this.getConfig();
    return config && config.enabled === 1;
  }

  /**
   * Enable capital deployment.
   * This is the ONLY way to activate this module.
   * User must explicitly call this with their chosen parameters.
   */
  enable({ maxBetAmount = 0, maxDailyDeploy = 0, platforms = [] } = {}) {
    if (maxBetAmount <= 0) {
      return { success: false, error: 'maxBetAmount must be greater than 0' };
    }
    if (maxDailyDeploy <= 0) {
      return { success: false, error: 'maxDailyDeploy must be greater than 0' };
    }
    if (maxBetAmount > maxDailyDeploy) {
      return { success: false, error: 'maxBetAmount cannot exceed maxDailyDeploy' };
    }

    db.prepare(`
      UPDATE capital_config 
      SET enabled = 1, max_bet_amount = ?, max_daily_deploy = ?, daily_deploy_used = 0, 
          last_reset = DATE('now'), platforms = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(maxBetAmount, maxDailyDeploy, JSON.stringify(platforms));

    this._config = null; // Invalidate cache

    return {
      success: true,
      message: `Capital deployment ENABLED. Max bet: $${maxBetAmount}, Daily limit: $${maxDailyDeploy}, Platforms: ${platforms.join(', ') || 'none specified'}`
    };
  }

  /**
   * Disable capital deployment.
   * Can be called at any time to immediately lock the module.
   */
  disable() {
    db.prepare(`
      UPDATE capital_config 
      SET enabled = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();

    this._config = null;

    return { success: true, message: 'Capital deployment DISABLED. Module is now locked.' };
  }

  /**
   * Update deployment limits.
   */
  updateLimits({ maxBetAmount, maxDailyDeploy, platforms } = {}) {
    if (!this.isEnabled()) {
      return { success: false, error: 'Capital deployment is not enabled. Enable it first.' };
    }

    const config = this.getConfig();
    const newMaxBet = maxBetAmount || config.max_bet_amount;
    const newMaxDaily = maxDailyDeploy || config.max_daily_deploy;
    const newPlatforms = platforms || JSON.parse(config.platforms || '[]');

    db.prepare(`
      UPDATE capital_config 
      SET max_bet_amount = ?, max_daily_deploy = ?, platforms = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(newMaxBet, newMaxDaily, JSON.stringify(newPlatforms));

    this._config = null;

    return { success: true, message: `Limits updated. Max bet: $${newMaxBet}, Daily limit: $${newMaxDaily}` };
  }

  /**
   * Request to deploy capital for a specific opportunity.
   * Validates against limits and daily caps.
   */
  requestDeployment({ amount, platform, reason, opportunityId = null } = {}) {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: '🔒 Capital deployment is LOCKED. Use capital.enable() to activate this module.',
        action_required: 'User must explicitly enable capital deployment'
      };
    }

    const config = this.getConfig();

    // Reset daily counter if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (config.last_reset !== today) {
      db.prepare('UPDATE capital_config SET daily_deploy_used = 0, last_reset = ? WHERE id = 1').run(today);
      this._config = null;
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }
    if (amount > config.max_bet_amount) {
      return { success: false, error: `Amount $${amount} exceeds max bet $${config.max_bet_amount}` };
    }

    // Check daily limit
    const newDailyUsed = (config.daily_deploy_used || 0) + amount;
    if (newDailyUsed > config.max_daily_deploy) {
      return {
        success: false,
        error: `This would exceed your daily limit. Used: $${config.daily_deploy_used || 0}/$${config.max_daily_deploy}. Requested: $${amount}`
      };
    }

    // Check platform is allowed
    const allowedPlatforms = JSON.parse(config.platforms || '[]');
    if (allowedPlatforms.length > 0 && !allowedPlatforms.includes(platform)) {
      return { success: false, error: `Platform "${platform}" is not in allowed list: ${allowedPlatforms.join(', ')}` };
    }

    // Log the deployment request
    const { getDb } = require('../lib/db');
    const db = getDb();
    db.prepare(`INSERT INTO execution_log (opportunity_id, action, details, result) VALUES (?, ?, ?, ?)`)
      .run(opportunityId, 'capital_deploy_request', `Platform: ${platform}, Amount: $${amount}, Reason: ${reason}`, 'pending_approval');

    return {
      success: true,
      message: `Deployment request logged: $${amount} on ${platform}`,
      details: {
        amount,
        platform,
        reason,
        daily_remaining: config.max_daily_deploy - newDailyUsed,
        status: 'PENDING_USER_APPROVAL'
      },
      warning: '⚠️ This is a REQUEST. Actual fund movement requires your explicit confirmation.'
    };
  }

  /**
   * Get current deployment status.
   */
  getStatus() {
    const config = this.getConfig();
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = config.last_reset !== today;

    return {
      enabled: this.isEnabled(),
      maxBetAmount: config.max_bet_amount,
      maxDailyDeploy: config.max_daily_deploy,
      dailyUsed: isNewDay ? 0 : (config.daily_deploy_used || 0),
      dailyRemaining: isNewDay ? config.max_daily_deploy : (config.max_daily_deploy - (config.daily_deploy_used || 0)),
      platforms: JSON.parse(config.platforms || '[]'),
      lastReset: config.last_reset
    };
  }

  /**
   * Format status as readable text.
   */
  formatStatus(status) {
    const lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push('💳 CAPITAL DEPLOYMENT STATUS');
    lines.push('═══════════════════════════════════════');
    lines.push('');

    if (!status.enabled) {
      lines.push('  🔒 STATUS: LOCKED');
      lines.push('  This module is dormant and cannot deploy any capital.');
      lines.push('  Use capital.enable() to activate.');
    } else {
      lines.push('  🔓 STATUS: ENABLED');
      lines.push(`  Max Bet: $${status.maxBetAmount}`);
      lines.push(`  Daily Limit: $${status.maxDailyDeploy}`);
      lines.push(`  Daily Used: $${status.dailyUsed}`);
      lines.push(`  Daily Remaining: $${status.dailyRemaining}`);
      lines.push(`  Platforms: ${status.platforms.join(', ') || 'none configured'}`);
      lines.push('');
      lines.push('  ⚠️ All deployments require your explicit approval.');
    }

    lines.push('');
    lines.push('═══════════════════════════════════════');
    return lines.join('\n');
  }
}

module.exports = { CapitalDeployer };

