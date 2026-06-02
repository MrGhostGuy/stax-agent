#!/usr/bin/env node
/**
 * NiceGuyAPI Mobile Menu + Tab Transitions Deploy Script
 * Uses `gh` CLI for GitHub auth
 */

const { execSync } = require('child_process');
const fs = require('fs');

const MOBILE_CSS = `
<style>
/* MOBILE MENU + PREMIUM TRANSITIONS */
@media (max-width: 768px) {
  .hamburger-btn {
    display: flex !important; flex-direction: column; justify-content: center;
    align-items: center; gap: 5px; width: 44px; height: 44px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; cursor: pointer; padding: 10px; z-index: 1001;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  }
  .hamburger-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
  .hamburger-btn .bar {
    display: block; width: 22px; height: 2px; background: var(--text, #fff);
    border-radius: 2px;
    transition: all 0.35s cubic-bezier(0.68,-0.55,0.265,1.55);
  }
  .hamburger-btn.active .bar:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .hamburger-btn.active .bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
  .hamburger-btn.active .bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  .hamburger-btn.active { background: rgba(100,140,255,0.15); border-color: var(--accent,#6485ff); }
  .mobile-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
    z-index: 999; opacity: 0; transition: opacity 0.35s ease;
  }
  .mobile-overlay.open { display: block; opacity: 1; }
  .mobile-nav-panel {
    position: fixed; top: 0; right: -300px; width: 280px; height: 100vh;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    z-index: 1000; padding: 70px 0 30px;
    box-shadow: -10px 0 40px rgba(0,0,0,0.5);
    transition: right 0.4s cubic-bezier(0.22,1,0.36,1);
    overflow-y: auto;
  }
  .mobile-nav-panel.open { right: 0; }
  .mobile-nav-header {
    padding: 0 24px 16px;
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: rgba(255,255,255,0.3);
    border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 12px;
  }
  .mobile-tab-btn {
    display: flex; align-items: center; gap: 14px;
    width: calc(100% - 32px); margin: 4px 16px; padding: 14px 18px;
    background: transparent; border: 1px solid transparent; border-radius: 12px;
    font-family: 'Segoe UI', system-ui, sans-serif; font-size: 16px; font-weight: 600;
    color: rgba(255,255,255,0.7); cursor: pointer; text-align: left;
    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    opacity: 0; transform: translateX(30px);
  }
  .mobile-nav-panel.open .mobile-tab-btn { opacity: 1; transform: translateX(0); }
  .mobile-tab-btn:nth-child(2) { transition-delay: 0.05s; }
  .mobile-tab-btn:nth-child(3) { transition-delay: 0.10s; }
  .mobile-tab-btn:nth-child(4) { transition-delay: 0.15s; }
  .mobile-tab-btn:nth-child(5) { transition-delay: 0.20s; }
  .mobile-tab-btn:nth-child(6) { transition-delay: 0.25s; }
  .mobile-tab-btn:hover, .mobile-tab-btn.active {
    background: rgba(100,140,255,0.1); border-color: rgba(100,140,255,0.25);
    color: #fff; transform: translateX(6px);
  }
  .mobile-tab-icon { font-size: 20px; width: 28px; text-align: center; }
  .mobile-close-btn {
    position: absolute; top: 16px; right: 16px; width: 38px; height: 38px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 50%; font-size: 20px; color: rgba(255,255,255,0.5);
    cursor: pointer; transition: all 0.25s ease;
  }
  .mobile-close-btn:hover {
    background: rgba(255,80,80,0.15); border-color: rgba(255,80,80,0.3);
    color: #fff; transform: rotate(90deg);
  }
  .nav-tabs-container { display: none !important; }
  /* Premium tab transitions */
  .tab-content {
    transition: opacity 0.45s cubic-bezier(0.22,1,0.36,1),
                transform 0.45s cubic-bezier(0.22,1,0.36,1),
                filter 0.35s ease;
  }
  .tab-content:not(.active) {
    opacity: 0; pointer-events: none;
    transform: perspective(800px) rotateX(8deg) translateY(20px) scale(0.97);
    filter: blur(4px);
  }
  .tab-content.active {
    opacity: 1;
    transform: perspective(800px) rotateX(0) translateY(0) scale(1);
    filter: blur(0);
  }
  .tab-content.active > * {
    animation: ngFadeIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .tab-content.active > *:nth-child(1) { animation-delay: 0.05s; }
  .tab-content.active > *:nth-child(2) { animation-delay: 0.10s; }
  .tab-content.active > *:nth-child(3) { animation-delay: 0.15s; }
  .tab-content.active > *:nth-child(4) { animation-delay: 0.20s; }
  .tab-content.active > *:nth-child(5) { animation-delay: 0.25s; }
  .tab-content.active > *:nth-child(6) { animation-delay: 0.30s; }
}
@media (min-width: 769px) {
  .hamburger-btn, .mobile-overlay, .mobile-nav-panel { display: none !important; }
  .tab-content {
    transition: opacity 0.45s cubic-bezier(0.22,1,0.36,1),
                transform 0.45s cubic-bezier(0.22,1,0.36,1),
                filter 0.35s ease;
    position: relative;
  }
  .tab-content:not(.active) {
    opacity: 0; pointer-events: none;
    transform: perspective(800px) rotateX(8deg) translateY(20px) scale(0.97);
    filter: blur(4px);
  }
  .tab-content.active {
    opacity: 1;
    transform: perspective(800px) rotateX(0) translateY(0) scale(1);
    filter: blur(0);
  }
  .tab-content.active > * {
    animation: ngFadeIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .tab-content.active > *:nth-child(1) { animation-delay: 0.05s; }
  .tab-content.active > *:nth-child(2) { animation-delay: 0.10s; }
  .tab-content.active > *:nth-child(3) { animation-delay: 0.15s; }
  .tab-content.active > *:nth-child(4) { animation-delay: 0.20s; }
  .tab-content.active > *:nth-child(5) { animation-delay: 0.25s; }
  .tab-content.active > *:nth-child(6) { animation-delay: 0.30s; }
}
@keyframes ngFadeIn {
  from { opacity: 0; transform: translateY(18px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>`;

const MOBILE_HTML = `
<!-- Mobile Menu -->
<button class="hamburger-btn" id="hamburgerBtn" aria-label="Open menu">
  <span class="bar"></span><span class="bar"></span><span class="bar"></span>
</button>
<div class="mobile-overlay" id="mobileOverlay"></div>
<div class="mobile-nav-panel" id="mobileNavPanel">
  <button class="mobile-close-btn" id="mobileCloseBtn" aria-label="Close menu">&#10005;</button>
  <div class="mobile-nav-header">Navigation</div>
  <button class="mobile-tab-btn" data-tab="home" onclick="ngMobileSwitch('home')"><span class="mobile-tab-icon">&#127968;</span> Home</button>
  <button class="mobile-tab-btn" data-tab="chat" onclick="ngMobileSwitch('chat')"><span class="mobile-tab-icon">&#128172;</span> Try Chat</button>
  <button class="mobile-tab-btn" data-tab="guide" onclick="ngMobileSwitch('guide')"><span class="mobile-tab-icon">&#128214;</span> How-To</button>
  <button class="mobile-tab-btn" data-tab="dash" onclick="ngMobileSwitch('dash')"><span class="mobile-tab-icon">&#128202;</span> Dashboard</button>
  <button class="mobile-tab-btn" data-tab="faq" onclick="ngMobileSwitch('faq')"><span class="mobile-tab-icon">&#10067;</span> FAQ</button>
</div>`;

const MOBILE_JS = `
<script>
(function(){
  var hb=document.getElementById('hamburgerBtn'),pn=document.getElementById('mobileNavPanel'),
      ov=document.getElementById('mobileOverlay'),cl=document.getElementById('mobileCloseBtn');
  function openM(){hb.classList.add('active');pn.classList.add('open');ov.classList.add('open');document.body.style.overflow='hidden';syncActive();}
  function closeM(){hb.classList.remove('active');pn.classList.remove('open');ov.classList.remove('open');document.body.style.overflow='';}
  function syncActive(){var a=document.querySelector('.nav-tab.active');var n=a?a.id.replace('tab-',''):'home';
    document.querySelectorAll('.mobile-tab-btn').forEach(function(b){b.classList.toggle('active',b.dataset.tab===n);});}
  hb.addEventListener('click',function(){pn.classList.contains('open')?closeM():openM();});
  cl.addEventListener('click',closeM);ov.addEventListener('click',closeM);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&pn.classList.contains('open'))closeM();});
  window.ngMobileSwitch=function(n){closeM();setTimeout(function(){showTab(n);},200);syncActive();};
  var orig=window.showTab;window.showTab=function(n){var r=orig(n);syncActive();return r;};
})();
</script>`;

function main() {
  console.log('[1/4] Fetching via gh...');
  const raw = execSync('gh api repos/MrGhostGuy/niceguyapi/contents/index.html --jq ".content"', { encoding: 'utf8' }).trim();
  const html = Buffer.from(raw, 'base64').toString('utf8');
  console.log('  Got:', html.length, 'chars');

  console.log('[2/4] Applying changes...');
  let modified = html;
  let changes = 0;

  if (!modified.includes('ngFadeIn')) {
    modified = modified.replace('</head>', MOBILE_CSS + '\n</head>');
    changes++; console.log('  + CSS');
  }
  if (!modified.includes('hamburger-btn')) {
    modified = modified.replace(/<body([^>]*)>/i, '<body$1>\n' + MOBILE_HTML);
    changes++; console.log('  + HTML');
  }
  if (!modified.includes('ngMobileSwitch')) {
    modified = modified.replace('</body>', MOBILE_JS + '\n</body>');
    changes++; console.log('  + JS');
  }

  // Fix default tab
  if (modified.includes('class="nav-tab active" id="tab-dash"')) {
    modified = modified.replace('class="nav-tab active" id="tab-dash"', 'class="nav-tab" id="tab-dash"');
    changes++; console.log('  + Fixed: removed active from dash');
  }
  if (modified.includes('class="nav-tab" id="tab-home"') && !modified.includes('class="nav-tab active" id="tab-home"')) {
    modified = modified.replace('class="nav-tab" id="tab-home"', 'class="nav-tab active" id="tab-home"');
    changes++; console.log('  + Fixed: added active to home');
  }

  if (modified.includes('class="tab-content active" id="content-dash"')) {
    modified = modified.replace('class="tab-content active" id="content-dash"', 'class="tab-content" id="content-dash"');
    changes++;
  }
  if (modified.includes('<div class="tab-content" id="content-home">')) {
    modified = modified.replace('<div class="tab-content" id="content-home">', '<div class="tab-content active" id="content-home">');
    changes++; console.log('  + Fixed: home tab content active');
  }

  if (changes === 0) {
    console.log('Nothing to change.');
    return;
  }

  console.log('[3/4] Writing to workspace...');
  fs.writeFileSync(__dirname + '/index.html', modified);
  console.log('  Saved: index.html');

  console.log('[4/4] Pushing to GitHub...');
  const sha = execSync('gh api repos/MrGhostGuy/niceguyapi/contents/index.html --jq ".sha"', { encoding: 'utf8' }).trim();
  execSync(`gh api --method PUT repos/MrGhostGuy/niceguyapi/contents/index.html -f message="feat: mobile hamburger menu + premium tab transitions" -f content="$(node -e "console.log(require('fs').readFileSync('${__dirname}/index.html').toString('base64'))") -f sha="${sha}" -F`, { stdio: 'inherit' });
  console.log('✅ DEPLOYED!');
  console.log('Live at: https://mrghostguy.github.io/niceguyapi/');
}

main();