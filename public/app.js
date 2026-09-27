/* GlobalPath — front-end (JavaScript puro, sem build) */
(() => {
'use strict';

// =============================================================== utilidades
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (t = '') => t.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
function colorFor(text = '') { let h = 0; for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 997; return String((h % 10) + 1); }

const ICONS = {
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/>',
  micOff: '<path d="m2 2 20 20M9 9v1a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.6"/><path d="M17 16.9A7 7 0 0 1 5 10M19 10a7 7 0 0 1-.1 1.2M12 17v4"/>',
  video: '<path d="m22 8-6 4 6 4z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  videoOff: '<path d="m2 2 20 20M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5 0h3a2 2 0 0 1 2 2v3.3l1 1 5-3.3v8"/>',
  screen: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  phoneOff: '<path d="M10.7 13.3a16 16 0 0 0 3.4 2.6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 4.2 2 2 0 0 1 5 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8.9 9.8"/><path d="M22 2 2 22"/>',
  headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>',
  headOff: '<path d="m2 2 20 20"/><path d="M3 18v-6a9 9 0 0 1 14.5-7.1M21 12v6M21 19a2 2 0 0 1-2 2h-1v-3M3 19a2 2 0 0 0 2 2h1v-6H3z"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  door: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;

function avatarHtml(user, cls = '') {
  const name = user?.display_name || '?';
  const img = user?.avatar_url ? `<img src="${esc(user.avatar_url)}" alt="">` : esc(initials(name));
  return `<div class="avatar g${colorFor(name)} ${cls}">${img}</div>`;
}
function serverIconHtml(s, cls = 'server-icon', style = '') {
  const img = s.icon_url ? `<img src="${esc(s.icon_url)}" alt="">` : esc(initials(s.name));
  return `<div class="${cls} g${esc(s.color || '1')}"${style ? ` style="${style}"` : ''}>${img}</div>`;
}

function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }
  if (!res.ok) {
    const e = new Error(data?.error || 'Algo deu errado. Tente de novo.');
    e.status = res.status;
    throw e;
  }
  return data;
}

// reduz imagem para no máx. `size` px e devolve data URL
function imageToDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      let url = c.toDataURL('image/webp', 0.85);
      if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');
      URL.revokeObjectURL(img.src);
      resolve(url);
    };
    img.onerror = () => reject(new Error('Não consegui ler essa imagem.'));
    img.src = URL.createObjectURL(file);
  });
}
function pickImage() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      try { resolve(await imageToDataUrl(inp.files[0])); } catch (e) { toast(e.message, true); resolve(null); }
    };
    inp.click();
  });
}

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function fmtDay(iso) {
  const d = new Date(iso), t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Hoje';
  if (d.toDateString() === y.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function linkify(text) {
  return esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// preferências de chamada (só neste navegador)
const CALL_DEFAULTS = { micId: '', camId: '', speakerId: '', echoCancellation: true, noiseSuppression: true, autoGainControl: true };
function callSettings() {
  try { return { ...CALL_DEFAULTS, ...JSON.parse(localStorage.getItem('gp_call') || '{}') }; } catch { return { ...CALL_DEFAULTS }; }
}
function saveCallSettings(s) { try { localStorage.setItem('gp_call', JSON.stringify(s)); } catch { /* ignora */ } }

// =============================================================== estado
const S = {
  me: null,
  servers: [],
  serverId: null,
  channelId: null,
  channels: {},      // sid -> []
  messages: {},      // cid -> []
  hasMore: {},       // cid -> bool
  voice: {},         // cid -> participantes
  navOpen: false,
  iceServers: null,
};
let socket = null;
const current = () => S.servers.find((s) => s.id === S.serverId);
const chan = () => (S.channels[S.serverId] || []).find((c) => c.id === S.channelId);

// =============================================================== rotas
function navigate(path, replace = false) {
  if (location.pathname !== path) history[replace ? 'replaceState' : 'pushState']({}, '', path);
  route();
}
window.addEventListener('popstate', route);

async function route() {
  const p = location.pathname;
  if (!S.me) return renderAuth(p.startsWith('/join/') ? 'register' : 'login');
  const join = p.match(/^\/join\/([\w-]+)/);
  if (join) return showInvite(join[1]);
  const m = p.match(/^\/s\/([\w]+)(?:\/([\w]+))?/);
  if (m && S.servers.some((s) => s.id === m[1])) {
    await openServer(m[1], m[2]);
  } else {
    S.serverId = null; S.channelId = null;
    if (p !== '/') history.replaceState({}, '', '/');
    renderApp();
  }
}

// =============================================================== autenticação
function renderAuth(mode = 'login') {
  const isLogin = mode === 'login';
  const joining = location.pathname.startsWith('/join/');
  $('#app').innerHTML = `
  <div class="auth">
    <form class="auth-card" id="auth-form" novalidate>
      <div class="brand"><div class="brand-logo">GP</div><b>GlobalPath</b></div>
      <h1>${isLogin ? 'Bem-vindo de volta!' : 'Criar uma conta'}</h1>
      <p class="sub">${joining ? 'Entre para aceitar o convite do servidor.' : isLogin ? 'Que bom te ver de novo.' : 'Leva menos de um minuto.'}</p>
      ${isLogin ? '' : `<div class="field"><label>Nome de exibição</label><input class="input" name="display_name" maxlength="32" autocomplete="nickname" required></div>`}
      <div class="field"><label>E-mail</label><input class="input" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label>Senha</label><input class="input" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required></div>
      <div class="error-text" id="auth-err"></div>
      <button class="btn primary block" type="submit">${isLogin ? 'Entrar' : 'Criar conta'}</button>
      <div class="switch-link">${isLogin ? 'Precisa de uma conta? <button type="button" id="auth-switch">Cadastre-se</button>' : 'Já tem uma conta? <button type="button" id="auth-switch">Entrar</button>'}</div>
    </form>
  </div>`;
  $('#auth-switch').onclick = () => renderAuth(isLogin ? 'register' : 'login');
  $('#auth-form input').focus();
  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const body = Object.fromEntries(new FormData(e.target));
    btn.disabled = true; $('#auth-err').textContent = '';
    try {
      S.me = await api(isLogin ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body });
      await startSession();
    } catch (err) {
      $('#auth-err').textContent = err.message;
      btn.disabled = false;
    }
  };
}

async function startSession() {
  S.servers = await api('/api/servers');
  connectSocket();
  route();
}

async function logout() {
  if (call) leaveCall();
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  socket?.disconnect(); socket = null;
  Object.assign(S, { me: null, servers: [], serverId: null, channelId: null, channels: {}, messages: {}, voice: {} });
  history.replaceState({}, '', '/');
  renderAuth('login');
}

// =============================================================== socket
function connectSocket() {
  socket = io({ transports: ['websocket', 'polling'] });
  socket.on('connect', () => { if (S.serverId) refreshVoice(S.serverId); });
  socket.on('connect_error', (e) => { if (e.message === 'unauthorized') logout(); });

  socket.on('message:created', (m) => {
    const list = S.messages[m.channel_id];
    if (list && !list.some((x) => x.id === m.id)) {
      list.push(m);
      if (m.channel_id === S.channelId) appendMessage(m);
    }
  });
  socket.on('message:deleted', ({ id, channel_id }) => {
    if (S.messages[channel_id]) S.messages[channel_id] = S.messages[channel_id].filter((m) => m.id !== id);
    if (channel_id === S.channelId) renderMessages(true);
  });
  socket.on('channel:created', (c) => {
    const l = S.channels[c.server_id]; if (l && !l.some((x) => x.id === c.id)) l.push(c);
    if (c.server_id === S.serverId) renderSidebar();
  });
  socket.on('channel:updated', (c) => {
    const l = S.channels[c.server_id]; if (!l) return;
    const i = l.findIndex((x) => x.id === c.id); if (i >= 0) l[i] = c;
    if (c.server_id === S.serverId) { renderSidebar(); if (c.id === S.channelId) renderHead(); }
  });
  socket.on('channel:deleted', ({ id, server_id }) => {
    if (S.channels[server_id]) S.channels[server_id] = S.channels[server_id].filter((x) => x.id !== id);
    delete S.voice[id];
    if (server_id === S.serverId) {
      if (S.channelId === id) navigate(`/s/${server_id}`, true); else renderSidebar();
    }
  });
  socket.on('server:updated', (s) => {
    const i = S.servers.findIndex((x) => x.id === s.id);
    if (i >= 0) { S.servers[i] = { ...S.servers[i], ...s }; renderRail(); if (s.id === S.serverId) renderSidebar(); }
  });
  const dropServer = ({ id }) => {
    S.servers = S.servers.filter((s) => s.id !== id);
    if (call && call.serverId === id) leaveCall();
    if (S.serverId === id) { toast('Você não está mais nesse servidor.'); navigate('/', true); } else renderRail();
  };
  socket.on('server:deleted', dropServer);
  socket.on('server:removed', dropServer);
  socket.on('user:updated', (u) => {
    if (u.id === S.me.id) S.me = { ...S.me, ...u };
    Object.values(S.messages).forEach((l) => l.forEach((m) => { if (m.author_id === u.id) { m.author_name = u.display_name; m.author_avatar = u.avatar_url; } }));
    if (S.channelId && chan()?.kind === 'text') renderMessages(true);
  });
  socket.on('voice:state', ({ channel_id, participants }) => {
    S.voice[channel_id] = participants;
    const c = (S.channels[S.serverId] || []).find((x) => x.id === channel_id);
    if (c) renderSidebar();
    if (call && call.channelId === channel_id) { if (S.channelId === channel_id) { updateCallGrid(); renderControls(); } }
    else if (channel_id === S.channelId) renderMain();
  });
  socket.on('voice:left', ({ channel_id }) => {
    if (call && call.channelId === channel_id) leaveCall(true);
  });
  socket.on('rtc:signal', onSignal);
  socket.on('rtc:peer-left', ({ socket_id }) => closePeer(socket_id));
}

function refreshVoice(sid) {
  socket?.emit('voice:snapshot', sid, (snap) => {
    Object.assign(S.voice, snap);
    if (S.serverId === sid) { renderSidebar(); if (chan()?.kind === 'voice') renderMain(); }
  });
}

// =============================================================== layout
function renderApp() {
  if (!$('.layout')) {
    $('#app').innerHTML = `
    <div class="layout">
      <div class="nav-scrim"></div>
      <div class="nav-wrap"><nav class="rail" id="rail"></nav><aside class="sidebar" id="sidebar"></aside></div>
      <main class="main" id="main"></main>
    </div>`;
    $('.nav-scrim').onclick = () => setNav(false);
  }
  renderRail(); renderSidebar(); renderMain();
}
function setNav(open) {
  S.navOpen = open;
  $('.nav-wrap')?.classList.toggle('open', open);
  $('.nav-scrim')?.classList.toggle('open', open);
}

function renderRail() {
  const el = $('#rail'); if (!el) return;
  el.innerHTML = `
    <div class="rail-item ${!S.serverId ? 'active' : ''}" data-tip="Início"><span class="pill"></span>
      <button class="rail-add home" data-go="/">${icon('compass')}</button></div>
    <div class="sep"></div>
    ${S.servers.map((s) => `
      <div class="rail-item ${s.id === S.serverId ? 'active' : ''}" data-tip="${esc(s.name)}"><span class="pill"></span>
        <button data-go="/s/${s.id}" aria-label="${esc(s.name)}">${serverIconHtml(s)}</button></div>`).join('')}
    <div class="rail-item" data-tip="Criar servidor"><button class="rail-add" id="rail-create">${icon('plus')}</button></div>
    <div class="rail-item" data-tip="Entrar com convite"><button class="rail-add" id="rail-join">${icon('link')}</button></div>`;
  $$('[data-go]', el).forEach((b) => { b.onclick = () => { setNav(false); navigate(b.dataset.go); }; });
  $('#rail-create').onclick = () => createServerDialog();
  $('#rail-join').onclick = () => joinDialog();
  attachTips(el);
}
function attachTips(root) {
  $$('[data-tip]', root).forEach((item) => {
    let tip;
    item.onmouseenter = () => {
      if (window.innerWidth <= 800) return;
      const r = item.getBoundingClientRect();
      tip = document.createElement('div'); tip.className = 'tooltip'; tip.textContent = item.dataset.tip;
      document.body.appendChild(tip);
      tip.style.left = r.right + 12 + 'px'; tip.style.top = r.top + r.height / 2 - tip.offsetHeight / 2 + 'px';
    };
    item.onmouseleave = () => tip?.remove();
    item.onclick = () => tip?.remove();
  });
}

function renderSidebar() {
  const el = $('#sidebar'); if (!el) return;
  const s = current();
  let body;
  if (!s) {
    body = `<div class="sidebar-head"><div class="server-name-btn" style="cursor:default"><span class="n">Seus servidores</span></div></div>
    <div class="channels">${S.servers.length ? S.servers.map((x) => `
      <button class="channel" data-go="/s/${x.id}">${serverIconHtml(x, 'mini-icon')}<span class="n">${esc(x.name)}</span></button>`).join('')
      : '<p class="hint" style="padding:8px">Você ainda não está em nenhum servidor.</p>'}</div>`;
  } else {
    const chs = S.channels[s.id] || [];
    const text = chs.filter((c) => c.kind === 'text');
    const voice = chs.filter((c) => c.kind === 'voice');
    const owner = s.is_owner;
    const chRow = (c) => `
      <button class="channel ${c.id === S.channelId ? 'active' : ''}" data-ch="${c.id}">
        ${icon(c.kind === 'voice' ? 'volume' : 'hash')}<span class="n">${esc(c.name)}</span>
        ${owner ? `<span class="ch-actions"><span class="icon-btn" data-edit-ch="${c.id}" title="Editar canal">${icon('settings')}</span></span>` : ''}
      </button>
      ${c.kind === 'voice' ? `<div class="voice-users">${(S.voice[c.id] || []).map((p) => `
        <div class="voice-user" data-sock="${p.socket_id}">${avatarHtml(p, 'sm')}<span>${esc(p.display_name)}</span>
          <span class="flags">${p.screen ? '<span class="tag">AO VIVO</span>' : ''}${p.camera ? icon('video') : ''}${p.muted ? icon('micOff') : ''}${p.deafened ? icon('headOff') : ''}</span></div>`).join('')}</div>` : ''}`;
    body = `
      <div class="sidebar-head">
        <button class="server-name-btn" id="server-menu-btn">${serverIconHtml(s, 'mini-icon')}<span class="n">${esc(s.name)}</span>${icon('chevron')}</button>
      </div>
      <div class="channels">
        <div class="cat"><span>Canais de texto</span>${owner ? `<button class="icon-btn" data-new="text" title="Criar canal">${icon('plus')}</button>` : ''}</div>
        ${text.map(chRow).join('')}
        <div class="cat"><span>Canais de voz</span>${owner ? `<button class="icon-btn" data-new="voice" title="Criar canal">${icon('plus')}</button>` : ''}</div>
        ${voice.map(chRow).join('')}
      </div>`;
  }
  const inCall = call ? (Object.values(S.channels).flat().find((c) => c.id === call.channelId)) : null;
  const callServer = call ? S.servers.find((x) => x.id === call.serverId) : null;
  el.innerHTML = body + `
    ${inCall ? `<div class="voice-bar"><div class="status">
      <div class="info" id="vb-open"><b>Voz conectada</b><small>${esc(inCall.name)} / ${esc(callServer?.name || '')}</small></div>
      <button class="icon-btn" id="vb-leave" title="Desconectar">${icon('phoneOff')}</button></div></div>` : ''}
    <div class="user-bar">
      <button class="me" id="me-btn" title="Configurações de perfil">
        <span style="position:relative">${avatarHtml(S.me)}<span class="dot on"></span></span>
        <span style="min-width:0;text-align:left"><div class="nm">${esc(S.me.display_name)}</div><div class="st">Online</div></span>
      </button>
      ${call ? `<button class="icon-btn ${call.muted ? 'on' : ''}" id="ub-mute" title="${call.muted ? 'Ativar microfone' : 'Silenciar'}">${icon(call.muted ? 'micOff' : 'mic')}</button>
      <button class="icon-btn ${call.deafened ? 'on' : ''}" id="ub-deaf" title="${call.deafened ? 'Ativar áudio' : 'Desativar áudio'}">${icon(call.deafened ? 'headOff' : 'headphones')}</button>` : ''}
      <button class="icon-btn" id="ub-settings" title="Configurações">${icon('settings')}</button>
      <button class="icon-btn" id="ub-logout" title="Sair">${icon('logout')}</button>
    </div>`;

  $$('[data-go]', el).forEach((b) => { b.onclick = () => { setNav(false); navigate(b.dataset.go); }; });
  $$('[data-ch]', el).forEach((b) => {
    b.onclick = (e) => {
      const edit = e.target.closest('[data-edit-ch]');
      if (edit) { e.stopPropagation(); return channelSettingsDialog(edit.dataset.editCh); }
      setNav(false);
      navigate(`/s/${S.serverId}/${b.dataset.ch}`);
    };
  });
  $$('[data-new]', el).forEach((b) => { b.onclick = () => createChannelDialog(b.dataset.new); });
  $('#server-menu-btn')?.addEventListener('click', (e) => serverMenu(e.currentTarget));
  $('#me-btn').onclick = () => userSettings('profile');
  $('#ub-settings').onclick = () => userSettings('profile');
  $('#ub-logout').onclick = () => { if (confirm('Deseja sair da sua conta?')) logout(); };
  $('#ub-mute')?.addEventListener('click', toggleMute);
  $('#ub-deaf')?.addEventListener('click', toggleDeafen);
  $('#vb-leave')?.addEventListener('click', () => leaveCall());
  $('#vb-open')?.addEventListener('click', () => { setNav(false); navigate(`/s/${call.serverId}/${call.channelId}`); });
}

function renderHead() {
  const h = $('.main-head'); if (!h) return;
  const c = chan();
  h.innerHTML = `<button class="icon-btn menu-toggle" id="menu-toggle">${icon('menu')}</button>
    ${c ? `${icon(c.kind === 'voice' ? 'volume' : 'hash', 'muted')}<span>${esc(c.name)}</span>` : `<span>${esc(current()?.name || 'Início')}</span>`}
    <span class="spacer"></span>
    ${current() ? `<button class="icon-btn" id="head-invite" title="Convidar pessoas">${icon('userPlus')}</button>
    <button class="icon-btn" id="head-members" title="Membros">${icon('users')}</button>` : ''}`;
  $('#menu-toggle').onclick = () => setNav(true);
  $('#head-invite')?.addEventListener('click', () => inviteDialog());
  $('#head-members')?.addEventListener('click', () => serverSettings('members'));
}

function renderMain() {
  const el = $('#main'); if (!el) return;
  const s = current();
  const c = chan();
  if (!s) {
    el.innerHTML = `<div class="main-head"></div>
      <div class="empty"><div>
        <div class="ico">${icon('compass')}</div>
        <h2>Olá, ${esc(S.me.display_name)}!</h2>
        <p>${S.servers.length ? 'Escolha um servidor na barra lateral ou crie um novo.' : 'Crie seu primeiro servidor ou entre em um com um convite de um amigo.'}</p>
        <div class="row"><button class="btn primary" id="e-create">${icon('plus')}Criar servidor</button><button class="btn" id="e-join">${icon('link')}Tenho um convite</button></div>
      </div></div>`;
    renderHead();
    $('#e-create').onclick = () => createServerDialog();
    $('#e-join').onclick = () => joinDialog();
    return;
  }
  if (!c) {
    el.innerHTML = `<div class="main-head"></div><div class="empty"><div><div class="ico">${icon('hash')}</div><h2>Nenhum canal</h2><p>${s.is_owner ? 'Crie um canal para começar.' : 'Este servidor ainda não tem canais.'}</p></div></div>`;
    renderHead();
    return;
  }
  if (c.kind === 'text') return renderTextChannel(el, c);
  return renderVoiceChannel(el, c);
}

// =============================================================== servidor / canais
async function openServer(sid, cid) {
  const changed = S.serverId !== sid;
  S.serverId = sid;
  if (!S.channels[sid]) {
    try { S.channels[sid] = await api(`/api/servers/${sid}/channels`); } catch (e) { toast(e.message, true); return navigate('/', true); }
  }
  if (changed) refreshVoice(sid);
  const chs = S.channels[sid];
  let c = chs.find((x) => x.id === cid);
  if (!c) {
    c = chs.find((x) => x.kind === 'text') || chs[0];
    if (c) history.replaceState({}, '', `/s/${sid}/${c.id}`);
  }
  S.channelId = c?.id || null;
  renderApp();
}

// ---------------------------------------------------------------- chat
function renderTextChannel(el, c) {
  el.innerHTML = `<div class="main-head"></div>
    <div class="messages" id="messages"></div>
    <form class="composer" id="composer"><div class="composer-box">
      <textarea id="msg-input" rows="1" maxlength="2000" placeholder="Conversar em #${esc(c.name)}"></textarea>
      <button class="send" type="submit" disabled title="Enviar">${icon('send')}</button></div></form>`;
  renderHead();
  const ta = $('#msg-input');
  const sendBtn = $('#composer .send');
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'; sendBtn.disabled = !ta.value.trim(); };
  ta.oninput = grow;
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#composer').requestSubmit(); } };
  $('#composer').onsubmit = async (e) => {
    e.preventDefault();
    const content = ta.value.trim(); if (!content) return;
    ta.value = ''; grow();
    try {
      const m = await api(`/api/channels/${c.id}/messages`, { method: 'POST', body: { content } });
      const list = S.messages[c.id] || (S.messages[c.id] = []);
      if (!list.some((x) => x.id === m.id)) { list.push(m); if (S.channelId === c.id) appendMessage(m); }
    } catch (err) { toast(err.message, true); ta.value = content; grow(); }
  };
  if (window.innerWidth > 800) ta.focus();
  if (S.messages[c.id]) renderMessages(true);
  else {
    $('#messages').innerHTML = '<div class="boot" style="height:100%"><div class="spinner"></div></div>';
    api(`/api/channels/${c.id}/messages`).then((list) => {
      S.messages[c.id] = list; S.hasMore[c.id] = list.length >= 50;
      if (S.channelId === c.id) renderMessages(true);
    }).catch((e) => toast(e.message, true));
  }
}

function messageHtml(m, prev) {
  const head = !prev || prev.author_id !== m.author_id || new Date(m.created_at) - new Date(prev.created_at) > 7 * 60e3 || fmtDay(prev.created_at) !== fmtDay(m.created_at);
  const day = !prev || fmtDay(prev.created_at) !== fmtDay(m.created_at) ? `<div class="day-sep">${fmtDay(m.created_at)}</div>` : '';
  const canDel = m.author_id === S.me.id || current()?.is_owner;
  const user = { display_name: m.author_name, avatar_url: m.author_avatar };
  return `${day}<div class="msg ${head ? 'head' : ''}" data-mid="${m.id}">
    <div class="gutter">${head ? avatarHtml(user) : `<time>${fmtTime(m.created_at)}</time>`}</div>
    <div class="body">${head ? `<div class="meta"><b>${esc(m.author_name)}</b><time>${fmtDay(m.created_at)} às ${fmtTime(m.created_at)}</time></div>` : ''}
      <div class="text">${linkify(m.content)}</div></div>
    ${canDel ? `<div class="actions"><button class="icon-btn" data-del="${m.id}" title="Excluir mensagem">${icon('trash')}</button></div>` : ''}
  </div>`;
}
function renderMessages(toBottom) {
  const box = $('#messages'); if (!box) return;
  const c = chan(); const list = S.messages[c.id] || [];
  const prevH = box.scrollHeight, prevTop = box.scrollTop;
  box.innerHTML = `
    ${S.hasMore[c.id] ? '<button class="btn ghost load-more" id="load-more">Carregar mensagens anteriores</button>' : `
    <div class="welcome"><div class="big">${icon('hash')}</div><h2>Bem-vindo a #${esc(c.name)}!</h2><p>Este é o começo do canal #${esc(c.name)}.</p></div>`}
    ${list.map((m, i) => messageHtml(m, list[i - 1])).join('')}`;
  bindMessageActions(box);
  $('#load-more')?.addEventListener('click', loadOlder);
  if (toBottom) box.scrollTop = box.scrollHeight;
  else box.scrollTop = box.scrollHeight - prevH + prevTop;
}
function appendMessage(m) {
  const box = $('#messages'); if (!box) return;
  const list = S.messages[m.channel_id];
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 150 || m.author_id === S.me.id;
  box.insertAdjacentHTML('beforeend', messageHtml(m, list[list.length - 2]));
  bindMessageActions(box);
  if (nearBottom) box.scrollTop = box.scrollHeight;
}
function bindMessageActions(box) {
  $$('[data-del]', box).forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Excluir esta mensagem?')) return;
      try { await api(`/api/messages/${b.dataset.del}`, { method: 'DELETE' }); } catch (e) { toast(e.message, true); }
    };
  });
}
async function loadOlder() {
  const c = chan(); const list = S.messages[c.id];
  try {
    const older = await api(`/api/channels/${c.id}/messages?before=${encodeURIComponent(list[0]?.created_at || '')}`);
    S.hasMore[c.id] = older.length >= 50;
    S.messages[c.id] = [...older, ...list];
    renderMessages(false);
  } catch (e) { toast(e.message, true); }
}

// =============================================================== chamadas (WebRTC)
let call = null;
let audioCtx = null;

function renderVoiceChannel(el, c) {
  const participants = S.voice[c.id] || [];
  const inThis = call && call.channelId === c.id;
  if (!inThis) {
    el.innerHTML = `<div class="main-head"></div>
      <div class="call-lobby"><div>
        ${participants.length ? `<div class="who">${participants.slice(0, 6).map((p) => avatarHtml(p)).join('')}</div>` : `<div class="empty" style="padding:0"><div class="ico">${icon('volume')}</div></div>`}
        <h2 style="margin:0 0 6px">${esc(c.name)}</h2>
        <p style="color:var(--text-2);margin:0 0 18px">${participants.length ? `${participants.length} ${participants.length === 1 ? 'pessoa está' : 'pessoas estão'} na chamada.` : 'Ninguém na chamada ainda. Entre e chame seus amigos.'}</p>
        <button class="btn primary" id="join-call">${icon('volume')}Entrar na chamada</button>
        ${call ? '<p class="hint" style="margin-top:10px">Você vai sair da chamada atual.</p>' : ''}
      </div></div>`;
    renderHead();
    $('#join-call').onclick = () => joinCall(c.id);
    return;
  }
  el.innerHTML = `<div class="main-head"></div>
    <div class="call"><div class="call-grid" id="call-grid"></div><div class="call-alone" id="call-alone"></div>
    <div class="call-controls" id="call-controls"></div></div>`;
  renderHead();
  call.gridKey = null;
  updateCallGrid();
  renderControls();
}

function renderControls() {
  const el = $('#call-controls'); if (!el || !call) return;
  el.innerHTML = `
    <button class="ctrl ${call.muted ? 'off' : ''}" id="c-mic" title="${call.muted ? 'Ativar microfone' : 'Silenciar'}">${icon(call.muted ? 'micOff' : 'mic')}</button>
    <button class="ctrl ${call.deafened ? 'off' : ''}" id="c-deaf" title="${call.deafened ? 'Ativar áudio' : 'Desativar áudio'}">${icon(call.deafened ? 'headOff' : 'headphones')}</button>
    <button class="ctrl ${call.camTrack ? 'active' : ''}" id="c-cam" title="${call.camTrack ? 'Desligar câmera' : 'Ligar câmera'}">${icon(call.camTrack ? 'video' : 'videoOff')}</button>
    ${navigator.mediaDevices?.getDisplayMedia ? `<button class="ctrl ${call.screenTrack ? 'active' : ''}" id="c-screen" title="${call.screenTrack ? 'Parar de compartilhar' : 'Compartilhar tela'}">${icon('screen')}</button>` : ''}
    <button class="ctrl leave" id="c-leave" title="Sair da chamada">${icon('phoneOff')}</button>`;
  $('#c-mic').onclick = toggleMute;
  $('#c-deaf').onclick = toggleDeafen;
  $('#c-cam').onclick = toggleCamera;
  $('#c-screen')?.addEventListener('click', toggleScreen);
  $('#c-leave').onclick = () => leaveCall();
}

function audioConstraints() {
  const cs = callSettings();
  return { deviceId: cs.micId ? { ideal: cs.micId } : undefined, echoCancellation: cs.echoCancellation, noiseSuppression: cs.noiseSuppression, autoGainControl: cs.autoGainControl };
}

async function joinCall(cid) {
  if (call) leaveCall(true);
  if (!S.iceServers) {
    try { S.iceServers = (await api('/api/config')).iceServers; } catch { S.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]; }
  }
  let audioTrack = null;
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
    audioTrack = st.getAudioTracks()[0];
  } catch (e) {
    toast('Não consegui acessar o microfone — você entrou sem áudio. Verifique a permissão do navegador.', true);
  }
  call = {
    channelId: cid, serverId: S.serverId, audioTrack, camTrack: null, screenTrack: null,
    muted: !audioTrack, deafened: false, peers: new Map(), gridKey: null,
  };
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* sem análise de fala */ } }
  audioCtx?.resume?.();
  if (audioTrack) watchSpeaking('local', new MediaStream([audioTrack]));
  socket.emit('voice:join', cid, (res) => {
    if (!res || res.error) { toast(res?.error || 'Não foi possível entrar.', true); return leaveCall(true); }
    socket.emit('voice:update', { muted: call.muted });
    res.peers.forEach((p) => createPeer(p.socket_id, true));
  });
  call.speakTimer = setInterval(checkSpeaking, 150);
  renderSidebar(); renderMain();
}

function leaveCall(silent) {
  if (!call) return;
  const c = call;
  call = null;
  if (!silent || socket?.connected) socket?.emit('voice:leave');
  c.peers.forEach((_, id) => closePeerOf(c, id));
  [c.audioTrack, c.camTrack, c.screenTrack].forEach((t) => t?.stop());
  clearInterval(c.speakTimer);
  speakers.clear();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  renderSidebar();
  if (S.channelId === c.channelId) renderMain();
}

function createPeer(peerId, initiator) {
  const pc = new RTCPeerConnection({ iceServers: S.iceServers });
  const peer = { pc, pending: [], audio: new MediaStream(), cam: new MediaStream(), screen: new MediaStream(), audioEl: null };
  call.peers.set(peerId, peer);

  const el = document.createElement('audio');
  el.autoplay = true; el.playsInline = true; el.srcObject = peer.audio; el.muted = call.deafened;
  const sink = callSettings().speakerId;
  if (sink && el.setSinkId) el.setSinkId(sink).catch(() => {});
  document.body.appendChild(el);
  peer.audioEl = el;

  pc.onicecandidate = (e) => { if (e.candidate) socket.emit('rtc:signal', { to: peerId, data: { candidate: e.candidate } }); };
  pc.ontrack = (e) => {
    const idx = pc.getTransceivers().indexOf(e.transceiver);
    const target = idx === 0 ? peer.audio : idx === 1 ? peer.cam : peer.screen;
    target.getTracks().forEach((t) => target.removeTrack(t));
    target.addTrack(e.track);
    if (idx === 0) { el.play().catch(() => {}); watchSpeaking(peerId, peer.audio); }
    call && (call.gridKey = null, updateCallGrid());
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' && initiator) makeOffer(peerId, true);
  };
  if (initiator) {
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    applyTracks(peer);
    makeOffer(peerId);
  }
  return peer;
}
async function makeOffer(peerId, iceRestart = false) {
  const peer = call?.peers.get(peerId); if (!peer) return;
  try {
    const offer = await peer.pc.createOffer({ iceRestart });
    await peer.pc.setLocalDescription(offer);
    socket.emit('rtc:signal', { to: peerId, data: { sdp: peer.pc.localDescription } });
  } catch (e) { console.warn('offer', e); }
}
function applyTracks(peer) {
  const t = peer.pc.getTransceivers();
  if (t.length < 3) return;
  t[0].sender.replaceTrack(call.audioTrack || null).catch(() => {});
  t[1].sender.replaceTrack(call.camTrack || null).catch(() => {});
  t[2].sender.replaceTrack(call.screenTrack || null).catch(() => {});
}
async function onSignal({ from, data }) {
  if (!call) return;
  let peer = call.peers.get(from);
  try {
    if (data.sdp) {
      if (!peer) peer = createPeer(from, false);
      const pc = peer.pc;
      await pc.setRemoteDescription(data.sdp);
      if (data.sdp.type === 'offer') {
        pc.getTransceivers().forEach((t) => { t.direction = 'sendrecv'; });
        applyTracks(peer);
        await pc.setLocalDescription(await pc.createAnswer());
        socket.emit('rtc:signal', { to: from, data: { sdp: pc.localDescription } });
      }
      for (const c of peer.pending.splice(0)) await pc.addIceCandidate(c).catch(() => {});
    } else if (data.candidate) {
      if (!peer) return;
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate).catch(() => {});
      else peer.pending.push(data.candidate);
    }
  } catch (e) { console.warn('signal', e); }
}
function closePeerOf(c, id) {
  const peer = c.peers.get(id); if (!peer) return;
  peer.pc.close();
  peer.audioEl?.remove();
  c.peers.delete(id);
  speakers.delete(id);
}
function closePeer(id) { if (call) { closePeerOf(call, id); call.gridKey = null; updateCallGrid(); } }

function toggleMute() {
  if (!call) return;
  if (!call.audioTrack) {
    return navigator.mediaDevices.getUserMedia({ audio: audioConstraints() }).then((st) => {
      if (!call) return;
      call.audioTrack = st.getAudioTracks()[0];
      call.muted = false;
      call.peers.forEach(applyTracks);
      watchSpeaking('local', new MediaStream([call.audioTrack]));
      socket.emit('voice:update', { muted: false });
      renderControls(); renderSidebar();
    }).catch(() => toast('Microfone bloqueado. Libere o acesso nas permissões do navegador.', true));
  }
  call.muted = !call.muted;
  if (call.deafened && !call.muted) { call.deafened = false; applyDeafen(); }
  call.audioTrack.enabled = !call.muted;
  socket.emit('voice:update', { muted: call.muted, deafened: call.deafened });
  renderControls(); renderSidebar();
}
function applyDeafen() { call.peers.forEach((p) => { if (p.audioEl) p.audioEl.muted = call.deafened; }); }
function toggleDeafen() {
  if (!call) return;
  call.deafened = !call.deafened;
  applyDeafen();
  if (call.deafened && call.audioTrack) { call.muted = true; call.audioTrack.enabled = false; }
  if (!call.deafened && call.audioTrack) { call.muted = false; call.audioTrack.enabled = true; }
  socket.emit('voice:update', { muted: call.muted, deafened: call.deafened });
  renderControls(); renderSidebar();
}
async function toggleCamera() {
  if (!call) return;
  if (call.camTrack) {
    call.camTrack.stop(); call.camTrack = null;
  } else {
    const cs = callSettings();
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { deviceId: cs.camId ? { ideal: cs.camId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (!call) return st.getTracks().forEach((t) => t.stop());
      call.camTrack = st.getVideoTracks()[0];
    } catch { return toast('Não consegui acessar a câmera. Verifique a permissão do navegador.', true); }
  }
  call.peers.forEach(applyTracks);
  socket.emit('voice:update', { camera: !!call.camTrack });
  call.gridKey = null;
  renderControls(); updateCallGrid();
}
async function toggleScreen() {
  if (!call) return;
  if (call.screenTrack) {
    call.screenTrack.stop(); call.screenTrack = null;
  } else {
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      if (!call) return st.getTracks().forEach((t) => t.stop());
      call.screenTrack = st.getVideoTracks()[0];
      call.screenTrack.contentHint = 'detail';
      call.screenTrack.onended = () => { if (call?.screenTrack) toggleScreen(); };
    } catch { return; }
  }
  call.peers.forEach(applyTracks);
  socket.emit('voice:update', { screen: !!call.screenTrack });
  call.gridKey = null;
  renderControls(); updateCallGrid();
}

// monta a grade de vídeos
function updateCallGrid() {
  const grid = $('#call-grid');
  if (!grid || !call || S.channelId !== call.channelId) return;
  const parts = S.voice[call.channelId] || [];
  const tiles = [];
  parts.forEach((p) => {
    const mine = p.socket_id === socket.id;
    const peer = call.peers.get(p.socket_id);
    const camOn = mine ? !!call.camTrack : p.camera && peer?.cam.getVideoTracks().length;
    const scrOn = mine ? !!call.screenTrack : p.screen && peer?.screen.getVideoTracks().length;
    if (scrOn) tiles.push({ key: p.socket_id + ':s', p, kind: 'screen', mine });
    tiles.push({ key: p.socket_id + ':c', p, kind: camOn ? 'cam' : 'avatar', mine });
  });
  const key = tiles.map((t) => t.key + t.kind + t.p.muted + t.p.display_name + t.p.avatar_url).join('|');
  $('#call-alone').textContent = parts.length <= 1 ? 'Você está sozinho aqui. Chame seus amigos para este canal.' : '';
  if (key === call.gridKey) return;
  call.gridKey = key;
  const n = tiles.length;
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  grid.style.gridTemplateColumns = window.innerWidth <= 600 && n > 1 ? '1fr' : `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.maxWidth = n <= 1 ? '960px' : '';
  grid.style.margin = '0 auto'; grid.style.width = '100%';
  grid.innerHTML = tiles.map((t) => `
    <div class="tile ${t.kind === 'screen' ? 'screen' : ''} ${t.mine && t.kind === 'cam' ? 'mirror' : ''}" data-sock="${t.kind === 'screen' ? '' : (t.mine ? 'local' : t.p.socket_id)}" data-key="${t.key}">
      ${t.kind === 'avatar' ? avatarHtml(t.p) : '<video autoplay playsinline muted></video>'}
      <div class="label">${t.p.muted ? `<span class="red">${icon('micOff')}</span>` : icon('mic')}${esc(t.p.display_name)}${t.mine ? ' (você)' : ''}${t.kind === 'screen' ? ' — tela' : ''}</div>
      <button class="icon-btn fs" title="Tela cheia">${icon('expand')}</button>
    </div>`).join('');
  tiles.forEach((t) => {
    const tile = grid.querySelector(`[data-key="${CSS.escape(t.key)}"]`);
    const v = tile.querySelector('video');
    if (v) {
      if (t.mine) v.srcObject = new MediaStream([t.kind === 'screen' ? call.screenTrack : call.camTrack]);
      else { const peer = call.peers.get(t.p.socket_id); v.srcObject = t.kind === 'screen' ? peer.screen : peer.cam; }
      v.play().catch(() => {});
    }
    tile.querySelector('.fs').onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else (tile.requestFullscreen || tile.webkitRequestFullscreen)?.call(tile);
    };
  });
}

// indicador de quem está falando
const speakers = new Map();
function watchSpeaking(id, stream) {
  if (!audioCtx || !stream.getAudioTracks().length) return;
  try {
    const src = audioCtx.createMediaStreamSource(stream);
    const an = audioCtx.createAnalyser(); an.fftSize = 512;
    src.connect(an);
    speakers.set(id, { an, buf: new Uint8Array(an.fftSize) });
  } catch { /* ignora */ }
}
function checkSpeaking() {
  if (!call) return;
  speakers.forEach((s, id) => {
    s.an.getByteTimeDomainData(s.buf);
    let sum = 0; for (const v of s.buf) sum += (v - 128) ** 2;
    const level = Math.sqrt(sum / s.buf.length);
    const active = level > 6 && !(id === 'local' && call.muted);
    const sid = id === 'local' ? socket.id : id;
    $$(`[data-sock="${CSS.escape(id)}"], .voice-user[data-sock="${CSS.escape(sid)}"]`).forEach((el) => el.classList.toggle('speaking', active));
  });
}

// =============================================================== diálogos
function openModal(html, { wide = false, onClose } = {}) {
  closeModal();
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal ${wide ? 'wide' : ''}" role="dialog">${html}</div></div>`;
  const ov = root.firstElementChild;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(); });
  root._onClose = onClose;
  const first = root.querySelector('input:not([type=checkbox]), textarea');
  if (first && window.innerWidth > 800) setTimeout(() => first.focus(), 30);
  return root.querySelector('.modal');
}
function closeModal() {
  const root = $('#modal-root');
  if (root._onClose) { const f = root._onClose; root._onClose = null; f(); }
  root.innerHTML = '';
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if ($('.menu')) $('.menu').remove(); else if ($('#modal-root').innerHTML) closeModal(); }
});

function colorGrid(selected) {
  return `<div class="color-grid">${Array.from({ length: 10 }, (_, i) => String(i + 1)).map((k) => `<button type="button" class="g${k} ${k === selected ? 'sel' : ''}" data-color="${k}" aria-label="Cor ${k}"></button>`).join('')}</div>`;
}

function createServerDialog() {
  const st = { name: `Servidor de ${S.me.display_name}`, color: colorFor(S.me.display_name + Date.now()), icon_url: '' };
  const m = openModal(`
    <h2>Crie seu servidor</h2><p class="sub">Um lugar para você e seus amigos conversarem, jogarem e fazerem chamadas.</p>
    <form id="cs-form">
      <div class="upload-row"><div id="cs-prev"></div><div><button type="button" class="btn" id="cs-up">Enviar ícone</button><div class="hint" style="margin-top:6px">Opcional. PNG ou JPG.</div></div></div>
      <div class="field"><label>Nome do servidor</label><input class="input" name="name" maxlength="40" value="${esc(st.name)}"></div>
      <div class="field"><label>Cor</label>${colorGrid(st.color)}</div>
      <div class="error-text" id="cs-err"></div>
      <div class="foot"><button type="button" class="btn ghost" id="cs-cancel">Cancelar</button><button class="btn primary">Criar servidor</button></div>
    </form>`);
  const prev = () => { $('#cs-prev', m).innerHTML = serverIconHtml({ ...st, name: st.name || '?' }); };
  prev();
  $('[name=name]', m).oninput = (e) => { st.name = e.target.value; prev(); };
  $$('[data-color]', m).forEach((b) => { b.onclick = () => { st.color = b.dataset.color; $$('[data-color]', m).forEach((x) => x.classList.toggle('sel', x === b)); prev(); }; });
  $('#cs-up', m).onclick = async () => { const u = await pickImage(); if (u) { st.icon_url = u; prev(); } };
  $('#cs-cancel', m).onclick = closeModal;
  $('#cs-form', m).onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter; btn.disabled = true;
    try {
      const s = await api('/api/servers', { method: 'POST', body: { name: st.name, color: st.color, icon_url: st.icon_url } });
      S.servers.push(s);
      closeModal();
      navigate(`/s/${s.id}`);
      toast('Servidor criado!');
    } catch (err) { $('#cs-err', m).textContent = err.message; btn.disabled = false; }
  };
}

function parseInvite(v) {
  v = v.trim();
  const m = v.match(/\/join\/([\w-]+)/);
  return m ? m[1] : v.replace(/[^\w-]/g, '');
}
function joinDialog() {
  const m = openModal(`
    <h2>Entrar em um servidor</h2><p class="sub">Cole o link ou o código de convite que seu amigo mandou.</p>
    <form id="jf"><div class="field"><label>Link ou código</label><input class="input" name="code" placeholder="ex.: ${location.origin}/join/aB3dE9xy"></div>
    <div class="error-text" id="jf-err"></div>
    <div class="foot"><button type="button" class="btn ghost" id="jf-cancel">Cancelar</button><button class="btn primary">Continuar</button></div></form>`);
  $('#jf-cancel', m).onclick = closeModal;
  $('#jf', m).onsubmit = (e) => {
    e.preventDefault();
    const code = parseInvite(e.target.code.value);
    if (!code) { $('#jf-err', m).textContent = 'Informe um convite.'; return; }
    closeModal();
    navigate(`/join/${code}`);
  };
}

async function showInvite(code) {
  if (!$('.layout')) { S.serverId = null; S.channelId = null; renderApp(); }
  let info;
  try { info = await api(`/api/invite/${encodeURIComponent(code)}`); } catch (e) {
    toast(e.message, true); return navigate('/', true);
  }
  if (info.already_member) return navigate(`/s/${info.id}`, true);
  const m = openModal(`
    <div style="text-align:center">
      <div style="display:flex;justify-content:center;margin-bottom:14px">${serverIconHtml(info, 'server-icon', 'width:72px;height:72px;border-radius:22px;font-size:24px')}</div>
      <p class="sub" style="margin:0 0 4px">Você foi convidado para entrar em</p>
      <h2>${esc(info.name)}</h2>
      <p class="hint" style="margin:0 0 20px">${info.member_count} ${info.member_count === 1 ? 'membro' : 'membros'}</p>
      <button class="btn primary block" id="inv-accept">Aceitar convite</button>
      <button class="btn ghost block" id="inv-no" style="margin-top:8px">Agora não</button>
    </div>`, { onClose: () => { if (location.pathname.startsWith('/join/')) navigate('/', true); } });
  $('#inv-no', m).onclick = closeModal;
  $('#inv-accept', m).onclick = async (e) => {
    e.target.disabled = true;
    try {
      const s = await api(`/api/invite/${encodeURIComponent(code)}/join`, { method: 'POST' });
      if (!S.servers.some((x) => x.id === s.id)) S.servers.push(s);
      $('#modal-root')._onClose = null;
      closeModal();
      navigate(`/s/${s.id}`, true);
      toast(`Você entrou em ${s.name}!`);
    } catch (err) { toast(err.message, true); e.target.disabled = false; }
  };
}

function inviteDialog() {
  const s = current(); if (!s) return;
  const link = `${location.origin}/join/${s.invite_code}`;
  const m = openModal(`
    <h2>Convide amigos para ${esc(s.name)}</h2><p class="sub">Mande este link para quem você quer chamar.</p>
    <div class="invite-box"><input class="input" readonly value="${esc(link)}" id="inv-link"><button class="btn primary" id="inv-copy">${icon('copy')}Copiar</button></div>
    ${navigator.share ? '<button class="btn block" id="inv-share" style="margin-top:10px">Compartilhar…</button>' : ''}
    <p class="hint" style="margin-top:12px">Código: <b>${esc(s.invite_code)}</b></p>
    <div class="foot"><button class="btn ghost" id="inv-close">Fechar</button></div>`);
  $('#inv-copy', m).onclick = () => copyText(link);
  $('#inv-share', m)?.addEventListener('click', () => navigator.share({ title: s.name, text: `Entra no meu servidor ${s.name} no GlobalPath!`, url: link }).catch(() => {}));
  $('#inv-close', m).onclick = closeModal;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Link copiado!'); }
  catch { const i = $('#inv-link') || document.createElement('input'); i.value = t; i.select(); document.execCommand('copy'); toast('Link copiado!'); }
}

function createChannelDialog(kind = 'text') {
  let k = kind;
  const m = openModal(`
    <h2>Criar canal</h2><p class="sub">em ${esc(current().name)}</p>
    <form id="cc">
      <div class="field"><label>Tipo de canal</label>
        <button type="button" class="kind-opt" data-k="text">${icon('hash')}<span><b>Texto</b><small>Mensagens, links e conversas</small></span></button>
        <button type="button" class="kind-opt" data-k="voice">${icon('volume')}<span><b>Voz</b><small>Voz, vídeo e compartilhamento de tela</small></span></button></div>
      <div class="field"><label>Nome do canal</label><input class="input" name="name" maxlength="40" placeholder="novo-canal"></div>
      <div class="error-text" id="cc-err"></div>
      <div class="foot"><button type="button" class="btn ghost" id="cc-cancel">Cancelar</button><button class="btn primary">Criar canal</button></div>
    </form>`);
  const sel = () => $$('[data-k]', m).forEach((b) => b.classList.toggle('sel', b.dataset.k === k));
  sel();
  $$('[data-k]', m).forEach((b) => { b.onclick = () => { k = b.dataset.k; sel(); }; });
  $('#cc-cancel', m).onclick = closeModal;
  $('#cc', m).onsubmit = async (e) => {
    e.preventDefault(); const btn = e.submitter; btn.disabled = true;
    try {
      const c = await api(`/api/servers/${S.serverId}/channels`, { method: 'POST', body: { name: e.target.name.value, kind: k } });
      const l = S.channels[S.serverId]; if (!l.some((x) => x.id === c.id)) l.push(c);
      closeModal();
      navigate(`/s/${S.serverId}/${c.id}`);
    } catch (err) { $('#cc-err', m).textContent = err.message; btn.disabled = false; }
  };
}

function channelSettingsDialog(cid) {
  const c = (S.channels[S.serverId] || []).find((x) => x.id === cid); if (!c) return;
  const m = openModal(`
    <h2>Editar canal</h2><p class="sub">${c.kind === 'voice' ? 'Canal de voz' : 'Canal de texto'}</p>
    <form id="ec"><div class="field"><label>Nome</label><input class="input" name="name" maxlength="40" value="${esc(c.name)}"></div>
    <div class="error-text" id="ec-err"></div>
    <div class="foot" style="justify-content:space-between"><button type="button" class="btn danger" id="ec-del">${icon('trash')}Excluir</button>
    <span style="display:flex;gap:8px"><button type="button" class="btn ghost" id="ec-cancel">Cancelar</button><button class="btn primary">Salvar</button></span></div></form>`);
  $('#ec-cancel', m).onclick = closeModal;
  $('#ec-del', m).onclick = async () => {
    if (!confirm(`Excluir o canal "${c.name}"? As mensagens serão apagadas.`)) return;
    try { await api(`/api/channels/${c.id}`, { method: 'DELETE' }); closeModal(); } catch (err) { $('#ec-err', m).textContent = err.message; }
  };
  $('#ec', m).onsubmit = async (e) => {
    e.preventDefault();
    try { await api(`/api/channels/${c.id}`, { method: 'PATCH', body: { name: e.target.name.value } }); closeModal(); } catch (err) { $('#ec-err', m).textContent = err.message; }
  };
}

function serverMenu(anchor) {
  $('.menu')?.remove();
  const s = current();
  const r = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = `
    <button data-a="invite">Convidar pessoas ${icon('userPlus')}</button>
    ${s.is_owner ? `<button data-a="settings">Configurações do servidor ${icon('settings')}</button>
    <button data-a="text">Criar canal de texto ${icon('hash')}</button>
    <button data-a="voice">Criar canal de voz ${icon('volume')}</button>` : ''}
    <button data-a="members">Membros ${icon('users')}</button>
    <hr>
    ${s.is_owner ? `<button data-a="delete" class="red">Excluir servidor ${icon('trash')}</button>` : `<button data-a="leave" class="red">Sair do servidor ${icon('door')}</button>`}`;
  document.body.appendChild(menu);
  menu.style.left = r.left + 'px'; menu.style.top = r.bottom + 6 + 'px'; menu.style.width = Math.max(220, r.width) + 'px';
  const off = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', off); } };
  setTimeout(() => document.addEventListener('mousedown', off));
  menu.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    menu.remove();
    if (a === 'invite') inviteDialog();
    if (a === 'settings') serverSettings('overview');
    if (a === 'members') serverSettings('members');
    if (a === 'text' || a === 'voice') createChannelDialog(a);
    if (a === 'delete') deleteServer();
    if (a === 'leave') {
      if (!confirm(`Sair de "${s.name}"?`)) return;
      try { await api(`/api/servers/${s.id}/leave`, { method: 'POST' }); } catch (err) { toast(err.message, true); }
    }
  };
}
async function deleteServer() {
  const s = current();
  const name = prompt(`Isso apaga "${s.name}" com todos os canais e mensagens.\nDigite o nome do servidor para confirmar:`);
  if (name === null) return;
  if (name.trim() !== s.name) return toast('O nome não confere — nada foi excluído.', true);
  try { await api(`/api/servers/${s.id}`, { method: 'DELETE' }); closeModal(); toast('Servidor excluído.'); } catch (e) { toast(e.message, true); }
}

// ---------------------------------------------------------------- configurações do servidor
function serverSettings(tab = 'overview') {
  const s = current(); if (!s) return;
  const tabs = s.is_owner ? [['overview', 'Visão geral'], ['members', 'Membros'], ['invites', 'Convites']] : [['members', 'Membros']];
  if (!tabs.some((t) => t[0] === tab)) tab = tabs[0][0];
  const m = openModal(`
    <nav class="settings-nav"><h4>${esc(s.name)}</h4>
      ${tabs.map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join('')}
      ${s.is_owner ? '<button class="red" data-tab="delete">Excluir servidor</button>' : ''}
    </nav>
    <section class="settings-body"><button class="icon-btn close" id="ss-close">${icon('x')}</button><div id="ss-body"></div></section>`, { wide: true });
  $('#ss-close', m).onclick = closeModal;
  const show = (t) => {
    if (t === 'delete') return deleteServer();
    $$('[data-tab]', m).forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    ({ overview: ssOverview, members: ssMembers, invites: ssInvites })[t]($('#ss-body', m));
  };
  $$('[data-tab]', m).forEach((b) => { b.onclick = () => show(b.dataset.tab); });
  show(tab);
}
function ssOverview(el) {
  const s = current();
  const st = { name: s.name, color: s.color, icon_url: s.icon_url };
  el.innerHTML = `<h3>Visão geral do servidor</h3>
    <div class="upload-row"><div id="so-prev"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="so-up">Alterar ícone</button><button class="btn ghost" id="so-rm">Remover</button></div></div>
    <div class="field"><label>Nome do servidor</label><input class="input" id="so-name" maxlength="40" value="${esc(st.name)}"></div>
    <div class="field"><label>Cor</label>${colorGrid(st.color)}</div>
    <div class="error-text" id="so-err"></div>
    <button class="btn primary" id="so-save">Salvar alterações</button>`;
  const prev = () => { $('#so-prev', el).innerHTML = serverIconHtml({ ...st, name: st.name || '?' }); };
  prev();
  $('#so-name', el).oninput = (e) => { st.name = e.target.value; prev(); };
  $$('[data-color]', el).forEach((b) => { b.onclick = () => { st.color = b.dataset.color; $$('[data-color]', el).forEach((x) => x.classList.toggle('sel', x === b)); prev(); }; });
  $('#so-up', el).onclick = async () => { const u = await pickImage(); if (u) { st.icon_url = u; prev(); } };
  $('#so-rm', el).onclick = () => { st.icon_url = ''; prev(); };
  $('#so-save', el).onclick = async (e) => {
    e.target.disabled = true;
    try {
      const upd = await api(`/api/servers/${s.id}`, { method: 'PATCH', body: st });
      Object.assign(s, upd); renderRail(); renderSidebar(); toast('Alterações salvas.');
    } catch (err) { $('#so-err', el).textContent = err.message; }
    e.target.disabled = false;
  };
}
async function ssMembers(el) {
  const s = current();
  el.innerHTML = `<h3>Membros</h3><div class="spinner"></div>`;
  try {
    const list = await api(`/api/servers/${s.id}/members`);
    list.sort((a, b) => (b.is_owner - a.is_owner) || (b.online - a.online) || a.display_name.localeCompare(b.display_name));
    el.innerHTML = `<h3>Membros — ${list.length}</h3>${list.map((u) => `
      <div class="member-row"><span style="position:relative">${avatarHtml(u)}<span class="dot ${u.online ? 'on' : ''}"></span></span>
        <div class="nm"><b>${esc(u.display_name)}</b> ${u.is_owner ? '<span class="badge">DONO</span>' : ''}<small>${u.online ? 'Online' : 'Offline'} · entrou em ${new Date(u.joined_at).toLocaleDateString('pt-BR')}</small></div>
        ${s.is_owner && !u.is_owner ? `<button class="btn danger" data-kick="${u.id}" data-name="${esc(u.display_name)}">Remover</button>` : ''}
      </div>`).join('')}`;
    $$('[data-kick]', el).forEach((b) => {
      b.onclick = async () => {
        if (!confirm(`Remover ${b.dataset.name} do servidor?`)) return;
        try { await api(`/api/servers/${s.id}/members/${b.dataset.kick}`, { method: 'DELETE' }); ssMembers(el); } catch (e) { toast(e.message, true); }
      };
    });
  } catch (e) { el.innerHTML = `<h3>Membros</h3><p class="error-text">${esc(e.message)}</p>`; }
}
function ssInvites(el) {
  const s = current();
  const link = `${location.origin}/join/${s.invite_code}`;
  el.innerHTML = `<h3>Convites</h3>
    <div class="field"><label>Link de convite</label><div class="invite-box"><input class="input" readonly value="${esc(link)}" id="inv-link"><button class="btn primary" id="si-copy">${icon('copy')}Copiar</button></div></div>
    <p class="hint">Gerar um novo link desativa o atual — quem tiver o link antigo não consegue mais entrar.</p>
    <button class="btn" id="si-new">Gerar novo link</button>`;
  $('#si-copy', el).onclick = () => copyText(link);
  $('#si-new', el).onclick = async () => {
    if (!confirm('Gerar um novo link? O link atual deixará de funcionar.')) return;
    try { const upd = await api(`/api/servers/${s.id}/invite`, { method: 'POST' }); Object.assign(s, upd); ssInvites(el); toast('Novo link gerado.'); } catch (e) { toast(e.message, true); }
  };
}

// ---------------------------------------------------------------- configurações do usuário
function userSettings(tab = 'profile') {
  const cleanup = [];
  const m = openModal(`
    <nav class="settings-nav"><h4>Configurações</h4>
      <button data-tab="profile">Perfil</button><button data-tab="call">Voz e vídeo</button><button data-tab="account">Conta</button>
      <button class="red" data-tab="logout">Sair</button></nav>
    <section class="settings-body"><button class="icon-btn close" id="us-close">${icon('x')}</button><div id="us-body"></div></section>`,
  { wide: true, onClose: () => cleanup.splice(0).forEach((f) => f()) });
  $('#us-close', m).onclick = closeModal;
  const show = (t) => {
    if (t === 'logout') { closeModal(); return logout(); }
    cleanup.splice(0).forEach((f) => f());
    $$('[data-tab]', m).forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    ({ profile: usProfile, call: usCall, account: usAccount })[t]($('#us-body', m), cleanup);
  };
  $$('[data-tab]', m).forEach((b) => { b.onclick = () => show(b.dataset.tab); });
  show(tab);
}
function usProfile(el) {
  const st = { display_name: S.me.display_name, avatar_url: S.me.avatar_url };
  el.innerHTML = `<h3>Perfil</h3>
    <div class="upload-row"><div id="up-prev"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="up-up">Alterar foto</button><button class="btn ghost" id="up-rm">Remover</button></div></div>
    <div class="field"><label>Nome de exibição</label><input class="input" id="up-name" maxlength="32" value="${esc(st.display_name)}"></div>
    <div class="field"><label>E-mail</label><input class="input" value="${esc(S.me.email)}" disabled></div>
    <div class="error-text" id="up-err"></div>
    <button class="btn primary" id="up-save">Salvar alterações</button>`;
  const prev = () => { $('#up-prev', el).innerHTML = avatarHtml({ ...st, display_name: st.display_name || '?' }, 'lg'); };
  prev();
  $('#up-name', el).oninput = (e) => { st.display_name = e.target.value; prev(); };
  $('#up-up', el).onclick = async () => { const u = await pickImage(); if (u) { st.avatar_url = u; prev(); } };
  $('#up-rm', el).onclick = () => { st.avatar_url = ''; prev(); };
  $('#up-save', el).onclick = async (e) => {
    e.target.disabled = true; $('#up-err', el).textContent = '';
    try { S.me = await api('/api/me', { method: 'PATCH', body: st }); renderSidebar(); toast('Perfil atualizado.'); }
    catch (err) { $('#up-err', el).textContent = err.message; }
    e.target.disabled = false;
  };
}
async function usCall(el, cleanup) {
  const cs = callSettings();
  el.innerHTML = `<h3>Voz e vídeo</h3><div class="spinner"></div>`;
  let devices = [];
  let testStream = null, camStream = null, raf = 0;
  const stopTest = () => { cancelAnimationFrame(raf); testStream?.getTracks().forEach((t) => t.stop()); testStream = null; };
  const stopCam = () => { camStream?.getTracks().forEach((t) => t.stop()); camStream = null; };
  cleanup.push(stopTest, stopCam);
  try {
    // pede permissão rápida para os nomes dos dispositivos aparecerem
    if (!(await navigator.mediaDevices.enumerateDevices()).some((d) => d.label)) {
      const t = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      t?.getTracks().forEach((x) => x.stop());
    }
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch { /* sem dispositivos */ }
  const opts = (kind, sel) => `<option value="">Padrão do sistema</option>` + devices.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'default')
    .map((d, i) => `<option value="${esc(d.deviceId)}" ${d.deviceId === sel ? 'selected' : ''}>${esc(d.label || `Dispositivo ${i + 1}`)}</option>`).join('');
  const canSink = 'setSinkId' in HTMLMediaElement.prototype;
  el.innerHTML = `<h3>Voz e vídeo</h3>
    <div class="field"><label>Microfone</label><select class="input" id="uc-mic">${opts('audioinput', cs.micId)}</select></div>
    ${canSink ? `<div class="field"><label>Saída de áudio</label><select class="input" id="uc-spk">${opts('audiooutput', cs.speakerId)}</select></div>` : ''}
    <div class="field"><label>Teste de microfone</label><div class="meter"><i id="uc-meter"></i></div>
      <div><button class="btn" id="uc-test" style="margin-top:8px">Testar microfone</button></div></div>
    <div class="switch"><span>Cancelamento de eco</span><input type="checkbox" id="uc-echo" ${cs.echoCancellation ? 'checked' : ''}></div>
    <div class="switch"><span>Supressão de ruído</span><input type="checkbox" id="uc-noise" ${cs.noiseSuppression ? 'checked' : ''}></div>
    <div class="switch" style="margin-bottom:18px"><span>Ganho automático</span><input type="checkbox" id="uc-gain" ${cs.autoGainControl ? 'checked' : ''}></div>
    <div class="field"><label>Câmera</label><select class="input" id="uc-cam">${opts('videoinput', cs.camId)}</select></div>
    <div class="cam-preview hidden" id="uc-prev"><video autoplay playsinline muted></video></div>
    <button class="btn" id="uc-camtest">Testar câmera</button>
    <p class="hint" style="margin-top:14px">As mudanças valem na próxima vez que você entrar em uma chamada.</p>`;
  const persist = () => {
    saveCallSettings({ micId: $('#uc-mic', el).value, speakerId: $('#uc-spk', el)?.value || '', camId: $('#uc-cam', el).value,
      echoCancellation: $('#uc-echo', el).checked, noiseSuppression: $('#uc-noise', el).checked, autoGainControl: $('#uc-gain', el).checked });
  };
  $$('select, input', el).forEach((x) => x.addEventListener('change', persist));
  $('#uc-spk', el)?.addEventListener('change', (e) => { call?.peers.forEach((p) => p.audioEl?.setSinkId?.(e.target.value).catch(() => {})); });
  $('#uc-test', el).onclick = async (e) => {
    if (testStream) { stopTest(); e.target.textContent = 'Testar microfone'; $('#uc-meter', el).style.width = '0'; return; }
    try {
      testStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
      const ctx = audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      ctx.resume();
      const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(testStream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2;
        const meter = $('#uc-meter', el); if (!meter) return stopTest();
        meter.style.width = Math.min(100, Math.sqrt(s / buf.length) * 4) + '%';
        raf = requestAnimationFrame(loop);
      };
      loop();
      e.target.textContent = 'Parar teste';
    } catch { toast('Não consegui acessar o microfone.', true); }
  };
  $('#uc-camtest', el).onclick = async (e) => {
    if (camStream) { stopCam(); $('#uc-prev', el).classList.add('hidden'); e.target.textContent = 'Testar câmera'; return; }
    try {
      const id = $('#uc-cam', el).value;
      camStream = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { ideal: id } } : true });
      $('#uc-prev', el).classList.remove('hidden'); $('#uc-prev video', el).srcObject = camStream;
      e.target.textContent = 'Parar câmera';
    } catch { toast('Não consegui acessar a câmera.', true); }
  };
}
function usAccount(el) {
  el.innerHTML = `<h3>Conta</h3>
    <form id="pw"><div class="field"><label>Senha atual</label><input class="input" type="password" name="current" autocomplete="current-password"></div>
    <div class="field"><label>Nova senha</label><input class="input" type="password" name="next" autocomplete="new-password"></div>
    <div class="error-text" id="pw-err"></div><button class="btn primary">Alterar senha</button></form>`;
  $('#pw', el).onsubmit = async (e) => {
    e.preventDefault(); $('#pw-err', el).textContent = '';
    try { await api('/api/me/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('Senha alterada.'); }
    catch (err) { $('#pw-err', el).textContent = err.message; }
  };
}

// =============================================================== início
window.addEventListener('beforeunload', () => { if (call) socket?.emit('voice:leave'); });
window.addEventListener('resize', () => { if (call) { call.gridKey = null; updateCallGrid(); } });

(async () => {
  try {
    S.me = await api('/api/me');
    await startSession();
  } catch {
    renderAuth(location.pathname.startsWith('/join/') ? 'register' : 'login');
  }
})();
})();
