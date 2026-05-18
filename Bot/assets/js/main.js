/* ============================================================
   SyA Group Chile · main.js  — Rev. 2026-D
   Cambios:
   - CTA único: FAB naranja pulsante + burbuja de texto
   - Generador de SVG topográfico para todas las secciones
   - Se eliminan las tiras CTA separadas (mid-cta, topo-cta-strip)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════════
     TOPOGRAPHIC SVG GENERATOR
     Genera curvas de nivel tipo croquis de relieve
     para aplicar a cualquier sección
     ══════════════════════════════════════════════════ */
  function generateTopoSVG(opts = {}) {
    const {
      width    = 1400,
      height   = 700,
      lines    = 22,
      stroke   = '#1249A0',
      opacity  = 1,
      dashed   = false,
      seed     = 42,
    } = opts;

    // Generador pseudoaleatorio seeded para resultados consistentes
    let s = seed;
    function rand() {
      s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
      return (s >>> 0) / 4294967296;
    }

    // Genera puntos de control para una curva topográfica orgánica
    function makeContourPath(yBase, amplitude, xOffset, numCtrl) {
      const pts = [];
      const step = width / (numCtrl - 1);
      for (let i = 0; i < numCtrl; i++) {
        const x = i * step + (rand() - .5) * xOffset;
        const y = yBase + (rand() - .5) * amplitude;
        pts.push([x, y]);
      }
      // Construir path con curvas cúbicas de Bezier
      let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const cp1x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * .5;
        const cp1y = pts[i - 1][1];
        const cp2x = pts[i][0] - (pts[i + 1 < pts.length ? i + 1 : i][0] - pts[i - 1][0]) * .18;
        const cp2y = pts[i][1];
        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
      }
      d += ` L ${pts[pts.length-1][0].toFixed(1)},${pts[pts.length-1][1].toFixed(1)}`;
      return d;
    }

    const dashAttr = dashed ? 'stroke-dasharray="4 6"' : '';
    let paths = '';
    const spacing = height / (lines + 1);

    for (let i = 0; i < lines; i++) {
      const yBase = spacing * (i + 1);
      const amp   = spacing * 1.6;
      const xOff  = 80;
      const nCtrl = 9;
      const sw    = (i % 5 === 0) ? 1.2 : 0.65;
      const op    = (i % 5 === 0) ? opacity : opacity * 0.65;
      const d     = makeContourPath(yBase, amp, xOff, nCtrl);
      paths += `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-opacity="${op}" ${dashAttr}/>\n`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">${paths}</svg>`;
  }

  /* Aplica el topo SVG a todos los .topo-canvas */
  function injectTopoBackgrounds() {
    document.querySelectorAll('.topo-canvas').forEach((el, idx) => {
      const isDark = el.classList.contains('topo-dark');
      const isWarm = el.classList.contains('topo-warm');

      const stroke  = isDark ? '#ffffff' : isWarm ? '#E67E22' : '#1249A0';
      const opacity = isDark ? 0.55      : isWarm ? 0.6       : 0.55;
      const dashed  = isDark;
      const seed    = (idx + 1) * 137; // distinto para cada sección

      el.innerHTML = generateTopoSVG({ stroke, opacity, dashed, seed, lines: 26 });
    });
  }

  injectTopoBackgrounds();

  /* ── 1. NAVBAR SCROLL ─────────────────────────────── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => navbar.classList.toggle('solid', window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 2. MOBILE NAV ────────────────────────────────── */
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
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.classList.toggle('is-open', isOpen);
    });
    navMobilePanel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });
    document.addEventListener('click', e => {
      if (!navToggle.contains(e.target) && !navMobilePanel.contains(e.target)) {
        closeMobileNav();
      }
    });
  }

  /* ── 3. HERO CAROUSEL ─────────────────────────────── */
  const track   = document.getElementById('cTrack');
  const cBar    = document.getElementById('cBar');

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

    function updateUI(idx) {
      slides.forEach((s, i)   => s.classList.toggle('active', i === idx));
      barItems.forEach((b, i) => b.classList.toggle('active', i === idx));
      track.style.transform = `translateX(-${idx * 100}%)`;
    }

    function goTo(idx) {
      cur = ((idx % N) + N) % N;
      updateUI(cur);
      clearInterval(timer);
      timer = setInterval(() => goTo(cur + 1), DELAY);
      startProg(cur);
    }

    goTo(0);

    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) goTo(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { clearInterval(timer); cancelAnimationFrame(rafId); }
      else goTo(cur);
    });
  }

  /* ── 4. CARRUSEL INFINITO DE CLIENTES ─────────────── */
  function createInfiniteCarousel(track) {
    if (!track) return;
    const SPEED = 0.045;

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
      let halfWidth = track.scrollWidth / 2;
      if (halfWidth < 10) {
        requestAnimationFrame(() => { halfWidth = track.scrollWidth / 2; startLoop(halfWidth); });
        return;
      }
      startLoop(halfWidth);
    }

    function startLoop(halfWidth) {
      let offset = 0, prevTime = null, isDragging = false, startX = 0, startOffset = 0;

      function normalizeOffset(v) {
        const half = track.scrollWidth / 2;
        let r = v % half;
        if (r < 0) r += half;
        return r;
      }

      function animate(ts) {
        if (prevTime === null) prevTime = ts;
        const delta = ts - prevTime; prevTime = ts;
        if (!isDragging) {
          offset = normalizeOffset(offset + delta * SPEED);
          track.style.transform = `translateX(-${offset}px)`;
        }
        requestAnimationFrame(animate);
      }

      function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        if (e && e.pointerId != null) { try { track.releasePointerCapture(e.pointerId); } catch(_) {} }
      }

      track.addEventListener('pointerdown', e => {
        isDragging = true; startX = e.clientX; startOffset = offset;
        prevTime = e.timeStamp; track.setPointerCapture(e.pointerId);
      });
      track.addEventListener('pointermove', e => {
        if (!isDragging) return;
        offset = normalizeOffset(startOffset - (e.clientX - startX));
        track.style.transform = `translateX(-${offset}px)`;
      });
      track.addEventListener('pointerup', endDrag);
      track.addEventListener('pointercancel', endDrag);
      requestAnimationFrame(animate);
    }

    const images = Array.from(track.querySelectorAll('img'));
    if (!images.length) { init(); return; }
    let loaded = 0;
    const onLoad = () => { loaded++; if (loaded >= images.length) init(); };
    images.forEach(img => {
      if (img.complete) onLoad();
      else { img.addEventListener('load', onLoad, { once: true }); img.addEventListener('error', onLoad, { once: true }); }
    });
  }

  createInfiniteCarousel(document.getElementById('clientesCarouselTrackLTR'));

  /* ── 5. SCROLL REVEAL ─────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length > 0) {
    const io = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(el => io.observe(el));
  }

  /* ══════════════════════════════════════════════════
     6. FLOATING CHAT CTA — único punto de entrada
     ══════════════════════════════════════════════════ */

  // Crear el FAB y la burbuja dinámicamente
  const floatingWrap = document.createElement('div');
  floatingWrap.id = 'floating-chat-cta';
  floatingWrap.innerHTML = `
    <div class="cta-bubble" id="chat-cta-bubble">
      <div style="width:30px;height:30px;border-radius:9px;background:var(--brand-blue);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas fa-comment-dots" style="color:#fff;font-size:.72rem;"></i>
      </div>
      <div>
        <p style="font-family:var(--font-sans);font-size:.73rem;font-weight:600;color:var(--ink);margin:0 0 1px;">¿Tienes un proyecto ambiental?</p>
        <p style="font-family:var(--font-sans);font-size:.65rem;color:var(--ink-muted);margin:0;line-height:1.3;">Chatea con nuestros asesores</p>
      </div>
      <button class="cta-bubble-dismiss" id="dismiss-bubble" title="Cerrar">&times;</button>
    </div>
    <button id="chat-fab" aria-label="Abrir chat">
      <span class="fab-icon-open" style="display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-comment-dots" style="color:#fff;font-size:1.1rem;"></i>
      </span>
    </button>
  `;
  document.body.appendChild(floatingWrap);

  const fab         = document.getElementById('chat-fab');
  const ctaBubble   = document.getElementById('chat-cta-bubble');
  const dismissBtn  = document.getElementById('dismiss-bubble');

  // Mover #chat-widget (la ventana) al body si no está ya
  const chatWidgetEl = document.getElementById('chat-widget');

  function isChatOpen() {
    const cw = document.getElementById('chat-window');
    return cw && !cw.classList.contains('hidden');
  }

  window.openChat = () => {
    const cw = document.getElementById('chat-window');
    if (cw) cw.classList.remove('hidden');
    if (ctaBubble) ctaBubble.classList.add('hidden');
    if (fab) fab.classList.add('is-open');
    const inp = document.getElementById('chat-input');
    if (inp) inp.focus();
  };

  window.closeChatWindow = () => {
    const cw = document.getElementById('chat-window');
    if (cw) cw.classList.add('hidden');
    updateChatFullscreenState(false);
    if (fab) fab.classList.remove('is-open');
  };

  // FAB toggle
  fab.addEventListener('click', () => {
    if (isChatOpen()) window.closeChatWindow();
    else window.openChat();
  });

  // Click en la burbuja abre el chat
  ctaBubble.addEventListener('click', e => {
    if (e.target === dismissBtn || dismissBtn.contains(e.target)) return;
    window.openChat();
  });

  // Dismiss burbuja
  dismissBtn.addEventListener('click', e => {
    e.stopPropagation();
    ctaBubble.classList.add('hidden');
  });

  // Todos los botones inline que llamen openChat() funcionarán gracias a window.openChat
  // (ya definido arriba)

  /* ── 7. CHAT WIDGET LÓGICA ────────────────────────── */
  const sendUrl  = (typeof window.CHAT_SEND_URL  !== 'undefined') ? window.CHAT_SEND_URL  : null;
  const resetUrl = (typeof window.CHAT_RESET_URL !== 'undefined') ? window.CHAT_RESET_URL : null;

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
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
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
      <div class="transfer-card-title"><i class="fas fa-circle-check" style="color:#1a5fa8;"></i> Consulta transferida</div>
      <p style="font-size:.78rem;color:#374151;margin-bottom:12px;line-height:1.5;">Un asesor recibirá tu consulta y se pondrá en contacto contigo pronto.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="transfer-btn transfer-btn-primary" onclick="window.doResetChat()"><i class="fas fa-rotate-right"></i> Nueva consulta</button>
        <button class="transfer-btn transfer-btn-secondary" onclick="window.closeChatWindow()"><i class="fas fa-xmark"></i> Cerrar</button>
      </div>
    </div>`;
    history.appendChild(card);
    scrollToBottom();
  }

  function buildQuickReplies() {
    const qrDiv = document.createElement('div');
    qrDiv.id = 'quick-replies';
    qrDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding-left:34px;';
    qrDiv.innerHTML = `
      <button class="qr-chip" onclick="window.quickReply('¿Qué servicios ofrecen?')"><i class="fas fa-water" style="font-size:.6rem;"></i>Servicios</button>
      <button class="qr-chip" onclick="window.quickReply('Necesito estudios marinos')"><i class="fas fa-microscope" style="font-size:.6rem;"></i>Est. Marinos</button>
      <button class="qr-chip" onclick="window.quickReply('¿Cuáles son sus precios?')"><i class="fas fa-tag" style="font-size:.6rem;"></i>Precios</button>
      <button class="qr-chip" onclick="window.quickReply('¿Cómo los contacto?')"><i class="fas fa-phone" style="font-size:.6rem;"></i>Contacto</button>`;
    return qrDiv;
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
      setTimeout(() => { hideTyping(); appendMessage('Gracias por tu consulta. Para hablar con un asesor, escríbenos a contacto@syagroup.cl o llámanos directamente.', false); }, 800);
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
      const transferKeywords = ['conectarte con un asesor', 'asesor para finalizar', 'en breve te contactarán', 'transferido'];
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
    const welcomeMsg = (typeof window.CHAT_WELCOME !== 'undefined') ? window.CHAT_WELCOME : '¡Hola! ¿En qué puedo ayudarte hoy?';
    const row = document.createElement('div');
    row.className = 'msg-row'; row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
    row.innerHTML = `${botAvatar()}<div><div class="msg-bot">${welcomeMsg}</div><p class="msg-time" style="padding-left:3px;">Ahora mismo</p></div>`;
    history.appendChild(row);
    history.appendChild(buildQuickReplies());
    scrollToBottom();
  };

  function updateChatFullscreenState(isFull) {
    const cw = document.getElementById('chat-window');
    const toggleBtn = document.getElementById('toggle-fullscreen');
    if (!cw || !toggleBtn) return;
    cw.classList.toggle('fullscreen', isFull);
    const icon = toggleBtn.querySelector('i');
    if (icon) icon.className = isFull ? 'fas fa-compress' : 'fas fa-expand';
    toggleBtn.title = isFull ? 'Restaurar tamaño' : 'Ampliar chat';
    document.body.classList.toggle('chat-fullscreen', isFull);
  }

  window.toggleChatFullscreen = () => {
    const cw = document.getElementById('chat-window');
    if (cw) updateChatFullscreenState(!cw.classList.contains('fullscreen'));
  };

  window.quickReply = text => window.sendChatMessage(text);

  /* Conectar elementos del chat */
  const closeBtn      = document.getElementById('close-chat');
  const resetBtn      = document.getElementById('reset-chat');
  const fullscreenBtn = document.getElementById('toggle-fullscreen');
  const sendBtn       = document.getElementById('chat-send');
  const chatInput     = document.getElementById('chat-input');

  if (fullscreenBtn) fullscreenBtn.addEventListener('click', window.toggleChatFullscreen);
  if (closeBtn)      closeBtn.addEventListener('click', window.closeChatWindow);
  if (resetBtn)      resetBtn.addEventListener('click', window.doResetChat);
  if (sendBtn)       sendBtn.addEventListener('click', () => window.sendChatMessage());
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendChatMessage(); }
    });
  }

  /* ── 8. MODAL CERTIFICADOS ────────────────────────── */
  window.openCertModal = function(url, title) {
    const modal = document.getElementById('cert-modal');
    if (!modal) return;
    document.getElementById('cert-modal-title').textContent = title;
    document.getElementById('cert-modal-frame').src = url;
    document.getElementById('cert-modal-dl').href = url;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  window.closeCertModal = function() {
    const modal = document.getElementById('cert-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.getElementById('cert-modal-frame').src = '';
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeCertModal(); });

}); // END DOMContentLoaded