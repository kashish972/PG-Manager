/**
 * PG Manager AI Widget - Embeddable Chat Script
 * 
 * Usage:
 *   <script
 *     src="https://your-domain.com/pg-ai-widget.js"
 *     data-tenant-id="YOUR_TENANT_ID"
 *     data-position="bottom-right"
 *     data-primary-color="#2563eb"
 *   ></script>
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var tenantId = script.getAttribute('data-tenant-id');
  var position = script.getAttribute('data-position') || 'bottom-right';

  // Derive API base from the script's own src, so API calls go to YOUR backend
  // regardless of which external website embeds this widget.
  var scriptSrc = script.getAttribute('src') || '';
  var scriptOrigin = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
  var apiBase = script.getAttribute('data-api-base') || scriptOrigin || window.location.origin;

  if (!tenantId) {
    console.error('[PG AI Widget] data-tenant-id is required');
    return;
  }

  // Prevent duplicate
  if (window.__PG_AI_WIDGET_LOADED) return;
  window.__PG_AI_WIDGET_LOADED = true;

  var WIDGET_STYLES = {
    container: [
      'position: fixed',
      position === 'bottom-left' ? 'left: 24px' : 'right: 24px',
      'bottom: 24px',
      'z-index: 2147483647',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ].join(';'),
    shadow: 'all: initial; display: block;',
  };

  // Load branding from backend
  function loadBranding() {
    var url = apiBase + '/api/ai/settings?tenantId=' + encodeURIComponent(tenantId);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .catch(function () {
        return {
          isEnabled: true,
          branding: {
            name: 'AI Assistant',
            welcomeMessage: 'Hi! How can I help you today?',
            primaryColor: '#2563eb',
            secondaryColor: '#1d4ed8',
            bubbleColor: '#e2e8f0',
            tone: 'professional',
          },
        };
      });
  }

  function getStyles(colors) {
    return [
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      '',
      '.pg-ai-btn {',
      '  width: 56px; height: 56px; border-radius: 50%;',
      '  background: ' + colors.primary + ';',
      '  color: white; border: none; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center;',
      '  box-shadow: 0 4px 16px rgba(0,0,0,0.25);',
      '  transition: all 0.3s ease;',
      '  position: relative;',
      '}',
      '.pg-ai-btn:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.3); }',
      '.pg-ai-btn svg { width: 24px; height: 24px; }',
      '',
      '.pg-ai-panel {',
      '  position: fixed;',
      '  ' + (position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'),
      '  bottom: 92px;',
      '  width: 380px; max-width: calc(100vw - 32px);',
      '  height: 560px; max-height: calc(100vh - 120px);',
      '  background: #ffffff; border-radius: 16px;',
      '  box-shadow: 0 8px 32px rgba(0,0,0,0.18);',
      '  display: none; flex-direction: column; overflow: hidden;',
      '  animation: pgAiSlideUp 0.3s ease;',
      '  border: 1px solid #e2e8f0;',
      '}',
      '.pg-ai-panel.open { display: flex; }',
      '.pg-ai-panel.fullscreen {',
      '  bottom: 0 !important; right: 0 !important; left: 0 !important; top: 0 !important;',
      '  width: 100vw !important; max-width: 100vw !important;',
      '  height: 100vh !important; max-height: 100vh !important;',
      '  border-radius: 0 !important;',
      '}',
      '',
      '@keyframes pgAiSlideUp {',
      '  from { opacity: 0; transform: translateY(20px); }',
      '  to { opacity: 1; transform: translateY(0); }',
      '}',
      '',
      '.pg-ai-header {',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  padding: 16px 20px; background: ' + colors.primary + '; color: white; flex-shrink: 0;',
      '}',
      '.pg-ai-header-left { display: flex; align-items: center; gap: 12px; }',
      '.pg-ai-avatar {',
      '  width: 36px; height: 36px; border-radius: 50%;',
      '  background: rgba(255,255,255,0.2);',
      '  display: flex; align-items: center; justify-content: center;',
      '  font-size: 16px; font-weight: 700;',
      '}',
      '.pg-ai-header-title { font-size: 14px; font-weight: 600; }',
      '.pg-ai-header-status { font-size: 11px; opacity: 0.8; }',
      '.pg-ai-header-actions { display: flex; gap: 4px; }',
      '.pg-ai-header-btn {',
      '  width: 32px; height: 32px; border-radius: 8px;',
      '  background: rgba(255,255,255,0.15); color: white; border: none; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center;',
      '  transition: background 0.2s;',
      '}',
      '.pg-ai-header-btn:hover { background: rgba(255,255,255,0.25); }',
      '.pg-ai-header-btn svg { width: 18px; height: 18px; }',
      '',
      '.pg-ai-messages {',
      '  flex: 1; overflow-y: auto; padding: 16px;',
      '  display: flex; flex-direction: column; gap: 12px;',
      '  background: #f8fafc;',
      '}',
      '.pg-ai-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-wrap: break-word; animation: pgAiMsgIn 0.3s ease; }',
      '@keyframes pgAiMsgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
      '.pg-ai-msg.user { align-self: flex-end; background: ' + colors.primary + '; color: white; border-bottom-right-radius: 4px; }',
      '.pg-ai-msg.bot { align-self: flex-start; background: ' + colors.bubble + '; color: #0f172a; border-bottom-left-radius: 4px; }',
      '',
      '.pg-ai-typing { display: flex; align-items: center; gap: 4px; padding: 12px 16px; }',
      '.pg-ai-typing-dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; animation: pgAiTyping 1.2s infinite; }',
      '.pg-ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }',
      '.pg-ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }',
      '@keyframes pgAiTyping { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }',
      '',
      '.pg-ai-input-area {',
      '  display: flex; align-items: flex-end; gap: 8px;',
      '  padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #ffffff;',
      '}',
      '.pg-ai-input {',
      '  flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 12px;',
      '  font-size: 14px; outline: none; background: #f8fafc; color: #0f172a;',
      '  resize: none; min-height: 40px; max-height: 120px; font-family: inherit;',
      '}',
      '.pg-ai-input:focus { border-color: ' + colors.primary + '; }',
      '.pg-ai-send {',
      '  width: 40px; height: 40px; border-radius: 12px;',
      '  background: ' + colors.primary + '; color: white; border: none; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center; flex-shrink: 0;',
      '  transition: all 0.2s;',
      '}',
      '.pg-ai-send:hover:not(:disabled) { opacity: 0.9; }',
      '.pg-ai-send:disabled { opacity: 0.5; cursor: not-allowed; }',
      '.pg-ai-send svg { width: 18px; height: 18px; }',
      '',
      '@media (max-width: 480px) {',
      '  .pg-ai-btn { bottom: 16px; width: 52px; height: 52px; }',
      '  .pg-ai-panel { bottom: 0; left: 0; right: 0; top: 0; width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-radius: 0; }',
      '}',
    ].join('\n');
  }

  function sendMessage(shadow, wrapper, messages, inputEl, sendBtn, branding, colors) {
    var text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    sendBtn.disabled = true;

    // Add user message
    var userMsg = document.createElement('div');
    userMsg.className = 'pg-ai-msg user';
    userMsg.textContent = text;
    messages.appendChild(userMsg);
    messages.scrollTop = messages.scrollHeight;

    // Show typing
    var typing = document.createElement('div');
    typing.className = 'pg-ai-msg bot pg-ai-typing';
    typing.innerHTML = '<span class="pg-ai-typing-dot"></span><span class="pg-ai-typing-dot"></span><span class="pg-ai-typing-dot"></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    var url = apiBase + '/api/ai/chat';

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, tenantId: tenantId }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        typing.remove();
        var botMsg = document.createElement('div');
        botMsg.className = 'pg-ai-msg bot';
        botMsg.textContent = data.reply || data.error || 'Sorry, no response received.';
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
      })
      .catch(function () {
        typing.remove();
        var errMsg = document.createElement('div');
        errMsg.className = 'pg-ai-msg bot';
        errMsg.textContent = 'Sorry, something went wrong. Please try again.';
        messages.appendChild(errMsg);
        messages.scrollTop = messages.scrollHeight;
      })
      .finally(function () {
        sendBtn.disabled = false;
        inputEl.focus();
      });
  }

  function renderWidget(shadow, wrapper, branding, colors) {
    var isOpen = false;
    var isMinimized = false;
    var isFullscreen = false;

    // Create button
    var btn = document.createElement('button');
    btn.className = 'pg-ai-btn';
    btn.setAttribute('aria-label', 'Open AI chat');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-5.5 4 2-7L3 9h7z"/></svg>';
    shadow.appendChild(btn);

    // Create panel
    var panel = document.createElement('div');
    panel.className = 'pg-ai-panel';
    shadow.appendChild(panel);

    // Header
    var header = document.createElement('div');
    header.className = 'pg-ai-header';
    header.innerHTML = [
      '<div class="pg-ai-header-left">',
      '  <div class="pg-ai-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-5.5 4 2-7L3 9h7z"/></svg></div>',
      '  <div>',
      '    <div class="pg-ai-header-title">' + (branding?.branding?.name || 'AI Assistant') + '</div>',
      '    <div class="pg-ai-header-status">Online</div>',
      '  </div>',
      '</div>',
      '<div class="pg-ai-header-actions">',
      '  <button class="pg-ai-header-btn" id="pg-ai-maximize" aria-label="Fullscreen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>',
      '  <button class="pg-ai-header-btn" id="pg-ai-minimize" aria-label="Minimize"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>',
      '  <button class="pg-ai-header-btn" id="pg-ai-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>',
      '</div>',
    ].join('');
    panel.appendChild(header);

    // Messages area
    var messages = document.createElement('div');
    messages.className = 'pg-ai-messages';
    panel.appendChild(messages);

    // Welcome message
    if (branding?.branding?.welcomeMessage) {
      var welcomeMsg = document.createElement('div');
      welcomeMsg.className = 'pg-ai-msg bot';
      welcomeMsg.textContent = branding.branding.welcomeMessage;
      messages.appendChild(welcomeMsg);
    }

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'pg-ai-input-area';
    inputArea.innerHTML = [
      '<textarea class="pg-ai-input" placeholder="Type your message..." rows="1"></textarea>',
      '<button class="pg-ai-send" aria-label="Send message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>',
    ].join('');
    panel.appendChild(inputArea);

    var inputEl = inputArea.querySelector('.pg-ai-input');
    var sendBtn = inputArea.querySelector('.pg-ai-send');

    // Toggle open
    btn.addEventListener('click', function () {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      btn.style.display = isOpen ? 'none' : 'flex';
      if (isOpen) {
        messages.scrollTop = messages.scrollHeight;
        setTimeout(function () { inputEl.focus(); }, 300);
      }
    });

    // Close
    var closeBtn = shadow.getElementById('pg-ai-close');
    closeBtn.addEventListener('click', function () {
      isOpen = false;
      panel.classList.remove('open');
      btn.style.display = 'flex';
    });

    // Minimize
    var minimizeBtn = shadow.getElementById('pg-ai-minimize');
    minimizeBtn.addEventListener('click', function () {
      isMinimized = !isMinimized;
      if (isMinimized) {
        panel.style.display = 'none';
        btn.style.display = 'flex';
      } else {
        panel.style.display = 'flex';
        btn.style.display = 'none';
      }
    });

    // Fullscreen toggle
    var maximizeBtn = shadow.getElementById('pg-ai-maximize');
    maximizeBtn.addEventListener('click', function () {
      isFullscreen = !isFullscreen;
      panel.classList.toggle('fullscreen', isFullscreen);
    });

    // Send
    function handleSend() {
      sendMessage(shadow, wrapper, messages, inputEl, sendBtn, branding, colors);
    }

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Auto-resize input
    inputEl.addEventListener('input', function () {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });
  }

  // Initialize after DOM ready
  function init() {
    loadBranding().then(function (branding) {
      if (branding && branding.isEnabled === false) return;
      var container = createContainer(branding);
      document.body.appendChild(container);
    });
  }

  // Reuse the createContainer from above
  function createContainer(branding) {
    var container = document.createElement('div');
    container.id = 'pg-ai-widget-container';
    container.setAttribute('style', WIDGET_STYLES.container);
    var shadow = container.attachShadow({ mode: 'open' });
    var wrapper = document.createElement('div');
    wrapper.setAttribute('style', WIDGET_STYLES.shadow);
    shadow.appendChild(wrapper);
    var colors = {
      primary: branding?.branding?.primaryColor || '#2563eb',
      bubble: branding?.branding?.bubbleColor || '#e2e8f0',
      name: branding?.branding?.name || 'AI Assistant',
    };
    var style = document.createElement('style');
    style.textContent = getStyles(colors);
    shadow.appendChild(style);
    renderWidget(shadow, wrapper, branding, colors);
    return container;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
