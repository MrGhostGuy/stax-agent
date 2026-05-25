/**
 * GhostAPI — Premium AI Model Gateway
 * 
 * One API endpoint for Claude, GPT, Gemini, Grok.
 * OpenAI-compatible /v1/chat/completions interface.
 * 
 * Environment variables:
 *   GHOSTAPI_PORT — server port (default 3000)
 *   GHOSTAPI_SECRET — admin secret for key management
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

const PORT = parseInt(process.env.GHOSTAPI_PORT || '3000', 10);
const ADMIN_SECRET = process.env.GHOSTAPI_SECRET || 'ghost-dev-secret-change-me';

// ── Database ──────────────────────────────────────────────────────────────

const dbPath = path.join(__dirname, '..', 'data', 'ghostapi.db');
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
    tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'pro', 'scale')),
    active INTEGER DEFAULT 1,
    monthly_limit INTEGER DEFAULT 1000,
    monthly_used INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT
  );

  CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id TEXT NOT NULL,
    model TEXT,
    provider TEXT,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    status INTEGER DEFAULT 200,
    latency_ms INTEGER DEFAULT 0,
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

  CREATE INDEX IF NOT EXISTS idx_usage_key ON usage_log(api_key_id);
  CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(created_at);
`);

// Seed default provider configs if empty
const providerCount = db.prepare('SELECT COUNT(*) as c FROM provider_config').get();
if (providerCount.c === 0) {
  const insert = db.prepare('INSERT INTO provider_config (id, name, base_url, priority, models) VALUES (?, ?, ?, ?, ?)');
  const defaults = [
    ['openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 1, '["anthropic/claude-sonnet-4","openai/gpt-4o","google/gemini-2.0-flash","x-ai/grok-beta"]'],
    ['anthropic', 'Anthropic', 'https://api.anthropic.com', 2, '["claude-sonnet-4-20250514","claude-haiku-4-20250514"]'],
    ['openai', 'OpenAI', 'https://api.openai.com/v1', 3, '["gpt-4o","gpt-4o-mini","o3-mini"]'],
  ];
  for (const p of defaults) insert.run(...p);
}

// ── Provider Router ────────────────────────────────────────────────────────

const providerCache = new Map();

function getProviders() {
  const rows = db.prepare('SELECT * FROM provider_config WHERE active = 1 ORDER BY priority').all();
  return rows.map(r => ({ ...r, models: JSON.parse(r.models || '[]') }));
}

async function proxyToProvider(provider, model, messages, stream = false) {
  const startTime = Date.now();
  const headers = {
    'Content-Type': 'application/json',
  };
  let url;
  let body;

  if (provider.id === 'openrouter') {
    url = `${provider.base_url}/chat/completions`;
    headers['Authorization'] = `Bearer ${provider.api_key || process.env.OPENROUTER_API_KEY || ''}`;
    headers['HTTP-Referer'] = 'https://ghostapi.dev';
    headers['X-Title'] = 'GhostAPI';
    body = { model, messages, stream };
  } else if (provider.id === 'anthropic') {
    url = `${provider.base_url}/v1/messages`;
    headers['x-api-key'] = provider.api_key || process.env.ANTHROPIC_API_KEY || '';
    headers['anthropic-version'] = '2023-06-01';
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMsgs = messages.filter(m => m.role !== 'system');
    body = {
      model,
      max_tokens: 4096,
      messages: otherMsgs,
    };
    if (systemMsg) body.system = systemMsg.content;
    if (stream) body.stream = true;
  } else if (provider.id === 'openai') {
    url = `${provider.base_url}/chat/completions`;
    headers['Authorization'] = `Bearer ${provider.api_key || process.env.OPENAI_API_KEY || ''}`;
    body = { model, messages, stream };
  } else {
    throw new Error(`Unknown provider: ${provider.id}`);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const latency = Date.now() - startTime;

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, status: res.status, error: errText, latency };
  }

  if (stream) {
    return { ok: true, status: res.status, stream: res.body, latency };
  }

  const data = await res.json();

  // Normalize to OpenAI format
  let content;
  if (provider.id === 'anthropic') {
    content = data.content?.[0]?.text || '';
  } else {
    content = data.choices?.[0]?.message?.content || '';
  }

  return {
    ok: true,
    status: res.status,
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

// Resolve model name to provider
function resolveModel(modelName) {
  const providers = getProviders();
  // Direct provider/model format: "openrouter/anthropic/claude-sonnet-4"
  if (modelName.includes('/')) {
    const [providerId, ...rest] = modelName.split('/');
    const provider = providers.find(p => p.id === providerId);
    if (provider) return { provider, model: rest.join('/') };
  }
  // Search by model name across providers
  for (const provider of providers) {
    if (provider.models.includes(modelName)) {
      return { provider, model: modelName };
    }
  }
  // Default to first provider with a similar model
  for (const provider of providers) {
    const match = provider.models.find(m => m.toLowerCase().includes(modelName.toLowerCase().split('-')[0]));
    if (match) return { provider, model: match };
  }
  // Fallback: use first provider
  if (providers.length > 0) {
    return { provider: providers[0], model: providers[0].models[0] || modelName };
  }
  return null;
}

// ── Express App ────────────────────────────────────────────────────────────

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
});
app.use(limiter);

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

  // Check monthly limit
  const now = new Date();
  const lastReset = keyRecord.last_used_at ? new Date(keyRecord.last_used_at) : now;
  let monthlyUsed = keyRecord.monthly_used;
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    monthlyUsed = 0;
    db.prepare('UPDATE api_keys SET monthly_used = 0 WHERE id = ?').run(keyRecord.id);
  }

  if (monthlyUsed >= keyRecord.monthly_limit) {
    return res.status(429).json({
      error: {
        message: `Monthly limit reached (${keyRecord.monthly_limit} requests). Upgrade at https://ghostapi.dev/pricing`,
        type: 'rate_limit_error',
      }
    });
  }

  req.apiKey = keyRecord;
  req.monthlyUsed = monthlyUsed;
  next();
}

// ── API Routes ─────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// List available models (OpenAI-compatible)
app.get('/v1/models', authenticate, (req, res) => {
  const providers = getProviders();
  const models = [];
  for (const p of providers) {
    for (const m of p.models) {
      models.push({
        id: `${p.id}/${m}`,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: p.id,
      });
    }
  }
  res.json({ object: 'list', data: models });
});

// Chat completions (OpenAI-compatible) — THE MAIN ENDPOINT
app.post('/v1/chat/completions', authenticate, async (req, res) => {
  const { model = 'openrouter/anthropic/claude-sonnet-4', messages, stream = false, temperature, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'messages array is required', type: 'validation_error' } });
  }

  const resolved = resolveModel(model);
  if (!resolved) {
    return res.status(400).json({ error: { message: `No provider available for model: ${model}`, type: 'model_error' } });
  }

  const { provider, model: resolvedModel } = resolved;

  if (!provider.api_key && !process.env[`${provider.id.toUpperCase()}_API_KEY`] && !process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({
      error: {
        message: `Provider ${provider.id} is not configured. Set the ${provider.id.toUpperCase()}_API_KEY environment variable.`,
        type: 'provider_error',
      }
    });
  }

  try {
    const result = await proxyToProvider(provider, resolvedModel, messages, stream);

    // Update usage
    db.prepare(`UPDATE api_keys SET monthly_used = monthly_used + 1, total_requests = total_requests + 1, last_used_at = datetime('now') WHERE id = ?`)
      .run(req.apiKey.id);

    db.prepare('INSERT INTO usage_log (api_key_id, model, provider, status, latency_ms) VALUES (?, ?, ?, ?, ?)')
      .run(req.apiKey.id, resolvedModel, provider.id, result.status, result.latency);

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
      } catch (e) {
        // Client disconnected
      }
      res.end();
      return;
    }

    res.json(result.data);
  } catch (err) {
    console.error('[GhostAPI] Proxy error:', err.message);
    res.status(502).json({ error: { message: 'Provider request failed: ' + err.message, type: 'proxy_error' } });
  }
});

// ── Admin Routes ───────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Create a new API key
app.post('/admin/keys', adminAuth, (req, res) => {
  const { name, email, tier = 'free', monthly_limit } = req.body;
  const id = uuidv4();
  const rawKey = `gsk_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '')}`;
  const keyHash = bcrypt.hashSync(rawKey, 10);
  const keyPrefix = rawKey.slice(0, 12);
  const limit = monthly_limit || (tier === 'scale' ? 1000000 : tier === 'pro' ? 100000 : 1000);

  db.prepare('INSERT INTO api_keys (id, key_hash, key_prefix, name, email, tier, monthly_limit) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, keyHash, keyPrefix, name || 'Default', email || '', tier, limit);

  res.json({
    id,
    key: rawKey,
    prefix: keyPrefix,
    name,
    email,
    tier,
    monthly_limit: limit,
    created_at: new Date().toISOString(),
  });
});

// List all API keys (without hashes)
app.get('/admin/keys', adminAuth, (req, res) => {
  const keys = db.prepare('SELECT id, key_prefix, name, email, tier, active, monthly_limit, monthly_used, total_requests, created_at, last_used_at FROM api_keys ORDER BY created_at DESC').all();
  res.json({ keys });
});

// Get usage stats
app.get('/admin/stats', adminAuth, (req, res) => {
  const totalKeys = db.prepare('SELECT COUNT(*) as c FROM api_keys').get().c;
  const activeKeys = db.prepare('SELECT COUNT(*) as c FROM api_keys WHERE active = 1').get().c;
  const totalRequests = db.prepare('SELECT COALESCE(SUM(total_requests), 0) as c FROM api_keys').get().c;
  const todayRequests = db.prepare("SELECT COUNT(*) as c FROM usage_log WHERE date(created_at) = date('now')").get().c;
  const recentUsage = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as requests, COUNT(DISTINCT api_key_id) as users
    FROM usage_log
    WHERE created_at > datetime('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY day DESC
  `).all();

  res.json({ total_keys: totalKeys, active_keys: activeKeys, total_requests: totalRequests, today_requests: todayRequests, daily_usage: recentUsage });
});

// Configure a provider
app.post('/admin/providers', adminAuth, (req, res) => {
  const { id, name, base_url, api_key, active, priority, models } = req.body;
  db.prepare(`
    INSERT OR REPLACE INTO provider_config (id, name, base_url, api_key, active, priority, models)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, base_url, api_key, active ? 1 : 0, priority || 0, JSON.stringify(models || []));
  res.json({ ok: true, id });
});

// ── Docs & Landing Page ───────────────────────────────────────────────────

// API documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    name: 'GhostAPI',
    version: '1.0.0',
    description: 'One API for every AI provider. OpenAI-compatible interface.',
    base_url: '/v1',
    endpoints: {
      'POST /v1/chat/completions': {
        description: 'OpenAI-compatible chat completions',
        auth: 'X-API-Key header or Authorization: Bearer <key>',
        body: '{ model, messages, stream?, temperature?, max_tokens? }',
        models: 'Use provider/model format (e.g. openrouter/anthropic/claude-sonnet-4) or plain model names',
      },
      'GET /v1/models': {
        description: 'List available models across all providers',
        auth: 'X-API-Key header',
      },
      'GET /health': {
        description: 'Health check (no auth)',
      },
      'POST /admin/keys': {
        description: 'Create a new API key (admin only)',
        auth: 'X-Admin-Secret header',
        body: '{ name?, email?, tier?: free|pro|scale, monthly_limit? }',
      },
      'GET /admin/keys': {
        description: 'List all API keys (admin only)',
        auth: 'X-Admin-Secret header',
      },
      'GET /admin/stats': {
        description: 'Usage statistics (admin only)',
        auth: 'X-Admin-Secret header',
      },
      'POST /admin/providers': {
        description: 'Configure a provider (admin only)',
        auth: 'X-Admin-Secret header',
        body: '{ id, name, base_url, api_key?, active?, priority?, models? }',
      },
    },
    pricing: {
      free: '$0/mo — 1,000 requests/month',
      pro: '$29/mo — 100,000 requests/month',
      scale: '$99/mo — 1,000,000 requests/month',
    },
  });
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║  🏗️  GhostAPI v1.0 — AI Model Gateway   ║
  ║  Running on port ${PORT}                    ║
  ║  Endpoint: http://localhost:${PORT}/v1      ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
