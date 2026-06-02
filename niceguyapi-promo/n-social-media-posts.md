# NiceGuyAPI Social Media Promotion - Draft Copy

## Twitter/X - Post 1 (Launch Announcement)
---
🚀 I built an OpenRouter-powered API gateway that gives you access to 23+ AI models (Claude, GPT-4o, DeepSeek, Llama & more) through a single API key.

✅ Free tier: 14 req/mo
✅ Pro: $6/mo → 40 req/mo
✅ Premium: $27/mo → 500 req/mo

Drop-in replacement for OpenAI's API. Zero code changes.

https://bit.ly/NiceGuyAPI

#AI #API #buildinpublic #ChatGPT #developers
---

## Twitter/X - Post 2 (Pain Point)
---
Tired of managing 5 different API keys for 5 different AI providers?

I got tired of it too, so I built NiceGuyAPI:
→ One API key
→ 23+ models (free + premium)
→ OpenAI-compatible endpoint
→ Free tier to try it

https://bit.ly/NiceGuyAPI

#developers #AI #OpenAI #coding
---

## Twitter/X - Post 3 (Comparison/Gotcha)
---
Hot take: You don't need to pay $20/mo for ChatGPT Plus if you're building apps.

NiceGuyAPI gives you Claude, GPT-4o, DeepSeek, Llama + 19 more models through one API.

Starts at $6/mo. Free tier available.
One API to rule them all. 👇

https://bit.ly/NiceGuyAPI
---

## Reddit - r/selfhosted
---
**Showoff Saturday** | NiceGuyAPI — OpenRouter-powered gateway with a single API key for 23+ AI models

Hey all,

I've been building [NiceGuyAPI](https://bit.ly/NiceGuyAPI) — a lightweight API gateway that sits in front of OpenRouter and lets you access 23+ AI models through a single key with an OpenAI-compatible endpoint.

**Features:**
- One API key for all models (free + premium)
- OpenAI-compatible `/v1/chat/completions` — zero code changes
- Free tier: 14 req/mo to try it
- Pro: $6/mo (40 req), Premium: $27/mo (500 req + premium models)
- Rate limiting & key management built in

Built this because I was juggling 5+ API keys across projects. Figured someone else might find it useful.

Free tier requires no credit card. Feedback welcome!

GitHub: https://github.com/MrGhostGuy/niceguyapi
---

## Reddit - r/webdev
---
**[Tool] NiceGuyAPI — One API key for 23+ AI models (OpenAI-compatible)**

I built [NiceGuyAPI](https://bit.ly/NiceGuyAPI) to solve a problem I kept having: managing multiple API keys across different AI providers.

Now I have one API key, one endpoint, and access to Claude, GPT-4o, DeepSeek, Llama, Qwen, Gemma, and 17+ more models.

**Pricing:**
- Free: 14 req/mo (no CC needed)
- Pro: $6/mo → 40 req/mo + image & song generation
- Premium: $27/mo → 500 req/mo + premium models
- Platinum: $55/mo → Unlimited

It's a drop-in replacement for the OpenAI API. Change one URL and one key — that it.

Would love to hear if this solves a problem for anyone else.

---

## Hacker News - Show HN
---
**Show HN: NiceGuyAPI — One API key for 23+ AI models (OpenRouter gateway)**

Hi HN,

I built NiceGuyAPI because I was tired of managing separate API keys for Claude, OpenAI, DeepSeek, etc. It's an OpenRouter-backed gateway that gives you a single API key with an OpenAI-compatible endpoint.

Features:
- Access 23+ models through one key
- Drop-in replacement for OpenAI API (change URL + key)
- Tiered plans from free (14 req/mo) to $55/mo unlimited
- Per-key rate limiting and usage tracking

The free tier needs no credit card — just sign up and get a key instantly.

Site: https://bit.ly/NiceGuyAPI
API: https://niceguyapi-repo.vercel.app
Code: https://github.com/MrGhostGuy/niceguyapi

Curious what you all think. Is this something you'd use, or is the "multiple API key" problem not painful enough to solve?

---

## Product Hunt - Launch Title & Tagline
---
**NiceGuyAPI: One API key for 23+ AI models**
Tagline: OpenRouter-powered gateway — Claude, GPT-4o, DeepSeek & more through a single OpenAI-compatible endpoint

---

## Product Hunt - Description
---

### What is NiceGuyAPI?

NiceGuyAPI is a developer-first API gateway that gives you access to 23+ AI models through a single API key and a single OpenAI-compatible endpoint. No more juggling keys across providers.

### Key Features

🔑 **One API Key** — Replace 5+ provider keys with one
🤖 **23+ Models** — Free: DeepSeek, Llama, Qwen, Gemma, GPT-OSS + Premium: Claude, GPT-4o, Gemini
🔌 **OpenAI-Compatible** — Change one URL, one key. That's it.
🔒 **Key Management** — Rate limiting, usage tracking, bcrypt hashing
📊 **Usage Dashboard** — Track requests per key

### Pricing

| Plan | Price | Requests | Includes |
|------|-------|----------|----------|
| Free | $0 | 14/mo | 5 free models |
| Pro | $6/mo | 40/mo | All free models + image & audio gen |
| Premium | $27/mo | 500/mo | All models (incl. Claude, GPT-4o) |
| Platinum | $55/mo | Unlimited | Priority routing, 750K context |

### Why I Built This

I was managing API keys for OpenAI, Anthropic, DeepSeek, and OpenRouter across multiple projects. It was a mess. NiceGuyAPI consolidates everything into one clean endpoint with an actual free tier that doesn't require a credit card.

### Try It

1. Sign up free: https://bit.ly/NiceGuyAPI
2. Get an API key instantly
3. Send your first request (docs on the site)

Free tier requires no credit card. Start building in under 5 minutes.

---

## NiceGuyAPI Blog Post (for landing page / dev.to / Medium)
---
# I Built an API Gateway That Replaces Every AI Provider Key You Have

### The Problem

Last month I counted: I was managing **6 different API keys** across my projects — OpenAI, Anthropic, DeepSeek, Google, Groq, and OpenRouter. Each had its own billing dashboard, rate limits, format quirks, and pricing.

I thought: *Why isn't there one key for all of these?*

So I built one.

### Introducing NiceGuyAPI

[NiceGuyAPI](https://bit.ly/NiceGuyAPI) is a developer API gateway powered by OpenRouter that gives you **one API key for 23+ AI models**. It speaks the OpenAI API format, so integration takes 30 seconds:

```
# Before (OpenAI)
https://api.openai.com/v1/chat/completions
Authorization:Bearer sk-xxx

# After (NiceGuyAPI)
https://niceguyapi-repo.vercel.app/v1/chat/completions
Authorization: Bearer nga_xxx
```

That's it. No SDK changes. No code rewrites.

### Who Is This For?

- **Side project devs** who want Claude-level quality without complex setup
- **Indie hackers** building AI features on a budget
- **Anyone** tired of managing multiple API keys and billing dashboards

### Pricing That Makes Sense

Our free tier gives you 14 requests per month — no credit card. When you're ready to scale:

- **Pro ($6/mo)**: 40 req/mo, all free models, image + audio generation
- **Premium ($27/mo)**: 500 req/mo, premium models (Claude, GPT-4o, Gemini)
- **Platinum ($55/mo)**: Unlimited requests, priority routing, 750K context

For comparison: ChatGPT Plus costs $20/mo. Our Premium tier gives you AI access at $27/mo for *any model from any provider*.

### Try It Now

Head to [NiceGuyAPI](https://bit.ly/NiceGuyAPI), grab a free key, and make your first request in under 5 minutes.

The code is open source: [github.com/MrGhostGuy/niceguyapi](https://github.com/MrGhostGuy/niceguyapi)

Happy building. 🚀
---

## Discord / Dev Community Posts

### Short-form (Discord, Slack communities)
---
Hey 👋 I built NiceGuyAPI — a single API key for 23+ AI models (Claude, GPT-4o, DeepSeek, Llama + more).

OpenAI-compatible endpoint, so it's a drop-in replacement. Free tier available (no CC).

Check it out: https://bit.ly/NiceGuyAPI

Open source: https://github.com/MrGhostGuy/niceguyapi
---

### Medium-form (Indie Hackers, Dev Discord servers)
---
**What:** NiceGuyAPI — one API key for all your AI needs

I was managing 6+ API keys across different providers and built this to consolidate. It's an OpenRouter gateway with:
- OpenAI-compatible endpoint (drop-in replacement)
- 23+ models (free + premium)
- Free tier (14 req/mo, no CC)
- Plans from $6-$55/mo

Try free: https://bit.ly/NiceGuyAPI
Code: https://github.com/MrGhostGuy/niceguyapi

Would love feedback from other API consumers!
---
