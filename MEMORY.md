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
- OpenRouter account needs credits for live AI completions
- Admin key: gsk_live_d04... (scale tier, stored in Render env)
- GHOSTAPI_SECRET: ghost-2026-secret-key-change-me

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
