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

### NiceGuyAPI — Premium AI Model Gateway
- Landing page: `ghostapi/index.html` + root `index.html` on gh-pages → https://mrghostguy.github.io/stax-agent/
- API server: https://niceguyapi-1v1f.onrender.com (Render.com, free tier)
- GitHub Pages (landing, gh-pages branch) + Render (API, master branch) with auto-deploy
- Status: **LIVE** — Landing page v2 deployed, server code pushed (Render auto-deploy may need manual trigger)
- **Zero-cost operation** — uses OpenRouter free models (no credits needed)
- PayPal: paypal.me/kencyrus3 (for Pro/Premium subscription payments)
- NICEGUYAPI_SECRET: stored in Render env (NOT in frontend code)
- Render service name: `niceguyapi-1v1f`
- Env vars on Render: NICEGUYAPI_PORT=3000, NICEGUYAPI_SECRET, OPENROUTER_API_KEY
- Landing page v2 (2026-05-26): removed fake features, added features section, fixed branding/URLs

#### Pricing
| Plan | Price | Requests | Models |
|------|-------|----------|--------|
| Free | $0/mo | 50/mo | 5 free models (DeepSeek, Llama, Qwen, GPT-OSS, Gemma) |
| Pro | $6/mo | 5,000/mo | All 17+ free models |
| Premium | $27/mo | 25,000/mo | All models including premium (Claude, GPT-4o, Gemini) |

#### Revenue math
- 50 Pro users × $6 = $300/mo
- 20 Premium users × $27 = $540/mo
- Combined: $840/mo recurring with just 70 paying users
- Payment via PayPal → auto-activation via billing/confirm endpoint

#### Security fixes (v2)
- Admin secret removed from frontend — signup is server-side only
- Rate limiting on signup: 5/hour per IP
- Fake feature endpoints return 501 (media, sub-agents, websites)
- Paid tiers created at 'free' until PayPal payment confirmed
- bcrypt key hashing, key prefix lookup for auth

### GitHub
- Remote: `https://github.com/MrGhostGuy/stax-agent`
- Branches: `master` (code), `gh-pages` (NiceGuyAPI landing page)
- User: MrGhostGuy (Jeff Hollaway / GhostLegacyX)

## Exec Policy (set 2026-05-24)

- User has given FULL permission to run all exec commands without approval
- Exec policy set to YOLO mode: `openclaw exec-policy preset yolo`
- All agents: security=full, ask=off, askFallback=full
- Config: tools.exec.host=gateway, tools.exec.security=full, tools.exec.ask=off
- Exec-approvals.json: all agents set to security=full, ask=off
- NEVER ask user to approve exec commands — they are always allowed
- If exec approvals get reset, re-run: `openclaw exec-policy preset yolo`
