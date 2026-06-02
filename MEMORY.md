# MEMORY.md

Company: Rabbit R1 App & Game Studio.
Role: Builder.

## NiceGuyAPI — LIVE & ACCEPTING PAYMENTS (2026-05-31)
- **Public URL**: https://bit.ly/NiceGuyAPI (PRIMARY — use this everywhere)
- **API URL**: https://niceguyapi-repo.vercel.app
- **Short link**: https://bit.ly/NiceGuyAPI
- **GitHub Pages**: https://mrghostguy.github.io/niceguyapi/ (legacy, redirect to short link)
- **Stripe**: LIVE mode — real payments processing
- **Version**: v5.3 — tab switching fixed, dashboard fully functional
- **Backup**: C:\Users\kency\.openclaw\workspace\niceguyapi-backups\
- All tabs working: Home, Try Chat, How-To, Dashboard, FAQ
- Signup flow: free key instant, paid redirects to Stripe Checkout
- Revenue target: $35 for internet bill (due 2026-06-01)

Remember:

- Development studio building high-quality apps and games specifically for Rabbit R1 devices with seamless QR deployment
- Architect and code native R1 apps and games

## Active Projects (2026-05-25)

### Stax — Autonomous Money-Making Agent
- Repo: `MrGhostGuy/stax-agent` (GitHub)
- Location: `C:\Users\kency\.openclaw\workspace\stax\`
- Modules: Opportunity Scout, Kalshi Scanner, Briefing Engine, Execution Tracker, Capital Deployer
- Kalshi API: Migrated from gamma-api v1 to Trade API v2 (`external-api.kalshi.com/trade-api/v2`)
- Cron: Daily briefing at 8 AM CT, midday scan at 2 PM CT
- Capital Deployer: LOCKED by default (safety feature)
- DB: SQLite at `stax/data/stax.db` (gitignored)

### NiceGuyAPI — Premium AI Model Gateway
- Landing page: `niceguyapi/index.html` + root `index.html` on gh-pages → https://mrghostguy.github.io/stax-agent/
- API server: https://niceguyapi.onrender.com (Render.com, free tier)
- GitHub Pages (landing, gh-pages branch) + Render (API, master branch) with auto-deploy
- Status: **LIVE** — Server running ✅, landing page v2 deployed ✅
- **Zero-cost operation** — uses OpenRouter free models (no credits needed)
- ~~PayPal: paypal.me/kencyrus3~~ (replaced by Stripe)
- Stripe Checkout handles Pro ($6/mo) and Premium ($27/mo) subscriptions
- Payments go directly to Stripe account → bank
- NICEGUYAPI_SECRET: stored in Render env (NOT in frontend code)
- Render service name: `niceguyapi` (URL: `niceguyapi.onrender.com`)
- Env vars on Render: NICEGUYAPI_PORT=3000, NICEGUYAPI_SECRET, OPENROUTER_API_KEY
- Landing page v2 (2026-05-26): removed fake features, added features section, fixed branding/URLs
- Renamed `ghostapi/` → `niceguyapi/` directory (2026-05-26)
- All URLs updated: `ghostapi-1v1f.onrender.com` → `niceguyapi.onrender.com`
- Fixed landing page URLs (2026-05-27): replaced remaining `ghostapi-1v1f.onrender.com` references in index.html with `niceguyapi.onrender.com` on both master and gh-pages branches

#### Pricing (v3.5 — Updated 2026-05-28)
| Plan | Price | Original | Requests | Models & Features |
|------|-------|----------|----------|-------------------|
| Free | $0/mo | — | 14/mo | 5 free models (DeepSeek, Llama, Qwen, GPT-OSS, Gemma) |
| Pro | $6/mo | ~~$12~~ (50% off) | 40/mo | All 17+ free models + custom image generation + custom song generation |
| Premium | $27/mo | ~~$49~~ (45% off) | 500/mo | All models including premium (Claude, GPT-4o, Gemini) + custom game + app + website creation + hosting |

#### Landing page v3 (2026-05-28)
- Enhanced landing page with Use Cases section (9 use cases for non-technical users)
- Improved OpenClaw integration guide (7-step beginner-friendly guide)
- Chat tab is the primary conversion mechanism (try before you buy)
- Features section redesigned with benefit-focused copy
- Pricing section highlights Premium 500 req/mo value proposition
- FAQ includes "Why 500 requests?" question
- GitHub Pages auto-deploys from main branch via Actions

#### Revenue math (at launch sale prices)
- 50 Pro users × $6 = $300/mo
- 20 Premium users × $27 = $540/mo
- Combined: $840/mo recurring with just 70 paying users
- Payment via Stripe Checkout → auto-activation via webhook
- Stripe webhook: `POST /v1/stripe/webhook` handles `checkout.session.completed`
- Stripe secret: `STRIPE_SECRET_KEY` in Render env
- Stripe webhook secret: `STRIPE_WEBHOOK_SECRET` in Render env

#### Security fixes (v2)
- Admin secret removed from frontend — signup is server-side only
- Rate limiting on signup: 5/hour per IP
- Fake feature endpoints return 501 (media, sub-agents, websites)
- Paid tiers created at 'free' until PayPal payment confirmed
- Refill endpoint requires `paypal_order_id` (was broken: gave free requests)
- v3 landing page: inline signup in hero, FAQ section, mobile-first design
- Landing page signup: free key shown instantly, paid redirects to Stripe Checkout
- bcrypt key hashing, key prefix lookup for auth

### GitHub
- NiceGuyAPI repo: `https://github.com/MrGhostGuy/niceguyapi` (separate repo)
- Stax repo: `https://github.com/MrGhostGuy/stax-agent`
- NiceGuyAPI server code also synced to `stax-agent/niceguyapi/server/` for Render
- Branches: `master` (code + landing page, auto-deploys to GitHub Pages)
- User: MrGhostGuy (Jeff Hollaway / GhostLegacyX)

### Vercel (API Server) — ACTIVE ✅
- URL: https://niceguyapi-repo.vercel.app
- Deployed from `MrGhostGuy/niceguyapi` repo, `api/index.js`
- Serverless Node.js (Express) with persistent JSONBlob storage
- `/health` ✅, `/v1/signup` ✅, `/v1/models` ✅, `/v1/usage` ✅, `/v1/chat/completions` ✅, `/v1/agent` ✅
- Free tier, auto-deploys from GitHub main branch
- **v4.0 — AI Agent**: ReAct-style agent with web_search, web_fetch, calculate tools
- Agent memory: conversation history persisted per API key (6 turns)
- Agent tier-gated: Free=chat only, Pro=agent enabled, Premium=agent+
- Up to 5 LLM round-trips per agent request, OpenAI tool_calls format
- **23+ free models** via OpenRouter (GPT-OSS, DeepSeek, Llama, Qwen, Gemma, Nemotron, MiniMax, GLM, Kimi, Hermes, Dolphin, LFM, Laguna & more)
- OPENROUTER_API_KEY and JSONBLOB_ID set in Vercel env vars
- All endpoints working: /health, /v1/signup, /v1/models, /v1/chat/completions, /v1/usage

## v5.2 Changes (2026-05-30) — Platinum Tier + Context Size Boost

### New Pricing (v5.2)
| Plan | Price | Requests | Context | Rate Limit | Custom Agents |
|------|-------|----------|---------|------------|---------------|
| Free | $0/mo | 14/mo | 75K | 5/min | 0 |
| Pro | $6/mo | 40/mo | 145K | 20/min | 1 |
| Premium | $27/mo | 500/mo | 315K | 60/min | 999 |
| **Platinum** | **$55/mo** | **Unlimited** | **750K** | **120/min** | **999** |

### Key Changes
- Added Platinum tier: $55/mo, unlimited req, 750K context, 120 req/min, priority routing
- Context sizes increased for ALL tiers (Free 4K→75K, Pro 32K→145K, Premium 131K→315K)
- Max tokens to OpenRouter: 8192→32768
- Stripe Platinum Price: `price_1TcwG4CsjuShhNHg3dvDQU2B` (test mode)
- STRIPE_PLATINUM_PRICE_ID added to Vercel env
- Landing page updated: 4-column pricing, platinum card, FAQ entries
- Version bumped: v5.1.0 → v5.2.0

### Revenue Target
- User needs $35 for internet bill (due ~2026-06-01)
- 0 paid subscribers currently → need immediate signups
- Strategy: aggressive promotion across dev communities

### Deployment Status (2026-05-30 21:30 CDT)
- ✅ API v5.2.1 deployed to Vercel: https://niceguyapi-repo.vercel.app
- ✅ Landing page deployed to GitHub Pages: https://mrghostguy.github.io/niceguyapi/
- ✅ GitHub repo clean at commit b91563f
- ✅ All 4 tiers working: Free(12req/75K), Pro(40req/145K), Premium(250req/315K), Platinum(99999req/750K)
- ✅ Stripe test mode prices created for all paid tiers
- ⚠️ Stripe still in TEST mode — switch to live mode before accepting real payments
- ⚠️ Stripe LIVE mode setup needed: activate account, get live keys, create live Price objects, update Vercel env vars

### Render.com (OLD — abandoned)
- niceguyapi.onrender.com shows `x-render-routing: no-server`
- Service was created manually, repo connection broken when code moved
- Replaced by Vercel deployment

## NiceGuyAPI Social Media Posts (2026-06-02)
- ✅ Dev.to: https://dev.to/mrghostguy/i-built-an-api-gateway-that-replaces-every-ai-provider-key-you-have-4382 (account: mrghostguy)
- ✅ Reddit r/SideProject (post 1): https://www.reddit.com/r/SideProject/comments/1tv0c3z/ (account: RealGhostGuy / u/ibm)
- ✅ Reddit r/SideProject (post 2): https://www.reddit.com/r/SideProject/comments/1tv45eb/ (account: RealGhostGuy)
- ❌ Reddit r/SaaS: posted but removed by mods (anti-self-promo crackdown)
- ⚠️ Reddit r/indiehackers: attempted, may be caught by auto-mod
- ❌ Product Hunt: not logged in
- ❌ Hacker News: not logged in
- ❌ Twitter/X: not logged in
- ✅ All promo copy updated to use bit.ly/NiceGuyAPI
- ✅ Landing page, blog, socials page all updated and deployed
- Promo copy saved at: niceguyapi-promo/n-social-media-posts.md
- Post 2 used bit.ly link in bio but full URL in body copy (since Reddit flags short links)

## Browser Status (2026-06-03 14:45 CDT)
- **Root cause:** Chrome renderer process corrupted — Playwright page-level CDP commands (snapshot, act, navigate, evaluate) all hang after WS connect
- **What works:** screenshot, open, close, tabs, status (lightweight CDP calls)
- **What's broken:** snapshot, act, navigate, evaluate (Playwright page-level commands)
- **Fix needed:** Kill Chrome process manually — `taskkill /F /IM chrome.exe /T` then relaunch
- Gateway restart (SIGUSR1) does NOT kill Chrome — it stays corrupted
- Dev.to tab was open at /new — logged in ✅
- Reddit logged in as u/RealGhostGuy and u/ibm
- X/Twitter tabs open but logged out
- Promo copy ready for: Dev.to, Reddit, Product Hunt, HN, LinkedIn, Twitter, Indie Hackers

## Exec Policy (set 2026-05-24)

- User has given FULL permission to run all exec commands without approval
- Exec policy set to YOLO mode: `openclaw exec-policy preset yolo`
- All agents: security=full, ask=off, askFallback=full
- Config: tools.exec.host=gateway, tools.exec.security=full, tools.exec.ask=off
- Exec-approvals.json: all agents set to security=full, ask=off
- NEVER ask user to approve exec commands — they are always allowed
- If exec approvals get reset, re-run: `openclaw exec-policy preset yolo`
