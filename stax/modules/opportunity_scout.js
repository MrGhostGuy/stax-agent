const { getDb } = require('../lib/db'); const db = getDb();

/**
 * Opportunity Scout — Continuously scans multiple sources
 * for money-making opportunities across categories.
 */
class OpportunityScout {
  constructor() {
    this.sources = [];
    this.results = [];
  }

  /**
   * Scan GitHub trending for dev/freelance opportunities.
   * Looks for: trending repos in underserved niches, tools people are building that could be improved or cloned.
   */
  async scanGitHubTrending() {
    const opportunities = [];
    try {
      const res = await fetch('https://api.github.com/search/repositories?q=created:>2025-05-01&sort=stars&order=desc&per_page=20', {
        headers: { 'User-Agent': 'Stax-Agent' }
      });
      if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
      const data = await res.json();

      for (const repo of (data.items || [])) {
        const score = this._scoreGitHubRepo(repo);
        if (score.roi_score > 40) {
          opportunities.push({
            source: 'github_trending',
            title: `Trending: ${repo.full_name}`,
            description: `${repo.description || 'No description'} — ${repo.stargazers_count} stars, language: ${repo.language}`,
            category: 'dev_opportunity',
            potential_revenue: score.revenue,
            effort_level: score.effort,
            time_to_profit: score.timeToProfit,
            confidence_score: score.confidence,
            roi_score: score.roi_score,
            raw_data: JSON.stringify(repo)
          });
        }
      }
    } catch (err) {
      console.log('[Scout] GitHub scan error:', err.message);
    }
    return opportunities;
  }

  /**
   * Scan Reddit for entrepreneurial opportunities.
   * Looks for: pain points people mention, "I wish there was X" posts, underserved markets.
   */
  async scanRedditOpportunities() {
    const opportunities = [];
    const subreddits = ['entrepreneur', 'sideproject', 'smallbusiness', 'passive_income', 'flipper'];

    try {
      for (const sub of subreddits) {
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=15`, {
          headers: { 'User-Agent': 'Stax-Agent/1.0' }
        });
        if (!res.ok) continue;
        const data = await res.json();

        for (const post of (data?.data?.children || [])) {
          const p = post.data;
          const text = `${p.title} ${p.selftext || ''}`.toLowerCase();
          const score = this._scoreRedditPost(p, text);
          if (score.roi_score > 35) {
            opportunities.push({
              source: `reddit_${sub}`,
              title: p.title.substring(0, 150),
              description: (p.selftext || '').substring(0, 500),
              category: this._categorizeReddit(text),
              potential_revenue: score.revenue,
              effort_level: score.effort,
              time_to_profit: score.timeToProfit,
              confidence_score: score.confidence,
              roi_score: score.roi_score,
              raw_data: JSON.stringify({ url: p.url, score: p.score, num_comments: p.num_comments })
            });
          }
        }
      }
    } catch (err) {
      console.log('[Scout] Reddit scan error:', err.message);
    }
    return opportunities;
  }

  /**
   * Scan for content creator opportunities relevant to Ghost.
   * Twitch/TikTok trending topics, underserved niches, viral formats.
   */
  async scanContentOpportunities() {
    const opportunities = [];
    try {
      
      // Google Trends for trending search terms
      const res = await fetch('https://trends.google.com/trending/rss?geo=US', {
        headers: { 'User-Agent': 'Stax-Agent/1.0' }
      });
      if (res.ok) {
        const text = await res.text();
        // Parse RSS items
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items.slice(0, 10)) {
          const title = item.match(/<title>(.*?)<\/title>/)?.[1];
          const traffic = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1];
          if (title) {
            opportunities.push({
              source: 'google_trends',
              title: `Trending Search: ${title}`,
              description: `Search traffic: ${traffic || 'unknown'}`,
              category: 'content_trend',
              potential_revenue: 'varies',
              effort_level: 'low',
              time_to_profit: '1-7 days',
              confidence_score: 50,
              roi_score: 55,
              raw_data: JSON.stringify({ title, traffic })
            });
          }
        }
      }
    } catch (err) {
      console.log('[Scout] Content scan error:', err.message);
    }
    return opportunities;
  }

  /**
   * Scan general web for business/freelance opportunities.
   */
  async scanFreelanceOpportunities() {
    const opportunities = [];
    try {
      // HackerNews Show HN for side projects
      const res = await fetch('https://hacker-news.firebaseio.com/v0/showstories.json');
      if (res.ok) {
        const ids = await res.json();
        const topIds = ids.slice(0, 20);
        for (const id of topIds) {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!itemRes.ok) continue;
          const item = await itemRes.json();
          if (!item || !item.title) continue;
          const score = this._scoreHNItem(item);
          if (score.roi_score > 30) {
            opportunities.push({
              source: 'hackernews_show',
              title: item.title,
              description: `HN Show — ${item.score} points, ${item.descendants || 0} comments`,
              category: 'side_project',
              potential_revenue: score.revenue,
              effort_level: score.effort,
              time_to_profit: score.timeToProfit,
              confidence_score: score.confidence,
              roi_score: score.roi_score,
              raw_data: JSON.stringify({ hn_id: id, url: item.url })
            });
          }
        }
      }
    } catch (err) {
      console.log('[Scout] Freelance scan error:', err.message);
    }
    return opportunities;
  }

  /**
   * Run all scouts and collect opportunities.
   */
  async runFullScan() {
    console.log('\n[Stax Scout] Starting full opportunity scan...\n');

    const allOpportunities = [];

    const tasks = [
      { name: 'GitHub Trending', fn: () => this.scanGitHubTrending() },
      { name: 'Reddit Opportunities', fn: () => this.scanRedditOpportunities() },
      { name: 'Content Trends', fn: () => this.scanContentOpportunities() },
      { name: 'Freelance/Side Projects', fn: () => this.scanFreelanceOpportunities() },
    ];

    for (const task of tasks) {
      try {
        console.log(`[Scout] Scanning: ${task.name}...`);
        const results = await task.fn();
        console.log(`[Scout] ${task.name}: ${results.length} opportunities found`);
        allOpportunities.push(...results);
      } catch (err) {
        console.log(`[Scout] ${task.name} failed:`, err.message);
      }
    }

    // Sort by ROI score descending
    allOpportunities.sort((a, b) => b.roi_score - a.roi_score);

    // Store in database
    const insert = db.prepare(`
      INSERT OR IGNORE INTO opportunities 
        (source, title, description, category, potential_revenue, effort_level, time_to_profit, confidence_score, roi_score, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let inserted = 0;
    for (const op of allOpportunities) {
      const result = insert.run(
        op.source, op.title, op.description, op.category,
        op.potential_revenue, op.effort_level, op.time_to_profit,
        op.confidence_score, op.roi_score, op.raw_data
      );
      if (result.changes > 0) inserted++;
    }

    // Update source timestamps
    const updateSource = db.prepare('UPDATE scout_sources SET last_scanned = CURRENT_TIMESTAMP, scan_count = scan_count + 1 WHERE name = ?');
    for (const src of ['github_trending', 'reddit_entrepreneur', 'twitch_trends', 'hn_show']) {
      updateSource.run(src);
    }

    console.log(`\n[Stax Scout] Scan complete. ${allOpportunities.length} opportunities found, ${inserted} new.\n`);
    return allOpportunities;
  }

  // --- Scoring Methods ---

  _scoreGitHubRepo(repo) {
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const hasTopics = (repo.topics || []).length > 0;
    
    let roi_score = 30;
    if (stars > 500) roi_score += 15;
    if (stars > 2000) roi_score += 15;
    if (stars > 10000) roi_score += 10;
    if (forks > 100) roi_score += 5;
    if (hasTopics) roi_score += 5;
    
    const keywords = ['ai', 'tool', 'automation', 'api', 'open-source', 'free', 'money', 'revenue', 'income', 'market'];
    const desc = (repo.description || '').toLowerCase();
    for (const kw of keywords) {
      if (desc.includes(kw)) roi_score += 5;
    }

    let effort = 'medium';
    let timeToProfit = '2-4 weeks';
    let revenue = '$50-500/month';

    if (stars > 5000) { effort = 'low'; timeToProfit = '1-2 weeks'; revenue = '$200-2000/month'; }
    else if (stars > 500) { effort = 'medium'; timeToProfit = '1-3 weeks'; revenue = '$100-500/month'; }
    else { effort = 'high'; timeToProfit = '4-8 weeks'; revenue = '$200+/month'; }

    return {
      roi_score: Math.min(100, roi_score),
      confidence: Math.min(90, 40 + stars / 100),
      effort,
      timeToProfit,
      revenue
    };
  }

  _scoreRedditPost(post, text) {
    let roi_score = 25;
    const upvotes = post.score || 0;
    const comments = post.num_comments || 0;

    if (upvotes > 100) roi_score += 10;
    if (upvotes > 500) roi_score += 15;
    if (comments > 50) roi_score += 10;
    if (comments > 200) roi_score += 10;

    const opportunityKeywords = [
      'i wish', 'someone should', 'no one has', 'opportunity', 'make money',
      'profitable', 'revenue', 'income', 'passive', 'freelance', 'side hustle',
      'charged me', 'overpriced', 'expensive alternative', 'gap in the market'
    ];
    for (const kw of opportunityKeywords) {
      if (text.includes(kw)) roi_score += 8;
    }

    let effort = 'medium';
    let timeToProfit = '2-6 weeks';
    let revenue = '$100-1000/month';

    if (text.includes('passive') || text.includes('automated')) { effort = 'low'; timeToProfit = '1-3 weeks'; roi_score += 5; }
    if (upvotes > 500 && comments > 100) { revenue = '$500-5000/month'; }

    return {
      roi_score: Math.min(100, roi_score),
      confidence: Math.min(85, 30 + upvotes / 20 + comments / 10),
      effort,
      timeToProfit,
      revenue
    };
  }

  _scoreHNItem(item) {
    const score = item.score || 0;
    const comments = item.descendants || 0;
    let roi_score = 20;
    if (score > 50) roi_score += 10;
    if (score > 200) roi_score += 15;
    if (comments > 30) roi_score += 10;

    const title = (item.title || '').toLowerCase();
    if (title.includes('show hn') || title.includes('built')) roi_score += 5;
    if (title.includes('revenue') || title.includes('profitable') || title.includes('money')) roi_score += 15;
    if (title.includes('ai') || title.includes('tool') || title.includes('api')) roi_score += 5;

    let revenue = '$100-500/month';
    if (score > 200) revenue = '$500-2000/month';

    return {
      roi_score: Math.min(100, roi_score),
      confidence: Math.min(80, 35 + score / 10),
      effort: 'medium',
      timeToProfit: '2-4 weeks',
      revenue
    };
  }

  _categorizeReddit(text) {
    if (text.includes('content') || text.includes('youtube') || text.includes('tiktok') || text.includes('twitch')) return 'content_creation';
    if (text.includes('app') || text.includes('tool') || text.includes('saas') || text.includes('software')) return 'software';
    if (text.includes('freelance') || text.includes('client') || text.includes('service')) return 'freelance';
    if (text.includes('sell') || text.includes('flip') || text.includes('resell') || text.includes('ecommerce')) return 'ecommerce';
    if (text.includes('ai') || text.includes('automate')) return 'ai_automation';
    return 'general_business';
  }

  /**
  * Get top opportunities from DB.
  */
  getTopOpportunities(limit = 10) {
    return db.prepare(`
      SELECT * FROM opportunities 
      WHERE status = 'new' 
      ORDER BY roi_score DESC 
      LIMIT ?
    `).all(limit);
  }
}

module.exports = { OpportunityScout };

