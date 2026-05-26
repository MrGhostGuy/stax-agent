/**
 * NiceGuyAPI — Premium AI Model Gateway
 *
 * One API endpoint for Claude, GPT, Gemini, Grok, and 17+ more.
 * OpenAI-compatible /v1/chat/completions interface.
 *
 * Environment variables:
 *   NICEGUYAPI_PORT — server port (default 3000)
 *   NICEGUYAPI_SECRET — admin secret for key management
 *   OPENROUTER_API_KEY — OpenRouter API key (free tier ok)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = parseInt(process.env.NICEGUYAPI_PORT || '3000', 10);
const ADMIN_SECRET = process.env.NICEGUYAPI_SECRET || 'niceguy-dev-secret-change-me';

// ── Tier Configuration ────────────────────────────────────────────────────

const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    monthly_requests: 50,
    rate_limit_per_minute: 5,
    rate_limit_per_day: 20,
    max_tokens_per_request: 4096,
    allows_games_apps: false,
    cost_per_extra_request: 0.05,
  },
  pro: {
    name: 'Pro',
    price: 6,
    monthly_requests: 5000,
    rate_limit_per_minute: 20,
    rate_limit_per_day: 200,
    max_tokens_per_request: 32768,
    allows_games_apps: true,
    cost_per_extra_request: 0.02,
  },
  premium: {
    name: 'Premium',
    price: 27,
    monthly_requests: 25000,
    rate_limit_per_minute: 60,
    rate_limit_per_day: 1000,
    max_tokens_per_request: 131072,
    allows_games_apps: true,
    cost_per_extra_request: 0.01,
  },
};

// ── Error Helper ──────────────────────────────────────────────────────────

function apiError(res, status, message, type, extra = {}) {
  return res.status(status).json({ error: { message, type, ...extra } });
}

// ── Usage Reset Scheduler ─────────────────────────────────────────────────

// Reset free tier weekly usage every Sunday at midnight
// Reset paid tier monthly usage on the 1st of each month
function scheduleUsageResets() {
  function tryReset() {
    const now = new Date();
    // Weekly reset: Sunday midnight (day 0, hour 0)
    if (now.getUTCDay() === 0 && now.getUTCHours() === 0) {
      db.prepare("UPDATE api_keys SET monthly_used = 0, billing_period_start = datetime('now') WHERE tier = 'free'").run();
      console.log('[NiceGuyAPI] Weekly free-tier usage reset');
    }
    // Monthly reset: 1st of month
    if (now.getUTCDate() === 1 && now.getUTCHours() === 0) {
      db.prepare("UPDATE api_keys SET monthly_used = 0, billing_period_start = datetime('now') WHERE tier IN ('pro', 'premium')").run();
      console.log('[NiceGuyAPI] Monthly paid-tier usage reset');
    }
  }
  // Check every minute
  setInterval(tryReset, 60 * 1000);
  console.log('[NiceGuyAPI] Usage reset scheduler active');
}

// Count tokens roughly (4 chars ≈ 1 token)
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Multiplier for complex tasks (longer context = more request cost)
function calculateRequestCost(messages, tier) {
  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const estimatedTokens = totalChars / 4;
  if (estimatedTokens > 20000) return 3; // very complex
  if (estimatedTokens > 8000) return 2;  // moderately complex
  return 1; // standard
}

// ── Database ──────────────────────────────────────────────────────────────

const dbPath = path.join(__dirname, '..', 'data', 'niceguyapi.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT,
    email TEXT,
    tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'premium')),
    pending_tier TEXT CHECK(pending_tier IS NULL OR pending_tier IN ('free', 'pro', 'premium')),
    active INTEGER DEFAULT 1,
    monthly_limit INTEGER DEFAULT 50,
    monthly_used INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT,
    billing_period_start TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id TEXT NOT NULL,
    model TEXT,
    provider TEXT,
    status INTEGER DEFAULT 200,
    latency_ms INTEGER DEFAULT 0,
    request_cost INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  );

  CREATE TABLE IF NOT EXISTS provider_config (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT,
    active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    models TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS billing_sessions (
    id TEXT PRIMARY KEY,
    api_key_id TEXT,
    email TEXT,
    tier TEXT CHECK(tier IN ('free', 'pro', 'premium')),
    price REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
    paypal_order_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  );

  CREATE INDEX IF NOT EXISTS idx_usage_key ON usage_log(api_key_id);
  CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(created_at);
`);

// Seed default provider configs
const providerCount = db.prepare('SELECT COUNT(*) as c FROM provider_config').get();
if (providerCount.c === 0) {
  const insert = db.prepare('INSERT INTO provider_config (id, name, base_url, priority, models) VALUES (?, ?, ?, ?, ?)');
  const freeModels = [
    'deepseek/deepseek-v4-flash:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-coder:free',
    'openai/gpt-oss-120b:free',
    'google/gemma-4-31b-it:free',
    'minimax/minimax-m2.5:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'openai/gpt-oss-20b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'z-ai/glm-4.5-air:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'arcee-ai/trinity-large-thinking:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
  ];
  const premiumModels = [
    'anthropic/claude-sonnet-4-20250514',
    'openai/gpt-4o',
    'google/gemini-2.0-flash',
  ];
  const allModels = [...freeModels, ...premiumModels];
  insert.run('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 1, JSON.stringify(allModels));
}

// ── Provider Router ────────────────────────────────────────────────────────

function getProviders() {
  const rows = db.prepare('SELECT * FROM provider_config WHERE active = 1 ORDER BY priority').all();
  return rows.map(r => ({ ...r, models: JSON.parse(r.models || '[]') }));
}

function getModelsForTier(tier) {
  const providers = getProviders();
  const tierConfig = TIERS[tier] || TIERS.free;
  const models = [];
  for (const p of providers) {
    for (const m of p.models) {
      models.push({ id: `${p.id}/${m}`, provider: p.id, model: m, name: m.split('/').pop() });
    }
  }
  return models;
}

async function proxyToProvider(provider, model, messages, stream = false) {
  const startTime = Date.now();
  const headers = { 'Content-Type': 'application/json' };
  let url, body;

  if (provider.id === 'openrouter') {
    url = `${provider.base_url}/chat/completions`;
    headers['Authorization'] = `Bearer ${provider.api_key || process.env.OPENROUTER_API_KEY || ''}`;
    headers['HTTP-Referer'] = 'https://niceguyapi.dev';
    headers['X-Title'] = 'NiceGuyAPI';
    body = { model, messages, stream, max_tokens: 8192 };
  } else {
    throw new Error(`Unknown provider: ${provider.id}`);
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const latency = Date.now() - startTime;

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, status: res.status, error: errText, latency };
  }

  if (stream) {
    return { ok: true, status: res.status, stream: res.body, latency };
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    ok: true, status: res.status,
    data: {
      id: data.id || `ghost-${uuidv4().slice(0, 8)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    },
    latency,
  };
}

function resolveModel(modelName, tier) {
  const providers = getProviders();
  const allowedModels = getModelsForTier(tier);

  // Direct provider/model format
  if (modelName.includes('/')) {
    const [providerId, ...rest] = modelName.split('/');
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      const fullModel = rest.join('/');
      const available = allowedModels.find(m => m.id === `${providerId}/${fullModel}` || m.model === fullModel);
      if (available) return { provider, model: fullModel };
      return { provider, model: allowedModels[0]?.model || provider.models[0] };
    }
  }

  // Search by model name
  for (const am of allowedModels) {
    if (am.model.toLowerCase().includes(modelName.toLowerCase()) || am.name.toLowerCase().includes(modelName.toLowerCase())) {
      const provider = providers.find(p => p.id === am.provider);
      if (provider) return { provider, model: am.model };
    }
  }

  // Default to first allowed model
  if (allowedModels.length > 0) {
    const first = allowedModels[0];
    const provider = providers.find(p => p.id === first.provider);
    if (provider) return { provider, model: first.model };
  }

  return null;
}

// ── Express App ────────────────────────────────────────────────────────────

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Tier-based rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    const tier = req._tier || 'free';
    return (TIERS[tier] || TIERS.free).rate_limit_per_minute;
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});
app.use(limiter);

// Signup rate limiter: 5 per hour per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: { message: 'Too many signups from this IP. Try again later.', type: 'rate_limit_error' } },
});

// Request logging
app.use((req, res, next) => {
  req._startTime = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - req._startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    originalEnd.apply(this, args);
  };
  next();
});

// ── Auth Middleware ────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) {
    return res.status(401).json({ error: { message: 'Missing API key. Provide X-API-Key header.', type: 'auth_error' } });
  }

  const prefix = apiKey.slice(0, 12);
  const keyRecord = db.prepare('SELECT * FROM api_keys WHERE key_prefix = ? AND active = 1').get(prefix);
  if (!keyRecord) {
    return res.status(401).json({ error: { message: 'Invalid API key.', type: 'auth_error' } });
  }

  const valid = bcrypt.compareSync(apiKey, keyRecord.key_hash);
  if (!valid) {
    return res.status(401).json({ error: { message: 'Invalid API key.', type: 'auth_error' } });
  }

  // Check billing period reset (weekly for free, monthly for paid)
  const now = new Date();
  const periodStart = new Date(keyRecord.billing_period_start);
  const tierConfig = TIERS[keyRecord.tier] || TIERS.free;
  const isFree = keyRecord.tier === 'free';
  const periodMs = isFree ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  if (now - periodStart > periodMs) {
    db.prepare(`UPDATE api_keys SET monthly_used = 0, billing_period_start = datetime('now') WHERE id = ?`).run(keyRecord.id);
    keyRecord.monthly_used = 0;
  }

  // Check monthly limit
  if (keyRecord.monthly_used >= keyRecord.monthly_limit) {
    return res.status(429).json({
      error: {
        message: `You've reached your ${isFree ? 'weekly' : 'monthly'} request limit. Upgrade your plan or purchase more requests.`,
        type: 'limit_reached',
        upgrade_url: 'https://mrghostguy.github.io/stax-agent/#pricing',
        refill_price: tierConfig.cost_per_extra_request,
        refill_url: `/v1/billing/refill`,
        current_tier: keyRecord.tier,
        period_resets: isFree ? 'weekly' : 'monthly',
      }
    });
  }

  req.apiKey = keyRecord;
  req._tier = keyRecord.tier;
  req._tierConfig = tierConfig;
  next();
}

// ── API Routes ─────────────────────────────────────────────────────────────

// Health check — detailed
app.get('/health', (req, res) => {
  try {
    const dbOk = db.prepare('SELECT 1').get() !== undefined;
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(uptime),
      uptime_human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      database: dbOk ? 'connected' : 'error',
      memory: {
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      },
      tiers: {
        free: '$0/mo — 50 req',
        pro: '$6/mo — 5000 req',
        premium: '$27/mo — 25000 req',
      },
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

// ── Public Signup ──────────────────────────────────────────────────────────

app.post('/v1/signup', signupLimiter, (req, res) => {
  const { email, tier = 'free' } = req.body;

  if (!email) {
    return res.status(400).json({ error: { message: 'email is required', type: 'validation_error' } });
  }

  const validTiers = ['free', 'pro', 'premium'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: { message: `tier must be one of: ${validTiers.join(', ')}`, type: 'validation_error' } });
  }

  // Check if email already exists
  const existing = db.prepare('SELECT * FROM api_keys WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: { message: 'An account with this email already exists.', type: 'duplicate_error' } });
  }

  const id = uuidv4();
  const rawKey = `gsk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const keyHash = bcrypt.hashSync(rawKey, 10);
  const keyPrefix = rawKey.slice(0, 12);

  if (tier === 'free') {
    // Free tier: activate immediately
    const tierConfig = TIERS.free;
    db.prepare('INSERT INTO api_keys (id, key_hash, key_prefix, email, tier, monthly_limit) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, keyHash, keyPrefix, email, 'free', tierConfig.monthly_requests);

    return res.status(201).json({
      key: rawKey,
      prefix: keyPrefix,
      email,
      tier: 'free',
      tier_name: 'Free',
      monthly_limit: tierConfig.monthly_requests,
      payment_required: false,
      created_at: new Date().toISOString(),
    });
  } else {
    // Pro or Premium: create key at free tier with pending_tier set
    const requestedTierConfig = TIERS[tier];
    const price = requestedTierConfig.price;
    db.prepare('INSERT INTO api_keys (id, key_hash, key_prefix, email, tier, pending_tier, monthly_limit) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, keyHash, keyPrefix, email, 'free', tier, TIERS.free.monthly_requests);

    return res.status(201).json({
      key: rawKey,
      prefix: keyPrefix,
      email,
      tier: 'free',
      pending_tier: tier,
      tier_name: 'Free',
      monthly_limit: TIERS.free.monthly_requests,
      payment_required: true,
      payment: {
        price: price,
        currency: 'USD',
        paypal_url: `https://paypal.me/kencyrus3/${price}`,
      },
      created_at: new Date().toISOString(),
    });
  }
});

// ── Public Billing Checkout ────────────────────────────────────────────────

app.post('/v1/billing/checkout', (req, res) => {
  const { email, tier } = req.body;

  if (!email) {
    return res.status(400).json({ error: { message: 'email is required', type: 'validation_error' } });
  }
  if (!tier || !['pro', 'premium'].includes(tier)) {
    return res.status(400).json({ error: { message: 'tier must be pro or premium', type: 'validation_error' } });
  }

  // Find user by email
  const user = db.prepare('SELECT * FROM api_keys WHERE email = ?').get(email);
  if (!user) {
    return res.status(404).json({ error: { message: 'No account found with this email. Sign up first.', type: 'not_found' } });
  }

  const tierConfig = TIERS[tier];
  const price = tierConfig.price;
  const checkoutId = uuidv4();

  db.prepare('INSERT INTO billing_sessions (id, api_key_id, email, tier, price, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(checkoutId, user.id, email, tier, price, 'pending');

  res.json({
    checkout_id: checkoutId,
    paypal_url: `https://paypal.me/kencyrus3/${price}`,
    price: price,
    currency: 'USD',
    tier,
    email,
    status: 'pending',
  });
});

// ── Public Billing Confirm ─────────────────────────────────────────────────

app.post('/v1/billing/confirm', (req, res) => {
  const { api_key, paypal_order_id } = req.body;

  if (!api_key) {
    return res.status(400).json({ error: { message: 'api_key is required', type: 'validation_error' } });
  }
  if (!paypal_order_id) {
    return res.status(400).json({ error: { message: 'paypal_order_id is required', type: 'validation_error' } });
  }

  // Validate paypal_order_id format
  if (!paypal_order_id.startsWith('PAY-')) {
    return res.status(400).json({ error: { message: 'Invalid paypal_order_id format. Must start with PAY-', type: 'validation_error' } });
  }

  // Find the key
  const prefix = api_key.slice(0, 12);
  const keyRecord = db.prepare('SELECT * FROM api_keys WHERE key_prefix = ? AND active = 1').get(prefix);
  if (!keyRecord) {
    return res.status(401).json({ error: { message: 'Invalid API key.', type: 'auth_error' } });
  }

  const valid = bcrypt.compareSync(api_key, keyRecord.key_hash);
  if (!valid) {
    return res.status(401).json({ error: { message: 'Invalid API key.', type: 'auth_error' } });
  }

  // Check there's a pending tier to upgrade to
  if (!keyRecord.pending_tier) {
    return res.status(400).json({ error: { message: 'No pending upgrade for this key.', type: 'validation_error' } });
  }

  const newTier = keyRecord.pending_tier;
  const tierConfig = TIERS[newTier];

  // Upgrade the key
  db.prepare('UPDATE api_keys SET tier = ?, pending_tier = NULL, monthly_limit = ? WHERE id = ?')
    .run(newTier, tierConfig.monthly_requests, keyRecord.id);

  // Update billing session if one exists
  const session = db.prepare('SELECT * FROM billing_sessions WHERE api_key_id = ? AND tier = ? AND status = ? ORDER BY created_at DESC LIMIT 1').get(keyRecord.id, newTier, 'pending');
  if (session) {
    db.prepare('UPDATE billing_sessions SET status = ?, paypal_order_id = ?, completed_at = datetime("now") WHERE id = ?')
      .run('completed', paypal_order_id, session.id);
  }

  res.json({
    status: 'activated',
    tier: newTier,
    tier_name: tierConfig.name,
    monthly_limit: tierConfig.monthly_requests,
    paypal_order_id,
    activated_at: new Date().toISOString(),
  });
});

// ── Models ─────────────────────────────────────────────────────────────────

app.get('/v1/models', authenticate, (req, res) => {
  const models = getModelsForTier(req._tier);
  res.json({
    object: 'list',
    data: models.map(m => ({
      id: m.id,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: m.provider,
      name: m.name,
    })),
  });
});

// ── Usage ──────────────────────────────────────────────────────────────────

app.get('/v1/usage', authenticate, (req, res) => {
  const isFree = req._tier === 'free';

  res.json({
    tier: req._tier,
    tier_name: req._tierConfig.name,
    requests_used: req.apiKey.monthly_used,
    requests_total: req.apiKey.monthly_limit,
    requests_remaining: Math.max(0, req._tierConfig.monthly_requests - req.apiKey.monthly_used),
    period: isFree ? 'weekly' : 'monthly',
    period_resets: isFree ? 'Every week' : 'Every month',
    features: {
      games_apps: req._tierConfig.allows_games_apps,
    },
    refill_price_per_request: req._tierConfig.cost_per_extra_request,
    upgrade_url: 'https://mrghostguy.github.io/stax-agent/#pricing',
  });
});

// ── Chat Completions ──────────────────────────────────────────────────────

app.post('/v1/chat/completions', authenticate, async (req, res) => {
  const { model = 'openrouter/deepseek/deepseek-v4-flash:free', messages, stream = false } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'messages array is required', type: 'validation_error' } });
  }

  // Determine request cost based on complexity
  const requestCost = calculateRequestCost(messages, req._tier);

  // Check if user has enough remaining requests
  const remaining = req._tierConfig.monthly_requests - req.apiKey.monthly_used;
  if (remaining < requestCost) {
    return res.status(429).json({
      error: {
        message: `Not enough requests remaining. This task requires ${requestCost} request(s). You have ${remaining} left.`,
        type: 'limit_reached',
        requests_needed: requestCost,
        requests_remaining: remaining,
        refill_price: req._tierConfig.cost_per_extra_request,
        upgrade_url: 'https://mrghostguy.github.io/stax-agent/#pricing',
      }
    });
  }

  const resolved = resolveModel(model, req._tier);
  if (!resolved) {
    return res.status(400).json({ error: { message: `No provider available for model: ${model}`, type: 'model_error' } });
  }

  const { provider, model: resolvedModel } = resolved;

  try {
    const result = await proxyToProvider(provider, resolvedModel, messages, stream);

    // Update usage with request cost
    db.prepare(`UPDATE api_keys SET monthly_used = monthly_used + ?, total_requests = total_requests + 1, last_used_at = datetime('now') WHERE id = ?`)
      .run(requestCost, req.apiKey.id);

    db.prepare('INSERT INTO usage_log (api_key_id, model, provider, status, latency_ms, request_cost) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.apiKey.id, resolvedModel, provider.id, result.status, result.latency, requestCost);

    if (!result.ok) {
      return res.status(result.status).json({ error: { message: result.error, type: 'provider_error' } });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const reader = result.stream.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value));
        }
      } catch (e) {}
      res.end();
      return;
    }

    // Add usage info to response
    const responseData = { ...result.data };
    responseData.usage.requests_used = req.apiKey.monthly_used + requestCost;
    responseData.usage.requests_remaining = req._tierConfig.monthly_requests - req.apiKey.monthly_used - requestCost;
    responseData.usage.request_cost = requestCost;
    responseData.usage.tier = req._tier;

    res.json(responseData);
  } catch (err) {
    console.error('[NiceGuyAPI] Proxy error:', err.message);
    res.status(502).json({ error: { message: 'Provider request failed: ' + err.message, type: 'proxy_error' } });
  }
});

// ── Stub Endpoints (Not Implemented) ──────────────────────────────────────

app.post('/v1/media/image', authenticate, (req, res) => {
  res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
});

app.post('/v1/media/song', authenticate, (req, res) => {
  res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
});

app.post('/v1/media/pdf', authenticate, (req, res) => {
  res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
});

app.post('/v1/media/podcast', authenticate, (req, res) => {
  res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
});

app.post('/v1/agents', authenticate, (req, res) => {
  res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
});

app.post('/v1/tasks/schedule', authenticate, (req, res) => {
  res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
});

app.post('/v1/websites', authenticate, (req, res) => {
  res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
});

// ── Pay-as-you-go Refill ──────────────────────────────────────────────────

app.post('/v1/billing/refill', authenticate, (req, res) => {
  const { amount = 10 } = req.body; // number of requests to buy
  const cost = amount * req._tierConfig.cost_per_extra_request;

  // In production, this would process PayPal payment
  // For now, add requests to their limit
  db.prepare('UPDATE api_keys SET monthly_limit = monthly_limit + ? WHERE id = ?').run(amount, req.apiKey.id);

  res.json({
    message: `Added ${amount} requests for $${cost.toFixed(2)}.`,
    requests_added: amount,
    cost: cost,
    new_limit: req.apiKey.monthly_limit + amount,
    paypal_url: `https://paypal.me/kencyrus3/${Math.ceil(cost)}`,
  });
});

// ── User Key Management ──────────────────────────────────────────────────

// Rotate/regenerate API key
app.post('/v1/keys/rotate', authenticate, (req, res) => {
  const newRaw = `gsk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const newHash = bcrypt.hashSync(newRaw, 10);
  const newPrefix = newRaw.slice(0, 12);
  db.prepare('UPDATE api_keys SET key_hash = ?, key_prefix = ? WHERE id = ?').run(newHash, newPrefix, req.apiKey.id);
  res.json({ key: newRaw, prefix: newPrefix, message: 'Key rotated. Your old key is now invalid.' });
});

// ── Admin Routes ───────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  next();
}

app.post('/admin/keys', adminAuth, (req, res) => {
  const { name, email, tier = 'free' } = req.body;
  const id = uuidv4();
  const rawKey = `gsk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const keyHash = bcrypt.hashSync(rawKey, 10);
  const keyPrefix = rawKey.slice(0, 12);
  const tierConfig = TIERS[tier] || TIERS.free;

  db.prepare('INSERT INTO api_keys (id, key_hash, key_prefix, name, email, tier, monthly_limit) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, keyHash, keyPrefix, name || 'Default', email || '', tier, tierConfig.monthly_requests);

  res.json({
    id, key: rawKey, prefix: keyPrefix, name, email, tier,
    monthly_limit: tierConfig.monthly_requests,
    created_at: new Date().toISOString(),
  });
});

app.get('/admin/keys', adminAuth, (req, res) => {
  const keys = db.prepare('SELECT id, key_prefix, name, email, tier, pending_tier, active, monthly_limit, monthly_used, total_requests, created_at, last_used_at FROM api_keys ORDER BY created_at DESC').all();
  res.json({ keys });
});

app.get('/admin/stats', adminAuth, (req, res) => {
  const totalKeys = db.prepare('SELECT COUNT(*) as c FROM api_keys').get().c;
  const activeKeys = db.prepare('SELECT COUNT(*) as c FROM api_keys WHERE active = 1').get().c;
  const totalRequests = db.prepare('SELECT COALESCE(SUM(total_requests), 0) as c FROM api_keys').get().c;
  const byTier = db.prepare('SELECT tier, COUNT(*) as count, SUM(monthly_used) as total_used FROM api_keys GROUP BY tier').all();
  const recentUsage = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as requests, SUM(request_cost) as weighted_requests
    FROM usage_log
    WHERE created_at > datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY day DESC
  `).all();

  res.json({ total_keys: totalKeys, active_keys: activeKeys, total_requests: totalRequests, tier_breakdown: byTier, daily_usage: recentUsage });
});

// ── Root docs ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    name: 'NiceGuyAPI', version: '1.0.0',
    description: 'One API for every AI provider. OpenAI-compatible interface.',
    base_url: '/v1',
    pricing: {
      free: '$0/mo — 50 requests',
      pro: '$6/mo — 5000 requests',
      premium: '$27/mo — 25000 requests',
      refill: 'Pay-as-you-go refills available. Buy extra requests without upgrading.',
    },
    endpoints: {
      'GET /health': 'Health check with uptime, memory, DB status',
      'POST /v1/signup': 'Create a new account (public, rate-limited)',
      'POST /v1/billing/checkout': 'Create a billing session for upgrade (public)',
      'POST /v1/billing/confirm': 'Confirm payment and upgrade tier (public)',
      'GET /v1/models': 'List available models for your tier',
      'POST /v1/chat/completions': 'Chat with any AI model (OpenAI-compatible)',
      'GET /v1/usage': 'Current usage, quotas, and feature details',
      'POST /v1/billing/refill': 'Buy extra requests (pay-as-you-go)',
      'POST /v1/keys/rotate': 'Regenerate your API key',
    },
    auth: 'Include X-API-Key header with all /v1 requests (except signup, billing/confirm, billing/checkout)',
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────

app.use((req, res) => {
  apiError(res, 404, `Route ${req.method} ${req.path} not found`, 'not_found', {
    docs: 'https://niceguyapi-1v1f.onrender.com/',
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[NiceGuyAPI] Unhandled error:', err);
  apiError(res, 500, 'An unexpected error occurred', 'server_error', {
    request_id: uuidv4().slice(0, 8),
  });
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────

let server;
function gracefulShutdown(signal) {
  console.log(`\n[NiceGuyAPI] ${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('[NiceGuyAPI] Server closed');
      try { db.close(); } catch (e) {}
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => { process.exit(1); }, 10000);
  } else {
    process.exit(0);
  }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('[NiceGuyAPI] Unhandled rejection:', err);
});

// ── Start ──────────────────────────────────────────────────────────────────

const startTime = Date.now();
server = app.listen(PORT, () => {
  scheduleUsageResets();
  const bootTime = Date.now() - startTime;
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🏗️  NiceGuyAPI v1.0 — AI Model Gateway         ║
  ║  Running on port ${PORT}${' '.repeat(Math.max(0, 19 - String(PORT).length))}║
  ║  Endpoint: http://localhost:${PORT}/v1${' '.repeat(Math.max(0, 8 - String(PORT).length))}║
  ║  Boot: ${bootTime}ms${' '.repeat(Math.max(0, 29 - String(bootTime).length))}║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
