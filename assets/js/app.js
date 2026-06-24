/**
 * ================================================================
 * ATTEND · Painel Operacional — Aplicação principal
 * ================================================================
 *
 * Painel kiosk (display-only) que rota automaticamente entre 3 telas.
 *
 * Arquitetura
 * ────────────────────────────────────────────────────────────────
 *  • `state` é a fonte única da verdade. Toda alteração visual
 *    parte de uma mutação no state seguida de um `render*()`.
 *
 *  • Cada tela tem sua função `renderScreen<N>()`. Quando uma
 *    tela entra em foco (`showScreen()`), seu render é chamado.
 *
 *  • Telas 1 (Painel Operacional) e 2 (Fila de Descartes) exibem
 *    dados fixos de exemplo (`data.js`), renderizados uma única
 *    vez no boot — sem timers de simulação. O timer "Tempo no
 *    Pátio" (`tickActiveCallTimer`) continua correndo a cada segundo
 *    só para dar sensação de painel ativo.
 *
 *  • Tela 3 (EPI/Segurança): o loop de scan (`advanceEpiScan`) e
 *    o relógio do topbar continuam dinâmicos.
 *
 *  • Em produção: ao receber novos dados via fetch/websocket,
 *    atualizar `state.activeCall` / `state.occs` / `state.queue`
 *    e invocar o `render*()` correspondente. Os IDs do DOM
 *    permanecem estáveis (#call-panel, #cards-col, #s2-queue,
 *    #s3-grid).
 *
 *  • Tudo isolado em IIFE — não polui o escopo global.
 *
 * Atalhos de teclado
 * ────────────────────────────────────────────────────────────────
 *   ←  /  →     navegar entre telas
 *   1…3         ir direto a uma tela
 *   F / F11     alternar tela cheia
 * ================================================================
 */
(function () {
  'use strict';

  /** Dados iniciais expostos por `data.js`. */
  const D = window.AppData;

  /* ================================================================
   * 1. tEMPO DE EXIBISÇÃO DE CADA TELA
   * ================================================================
   * Ordem da rotação automática + duração de cada tela em segundos.
   * ================================================================ */
  const SCREENS_META = [
    { id: 'screen-1', label: 'PAINEL OPERACIONAL', duration: 120, title: 'Painel Operacional' },
    { id: 'screen-2', label: 'FILA DE DESCARTES', duration: 12, title: 'Fila de Descartes' },
    { id: 'screen-3', label: 'EPI / SEGURANÇA', duration: 12, title: 'EPI' },
  ];

  /* ================================================================
   * 2. STATE (fonte única da verdade)
   * ================================================================ */

  /**
   * @typedef {Object} AppState
   * @property {number}   idx         Tela atual (índice em SCREENS_META)
   * @property {Object}   activeCall  Chamada atual exibida no painel lateral
   * @property {Object[]} occs        Ocorrências exibidas (ordenadas por prioridade)
   * @property {Object[]} queue       Fila de descartes
   * @property {number}   epiScanIdx  Item de EPI atualmente em "scan"
   */

  /**
   * Telas 1 e 2 partem com dados fixos de exemplo (`data.js`) e são
   * renderizadas uma única vez no boot — sem ciclo de simulação.
   * Para integrar com backend: atualizar `state.activeCall` / `state.occs`
   * / `state.queue` e chamar o `render*()` correspondente (ver README).
   * @type {AppState}
   */
  const state = {
    idx: 0,
    activeCall: clone(D.INITIAL_ACTIVE_CALL),
    occs: clone(D.INITIAL_OCCS),
    queue: clone(D.INITIAL_QUEUE),
    epiScanIdx: 0,
  };

  /* ================================================================
   * 3. UTILITÁRIOS
   * ================================================================ */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }
  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  function pad(v) {
    return String(v).padStart(2, '0');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtTime(sec) {
    if (sec == null) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  /* ================================================================
   * 4. ÍCONES SVG REUTILIZÁVEIS
   * ================================================================ */
  const ICO = {
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  };

  /* ================================================================
   * 5. RENDER — TOPBAR (dots de navegação)
   * ================================================================ */

  function renderNavDots() {
    $('#screen-dots').innerHTML = SCREENS_META.map(
      (s, i) => `<div class="nav-dot${i === state.idx ? ' active' : ''}" ` + `role="button" tabindex="0" ` + `title="${escapeHtml(s.title)}" data-idx="${i}"></div>`,
    ).join('');
  }

  function updateActiveScreen() {
    $$('.screen').forEach(el => {
      el.classList.toggle('active', el.id === SCREENS_META[state.idx].id);
    });
    $$('.nav-dot').forEach((el, i) => {
      el.classList.toggle('active', i === state.idx);
    });
    const label = SCREENS_META[state.idx].label;
    $('#screen-name').textContent = label;
    $('#progress-info').textContent = label;
  }

  /* ================================================================
   * 6. RENDER — TELA 1 · Painel Operacional
   * ================================================================ */

  function renderScreen1() {
    renderActiveCallPanel();
    renderOccurrenceCards();
  }

  /**
   * Mapa de severidade → classe modificadora do `.call-panel`.
   * `crit` é o padrão do CSS (sem classe extra).
   */
  const SEV_CLASS = { crit: '', warn: 'sev-warn', lab: 'sev-lab', ok: 'sev-ok' };

  /**
   * Renderiza o painel lateral da chamada atual.
   * Exibe: label + placa, tipo de ocorrência, timer e faixa de ação.
   */
  function renderActiveCallPanel() {
    const host = $('#call-panel');
    const c = state.activeCall;
    if (!c) return;

    const occ = state.occs.find(o => o.plate === c.plate);
    const occType = occ ? occ.type : c.type;

    host.classList.remove('sev-warn', 'sev-lab', 'sev-ok');
    const sevCls = occ ? SEV_CLASS[occ.cls] : '';
    if (sevCls) host.classList.add(sevCls);

    host.innerHTML = `
      <div class="call-identity">
        <div class="call-plate-label">
          <svg class="call-truck-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 17h4V5H2v12h3"/>
            <path d="M14 8h4l4 4v5h-2"/>
            <circle cx="7.5" cy="17.5" r="2.5"/>
            <circle cx="17.5" cy="17.5" r="2.5"/>
          </svg>
          <div class="call-status-dot"></div>
          <div class="call-status-label">Placa do Veículo</div>
        </div>
        <div class="call-plate">${escapeHtml(c.plate)}</div>
      </div>

      <div class="call-occurrence">
        <div class="call-occurrence-type">${escapeHtml(occType)}</div>
      </div>

      <div class="call-timer">
        <div class="call-elapsed" id="call-elapsed">${fmtTime(c.waitSec)}</div>
      </div>

      <div class="call-action">
        <div class="call-action-dot"></div>
        <div class="call-action-text">Atender agora</div>
      </div>
    `;
  }

  /** Atualiza só o timer do chamado ativo (chamada a cada 1s). */
  function tickActiveCallTimer() {
    if (!state.activeCall) return;
    state.activeCall.waitSec = (state.activeCall.waitSec || 0) + 1;
    const el = $('#call-elapsed');
    if (el) el.textContent = fmtTime(state.activeCall.waitSec);
  }

  /** Ordem de prioridade visual: críticas primeiro. */
  const OCC_PRIORITY = { crit: 0, warn: 1, lab: 2, ok: 3 };

  /**
   * Renderiza a coluna de cards de ocorrências.
   * A ocorrência da placa da chamada ativa fica no painel lateral
   * e não é repetida aqui.
   */
  function renderOccurrenceCards() {
    const host = $('#cards-col');
    const activePlate = state.activeCall ? state.activeCall.plate : null;
    const list = state.occs.filter(o => o.plate !== activePlate);

    if (list.length === 0) {
      host.innerHTML = `
        <div class="occ-empty">
          <div class="occ-empty-icon">${ICO.check}</div>
          <div class="occ-empty-message">Sem ocorrências ativas</div>
        </div>
      `;
      return;
    }

    const sorted = [...list].sort((a, b) => (OCC_PRIORITY[a.cls] ?? 99) - (OCC_PRIORITY[b.cls] ?? 99));

    host.innerHTML = sorted
      .map(
        o => `
      <div class="occ-card ${o.cls}${o.removing ? ' removing' : ''}" data-id="${escapeHtml(o.id)}">
        <div class="occ-plate-col">
          <div class="occ-plate">${escapeHtml(o.plate)}</div>
        </div>
        <div class="occ-content">
          <div class="occ-type">${escapeHtml(o.type)}</div>
          <div class="occ-detail">${escapeHtml(o.detail)}</div>
        </div>
        <div class="occ-time-col">
          <div class="occ-wait ${o.wc}">${escapeHtml(o.wt)}</div>
          <span class="occ-badge ${o.badge}">${escapeHtml(o.bl)}</span>
        </div>
      </div>
    `,
      )
      .join('');
  }

  /* ================================================================
   * 7. RENDER — TELA 2 · Fila de Descartes
   * ================================================================
   * Renderiza até 5 itens da fila em grade com posição, placa+carga,
   * tipo+empresa, ETA e status. Sem cabeçalho — fila ocupa 100%.
   * ================================================================ */

  function renderScreen2() {
    const q = state.queue;

    $('#s2-queue').innerHTML = q
      .slice(0, 5)
      .map(item => {
        const cls = item.next ? ' next' : item.blocked ? ' blocked' : '';
        const statusLabel = item.next ? 'PRÓXIMO' : item.blocked ? 'BLOQ.' : 'AGUARD.';
        const typeLabel = item.next ? '▶ PRÓXIMO A DESCARREGAR' : escapeHtml(item.type);

        return `
        <div class="s2-item${cls}${item.removing ? ' removing' : ''}" data-id="${escapeHtml(item.id)}">
          <div class="s2-pos">${item.next ? '→' : item.pos}</div>
          <div class="s2-plate-col">
            <div class="s2-plate">${escapeHtml(item.plate)}</div>
            <div class="s2-cargo">${escapeHtml(item.cargo)}</div>
          </div>
          <div class="s2-info">
            <div class="s2-title">${item.next ? '▶ PRÓXIMO A DESCARREGAR' : escapeHtml(item.title || item.company)}</div>
            <div class="s2-desc">${escapeHtml(item.desc || item.type)}</div>
          </div>
          <div class="s2-eta-col">
            <div class="s2-eta">${escapeHtml(item.eta)}</div>
            <span class="s2-status">${statusLabel}</span>
          </div>
        </div>
      `;
      })
      .join('');
  }

  /* ================================================================
   * 8. RENDER — TELA 3 · EPI / Segurança
   * ================================================================ */

  const EPI_ITEMS = [
    {
      key: 'colete',
      nm: 'Colete',
      svg: '<path d="M2 4l4 2v14H2V4z"/><path d="M22 4l-4 2v14h4V4z"/><path d="M6 6l3 4h6l3-4"/><path d="M9 10v10"/><path d="M15 10v10"/>',
    },
    {
      key: 'bota',
      nm: 'Bota',
      svg: '<path d="M4 20h16v-2H4v2z"/><path d="M6 18V9l3-5h4l1 5h2l2 4v5"/><path d="M9 4v5"/>',
    },
    {
      key: 'luva',
      nm: 'Luva',
      svg: '<path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34L4 18"/>',
    },
    {
      key: 'capacete',
      nm: 'Capacete',
      svg: '<path d="M2 18h20"/><path d="M12 2a9 9 0 0 1 9 9v1H3v-1a9 9 0 0 1 9-9z"/><path d="M12 2v4"/><path d="M4.6 11a9 9 0 0 0-.6 3"/><path d="M19.4 11a9 9 0 0 1 .6 3"/>',
    },
  ];

  function renderScreen3() {
    const scanIdx = state.epiScanIdx;
    const allAcked = scanIdx >= EPI_ITEMS.length;

    $('#s3-grid').innerHTML = EPI_ITEMS.map((i, idx) => {
      const acked = idx < scanIdx;
      const scanning = idx === scanIdx;
      const cls = (acked ? ' acked' : '') + (scanning ? ' scanning' : '');
      return `
        <div class="s3-card${cls}">
          <div class="s3-ico">
            <svg viewBox="0 0 24 24">${i.svg}</svg>
            <div class="check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
          </div>
          <div class="s3-nm">${escapeHtml(i.nm)}</div>
        </div>
      `;
    }).join('');

    $('#s3-ackbar').classList.toggle('show', allAcked);
  }

  /* ================================================================
   * 9. RELÓGIO
   * ================================================================ */

  function updateClock() {
    const now = new Date();
    const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    $('#clock-time').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    $('#clock-date').textContent = `${days[now.getDay()]} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
  }

  /* ================================================================
   * 10. ROTAÇÃO DE TELAS + BARRA DE PROGRESSO
   * ================================================================ */

  let rafId = 0;
  let progressStart = 0;

  function showScreen(idx) {
    const n = SCREENS_META.length;
    state.idx = ((idx % n) + n) % n;
    updateActiveScreen();

    switch (state.idx) {
      case 0:
        renderScreen1();
        break;
      case 1:
        renderScreen2();
        break;
      case 2:
        renderScreen3();
        break;
    }

    startProgress();
  }

  function startProgress() {
    if (rafId) cancelAnimationFrame(rafId);

    const dur = SCREENS_META[state.idx].duration;
    progressStart = performance.now();

    const step = now => {
      const elapsed = (now - progressStart) / 1000;
      const rem = Math.max(0, dur - elapsed);
      $('#progress-fill').style.width = (rem / dur) * 100 + '%';
      $('#progress-countdown').textContent = Math.ceil(rem) + 's';

      if (rem <= 0) {
        showScreen(state.idx + 1);
      } else {
        rafId = requestAnimationFrame(step);
      }
    };
    rafId = requestAnimationFrame(step);
  }

  /* ================================================================
   * 11. EPI SCAN LOOP — avança um item a cada 1100ms
   * ================================================================ */

  function advanceEpiScan() {
    state.epiScanIdx = state.epiScanIdx >= EPI_ITEMS.length ? 0 : state.epiScanIdx + 1;
    if (state.idx === 2) renderScreen3();
  }

  /* ================================================================
   * 12. FULLSCREEN
   * ================================================================ */

  function toggleFS() {
    if (!document.fullscreenElement) {
      const req = document.documentElement.requestFullscreen;
      if (req) req.call(document.documentElement).catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  /* ================================================================
   * 13. EVENTOS (clique nos dots + teclado)
   * ================================================================ */

  function bindEvents() {
    $('#screen-dots').addEventListener('click', e => {
      const dot = e.target.closest('.nav-dot');
      if (!dot) return;
      const i = parseInt(dot.dataset.idx, 10);
      if (!Number.isNaN(i)) showScreen(i);
    });

    $('#fs-btn').addEventListener('click', toggleFS);

    window.addEventListener('keydown', e => {
      const tag = e.target && e.target.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'ArrowRight') showScreen(state.idx + 1);
      else if (e.key === 'ArrowLeft') showScreen(state.idx - 1);
      else if (e.key >= '1' && e.key <= '3') showScreen(parseInt(e.key, 10) - 1);
      else if ((e.key === 'f' || e.key === 'F') && !inField) toggleFS();
      else if (e.key === 'F11') {
        e.preventDefault();
        toggleFS();
      }
    });
  }

  /* ================================================================
   * 14. BOOTSTRAP
   * ================================================================ */

  function init() {
    renderNavDots();
    updateClock();

    setInterval(updateClock, 1000);
    setInterval(tickActiveCallTimer, 1000);
    setInterval(advanceEpiScan, 1100);

    bindEvents();
    showScreen(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
