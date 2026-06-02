// Mobile menu injection script for NiceGuyAPI page
(function() {
  // Add responsive CSS
  const style = document.createElement('style');
  style.textContent = `
@media (max-width: 768px) {
  .nav-tabs-container { position: relative; }
  .mobile-menu-btn { 
    display: block !important; 
    background: none; 
    border: none; 
    font-size: 24px; 
    cursor: pointer; 
    padding: 8px 12px;
    color: var(--text, #fff);
  }
  .mobile-menu {
    display: none;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    z-index: 1000;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .mobile-menu.open {
    display: block;
    animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes slideDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .mobile-tab {
    display: block;
    width: 100%;
    text-align: left;
    padding: 16px 20px;
    margin: 6px 0;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    color: var(--text, #ffffff);
  }
  .mobile-tab:hover {
    background: rgba(100, 140, 255, 0.15);
    transform: translateX(8px);
    border-color: var(--accent, #6485ff);
    box-shadow: 0 4px 12px rgba(100, 140, 255, 0.2);
  }
  .mobile-tab:active {
    transform: translateX(4px) scale(0.98);
  }
  /* Smooth tab content transitions */
  .tab-content {
    transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .tab-content:not(.active) {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
    pointer-events: none;
  }
}
.mobile-menu-btn { display: none; }
`;
  document.head.appendChild(style);
  
  // Find nav container
  const nav = document.querySelector('nav');
  const navTabsContainer = nav ? nav.querySelector('div') : document.querySelector('.nav-tabs-container');
  
  // Create mobile menu button
  const mobileBtn = document.createElement('button');
  mobileBtn.className = 'mobile-menu-btn';
  mobileBtn.innerHTML = '☰';
  mobileBtn.setAttribute('aria-label', 'Open navigation menu');
  
  // Create mobile menu panel
  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'mobile-menu';
  
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab, i) => {
    const mobileTab = document.createElement('div');
    mobileTab.className = 'mobile-tab';
    mobileTab.textContent = tab.textContent;
    mobileTab.dataset.target = tab.id.replace('tab-', '');
    mobileTab.onclick = function() {
      const tabName = this.dataset.target;
      showTab(tabName);
      mobileMenu.classList.remove('open');
      setTimeout(() => mobileMenu.style.display = 'none', 300);
    };
    mobileMenu.appendChild(mobileTab);
  });
  
  mobileBtn.onclick = function() {
    if (mobileMenu.classList.contains('open')) {
      mobileMenu.classList.remove('open');
      setTimeout(() => mobileMenu.style.display = 'none', 300);
    } else {
      mobileMenu.style.display = 'block';
      setTimeout(() => mobileMenu.classList.add('open'), 10);
    }
  };
  
  // Insert into page
  if (navTabsContainer && navTabsContainer.parentNode) {
    navTabsContainer.parentNode.insertBefore(mobileBtn, navTabsContainer);
  } else {
    document.body.insertBefore(mobileBtn, document.body.firstChild);
  }
  document.body.appendChild(mobileMenu);
  
  console.log('Mobile menu injected - tabs:', tabs.length);
})();