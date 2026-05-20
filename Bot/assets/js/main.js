/* ============================================================
   SyA Group Chile · main.js — 2026
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ═══════════════════════════════════════════════════
     1. NAVBAR
     ═══════════════════════════════════════════════════ */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => navbar.classList.toggle('solid', window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const navToggle      = document.getElementById('nav-toggle');
  const navMobilePanel = document.getElementById('navMobilePanel');

  function closeMobileNav() {
    if (!navMobilePanel || !navToggle) return;
    navMobilePanel.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.classList.remove('is-open');
  }

  if (navToggle && navMobilePanel) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMobilePanel.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.classList.toggle('is-open', isOpen);
    });
    navMobilePanel.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));
    document.addEventListener('click', e => {
      if (!navToggle.contains(e.target) && !navMobilePanel.contains(e.target)) closeMobileNav();
    });
  }

  /* ═══════════════════════════════════════════════════
     2. HERO CAROUSEL
     ═══════════════════════════════════════════════════ */
  const track = document.getElementById('cTrack');
  const cBar  = document.getElementById('cBar');

  if (track) {
    const slides   = Array.from(track.querySelectorAll('.c-slide'));
    const N        = slides.length;
    const DELAY    = 6200;
    let cur = 0, timer = null, rafId = null, rafStart = null;
    const barItems = cBar ? Array.from(cBar.querySelectorAll('.c-bar-item')) : [];

    barItems.forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        if (!isNaN(idx)) goTo(idx);
      });
    });

    function resetAllProgBars() {
      barItems.forEach(item => {
        const pb = item.querySelector('.c-bar-prog');
        if (pb) { pb.style.transition = 'none'; pb.style.width = '0%'; }
      });
    }

    function startProg(idx) {
      cancelAnimationFrame(rafId);
      resetAllProgBars();
      const pb = barItems[idx] && barItems[idx].querySelector('.c-bar-prog');
      if (!pb) return;
      rafStart = performance.now();
      const step = now => {
        const pct = Math.min(((now - rafStart) / DELAY) * 100, 100);
        pb.style.width = pct + '%';
        if (pct < 100) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    }

    function goTo(idx) {
      cur = ((idx % N) + N) % N;
      slides.forEach((s, i)   => s.classList.toggle('active', i === cur));
      barItems.forEach((b, i) => b.classList.toggle('active', i === cur));
      track.style.transform = `translateX(-${cur * 100}%)`;
      clearInterval(timer);
      timer = setInterval(() => goTo(cur + 1), DELAY);
      startProg(cur);
    }

    goTo(0);

    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) goTo(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearInterval(timer); cancelAnimationFrame(rafId); }
      else goTo(cur);
    });
  }

  /* ═══════════════════════════════════════════════════
     3. GENERADOR DE RELIEVES TOPOGRÁFICOS
     ─────────────────────────────────────────────────
     Genera SVG de curvas de nivel pseudo-orgánicas
     y los inyecta en todos los .topo-canvas.

     Opciones configurables por data-atributo:
       data-topo-color   → stroke color (default: según variante)
       data-topo-lines   → número de curvas (default: 14)
       data-topo-seed    → semilla para reproducibilidad

     Variantes automáticas:
       .topo-light → stroke azul corporativo
       .topo-dark  → stroke blanco
       .topo-warm  → stroke naranja
       .topo-img-overlay → stroke blanco (sobre foto)
     ═══════════════════════════════════════════════════ */

  function seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function buildTopoSVG(container) {
    const w = container.offsetWidth  || window.innerWidth;
    const h = container.offsetHeight || 400;
    if (w < 10 || h < 10) return;

    const isLight   = container.classList.contains('topo-light');
    const isDark    = container.classList.contains('topo-dark');
    const isWarm    = container.classList.contains('topo-warm');
    const isImg     = container.classList.contains('topo-img-overlay');

    let defaultColor;
    if (isImg)        defaultColor = 'rgba(255,255,255,0.6)';
    else if (isDark)  defaultColor = 'rgba(255,255,255,0.55)';
    else if (isWarm)  defaultColor = 'rgba(180,85,10,0.65)';
    else               defaultColor = 'rgba(18,73,160,0.55)';

    const strokeColor = container.dataset.topoColor || defaultColor;
    const numLines    = parseInt(container.dataset.topoLines || '14', 10);
    const seed        = parseInt(container.dataset.topoSeed  || String(Math.round(Math.random() * 9999)), 10);
    const rand        = seededRandom(seed);

    // Parámetros de las curvas
    const marginX = -w * 0.08;
    const totalW  = w - marginX * 2;

    const paths = [];

    for (let i = 0; i < numLines; i++) {
      const t        = (i + 1) / (numLines + 1);
      const baseY    = h * (0.08 + t * 0.84);
      const segments = 8 + Math.floor(rand() * 4); // 8..11 puntos
      const pts      = [];

      for (let j = 0; j <= segments; j++) {
        const x   = marginX + (j / segments) * totalW;
        const amp = h * (0.04 + rand() * 0.10);
        const y   = baseY + (rand() - 0.5) * 2 * amp;
        pts.push({ x, y });
      }

      // Convertir puntos a path cubic bezier suave
      let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      for (let j = 1; j < pts.length; j++) {
        const prev  = pts[j - 1];
        const curr  = pts[j];
        const cpX   = (prev.x + curr.x) / 2;
        d += ` C ${cpX.toFixed(1)},${prev.y.toFixed(1)} ${cpX.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
      }

      // Peso visual: líneas más cercanas al centro son más gruesas
      const distFromCenter = Math.abs(t - 0.5) * 2; // 0..1
      const sw = (0.4 + (1 - distFromCenter) * 0.5).toFixed(2);

      paths.push(`<path d="${d}" stroke="${strokeColor}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${paths.join('')}</svg>`;

    // Reemplazar SVG existente o insertar nuevo
    const existing = container.querySelector('svg');
    if (existing) existing.remove();

    // Para topo-img-overlay el SVG va dentro como hijo (la imagen va en background-image)
    container.insertAdjacentHTML('beforeend', svg);
  }

  // Construir todos los topos
  function initAllTopos() {
    document.querySelectorAll('.topo-canvas').forEach(el => {
      // Medir después de que el padre tenga dimensiones
      if (el.offsetWidth < 10) {
        requestAnimationFrame(() => buildTopoSVG(el));
      } else {
        buildTopoSVG(el);
      }
    });
  }

  // Reconstruir al redimensionar (debounce)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initAllTopos, 220);
  }, { passive: true });

  initAllTopos();

  /* ═══════════════════════════════════════════════════
     4. CARRUSEL INFINITO DE CLIENTES
     ═══════════════════════════════════════════════════ */
  function createInfiniteCarousel(track) {
    if (!track) return;
    const SPEED = 0.045; // px/ms

    function init() {
      Array.from(track.querySelectorAll('[data-clone]')).forEach(el => el.remove());
      const items = Array.from(track.children);
      if (!items.length) return;

      items.forEach(item => {
        const clone = item.cloneNode(true);
        clone.setAttribute('data-clone', '1');
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });

      requestAnimationFrame(() => startLoop());
    }

    function startLoop() {
      let halfWidth = track.scrollWidth / 2;
      if (halfWidth < 10) { requestAnimationFrame(startLoop); return; }

      let offset = 0, prevTime = null, isDragging = false;
      let startX = 0, startOffset = 0;

      function normalize(v) {
        const half = track.scrollWidth / 2;
        let r = v % half;
        return r < 0 ? r + half : r;
      }

      function step(ts) {
        if (prevTime === null) prevTime = ts;
        if (!isDragging) {
          offset = normalize(offset + (ts - prevTime) * SPEED);
          track.style.transform = `translateX(-${offset}px)`;
        }
        prevTime = ts;
        requestAnimationFrame(step);
      }

      function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        track.style.cursor = 'grab';
        try { track.releasePointerCapture(e.pointerId); } catch(_) {}
      }

      track.addEventListener('pointerdown', e => {
        isDragging = true; startX = e.clientX; startOffset = offset;
        track.setPointerCapture(e.pointerId); track.style.cursor = 'grabbing';
      });
      track.addEventListener('pointermove', e => {
        if (!isDragging) return;
        offset = normalize(startOffset - (e.clientX - startX));
        track.style.transform = `translateX(-${offset}px)`;
      });
      track.addEventListener('pointerup',     endDrag);
      track.addEventListener('pointercancel', endDrag);

      requestAnimationFrame(step);
    }

    const images = Array.from(track.querySelectorAll('img'));
    if (!images.length) { init(); return; }

    let loaded = 0;
    const onLoad = () => { if (++loaded >= images.length) init(); };
    images.forEach(img => {
      if (img.complete) onLoad();
      else {
        img.addEventListener('load',  onLoad, { once: true });
        img.addEventListener('error', onLoad, { once: true });
      }
    });
  }

  createInfiniteCarousel(document.getElementById('clientesCarouselTrackLTR'));

  /* ═══════════════════════════════════════════════════
     5. SCROLL REVEAL
     ═══════════════════════════════════════════════════ */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(el => io.observe(el));
  }

  /* ═══════════════════════════════════════════════════
     6. CHAT WIDGET
     ═══════════════════════════════════════════════════ */
  const sendUrl  = typeof window.CHAT_SEND_URL  !== 'undefined' ? window.CHAT_SEND_URL  : null;
  const resetUrl = typeof window.CHAT_RESET_URL !== 'undefined' ? window.CHAT_RESET_URL : null;

  function getCookie(name) {
    let val = null;
    document.cookie.split(';').forEach(c => {
      c = c.trim();
      if (c.startsWith(name + '=')) val = decodeURIComponent(c.slice(name.length + 1));
    });
    return val;
  }

  function timeLabel() {
    const n = new Date();
    return String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  }

  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/^- (.+)$/gm,     '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin:6px 0 6px 16px;padding:0;list-style:disc;">$1</ul>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function botAvatar() {
    return `<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0a1628,#0e4d6e);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;"><i class="fas fa-water" style="color:#4ecdc4;font-size:.6rem;"></i></div>`;
  }

  function scrollToBottom() {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function appendMessage(text, fromUser) {
    const history = document.getElementById('chat-history');
    if (!history) return;
    const w = document.createElement('div');
    w.className = 'msg-row';
    w.style.cssText = `display:flex;flex-direction:column;gap:3px;${fromUser ? 'align-items:flex-end;' : 'align-items:flex-start;'}`;
    w.innerHTML = fromUser
      ? `<div class="msg-user">${renderMarkdown(text)}</div><span class="msg-time">${timeLabel()}</span>`
      : `<div style="display:flex;align-items:flex-start;gap:7px;">${botAvatar()}<div><div class="msg-bot">${renderMarkdown(text)}</div><span class="msg-time" style="padding-left:3px;">${timeLabel()}</span></div></div>`;
    history.appendChild(w);
    scrollToBottom();
  }

  function showTyping() {
    const history = document.getElementById('chat-history');
    if (!history || document.getElementById('typing-indicator')) return;
    const el = document.createElement('div');
    el.id = 'typing-indicator'; el.className = 'msg-row';
    el.style.cssText = 'display:flex;align-items:flex-start;gap:7px;';
    el.innerHTML = `${botAvatar()}<div class="msg-bot" style="padding:10px 14px;display:flex;gap:4px;align-items:center;"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    history.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function showTransferCard() {
    const history = document.getElementById('chat-history');
    if (!history) return;
    const card = document.createElement('div');
    card.className = 'msg-row'; card.style.paddingLeft = '34px';
    card.innerHTML = `<div class="transfer-card">
      <div class="transfer-card-title"><i class="fas fa-circle-check" style="color:#1a5fa8;"></i> Consulta transferida exitosamente</div>
      <p style="font-size:.78rem;color:#374151;margin-bottom:12px;line-height:1.5;">Un asesor recibió tu información y se pondrá en contacto contigo pronto.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="transfer-btn transfer-btn-primary" onclick="window.doResetChat()"><i class="fas fa-rotate-right"></i> Nueva consulta</button>
        <button class="transfer-btn transfer-btn-secondary" onclick="window.closeChatWindow()"><i class="fas fa-xmark"></i> Cerrar chat</button>
      </div></div>`;
    history.appendChild(card);
    scrollToBottom();
  }

  function buildQuickReplies() {
    const qr = document.createElement('div');
    qr.id = 'quick-replies'; qr.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding-left:34px;';
    qr.innerHTML = `
      <button class="qr-chip" onclick="window.quickReply('¿Qué servicios ofrecen?')"><i class="fas fa-water" style="font-size:.6rem;"></i>Servicios</button>
      <button class="qr-chip" onclick="window.quickReply('Necesito estudios marinos')"><i class="fas fa-microscope" style="font-size:.6rem;"></i>Est. Marinos</button>
      <button class="qr-chip" onclick="window.quickReply('¿Cuáles son sus precios?')"><i class="fas fa-tag" style="font-size:.6rem;"></i>Precios</button>
      <button class="qr-chip" onclick="window.quickReply('¿Cómo los contacto?')"><i class="fas fa-phone" style="font-size:.6rem;"></i>Contacto</button>`;
    return qr;
  }

  window.sendChatMessage = function(override) {
    const input   = document.getElementById('chat-input');
    const message = override || (input && input.value.trim());
    if (!message) return;

    const qr = document.getElementById('quick-replies');
    if (qr) qr.remove();

    appendMessage(message, true);
    if (!override && input) { input.value = ''; input.focus(); }

    if (!sendUrl) {
      showTyping();
      setTimeout(() => { hideTyping(); appendMessage('Gracias por tu consulta. Para hablar con un asesor, escríbenos a contacto@syagroup.cl.', false); }, 800);
      return;
    }

    showTyping();
    fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'X-CSRFToken': getCookie('csrftoken'), 'X-Requested-With': 'XMLHttpRequest' },
      body: new URLSearchParams({ message }),
    })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => {
      hideTyping();
      if (!data.ok) { appendMessage(data.error || 'No se pudo obtener respuesta.', false); return; }
      const reply = data.reply || '';
      appendMessage(reply, false);
      const transferKeywords = ['conectarte con un asesor','asesor para finalizar','en breve te contactarán','transferido'];
      if (transferKeywords.some(k => reply.toLowerCase().includes(k))) setTimeout(showTransferCard, 800);
    })
    .catch(err => { console.warn('Chat error:', err); hideTyping(); appendMessage('Error de conexión. Escríbenos a contacto@syagroup.cl', false); });
  };

  window.doResetChat = async function() {
    if (resetUrl) {
      try { await fetch(resetUrl, { method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') } }); }
      catch(e) { console.warn('Reset error:', e); }
    }
    const history = document.getElementById('chat-history');
    if (!history) return;
    history.innerHTML = '';
    const welcome = typeof window.CHAT_WELCOME !== 'undefined' ? window.CHAT_WELCOME : '¡Hola! ¿En qué puedo ayudarte hoy?';
    const row = document.createElement('div');
    row.className = 'msg-row'; row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
    row.innerHTML = `${botAvatar()}<div><div class="msg-bot">${welcome}</div><p class="msg-time" style="padding-left:3px;">Ahora mismo</p></div>`;
    history.appendChild(row);
    history.appendChild(buildQuickReplies());
    scrollToBottom();
  };

  function setChatFullscreen(isFull) {
    const cw = document.getElementById('chat-window');
    const btn = document.getElementById('toggle-fullscreen');
    if (!cw || !btn) return;
    cw.classList.toggle('fullscreen', isFull);
    const icon = btn.querySelector('i');
    if (icon) icon.className = isFull ? 'fas fa-compress' : 'fas fa-expand';
    btn.title = isFull ? 'Restaurar tamaño' : 'Ampliar chat';
    document.body.classList.toggle('chat-fullscreen', isFull);
  }

  window.toggleChatFullscreen = () => {
    const cw = document.getElementById('chat-window');
    if (cw) setChatFullscreen(!cw.classList.contains('fullscreen'));
  };

  window.closeChatWindow = () => {
    setChatFullscreen(false);
    const cw = document.getElementById('chat-window'); if (cw) cw.classList.add('hidden');
    const io = document.getElementById('chat-icon-open');  if (io) io.style.display = 'block';
    const ix = document.getElementById('chat-icon-close'); if (ix) ix.style.display = 'none';
  };

  window.openChat = () => {
    const cw  = document.getElementById('chat-window'); if (cw)  cw.classList.remove('hidden');
    const cta = document.getElementById('chat-cta');   if (cta) cta.classList.add('hidden');
    const io  = document.getElementById('chat-icon-open');  if (io) io.style.display = 'none';
    const ix  = document.getElementById('chat-icon-close'); if (ix) ix.style.display = 'block';
    const inp = document.getElementById('chat-input'); if (inp) inp.focus();
  };

  window.quickReply = text => window.sendChatMessage(text);

  const chatBtn       = document.getElementById('chat-button');
  const chatWin       = document.getElementById('chat-window');
  const closeBtn      = document.getElementById('close-chat');
  const resetBtn      = document.getElementById('reset-chat');
  const fullscreenBtn = document.getElementById('toggle-fullscreen');
  const sendBtn       = document.getElementById('chat-send');
  const chatInput     = document.getElementById('chat-input');

  if (chatBtn)       chatBtn.addEventListener('click', () => chatWin?.classList.contains('hidden') ? window.openChat() : window.closeChatWindow());
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', window.toggleChatFullscreen);
  if (closeBtn)      closeBtn.addEventListener('click', window.closeChatWindow);
  if (resetBtn)      resetBtn.addEventListener('click', window.doResetChat);
  if (sendBtn)       sendBtn.addEventListener('click', () => window.sendChatMessage());
  if (chatInput)     chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendChatMessage(); } });

  /* ═══════════════════════════════════════════════════
     7. MODAL CERTIFICADOS
     ═══════════════════════════════════════════════════ */
  window.openCertModal = function(url, title) {
    const modal = document.getElementById('cert-modal'); if (!modal) return;
    document.getElementById('cert-modal-title').textContent = title;
    document.getElementById('cert-modal-frame').src = url;
    document.getElementById('cert-modal-dl').href = url;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeCertModal = function() {
    const modal = document.getElementById('cert-modal'); if (!modal) return;
    modal.classList.remove('active');
    document.getElementById('cert-modal-frame').src = '';
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeCertModal(); });

}); // END DOMContentLoaded