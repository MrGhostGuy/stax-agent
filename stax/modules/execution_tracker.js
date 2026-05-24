const { getDb } = require('../lib/db'); const db = getDb();

/**
 * Execution Tracker
 * Logs all actions taken, learns from user choices,
 * and tracks performance of past opportunities.
 */
class ExecutionTracker {
  constructor() {}

  /**
   * Log an action taken on an opportunity.
   */
  logAction(opportunityId, action, details = '', result = '') {
    return db.prepare(`
      INSERT INTO execution_log (opportunity_id, action, details, result)
      VALUES (?, ?, ?, ?)
    `).run(opportunityId, action, details, result);
  }

  /**
   * Mark an opportunity as actioned.
   */
  markActioned(opportunityId) {
    db.prepare(`UPDATE opportunities SET status = 'actioned', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(opportunityId);
    this.logAction(opportunityId, 'actioned', 'User chose to pursue this opportunity');
  }

  /**
   * Mark an opportunity as dismissed.
   */
  markDismissed(opportunityId, reason = '') {
    db.prepare(`UPDATE opportunities SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(opportunityId);
    this.logAction(opportunityId, 'dismissed', reason || 'User dismissed this opportunity');
  }

  /**
   * Mark an opportunity as being researched.
   */
  markResearching(opportunityId) {
    db.prepare(`UPDATE opportunities SET status = 'researching', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(opportunityId);
    this.logAction(opportunityId, 'researching', 'User is researching this opportunity');
  }

  /**
   * Get execution history.
   */
  getHistory(limit = 50) {
    return db.prepare(`
      SELECT e.*, o.title as opportunity_title, o.category, o.source
      FROM execution_log e
      LEFT JOIN opportunities o ON e.opportunity_id = o.id
      ORDER BY e.created_at DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Get performance stats.
   */
  getStats() {
    const totalOpps = db.prepare('SELECT COUNT(*) as count FROM opportunities').get();
    const actioned = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE status = 'actioned'").get();
    const dismissed = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE status = 'dismissed'").get();
    const researching = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE status = 'researching'").get();
    const newOpps = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE status = 'new'").get();
    const kalshiEdges = db.prepare('SELECT COUNT(*) as count FROM kalshi_markets WHERE flagged = 1').get();
    const totalPredictions = db.prepare('SELECT COUNT(*) as count FROM predictions').get();

    // Category breakdown
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count, AVG(roi_score) as avg_score
      FROM opportunities
      GROUP BY category
      ORDER BY count DESC
    `).all();

    // Source breakdown
    const sources = db.prepare(`
      SELECT source, COUNT(*) as count, AVG(roi_score) as avg_score
      FROM opportunities
      GROUP BY source
      ORDER BY count DESC
    `).all();

    return {
      opportunities: {
        total: totalOpps.count,
        new: newOpps.count,
        researching: researching.count,
        actioned: actioned.count,
        dismissed: dismissed.count,
        actionRate: totalOpps.count > 0 ? ((actioned.count / totalOpps.count) * 100).toFixed(1) + '%' : '0%'
      },
      kalshi: {
        edgesFound: kalshiEdges.count,
        totalPredictions: totalPredictions.count
      },
      categories,
      sources
    };
  }

  /**
   * Format stats as readable text.
   */
  formatStats(stats) {
    const lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push('📈 STAX PERFORMANCE STATS');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`Opportunities Tracked: ${stats.opportunities.total}`);
    lines.push(`  🆕 New: ${stats.opportunities.new}`);
    lines.push(`  🔍 Researching: ${stats.opportunities.researching}`);
    lines.push(`  ✅ Actioned: ${stats.opportunities.actioned}`);
    lines.push(`  ❌ Dismissed: ${stats.opportunities.dismissed}`);
    lines.push(`  📊 Action Rate: ${stats.opportunities.actionRate}`);
    lines.push('');
    lines.push(`Kalshi Edges Found: ${stats.kalshi.edgesFound}`);
    lines.push(`Total Predictions: ${stats.kalshi.totalPredictions}`);
    lines.push('');

    if (stats.categories.length > 0) {
      lines.push('📂 By Category:');
      for (const cat of stats.categories) {
        lines.push(`  ${cat.category}: ${cat.count} (avg score: ${cat.avg_score?.toFixed?.(1) || 'N/A'})`);
      }
      lines.push('');
    }

    if (stats.sources.length > 0) {
      lines.push('📡 By Source:');
      for (const src of stats.sources) {
        lines.push(`  ${src.source}: ${src.count} (avg score: ${src.avg_score?.toFixed?.(1) || 'N/A'})`);
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════');
    return lines.join('\n');
  }
}

module.exports = { ExecutionTracker };

