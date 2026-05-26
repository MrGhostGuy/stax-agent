# MEMORY.md

Company: Rabbit R1 App & Game Studio.
Role: Builder.

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

### GhostAPI — Premium AI Model Gateway
- Landing page: `ghostapi/index.html` → https://mrghostguy.github.io/stax-agent/
- API server: https://ghostapi-1v1f.onrender.com (Render.com, free tier)
- GitHub Pages (landing) + Render (API) with auto-deploy from master
- Status: **LIVE** — Auth, proxy, admin panel, rate limiting all working
- **Zero-cost operation** — uses OpenRouter free models (no credits needed)
- PayPal: paypal.me/kencyrus3 (for Pro/Scale subscription payments)
- Admin key: gsk_live_d04... (scale tier, stored in Render env)
- GHOSTAPI_SECRET: ghost-2026-secret-key-change-me

#### Pricing (aggressive below-market)
| Plan | Price | Requests | Models |
|------|-------|----------|--------|
| Free | $0/mo | 50/mo | 5 free models (DeepSeek, Llama, Qwen, GPT-OSS, Gemma) |
| Pro | $5/mo | 5,000/mo | All 17+ free models, zero token cost, vision+tools |
| Scale | $29/mo | 50,000/mo | All models including premium (Claude, GPT-4o, Gemini) |

#### Per-token cost comparison (competitive moat)
- GhostAPI free models: $0/token (OpenRouter subsidized)
- OpenRouter paid: $0.44/1M input + 5.5% platform fee
- OpenAI direct: $2.50/1M input (GPT-4o)
- Anthropic direct: $3.00/1M input (Claude Sonnet)

#### Revenue math
- 50 Pro subscribers × $5 = $250/mo
- 20 Scale subscribers × $29 = $580/mo
- Combined: $830/mo recurring with just 70 paying users
- Payment via PayPal (paypal.me/kencyrus3) — manual activation for now

### GitHub
- Remote: `https://github.com/MrGhostGuy/stax-agent`
- Branches: `master` (code), `gh-pages` (GhostAPI landing page)
- User: MrGhostGuy (Jeff Hollaway / GhostLegacyX)

## Exec Policy (set 2026-05-24)

- User has given FULL permission to run all exec commands without approval
- Exec policy set to YOLO mode: `openclaw exec-policy preset yolo`
- All agents: security=full, ask=off, askFallback=full
- Config: tools.exec.host=gateway, tools.exec.security=full, tools.exec.ask=off
- Exec-approvals.json: all agents set to security=full, ask=off
- NEVER ask user to approve exec commands — they are always allowed
- If exec approvals get reset, re-run: `openclaw exec-policy preset yolo`
