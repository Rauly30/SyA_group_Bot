/* ============================================================
   SyA Group Chile · sya.js
   - Navbar scroll
   - Mobile nav links
   - Chat widget con Django backend
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. NAVBAR SCROLL ─────────────────────────────── */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('solid');
    else navbar.classList.remove('solid');
  }, { passive: true });

  /* ── 2. MOBILE NAV (hide/show) ───────────────────── */
  const navDesktop = document.getElementById('nav-links-desktop');
  function handleResize() {
    if (navDesktop) navDesktop.style.display = window.innerWidth >= 768 ? 'flex' : 'none';
  }
  handleResize();
  window.addEventListener('resize', handleResize);

  /* ── 3. CHAT WIDGET ───────────────────────────────── */
  // URLs inyectadas desde el template Django (ver index.html)
  const sendUrl  = window.CHAT_SEND_URL  || '/chat/public/';
  const resetUrl = window.CHAT_RESET_URL || '/chat/reset/';

  /* helpers */
  function getCookie(name) {
    let val = null;
    document.cookie.split(';').forEach(c => {
      c = c.trim();
      if (c.startsWith(name + '=')) val = decodeURIComponent(c.slice(name.length + 1));
    });
    return val;
  }

  function timeLabel() {
    const now = new Date();
    return now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  }

  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g,  '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,      '<em>$1</em>')
      .replace(/^- (.+)$/gm,      '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs,'<ul style="margin:6px 0 6px 16px;padding:0;list-style:disc;">$1</ul>')
      .replace(/\n{2,}/g,         '<br><br>')
      .replace(/\n/g,             '<br>');
  }

  function botAvatar() {
    return `<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0a1628,#0e4d6e);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
              <i class="fas fa-water" style="color:#4ecdc4;font-size:.6rem;"></i>
            </div>`;
  }

  function appendMessage(text, fromUser) {
    const history  = document.getElementById('chat-history');
    const messages = document.getElementById('chat-messages');
    if (!history || !messages) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'msg-row';
    wrapper.style.cssText = 'display:flex;flex-direction:column;gap:3px;' +
      (fromUser ? 'align-items:flex-end;' : 'align-items:flex-start;');

    if (fromUser) {
      wrapper.innerHTML = `<div class="msg-user">${renderMarkdown(text)}</div>
                           <span class="msg-time">${timeLabel()}</span>`;
    } else {
      wrapper.innerHTML = `<div style="display:flex;align-items:flex-start;gap:7px;">
                             ${botAvatar()}
                             <div>
                               <div class="msg-bot">${renderMarkdown(text)}</div>
                               <span class="msg-time" style="padding-left:3px;">${timeLabel()}</span>
                             </div>
                           </div>`;
    }
    history.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const history  = document.getElementById('chat-history');
    const messages = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.id = 'typing-indicator';
    el.className = 'msg-row';
    el.style.cssText = 'display:flex;align-items:flex-start;gap:7px;';
    el.innerHTML = `${botAvatar()}
                    <div class="msg-bot" style="padding:10px 14px;display:flex;gap:4px;align-items:center;">
                      <span class="typing-dot"></span>
                      <span class="typing-dot"></span>
                      <span class="typing-dot"></span>
                    </div>`;
    history.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function showTransferCard() {
    const history  = document.getElementById('chat-history');
    const messages = document.getElementById('chat-messages');
    const card = document.createElement('div');
    card.className = 'msg-row';
    card.style.paddingLeft = '34px';
    card.innerHTML = `
      <div class="transfer-card">
        <div class="transfer-card-title">
          <i class="fas fa-circle-check" style="color:#0e4d6e;"></i>
          Consulta transferida exitosamente
        </div>
        <p style="font-size:.78rem;color:#374151;margin-bottom:12px;line-height:1.5;">
          Un asesor recibió tu información y se pondrá en contacto contigo pronto.
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="transfer-btn transfer-btn-primary" onclick="doResetChat()">
            <i class="fas fa-rotate-right"></i> Nueva consulta
          </button>
          <button class="transfer-btn transfer-btn-secondary" onclick="closeChatWindow()">
            <i class="fas fa-xmark"></i> Cerrar chat
          </button>
        </div>
      </div>`;
    history.appendChild(card);
    messages.scrollTop = messages.scrollHeight;
  }

  function buildQuickReplies() {
    const qrDiv = document.createElement('div');
    qrDiv.id = 'quick-replies';
    qrDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding-left:34px;';
    qrDiv.innerHTML = `
      <button class="qr-chip" onclick="quickReply('¿Qué servicios ofrecen?')"><i class="fas fa-water" style="font-size:.6rem;"></i>Servicios</button>
      <button class="qr-chip" onclick="quickReply('Necesito estudios marinos')"><i class="fas fa-microscope" style="font-size:.6rem;"></i>Est. Marinos</button>
      <button class="qr-chip" onclick="quickReply('¿Cuáles son sus precios?')"><i class="fas fa-tag" style="font-size:.6rem;"></i>Precios</button>
      <button class="qr-chip" onclick="quickReply('¿Cómo los contacto?')"><i class="fas fa-phone" style="font-size:.6rem;"></i>Contacto</button>`;
    return qrDiv;
  }

  /* ── SEND MESSAGE ──── */
  window.sendChatMessage = function(override) {
    const input   = document.getElementById('chat-input');
    const message = override || input.value.trim();
    if (!message) return;

    const qr = document.getElementById('quick-replies');
    if (qr) qr.remove();

    appendMessage(message, true);
    if (!override) { input.value = ''; input.focus(); }

    showTyping();

    fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-CSRFToken': getCookie('csrftoken'),
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({ message })
    })
    .then(r => r.json())
    .then(data => {
      hideTyping();
      if (!data.ok) {
        appendMessage(data.error || 'No se pudo obtener respuesta.', false);
        return;
      }
      const reply = data.reply || '';
      appendMessage(reply, false);

      const transferKeywords = ['conectarte con un asesor','asesor para finalizar','en breve te contactarán','transferido'];
      if (transferKeywords.some(kw => reply.toLowerCase().includes(kw))) {
        setTimeout(() => showTransferCard(), 800);
      }
    })
    .catch(() => {
      hideTyping();
      appendMessage('Error de conexión. Inténtalo de nuevo.', false);
    });
  };

  /* ── RESET CHAT ──── */
  window.doResetChat = async function() {
    await fetch(resetUrl, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCookie('csrftoken') }
    });

    const history = document.getElementById('chat-history');
    history.innerHTML = '';

    const welcomeMsg = window.CHAT_WELCOME || '¡Hola! ¿En qué puedo ayudarte hoy?';
    const welcomeRow = document.createElement('div');
    welcomeRow.className = 'msg-row';
    welcomeRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
    welcomeRow.innerHTML = `${botAvatar()}
      <div>
        <div class="msg-bot">${welcomeMsg}</div>
        <p class="msg-time" style="padding-left:3px;">Ahora mismo</p>
      </div>`;
    history.appendChild(welcomeRow);
    history.appendChild(buildQuickReplies());

    document.getElementById('chat-messages').scrollTop = 0;
  };

  /* ── CLOSE CHAT ──── */
  window.closeChatWindow = function() {
    document.getElementById('chat-window').classList.add('hidden');
    document.getElementById('chat-icon-open').style.display  = 'block';
    document.getElementById('chat-icon-close').style.display = 'none';
  };

  /* ── OPEN CHAT ──── */
  window.openChat = function() {
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('chat-cta').classList.add('hidden');
    document.getElementById('chat-icon-open').style.display  = 'none';
    document.getElementById('chat-icon-close').style.display = 'block';
    document.getElementById('chat-input').focus();
  };

  /* ── QUICK REPLY ──── */
  window.quickReply = text => window.sendChatMessage(text);

  /* ── BIND EVENTS ──── */
  const chatBtn   = document.getElementById('chat-button');
  const chatWin   = document.getElementById('chat-window');
  const closeBtn  = document.getElementById('close-chat');
  const resetBtn  = document.getElementById('reset-chat');
  const sendBtn   = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');

  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      chatWin.classList.contains('hidden') ? window.openChat() : window.closeChatWindow();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', window.closeChatWindow);
  if (resetBtn) resetBtn.addEventListener('click', window.doResetChat);
  if (sendBtn)  sendBtn.addEventListener('click', () => window.sendChatMessage());
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendChatMessage(); }
    });
  }

}); // END DOMContentLoaded