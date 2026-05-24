console.log('%c🔮 PERFECT DASHBOARD v9.0 LOADED','color:#00f0ff;font-size:14px;font-weight:bold');console.log('All systems initialized:',new Date().toLocaleString());const API='';let ws=null,curTaskId=null,allAgents=[],allTasks=[],tickerTimer=null,sending=false;
var officeLogs={};
var officeComms={};
var agentPositions={};
var subagentData=[];
function f(u){return fetch(u).then(r=>r.json())}
function init(){particles();clock();connectWS();loadAll();loadActivityTicker();setInterval(loadActivityTicker,10000);setInterval(loadAll,15000);
  document.querySelector('.sidebar-nav').addEventListener('click',function(e){
    const navItem=e.target.closest('.nav-item');
    if(navItem&&navItem.dataset.page){navTo(navItem.dataset.page);}
  });
}
function connectWS(){const p=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(`${p}//${location.host}`);ws.onopen=()=>{document.getElementById('sw').textContent='LIVE';document.getElementById('sw').className='sv';document.getElementById('cd').classList.remove('off')};ws.onclose=()=>{document.getElementById('sw').textContent='Reconnecting...';document.getElementById('sw').className='sv w';document.getElementById('cd').classList.add('off');setTimeout(connectWS,3000)};ws.onerror=()=>{document.getElementById('sw').textContent='Error';document.getElementById('sw').className='sv e'};ws.onmessage=e=>{try{handleWS(JSON.parse(e.data))}catch(err){}}}
let _wsQueue=[];let _wsProcessing=false;let _intervals={};function _processWSQueue(){if(_wsQueue.length===0){_wsProcessing=false;return;}const d=_wsQueue.shift();_handleWSSingle(d);setTimeout(_processWSQueue,50);}function handleWS(d){_wsQueue.push(d);if(!_wsProcessing){_wsProcessing=true;_processWSQueue();}}function _handleWSSingle(d){
  if(d.type==='chat_message'){loadStreamChat();
    appendChat(d,true);
    if(d.sender==='Jorm'){stopTyping();setAvatarState('writing');setTimeout(()=>setAvatarState('idle'),2000);}
    if(d.sender==='System'&&d.message&&d.message.includes('✅ Task')){
      setAvatarState('excited');setTimeout(()=>setAvatarState('working'),1500);setTimeout(()=>setAvatarState('idle'),6000);
    }
  }
  if(d.type==='task_created'){
    loadAll();
    setAvatarState('excited');setTimeout(()=>setAvatarState('working'),2000);setTimeout(()=>setAvatarState('idle'),5000);
    if(d.task&&d.task.title){notif('⚡ New task: '+d.task.title,'info');}
  }
  if(d.type==='task_updated'||d.type==='task_completed'){
    loadAll();
    if(d.type==='task_completed'){setAvatarState('excited');setTimeout(()=>setAvatarState('idle'),3000);}
    else{setAvatarState('working');setTimeout(()=>setAvatarState('idle'),2000);}
  }
  if(d.type==='agent_added'){loadAll();}
  if(d.type==='agent_updated'){
    loadAll();
    if(d.fields&&d.fields.status==='working'){
      setAvatarState('working');
      if(d.agent){notif('🤖 '+d.agent+' is now working','info');}
      setTimeout(()=>setAvatarState('idle'),3000);
    }
  }
  if(d.type==='agent_communication'){loadComms();setAvatarState('thinking');setTimeout(()=>setAvatarState('idle'),2000);}
  if(d.type==='feedback_received'){loadLearning();loadFeedback()}
  if(d.type==='learning_added')loadLearning();
  if(d.type==='deliverable_added')loadDeliverables();
  if(d.type==='pipeline_update'){loadAll();if(curTaskId)loadPipe();}
  if(d.type==='task_log'){loadAll();}
  if(d.type==='activity_new'){loadActivityTicker();}
  if(d.type==='project_created'||d.type==='project_updated'||d.type==='project_history_added'){loadProjects();}
  if(d.type==='task_pinned'||d.type==='task_unpinned'){loadTaskboard();}
  if(d.type==='skill_enabled'||d.type==='skill_disabled'){loadSkills();}
  if(d.type==='subagent_activity'||d.type==='subagent_updated'||d.type==='subagent_spawned'){loadSubagents();}if(d.type==='notification_new'){loadNotifications();}if(d.type==='skill_installed'){loadSkills();}
  if(d.type==='tool_use'){showToolUse(d.tool,d.status);setAvatarState('working');}
  else if(d.type==='tool_complete'){showToolUse(d.tool,'complete');setAvatarState('excited');setTimeout(()=>setAvatarState('idle'),2000);}
  else if(d.type==='tool_error'){showToolUse(d.tool,'error');setAvatarState('error');setTimeout(()=>setAvatarState('idle'),3000);}
}
async function loadAll(){try{
const[ar,tr,sr,sysr,lr,cr,lrnr,fr,dr]=await Promise.all([f(`${API}/api/agents`),f(`${API}/api/tasks`),f(`${API}/api/stats`),f(`${API}/api/system`),f(`${API}/api/logs?limit=50`),f(`${API}/api/communications?limit=30`),f(`${API}/api/learning?limit=50`),f(`${API}/api/feedback?limit=30`),f(`${API}/api/deliverables`)]);
allAgents=(ar&&ar.agents?ar.agents:[]);allTasks=(tr&&tr.tasks?tr.tasks:[]);
const stats=sr,sys=sysr,logs=lr.logs||[],comms=cr.communications||[],lrn=lrnr.learning||[],fb=fr.feedback||[],del=dr.deliverables||[];
logs.forEach(l=>{if(l.agent_name)storeAgentLog(l.agent_name,l)});
comms.forEach(c=>{storeAgentComm(c.from_agent,{from:c.from_agent,to:c.to_agent,msg:c.message,time:c.timestamp});storeAgentComm(c.to_agent,{from:c.from_agent,to:c.to_agent,msg:c.message,time:c.timestamp})});
window._officeLogs=logs;window._officeComms=comms;
updDashboard(allAgents,allTasks,stats,sys);updAgents(allAgents);updTasks(allTasks);updLogs(logs);updComms(comms);updLearning(lrn);updFeedback(fb);updDeliverables(del);updSys(sys);updNav(allAgents,allTasks);updTaskSel(allTasks);updAgentSel(allAgents);renderOffice();
const items=[];allAgents.forEach(a=>{if(a.current_task&&a.status!=='idle')items.push(`${a.name}: ${a.current_task}`)});logs.slice(0,5).forEach(l=>items.push(`${l.agent_name}: ${l.action}`));items.push(`CPU ${sys.cpu}% | RAM ${sys.memory}%`);items.push(`${allTasks.length} tasks | ${allAgents.length} real agents`);startTicker(items);
loadActivityTicker();
}catch(e){console.error('loadAll:',e)}}
function updDashboard(agents,tasks,stats,sys){
document.getElementById('s-tt').textContent=stats.totalTasks||0;document.getElementById('s-tc').textContent=stats.completedTasks||0;document.getElementById('s-aa').textContent=stats.activeAgents||0;document.getElementById('s-tl').textContent=stats.totalLearnings||0;
// Update gamification HUD
const xp = (stats.completedTasks || 0) * 25 + (stats.totalLearnings || 0) * 10;
const level = Math.floor(xp / 100) + 1;
const xpInLevel = xp % 100;
document.getElementById('gxp-level').textContent = level;
document.getElementById('gxp-current').textContent = xpInLevel;
document.getElementById('gxp-next').textContent = 100;
document.getElementById('gxp-fill').style.width = xpInLevel + '%';
document.getElementById('gxp-tasks').textContent = stats.completedTasks || 0;
document.getElementById('history-badge').textContent = stats.completedTasks || 0;
document.getElementById('dag').innerHTML=agents.map(a=>`<div class="agent-card" onclick="showAgent('${a.name}')"><div class="agent-av ${a.status}">${a.avatar||'🤖'}<div class="agent-sdot ${a.status}"></div></div><div class="agent-name">${a.name}</div><div class="agent-role">${a.role}</div>${a.current_task?`<div class="agent-task">${a.current_task}</div>`:''}</div>`).join('');
const active=tasks.filter(t=>t.status!=='completed').slice(0,5);
document.getElementById('dtasks').innerHTML=active.length?active.map(t=>`<div class="task-item" onclick="showTask(${t.id})"><div class="task-pri ${t.priority||'medium'}"></div><div class="task-info"><div class="task-title">${t.title}</div><div class="task-meta">${t.assignee?t.assignee+' • ':''}${t.status} • ${t.stage||'queued'}</div></div><div class="task-prog"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress||0}%"></div></div><div class="prog-text">${t.progress||0}%</div></div><span class="badge badge-${t.status}">${t.status}</span></div>`).join(''):'<div class="empty"><div class="icon">✅</div>No active tasks</div>';
}
function updAgents(agents){document.getElementById('agrid').innerHTML=agents.map(a=>`<div class="agent-card" onclick="showAgent('${a.name}')" style="padding:14px"><div class="agent-av ${a.status}" style="width:50px;height:50px;font-size:22px">${a.avatar||'🤖'}<div class="agent-sdot ${a.status}"></div></div><div class="agent-name" style="font-size:11px">${a.name}</div><div class="agent-role">${a.role}</div><div style="margin-top:5px"><span class="badge badge-${a.status}">${a.status}</span></div><div style="margin-top:5px;font-size:9px;color:var(--muted)">Tasks: ${a.tasks_completed||0}</div>${a.current_task?`<div class="agent-task" style="max-height:none">${a.current_task}</div>`:''}</div>`).join('')}
renderOffice();
function updTasks(tasks){document.getElementById('tlist').innerHTML=tasks.length?tasks.map(t=>`<div class="task-item" onclick="showTask(${t.id})"><div class="task-pri ${t.priority||'medium'}"></div><div class="task-info"><div class="task-title">#${t.id} ${t.title}</div><div class="task-meta">${t.assignee?t.assignee+' • ':''}${t.priority} • ${fd(t.created_at)}</div></div><div class="task-prog"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress||0}%"></div></div><div class="prog-text">${t.progress||0}%</div></div><span class="badge badge-${t.status}">${t.status}</span></div>`).join(''):'<div class="empty"><div class="icon">📋</div>No tasks yet</div>'}
function updLogs(logs){document.getElementById('dlogs').innerHTML=logs.length?logs.slice().reverse().map(l=>`<div class="log-entry"><span class="log-time">${ft(l.timestamp)}</span><span class="log-agent">${l.agent_name}</span><span class="log-action">${l.action}</span>${l.detail?`<span class="log-detail">- ${l.detail}</span>`:''}</div>`).join(''):'<div class="empty">No activity</div>'}
function updComms(comms){document.getElementById('clist').innerHTML=comms.length?comms.map(c=>`<div class="comm-entry"><div><span class="comm-from">${c.from_agent}</span><span class="comm-arrow"> → </span><span class="comm-to">${c.to_agent}</span><div class="comm-msg">${c.message}</div></div><span class="comm-time">${ft(c.timestamp)}</span></div>`).join(''):'<div class="empty"><div class="icon">📡</div>No communications yet</div>'}
function updLearning(lrn){document.getElementById('llist').innerHTML=lrn.length?lrn.map(l=>`<div class="lrn-item"><div class="lrn-icon">${l.agent_name==='System'?'💡':'🧠'}</div><div class="lrn-content"><div class="lrn-lesson">${l.lesson}</div><div class="lrn-meta">${l.agent_name} • ${fd(l.created_at)}</div></div><div class="lrn-count">${l.applied_count||0}x</div></div>`).join(''):'<div class="empty"><div class="icon">🧠</div>No learnings yet</div>'}
function updFeedback(fb){document.getElementById('flist').innerHTML=fb.length?fb.map(f=>`<div class="lrn-item"><div class="lrn-icon">${'⭐'.repeat(f.rating||0)}</div><div class="lrn-content"><div class="lrn-lesson">${f.comment||'No comment'}</div><div class="lrn-meta">${f.agent_name||'General'} • ${fd(f.timestamp)}</div></div></div>`).join(''):'<div class="empty">No feedback yet</div>'}
function updDeliverables(del){document.getElementById('dlist').innerHTML=del.length?del.map(d=>`<div class="del-item"><div class="del-icon">${d.deliverable_type==='file'?'📄':'📦'}</div><div class="del-info"><div class="del-title">${d.task_title||'Untitled'}</div><div class="del-meta">${d.agent_name?d.agent_name+' • ':''}${d.description||''} • ${fd(d.created_at)}</div></div></div>`).join(''):'<div class="empty"><div class="icon">📦</div>No deliverables yet</div>'}
function updSys(sys){document.getElementById('sc').textContent=(sys.cpu||0)+'%';document.getElementById('sm').textContent=(sys.memory||0)+'%';document.getElementById('sc').className='sv'+(sys.cpu>80?' e':sys.cpu>60?' w':'');document.getElementById('sm').className='sv'+(sys.memory>80?' e':sys.memory>60?' w':'')}
function updNav(agents,tasks){document.getElementById('nac').textContent=agents.filter(a=>a.status==='active').length;document.getElementById('ntc').textContent=tasks.filter(t=>t.status!=='completed').length}
function updTaskSel(tasks){const s=document.getElementById('psel'),cur=s.value;s.innerHTML='<option value="">Select task...</option>'+tasks.map(t=>`<option value="${t.id}">#${t.id} ${t.title}</option>`).join('');if(cur)s.value=cur}
function updAgentSel(agents){document.getElementById('fb-agent').innerHTML='<option value="">General</option>'+agents.map(a=>`<option value="${a.name}">${a.name}</option>`).join('')}
function startTicker(items){if(!items.length)return;let i=0;const el=document.getElementById('ticker-txt');if(tickerTimer)clearInterval(tickerTimer);el.textContent=items[0];tickerTimer=setInterval(()=>{i=(i+1)%items.length;el.style.animation='none';el.offsetHeight;el.textContent=items[i];el.style.animation='ticker 15s linear infinite';},12000)}
function showAgent(name){const a=allAgents.find(x=>x.name===name);if(!a)return;document.getElementById('adp').style.display='block';document.getElementById('adt').textContent=`${a.avatar||'🤖'} ${a.name}`;document.getElementById('adc').innerHTML=`<div class="grid g3" style="margin-bottom:8px"><div class="card stat-card"><div class="stat-num">${a.tasks_completed||0}</div><div class="stat-label">Tasks</div></div></div><div style="margin-bottom:6px"><strong>Status:</strong> <span class="badge badge-${a.status}">${a.status}</span></div><div style="margin-bottom:6px"><strong>Model:</strong> <code style="color:var(--accent)">${a.model||'N/A'}</code></div><div style="margin-bottom:6px"><strong>Current:</strong> ${a.current_task||'Idle'}</div>`;document.getElementById('adp').scrollIntoView({behavior:'smooth'})}
async function showTask(id){curTaskId=id;const d=await f(`${API}/api/tasks/${id}`);if(!d.success)return;const t=d.task;document.getElementById('tdp').style.display='block';document.getElementById('tdt').textContent=`#${t.id} ${t.title}`;document.getElementById('bct').style.display=t.status==='completed'?'none':'inline-block';const logs=d.logs||[],pipe=d.pipeline||[];document.getElementById('tdc').innerHTML=`<div class="grid g2" style="margin-bottom:8px"><div><strong>Assignee:</strong> ${t.assignee||'Unassigned'}</div><div><strong>Priority:</strong> <span class="badge badge-${t.priority==='critical'?'failed':t.priority==='high'?'working':'pending'}">${t.priority}</span></div><div><strong>Status:</strong> <span class="badge badge-${t.status}">${t.status}</span></div><div><strong>Stage:</strong> ${t.stage||'queued'}</div></div>${t.description?`<div style="margin-bottom:8px;padding:8px;background:var(--bg);border-radius:6px;border:1px solid var(--border)">${t.description}</div>`:''}<div style="margin-bottom:8px"><div class="fl">Progress: ${t.progress||0}%</div><div class="prog-bar" style="height:6px"><div class="prog-fill" style="width:${t.progress||0}%"></div></div></div>${pipe.length?`<div style="margin-bottom:8px"><div class="fl">Pipeline</div><div class="pipeline">${pipe.map((p,i)=>`<div class="pipe-stage"><div class="pipe-icon ${p.status}">${i+1}</div><div class="pipe-label">${p.stage}</div></div>${i<pipe.length-1?'<div class="pipe-arrow">→</div>':''}`).join('')}</div></div>`:''}<div style="margin-bottom:8px"><div class="fl">Add Log</div><div style="display:flex;gap:4px"><input type="text" class="fi" id="log-act" placeholder="Action..." style="flex:1"><input type="text" class="fi" id="log-det" placeholder="Details..." style="flex:1"><button class="btn btn-primary btn-sm" onclick="addLog(${id})">Add</button></div></div><div class="fl">Activity (${logs.length})</div><div class="log-cont" style="max-height:200px">${logs.length?logs.map(l=>`<div class="log-entry"><span class="log-time">${ft(l.timestamp)}</span><span class="log-agent">${l.agent_name}</span><span class="log-action">${l.action}</span>${l.detail?`<span class="log-detail">- ${l.detail}</span>`:''}</div>`).join(''):'<div class="empty">No logs</div>'}</div>${t.result?`<div style="margin-top:8px;padding:8px;background:rgba(0,255,136,.05);border:1px solid rgba(0,255,136,.2);border-radius:6px"><strong>Result:</strong><br>${t.result}</div>`:''}`;document.getElementById('tdp').scrollIntoView({behavior:'smooth'})}
function closeTaskDetail(){document.getElementById('tdp').style.display='none';curTaskId=null}
async function addLog(id){const act=document.getElementById('log-act').value,det=document.getElementById('log-det').value;if(!act)return;await fetch(`${API}/api/tasks/${id}/log`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_name:'Ghost',action:act,detail:det})});document.getElementById('log-act').value='';document.getElementById('log-det').value='';showTask(id)}
async function completeCurrentTask(){if(!curTaskId)return;const r=prompt('Task result:');if(r===null)return;await fetch(`${API}/api/tasks/${curTaskId}/complete`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({result:r,agent_name:'Ghost'})});closeTaskDetail();loadAll()}
async function loadPipe(){const id=document.getElementById('psel').value;if(!id){document.getElementById('pview').innerHTML='<div class="empty"><div class="icon">⚙️</div>Select a task</div>';return}curTaskId=parseInt(id);const d=await f(`${API}/api/pipeline/${id}`);const runs=d.pipeline||[];const stages=['Source','Build','Test','Security Scan','Deploy Staging','Deploy Production'];const sd=stages.map(s=>runs.find(r=>r.stage===s)||{stage:s,status:'pending'});document.getElementById('pview').innerHTML=`<div class="pipeline">${sd.map((s,i)=>`<div class="pipe-stage"><div class="pipe-icon ${s.status}">${s.status==='done'?'✓':s.status==='running'?'⚡':s.status==='failed'?'✕':i+1}</div><div class="pipe-label">${s.stage}</div></div>${i<sd.length-1?'<div class="pipe-arrow">→</div>':''}`).join('')}</div><div style="margin-top:8px"><div class="btn-group"><button class="btn btn-sm btn-primary" onclick="runPipe(${id})">▶▶ Run All</button></div></div>`;const lr=await f(`${API}/api/logs?limit=50`);const pl=(lr.logs||[]).filter(l=>l.action.includes('pipeline')||l.action.includes('Pipeline'));document.getElementById('plogs').innerHTML=pl.length?pl.slice().reverse().map(l=>`<div class="log-entry"><span class="log-time">${ft(l.timestamp)}</span><span class="log-agent">${l.agent_name}</span><span class="log-action">${l.action}</span></div>`).join(''):'<div class="empty">No pipeline logs</div>'}
async function runPipe(id){const stages=['Source','Build','Test','Security Scan','Deploy Staging','Deploy Production'];for(const s of stages){await fetch(`${API}/api/pipeline/${id}/stage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:s,status:'running',log:`Starting ${s}...`})});await new Promise(r=>setTimeout(r,400));await fetch(`${API}/api/pipeline/${id}/stage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:s,status:'done',log:`${s} done`})})}loadPipe()}
const _seenMsgs=new Set();
function _msgKey(msg){return msg.sender+'|'+msg.timestamp.substring(0,19)+'|'+msg.message.substring(0,40)}
function appendChat(msg,scroll=true){
  const el=document.getElementById('chat-msgs');
  const key=_msgKey(msg);
  if(_seenMsgs.has(key))return;
  _seenMsgs.add(key);
  if(_seenMsgs.size>200)_seenMsgs.clear();
  const self=msg.sender==='Ghost';
  const isSystem=msg.sender==='System';
  const d=document.createElement('div');
  d.className='chat-msg '+(self?'self':'')+(isSystem?' chat-system':'');
  d.setAttribute('data-ts',msg.timestamp);
  d.setAttribute('data-sender',msg.sender);
  let bubbleClass='chat-bubble';
  if(msg.sender==='Jorm')bubbleClass+=' msg-glow';
  let avIcon='🦑';
  if(self)avIcon='👤';
  else if(isSystem)avIcon='⚡';
  d.innerHTML='<div class="chat-av">'+avIcon+'</div><div><div class="chat-sender">'+msg.sender+'</div><div class="'+bubbleClass+'">'+esc(msg.message)+'</div><div class="chat-time">'+ft(msg.timestamp)+'</div></div>';
  el.appendChild(d);
  if(scroll)el.scrollTop=el.scrollHeight;
}
function showTyping(){
  if(document.getElementById('typing-indicator')||document.getElementById('typing-shimmer'))return;
  const el=document.getElementById('chat-msgs');
  const d=document.createElement('div');
  d.id='typing-shimmer';
  d.className='chat-msg';
  d.innerHTML=`<div class="chat-av">🦑</div><div><div class="chat-sender">Jorm</div><div class="chat-bubble"><span class="ai-thinking">Thinking...</span></div></div>`;
  el.appendChild(d);
  el.scrollTop=el.scrollHeight;
  typingTimer=setTimeout(stopTyping,30000);
}
function stopTyping(){
  const shimmer=document.getElementById('typing-shimmer');
  if(shimmer)shimmer.remove();
  const indicator=document.getElementById('typing-indicator');
  if(indicator)indicator.remove();
  if(typingTimer){clearTimeout(typingTimer);typingTimer=null}
}
async function sendChat(){const inp=document.getElementById('chat-in');const msg=inp.value.trim();if(!msg||sending)return;sending=true;inp.disabled=true;inp.value='';setAvatarState('thinking');showTyping();try{const res=await fetch(`${API}/api/chat/ai`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,sender:'Ghost'})});if(!res.ok){throw new Error(`Server error ${res.status}`)}const data=await res.json();stopTyping();if(data.success){setAvatarState('working');}else{setAvatarState('error');setTimeout(()=>setAvatarState('idle'),3000);appendChat({sender:'Jorm',message:'⚠️ '+(data.error||'Something went wrong. Try again.'),timestamp:new Date().toISOString()},true)}}catch(e){console.error('sendChat error:',e);stopTyping();setAvatarState('error');setTimeout(()=>setAvatarState('idle'),3000);appendChat({sender:'Jorm',message:'⚠️ '+(e.message==='Failed to fetch'?'Connection error. Is the server running?':e.message),timestamp:new Date().toISOString()},true)}finally{sending=false;inp.disabled=false;inp.focus()}}
async function submitFeedback(){const ag=document.getElementById('fb-agent').value,rt=parseInt(document.getElementById('fb-rating').value),cm=document.getElementById('fb-comment').value;if(!cm)return;await fetch(`${API}/api/feedback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent_name:ag,rating:rt,comment:cm,category:'user_feedback'})});document.getElementById('fb-comment').value='';notif('Feedback submitted!','success')}
async function loadTwitch(){
  Promise.all([
    f(`${API}/api/twitch/channel`).catch(()=>null),
    f(`${API}/api/twitch/stream`).catch(()=>null),
    f(`${API}/api/twitch/vods`).catch(()=>null),
    f(`${API}/api/twitch/clips`).catch(()=>null),
    f(`${API}/api/twitch/followers`).catch(()=>null)
  ]).then(([ch,st,vods,clips,followers])=>{
    const c=ch&&ch.channel;
    document.getElementById('tw-ch').innerHTML=c?`<div style="text-align:center;padding:12px"><img src="${c.profile_image_url}" style="width:64px;height:64px;border-radius:50%;border:2px solid var(--accent);margin-bottom:6px"><div style="font-family:'Orbitron';font-size:14px;color:var(--bright)">${c.display_name}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">${c.description||''}</div><div style="margin-top:8px;display:flex;justify-content:center;gap:12px;font-size:9px;color:var(--muted)"><span>👁 ${c.view_count||0} views</span><span>👥 ${followers&&followers.total?followers.total.toLocaleString():'-'} followers</span></div></div>`:'<div class="empty">Twitch unavailable</div>';
    const s=st&&st.stream;
    const live=st&&st.live;
    const dot=document.getElementById('live-dot');
    const liveText=document.getElementById('live-text');
    if(live&&s){
      dot.classList.add('live');
      liveText.textContent='LIVE';
      liveText.classList.add('live-text');
      document.getElementById('stream-title').textContent=s.title||'Untitled Stream';
      document.getElementById('stream-meta').innerHTML=`<span>🎮 ${s.game_name||'Just Chatting'}</span><span>👥 ${s.viewer_count} viewers</span><span>👁 ${c.view_count||0} total views</span>`;
      document.getElementById('stream-link').href=`https://twitch.tv/${c&&c.login_name||'GhostLegacyX'}`;
      document.getElementById('tw-viewers').textContent=s.viewer_count;
      document.getElementById('tw-followers').textContent=followers&&followers.total?followers.total.toLocaleString():'-';
      document.getElementById('tw-game').textContent=s.game_name||'-';
      if(s.started_at){const started=new Date(s.started_at);const now=new Date();const diff=Math.floor((now-started)/1000);const hrs=Math.floor(diff/3600);const mins=Math.floor((diff%3600)/60);document.getElementById('tw-uptime').textContent=`${hrs}h ${mins}m`;}
      else{document.getElementById('tw-uptime').textContent='-';}
    } else {
      dot.classList.remove('live');
      liveText.textContent='OFFLINE';
      liveText.classList.remove('live-text');
      document.getElementById('stream-title').textContent=c?`${c.display_name} is offline`:'Stream offline';
      document.getElementById('stream-meta').innerHTML=c?`<span>Last: ${c.description||'N/A'}</span>`:'';
      document.getElementById('stream-link').href=`https://twitch.tv/${c&&c.login_name||'GhostLegacyX'}`;
      document.getElementById('tw-viewers').textContent='-';
      document.getElementById('tw-followers').textContent=followers&&followers.total?followers.total.toLocaleString():'-';
      document.getElementById('tw-game').textContent='-';
      document.getElementById('tw-uptime').textContent='-';
    }
    document.getElementById('tw-vods').innerHTML=vods&&vods.vods&&vods.vods.length?vods.vods.slice(0,5).map(v=>`<div class="task-item" onclick="window.open('${v.url}','_blank')"><div class="task-info"><div class="task-title">${v.title}</div><div class="task-meta">${v.duration} • ${v.view_count} views • ${fd(v.created_at)}</div></div></div>`).join(''):'<div class="empty">No VODs yet</div>';
    document.getElementById('tw-clips').innerHTML=clips&&clips.clips&&clips.clips.length?clips.clips.slice(0,5).map(c=>`<div class="task-item" onclick="window.open('${c.url}','_blank')"><div class="task-info"><div class="task-title">${c.title}</div><div class="task-meta">${c.duration}s • ${c.view_count} views • ${c.creator_name}</div></div></div>`).join(''):'<div class="empty">No clips yet</div>';
    loadStreamChat();
  }).catch(err=>{console.error('Twitch load error:',err)});
}
function loadStreamChat(){
  f(`${API}/api/chat?limit=20`).then(d=>{
    const msgs=d.messages||[];
    const chatEl=document.getElementById('tw-chat');
    document.getElementById('chat-count').textContent=`(${msgs.length})`;
    if(msgs.length===0){chatEl.innerHTML='<div class="stream-chat-empty">No chat messages yet. Start a conversation in the Chat tab!</div>';return;}
    chatEl.innerHTML=msgs.slice().reverse().map(m=>{
      const time=m.timestamp?new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
      const isSystem=m.sender==='System';
      const isJorm=m.sender==='Jorm';
      return `<div class="stream-chat-msg${isSystem?' style="opacity:.6"':''}"><span class="stream-chat-sender" style="color:${isJorm?'var(--accent)':isSystem?'var(--yellow)':'var(--green)'}">${m.sender}</span><span class="stream-chat-text">${m.message}</span><span class="stream-chat-time">${time}</span></div>`;
    }).join('');
  }).catch(()=>{document.getElementById('tw-chat').innerHTML='<div class="stream-chat-empty">Chat unavailable</div>';});
}
function copyStreamUrl(){
  const url=document.getElementById('stream-link').href;
  if(navigator.clipboard){navigator.clipboard.writeText(url);showToast('Stream link copied!');}
  else{const t=document.createElement('input');t.value=url;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showToast('Stream link copied!');}
}
function showToast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--accent);color:var(--accent);padding:8px 16px;border-radius:8px;font-size:11px;font-weight:600;z-index:9999;animation:fadeInUp .3s ease-out';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},2000);
}
async function loadTrending(){const d=await f(`${API}/api/trending`);document.getElementById('trend-upd').textContent='Updated: '+ft(d.timestamp);let h='<div class="grid g2">';if(d.sources.github){h+='<div><div class="fl" style="margin-bottom:6px">🔥 GitHub Trending</div>';d.sources.github.forEach(r=>{h+=`<div class="task-item" onclick="window.open('${r.url}','_blank')"><div class="task-info"><div class="task-title">${r.name}</div><div class="task-meta">${r.language||'N/A'} • ⭐ ${r.stars.toLocaleString()}</div></div></div>`});h+='</div>'}if(d.sources.reddit_gaming){h+='<div><div class="fl" style="margin-bottom:6px">🎮 r/gaming Hot</div>';d.sources.reddit_gaming.forEach(r=>{h+=`<div class="task-item" onclick="window.open('${r.url}','_blank')"><div class="task-info"><div class="task-title">${r.title}</div><div class="task-meta">⬆ ${r.score.toLocaleString()}</div></div></div>`});h+='</div>'}if(!d.sources.github&&!d.sources.reddit_gaming)h='<div class="empty"><div class="text">No trending data</div></div>';else h+='</div>';document.getElementById('trend-c').innerHTML=h}
function navTo(page){
  if(_intervals._twitch){clearInterval(_intervals._twitch);_intervals._twitch=null;}
  const curPage=document.querySelector('.page.active');
  const navEl=document.querySelector('.nav-item[data-page="'+page+'"]');
  const pageEl=document.getElementById('page-'+page);
  if(!pageEl){return;}
  if(curPage&&curPage!==pageEl){
    curPage.style.opacity='0';
    setTimeout(()=>{
      curPage.classList.remove('active');
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      if(navEl)navEl.classList.add('active');
      pageEl.style.display='';
      void pageEl.offsetWidth;
      pageEl.classList.add('active');
      pageEl.style.opacity='1';
    },250);
  }else{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.style.opacity='0';p.style.display='none';});
    if(navEl)navEl.classList.add('active');
    pageEl.style.display='';
    void pageEl.offsetWidth;
    pageEl.classList.add('active');
    pageEl.style.opacity='1';
  }
  const _pt={chat:'CHAT',dashboard:'OVERVIEW',office:'AGENT OFFICE',agents:'AGENTS',tasks:'TASKS',pipeline:'PIPELINE',comms:'COMMS',deliverables:'DELIVERABLES',learning:'LEARNING',trending:'TRENDING',twitch:'TWITCH',office3d:'3D OFFICE',taskboard:'TASKBOARD',projects:'PROJECTS',skills:'SKILLS',subagents:'SUB-AGENTS',history:'TASK HISTORY'};
  document.getElementById('pt').textContent=_pt[page]||page.toUpperCase();
  if(page==='twitch'){loadTwitch();_intervals._twitch=setInterval(()=>{if(document.getElementById('page-twitch').classList.contains('active'))loadTwitch();},30000);}
  if(page==='trending')loadTrending();
  if(page==='chat')document.getElementById('chat-in').focus();
  if(page==='office3d'){setTimeout(()=>{const ld=document.getElementById('claw3d-loading');if(ld)ld.style.display='none';},3000);}
  if(page==='taskboard')loadTaskboard();
  if(page==='projects')loadProjects();
  if(page==='skills')loadSkills();
  if(page==='subagents')loadSubagents();
  if(page==='history')loadTaskHistory();
  if(page==='office')setTimeout(renderOffice,100);
}
function openModal(n){document.getElementById('modal-overlay').classList.add('open');document.querySelectorAll('#modal-overlay .modal').forEach(m=>m.style.display='none');document.getElementById(`modal-${n}`).style.display='block'}
function closeModal(){document.getElementById('modal-overlay').classList.remove('open')}
async function createTask(){const t=document.getElementById('task-title').value,d=document.getElementById('task-desc').value,a=document.getElementById('task-assignee').value,p=document.getElementById('task-priority').value;if(!t)return;const r=await fetch(`${API}/api/tasks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,description:d,assignee:a,priority:p})});const data=await r.json();if(data.success){closeModal();document.getElementById('task-title').value='';document.getElementById('task-desc').value='';notif('Task created!','success');loadAll()}}
async function createAgent(){const n=document.getElementById('agent-name').value,r=document.getElementById('agent-role').value;if(!n||!r)return;await fetch(`${API}/api/agents`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,role:r,model:document.getElementById('agent-model').value,avatar:document.getElementById('agent-avatar').value})});closeModal();notif(`Agent ${n} added!`,'success');loadAll()}
async function createProject(){const n=document.getElementById('project-name').value,d=document.getElementById('project-desc').value;if(!n)return;await fetch(`${API}/api/projects`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,description:d,category:document.getElementById('project-category').value,status:document.getElementById('project-status').value,notes:document.getElementById('project-notes').value})});closeModal();document.getElementById('project-name').value='';document.getElementById('project-desc').value='';notif('Project created!','success');loadProjects();}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function fd(d){if(!d)return'N/A';try{return new Date(d).toLocaleString()}catch(e){return d}}
function ft(d){if(!d)return'--:--';try{return new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(e){return d}}
function clock(){setInterval(()=>{document.getElementById('clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})},1000)}
function notif(msg,type){const d=document.createElement('div');d.className=`notif ${type}`;d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),3000)}
function particles(){const c=document.getElementById('particles');for(let i=0;i<15;i++){const p=document.createElement('div');p.className='particle';p.style.left=Math.random()*100+'%';p.style.top=Math.random()*100+'%';p.style.opacity=Math.random()*.3+.1;p.style.animation=`float ${Math.random()*4+3}s ease-in-out infinite`;p.style.animationDelay=Math.random()*3+'s';c.appendChild(p)}}
let typingTimer=null;


// === MEMORY & HISTORY ===
let currentChatOffset = 0;
const CHAT_PAGE_SIZE = 50;

function loadMemoryData() {
  // Update stats
  Promise.all([
    f(`${API}/api/memory/daily`),
    f(`${API}/api/memory/chat?limit=1`),
    f(`${API}/api/memory/tasks?limit=1`),
    f(`${API}/api/deliverables?limit=1`)
  ]).then(([daily, chat, tasks, del]) => {
    const n1 = document.getElementById('mem-stat-files');
    const n2 = document.getElementById('mem-stat-chat');
    const n3 = document.getElementById('mem-stat-tasks');
    const n4 = document.getElementById('mem-stat-deliverables');
    if (n1) n1.textContent = daily.files ? daily.files.length : 0;
    if (n2) n2.textContent = chat.messages ? chat.messages.length : 0;
    if (n3) n3.textContent = tasks.tasks ? tasks.tasks.length : 0;
    if (n4) n4.textContent = del.deliverables ? del.deliverables.length : 0;
  }).catch(() => {});

  // Load MEMORY.md
  f(`${API}/api/memory`).then(d => {
    const el = document.getElementById('memory-content');
    const meta = document.getElementById('memory-file-meta');
    if (!el) return;
    if (d.success && d.content) {
      el.textContent = d.content;
      if (meta) meta.textContent = d.lastModified ? `Last updated: ${fd(d.lastModified)}` : 'Just created';
    } else if (d.error) {
      el.textContent = '# Error\n\nCould not load MEMORY.md\n\n' + d.error;
    }
  }).catch(() => {
    const el = document.getElementById('memory-content');
    if (el) el.textContent = '# Error\n\nCould not connect to server';
  });

  // Load daily files list
  loadDailyFiles();

  // Load chat history
  loadChatHistory();

  // Load task history
  loadMemTaskHistory();

  // Load deliverables
  loadMemDeliverables();

  // Load projects
  loadMemProjects();
}

function loadDailyFiles() {
  f(`${API}/api/memory/daily`).then(d => {
    const list = document.getElementById('daily-files-list');
    if (!list) return;
    if (!d.success || !d.files || d.files.length === 0) {
      list.innerHTML = '<div class="empty"><div class="icon">📭</div><span>No daily log files found</span></div>';
      return;
    }
    list.innerHTML = d.files.map(f =>
      `<div class="daily-file-item" onclick="loadDailyFile('${f.date}')">
        <span class="daily-file-icon">📄</span>
        <div class="daily-file-info">
          <div class="daily-file-date">${f.date}</div>
          <div class="daily-file-meta">${(f.size / 1024).toFixed(1)} KB • ${fd(f.lastModified)}</div>
        </div>
      </div>`
    ).join('');
  }).catch(() => {
    const list = document.getElementById('daily-files-list');
    if (list) list.innerHTML = '<div class="empty">Could not load daily files</div>';
  });
}

function loadDailyFile(date) {
  const contentEl = document.getElementById('daily-content');
  if (!contentEl) return;
  contentEl.style.display = 'block';
  contentEl.textContent = 'Loading...';
  f(`${API}/api/memory/daily/${date}`).then(d => {
    contentEl.textContent = d.content || '# ' + date + '\n\n(Empty)';
  }).catch(() => {
    contentEl.textContent = 'Could not load daily file';
  });
}

function loadChatHistory(append) {
  if (!append) currentChatOffset = 0;
  f(`${API}/api/memory/chat?limit=${CHAT_PAGE_SIZE}&offset=${currentChatOffset}`).then(d => {
    const list = document.getElementById('chat-history-list');
    if (!list) return;
    if (!d.success || !d.messages || d.messages.length === 0) {
      if (!append) list.innerHTML = '<div class="empty"><div class="icon">💬</div><span>No chat history yet</span></div>';
      return;
    }
    const msgs = d.messages.map(m =>
      `<div class="chat-history-msg">
        <span class="ch-sender">${esc(m.sender)}</span>
        <span class="ch-text">${esc(m.message)}</span>
        <span class="ch-time">${ft(m.timestamp)}</span>
      </div>`
    ).join('');
    if (append) {
      list.innerHTML += msgs;
    } else {
      list.innerHTML = msgs;
    }
    currentChatOffset += d.messages.length;
    if (!d.hasMore) {
      list.innerHTML += '<div class="empty" style="padding:8px;font-size:9px;color:var(--muted)">- End of history -</div>';
    }
  }).catch(() => {
    const list = document.getElementById('chat-history-list');
    if (list && !append) list.innerHTML = '<div class="empty">Could not load chat history</div>';
  });
}

function loadMoreChat() {
  loadChatHistory(true);
}

function loadMemTaskHistory() {
  f(`${API}/api/memory/tasks?limit=50`).then(d => {
    const list = document.getElementById('task-history-list');
    if (!list) return;
    if (!d.success || !d.tasks || d.tasks.length === 0) {
      list.innerHTML = '<div class="empty"><div class="icon">📋</div><span>No completed tasks yet</span></div>';
      return;
    }
    list.innerHTML = d.tasks.map(t => {
      const xpGain = 25;
      return `<div class="task-history-item">
        <span class="th-icon">✅</span>
        <div class="th-info">
          <div class="th-title">#${t.id} ${esc(t.title)}</div>
          <div class="th-meta">${t.assignee ? esc(t.assignee) + ' • ' : ''}${fd(t.completed_at || t.updated_at)}</div>
        </div>
        <span class="th-xp">+${xpGain} XP</span>
      </div>`;
    }).join('');
  }).catch(() => {
    const list = document.getElementById('task-history-list');
    if (list) list.innerHTML = '<div class="empty">Could not load task history</div>';
  });
}

function loadMemDeliverables() {
  f(`${API}/api/deliverables?limit=50`).then(d => {
    const list = document.getElementById('deliverables-list');
    if (!list) return;
    if (!d.success || !d.deliverables || d.deliverables.length === 0) {
      list.innerHTML = '<div class="empty"><div class="icon">📦</div><span>No deliverables yet</span></div>';
      return;
    }
    list.innerHTML = d.deliverables.map(dl =>
      `<div class="deliverable-item">
        <span class="dl-icon">📄</span>
        <div class="dl-info">
          <div class="dl-title">${esc(dl.title || dl.task_title || 'Untitled')}</div>
          <div class="dl-meta">${dl.category || 'general'} • ${fd(dl.createdAt || dl.created_at)}</div>
          <div class="dl-preview">${esc((dl.content || dl.description || '').substring(0, 120))}${(dl.content || dl.description || '').length > 120 ? '...' : ''}</div>
        </div>
        <span class="dl-status ${dl.status || 'completed'}">${dl.status || 'completed'}</span>
      </div>`
    ).join('');
  }).catch(() => {
    const list = document.getElementById('deliverables-list');
    if (list) list.innerHTML = '<div class="empty">Could not load deliverables</div>';
  });
}

function loadMemProjects() {
  f(`${API}/api/projects`).then(d => {
    const list = document.getElementById('mem-projects-list');
    if (!list) return;
    if (!d.success || !d.projects || d.projects.length === 0) {
      list.innerHTML = '<div class="empty"><div class="icon">🏗️</div><span>No projects yet</span></div>';
      return;
    }
    list.innerHTML = d.projects.map(p =>
      `<div class="mem-project-item" onclick="navTo('projects');showProjectDetail(${p.id})">
        <span class="mp-icon">🏗️</span>
        <div class="mp-info">
          <div class="mp-name">${esc(p.name)}</div>
          <div class="mp-desc">${esc((p.description || '').substring(0, 100))}${(p.description || '').length > 100 ? '...' : ''}</div>
          <div class="mp-meta">${p.status} • ${p.category} • ${fd(p.updated_at)}</div>
        </div>
      </div>`
    ).join('');
  }).catch(() => {
    const list = document.getElementById('mem-projects-list');
    if (list) list.innerHTML = '<div class="empty">Could not load projects</div>';
  });
}

function searchMemory() {
  const q = document.getElementById('memory-search').value.trim();
  if (!q) return;
  const resultsList = document.getElementById('search-results-list');
  const resultsMeta = document.getElementById('search-results-meta');
  const searchTab = document.getElementById('mem-tab-search');
  const searchCount = document.getElementById('search-count');
  if (resultsList) resultsList.innerHTML = '<div class="empty"><div class="icon">🔍</div><span>Searching...</span></div>';
  switchMemTab('search');
  if (searchTab) searchTab.style.display = 'flex';
  f(`${API}/api/memory/search?q=${encodeURIComponent(q)}`).then(d => {
    if (!d.success || !d.results || d.results.length === 0) {
      if (resultsList) resultsList.innerHTML = `<div class="empty"><div class="icon">🔍</div><span>No results for "${esc(q)}"</span></div>`;
      if (searchCount) searchCount.textContent = '(0)';
      return;
    }
    if (searchCount) searchCount.textContent = `(${d.total})`;
    if (resultsMeta) resultsMeta.textContent = `Found ${d.total} results for "${q}"`;
    if (resultsList) {
      resultsList.innerHTML = d.results.map(r =>
        `<div class="search-result-item">
          <span class="search-result-source">${esc(r.source)}</span>
          <span class="search-result-text">${esc(r.text)}</span>
        </div>`
      ).join('');
    }
  }).catch(() => {
    if (resultsList) resultsList.innerHTML = '<div class="empty">Search failed</div>';
  });
}

function switchMemTab(tab) {
  document.querySelectorAll('.mem-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.mem-tab-panel').forEach(p => p.classList.remove('active'));
  const tabEl = document.querySelector(`.mem-tab[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');
  const panel = document.getElementById(`mem-panel-${tab}`);
  if (panel) panel.classList.add('active');
  if (tab === 'search') {
    const st = document.getElementById('mem-tab-search');
    if (st) st.style.display = 'flex';
  }
}

// Auto-load memory data when navigated to
const origNavTo = navTo;
navTo = function(page) {
  origNavTo(page);
  if (page === 'memory') {
    setTimeout(loadMemoryData, 300);
  }
};

// === JORM AVATAR 2.0 ===
const avatarEl=document.getElementById('jorm-avatar');
const speechEl=document.getElementById('jorm-speech');
let avatarState='idle';
let speechTimer=null;
let randomIdleTimer=null;
const avatarStates=['idle','thinking','writing','working','excited','error','sleeping'];
const speechTexts={
  idle:['Hey Jeff! 🦑',"What's up?",'Ready to work!','What can I do?','Listening...'],
  thinking:['Hmm...','Let me think...','Processing...','Analyzing...','One sec...'],
  writing:['Typing it up...','Crafting response...','Writing...','Almost there...'],
  working:['On it!','Working...',"Executing...",'Getting it done...','Crunching...'],
  excited:['Awesome! 🎉','Nice one!',"Love it! ✨","That's cool!",'Sweet!'],
  error:['Oops! 😅','Hmm, that broke...','Let me fix that...','Something went wrong...'],
  sleeping:['Zzz...','💤','...'],
  eating:["Nom nom nom 🍕",'Mmm, delicious! 🍔',"Can't stop eating 🌮",'Is that pizza? 🍕'],
  smoking:['😮‍💨','Puff puff...','Just one more...','*cough*','Breathing out clouds 🌫️'],
  angry:['Grrr! 😡','Not cool!','So frustrated! 💢','Ugh, come on!','I told you already! 😤']};

function setAvatarState(state){
  if(!avatarEl)return;
  const allStates=['idle','thinking','writing','working','excited','error','sleeping','eating','smoking','angry'];
  allStates.forEach(s=>avatarEl.classList.remove(s));
  avatarEl.classList.add(state);
  avatarState=state;
  const texts=speechTexts[state]||speechTexts.idle;
  const text=texts[Math.floor(Math.random()*texts.length)];
  if(speechEl){
    speechEl.textContent=text;
    speechEl.classList.add('show');
    if(speechTimer)clearTimeout(speechTimer);
    speechTimer=setTimeout(()=>speechEl.classList.remove('show'),3000);
  }
  scheduleRandomIdle();
  updateSmoke();
}

function scheduleRandomIdle(){
  if(randomIdleTimer)clearTimeout(randomIdleTimer);
  // Only pick random fun states when already idle
  if(avatarState!=='idle')return;
  // Random interval between 30-90 seconds
  const delay=30000+Math.random()*60000;
  randomIdleTimer=setTimeout(()=>{
    if(avatarState!=='idle')return;
    const funStates=['eating','smoking','angry'];
    const pick=funStates[Math.floor(Math.random()*funStates.length)];
    setAvatarState(pick);
    // Hold the fun state for 5-10 seconds then go back to idle
    setTimeout(()=>setAvatarState('idle'),5000+Math.random()*5000);
  },delay);
}

// Add smoke element for smoking state
const smokeEl=document.createElement('div');
smokeEl.className='jorm-smoke';
smokeEl.style.display='none';
const jormBody=document.querySelector('.jorm-body');
if(jormBody)jormBody.appendChild(smokeEl);

function updateSmoke(){
  if(!smokeEl)return;
  smokeEl.style.display=avatarState==='smoking'?'block':'none';
}

avatarEl.addEventListener('click',()=>{
  const funStates=['eating','smoking','angry'];
  const pick=funStates[Math.floor(Math.random()*funStates.length)];
  setAvatarState(pick);
  setTimeout(()=>setAvatarState('idle'),4000);
});

function resetIdleTimer(){
  scheduleRandomIdle();
  updateSmoke();
}

const origSendChat=sendChat;
sendChat=function(){setAvatarState('thinking');resetIdleTimer();return origSendChat.apply(this,arguments)};
const origAppendChat=appendChat;
appendChat=function(msg,scroll){
  if(msg.sender==='Jorm'){setAvatarState('writing');setTimeout(()=>setAvatarState('idle'),2000);}
  else if(msg.sender==='Ghost'){setAvatarState('thinking');}
  resetIdleTimer();
  return origAppendChat.apply(this,arguments);
};

// Start the random idle cycle
setAvatarState('idle');

// === AGENT OFFICE VISUALIZATION ===
const agentColors={Jorm:'#00f0ff',Opus:'#ffd700',Codex:'#00ff88',Gemini:'#7b2fff',Claude:'#ff2d7b',Llama:'#ff8800',Mistral:'#88ddff'};
const agentIcons={Jorm:'🦑',Opus:'👑',Codex:'💻',Gemini:'🔬',Claude:'✍️',Llama:'🦙',Mistral:'🛡️'};
const allAgentColors=['#00f0ff','#ffd700','#00ff88','#7b2fff','#ff2d7b','#ff8800','#88ddff','#ff6644','#44ffaa','#ff44aa','#aaaaff','#ffaa44'];
const allAgentIcons=['🤖','🦑','👑','💻','🔬','✍️','🦙','🛡️','⚡','🎯','🧠','👁️','🔥','💎','🌟','🎨','📊','🔧','🚀','💡'];
const stationMap={coding:['development','coding','programming','debugging','refactor','build','deploy'],research:['research','analysis','investigate','study','review','data'],chat:['chat','communication','messaging','discord','social'],creative:['creative','design','content','write','art','media'],ops:['ops','management','organize','plan','admin','config'],idle:['idle','break','waiting','none']};





function storeAgentLog(agentName,log){
  if(!officeLogs[agentName])officeLogs[agentName]=[];
  officeLogs[agentName].unshift(log);
  if(officeLogs[agentName].length>10)officeLogs[agentName].pop();
}
function storeAgentComm(agentName,comm){
  if(!officeComms[agentName])officeComms[agentName]=[];
  officeComms[agentName].unshift(comm);
  if(officeComms[agentName].length>10)officeComms[agentName].pop();
}

function getStationForAgent(agent){
  const task=(agent.current_task||'').toLowerCase();
  const role=(agent.role||'').toLowerCase();
  const status=agent.status||'idle';
  if(status==='idle'||!agent.current_task) return 'idle';
  for(const [station,keywords] of Object.entries(stationMap)){
    if(station==='idle') continue;
    for(const kw of keywords){
      if(task.includes(kw)||role.includes(kw)) return station;
    }
  }
  if(status==='working') return 'coding';
  if(status==='thinking') return 'research';
  return 'ops';
}

function renderOffice(){
  const wsEl=document.getElementById('office-workspace');
  if(!wsEl)return;
  const agentStations={};
  allAgents.forEach(agent=>{
    const newStation=getStationForAgent(agent);
    const oldStation=agentPositions[agent.name]||'idle';
    agentStations[agent.name]={station:newStation,changed:newStation!==oldStation};
    agentPositions[agent.name]=newStation;
  });
  ['coding','research','chat','creative','ops','idle'].forEach(station=>{
    const container=document.getElementById('station-'+station);
    if(!container)return;
    const stationAgents=allAgents.filter(a=>agentStations[a.name]&&agentStations[a.name].station===station);
    container.innerHTML=stationAgents.map(agent=>{
      const color=agentColors[agent.name]||'#00f0ff';
      const icon=agentIcons[agent.name]||'🤖';
      const status=agent.status||'idle';
      const task=agent.current_task||'';
      const logs=officeLogs[agent.name]||[];
      const comms=officeComms[agent.name]||[];
      const isWalking=agentStations[agent.name]&&agentStations[agent.name].changed;
      let tt='<div class="tooltip-header"><span class="tooltip-av">'+icon+'</span><span class="tooltip-name">'+agent.name+'</span><span class="tooltip-status badge badge-'+status+'">'+status+'</span></div>';
      if(task) tt+='<div class="tooltip-section"><div class="tooltip-label">Current Task</div><div class="tooltip-text">'+task+'</div></div>';
      tt+='<div class="tooltip-section"><div class="tooltip-label">Role</div><div class="tooltip-text">'+agent.role+'</div></div>';
      tt+='<div class="tooltip-section"><div class="tooltip-label">Model</div><div class="tooltip-text" style="font-family:\'JetBrains Mono\';font-size:8px">'+(agent.model||'N/A')+'</div></div>';
      tt+='<div class="tooltip-section"><div class="tooltip-label">Tasks Done</div><div class="tooltip-text">'+(agent.tasks_completed||0)+'</div></div>';
      if(logs.length){
        tt+='<div class="tooltip-section"><div class="tooltip-label">Recent Logs</div><div class="tooltip-logs">';
        logs.slice(0,5).forEach(l=>{tt+='<div class="tooltip-log-entry"><span style="color:var(--accent)">['+ft(l.timestamp)+']</span> '+l.action+(l.detail?' - '+l.detail:'')+'</div>';});
        tt+='</div></div>';
      }
      if(comms.length){
        tt+='<div class="tooltip-section"><div class="tooltip-label">Communications</div>';
        comms.slice(0,3).forEach(c=>{
          const dir=c.from===agent.name?'→ '+c.to:'← '+c.from;
          tt+='<div class="tooltip-comm">'+dir+': '+c.msg.substring(0,60)+(c.msg.length>60?'...':'')+'</div>';
        });
        tt+='</div>';
      }
      return '<div class="agent-desk '+status+(isWalking?' walking':'')+'" onclick="showAgent(\''+agent.name+'\')">'+
        '<div class="desk-particles"></div>'+
        '<div class="agent-avatar-wrap">'+
          '<div class="agent-avatar-icon" style="background:linear-gradient(135deg,'+color+'22,'+color+'11);border-color:'+color+'">'+icon+'</div>'+
          '<div class="agent-status-dot '+status+'" style="background:'+(status==='active'?'var(--green)':status==='working'?'var(--yellow)':status==='thinking'?'var(--accent2)':'var(--muted)')+'"></div>'+
        '</div>'+
        '<div class="agent-name" style="color:'+color+'">'+agent.name+'</div>'+
        '<div class="agent-role-text">'+agent.role.split('&')[0].trim()+'</div>'+
        '<div class="agent-task-icon">'+(task?task.substring(0,30)+(task.length>30?'...':''):'')+'</div>'+
        '<div class="agent-tooltip">'+tt+'</div>'+
      '</div>';
    }).join('');
  });
  const subRow=document.getElementById('office-subagents-row');
  const subPool=document.getElementById('subagents-pool');
  if(subRow&&subPool){
    const activeSubs=subagentData.filter(s=>s.status!=='completed');
    if(activeSubs.length>0){
      subRow.style.display='flex';
      subPool.innerHTML=activeSubs.map(s=>{
        const color=s.color||'#7b2fff';
        const icon=s.icon||'⚡';
        return '<div class="subagent-desk">'+
          '<div class="agent-avatar-icon" style="background:linear-gradient(135deg,'+color+'22,'+color+'11);border-color:'+color+'">'+icon+'</div>'+
          '<div class="agent-name">'+s.name+'</div>'+
          '<div class="subagent-task">'+(s.task||'Working...')+'</div>'+
        '</div>';
      }).join('');
    } else {
      subRow.style.display='none';
    }
  }
  const commsEl=document.getElementById('office-comms');
  if(commsEl&&window._officeComms){
    const allComms=window._officeComms.slice(0,15);
    const countEl=document.getElementById('comms-count');
    if(countEl) countEl.textContent=allComms.length+' messages';
    commsEl.innerHTML=allComms.length?allComms.map(c=>'<div class="comm-entry"><div><span class="comm-from">'+c.from_agent+'</span><span class="comm-arrow"> → </span><span class="comm-to">'+c.to_agent+'</span><div class="comm-msg">'+c.message+'</div></div><span class="comm-time">'+ft(c.timestamp)+'</span></div>').join(''):'<div class="empty">No communications yet</div>';
  }
  const gcEl=document.getElementById('office-groupchat');
  if(gcEl&&window._officeComms){
    const gcMsgs=window._officeComms.slice(0,20);
    gcEl.innerHTML=gcMsgs.length?gcMsgs.map(c=>{
      const avIcon=agentIcons[c.from_agent]||'🤖';
      const avColor=agentColors[c.from_agent]||'#00f0ff';
      return '<div class="group-chat-msg"><span class="gc-av" style="color:'+avColor+'">'+avIcon+'</span><div class="gc-content"><div class="gc-sender" style="color:'+avColor+'">'+c.from_agent+' <span style="color:var(--muted)">→</span> '+c.to_agent+'</div><div class="gc-msg">'+c.message+'</div><div class="gc-time">'+ft(c.timestamp)+'</div></div></div>';
    }).join(''):'<div class="empty">No group messages yet</div>';
  }
}

function showSubagent(name){
  const a=allAgents.find(x=>x.name===name);
  if(!a)return;
  const d=document.getElementById('office-subagent-detail');
  if(d){
    d.style.display='block';
    d.innerHTML='<div style="padding:12px"><div style="font-family:Orbitron;font-size:14px;color:var(--bright);margin-bottom:8px">'+a.avatar+' '+a.name+'</div><div style="font-size:10px;color:var(--muted)">'+a.role+'</div><div style="margin-top:8px;font-size:11px;color:var(--text)">Status: <span class="badge badge-'+a.status+'">'+a.status+'</span></div>'+(a.current_task?'<div style="margin-top:4px;font-size:11px">Working on: '+a.current_task+'</div>':'')+'</div>';
  }
}

function showTypingShimmer(){
  const el=document.getElementById('chat-msgs');
  if(!el)return;
  const d=document.createElement('div');
  d.id='typing-shimmer';
  d.className='chat-msg';
  d.innerHTML=`<div class="chat-av">🦑</div><div><div class="chat-sender">Jorm</div><div class="chat-bubble"><span class="ai-thinking">Thinking...</span></div></div>`;
  el.appendChild(d);
  el.scrollTop=el.scrollHeight;
}

function removeTypingShimmer(){
  const el=document.getElementById('typing-shimmer');
  if(el)el.remove();
}

function openCustomizeAgent(){
  openModal('customize-agent');
  renderCustomizeList();
}

function renderCustomizeList(){
  const el=document.getElementById('customize-agent-list');
  if(!el)return;
  el.innerHTML=allAgents.map(agent=>{
    const color=agentColors[agent.name]||'#00f0ff';
    const icon=agentIcons[agent.name]||'🤖';
    return '<div class="agent-customize-row" data-agent="'+agent.name+'">'+
      '<div class="ac-av" style="background:linear-gradient(135deg,'+color+'22,'+color+'11);border-color:'+color+'">'+icon+'</div>'+
      '<div class="ac-info"><div class="ac-name">'+agent.name+'</div><div class="ac-role">'+agent.role+'</div></div>'+
      '<div class="ac-actions">'+
        '<button class="btn btn-secondary btn-sm" onclick="editAgentName(\''+agent.name+'\')">✏ Name</button>'+
        '<button class="btn btn-secondary btn-sm" onclick="editAgentRole(\''+agent.name+'\')">✏ Role</button>'+
        '<button class="btn btn-secondary btn-sm" onclick="pickAgentColor(\''+agent.name+'\')">🎨 Color</button>'+
        '<button class="btn btn-secondary btn-sm" onclick="pickAgentIcon(\''+agent.name+'\')">🎨 Icon</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function editAgentName(name){
  const newName=prompt('Enter new name for '+name+':',name);
  if(!newName||newName===name)return;
  fetch(API+'/api/agents/'+encodeURIComponent(name),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newName})}).then(()=>{loadAll();notif('Agent renamed to '+newName,'success');});
}

function editAgentRole(name){
  const agent=allAgents.find(a=>a.name===name);
  if(!agent)return;
  const newRole=prompt('Enter new role for '+name+':',agent.role);
  if(!newRole||newRole===agent.role)return;
  fetch(API+'/api/agents/'+encodeURIComponent(name),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:newRole})}).then(()=>{loadAll();notif('Role updated','success');});
}

function pickAgentColor(name){
  const colors=window.allAgentColors;
  const currentColor=window.agentColors[name]||'#00f0ff';
  const picker=colors.map(c=>'<div class="color-swatch '+(c===currentColor?'selected':'')+'" style="background:'+c+'" onclick="setAgentColor(\''+name+'\',\''+c+'\')"></div>').join('');
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px';
  d.innerHTML='<div style="color:#fff;font-family:Orbitron;font-size:12px;margin-bottom:4px">Pick color for '+name+'</div><div class="color-picker-wrap" style="background:var(--card);padding:12px;border-radius:10px;display:flex;gap:6px;flex-wrap:wrap;max-width:200px">'+picker+'</div><button class="btn btn-secondary" onclick="this.parentElement.remove()">Close</button>';
  document.body.appendChild(d);
}

function setAgentColor(name,color){
  window.agentColors[name]=color;
  renderOffice();
  renderCustomizeList();
  document.querySelectorAll('.color-picker-wrap').forEach(el=>{const p=el.closest('div[style*=fixed]');if(p)p.remove();});
  notif('Color updated','success');
}

function pickAgentIcon(name){
  const icons=window.allAgentIcons;
  const picker=icons.map(i=>'<div class="icon-option" onclick="setAgentIcon(\''+name+'\',\''+i+'\')">'+i+'</div>').join('');
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px';
  d.innerHTML='<div style="color:#fff;font-family:Orbitron;font-size:12px;margin-bottom:4px">Pick icon for '+name+'</div><div class="icon-picker-wrap" style="background:var(--card);padding:12px;border-radius:10px;max-width:220px">'+picker+'</div><button class="btn btn-secondary" onclick="this.parentElement.remove()">Close</button>';
  document.body.appendChild(d);
}

function setAgentIcon(name,icon){
  window.agentIcons[name]=icon;
  renderOffice();
  renderCustomizeList();
  document.querySelectorAll('.icon-picker-wrap').forEach(el=>{const p=el.closest('div[style*=fixed]');if(p)p.remove();});
  notif('Icon updated','success');
}

// Welcome speech
setTimeout(()=>{const s=document.getElementById('jorm-speech');if(s){s.textContent='Hey Jeff! 👋';s.classList.add('show');setTimeout(()=>s.classList.remove('show'),4000);}},1500);

// === CHAT TEXT EFFECTS ===
function showToolUse(toolName, status){
  const el=document.getElementById('chat-msgs');
  const d=document.createElement('div');
  d.className='chat-msg';
  const cls=status==='complete'?'tool-complete':status==='error'?'tool-error':'tool-indicator';
  d.innerHTML=`<div class="chat-av" style="background:rgba(123,47,255,.15);border-color:rgba(123,47,255,.3)">🔧</div><div><div class="${cls}">${status==='complete'?'✓':status==='error'?'✕':'⚡'} ${toolName}</div><div class="chat-time">${ft(new Date().toISOString())}</div></div>`;
  el.appendChild(d);
  el.scrollTop=el.scrollHeight;
}

// === CLAW3D INTEGRATION ===
function reloadClaw3D(){
  const frame=document.getElementById('claw3d-frame');
  const ld=document.getElementById('claw3d-loading');
  if(ld)ld.style.display='flex';
  if(frame){
    const src=frame.src;
    frame.src='';
    setTimeout(()=>{frame.src=src;if(ld)setTimeout(()=>ld.style.display='none',2000);},100);
  }
}
window.reloadClaw3D=reloadClaw3D;

// Initialize on DOM ready
function onReady(){
  init();
  const frame=document.getElementById('claw3d-frame');
  const ld=document.getElementById('claw3d-loading');
  if(frame && ld){
    frame.addEventListener('load',()=>{setTimeout(()=>{ld.style.display='none';},500);});
    setTimeout(()=>{ld.style.display='none';},8000);
  }
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',onReady);}else{onReady();}

// === LIVE ACTIVITY TICKER ===
let tickerFilter = 'all';
let tickerItems = [];

function loadActivityTicker() {
  f(`${API}/api/activity?limit=50`).then(d => {
    tickerItems = d.activities || [];
    renderTicker();
    if (tickerItems.length === 0) {
      f(`${API}/api/logs?limit=20`).then(d2 => {
        const logs = d2.logs || [];
        tickerItems = logs.slice(0, 15).map(l => ({
          agent_name: l.agent_name, action: l.action, detail: l.detail || '', category: 'agent', timestamp: l.timestamp
        }));
        renderTicker();
      }).catch(() => {});
    }
  }).catch(() => {});
}

function renderTicker() {
  const el = document.getElementById('live-ticker-content');
  if (!el) return;
  let items = tickerFilter === 'all' ? tickerItems : tickerItems.filter(t => t.category === tickerFilter);
  if (!items.length) {
    el.innerHTML = '<span class="ticker-item"><span class="t-icon">⏳</span> Waiting for activity...</span>';
    return;
  }
  const catIcons = { agent: '🤖', task: '📋', system: '⚙️', project: '🏗️', subagent: '🔧', skill: '⚡' };
  const html = items.map(t => {
    const icon = catIcons[t.category] || '📡';
    const time = ft(t.timestamp);
    const detail = t.detail ? ` - ${t.detail.substring(0, 60)}` : '';
    return `<span class="ticker-item"><span class="t-icon">${icon}</span> <span class="t-agent">${t.agent_name}</span> <span class="t-action">${t.action}${detail}</span> <span class="t-time">${time}</span></span>`;
  }).join('');
  el.innerHTML = html + html + html;
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('ticker-filter-btn')) {
    document.querySelectorAll('.ticker-filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    tickerFilter = e.target.dataset.filter;
    renderTicker();
  }
});

// === TASKBOARD ===
let allTaskboardTasks = [];
let allPinnedTasks = [];

function loadTaskboard() {
  Promise.all([f(`${API}/api/tasks`), f(`${API}/api/pinned`)]).then(([td, pd]) => {
    allTaskboardTasks = td.tasks || [];
    allPinnedTasks = pd.pinned || [];
    renderTaskboard();
  }).catch(() => {});
}

function renderTaskboard() {
  const inProgress = allTaskboardTasks.filter(t => t.status === 'in-progress' || t.status === 'working');
  const completed = allTaskboardTasks.filter(t => t.status === 'completed').sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0)).slice(0, 20);
  const backlog = allTaskboardTasks.filter(t => t.status === 'pending' || t.status === 'queued');
  renderTaskboardCol('inprogress', inProgress);
  renderTaskboardCol('pinned', allPinnedTasks);
  renderTaskboardCol('completed', completed);
  renderTaskboardCol('backlog', backlog);
}

function renderTaskboardCol(colId, tasks) {
  const body = document.getElementById(`body-${colId}`);
  const count = document.getElementById(`count-${colId}`);
  if (!body) return;
  count.textContent = tasks.length;
  if (!tasks.length) {
    body.innerHTML = '<div class="empty" style="padding:12px;font-size:10px;color:var(--muted)">No tasks</div>';
    return;
  }
  body.innerHTML = tasks.map(t => {
    const isPinned = allPinnedTasks.some(p => p.task_id === t.id || p.id === t.id);
    const pinClass = isPinned ? 'pinned' : '';
    const statusClass = t.status === 'completed' ? 'completed' : (t.status === 'in-progress' || t.status === 'working') ? 'in-progress' : '';
    const resultHtml = t.status === 'completed' && t.result ? `<div class="taskboard-card-result">✅ ${t.result.substring(0, 120)}</div>` : '';
    const timeStr = t.completed_at ? `Done ${fd(t.completed_at)}` : `Created ${fd(t.created_at)}`;
    return `<div class="taskboard-card ${pinClass} ${statusClass}" onclick="showTask(${t.id})">
      <button class="taskboard-pin ${pinClass}" onclick="event.stopPropagation();togglePin(${t.id})">${isPinned ? '📌' : '📍'}</button>
      <div class="taskboard-card-title">#${t.id} ${t.title}</div>
      <div class="taskboard-card-meta">${t.assignee ? `<span>👤 ${t.assignee}</span>` : ''}<span class="badge badge-${t.status}">${t.status}</span><span>⚡ ${t.priority || 'medium'}</span><span>📍 ${t.stage || 'queued'}</span></div>
      <div class="taskboard-card-progress"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress || 0}%"></div></div><div class="prog-text">${t.progress || 0}%</div></div>
      ${resultHtml}
      <div style="font-family:'JetBrains Mono';font-size:8px;color:var(--muted);margin-top:4px">${timeStr}</div>
    </div>`;
  }).join('');
}

function togglePin(taskId) {
  const isPinned = allPinnedTasks.some(p => p.task_id === taskId);
  if (isPinned) {
    fetch(`${API}/api/pinned/${taskId}`, { method: 'DELETE' }).then(() => loadTaskboard());
  } else {
    const reason = prompt('Pin reason:') || 'Revisit later';
    fetch(`${API}/api/pinned`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ task_id: taskId, reason }) }).then(() => loadTaskboard());
  }
}

function filterTaskboard(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.taskboard-card').forEach(card => { card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

// === TASK HISTORY ===
function loadTaskHistory() {
  const filter = document.getElementById('history-filter')?.value || 'all';
  const sort = document.getElementById('history-sort')?.value || 'recent';
  let tasks = [...allTasks];
  if (filter !== 'all') tasks = tasks.filter(t => t.status === filter);
  if (sort === 'recent') tasks.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const statsEl = document.getElementById('history-stats');
  if (statsEl) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const totalXP = completed * 25;
    statsEl.innerHTML = `<div class="history-stats-item"><div class="history-stats-num">${total}</div><div class="history-stats-label">Total</div></div><div class="history-stats-item"><div class="history-stats-num" style="color:var(--green)">${completed}</div><div class="history-stats-label">Completed</div></div><div class="history-stats-item"><div class="history-stats-num" style="color:var(--yellow)">${totalXP}</div><div class="history-stats-label">Total XP</div></div>`;
  }
  const listEl = document.getElementById('history-list');
  if (listEl) {
    listEl.innerHTML = tasks.length ? tasks.map(t => {
      const xp = t.status === 'completed' ? 25 : Math.floor((t.progress || 0) / 4);
      return `<div class="history-card" onclick="showTask(${t.id})"><div class="history-card-header"><div class="history-card-title">#${t.id} ${t.title}</div><div class="history-card-xp">+${xp} XP</div></div><div class="history-card-meta"><span>👤 ${t.assignee || 'Unassigned'}</span><span class="badge badge-${t.status}">${t.status}</span><span>⚡ ${t.priority || 'medium'}</span><span>📅 ${fd(t.created_at)}</span></div>${t.result ? `<div class="history-card-result">${t.result.substring(0, 150)}</div>` : ''}</div>`;
    }).join('') : '<div class="empty"><div style="font-size:24px;margin-bottom:8px">📜</div>No task history yet</div>';
  }
}

// === PROJECTS ===
let currentProjectId = null;

function loadProjects() {
  f(`${API}/api/projects`).then(d => {
    const projects = d.projects || [];
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    document.getElementById('ps-total').textContent = projects.length;
    document.getElementById('ps-active').textContent = projects.filter(p => p.status === 'active').length;
    document.getElementById('ps-archived').textContent = projects.filter(p => p.status === 'archived').length;
    grid.innerHTML = projects.length ? projects.map(p => {
      const sb = p.status === 'active' ? 'badge-active' : p.status === 'archived' ? 'badge-idle' : 'badge-working';
      return `<div class="project-card" onclick="showProjectDetail(${p.id})"><div class="project-card-header"><div class="project-card-name">${p.name}</div><span class="badge ${sb}">${p.status}</span></div><div class="project-card-desc">${p.description.substring(0, 120)}${p.description.length > 120 ? '...' : ''}</div><div style="font-size:9px;color:var(--muted)">${p.category} • ${p.last_worked_at ? 'Last: ' + fd(p.last_worked_at) : 'Not yet worked on'}</div></div>`;
    }).join('') : '<div class="empty"><div style="font-size:24px;margin-bottom:8px">🏗️</div>No projects yet</div>';
  }).catch(() => {});
}

function showProjectDetail(id) {
  currentProjectId = id;
  f(`${API}/api/projects/${id}`).then(d => {
    const p = d.project || {};
    const h = d.history || [];
    document.getElementById('pd-title').textContent = `🏗️ ${p.name}`;
    document.getElementById('pd-content').innerHTML = `<div style="margin-bottom:12px"><span class="badge badge-${p.status === 'active' ? 'active' : 'idle'}">${p.status}</span> <span style="font-size:9px;color:var(--muted)">${p.category}</span></div><div style="font-size:11px;color:var(--text);margin-bottom:12px;line-height:1.6">${p.description}</div>${p.notes ? `<div style="font-size:10px;color:var(--muted);padding:8px;background:var(--bg);border-radius:6px;margin-bottom:12px;border:1px solid var(--border)">📝 ${p.notes}</div>` : ''}<div class="fl" style="margin-bottom:8px">📜 Change History</div><div class="project-timeline">${h.length ? h.map(x => `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-type">${x.change_type}</div><div class="timeline-desc">${x.description}</div><div class="timeline-time">${x.agent_name} • ${fd(x.timestamp)}</div></div></div>`).join('') : '<div class="empty">No history yet</div>'}</div>`;
    document.getElementById('project-detail').classList.add('open');
  }).catch(() => {});
}

function closeProjectDetail() { document.getElementById('project-detail').classList.remove('open'); currentProjectId = null; }

function submitProjectChange() {
  if (!currentProjectId) return;
  const desc = document.getElementById('pd-change-desc').value.trim();
  if (!desc) return;
  fetch(`${API}/api/projects/${currentProjectId}/history`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ change_type: document.getElementById('pd-change-type').value, description: desc, agent_name: 'Ghost' }) }).then(() => { document.getElementById('pd-change-desc').value = ''; showProjectDetail(currentProjectId); loadProjects(); notif('Change logged!', 'success'); }).catch(() => {});
}

// === SKILLS ===
let allSkills = []; let skillFilter = 'all';

function loadSkills() {
  f(`${API}/api/skills`).then(d => { allSkills = d.skills || []; renderSkills(); renderSkillCats(); document.getElementById('ss-total').textContent = allSkills.length; document.getElementById('ss-enabled').textContent = allSkills.filter(s => s.enabled).length; document.getElementById('ss-categories').textContent = [...new Set(allSkills.map(s => s.category))].length; }).catch(() => {});
}

function renderSkillCats() {
  const cats = [...new Set(allSkills.map(s => s.category))];
  const el = document.getElementById('skills-cats');
  if (el) el.innerHTML = `<button class="skill-cat-btn active" onclick="filterSkills('all',this)">All</button>` + cats.map(c => `<button class="skill-cat-btn" onclick="filterSkills('${c}',this)">${c}</button>`).join('');
}

function filterSkills(cat, btn) { skillFilter = cat; document.querySelectorAll('.skill-cat-btn').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active'); renderSkills(); }

function renderSkills() {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;
  let skills = skillFilter === 'all' ? allSkills : allSkills.filter(s => s.category === skillFilter);
  grid.innerHTML = skills.length ? skills.map(s => `<div class="skill-card ${s.enabled ? 'enabled' : ''}"><div class="skill-card-header"><div class="skill-card-icon">${s.icon || '🔧'}</div><div class="skill-card-name">${s.name}</div></div><div class="skill-card-desc">${s.description}</div><div class="skill-card-footer"><span class="skill-card-cat">${s.category}</span><button class="skill-toggle ${s.enabled ? 'enabled' : ''}" onclick="toggleSkill(${s.id})">${s.enabled ? '✓ Enabled' : 'Enable'}</button></div></div>`).join('') : '<div class="empty"><div style="font-size:24px;margin-bottom:8px">🔍</div>No skills found</div>';
}

function toggleSkill(id) {
  const skill = allSkills.find(s => s.id === id);
  if (!skill) return;
  fetch(`${API}/api/skills/${id}/${skill.enabled ? 'disable' : 'enable'}`, { method: 'POST' }).then(() => { loadSkills(); notif(`Skill "${skill.name}" ${skill.enabled ? 'disabled' : 'enabled'}!`, 'success'); }).catch(() => {});
}

function searchSkills(query) {
  if (!query) { renderSkills(); return; }
  const q = query.toLowerCase();
  const filtered = allSkills.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  const grid = document.getElementById('skills-grid');
  if (grid) grid.innerHTML = filtered.map(s => `<div class="skill-card ${s.enabled ? 'enabled' : ''}"><div class="skill-card-header"><div class="skill-card-icon">${s.icon || '🔧'}</div><div class="skill-card-name">${s.name}</div></div><div class="skill-card-desc">${s.description}</div><div class="skill-card-footer"><span class="skill-card-cat">${s.category}</span><button class="skill-toggle ${s.enabled ? 'enabled' : ''}" onclick="toggleSkill(${s.id})">${s.enabled ? '✓ Enabled' : 'Enable'}</button></div></div>`).join('');
}

function discoverSkills() {
  const query = prompt('Search ClawHub for skills:');
  if (!query) return;
  fetch(`${API}/api/skills/discover`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ query }) }).then(r => r.json()).then(d => {
    const results = d.results || [];
    if (!results.length) return notif('No skills found', 'info');
    const grid = document.getElementById('skills-grid');
    if (grid) grid.innerHTML = results.map(s => `<div class="skill-card"><div class="skill-card-header"><div class="skill-card-icon">${s.icon || '🔧'}</div><div class="skill-card-name">${s.name}</div></div><div class="skill-card-desc">${s.description}</div><div class="skill-card-footer"><span class="skill-card-cat">${s.category || 'clawhub'}</span><button class="skill-toggle" onclick="notif('Install: ${s.name}','info')">Install</button></div></div>`).join('');
    notif(`Found ${results.length} skills!`, 'success');
  }).catch(() => {});
}

// === SUB-AGENTS ===
function loadSubagents() {
  f(`${API}/api/subagents?limit=50`).then(d => {
    const activities = d.activities || [];
    const list = document.getElementById('subagent-list');
    if (!list) return;
    document.getElementById('sa-active').textContent = activities.filter(a => a.status === 'pending' || a.status === 'in-progress').length;
    document.getElementById('sa-completed').textContent = activities.filter(a => a.status === 'completed').length;
    document.getElementById('sa-optimizations').textContent = activities.filter(a => a.activity_type === 'optimization').length;
    list.innerHTML = activities.length ? activities.map(a => `<div class="subagent-activity-card"><div class="subagent-activity-header"><div class="subagent-activity-agent">${a.agent_name}</div><div style="display:flex;gap:4px;align-items:center"><span class="subagent-activity-type">${a.activity_type}</span><span class="badge badge-${a.status === 'completed' ? 'completed' : a.status === 'in-progress' ? 'in-progress' : 'pending'}">${a.status}</span></div></div><div class="subagent-activity-desc">${a.description}</div>${a.target ? `<div style="font-size:9px;color:var(--accent2);margin-top:2px">🎯 ${a.target}</div>` : ''}${a.result ? `<div class="subagent-activity-result">✅ ${a.result}</div>` : ''}<div class="subagent-activity-time">${fd(a.created_at)}</div></div>`).join('') : '<div class="empty"><div style="font-size:24px;margin-bottom:8px">🤖</div>No sub-agent activity yet. Real sub-agent work will appear here.</div>';
  }).catch(() => {});
}

function triggerOptimization() {
  notif('Connect real sub-agents to enable optimization tracking', 'info');
}

// Init ticker
loadActivityTicker();
setInterval(loadActivityTicker, 10000);

// === THEME TOGGLE ===
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('themeToggle');
  if (body.classList.contains('light')) {
    body.classList.remove('light');
    btn.textContent = '🌙';
    localStorage.setItem('theme', 'dark');
  } else {
    body.classList.add('light');
    btn.textContent = '☀️';
    localStorage.setItem('theme', 'light');
  }
}
// Load saved theme
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = '☀️';
}

// === NOTIFICATIONS ===
let notifPanelOpen = false;

function loadNotifications() {
  f(`${API}/api/notifications?limit=20`).then(d => {
    const notifs = d.notifications || [];
    const unread = notifs.filter(n => !n.read).length;
    const countEl = document.getElementById('notifCount');
    if (countEl) {
      countEl.textContent = unread;
      countEl.classList.toggle('show', unread > 0);
    }
    const list = document.getElementById('notifList');
    if (!list) return;
    if (!notifs.length) {
      list.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-icon">🔔</div><div class="empty-text">No notifications</div></div>';
      return;
    }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
        <div class="notif-item-title">${n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : 'i️'} ${n.title}</div>
        <div class="notif-item-msg">${n.message}</div>
        <div class="notif-item-time">${n.agent_name} • ${fd(n.created_at)}</div>
      </div>
    `).join('');
  }).catch(() => {});
}

function toggleNotifPanel() {
  notifPanelOpen = !notifPanelOpen;
  document.getElementById('notifPanel').classList.toggle('open', notifPanelOpen);
  if (notifPanelOpen) loadNotifications();
}

function markNotifRead(id) {
  fetch(`${API}/api/notifications/${id}/read`, { method: 'POST' }).then(() => loadNotifications()).catch(() => {});
}

function markAllRead() {
  fetch(`${API}/api/notifications/read-all`, { method: 'POST' }).then(() => loadNotifications()).catch(() => {});
}

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
  if (notifPanelOpen && !e.target.closest('.notif-bell') && !e.target.closest('.notif-panel')) {
    notifPanelOpen = false;
    document.getElementById('notifPanel').classList.remove('open');
  }
});

// === IMPROVED TICKER WITH SYSTEM STATUS FALLBACK ===

// === CLAWD3 CONNECTION STATUS ===
function checkClaw3DStatus() {
  const dot = document.getElementById('claw3dDot');
  const text = document.getElementById('claw3dStatusText');
  if (!dot || !text) return;

  fetch('http://localhost:3002/api/health', { mode: 'no-cors' })
    .then(() => {
      dot.style.background = 'var(--green)';
      dot.style.boxShadow = '0 0 6px var(--green)';
      text.textContent = 'Claw3D connected';
      text.style.color = 'var(--green)';
    })
    .catch(() => {
      dot.style.background = 'var(--red)';
      dot.style.boxShadow = '0 0 6px var(--red)';
      text.textContent = 'Claw3D offline - restart on port 3002';
      text.style.color = 'var(--red)';
    });
}

// === SIDEBAR MOBILE TOGGLE ===
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// === CONNECTION STATUS IN SIDEBAR ===
function updateConnectionStatus() {
  // Gateway
  const gw = document.getElementById('gwStatus');
  if (gw) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      gw.textContent = '● Connected';
      gw.className = 'sv';
    } else {
      gw.textContent = '● Disconnected';
      gw.className = 'sv e';
    }
  }

  // Claw3D
  const c3d = document.getElementById('c3dStatus');
  if (c3d) {
    fetch('http://localhost:3002/api/health', { mode: 'no-cors' })
      .then(() => { c3d.textContent = '● Online'; c3d.className = 'sv'; })
      .catch(() => { c3d.textContent = '● Offline'; c3d.className = 'sv e'; });
  }

  // Twitch
  const tw = document.getElementById('twStatus');
  if (tw) {
    f(`${API}/api/twitch/stream`).then(d => {
      tw.textContent = d.live ? '● Live' : '● Ready';
      tw.className = d.live ? 'sv w' : 'sv';
    }).catch(() => { tw.textContent = '● Error'; tw.className = 'sv e'; });
  }

  // Discord
  const dc = document.getElementById('dcStatus');
  if (dc) {
    f(`${API}/api/discord/status`).then(d => {
      dc.textContent = d.configured ? '● Configured' : '● Not set up';
      dc.className = d.configured ? 'sv' : 'sv w';
    }).catch(() => { dc.textContent = '● Error'; dc.className = 'sv e'; });
  }
}

// Run connection status checks
setInterval(updateConnectionStatus, 15000);
setTimeout(updateConnectionStatus, 2000);
setInterval(checkClaw3DStatus, 30000);
setTimeout(checkClaw3DStatus, 3000);

// Load notifications on init
setTimeout(() => {
  loadNotifications();
  setInterval(loadNotifications, 30000);
}, 2000);
