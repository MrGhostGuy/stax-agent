# NiceGuyAPI — Social Media & Content Kit
# All copy ready to post

---

## 📌 BIO / ABOUT (use on all platforms)

**Short bio (Twitter/X, Instagram):**
🤖 One API key. Every AI model. NiceGuyAPI gives you 24+ free AI models through a single endpoint. Stop managing 5 different API keys.
🔗 bit.ly/NiceGuyAPI

**Longer bio (LinkedIn, Dev.to, Hashnode):**
NiceGuyAPI is a free AI model gateway that gives developers access to 24+ AI models (DeepSeek, Claude, GPT-4o, Gemini, Llama, Qwen, and more) through a single API endpoint. No more managing multiple API keys. Free tier available. Built for developers who want simplicity without sacrificing power.
🔗 bit.ly/NiceGuyAPI

**Profile picture:** Use niceguyapi-logo.png (convert from SVG)

---

## 🐦 TWITTER/X POSTS

### Thread 1: Launch Thread
```
1/ Ever tired of managing 5 different AI API keys?

I was. So I built NiceGuyAPI — one API key for 24+ AI models.

DeepSeek ✅ Claude ✅ GPT-4o ✅ Gemini ✅ Llama ✅

All through a single endpoint. No switching SDKs.

Free tier: 14 req/mo
🔗 bit.ly/NiceGuyAPI

2/ Here's what makes it different:

✅ 24+ AI models (free + paid tiers)
✅ One API key, one endpoint
✅ Free tier: 14 requests/month
✅ Pro: $6/mo for 40 req
✅ Premium: $27/mo for 500 req
✅ Platinum: $55/mo unlimited

Simple pricing. No surprises.

3/ The tech stack:

- OpenRouter backend (reliable, fast)
- Express.js API server
- Vercel deployment (auto-deploys from GitHub)
- Stripe for payments
- Rate limiting + API key auth

Open source friendly. Built for developers.

4/ Try it yourself:

1. Sign up → get a free API key instantly
2. Make a request to the /v1/chat/completions endpoint
3. Choose from 24+ models

No credit card. Sign up → get started in 30 seconds.

🔗 bit.ly/NiceGuyAPI

5/ I'm offering launch pricing (up to 50% off):

🚀 Pro: $6/mo (was $12)
🚀 Premium: $27/mo (was $49)
🚀 Platinum: $55/mo (unlimited)

Limited time. Once we hit our target subscriber count, prices go back up.

⭐ Star us on GitHub: github.com/MrGhostGuy/niceguyapi
```

### Tweet 2:
```
24 AI models. 1 API key. $0 to start.

NiceGuyAPI is live 🚀

bit.ly/NiceGuyAPI
```

### Tweet 3:
```
Stop managing multiple AI API keys.

NiceGuyAPI = DeepSeek + Claude + GPT-4o + Gemini + Llama + 19 more, all through one endpoint.

Free tier available. Start in 30 seconds.

bit.ly/NiceGuyAPI
```

### Tweet 4:
```
I built NiceGuyAPI because I was tired of juggling API keys from 5 different AI providers.

Now I use one key for everything.

24+ models. One endpoint. Free tier available.

Check it out 👇
bit.ly/NiceGuyAPI
```

---

## 📝 DEV.TO ARTICLE #1

**Title:** I Built a Free API Gateway for 24+ AI Models — Here's How

**Body:**
```
# I Built a Free API Gateway for 24+ AI Models — Here's How

Like most developers, I was juggling API keys from OpenAI, Anthropic, Google, DeepSeek, and more. Each with different SDKs, different rate limits, different pricing.

I wanted one API key. One endpoint. Every model.

So I built [NiceGuyAPI](https://bit.ly/NiceGuyAPI).

## What is NiceGuyAPI?

NiceGuyAPI is a unified API gateway that gives you access to 24+ AI models through a single endpoint. Think of it as a universal translator for AI APIs.

**Supported models include:**
- DeepSeek V3
- Claude 3.5 Sonnet
- GPT-4o / GPT-4o-mini
- Gemini 1.5 Pro
- Llama 3.3 70B
- Qwen 2.5
- And 17+ more

## How it works

1. **Sign up** — Get a free API key instantly (no credit card)
2. **Make requests** — Use the standard `/v1/chat/completions` endpoint
3. **Choose your model** — Pick from 24+ models in your request

```bash
curl https://niceguyapi-repo.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Pricing

| Plan | Price | Requests | Models |
|------|-------|----------|--------|
| Free | $0 | 14/mo | 5 models |
| Pro | $6/mo | 40/mo | All models |
| Premium | $27/mo | 500/mo | All + priority |
| Platinum | $55/mo | Unlimited | All + priority |

**Launch pricing: Up to 50% off all paid tiers (limited time)**

## Try it yourself

👉 [https://bit.ly/NiceGuyAPI](https://bit.ly/NiceGuyAPI)

Free tier available. No credit card required. Get your API key in 30 seconds.

Would love your feedback! What models do you want to see added?
```

---

## 📝 HASHNODE ARTICLE #1

**Title:** Why I Stopped Managing 5 AI API Keys and Built a Single Gateway

**Body:**
```
# Why I Stopped Managing 5 AI API Keys and Built a Single Gateway

## The Problem

Every AI project I built required signing up for multiple API services:

- OpenAI for GPT-4o
- Anthropic for Claude
- Google for Gemini
- DeepSeek for cost-effective inference
- And more...

Each had different:
- API endpoints
- SDKs
- Rate limits
- Pricing models
- Authentication methods

I was spending more time managing API keys than writing code.

## The Solution: NiceGuyAPI

I built [NiceGuyAPI](https://bit.ly/NiceGuyAPI) — a single API gateway for 24+ AI models.

One endpoint. One API key. All the models.

## Quick Start

### 1. Get your free API key
Sign up at [bit.ly/NiceGuyAPI](https://bit.ly/NiceGuyAPI) — instant access, no credit card.

### 2. Make your first request

```python
import requests

response = requests.post(
    "https://niceguyapi-repo.vercel.app/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "model": "deepseek/deepseek-chat",
        "messages": [{"role": "user", "content": "Explain quantum computing simply"}]
    }
)

print(response.json())
```

### 3. Switch models instantly

```python
# Same endpoint, different model — no code changes needed
"model": "openai/gpt-4o"
"model": "anthropic/claude-3-5-sonnet"
"model": "google/gemini-1.5-pro"
"model": "meta-llama/llama-3.3-70b"
```

## Key Features

- ✅ 24+ AI models
- ✅ One API key
- ✅ OpenAI-compatible endpoint
- ✅ Free tier (14 req/mo)
- ✅ Rate limiting & auth built in
- ✅ Stripe-powered payments

## Try it today 👆

👉 [https://bit.ly/NiceGuyAPI](https://bit.ly/NiceGuyAPI)

Free tier available. Get started in 30 seconds.
```

---

## 📝 PRODUCT HUNT LAUNCH COPY

**Tagline:** One API key for 24+ AI models — free tier available

**Description:**
```
NiceGuyAPI is a unified API gateway that gives you access to 24+ AI models (DeepSeek, Claude, GPT-4o, Gemini, Llama, Qwen, and more) through a single endpoint.

Stop managing 5 different API keys. Use one.

Features:
- 24+ AI models through one API key
- OpenAI-compatible endpoint (drop-in replacement)
- Free tier: 14 requests/month
- Pro: $6/mo | Premium: $27/mo | Platinum: $55/mo
- Rate limiting + API key auth
- Stripe-powered payments

Try it free → bit.ly/NiceGuyAPI
```

**Topics:** Developer Tools, Artificial Intelligence, API

**Maker comment:**
```
Hey Product Hunt! 👋

I built NiceGuyAPI because I was tired of managing multiple API keys for different AI providers. Each had different endpoints, SDKs, and pricing — it was a mess.

Now I use one API key for everything. 24+ models, one endpoint.

Free tier available (no credit card). Would love your feedback!
```

---

## 📱 INSTAGRAM/FACEBOOK POSTS

### Post 1:
```
🤖 Stop managing 5+ AI API keys

✨ NiceGuyAPI = 24+ AI models, one API key

DeepSeek ✅ Claude ✅ GPT-4o ✅ Gemini ✅ Llama ✅

Free tier available • Set up in 30 seconds

Link in bio 👆
bit.ly/NiceGuyAPI
#AI #API #Developer #Coding #Tech #FreeAI #DevTools
```

### Post 2:
```
💡 What if you could use ANY AI model with the SAME API key?

That's NiceGuyAPI.

One endpoint. 24+ models. Free tier available.

Perfect for developers building AI apps who want flexibility without complexity.

🔗 bit.ly/NiceGuyAPI
#AI #ArtificialIntelligence #DeveloperTools #API #Tech
```

---

## 💼 LINKEDIN POST

```
Excited to share what I've been building: NiceGuyAPI 🚀

The problem I kept running into: every AI project required managing API keys from 5+ different providers. OpenAI, Anthropic, Google, DeepSeek... each with different endpoints, rate limits, and pricing.

So I built one API gateway for all of them.

NiceGuyAPI gives you access to 24+ AI models through a single endpoint:
- DeepSeek V3
- Claude 3.5 Sonnet  
- GPT-4o / GPT-4o-mini
- Gemini 1.5 Pro
- Llama 3.3
- And 19+ more models

Free tier: 14 requests/month
Paid plans starting at $6/mo

Perfect for developers who want to:
→ Simplify their AI infrastructure
→ Reduce API key management overhead  
→ Access multiple models without multiple subscriptions

Try it free (no credit card): bit.ly/NiceGuyAPI

Would love to hear from the community — what AI tools are you building?
```

---

## 🔴 REDDIT POSTS

### r/SideProject
```
[OC] I built a free API gateway for 24+ AI models — NiceGuyAPI

I was tired of managing API keys from OpenAI, Anthropic, Google, DeepSeek, etc. So I built NiceGuyAPI.

One API key → 24+ AI models through a single endpoint.

Features:
- 24+ models (DeepSeek, Claude, GPT-4o, Gemini, Llama, Qwen...)
- Free tier: 14 req/mo, no credit card
- OpenAI compatible endpoint
- Pro $6/mo, Premium $27/mo, Platinum $55/mo

API: https://niceguyapi-repo.vercel.app
Landing page: https://bit.ly/NiceGuyAPI

Feedback welcome! What features would make this more useful for you?
```

### r/SaaS
```
NiceGuyAPI — Unified API gateway for 24+ AI models (Launched)

Stop managing 5+ AI API keys. NiceGuyAPI gives you:
- One API key, 24+ models
- Free tier (14 req/mo)
- Launch pricing 50% off
- OpenAI-compatible endpoint

https://bit.ly/NiceGuyAPI

Looking for early users and feedback!
```

---

## 🎬 YOUTUBE REEL / TIKTOK SCRIPT

```
[HOOK — 0-3 sec]
"What if you could use 24 AI models with one API key?"

[PROBLEM — 3-8 sec]
"Managing API keys from OpenAI, Anthropic, Google, DeepSeek... it's a mess."

[SOLUTION — 8-20 sec]
screen recording: 
- NiceGuyAPI homepage
- Signup flow (get key)
- cURL request example
- Response from different models

[CTA — 20-25 sec]
"Free tier available. Link in bio. NiceGuyAPI — one key, every model."

Text overlay: "Free tier • 24+ models • Setup in 30 seconds"
```

---

## 📧 EMAIL TEMPLATE (for outreach to newsletters/influencers)

Subject Line: Quick question about featuring NiceGuyAPI

Body:
```
Hi [Name],

I've been following [newsletter/blog] and love your coverage of AI developer tools.

I recently launched NiceGuyAPI — a free API gateway that gives developers access to 24+ AI models through a single endpoint (DeepSeek, Claude, GPT-4o, Gemini, Llama, etc.).

Key highlights:
- Free tier available (14 req/mo, no credit card)
- OpenAI-compatible endpoint (drop-in replacement)
- Launch pricing up to 50% off

I'd love if you'd consider featuring it. Happy to provide more info, a demo account, or an interview.

Landing page: https://bit.ly/NiceGuyAPI
API docs: https://niceguyapi-repo.vercel.app

Thanks for considering!

Jeff
Creator, NiceGuyAPI
```

---

## 📅 POSTING SCHEDULE (Week 1)

**Monday:**
- Tweet: Launch announcement
- Thread: Full feature breakdown (5 tweets)
- Reddit: r/SideProject post

**Tuesday:**
- Dev.to: "I Built a Free API Gateway for 24+ AI Models" 
- LinkedIn: Launch post
- Tweet: "24 AI models, 1 API key" simple post

**Wednesday:**
- Hashnode: "Why I Stopped Managing 5 AI API Keys"
- Reddit: r/SaaS post
- Instagram: Post 1

**Thursday:**
- Tweet: Code example thread
- LinkedIn: Technical deep-dive
- TikTok/Reel: Demo video

**Friday:**
- Dev.to: Technical tutorial article
- Tweet: Weekly roundup / user feedback request
- Instagram: Post 2

**Weekend:**
- Product Hunt launch (coordinate for max impact)
- Cross-post everywhere
- Engage with all comments/replies
