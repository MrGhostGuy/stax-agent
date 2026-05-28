/**
 * NiceGuyAPI v3.5 — Premium AI Model Gateway
 *
 * One API endpoint for Claude, GPT, Gemini, and 17+ more.
 * OpenAI-compatible /v1/chat/completions interface.
 *
 * Payments via Stripe Checkout — automatic, hands-off, no manual work.
 *
 * Environment variables:
 *   NICEGUYAPI_PORT     — server port (default 3000)
 *   NICEGUYAPI_SECRET   — admin secret for key management
 *   OPENROUTER_API_KEY  — OpenRouter API key
 *   STRIPE_SECRET_KEY   — Stripe secret key (sk_live_xxx or sk_test_xxx)
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook endpoint secret
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || process.env.NICEGUYAPI_PORT || '3000', 10);
const ADMIN_SECRET = process.env.NICEGUYAPI_SECRET || 'niceguy-dev-secret-change-me';

const startTime = Date.now();

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// ── Tier Configuration ────────────────────────────────────────────────────

const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    monthly_requests: 14,
    rate_limit_per_minute: 5,
    rate_limit_per_day: 10,
    max_tokens_per_request: 4096,
    allows_games_apps: false,
    allows_image_gen: false,
    allows_song_gen: false,
    cost_per_extra_request: 0.05,
    period: 'monthly',
  },
  pro: {
    name: 'Pro',
    price: 6,
    monthly_requests: 40,
    rate_limit_per_minute: 20,
    rate_limit_per_day: 200,
    max_tokens_per_request: 32768,
    allows_games_apps: false,
    allows_image_gen: true,
    allows_song_gen: true,
    cost_per_extra_request: 0.02,
  },
  premium: {
    name: 'Premium',
    price: 27,
    monthly_requests: 500,
    rate_limit_per_minute: 60,
    rate_limit_per_day: 1000,
    max_tokens_per_request: 131072,
    allows_games_apps: true,
    allows_image_gen: true,
    allows_song_gen: true,
    cost_per_extra_request: 0.01,
  },
};

// ── Error Helper ──────────────────────────────────────────────────────────

function apiError(res, status, message, type, extra = {}) {
  return res.status(status).json({ error: { message, type, ...extra } });
}

// ── Usage Reset Scheduler ─────────────────────────────────────────────────

function scheduleUsageResets() {
  function tryReset() {
    const now = new Date();
    if (now.getUTCDate() === 1 && now.getUTCHours() === 0) {
      db.prepare("UPDATE api_keys SET monthly_used = 0, billing_period_start = datetime('now') WHERE tier IN ('free', 'pro', 'premium')").run();
      console.log('[NiceGuyAPI] Monthly usage reset for all tiers');
    }
  }
  setInterval(tryReset, 60 * 1000);
  console.log('[NiceGuyAPI] Usage reset scheduler active');
}

// ── Token & Request Cost Estimation ───────────────────────────────────────

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function calculateRequestCost(messages, tier) {
  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const estimatedTokens = totalChars / 4;
  if (estimatedTokens > 20000) return 3;
  if (estimatedTokens > 8000) return 2;
  return 1;
}

// ── Database (sql.js — pure JS, no native compilation) ───────────────────

const dbPath = path.join(__dirname, '..', 'data', 'niceguyapi.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db;
let SQL;

async function initDb() {
  SQL = await initSqlJs();
  let database;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    database = new SQL.Database(buffer);
  } else {
    database = new SQL.Database();
  }
  db = database;
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

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
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'failed')),
      stripe_session_id TEXT,
      paypal_order_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
    );

    CREATE INDEX IF NOT EXISTS idx_usage_key ON usage_log(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_billing_session ON billing_sessions(stripe_session_id);
  `);

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

  persistDb();
}

function persistDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Wrapper: sql.js prepare/bind/step API matching better-sqlite3
function prepare(sql) {
  return {
    get: (...args) => {
      const stmt = db.prepare(sql);
      if (args.length) stmt.bind(args);
      let result = null;
      if (stmt.step()) result = stmt.getAsObject();
      stmt.free();
      return result;
    },
    all: (...args) => {
      const stmt = db.prepare(sql);
      if (args.length) stmt.bind(args);
      const results = [];
      while (stmt.step()) results.push(stmt.getAsObject());
      stmt.free();
      return results;
    },
    run: (...args) => {
      const stmt = db.prepare(sql);
      if (args.length) stmt.bind(args);
      stmt.step();
      stmt.free();
      persistDb();
      return { changes: db.getRowsModified() };
    },
  };
}

// ── Provider Router ────────────────────────────────────────────────────────

function getProviders() {
  const rows = db.prepare('SELECT * FROM provider_config WHERE active = 1 ORDER BY priority').all();
  return rows.map(r => ({ ...r, models: JSON.parse(r.models || '[]') }));
}

function getModelsForTier(tier) {
  const providers = getProviders();
  const models = [];
  for (const p of providers) {
    for (const m of p.models) {
      const isFree = m.includes(':free');
      if (tier === 'free' && !isFree) continue;
      models.push({
        id: `${p.id}/${m}`,
        provider: p.id,
        model: m,
        name: m.split('/').pop().replace(':free', ''),
        free: isFree,
      });
    }
  }
  return models;
}

function resolveModel(modelId) {
  const providers = getProviders();
  const parts = modelId.split('/');
  const providerId = parts[0];
  const modelName = parts.slice(1).join('/');
  const provider = providers.find(p => p.id === providerId);
  if (!provider) return null;
  return { provider, model: modelName, fullId: modelName };
}

// ── App Setup ──────────────────────────────────────────────────────────────

const app = express();

// Stripe webhook needs raw body — mount BEFORE json parser
app.post('/v1/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && stripe) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // In dev without webhook secret, parse directly
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('[NiceGuyAPI] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('[NiceGuyAPI] Stripe checkout completed:', session.id);

    // Find billing session by stripe session ID
    const billingSession = db.prepare('SELECT * FROM billing_sessions WHERE stripe_session_id = ?').get(session.id);

    if (billingSession && billingSession.status === 'pending') {
      const keyRecord = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(billingSession.api_key_id);

      if (keyRecord) {
        // Check if this is a refill or a tier upgrade
        if (session.metadata && session.metadata.type === 'refill') {
          // Refill: add requests to existing tier
          const refillAmount = parseInt(session.metadata.amount || '10', 10);
          db.prepare('UPDATE api_keys SET monthly_limit = monthly_limit + ? WHERE id = ?')
            .run(refillAmount, keyRecord.id);
          console.log(`[NiceGuyAPI] Refilled ${keyRecord.email} with ${refillAmount} requests`);
        } else if (keyRecord.pending_tier) {
          // Tier upgrade
          const newTier = keyRecord.pending_tier;
          const tierConfig = TIERS[newTier];
          db.prepare('UPDATE api_keys SET tier = ?, pending_tier = NULL, monthly_limit = ? WHERE id = ?')
            .run(newTier, tierConfig.monthly_requests, keyRecord.id);
          console.log(`[NiceGuyAPI] Upgraded ${keyRecord.email} to ${newTier} via Stripe`);
        }

        // Mark billing session completed
        db.prepare('UPDATE billing_sessions SET status = ?, completed_at = datetime("now") WHERE id = ?')
          .run('completed', billingSession.id);
      } else {
        console.log('[NiceGuyAPI] No key found for billing session:', billingSession.id);
      }
    } else {
      console.log('[NiceGuyAPI] No pending billing session found for stripe session:', session.id);
    }
  }

  res.json({ received: true });
});

// Now apply JSON/URL parsing for all other routes
app.use(cors());
app.use(express.json({ type: ['application/json', 'application/json; charset=utf-8'] }));
app.use(express.urlencoded({ extended: true }));

// ── Security ───────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});

// ── Rate Limiting ──────────────────────────────────────────────────────────

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: { message: 'Too many signup attempts. Try again later.', type: 'rate_limit' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: { message: 'Too many requests. Slow down.', type: 'rate_limit' } },
});

// ── API Key Authentication Middleware ──────────────────────────────────────

function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  if (!apiKey) {
    return res.status(401).json({ error: { message: 'Missing X-API-Key header.', type: 'auth_error' } });
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

  // Check billing period reset
  const now = new Date();
  const periodStart = new Date(keyRecord.billing_period_start);
  const tierConfig = TIERS[keyRecord.tier] || TIERS.free;
  const isMonthly = tierConfig.period !== 'weekly';
  const periodMs = isMonthly ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  if (now - periodStart > periodMs) {
    db.prepare("UPDATE api_keys SET monthly_used = 0, billing_period_start = datetime('now') WHERE id = ?").run(keyRecord.id);
    keyRecord.monthly_used = 0;
  }

  // Check limit
  if (keyRecord.monthly_used >= keyRecord.monthly_limit) {
    return res.status(429).json({
      error: {
        message: `You've reached your monthly request limit. Upgrade your plan or purchase more requests.`,
        type: 'limit_reached',
        upgrade_url: 'https://niceguyapi.onrender.com/',
        refill_price: tierConfig.cost_per_extra_request,
        refill_url: '/v1/billing/refill',
        current_tier: keyRecord.tier,
        period_resets: 'monthly',
      }
    });
  }

  req.apiKey = keyRecord;
  req._tier = keyRecord.tier;
  req._tierConfig = tierConfig;

  // Update last used
  db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(keyRecord.id);

  next();
}

// ── Admin Auth ─────────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: { message: 'Unauthorized.', type: 'auth_error' } });
  }
  next();
}

// ── Signup ─────────────────────────────────────────────────────────────────

app.post('/v1/signup', signupLimiter, async (req, res) => {
  const { email, tier = 'free' } = req.body;

  if (!email) {
    return res.status(400).json({ error: { message: 'email is required', type: 'validation_error' } });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: { message: 'Please enter a valid email address.', type: 'validation_error' } });
  }

  const validTiers = ['free', 'pro', 'premium'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: { message: `tier must be one of: ${validTiers.join(', ')}`, type: 'validation_error' } });
  }

  // Check if email already exists
  const existing = db.prepare('SELECT id, tier FROM api_keys WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: { message: 'An account with this email already exists. Use your existing key or rotate it.', type: 'duplicate_error' } });
  }

  const id = uuidv4();
  const rawKey = `gsk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const keyHash = bcrypt.hashSync(rawKey, 10);
  const keyPrefix = rawKey.slice(0, 12);

  if (tier === 'free') {
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
    // Pro or Premium: create at free tier, pending upgrade
    const requestedTierConfig = TIERS[tier];
    const price = requestedTierConfig.price;

    db.prepare('INSERT INTO api_keys (id, key_hash, key_prefix, email, tier, pending_tier, monthly_limit) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, keyHash, keyPrefix, email, 'free', tier, TIERS.free.monthly_requests);

    // Create billing session
    const billingSessionId = uuidv4();
    db.prepare('INSERT INTO billing_sessions (id, api_key_id, email, tier, price, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(billingSessionId, id, email, tier, price, 'pending');

    // Create Stripe Checkout Session if Stripe is configured
    let stripeUrl = null;

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: `NiceGuyAPI ${requestedTierConfig.name} Plan`,
                description: `${requestedTierConfig.monthly_requests.toLocaleString()} requests/month. Launch sale price.`,
              },
              unit_amount: price * 100,
            },
            quantity: 1,
          }],
          success_url: 'https://mrghostguy.github.io/niceguyapi/#success',
          cancel_url: 'https://mrghostguy.github.io/niceguyapi/#pricing',
          customer_email: email,
          metadata: {
            api_key_id: id,
            billing_session_id: billingSessionId,
            tier: tier,
          },
        });

        stripeUrl = session.url;

        // Store Stripe session ID
        db.prepare('UPDATE billing_sessions SET stripe_session_id = ? WHERE id = ?')
          .run(session.id, billingSessionId);

        console.log(`[NiceGuyAPI] Created Stripe session for ${email} ($${price})`);
      } catch (stripeErr) {
        console.error('[NiceGuyAPI] Stripe error:', stripeErr.message);
        // Fall back to Stripe hosted page or fail gracefully
      }
    }

    return res.status(201).json({
      key: rawKey,
      prefix: keyPrefix,
      email,
      tier: 'free',
      pending_tier: tier,
      tier_name: 'Free (pending upgrade)',
      monthly_limit: TIERS.free.monthly_requests,
      payment_required: true,
      payment: {
        price: price,
        currency: 'USD',
        stripe_url: stripeUrl,
      },
      created_at: new Date().toISOString(),
    });
  }
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
    })),
  });
});

// ── Usage ──────────────────────────────────────────────────────────────────

app.get('/v1/usage', authenticate, (req, res) => {
  const remaining = req.apiKey.monthly_limit - req.apiKey.monthly_used;
  const isMonthly = req._tierConfig.period !== 'weekly';

  res.json({
    tier: req._tier,
    tier_name: req._tierConfig.name,
    requests_used: req.apiKey.monthly_used,
    requests_total: req.apiKey.monthly_limit,
    requests_remaining: Math.max(0, remaining),
    period: isMonthly ? 'monthly' : 'weekly',
    period_resets: isMonthly ? 'Every month' : 'Every week',
    features: {
      games_apps: req._tierConfig.allows_games_apps,
      image_generation: req._tierConfig.allows_image_gen,
      song_generation: req._tierConfig.allows_song_gen,
    },
    refill_price_per_request: req._tierConfig.cost_per_extra_request,
    upgrade_url: 'https://mrghostguy.github.io/niceguyapi/',
  });
});

// ── Chat Completions ──────────────────────────────────────────────────────

app.post('/v1/chat/completions', authenticate, async (req, res) => {
  const { model = 'openrouter/deepseek/deepseek-v4-flash:free', messages, stream = false } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'messages array is required', type: 'validation_error' } });
  }

  const requestCost = calculateRequestCost(messages, req._tier);
  const remaining = req.apiKey.monthly_limit - req.apiKey.monthly_used;
  if (remaining < requestCost) {
    return res.status(429).json({
      error: {
        message: `Not enough requests remaining. You have ${remaining} left. Upgrade or buy refills.`,
        type: 'limit_reached',
        upgrade_url: 'https://mrghostguy.github.io/niceguyapi/',
        refill_price: req._tierConfig.cost_per_extra_request,
      }
    });
  }

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  const startTime = Date.now();
  const resolved = resolveModel(model);
  if (!resolved) {
    db.prepare('UPDATE api_keys SET monthly_used = monthly_used + ? WHERE id = ?').run(requestCost, req.apiKey.id);
    return res.status(400).json({ error: { message: `Model "${model}" not found.`, type: 'model_not_found' } });
  }

  const providerApiKey = resolved.provider.api_key || process.env.OPENROUTER_API_KEY;
  if (!providerApiKey) {
    db.prepare('UPDATE api_keys SET monthly_used = monthly_used + ? WHERE id = ?').run(requestCost, req.apiKey.id);
    return res.status(500).json({ error: { message: 'Server API key not configured. Contact support.', type: 'server_error' } });
  }

  try {
    const url = `${resolved.provider.base_url}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerApiKey}`,
        'HTTP-Referer': 'https://niceguyapi.onrender.com',
        'X-Title': 'NiceGuyAPI',
      },
      body: JSON.stringify({
        model: resolved.model,
        messages,
        stream: !!stream,
      }),
    });

    const latency = Date.now() - startTime;

    // Log usage
    try {
      db.prepare('INSERT INTO usage_log (api_key_id, model, provider, status, latency_ms, request_cost) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.apiKey.id, model, resolved.provider.id, response.status, latency, requestCost);
    } catch (e) {}

    // Update usage count
    db.prepare('UPDATE api_keys SET monthly_used = monthly_used + ?, total_requests = total_requests + 1 WHERE id = ?')
      .run(requestCost, req.apiKey.id);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[NiceGuyAPI] Provider error:', response.status, errText.slice(0, 200));
      return res.status(response.status).json({
        error: { message: `Provider error (${response.status}). Try again or use a different model.`, type: 'provider_error' }
      });
    }

    if (stream) {
      const reader = response.body;
      reader.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n').filter(l => l.trim());
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
            } catch (e) {}
          }
        }
      });
      reader.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });
      reader.on('error', () => res.end());
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    res.json({
      id: data.id || `chatcmpl-${uuidv4().slice(0, 8)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ message: { role: 'assistant', content }, finish_reason: data.choices?.[0]?.finish_reason || 'stop' }],
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });

  } catch (err) {
    console.error('[NiceGuyAPI] Chat error:', err.message);
    db.prepare('UPDATE api_keys SET monthly_used = monthly_used + ? WHERE id = ?').run(requestCost, req.apiKey.id);
    return res.status(500).json({ error: { message: 'Request failed. Please try again.', type: 'server_error' } });
  }
});

// ── Key Rotation ───────────────────────────────────────────────────────────

app.post('/v1/keys/rotate', authenticate, (req, res) => {
  const newRawKey = `gsk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const newHash = bcrypt.hashSync(newRawKey, 10);
  const newPrefix = newRawKey.slice(0, 12);

  db.prepare('UPDATE api_keys SET key_hash = ?, key_prefix = ? WHERE id = ?')
    .run(newHash, newPrefix, req.apiKey.id);

  res.json({
    key: newRawKey,
    prefix: newPrefix,
    message: 'Key rotated. Your old key is now invalid.',
    rotated_at: new Date().toISOString(),
  });
});

// ── Refill ─────────────────────────────────────────────────────────────────

app.post('/v1/billing/refill', authenticate, async (req, res) => {
  const { amount = 10 } = req.body;
  const cost = amount * req._tierConfig.cost_per_extra_request;

  if (!amount || amount < 1) {
    return res.status(400).json({ error: { message: 'amount must be at least 1', type: 'validation_error' } });
  }

  // Create Stripe Checkout Session for refill if Stripe is configured
  if (stripe) {
    try {
      const refillTierConfig = TIERS[req._tier];
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `NiceGuyAPI Refill — ${amount} Requests`,
              description: `${amount} additional requests for ${refillTierConfig.name} tier. $${cost.toFixed(2)}.`,
            },
            unit_amount: Math.round(cost * 100),
          },
          quantity: 1,
        }],
        success_url: 'https://mrghostguy.github.io/niceguyapi/#success',
        cancel_url: 'https://mrghostguy.github.io/niceguyapi/',
        customer_email: req.apiKey.email,
        metadata: {
          api_key_id: req.apiKey.id,
          type: 'refill',
          amount: String(amount),
        },
      });

      const sessionId = uuidv4();
      db.prepare('INSERT INTO billing_sessions (id, api_key_id, email, tier, price, status, stripe_session_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(sessionId, req.apiKey.id, req.apiKey.email, req._tier, cost, 'pending', session.id);

      return res.json({
        payment_required: true,
        payment: {
          stripe_url: session.url,
          amount: cost,
          requests: amount,
        },
        message: `Complete payment to add ${amount} requests for $${cost.toFixed(2)}.`,
      });
    } catch (stripeErr) {
      console.error('[NiceGuyAPI] Stripe refill error:', stripeErr.message);
      return res.status(500).json({ error: { message: 'Payment processing failed. Try again.', type: 'server_error' } });
    }
  }

  // No Stripe configured — add requests directly (dev mode)
  db.prepare('UPDATE api_keys SET monthly_limit = monthly_limit + ? WHERE id = ?').run(amount, req.apiKey.id);

  const sessionId = uuidv4();
  db.prepare('INSERT INTO billing_sessions (id, api_key_id, email, tier, price, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))')
    .run(sessionId, req.apiKey.id, req.apiKey.email, req._tier, cost, 'completed');

  res.json({
    message: `Added ${amount} requests for $${cost.toFixed(2)}.`,
    requests_added: amount,
    cost: cost,
    new_limit: req.apiKey.monthly_limit + amount,
  });
});

// ── Feature-Gated Endpoints ──────────────────────────────────────────────

// Image generation — Pro and Premium only
app.post('/v1/images/generate', authenticate, (req, res) => {
  if (!req._tierConfig.allows_image_gen) {
    return res.status(403).json({ error: { message: 'Image generation requires Pro or Premium tier.', type: 'tier_required', upgrade_url: 'https://mrghostguy.github.io/niceguyapi/' } });
  }
  const { prompt, size = '1024x1024' } = req.body;
  if (!prompt) return res.status(400).json({ error: { message: 'prompt is required', type: 'validation_error' } });
  // TODO: Route to image generation model via OpenRouter
  res.status(501).json({ error: { message: 'Image generation coming soon.', type: 'not_implemented' } });
});

// Song/music generation — Pro and Premium only
app.post('/v1/music/generate', authenticate, (req, res) => {
  if (!req._tierConfig.allows_song_gen) {
    return res.status(403).json({ error: { message: 'Music generation requires Pro or Premium tier.', type: 'tier_required', upgrade_url: 'https://mrghostguy.github.io/niceguyapi/' } });
  }
  const { prompt, duration = 30, genre } = req.body;
  if (!prompt) return res.status(400).json({ error: { message: 'prompt is required', type: 'validation_error' } });
  // TODO: Route to music generation model via OpenRouter
  res.status(501).json({ error: { message: 'Music generation coming soon.', type: 'not_implemented' } });
});

// Website creation + hosting — Premium only
app.post('/v1/websites', authenticate, (req, res) => {
  if (!req._tierConfig.allows_games_apps) {
    return res.status(403).json({ error: { message: 'Website creation requires Premium tier.', type: 'tier_required', upgrade_url: 'https://mrghostguy.github.io/niceguyapi/' } });
  }
  const { name, description, framework } = req.body;
  if (!name || !description) return res.status(400).json({ error: { message: 'name and description are required', type: 'validation_error' } });
  // TODO: Generate site with AI, deploy to hosting
  res.status(501).json({ error: { message: 'Website creation coming soon.', type: 'not_implemented' } });
});

// Game creation + hosting — Premium only
app.post('/v1/games', authenticate, (req, res) => {
  if (!req._tierConfig.allows_games_apps) {
    return res.status(403).json({ error: { message: 'Game creation requires Premium tier.', type: 'tier_required', upgrade_url: 'https://mrghostguy.github.io/niceguyapi/' } });
  }
  const { name, description, genre, engine } = req.body;
  if (!name || !description) return res.status(400).json({ error: { message: 'name and description are required', type: 'validation_error' } });
  // TODO: Generate game with AI, deploy to hosting
  res.status(501).json({ error: { message: 'Game creation coming soon.', type: 'not_implemented' } });
});

// App creation + hosting — Premium only
app.post('/v1/apps', authenticate, (req, res) => {
  if (!req._tierConfig.allows_games_apps) {
    return res.status(403).json({ error: { message: 'App creation requires Premium tier.', type: 'tier_required', upgrade_url: 'https://mrghostguy.github.io/niceguyapi/' } });
  }
  const { name, description, platform } = req.body;
  if (!name || !description) return res.status(400).json({ error: { message: 'name and description are required', type: 'validation_error' } });
  // TODO: Generate app with AI, deploy to hosting
  res.status(501).json({ error: { message: 'App creation coming soon.', type: 'not_implemented' } });
});

// ── Admin ──────────────────────────────────────────────────────────────────

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

// ── Health Check ──────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: '3.5.0',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// ── Root docs ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    name: 'NiceGuyAPI',
    version: '3.5.0',
    description: 'One API for every AI provider. OpenAI-compatible interface.',
    base_url: '/v1',
    pricing: {
      free: '$0/mo — 14 requests',
      pro: '$6/mo — 40 requests (includes image + song generation)',
      premium: '$27/mo — 500 requests (includes image + song + website/game/app creation + hosting)',
      refill: 'Pay-as-you-go refills available.',
    },
    endpoints: {
      'GET /health': 'Health check',
      'POST /v1/signup': 'Create a new account (public, rate-limited)',
      'GET /v1/models': 'List available models for your tier',
      'POST /v1/chat/completions': 'Chat with any AI model (OpenAI-compatible)',
      'GET /v1/usage': 'Current usage, quotas, and feature details',
      'POST /v1/billing/refill': 'Buy extra requests (pay-as-you-go)',
      'POST /v1/keys/rotate': 'Regenerate your API key',
      'POST /v1/stripe/webhook': 'Stripe webhook (Stripe only)',
    },
    auth: 'Include X-API-Key header with all /v1 requests (except signup)',
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────

app.use((req, res) => {
  apiError(res, 404, `Route ${req.method} ${req.path} not found`, 'not_found', {
    docs: 'https://niceguyapi.onrender.com/',
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
      try { persistDb(); } catch (e) {}
      process.exit(0);
    });
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

initDb().then(() => {
  scheduleUsageResets();
  server = app.listen(PORT, () => {
    const bootTime = Date.now() - startTime;
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🏗️  NiceGuyAPI v3.5 — AI Model Gateway         ║
  ║  Running on port ${PORT}${' '.repeat(Math.max(0, 19 - String(PORT).length))}║
  ║  Endpoint: http://localhost:${PORT}/v1${' '.repeat(Math.max(0, 8 - String(PORT).length))}║
  ║  Stripe: ${stripe ? 'ENABLED ✅' : 'DISABLED ⚠️'}${' '.repeat(Math.max(0, 29 - (stripe ? 11 : 14)))}║
  ║  Boot: ${bootTime}ms${' '.repeat(Math.max(0, 29 - String(bootTime).length))}║
  ╚══════════════════════════════════════════════╝
  `);
  });
}).catch(err => {
  console.error('[NiceGuyAPI] Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
