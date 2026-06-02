/**
 * NiceGuyAPI v5.3.0 - AI Agent Gateway with Custom Agents & Stripe Live Payments
 *
 * OpenAI-compatible chat completions via OpenRouter.
 * 23+ AI models. Autonomous Agent with web search, fetch, calculator.
 * Custom Agents with name/personality/vibe/purpose.
 * Stripe Checkout, subscriber dashboard, key management.
 *
 * Uses jsonblob.com for persistent storage (free tier).
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRO_PRICE = process.env.STRIPE_PRO_PRICE_ID || '';
const STRIPE_PREMIUM_PRICE = process.env.STRIPE_PREMIUM_PRICE_ID || '';
const STRIPE_PLATINUM_PRICE = process.env.STRIPE_PLATINUM_PRICE_ID || '';

let stripe = null;
if (STRIPE_SECRET) {
  try { const S = require('stripe'); stripe = new S(STRIPE_SECRET); }
  catch (e) { console.warn('[NG] Stripe:', e.message); }
}

const TIERS = {
  free:     { name:'Free',     price:0,   monthly_requests:12,    rate_limit_per_minute:5,   rate_limit_per_day:10,    max_tokens:75000,   context_size:75000,   agent:false, custom_agent:false },
  pro:      { name:'Pro',      price:6,   monthly_requests:40,    rate_limit_per_minute:20,  rate_limit_per_day:200,   max_tokens:145000,  context_size:145000,  agent:true,  custom_agent:1 },
  premium:  { name:'Premium',  price:27,  monthly_requests:250,   rate_limit_per_minute:60,  rate_limit_per_day:1000,  max_tokens:315000,  context_size:315000,  agent:true,  custom_agent:999 },
  platinum: { name:'Platinum', price:55,  monthly_requests:99999,  rate_limit_per_minute:120, rate_limit_per_day:10000, max_tokens:750000, context_size:750000, agent:true,  custom_agent:999, unlimited:true },
};

function apiError(res, s, msg, type, extra) { return res.status(s).json({ error: { message: msg, type, ...(extra||{}) } }); }

// Storage
let cache = null;
async function loadDb() {
  if (cache) return cache;
  cache = { keys:{}, byEmail:{}, byPrefix:{}, billing:{}, agent_history:{}, rate_limits:{}, agents:{}, agent_histories:{} };
  try {
    const id = process.env.JSONBLOB_ID;
    if (id) { const r = await fetch('https://jsonblob.com/api/jsonBlob/'+id); if (r.ok) cache = { ...cache, ...await r.json() }; }
  } catch(e) { console.warn('[NG] DB load:', e.message); }
  ['keys','byEmail','byPrefix','billing','agent_history','rate_limits','agents','agent_histories'].forEach(f => { if (!cache[f]) cache[f] = {}; });
  return cache;
}
async function saveDb(db) {
  cache = db;
  try { const id = process.env.JSONBLOB_ID; if (id) await fetch('https://jsonblob.com/api/jsonBlob/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(db) }); }
  catch(e) { console.warn('[NG] DB save:', e.message); }
}

// Rate Limiting
async function checkRate(keyId, perMin, perDay) {
  const db = await loadDb(), now = Date.now();
  if (!db.rate_limits[keyId]) db.rate_limits[keyId] = { m:[], d:[] };
  const rl = db.rate_limits[keyId];
  rl.m = rl.m.filter(t => t > now-60000);
  rl.d = rl.d.filter(t => t > now-86400000);
  if (rl.m.length >= perMin) return { limited:true, retry:Math.ceil((rl.m[0]+60000-now)/1000) };
  if (rl.d.length >= perDay) return { limited:true, retry:Math.ceil((rl.d[0]+86400000-now)/1000) };
  rl.m.push(now); rl.d.push(now); await saveDb(db);
  return { limited:false };
}

// Agent Tools
async function toolSearch(q) {
  try {
    const r = await fetch('https://html.duckduckgo.com/html/?q='+encodeURIComponent(q), { headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(8000) });
    const html = await r.text(), results = [];
    const tR = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>(.*?)<\/a>/g, sR = /<a class="result__snippet"[^>]*>(.*?)<\/a>/g;
    let m; while ((m=tR.exec(html))!==null&&results.length<5) results.push({ title:m[2].replace(/<[^>]+>/g,'').trim(), link:m[1] });
    let i=0; while ((m=sR.exec(html))!==null&&i<results.length) { results[i].snippet=m[1].replace(/<[^>]+>/g,'').trim(); i++; }
    return results.length ? results.map((x,idx)=>(idx+1)+'. '+x.title+'\n   '+x.link+'\n   '+(x.snippet||'')).join('\n\n') : 'No results.';
  } catch(e) { return 'Search error: '+e.message; }
}
async function toolFetch(u) {
  try {
    if (!u.startsWith('http')) u = 'https://'+u;
    const r = await fetch(u, { headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(8000) });
    return r.text().then(t=>t.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().substring(0,3000));
  } catch(e) { return 'Fetch error: '+e.message; }
}
function toolCalc(expr) {
  try { const s = expr.replace(/[^0-9+\-*/().%\s^]/g,''); if (!s.trim()) return 'Invalid'; return expr+' = '+Function('"use strict"; return ('+s.replace(/\^/g,'**')+')')(); }
  catch(e) { return 'Calc error: '+e.message; }
}

const AGENT_TOOLS = [
  { type:'function', function:{ name:'web_search', description:'Search the web for current info, news, prices, facts.', parameters:{ type:'object', properties:{ query:{type:'string'} }, required:['query'] } } },
  { type:'function', function:{ name:'web_fetch', description:'Read a specific webpage and extract content.', parameters:{ type:'object', properties:{ url:{type:'string'} }, required:['url'] } } },
  { type:'function', function:{ name:'calculate', description:'Evaluate math expression. Supports +,-,*,/,%,^(power), parentheses.', parameters:{ type:'object', properties:{ expression:{type:'string'} }, required:['expression'] } } },
];

const AGENT_PROMPT = 'You are NiceGuyAPI Agent, an autonomous AI assistant with real-time tools: web_search (search the web for current info), web_fetch (read a webpage), calculate (evaluate math).\n\nUse tools when you need current info, facts beyond your knowledge, or math. After getting tool results, synthesize a clear answer. Be concise but thorough. Answer directly if you have enough knowledge.';

// Build custom agent system prompt
function buildCustomAgentPrompt(agent) {
  let prompt = 'You are ' + agent.name + ', a custom AI agent.';
  if (agent.personality) prompt += '\n\nYour personality: ' + agent.personality;
  if (agent.vibe) prompt += '\n\nYour vibe: ' + agent.vibe;
  if (agent.purpose) prompt += '\n\nYour purpose: ' + agent.purpose;
  prompt += '\n\nYou have real-time tools available: web_search (search the web), web_fetch (read webpages), calculate (evaluate math). Use them when you need current information or calculations.';
  prompt += '\n\nBe helpful, stay in character, and focus on your defined purpose.';
  return prompt;
}

// Agent Runner
async function runAgent(messages, model, apiKey, agentId, histLimit) {
  if (!histLimit) histLimit = 6;
  const db = await loadDb();
  
  // Build system prompt - use custom agent if provided
  let systemPrompt = AGENT_PROMPT;
  let historyKey = apiKey.id;
  
  if (agentId && db.agents[agentId]) {
    const customAgent = db.agents[agentId];
    systemPrompt = buildCustomAgentPrompt(customAgent);
    historyKey = agentId;
  }
  
  const hist = db.agent_histories[historyKey]||[];
  const am = [{ role:'system', content:systemPrompt }, ...hist.slice(-histLimit*2), ...messages];
  let tools = 0;

  for (let i=0; i<5; i++) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENROUTER_KEY,'HTTP-Referer':'https://mrghostguy.github.io/niceguyapi/','X-Title':'NiceGuyAPI Agent'},
      body:JSON.stringify({ model, messages:am, tools:AGENT_TOOLS, tool_choice:'auto', max_tokens:Math.min(apiKey.tier_config.context_size, 32768) }),
    });
    if (!r.ok) return { error:true, status:r.status, body:await r.text() };
    const data = await r.json(), choice = data.choices?.[0];
    if (!choice) return { error:true, status:502, body:JSON.stringify(data) };
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length) {
      tools += msg.tool_calls.length;
      am.push({ role:'assistant', content:msg.content||null, tool_calls:msg.tool_calls });
      const results = await Promise.all(msg.tool_calls.map(async tc => {
        const fn = tc.function; let a={}; try{a=JSON.parse(fn.arguments||'{}');}catch(e){}
        let res;
        switch(fn.name) {
          case 'web_search': res = await toolSearch(a.query||''); break;
          case 'web_fetch': res = await toolFetch(a.url||''); break;
          case 'calculate': res = toolCalc(a.expression||''); break;
          default: res = 'Unknown: '+fn.name;
        }
        return { tool_call_id:tc.id, role:'tool', name:fn.name, content:String(res).substring(0,4000) };
      }));
      am.push(...results); continue;
    }

    const fc = msg.content||'';
    db.agent_histories[historyKey] = [...hist, ...messages.filter(m=>m.role==='user').map(m=>({role:'user',content:m.content})), {role:'assistant',content:fc}].slice(-histLimit*2);
    await saveDb(db);
    return { error:false, data:{ id:data.id||'chatcmpl-'+uuidv4(), object:'chat.completion', created:Math.floor(Date.now()/1000), model, choices:[{index:0,message:{role:'assistant',content:fc,finish_reason:choice.finish_reason}}], usage:{prompt_tokens:data.usage?.prompt_tokens||0,completion_tokens:data.usage?.completion_tokens||0,total_tokens:data.usage?.total_tokens||0,_agent_tool_calls:tools} } };
  }

  // Max iterations - get final response
  const fr = await fetch('https://openrouter.ai/api/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENROUTER_KEY,'HTTP-Referer':'https://mrghostguy.github.io/niceguyapi/','X-Title':'NiceGuyAPI Agent'}, body:JSON.stringify({model,messages:am,max_tokens:2048}) });
  const fd = await fr.json();
  return { error:false, data:{ id:fd.id||'chatcmpl-'+uuidv4(), object:'chat.completion', created:Math.floor(Date.now()/1000), model, choices:[{index:0,message:{role:'assistant',content:fd.choices?.[0]?.message?.content||'Done.',finish_reason:'stop'}}], usage:fd.usage||{prompt_tokens:0,completion_tokens:0,total_tokens:0,_agent_tool_calls:tools} } };
}

// App
const app = express();

app.post('/v1/stripe/webhook', express.raw({type:'application/json'}), (req,res) => {
  const sig = req.headers['stripe-signature']; let event;
  try { event = (STRIPE_WEBHOOK_SECRET&&stripe) ? stripe.webhooks.constructEvent(req.body,sig,STRIPE_WEBHOOK_SECRET) : JSON.parse(req.body); }
  catch(e) { return res.status(400).json({error:'Webhook failed'}); }
  if (event.type==='checkout.session.completed') {
    loadDb().then(db => {
      const s = event.data.object, b = db.billing[s.id];
      if (b&&b.status==='pending') {
        const k = db.keys[b.api_key_id];
        if (k) {
          if (s.metadata&&s.metadata.type==='refill') k.monthly_limit += parseInt((s.metadata&&s.metadata.amount)||'10');
          else if (k.pending_tier) { const t=TIERS[k.pending_tier]; k.tier=k.pending_tier; k.pending_tier=null; k.monthly_limit=t.monthly_requests; }
          b.status='completed'; b.completed_at=new Date().toISOString(); saveDb(db);
        }
      }
    });
  }
  res.json({received:true});
});

app.use(express.json({limit:'1mb'})); app.use(cors()); app.use(helmet({contentSecurityPolicy:false}));

// Health
app.get('/health', (req,res) => res.status(200).json({ status:'ok', version:'5.3.0', timestamp:new Date().toISOString(), storage:process.env.JSONBLOB_ID?'persistent':'memory-only', agent:true, custom_agents:true, stripe:!!stripe, stripe_mode:STRIPE_SECRET.startsWith('sk_live_')?'live':'test' }));

// Root
app.get('/', (req,res) => res.json({ name:'NiceGuyAPI', version:'5.3.0', description:'AI Model Gateway + Agent. Custom Agents. Stripe + key management. Live payments enabled.', base_url:'/v1', pricing:{free:'$0/12req/75k',pro:'$6/40req/145k',premium:'$27/250req/315k',platinum:'$55/99999/750k'}, payments:STRIPE_SECRET.startsWith('sk_live_')?'live':'test', auth:'X-API-Key header', endpoints:['GET /health','POST /v1/signup','GET /v1/models','POST /v1/chat/completions','POST /v1/agent','GET /v1/usage','GET /v1/keys','POST /v1/keys','DELETE /v1/keys/:prefix','POST /v1/keys/:prefix/rotate','POST /v1/agent/reset','GET /v1/agents','POST /v1/agents','GET /v1/agents/:id','PUT /v1/agents/:id','DELETE /v1/agents/:id','POST /v1/agents/:id/reset'] }));

// Signup
app.post('/v1/signup', async (req,res) => {
  const email = req.body.email, tier = req.body.tier, label = req.body.key_label;
  if (!email||!email.includes('@')) return apiError(res,400,'Valid email required','invalid_request');
  const sel = TIERS[tier]?tier:'free', db = await loadDb(), ek = email+':'+sel;
  if (db.byEmail[ek]) return apiError(res,409,'Account already exists','duplicate_account');
  const id = uuidv4(), raw = 'nga_live_'+crypto.randomBytes(24).toString('hex'), hash = await bcrypt.hash(raw,10), prefix = raw.substring(0,12), tc = TIERS[sel];
  db.keys[id] = { id, key_hash:hash, key_prefix:prefix, email, tier:sel, pending_tier:null, label:label||'Default', active:1, monthly_limit:tc.monthly_requests, monthly_used:0, total_requests:0, created_at:new Date().toISOString(), last_used_at:null, billing_period_start:new Date().toISOString() };
  db.byEmail[ek] = id; db.byPrefix[prefix] = id;

  // Stripe Checkout for paid tiers
  if (sel!=='free' && stripe) {
    const priceId = sel==='pro' ? STRIPE_PRO_PRICE : (sel==='platinum' ? STRIPE_PLATINUM_PRICE : STRIPE_PREMIUM_PRICE);
    if (priceId) {
      try {
        const session = await stripe.checkout.sessions.create({
          mode:'subscription',
          success_url:'https://mrghostguy.github.io/niceguyapi/?success=true',
          cancel_url:'https://mrghostguy.github.io/niceguyapi/?canceled=true',
          line_items:[{price:priceId,quantity:1}],
          metadata:{ api_key_id:id, tier:sel, type:'subscription' },
          payment_method_types:['card'],
        });
        db.billing[session.id] = { api_key_id:id, tier:sel, status:'pending', created_at:new Date().toISOString() };
        db.keys[id].pending_tier = sel; db.keys[id].tier = 'free'; db.keys[id].monthly_limit = TIERS.free.monthly_requests;
        await saveDb(db);
        return res.status(201).json({ id, email, tier:'free', api_key:raw, monthly_limit:TIERS.free.monthly_requests, monthly_used:0, context_size:tc.context_size, pending_tier:tc.name, stripe_url:session.url, message:'Sign up complete! Complete payment to activate '+tc.name+' with '+tc.context_size.toLocaleString()+' context.', features:{agent:tc.agent,image:tc.image,song:tc.song,games:tc.games} });
      } catch(e) { console.error('[NG] Stripe:', e.message); }
    }
  }

  await saveDb(db);
  res.status(201).json({ id, email, tier:sel, api_key:raw, monthly_limit:tc.monthly_requests, monthly_used:0, context_size:tc.context_size, features:{agent:tc.agent,image:tc.image,song:tc.song,games:tc.games}, message:tc.name+' API key ready!'+(tc.agent?' Agent included!':'') + (tc.unlimited?' Unlimited requests!':'') });
});

// Auth
async function auth(req,res,next) {
  const key = (req.headers['x-api-key']||'').replace(/^Bearer\s+/i,'').trim();
  if (!key) return apiError(res,401,'Missing X-API-Key','auth_error');
  const db = await loadDb(), prefix = key.substring(0,12), id = db.byPrefix[prefix];
  if (!id) return apiError(res,401,'Invalid API key','auth_error');
  const rec = db.keys[id];
  if (!rec||!rec.active) return apiError(res,401,'Invalid API key','auth_error');
  if (!await bcrypt.compare(key,rec.key_hash)) return apiError(res,401,'Invalid API key','auth_error');
  const tc = TIERS[rec.tier]||TIERS.free, ps = new Date(rec.billing_period_start), now = new Date();
  if (now.getMonth()!==ps.getMonth()||now.getFullYear()!==ps.getFullYear()) { rec.monthly_used=0; rec.monthly_limit=tc.monthly_requests; rec.billing_period_start=now.toISOString(); }
  if (rec.monthly_used>=rec.monthly_limit) return apiError(res,429,'Monthly limit reached ('+rec.monthly_used+'/'+rec.monthly_limit+'). Upgrade: https://mrghostguy.github.io/niceguyapi/','rate_limit',{limit:rec.monthly_limit,used:rec.monthly_used,upgrade_url:'https://mrghostguy.github.io/niceguyapi/'});
  const rl = await checkRate(id, tc.rate_limit_per_minute, tc.rate_limit_per_day);
  if (rl.limited) return apiError(res,429,'Rate limit exceeded. Retry in '+rl.retry+'s.','rate_limit',{retry_after:rl.retry});
  req.apiKey = {...rec, effective_tier:rec.tier, effective_limit:rec.monthly_limit, tier_config:tc};
  req._db = db;
  next();
}

// Models
const FREE_MODELS = [
  {id:'deepseek/deepseek-v4-flash:free',name:'DeepSeek V4 Flash'},{id:'meta-llama/llama-3.3-70b-instruct:free',name:'Llama 3.3 70B'},
  {id:'meta-llama/llama-3.2-3b-instruct:free',name:'Llama 3.2 3B'},{id:'qwen/qwen3-coder:free',name:'Qwen3 Coder'},
  {id:'qwen/qwen3-next-80b-a3b-instruct:free',name:'Qwen3 Next 80B'},{id:'openai/gpt-oss-120b:free',name:'GPT-OSS 120B'},
  {id:'openai/gpt-oss-20b:free',name:'GPT-OSS 20B'},{id:'google/gemma-4-31b-it:free',name:'Gemma 4 31B'},
  {id:'google/gemma-4-26b-a4b-it:free',name:'Gemma 4 26B'},{id:'nvidia/nemotron-3-super-120b-a12b:free',name:'Nemotron Super 120B'},
  {id:'nvidia/nemotron-3-nano-30b-a3b:free',name:'Nemotron Nano 30B'},{id:'nvidia/nemotron-nano-9b-v2:free',name:'Nemotron Nano 9B'},
  {id:'nvidia/nemotron-nano-12b-v2-vl:free',name:'Nemotron Nano 12B VL'},{id:'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',name:'Nemotron Omni 30B'},
  {id:'minimax/minimax-m2.5:free',name:'MiniMax M2.5'},{id:'z-ai/glm-4.5-air:free',name:'GLM 4.5 Air'},
  {id:'moonshotai/kimi-k2.6:free',name:'Kimi K2.6'},{id:'nousresearch/hermes-3-llama-3.1-405b:free',name:'Hermes 3 405B'},
  {id:'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',name:'Dolphin Mistral 24B'},
  {id:'liquid/lfm-2.5-1.2b-thinking:free',name:'LFM 2.5 Thinking'},{id:'liquid/lfm-2.5-1.2b-instruct:free',name:'LFM 2.5 Instruct'},
  {id:'poolside/laguna-m.1:free',name:'Laguna M.1'},{id:'poolside/laguna-xs.2:free',name:'Laguna XS.2'},
];
const PREMIUM_MODELS = [
  {id:'anthropic/claude-sonnet-4-20250514',name:'Claude Sonnet 4'},{id:'openai/gpt-4o',name:'GPT-4o'},{id:'google/gemini-2.0-flash',name:'Gemini 2.0 Flash'},
];

app.get('/v1/models', auth, (req,res) => {
  const models = req.apiKey.effective_tier==='free' ? FREE_MODELS : [...FREE_MODELS,...PREMIUM_MODELS];
  res.json({object:'list',data:models.map(m=>({id:m.id,object:'model',created:Date.now(),owned_by:'niceguyapi'}))});
});

// Chat
app.post('/v1/chat/completions', auth, async (req,res) => {
  const { messages, model, agent, agent_id } = req.body;
  if (!messages||!Array.isArray(messages)||!messages.length) return apiError(res,400,'Messages required','invalid_request');
  
  if (agent===true||agent==='true'||agent_id) {
    if (!req.apiKey.tier_config.agent) return apiError(res,403,'Agent requires Pro/Premium','tier_error',{upgrade_url:'https://mrghostguy.github.io/niceguyapi/'});
    
    // Validate custom agent if provided
    if (agent_id) {
      const db = await loadDb();
      const customAgent = db.agents[agent_id];
      if (!customAgent) return apiError(res,404,'Custom agent not found','not_found');
      if (customAgent.email !== req.apiKey.email) return apiError(res,403,'Not your agent','auth_error');
    }
    
    return handleAgent(req,res);
  }
  const reqModel = model||'openai/gpt-oss-120b:free';
  if (!reqModel.includes(':free')&&req.apiKey.effective_tier==='free') return apiError(res,403,'Premium models require Premium','tier_error');
  if (!OPENROUTER_KEY) return apiError(res,503,'AI service not configured','service_unavailable');
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENROUTER_KEY,'HTTP-Referer':'https://mrghostguy.github.io/niceguyapi/','X-Title':'NiceGuyAPI'}, body:JSON.stringify({model:reqModel,messages}) });
    if (!r.ok) { const e=await r.json().catch(()=>({})); return res.status(r.status).json(e); }
    const data = await r.json();
    req.apiKey.monthly_used++; req.apiKey.total_requests++; req.apiKey.last_used_at=new Date().toISOString();
    if (req._db) { req._db.keys[req.apiKey.id]=req.apiKey; await saveDb(req._db); }
    delete data.uuid; delete data.session; res.json(data);
  } catch(e) { apiError(res,502,'Upstream error: '+e.message,'upstream_error'); }
});

// Agent
async function handleAgent(req,res) {
  if (!req.apiKey.tier_config.agent) return apiError(res,403,'Agent requires Pro/Premium','tier_error',{upgrade_url:'https://mrghostguy.github.io/niceguyapi/'});
  if (!OPENROUTER_KEY) return apiError(res,503,'AI service not configured','service_unavailable');
  try {
    const agentId = req.body.agent_id || null;
    const result = await runAgent(req.body.messages, req.body.model||'openai/gpt-oss-120b:free', req.apiKey, agentId);
    if (result.error) return res.status(result.status).json(JSON.parse(result.body));
    req.apiKey.monthly_used++; req.apiKey.total_requests++; req.apiKey.last_used_at=new Date().toISOString();
    if (req._db) { req._db.keys[req.apiKey.id]=req.apiKey; await saveDb(req._db); }
    res.json(result.data);
  } catch(e) { apiError(res,502,'Agent error: '+e.message,'agent_error'); }
}
app.post('/v1/agent', auth, handleAgent);
app.post('/v1/agent/reset', auth, async (req,res) => { const db=await loadDb(); delete db.agent_history[req.apiKey.id]; delete db.agent_histories[req.apiKey.id]; await saveDb(db); res.json({message:'Agent history cleared.'}); });

// Custom Agent Management
app.get('/v1/agents', auth, async (req,res) => {
  const db = await loadDb();
  const userAgents = Object.values(db.agents).filter(a=>a.email===req.apiKey.email);
  const tc = req.apiKey.tier_config;
  res.json({
    agents: userAgents.map(a=>({
      id: a.id,
      name: a.name,
      personality: a.personality,
      vibe: a.vibe,
      purpose: a.purpose,
      created_at: a.created_at,
      updated_at: a.updated_at
    })),
    limit: tc.custom_agent,
    current_count: userAgents.length
  });
});

app.post('/v1/agents', auth, async (req,res) => {
  const { name, personality, vibe, purpose } = req.body;
  const db = await loadDb();
  
  // Check tier access
  const tc = req.apiKey.tier_config;
  const userAgents = Object.values(db.agents).filter(a=>a.email===req.apiKey.email);
  
  if (tc.custom_agent === 0) {
    return apiError(res,403,'Custom agents require Pro/Premium','tier_error',{upgrade_url:'https://mrghostguy.github.io/niceguyapi/'});
  }
  
  if (userAgents.length >= tc.custom_agent) {
    return apiError(res,403,'Agent limit reached ('+tc.custom_agent+' agents max)','tier_error',{upgrade_url:'https://mrghostguy.github.io/niceguyapi/'});
  }
  
  // Validate required fields
  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
    return apiError(res,400,'Agent name required (1-50 chars)','invalid_request');
  }
  
  const id = uuidv4();
  db.agents[id] = {
    id,
    email: req.apiKey.email,
    name: name.substring(0,50),
    personality: personality ? personality.substring(0,500) : '',
    vibe: vibe ? vibe.substring(0,200) : '',
    purpose: purpose ? purpose.substring(0,500) : '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await saveDb(db);
  res.status(201).json({
    id,
    name,
    message: 'Custom agent created! Use agent_id: "' + id + '" in your chat calls.'
  });
});

app.get('/v1/agents/:id', auth, async (req,res) => {
  const db = await loadDb();
  const agent = db.agents[req.params.id];
  
  if (!agent) return apiError(res,404,'Agent not found','not_found');
  if (agent.email !== req.apiKey.email) return apiError(res,403,'Not your agent','auth_error');
  
  res.json({
    id: agent.id,
    name: agent.name,
    personality: agent.personality,
    vibe: agent.vibe,
    purpose: agent.purpose,
    created_at: agent.created_at,
    updated_at: agent.updated_at
  });
});

app.put('/v1/agents/:id', auth, async (req,res) => {
  const { name, personality, vibe, purpose } = req.body;
  const db = await loadDb();
  const agent = db.agents[req.params.id];
  
  if (!agent) return apiError(res,404,'Agent not found','not_found');
  if (agent.email !== req.apiKey.email) return apiError(res,403,'Not your agent','auth_error');
  
  if (name) agent.name = name.substring(0,50);
  if (personality !== undefined) agent.personality = personality.substring(0,500);
  if (vibe !== undefined) agent.vibe = vibe.substring(0,200);
  if (purpose !== undefined) agent.purpose = purpose.substring(0,500);
  agent.updated_at = new Date().toISOString();
  
  await saveDb(db);
  res.json({
    id: agent.id,
    name: agent.name,
    message: 'Agent updated.'
  });
});

app.delete('/v1/agents/:id', auth, async (req,res) => {
  const db = await loadDb();
  const agent = db.agents[req.params.id];
  
  if (!agent) return apiError(res,404,'Agent not found','not_found');
  if (agent.email !== req.apiKey.email) return apiError(res,403,'Not your agent','auth_error');
  
  delete db.agents[req.params.id];
  delete db.agent_histories[req.params.id]; // Clean up agent history
  
  await saveDb(db);
  res.json({ message: 'Agent deleted.' });
});

app.post('/v1/agents/:id/reset', auth, async (req,res) => {
  const db = await loadDb();
  const agent = db.agents[req.params.id];
  
  if (!agent) return apiError(res,404,'Agent not found','not_found');
  if (agent.email !== req.apiKey.email) return apiError(res,403,'Not your agent','auth_error');
  
  delete db.agent_histories[req.params.id];
  await saveDb(db);
  res.json({ message: 'Agent history cleared.' });
});

// Key Management
app.get('/v1/keys', auth, async (req,res) => {
  const db = await loadDb();
  const userKeys = Object.values(db.keys).filter(k=>k.email===req.apiKey.email);
  res.json({ keys: userKeys.map(k=>({ prefix:k.key_prefix, label:k.label, tier:k.tier, active:k.active, monthly_used:k.monthly_used, monthly_limit:k.monthly_limit, created_at:k.created_at, last_used_at:k.last_used_at })) });
});
app.post('/v1/keys', auth, async (req,res) => {
  const { label, tier } = req.body;
  const db = await loadDb();
  const raw = 'nga_live_'+crypto.randomBytes(24).toString('hex'), hash = await bcrypt.hash(raw,10), prefix = raw.substring(0,12);
  const id = uuidv4(), tc = TIERS[tier]||TIERS.free;
  db.keys[id] = { id, key_hash:hash, key_prefix:prefix, email:req.apiKey.email, tier:req.apiKey.tier, pending_tier:null, label:label||'Key '+(Object.values(db.keys).filter(k=>k.email===req.apiKey.email).length+1), active:1, monthly_limit:tc.monthly_requests, monthly_used:0, total_requests:0, created_at:new Date().toISOString(), last_used_at:null, billing_period_start:new Date().toISOString() };
  db.byPrefix[prefix] = id; await saveDb(db);
  res.status(201).json({ api_key:raw, prefix, label:db.keys[id].label, tier:req.apiKey.tier, message:'Key created! Save it now - shown only once.' });
});
app.delete('/v1/keys/:prefix', auth, async (req,res) => {
  const db = await loadDb(), key = Object.values(db.keys).find(k=>k.key_prefix===req.params.prefix&&k.email===req.apiKey.email);
  if (!key) return apiError(res,404,'Key not found','not_found');
  key.active = 0; delete db.byPrefix[key.key_prefix]; await saveDb(db);
  res.json({ message:'Key revoked.' });
});
app.post('/v1/keys/:prefix/rotate', auth, async (req,res) => {
  const db = await loadDb(), key = Object.values(db.keys).find(k=>k.key_prefix===req.params.prefix&&k.email===req.apiKey.email);
  if (!key) return apiError(res,404,'Key not found','not_found');
  const raw = 'nga_live_'+crypto.randomBytes(24).toString('hex'), hash = await bcrypt.hash(raw,10), newPrefix = raw.substring(0,12);
  delete db.byPrefix[key.key_prefix];
  key.key_hash = hash; key.key_prefix = newPrefix; db.byPrefix[newPrefix] = key.id;
  await saveDb(db);
  res.json({ api_key:raw, prefix:newPrefix, message:'Key rotated! Old key no longer works.' });
});

// Usage
app.get('/v1/usage', auth, (req,res) => {
  const k = req.apiKey, tc = TIERS[k.effective_tier], models = k.effective_tier==='free'?FREE_MODELS:[...FREE_MODELS,...PREMIUM_MODELS];
  const isUnlimited = tc.unlimited || k.effective_limit >= 999999;
  res.json({
    email:k.email, tier:k.effective_tier, monthly_limit:isUnlimited?'unlimited':k.effective_limit, monthly_used:k.monthly_used,
    monthly_remaining:isUnlimited?'unlimited':Math.max(0,k.effective_limit-k.monthly_used), total_requests:k.total_requests||0,
    context_size:tc.context_size,
    features:{agent:tc.agent,custom_agent:tc.custom_agent,agent_tools:tc.agent?['web_search','web_fetch','calculate']:[],image:tc.image,song:tc.song,games:tc.games},
    rate_limit:{per_minute:tc.rate_limit_per_minute,per_day:tc.rate_limit_per_day}, available_models:models.length,
  });
});

// 404
app.use((req,res) => apiError(res,404,'Route '+req.method+' '+req.path+' not found','not_found'));

// Export
module.exports = async (req,res) => { try { app(req,res); } catch(e) { console.error('[NG]',e); if (!res.headersSent) res.status(500).json({error:{message:'Internal error',type:'server_error'}}); } };
