const { getDb } = require('../lib/db'); const db = getDb();

/**
 * Kalshi Prediction Market Scanner
 * Monitors Kalshi markets for mispriced odds and betting edges.
 * 
 * Kalshi API docs: https://docs.kalshi.com/
 * Public Gamma API for market data.
 */
class KalshiScanner {
  constructor() {
    this.baseUrl = 'https://gamma-api.kalshi.com';
    this.eventUrl = 'https://gamma-api.kalshi.com/events';
    this.marketsUrl = 'https://gamma-api.kalshi.com/markets';
  }

  /**
   * Fetch active markets from Kalshi.
   */
  async fetchMarkets(limit = 100, status = 'active') {
    try {
      const url = `${this.marketsUrl}?limit=${limit}&status=${status}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Stax-Agent/1.0' }
      });
      if (!res.ok) throw new Error(`Kalshi API: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log('[Kalshi] Fetch markets error:', err.message);
      return [];
    }
  }

  /**
   * Fetch events with their markets.
   */
  async fetchEvents(limit = 50) {
    try {
      const url = `${this.eventUrl}?limit=${limit}&active=true&closed=false`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Stax-Agent/1.0' }
      });
      if (!res.ok) throw new Error(`Kalshi Events API: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log('[Kalshi] Fetch events error:', err.message);
      return [];
    }
  }

  /**
   * Fetch detailed market data including orderbook.
   */
  async fetchMarketDetail(ticker) {
    try {
      const url = `${this.marketsUrl}/${ticker}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Stax-Agent/1.0' }
      });
      if (!res.ok) throw new Error(`Kalshi Market API: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log(`[Kalshi] Fetch ${ticker} error:`, err.message);
      return null;
    }
  }

  /**
   * Analyze a market for edge.
   * Compares market-implied probability against Stax's calculated probability.
   * 
   * Edge = |stax_probability - market_implied_probability|
   * Positive edge means the market is mispriced in our favor.
   */
  analyzeMarket(market) {
    const yesBid = market.yes_bid || 0;
    const yesAsk = market.yes_ask || 0;
    const noBid = market.no_bid || 0;
    const noAsk = market.no_ask || 0;
    const lastPrice = market.last_trade_price || 0;
    const volume = market.volume || 0;
    const title = market.title || '';
    const subtitle = market.subtitle || '';

    // Market implied probability (midpoint of yes bid/ask)
    const marketYesProb = yesBid > 0 && yesAsk > 0
      ? (yesBid + yesAsk) / 2 / 100
      : lastPrice > 0 ? lastPrice / 100 : 0.5;

    // Stax's calculated probability based on analysis
    const staxProb = this._calculateProbability(market);

    // Edge is the difference
    const edge = staxProb - marketYesProb;

    // Confidence based on data quality and volume
    const confidence = this._calculateConfidence(market, volume);

    // Recommendation
    let recommendation = 'neutral';
    if (edge > 0.1 && confidence > 50) recommendation = 'strong_yes';
    else if (edge > 0.05 && confidence > 40) recommendation = 'lean_yes';
    else if (edge < -0.1 && confidence > 50) recommendation = 'strong_no';
    else if (edge < -0.05 && confidence > 40) recommendation = 'lean_no';

    return {
      market_id: market.ticker || market.id,
      title,
      subtitle,
      yes_bid: yesBid,
      yes_ask: yesAsk,
      no_bid: noBid,
      no_ask: noAsk,
      last_price: lastPrice,
      volume,
      market_implied_prob: marketYesProb,
      stax_probability: staxProb,
      edge: Math.abs(edge),
      edge_direction: edge > 0 ? 'yes' : 'no',
      confidence,
      recommendation,
      reasoning: this._generateReasoning(market, staxProb, marketYesProb, edge)
    };
  }

  /**
   * Calculate probability for a market outcome.
   * Uses multiple signals: market structure, volume, category analysis.
   */
  _calculateProbability(market) {
    const title = (market.title || '').toLowerCase();
    const subtitle = (market.subtitle || '').toLowerCase();
    const combined = `${title} ${subtitle}`;
    const volume = market.volume || 0;
    const yesBid = market.yes_bid || 0;
    const yesAsk = market.yes_ask || 0;

    // Start with market midpoint as baseline
    let prob = yesBid > 0 && yesAsk > 0
      ? (yesBid + yesAsk) / 2 / 100
      : 0.5;

    // --- Category-based adjustments ---

    // Sports markets: check for heavy favorites
    if (combined.includes('win') || combined.includes('beat') || combined.includes('defeat')) {
      // Look for heavy favorite indicators
      if (combined.includes('vs') || combined.includes('over') || combined.includes('under')) {
        // Slight lean toward market price for sports (efficient market)
        prob = prob * 0.95 + 0.5 * 0.05;
      }
    }

    // Political markets: incumbency advantage
    if (combined.includes('election') || combined.includes('president') || combined.includes('vote') || combined.includes('win the')) {
      if (combined.includes('incumbent') || combined.includes('re-election')) {
        prob = Math.min(0.85, prob + 0.05);
      }
    }

    // Economic/macro markets
    if (combined.includes('fed') || combined.includes('interest rate') || combined.includes('inflation') || combined.includes('gdp')) {
      // Markets tend to underprice Fed decisions — slight mean reversion
      if (combined.includes('raise') || combined.includes('increase')) {
        prob = prob * 0.9 + 0.5 * 0.1;
      }
    }

    // Weather/natural events
    if (combined.includes('hurricane') || combined.includes('temperature') || combined.includes('snow') || combined.includes('rain')) {
      // Weather markets are generally efficient, stay close to market price
      prob = prob * 0.95 + 0.5 * 0.05;
    }

    // Volume-based confidence adjustment
    // Higher volume = more efficient market = trust market price more
    if (volume > 100000) {
      prob = prob * 0.7 + (yesBid > 0 && yesAsk > 0 ? (yesBid + yesAsk) / 2 / 100 : 0.5) * 0.3;
    } else if (volume < 1000) {
      // Low volume = potentially mispriced = more weight on our analysis
      prob = prob * 0.8 + 0.5 * 0.2;
    }

    // Time-based: markets close to resolution tend to be more accurate
    // (This would need event date data from the API)

    return Math.max(0.05, Math.min(0.95, prob));
  }

  /**
   * Calculate confidence in our analysis.
   */
  _calculateConfidence(market, volume) {
    let confidence = 40; // Base confidence

    // Volume increases confidence (more data)
    if (volume > 50000) confidence += 15;
    else if (volume > 10000) confidence += 10;
    else if (volume > 1000) confidence += 5;
    else confidence -= 10;

    // Spread tightness (tight spread = more efficient = higher confidence in market price)
    const yesBid = market.yes_bid || 0;
    const yesAsk = market.yes_ask || 0;
    if (yesBid > 0 && yesAsk > 0) {
      const spread = yesAsk - yesBid;
      if (spread < 5) confidence += 10;
      else if (spread < 10) confidence += 5;
      else confidence -= 5;
    }

    // Category familiarity
    const title = (market.title || '').toLowerCase();
    const familiarCategories = ['sports', 'politics', 'economy', 'weather', 'crypto', 'tech'];
    for (const cat of familiarCategories) {
      if (title.includes(cat)) { confidence += 5; break; }
    }

    return Math.max(10, Math.min(90, confidence));
  }

  /**
   * Generate human-readable reasoning for the analysis.
   */
  _generateReasoning(market, staxProb, marketProb, edge) {
    const parts = [];
    const title = market.title || 'Unknown market';
    const volume = market.volume || 0;

    parts.push(`Market: "${title}"`);
    parts.push(`Market implied probability: ${(marketProb * 100).toFixed(1)}%`);
    parts.push(`Stax calculated probability: ${(staxProb * 100).toFixed(1)}%`);
    parts.push(`Edge: ${(Math.abs(edge) * 100).toFixed(1)}% ${edge > 0 ? 'in favor of YES' : 'in favor of NO'}`);
    parts.push(`Volume: ${volume.toLocaleString()}`);

    if (volume < 1000) {
      parts.push('⚠️ Low volume — market may be illiquid, wider spreads expected.');
    }
    if (Math.abs(edge) > 0.1) {
      parts.push('🔍 Significant edge detected — market may be mispriced.');
    }
    if (Math.abs(edge) > 0.15) {
      parts.push('⚡ Large edge — strong opportunity if analysis holds.');
    }

    return parts.join('\n');
  }

  /**
   * Run full scan of Kalshi markets.
   */
  async runFullScan() {
    console.log('\n[Kalshi Scanner] Starting market scan...\n');

    const markets = await this.fetchMarkets(100);
    if (!markets || markets.length === 0) {
      console.log('[Kalshi] No markets fetched. Trying events endpoint...');
      const events = await this.fetchEvents(50);
      return this._scanEvents(events);
    }

    console.log(`[Kalshi] Fetched ${markets.length} markets`);

    const analyses = [];
    const insertMarket = db.prepare(`
      INSERT OR REPLACE INTO kalshi_markets 
        (market_id, title, subtitle, yes_bid, yes_ask, no_bid, no_ask, last_price, volume, status, stax_probability, edge_score, confidence, analysis, flagged)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPrediction = db.prepare(`
      INSERT INTO predictions (market_id, stax_probability, market_implied_prob, edge, confidence, recommendation, reasoning)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let flagged = 0;

    for (const market of markets) {
      try {
        const analysis = this.analyzeMarket(market);
        analyses.push(analysis);

        // Store market data
        insertMarket.run(
          analysis.market_id,
          analysis.title,
          analysis.subtitle || '',
          analysis.yes_bid,
          analysis.yes_ask,
          analysis.no_bid,
          analysis.no_ask,
          analysis.last_price,
          analysis.volume,
          'active',
          analysis.stax_probability,
          analysis.edge,
          analysis.confidence,
          analysis.reasoning,
          analysis.edge > 0.08 && analysis.confidence > 45 ? 1 : 0
        );

        // Store prediction
        insertPrediction.run(
          analysis.market_id,
          analysis.stax_probability,
          analysis.market_implied_prob,
          analysis.edge,
          analysis.confidence,
          analysis.recommendation,
          analysis.reasoning
        );

        if (analysis.edge > 0.08 && analysis.confidence > 45) flagged++;
      } catch (err) {
        console.log(`[Kalshi] Error analyzing ${market.ticker}:`, err.message);
      }
    }

    // Sort by edge descending
    analyses.sort((a, b) => b.edge - a.edge);

    console.log(`\n[Kalshi] Scan complete. ${analyses.length} markets analyzed, ${flagged} flagged with significant edge.\n`);

    return analyses;
  }

  /**
   * Scan events endpoint for markets.
   */
  async _scanEvents(events) {
    const allMarkets = [];
    for (const event of (events || [])) {
      const markets = event.markets || [];
      for (const m of markets) {
        allMarkets.push({ ...m, event_title: event.title });
      }
    }
    console.log(`[Kalshi] Found ${allMarkets.length} markets from events`);

    const analyses = [];
    for (const market of allMarkets) {
      try {
        const analysis = this.analyzeMarket(market);
        analyses.push(analysis);
      } catch (err) {
        // skip
      }
    }
    analyses.sort((a, b) => b.edge - a.edge);
    return analyses;
  }

  /**
   * Get top flagged markets from DB.
   */
  getTopEdges(limit = 10) {
    return db.prepare(`
      SELECT * FROM kalshi_markets 
      WHERE flagged = 1 
      ORDER BY edge_score DESC, confidence DESC 
      LIMIT ?
    `).all(limit);
  }

  /**
   * Get recent predictions.
   */
  getRecentPredictions(limit = 20) {
    return db.prepare(`
      SELECT p.*, k.title, k.volume 
      FROM predictions p
      JOIN kalshi_markets k ON p.market_id = k.market_id
      ORDER BY p.created_at DESC 
      LIMIT ?
    `).all(limit);
  }
}

module.exports = { KalshiScanner };

