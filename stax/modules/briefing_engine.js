const { getDb } = require('../lib/db');
const db = getDb();

/**
 * Discord webhook for briefing delivery
 */
async function sendToDiscord(content, webhookUrl) {
  if (!webhookUrl) return { success: false, error: 'No webhook URL configured' };
  
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return { success: res.ok, status: res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates prioritized suggestions based on opportunity scores
 */
function generateSuggestions(opportunities, kalshiPicks) {
  const suggestions = [];
  
  // High-confidence opportunities (score > 80)
  const hotOps = opportunities.filter(op => (op.roi_score || 0) > 80);
  if (hotOps.length > 0) {
    suggestions.push(`🚨 ACT NOW: ${hotOps[0].title} - High probability play (${(hotOps[0].roi_score || 0).toFixed(0)}/100 score)`);
  }
  
  // Quick wins (low effort + high score)
  const quickWins = opportunities.filter(op => 
    op.effort_level === 'low' && (op.roi_score || 0) > 70
  );
  if (quickWins.length > 0) {
    suggestions.push(`⚡ QUICK WIN: ${quickWins[0].title} - Low effort, fast payoff (${(quickWins[0].roi_score || 0).toFixed(0)}/100 score)`);
  }
  
  // Kalshi strong recommendations
  const strongPicks = kalshiPicks.filter(p => p.recommendation?.includes('strong'));
  if (strongPicks.length > 0) {
    const direction = strongPicks[0].recommendation?.includes('yes') ? 'YES' : strongPicks[0].recommendation?.includes('no') ? 'NO' : 'CHECK';
    suggestions.push(`🔥 KALSHI EDGE: ${strongPicks[0].title} - Place ${direction} bet (${(strongPicks[0].edge_score * 100).toFixed(1)}% edge)`);
  }
  
  return suggestions.slice(0, 3);
}

/**
 * Daily Briefing Engine
 * Compiles and delivers a daily report of top opportunities
 * and Kalshi prediction market picks.
 */
class BriefingEngine {
  constructor() {
    this.date = new Date().toISOString().split('T')[0];
  }

  /**
   * Generate today's briefing.
   */
  generateBriefing() {
    const opportunities = this._getTopOpportunities(5);
    const kalshiPicks = this._getTopKalshiPicks(5);
    const summary = this._generateSummary(opportunities, kalshiPicks);

    const briefing = {
      date: this.date,
      opportunities_found: opportunities.length,
      kalshi_edges_found: kalshiPicks.length,
      top_opportunities: opportunities,
      top_kalshi_picks: kalshiPicks,
      summary,
      suggestions: generateSuggestions(opportunities, kalshiPicks)
    };

    // Store in DB
    db.prepare(`
      INSERT OR REPLACE INTO daily_briefings 
        (date, opportunities_found, kalshi_edges_found, top_opportunities, top_kalshi_picks, summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      this.date,
      briefing.opportunities_found,
      briefing.kalshi_edges_found,
      JSON.stringify(briefing.top_opportunities),
      JSON.stringify(briefing.top_kalshi_picks),
      summary
    );

    return briefing;
  }

  /**
   * Deliver briefing to Discord.
   */
  async deliverToDiscord(webhookUrl) {
    const briefing = this.getLatestBriefing();
    if (!briefing) return { success: false, error: 'No briefing found' };
    
    const text = this.formatBriefingText({
      date: briefing.date,
      top_opportunities: JSON.parse(briefing.top_opportunities || '[]'),
      top_kalshi_picks: JSON.parse(briefing.top_kalshi_picks || '[]'),
      summary: briefing.summary
    });
    
    const result = await sendToDiscord(text, webhookUrl);
    if (result.success) {
      this.markDelivered(briefing.date);
    }
    return result;
  }

  /**
   * Format briefing as a readable string for Discord/chat delivery.
   */
  formatBriefingText(briefing) {
    const lines = [];
    const now = new Date();
    lines.push('═══════════════════════════════════════');
    lines.push(`📊 STAX DAILY BRIEFING — ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    lines.push('═══════════════════════════════════════');
    lines.push('');

    // --- Opportunities Section ---
    lines.push('💰 TOP OPPORTUNITIES');
    lines.push('─────────────────────────────────────');
    if (briefing.top_opportunities.length === 0) {
      lines.push('  No new opportunities found today.');
    } else {
      briefing.top_opportunities.forEach((op, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        lines.push(`  ${medal} ${op.title}`);
        lines.push(`     Category: ${op.category || 'general'} | Effort: ${op.effort_level || 'unknown'}`);
        lines.push(`     Potential: ${op.potential_revenue || 'unknown'} | Time: ${op.time_to_profit || 'unknown'}`);
        lines.push(`     Stax Score: ${op.roi_score?.toFixed?.(0) || '?'}/100 | Confidence: ${op.confidence_score?.toFixed?.(0) || '?'}%`);
        if (op.description) {
          lines.push(`     ${op.description.substring(0, 120)}`);
        }
        lines.push('');
      });
    }

    // --- Kalshi Section ---
    lines.push('');
    lines.push('🎯 KALSHI PREDICTION MARKET PICKS');
    lines.push('─────────────────────────────────────');
    if (briefing.top_kalshi_picks.length === 0) {
      lines.push('  No significant edges found today.');
    } else {
      briefing.top_kalshi_picks.forEach((pick, i) => {
        const recEmoji = pick.recommendation?.includes('strong') ? '🔥' : pick.recommendation?.includes('lean') ? '👀' : '➖';
        const direction = pick.recommendation?.includes('yes') ? 'YES' : pick.recommendation?.includes('no') ? 'NO' : 'NEUTRAL';
        lines.push(`  ${recEmoji} ${pick.title}`);
        lines.push(`     Market: ${((pick.market_implied_prob || 0) * 100).toFixed(1)}% → Stax: ${((pick.stax_probability || 0) * 100).toFixed(1)}%`);
        lines.push(`     Edge: ${((pick.edge_score || 0) * 100).toFixed(1)}% | Direction: ${direction} | Confidence: ${(pick.confidence || 0).toFixed(0)}%`);
        lines.push(`     Volume: ${(pick.volume || 0).toLocaleString()}`);
        lines.push('');
      });
    }

    // --- Suggestions ---
    const suggestions = generateSuggestions(briefing.top_opportunities, briefing.top_kalshi_picks);
    if (suggestions.length > 0) {
      lines.push('');
      lines.push('💡 SUGGESTIONS (High Probability Plays)');
      lines.push('─────────────────────────────────────');
      suggestions.forEach(s => lines.push(`  ${s}`));
    }

    // --- Summary ---
    lines.push('');
    lines.push('📋 SUMMARY');
    lines.push('─────────────────────────────────────');
    lines.push(`  ${briefing.summary}`);
    lines.push('');
    lines.push('═══════════════════════════════════════');
    lines.push('Reply with action numbers to execute, or "dismiss" to clear.');
    lines.push('═══════════════════════════════════════');

    return lines.join('\n');
  }

  _getTopOpportunities(limit) {
    return db.prepare(`
      SELECT * FROM opportunities 
      WHERE status = 'new' 
      ORDER BY roi_score DESC 
      LIMIT ?
    `).all(limit);
  }

  _getTopKalshiPicks(limit) {
    return db.prepare(`
      SELECT * FROM kalshi_markets 
      WHERE flagged = 1 
      ORDER BY edge_score DESC, confidence DESC 
      LIMIT ?
    `).all(limit);
  }

  _generateSummary(opportunities, kalshiPicks) {
    const parts = [];
    if (opportunities.length > 0) {
      parts.push(`${opportunities.length} new money-making opportunities found.`);
      const top = opportunities[0];
      parts.push(`Top pick: "${top.title}" (Score: ${top.roi_score?.toFixed?.(0)}/100).`);
    } else {
      parts.push('No new opportunities today.');
    }

    if (kalshiPicks.length > 0) {
      parts.push(`${kalshiPicks.length} Kalshi edges detected.`);
      const top = kalshiPicks[0];
      parts.push(`Best edge: "${top.title}" (${(top.edge_score * 100).toFixed(1)}% edge).`);
    } else {
      parts.push('No significant Kalshi edges today.');
    }

    return parts.join(' ');
  }

  /**
   * Get the latest briefing from DB.
   */
  getLatestBriefing() {
    return db.prepare('SELECT * FROM daily_briefings ORDER BY date DESC LIMIT 1').get();
  }

  /**
   * Mark briefing as delivered.
   */
  markDelivered(date) {
    db.prepare('UPDATE daily_briefings SET delivered = 1 WHERE date = ?').run(date || this.date);
  }
}

module.exports = { BriefingEngine };