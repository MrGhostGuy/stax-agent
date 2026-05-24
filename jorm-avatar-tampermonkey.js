// ==UserScript==
// @name         Jorm Avatar for OpenClaw Control UI
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add Jorm the AI familiar avatar to OpenClaw Control UI
// @author       Jorm
// @match        http://127.0.0.1:18789/*
// @match        http://localhost:18789/*
// @match        https://*.ts.net/*
// @match        http://*.local:18789/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Wait for the app to load
    const init = () => {
        if (document.querySelector('openclaw-app')) {
            addJormAvatar();
        } else {
            setTimeout(init, 500);
        }
    };
    
    function addJormAvatar() {
        if (document.getElementById('jorm-avatar')) return;
        
        const avatar = document.createElement('div');
        avatar.id = 'jorm-avatar';
        avatar.textContent = '🦑';
        avatar.title = 'Jorm - your AI familiar';
        avatar.style.cssText = `
            position: fixed;
            top: 8px;
            right: 120px;
            z-index: 9999;
            font-size: 24px;
            cursor: pointer;
            transition: transform 0.3s ease;
            animation: jorm-pulse 2s infinite;
            pointer-events: auto;
        `;
        
        // Style with animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes jorm-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            @keyframes jorm-think {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-10deg); }
                75% { transform: rotate(10deg); }
            }
            #jorm-avatar.thinking {
                animation: jorm-think 1s infinite;
                filter: drop-shadow(0 0 8px #0ff);
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(avatar);
        
        // Global API
        window.JormAvatar = {
            setState: (state) => {
                if (state === 'thinking' || state === 'working') {
                    avatar.classList.add('thinking');
                } else {
                    avatar.classList.remove('thinking');
                }
            },
            setIdle: () => avatar.classList.remove('thinking'),
            setThinking: () => avatar.classList.add('thinking'),
            destroy: () => avatar.remove()
        };
    }
    
    // Hook into fetch to auto-show thinking state
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        if (window.JormAvatar) window.JormAvatar.setThinking();
        return originalFetch.apply(this, args).finally(() => {
            if (window.JormAvatar) window.JormAvatar.setIdle();
        });
    };
    
    init();
})();