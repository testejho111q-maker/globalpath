/* Lumix — front-end (JavaScript puro, sem build) */
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
  shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  megaphone: '<path d="m3 11 18-8v18L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  caret: '<path d="m9 18 6-6-6-6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  paperclip: '<path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  userMinus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M23 11h-6"/>',
  radio: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
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
  roles: {},         // sid -> cargos
  dmId: null,
  streamer: false,
  friends: { friends: [], incoming: [], outgoing: [] },
  homeView: 'friends',
  friendsTab: 'online',
  dms: [],
  ssRefresh: null,
  collapsed: (() => { try { return new Set(JSON.parse(localStorage.getItem('gp_collapsed') || '[]')); } catch { return new Set(); } })(),
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
  const dm = p.match(/^\/dm\/([\w]+)/);
  if (m && S.servers.some((s) => s.id === m[1])) {
    S.dmId = null;
    await openServer(m[1], m[2]);
  } else if (dm && S.dms.some((d) => d.id === dm[1])) {
    S.serverId = null; S.channelId = null; S.dmId = dm[1];
    renderApp();
  } else {
    S.serverId = null; S.channelId = null; S.dmId = null;
    S.homeView = p === '/requests' ? 'requests' : 'friends';
    if (p !== '/' && p !== '/requests') history.replaceState({}, '', '/');
    renderApp();
  }
}

// =============================================================== autenticação
function renderAuth(mode = 'login') {
  const isLogin = mode === 'login';
  const joining = location.pathname.startsWith('/join/');
  $('#app').innerHTML = `
  <div class="auth">
    <div class="auth-hero"><img src="/banner.jpg" alt="Lumix — Seu espaço para se conectar."></div>
    <form class="auth-card" id="auth-form" novalidate>
      <div class="brand"><img class="brand-logo" src="/logo-192.png" alt=""><span><b>LUMIX</b><small>Seu espaço para se conectar.</small></span></div>
      <h1>${isLogin ? 'Bem-vindo de volta!' : 'Criar uma conta'}</h1>
      <p class="sub">${joining ? 'Entre para aceitar o convite do servidor.' : isLogin ? 'Que bom te ver de novo.' : 'Leva menos de um minuto.'}</p>
      ${isLogin ? '' : `<div class="field"><label>Nome de exibição</label><input class="input" name="display_name" maxlength="32" autocomplete="nickname" required></div>
      <div class="field"><label>Nome de usuário</label><div class="at-input"><span>@</span><input class="input" name="username" maxlength="20" autocomplete="username" placeholder="seunome" spellcheck="false"></div><span class="hint">É com ele que seus amigos te adicionam. Letras minúsculas, números, _ e ponto.</span></div>`}
      <div class="field"><label>E-mail</label><input class="input" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label>Senha</label><input class="input" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required></div>
      <div class="error-text" id="auth-err"></div>
      <button class="btn primary block" type="submit">${isLogin ? 'Entrar' : 'Criar conta'}</button>
      <div class="switch-link">${isLogin ? 'Precisa de uma conta? <button type="button" id="auth-switch">Cadastre-se</button>' : 'Já tem uma conta? <button type="button" id="auth-switch">Entrar</button>'}</div>
    </form>
  </div>`;
  $('#auth-switch').onclick = () => renderAuth(isLogin ? 'register' : 'login');
  const un = $('[name=username]');
  if (un) {
    let touched = false;
    un.oninput = () => { touched = true; un.value = un.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''); };
    $('[name=display_name]').oninput = (e) => { if (!touched) un.value = e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20); };
  }
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
  [S.servers, S.dms] = await Promise.all([api('/api/servers'), api('/api/dms').catch(() => [])]);
  await loadFriends();
  connectSocket();
  route();
}

async function logout() {
  if (call) leaveCall();
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  socket?.disconnect(); socket = null;
  Object.assign(S, { me: null, servers: [], serverId: null, channelId: null, dmId: null, dms: [], channels: {}, messages: {}, voice: {}, roles: {} });
  history.replaceState({}, '', '/');
  renderAuth('login');
}

// =============================================================== socket
function connectSocket() {
  socket = io({ transports: ['websocket', 'polling'] });
  socket.on('connect', () => { if (S.serverId) refreshVoice(S.serverId); });
  socket.on('connect_error', (e) => { if (e.message === 'unauthorized') logout(); });

  socket.on('message:created', (m) => addMessage(m.channel_id, m));
  socket.on('dm:message', ({ dm, message }) => {
    const viewing = !S.serverId && S.dmId === dm.id && document.visibilityState === 'visible';
    if (viewing) dm.unread = 0;
    upsertDm(dm);
    addMessage(dm.id, message);
    if (viewing && message.author_id !== S.me.id) api(`/api/dms/${dm.id}/read`, { method: 'POST' }).catch(() => {});
    if (!viewing && message.author_id !== S.me.id) {
      toast(`💬 ${message.author_name}: ${message.content.slice(0, 60)}`);
      try { if (document.visibilityState !== 'visible' && Notification?.permission === 'granted') new Notification(message.author_name, { body: message.content.slice(0, 120) }); } catch { /* ignora */ }
    }
    renderRail();
    if (!S.serverId) renderSidebar();
  });
  socket.on('friends:update', async () => {
    await loadFriends();
    renderRail();
    if (!S.serverId) { renderSidebar(); if (!S.dmId && !(S.homeView === 'friends' && S.friendsTab === 'add' && $('#add-form'))) renderMain(); }
  });
  socket.on('friends:request', ({ from, message }) => {
    toast(`👋 ${from.display_name} quer ser seu amigo${message ? `: “${message}”` : ''}`);
  });
  socket.on('dm:removed', ({ id }) => {
    S.dms = S.dms.filter((d) => d.id !== id);
    if (!S.serverId && S.dmId === id) navigate('/', true); else { renderRail(); if (!S.serverId) renderSidebar(); }
  });
  socket.on('dm:deleted', ({ id, dm_id }) => {
    if (S.messages[dm_id]) S.messages[dm_id] = S.messages[dm_id].filter((m) => m.id !== id);
    if (!S.serverId && S.dmId === dm_id) renderMessages(true);
  });
  socket.on('message:deleted', ({ id, channel_id }) => {
    if (S.messages[channel_id]) S.messages[channel_id] = S.messages[channel_id].filter((m) => m.id !== id);
    if (channel_id === threadId()) renderMessages(true);
  });
  socket.on('server:refresh', ({ server_id }) => scheduleRefresh(server_id));
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
    if (threadFor()) renderMessages(true);
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

// recarrega servidor, canais e cargos quando algo muda (cargos, canais, permissões)
const refreshTimers = {};
function scheduleRefresh(sid) {
  clearTimeout(refreshTimers[sid]);
  refreshTimers[sid] = setTimeout(() => refreshServer(sid), 120);
}
async function refreshServer(sid) {
  if (!S.servers.some((x) => x.id === sid)) return;
  try {
    const [srv, chs, rl] = await Promise.all([api(`/api/servers/${sid}`), api(`/api/servers/${sid}/channels`), api(`/api/servers/${sid}/roles`)]);
    const i = S.servers.findIndex((x) => x.id === sid); if (i < 0) return;
    S.servers[i] = srv; S.channels[sid] = chs; S.roles[sid] = rl;
    Object.keys(S.messages).forEach((cid) => { if (cid !== S.channelId && !chs.some((c) => c.id === cid)) delete S.messages[cid]; });
    if (call && call.serverId === sid && !chs.some((c) => c.id === call.channelId)) leaveCall();
    renderRail();
    if (sid !== S.serverId) return;
    if (S.channelId && !chs.some((c) => c.id === S.channelId)) return navigate(`/s/${sid}`, true);
    renderSidebar();
    const c = chan();
    if (c?.kind === 'text') {
      const box = $('#messages');
      const canNow = !!$('#composer');
      const attachKey = JSON.stringify(c.can_attach || {});
      if (canNow !== !!c.can_post || !box || $('#composer')?.dataset.attach !== attachKey) renderMain(); else renderHead();
    } else if (c?.kind === 'voice' && !(call && call.channelId === c.id)) renderMain();
    else renderHead();
    S.ssRefresh?.();
  } catch { /* tenta de novo no próximo evento */ }
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
    <div class="rail-item ${!S.serverId ? 'active' : ''}" data-tip="Conversas"><span class="pill"></span>
      <button class="rail-add home" data-go="/" aria-label="Conversas"><img src="/logo-192.png" alt=""></button>${totalUnread() ? `<span class="rail-badge">${totalUnread() > 99 ? '99+' : totalUnread()}</span>` : ''}</div>
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
    body = renderHomeSidebar();
  } else {
    const chs = S.channels[s.id] || [];
    const p = s.perms || {};
    const cats = s.categories || [];
    const known = new Set(cats.map((c) => c.id));
    const loose = chs.filter((c) => !known.has(c.category_id));
    const chRow = (c) => `
      <button class="channel ${c.id === S.channelId ? 'active' : ''}" data-ch="${c.id}">
        ${icon(c.kind === 'voice' ? 'volume' : c.read_only ? 'megaphone' : 'hash')}<span class="n">${esc(c.name)}</span>
        ${c.allowed_roles?.length ? `<span class="ch-lock" title="Canal privado">${icon('lock')}</span>` : ''}
        ${p.manage_channels ? `<span class="ch-actions"><span class="icon-btn" data-edit-ch="${c.id}" title="Editar canal">${icon('settings')}</span></span>` : ''}
      </button>
      ${c.kind === 'voice' ? `<div class="voice-users">${(S.voice[c.id] || []).map((vp) => `
        <div class="voice-user" data-sock="${vp.socket_id}">${avatarHtml(vp, 'sm')}<span>${esc(vp.display_name)}</span>
          <span class="flags">${vp.screen ? '<span class="tag">AO VIVO</span>' : ''}${vp.camera ? icon('video') : ''}${vp.muted ? icon('micOff') : ''}${vp.deafened ? icon('headOff') : ''}</span></div>`).join('')}</div>` : ''}`;
    const catBlock = (cat) => {
      const list = chs.filter((c) => c.category_id === cat.id);
      if (!list.length && !p.manage_channels) return '';
      const closed = S.collapsed.has(cat.id);
      const shown = closed ? list.filter((c) => c.id === S.channelId || (c.kind === 'voice' && (S.voice[c.id] || []).length)) : list;
      return `<div class="cat ${closed ? 'closed' : ''}"><button class="cat-name" data-toggle-cat="${cat.id}">${icon('caret', 'caret')}<span>${esc(cat.name)}</span></button>
        ${p.manage_channels ? `<span class="cat-actions"><button class="icon-btn" data-edit-cat="${cat.id}" title="Editar categoria">${icon('settings')}</button><button class="icon-btn" data-new-in="${cat.id}" title="Criar canal">${icon('plus')}</button></span>` : ''}</div>
        ${shown.map(chRow).join('')}`;
    };
    body = `
      <div class="sidebar-head">
        <button class="server-name-btn" id="server-menu-btn">${serverIconHtml(s, 'mini-icon')}<span class="n">${esc(s.name)}</span>${icon('chevron')}</button>
      </div>
      <div class="channels">
        ${loose.map(chRow).join('')}
        ${cats.map(catBlock).join('')}
        ${!chs.length && !cats.length ? '<p class="hint" style="padding:8px">Nenhum canal ainda.</p>' : ''}
      </div>`;
  }
  const inCall = call ? (Object.values(S.channels).flat().find((c) => c.id === call.channelId)) : null;
  const callServer = call ? S.servers.find((x) => x.id === call.serverId) : null;
  el.innerHTML = body + `
    ${inCall ? `<div class="voice-bar"><div class="status">
      <div class="info" id="vb-open">${S.streamer ? '<span class="streamer-tag">MODO STREAMER</span>' : ''}<b>Voz conectada</b><small>${esc(inCall.name)} / ${esc(callServer?.name || '')}</small></div>
      <button class="icon-btn" id="vb-leave" title="Desconectar">${icon('phoneOff')}</button></div></div>` : ''}
    <div class="user-bar">
      <button class="me" id="me-btn" title="Configurações de perfil">
        <span style="position:relative">${avatarHtml(S.me)}<span class="dot on"></span></span>
        <span style="min-width:0;text-align:left"><div class="nm">${esc(S.me.display_name)}</div><div class="st">${S.streamer ? 'Modo streamer' : '@' + esc(S.me.username || '')}</div></span>
      </button>
      ${call ? `<button class="icon-btn ${call.muted ? 'on' : ''}" id="ub-mute" title="${call.muted ? 'Ativar microfone' : 'Silenciar'}">${icon(call.muted ? 'micOff' : 'mic')}</button>
      <button class="icon-btn ${call.deafened ? 'on' : ''}" id="ub-deaf" title="${call.deafened ? 'Ativar áudio' : 'Desativar áudio'}">${icon(call.deafened ? 'headOff' : 'headphones')}</button>` : ''}
      <button class="icon-btn ${S.streamer ? 'on' : ''}" id="ub-streamer" title="Modo streamer (${esc(KEYS.streamer || 'sem atalho')})">${icon('radio')}</button>
      <button class="icon-btn" id="ub-settings" title="Configurações">${icon('settings')}</button>
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
  $$('[data-new-in]', el).forEach((b) => { b.onclick = () => createChannelDialog('text', b.dataset.newIn); });
  $$('[data-edit-cat]', el).forEach((b) => { b.onclick = () => categoryDialog(b.dataset.editCat); });
  $$('[data-toggle-cat]', el).forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.toggleCat;
      if (S.collapsed.has(k)) S.collapsed.delete(k); else S.collapsed.add(k);
      try { localStorage.setItem('gp_collapsed', JSON.stringify([...S.collapsed])); } catch { /* ignora */ }
      renderSidebar();
    };
  });
  $('#server-menu-btn')?.addEventListener('click', (e) => serverMenu(e.currentTarget));
  $('#dm-new')?.addEventListener('click', newDmDialog);
  $('#home-search')?.addEventListener('click', () => quickSwitcher());
  $('#me-btn').onclick = () => userSettings('profile');
  $('#ub-settings').onclick = () => userSettings('profile');
  $('#ub-mute')?.addEventListener('click', toggleMute);
  $('#ub-deaf')?.addEventListener('click', toggleDeafen);
  $('#ub-streamer')?.addEventListener('click', toggleStreamer);
  $('#vb-leave')?.addEventListener('click', () => leaveCall());
  $('#vb-open')?.addEventListener('click', () => { setNav(false); navigate(`/s/${call.serverId}/${call.channelId}`); });
}

function renderHead() {
  const h = $('.main-head'); if (!h) return;
  const c = chan();
  h.innerHTML = `<button class="icon-btn menu-toggle" id="menu-toggle">${icon('menu')}</button>
    ${!S.serverId && S.dmId ? (() => { const d = S.dms.find((x) => x.id === S.dmId); return d ? `${avatarHtml(d.user, 'sm')}<span>${esc(d.user.display_name)}</span><span class="topic">@${esc(d.user.username || '')} · ${d.user.online ? 'Online' : 'Offline'}</span>${!S.friends.friends.some((f) => f.user.id === d.user.id) && d.user.username ? `<button class="btn ghost sm-btn" id="dm-add-friend" style="margin-left:auto">${icon('userPlus')}Adicionar amigo</button>` : ''}` : ''; })() : c ? `${icon(c.kind === 'voice' ? 'volume' : c.read_only ? 'megaphone' : 'hash', 'muted')}<span>${esc(c.name)}</span>${c.topic ? `<span class="topic">${esc(c.topic)}</span>` : ''}` : `<span>${esc(current()?.name || 'Conversas')}</span>`}
    <span class="spacer"></span>
    ${current() ? `<button class="icon-btn" id="head-invite" title="Convidar pessoas">${icon('userPlus')}</button>
    <button class="icon-btn" id="head-members" title="Membros">${icon('users')}</button>` : ''}`;
  $('#menu-toggle').onclick = () => setNav(true);
  $('#head-invite')?.addEventListener('click', () => inviteDialog());
  $('#dm-add-friend')?.addEventListener('click', () => { const d = S.dms.find((x) => x.id === S.dmId); if (d) addFriendByUsername(d.user.username); });
  $('#head-members')?.addEventListener('click', () => serverSettings('members'));
}

function renderMain() {
  const el = $('#main'); if (!el) return;
  const s = current();
  const c = chan();
  if (!s && S.dmId && threadFor()) return renderThread(el);
  if (!s && S.homeView === 'requests') return renderRequestsPage(el);
  if (!s && (S.friends.friends.length || S.friends.incoming.length || S.friends.outgoing.length || S.friendsTab !== 'online' || S.dms.length)) return renderFriendsPage(el);
  if (!s) {
    el.innerHTML = `<div class="main-head"></div>
      <div class="empty"><div>
        <div class="ico">${icon('compass')}</div>
        <h2>Olá, ${esc(S.me.display_name)}!</h2>
        <p>${S.servers.length ? 'Escolha um servidor na barra lateral ou crie um novo.' : 'Crie seu primeiro servidor ou entre em um com um convite de um amigo.'}</p>
        <div class="row"><button class="btn primary" id="e-create">${icon('plus')}Criar servidor</button><button class="btn" id="e-ai">${icon('sparkle')}Montar com IA</button><button class="btn" id="e-join">${icon('link')}Tenho um convite</button><button class="btn" id="e-friend">${icon('userPlus')}Adicionar amigo</button></div>
        <p class="hint" style="margin-top:18px">Dica: aperte <kbd>?</kbd> para ver as teclas de atalho.</p>
      </div></div>`;
    renderHead();
    $('#e-create').onclick = () => createServerDialog();
    $('#e-join').onclick = () => joinDialog();
    $('#e-friend').onclick = () => { S.friendsTab = 'add'; renderFriendsPage(el); };
    $('#e-ai').onclick = () => aiBuildDialog();
    return;
  }
  if (!c) {
    el.innerHTML = `<div class="main-head"></div><div class="empty"><div><div class="ico">${icon('hash')}</div><h2>Nenhum canal</h2><p>${s.perms?.manage_channels ? 'Crie um canal para começar.' : 'Este servidor ainda não tem canais que você possa ver.'}</p></div></div>`;
    renderHead();
    return;
  }
  if (c.kind === 'text') return renderThread(el);
  return renderVoiceChannel(el, c);
}

// =============================================================== servidor / canais
async function openServer(sid, cid) {
  const changed = S.serverId !== sid;
  S.serverId = sid;
  if (!S.channels[sid] || !S.roles[sid]) {
    try {
      const [chs, rl] = await Promise.all([api(`/api/servers/${sid}/channels`), api(`/api/servers/${sid}/roles`)]);
      S.channels[sid] = chs; S.roles[sid] = rl;
    } catch (e) { toast(e.message, true); return navigate('/', true); }
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

// ---------------------------------------------------------------- chat (canais de texto e conversas privadas)
const threadId = () => (S.serverId ? S.channelId : S.dmId);
function threadFor() {
  if (!S.serverId) {
    const d = S.dms.find((x) => x.id === S.dmId); if (!d) return null;
    return { id: d.id, dm: d, base: `/api/dms/${d.id}/messages`, canPost: true, attach: { images: true, files: true, audio: true }, placeholder: `Conversar com @${d.user.display_name}`,
      canDel: (m) => m.author_id === S.me.id, delUrl: (x) => `/api/dm-messages/${x}`,
      welcome: `<div class="welcome">${avatarHtml(d.user, 'lg')}<h2 style="margin-top:12px">${esc(d.user.display_name)}</h2><p>Este é o começo da sua conversa com <b>${esc(d.user.display_name)}</b>.</p></div>` };
  }
  const c = chan(); if (!c || c.kind !== 'text') return null;
  const attach = c.can_attach || { images: true, files: true, audio: true };
  const textOnly = !attach.images && !attach.files && !attach.audio;
  return { id: c.id, chan: c, base: `/api/channels/${c.id}/messages`, canPost: c.can_post, attach, placeholder: `Conversar em #${c.name}${textOnly ? ' (só texto)' : ''}`,
    canDel: (m) => m.author_id === S.me.id || !!current()?.perms?.manage_messages, delUrl: (x) => `/api/messages/${x}`,
    welcome: `<div class="welcome"><div class="big">${icon('hash')}</div><h2>Bem-vindo a #${esc(c.name)}!</h2><p>${c.topic ? esc(c.topic) : `Este é o começo do canal #${esc(c.name)}.`}</p></div>` };
}
function renderThread(el) {
  const t = threadFor(); if (!t) return;
  const canFiles = t.attach.images || t.attach.files || t.attach.audio;
  const canVoice = t.attach.audio && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
  el.innerHTML = `<div class="main-head"></div>
    <div class="messages" id="messages"></div>
    ${t.canPost ? `<form class="composer" id="composer" data-attach="${esc(JSON.stringify(t.chan?.can_attach || {}))}">
      <div class="pending hidden" id="pending"></div>
      <div class="composer-box" id="composer-box">
        ${canFiles ? `<button type="button" class="attach" id="attach-btn" title="Enviar ${[t.attach.images && 'imagem', t.attach.files && 'arquivo', t.attach.audio && 'áudio'].filter(Boolean).join(', ')}">${icon('plus')}</button>` : ''}
        <textarea id="msg-input" rows="1" maxlength="2000" placeholder="${esc(t.placeholder)}"></textarea>
        ${canVoice ? `<button type="button" class="attach" id="rec-btn" title="Gravar mensagem de voz">${icon('mic')}</button>` : ''}
        <button class="send" type="submit" disabled title="Enviar">${icon('send')}</button>
      </div>
      <div class="rec-bar hidden" id="rec-bar"><span class="rec-dot"></span><span id="rec-time">0:00</span><span class="hint">Gravando áudio…</span><span class="spacer"></span>
        <button type="button" class="btn ghost" id="rec-cancel">Cancelar</button><button type="button" class="btn primary" id="rec-send">${icon('send')}Enviar</button></div>
      <input type="file" id="file-input" multiple class="hidden" accept="${[t.attach.images && 'image/*', t.attach.audio && 'audio/*', t.attach.files && '*/*'].filter(Boolean).join(',')}">
    </form>`
    : `<div class="composer"><div class="composer-box readonly">${icon('lock')}Você não tem permissão para enviar mensagens neste canal.</div></div>`}`;
  renderHead();
  if (t.dm?.request) {
    $('#composer')?.insertAdjacentHTML('beforebegin', `<div class="req-banner">${avatarHtml(t.dm.user, 'sm')}<span><b>${esc(t.dm.user.display_name)}</b> ainda não é seu amigo e quer conversar com você.</span>
      <button class="btn ghost" id="req-no">Recusar</button><button class="btn primary" id="req-yes">Aceitar</button></div>`);
    $('#req-yes').onclick = () => acceptDm(t.dm.id, true);
    $('#req-no').onclick = () => rejectDm(t.dm.id);
  }
  const box = $('#messages');
  box._stick = true;
  box.addEventListener('scroll', () => { box._stick = box.scrollHeight - box.scrollTop - box.clientHeight < 120; });
  box.addEventListener('load', (e) => { if (/IMG|VIDEO/.test(e.target.tagName) && box._stick) box.scrollTop = box.scrollHeight; }, true);
  loadMessages(t);
  if (!t.canPost) return;
  const ta = $('#msg-input');
  const sendBtn = $('#composer .send');
  const pending = [];
  const busy = () => pending.some((p) => !p.att && !p.error);
  const grow = () => {
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
    sendBtn.disabled = busy() || (!ta.value.trim() && !pending.some((p) => p.att));
  };
  const drawPending = () => {
    const tray = $('#pending');
    tray.classList.toggle('hidden', !pending.length);
    tray.innerHTML = pending.map((p, i) => `
      <div class="pend ${p.error ? 'err' : ''}">
        ${p.preview ? `<img src="${p.preview}" alt="">` : `<span class="pend-ico">${icon(p.kind === 'audio' ? 'mic' : 'file')}</span>`}
        <span class="pend-name">${esc(p.name)}<small>${p.error ? esc(p.error) : p.att ? fmtSize(p.size) : `Enviando… ${Math.round(p.progress * 100)}%`}</small></span>
        <button type="button" class="icon-btn" data-rm="${i}" title="Remover">${icon('x')}</button>
        ${!p.att && !p.error ? `<i class="pend-bar" style="width:${Math.round(p.progress * 100)}%"></i>` : ''}
      </div>`).join('');
    $$('[data-rm]', tray).forEach((b) => { b.onclick = () => { const p = pending.splice(+b.dataset.rm, 1)[0]; if (p?.preview) URL.revokeObjectURL(p.preview); drawPending(); grow(); }; });
    grow();
  };
  const addFiles = (files) => {
    for (const file of files) {
      if (pending.length >= 10) { toast('No máximo 10 anexos por mensagem.', true); break; }
      const kind = fileKind(file.type);
      const key = kind === 'image' ? 'images' : kind === 'audio' ? 'audio' : 'files';
      if (!t.attach[key]) { toast({ images: 'Este canal não aceita imagens.', audio: 'Este canal não aceita áudios.', files: 'Este canal não aceita arquivos.' }[key], true); continue; }
      if (file.size > MAX_FILE) { toast(`"${file.name}" passa de ${MAX_FILE / 1048576} MB.`, true); continue; }
      const p = { name: file.name || 'arquivo', size: file.size, kind, progress: 0, preview: kind === 'image' ? URL.createObjectURL(file) : '' };
      pending.push(p);
      uploadFile(file, (x) => { p.progress = x; drawPending(); })
        .then((att) => { p.att = att; drawPending(); })
        .catch((err) => { p.error = err.message; drawPending(); });
    }
    drawPending();
  };
  const send = async (extraIds = []) => {
    const content = ta.value.trim();
    const ids = [...pending.filter((p) => p.att).map((p) => p.att.id), ...extraIds];
    if (!content && !ids.length) return;
    ta.value = '';
    const old = pending.splice(0);
    drawPending();
    try {
      const m = await api(t.base, { method: 'POST', body: { content, attachments: ids } });
      if (t.dm?.request) { t.dm.request = false; $('.req-banner')?.remove(); renderSidebar(); renderRail(); }
      old.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      addMessage(t.id, m);
    } catch (err) { toast(err.message, true); ta.value = content; pending.push(...old.filter((p) => !extraIds.includes(p.att?.id))); drawPending(); }
  };
  ta.oninput = grow;
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!sendBtn.disabled) $('#composer').requestSubmit(); } };
  ta.onpaste = (e) => { const files = [...(e.clipboardData?.files || [])]; if (files.length) { e.preventDefault(); addFiles(files); } };
  $('#composer').onsubmit = (e) => { e.preventDefault(); if (!busy()) send(); };
  $('#attach-btn')?.addEventListener('click', () => $('#file-input').click());
  $('#file-input').onchange = (e) => { addFiles([...e.target.files]); e.target.value = ''; };
  // arrastar e soltar arquivos na conversa
  if (canFiles) {
    const main = $('#main');
    main.ondragover = (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); main.classList.add('dropping'); } };
    main.ondragleave = (e) => { if (e.target === main || !main.contains(e.relatedTarget)) main.classList.remove('dropping'); };
    main.ondrop = (e) => { e.preventDefault(); main.classList.remove('dropping'); addFiles([...(e.dataTransfer?.files || [])]); };
  } else { const main = $('#main'); main.ondragover = main.ondrop = main.ondragleave = null; }
  // mensagem de voz
  let rec = null;
  const recUi = (on) => { $('#composer-box').classList.toggle('hidden', on); $('#rec-bar').classList.toggle('hidden', !on); };
  const stopRec = (keep) => new Promise((resolve) => {
    if (!rec) return resolve(null);
    const r = rec; rec = null;
    clearInterval(r.timer);
    r.mr.onstop = () => { r.stream.getTracks().forEach((x) => x.stop()); resolve(keep ? new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' }) : null); };
    r.mr.stop();
    recUi(false);
  });
  $('#rec-btn')?.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((x) => MediaRecorder.isTypeSupported?.(x)) || '';
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      rec = { mr, stream, chunks: [], start: Date.now() };
      mr.ondataavailable = (e) => e.data.size && rec?.chunks.push(e.data);
      mr.start(250);
      recUi(true);
      rec.timer = setInterval(() => {
        const sec = Math.floor((Date.now() - rec.start) / 1000);
        $('#rec-time').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
        if (sec >= 180) $('#rec-send').click();
      }, 250);
    } catch { toast('Não consegui acessar o microfone.', true); }
  });
  $('#rec-cancel')?.addEventListener('click', () => stopRec(false));
  $('#rec-send')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const blob = await stopRec(true);
    btn.disabled = false;
    if (!blob || blob.size < 800) return toast('Áudio muito curto.');
    const ext = /mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
    const file = new File([blob], `audio-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`, { type: blob.type.split(';')[0] });
    try { const att = await uploadFile(file, () => {}); await send([att.id]); } catch (err) { toast(err.message, true); }
  });
  if (window.innerWidth > 800) ta.focus();
}
const MAX_FILE = 8 * 1048576;
function fileKind(type = '') {
  if (/^image\/(png|jpe?g|gif|webp)$/.test(type)) return 'image';
  if (/^audio\//.test(type)) return 'audio';
  if (/^video\/(mp4|webm|quicktime)$/.test(type)) return 'video';
  return 'file';
}
function fmtSize(n = 0) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;
}
function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/upload');
    x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    x.setRequestHeader('X-Filename', encodeURIComponent(file.name || 'arquivo'));
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      let d = null; try { d = JSON.parse(x.responseText); } catch { /* sem json */ }
      if (x.status < 300 && d) resolve(d); else reject(new Error(d?.error || 'Falha ao enviar o arquivo.'));
    };
    x.onerror = () => reject(new Error('Falha na conexão ao enviar o arquivo.'));
    x.send(file);
  });
}
function attachmentsHtml(list) {
  if (!list?.length) return '';
  return `<div class="atts">${list.map((a) => {
    const url = esc(a.url);
    if (a.kind === 'image') return `<button type="button" class="att-img" data-lightbox="${url}"><img src="${url}" alt="${esc(a.name)}" loading="lazy"></button>`;
    if (a.kind === 'audio') return `<div class="att-audio">${icon('mic')}<audio controls preload="metadata" src="${url}"></audio></div>`;
    if (a.kind === 'video') return `<video class="att-video" controls preload="metadata" src="${url}"></video>`;
    return `<a class="att-file" href="${url}" download="${esc(a.name)}">${icon('file')}<span><b>${esc(a.name)}</b><small>${fmtSize(a.size)}</small></span>${icon('download')}</a>`;
  }).join('')}</div>`;
}
function addMessage(tid, m) {
  const list = S.messages[tid];
  if (!list || list.some((x) => x.id === m.id)) return;
  list.push(m);
  if (threadId() === tid) appendMessage(m);
}
function loadMessages(t) {
  if (S.messages[t.id]) { renderMessages(true); return markRead(); }
  $('#messages').innerHTML = '<div class="boot" style="height:100%"><div class="spinner"></div></div>';
  api(t.base).then((list) => {
    S.messages[t.id] = list; S.hasMore[t.id] = list.length >= 50;
    if (threadId() === t.id) { renderMessages(true); markRead(); }
  }).catch((e) => toast(e.message, true));
}
let readTimer = null;
function markRead() {
  if (S.serverId || !S.dmId) return;
  const d = S.dms.find((x) => x.id === S.dmId);
  if (!d || !d.unread) return;
  d.unread = 0; renderRail(); renderSidebar();
  clearTimeout(readTimer);
  readTimer = setTimeout(() => api(`/api/dms/${d.id}/read`, { method: 'POST' }).catch(() => {}), 300);
}

function messageHtml(m, prev, t) {
  const head = !prev || prev.author_id !== m.author_id || new Date(m.created_at) - new Date(prev.created_at) > 7 * 60e3 || fmtDay(prev.created_at) !== fmtDay(m.created_at);
  const day = !prev || fmtDay(prev.created_at) !== fmtDay(m.created_at) ? `<div class="day-sep">${fmtDay(m.created_at)}</div>` : '';
  const canDel = t?.canDel(m);
  const user = { display_name: m.author_name, avatar_url: m.author_avatar };
  return `${day}<div class="msg ${head ? 'head' : ''}" data-mid="${m.id}">
    <div class="gutter">${head ? avatarHtml(user) : `<time>${fmtTime(m.created_at)}</time>`}</div>
    <div class="body">${head ? `<div class="meta"><b style="color:${safeColor(m.author_color) || 'inherit'}">${esc(m.author_name)}</b><time>${fmtDay(m.created_at)} às ${fmtTime(m.created_at)}</time></div>` : ''}
      ${m.content ? `<div class="text">${linkify(m.content)}</div>` : ''}${attachmentsHtml(m.attachments)}</div>
    ${canDel ? `<div class="actions"><button class="icon-btn" data-del="${m.id}" title="Excluir mensagem">${icon('trash')}</button></div>` : ''}
  </div>`;
}
function renderMessages(toBottom) {
  const box = $('#messages'); if (!box) return;
  const t = threadFor(); if (!t) return;
  const list = S.messages[t.id] || [];
  const prevH = box.scrollHeight, prevTop = box.scrollTop;
  box.innerHTML = `
    ${S.hasMore[t.id] ? '<button class="btn ghost load-more" id="load-more">Carregar mensagens anteriores</button>' : t.welcome}
    ${list.map((m, i) => messageHtml(m, list[i - 1], t)).join('')}`;
  bindMessageActions(box);
  $('#load-more')?.addEventListener('click', loadOlder);
  if (toBottom) box.scrollTop = box.scrollHeight;
  else box.scrollTop = box.scrollHeight - prevH + prevTop;
}
function appendMessage(m) {
  const box = $('#messages'); if (!box) return;
  const t = threadFor(); if (!t) return;
  const list = S.messages[t.id];
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 150 || m.author_id === S.me.id;
  box.insertAdjacentHTML('beforeend', messageHtml(m, list[list.length - 2], t));
  bindMessageActions(box);
  if (nearBottom) box.scrollTop = box.scrollHeight;
}
function bindMessageActions(box) {
  $$('[data-lightbox]', box).forEach((b) => {
    b.onclick = () => {
      const m = openModal(`<img class="lightbox" src="${esc(b.dataset.lightbox)}" alt=""><div class="foot"><a class="btn" href="${esc(b.dataset.lightbox)}" target="_blank" rel="noopener">${icon('download')}Abrir original</a><button class="btn primary" id="lb-close">Fechar</button></div>`);
      m.classList.add('lb-modal');
      $('#lb-close', m).onclick = closeModal;
    };
  });
  $$('[data-del]', box).forEach((b) => {
    b.onclick = async () => {
      const t = threadFor(); if (!t) return;
      if (!confirm('Excluir esta mensagem?')) return;
      try { await api(t.delUrl(b.dataset.del), { method: 'DELETE' }); } catch (e) { toast(e.message, true); }
    };
  });
}
async function loadOlder() {
  const t = threadFor(); if (!t) return;
  const list = S.messages[t.id];
  try {
    const older = await api(`${t.base}?before=${encodeURIComponent(list[0]?.created_at || '')}`);
    S.hasMore[t.id] = older.length >= 50;
    S.messages[t.id] = [...older, ...list];
    renderMessages(false);
  } catch (e) { toast(e.message, true); }
}

// ---------------------------------------------------------------- conversas privadas
function upsertDm(d) {
  const i = S.dms.findIndex((x) => x.id === d.id);
  if (i >= 0) S.dms[i] = { ...S.dms[i], ...d }; else S.dms.push(d);
  S.dms.sort((a, b) => (b.last_at > a.last_at ? 1 : -1));
}
async function openDm(userId) {
  try {
    const d = await api('/api/dms', { method: 'POST', body: { user_id: userId } });
    upsertDm(d);
    closeModal(); $('.menu')?.remove();
    setNav(false);
    navigate(`/dm/${d.id}`);
  } catch (e) { toast(e.message, true); }
}
const totalUnread = () => S.dms.reduce((n, d) => n + (d.unread || 0) + (d.request && !d.unread ? 1 : 0), 0) + (S.friends?.incoming.length || 0);
// ---------------------------------------------------------------- amigos
async function loadFriends() {
  try { S.friends = await api('/api/friends'); } catch { /* mantém o que tinha */ }
}
const pendingCount = () => S.friends.incoming.length;
const requestDms = () => S.dms.filter((d) => d.request);

function renderHomeSidebar() {
  const normal = S.dms.filter((d) => !d.request);
  const reqs = requestDms().length;
  return `<div class="sidebar-head"><button class="server-name-btn" id="home-search"><span class="n muted-search">Encontrar ou começar conversa</span></button></div>
    <div class="channels">
      <button class="channel home-link ${!S.dmId && S.homeView === 'friends' ? 'active' : ''}" data-go="/">${icon('users')}<span class="n">Amigos</span>${pendingCount() ? `<span class="unread">${pendingCount()}</span>` : ''}</button>
      <button class="channel home-link ${!S.dmId && S.homeView === 'requests' ? 'active' : ''}" data-go="/requests">${icon('mail')}<span class="n">Solicitações de mensagens</span>${reqs ? `<span class="unread">${reqs}</span>` : ''}</button>
      <div class="cat"><span class="cat-name" style="cursor:default"><span>Mensagens diretas</span></span><span class="cat-actions" style="opacity:1"><button class="icon-btn" id="dm-new" title="Nova conversa">${icon('plus')}</button></span></div>
      ${normal.length ? normal.map((d) => `
        <button class="channel dm-row ${d.id === S.dmId ? 'active' : ''}" data-go="/dm/${d.id}">
          <span style="position:relative">${avatarHtml(d.user, 'sm')}<span class="dot sm ${d.user.online ? 'on' : ''}"></span></span>
          <span class="n"><span class="dm-name">${esc(d.user.display_name)}</span>${d.last_message ? `<small>${d.last_message.mine ? 'Você: ' : ''}${esc(d.last_message.content)}</small>` : ''}</span>
          ${d.unread ? `<span class="unread">${d.unread > 99 ? '99+' : d.unread}</span>` : ''}
        </button>`).join('') : '<p class="hint" style="padding:6px 8px">Nenhuma conversa ainda.</p>'}
    </div>`;
}

function renderFriendsPage(el) {
  const tab = S.friendsTab;
  const f = S.friends;
  el.innerHTML = `<div class="main-head friends-head">
      <button class="icon-btn menu-toggle" id="menu-toggle">${icon('menu')}</button>
      ${icon('users', 'muted')}<span>Amigos</span><span class="dotsep">•</span>
      <div class="ftabs">
        <button data-ftab="online" class="${tab === 'online' ? 'on' : ''}">Disponível</button>
        <button data-ftab="all" class="${tab === 'all' ? 'on' : ''}">Todos</button>
        <button data-ftab="pending" class="${tab === 'pending' ? 'on' : ''}">Pendente${pendingCount() ? ` <span class="unread">${pendingCount()}</span>` : ''}</button>
        <button data-ftab="add" class="add ${tab === 'add' ? 'on' : ''}">Adicionar amigo</button>
      </div>
    </div>
    <div class="friends-body" id="friends-body"></div>`;
  $('#menu-toggle').onclick = () => setNav(true);
  $$('[data-ftab]', el).forEach((b) => { b.onclick = () => { S.friendsTab = b.dataset.ftab; renderFriendsPage(el); }; });
  const body = $('#friends-body');
  const row = (u, actions, sub) => `
    <div class="friend-row">
      <span style="position:relative">${avatarHtml(u)}<span class="dot ${u.online ? 'on' : ''}"></span></span>
      <div class="nm"><b>${esc(u.display_name)}</b> <span class="uname">@${esc(u.username)}</span><small>${sub}</small></div>
      <div class="friend-actions">${actions}</div>
    </div>`;
  if (tab === 'add') {
    body.innerHTML = `
      <div class="add-friend">
        <h2>Adicionar amigo</h2>
        <p class="sub">Você pode adicionar amigos com o nome de usuário Lumix deles. O seu é <b>@${esc(S.me.username)}</b> <button class="link-btn" id="copy-me">copiar</button></p>
        <form class="add-box" id="add-form">
          <div class="add-row"><span class="at">@</span><input id="add-user" maxlength="21" placeholder="Insira um nome de usuário" autocomplete="off" spellcheck="false">
            <button class="btn primary" id="add-send" disabled>Enviar pedido de amizade</button></div>
          <div class="add-msg"><textarea id="add-msg" maxlength="120" rows="2" placeholder="Personalize sua solicitação (opcional)"></textarea><span class="count" id="add-count">120</span></div>
        </form>
        <p class="hint">O que você escrever aqui também aparecerá nas suas mensagens diretas se vocês se tornarem amigos.</p>
        <div class="add-result" id="add-result"></div>
      </div>`;
    const inp = $('#add-user'), msg = $('#add-msg'), btn = $('#add-send');
    inp.oninput = () => { inp.value = inp.value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.]/g, ''); btn.disabled = inp.value.length < 3; $('#add-result').textContent = ''; $('#add-result').className = 'add-result'; };
    msg.oninput = () => { $('#add-count').textContent = 120 - msg.value.length; };
    $('#copy-me').onclick = () => { navigator.clipboard?.writeText('@' + S.me.username).then(() => toast('Nome de usuário copiado!')).catch(() => {}); };
    $('#add-form').onsubmit = async (e) => {
      e.preventDefault(); btn.disabled = true;
      try {
        const r = await api('/api/friends', { method: 'POST', body: { username: inp.value, message: msg.value } });
        $('#add-result').className = 'add-result ok';
        $('#add-result').textContent = r.accepted ? `Agora você e ${r.user.display_name} são amigos! 🎉` : `Pedido enviado para ${r.user.display_name}!`;
        inp.value = ''; msg.value = ''; $('#add-count').textContent = '120';
        await loadFriends(); renderSidebar();
      } catch (err) { $('#add-result').className = 'add-result err'; $('#add-result').textContent = err.message; btn.disabled = false; }
    };
    setTimeout(() => inp.focus(), 30);
    return;
  }
  if (tab === 'pending') {
    const list = [...f.incoming.map((x) => ({ ...x, dir: 'in' })), ...f.outgoing.map((x) => ({ ...x, dir: 'out' }))];
    body.innerHTML = `<div class="flist-title">Pendente — ${list.length}</div>` + (list.length ? list.map((x) => row(x.user,
      x.dir === 'in'
        ? `<button class="round ok" data-accept="${x.id}" title="Aceitar">${icon('check')}</button><button class="round no" data-del="${x.id}" title="Recusar">${icon('x')}</button>`
        : `<button class="round no" data-del="${x.id}" title="Cancelar pedido">${icon('x')}</button>`,
      `${x.dir === 'in' ? 'Pedido de amizade recebido' : 'Pedido de amizade enviado'}${x.message ? ` · “${esc(x.message)}”` : ''}`)).join('')
      : emptyFriends('Não há pedidos de amizade pendentes.'));
  } else {
    const list = tab === 'online' ? f.friends.filter((x) => x.user.online) : f.friends;
    body.innerHTML = `<input class="input fsearch" id="fsearch" placeholder="Buscar"><div class="flist-title">${tab === 'online' ? 'Disponível' : 'Todos os amigos'} — ${list.length}</div>
      <div id="flist">${list.length ? list.map((x) => row(x.user,
        `<button class="round" data-msg="${x.user.id}" title="Mensagem">${icon('chat')}</button><button class="round no" data-del="${x.id}" data-name="${esc(x.user.display_name)}" title="Desfazer amizade">${icon('userMinus')}</button>`,
        x.user.online ? 'Online' : 'Offline')).join('')
        : emptyFriends(tab === 'online' ? 'Nenhum amigo online agora.' : 'Você ainda não tem amigos aqui. Que tal adicionar alguém?')}</div>`;
    $('#fsearch').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      $$('.friend-row', body).forEach((r) => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    };
  }
  $$('[data-accept]', body).forEach((b) => { b.onclick = async () => { try { await api(`/api/friends/${b.dataset.accept}/accept`, { method: 'POST' }); await loadFriends(); renderApp(); toast('Pedido aceito!'); } catch (e) { toast(e.message, true); } }; });
  $$('[data-del]', body).forEach((b) => {
    b.onclick = async () => {
      if (b.dataset.name && !confirm(`Desfazer amizade com ${b.dataset.name}?`)) return;
      try { await api(`/api/friends/${b.dataset.del}`, { method: 'DELETE' }); await loadFriends(); renderApp(); } catch (e) { toast(e.message, true); }
    };
  });
  $$('[data-msg]', body).forEach((b) => { b.onclick = () => openDm(b.dataset.msg); });
  $('[data-go-add]', body)?.addEventListener('click', () => { S.friendsTab = 'add'; renderFriendsPage(el); });
}
function emptyFriends(text) {
  return `<div class="empty" style="padding:40px 0"><div><div class="ico">${icon('users')}</div><p>${text}</p><button class="btn primary" data-go-add>${icon('userPlus')}Adicionar amigo</button></div></div>`;
}

function renderRequestsPage(el) {
  const list = requestDms();
  el.innerHTML = `<div class="main-head"><button class="icon-btn menu-toggle" id="menu-toggle">${icon('menu')}</button>${icon('mail', 'muted')}<span>Solicitações de mensagens</span></div>
    <div class="friends-body">
      <p class="hint" style="margin:0 0 12px">Mensagens de quem ainda não é seu amigo ficam aqui até você aceitar.</p>
      ${list.length ? list.map((d) => `
        <div class="friend-row" data-open="${d.id}" style="cursor:pointer">
          <span style="position:relative">${avatarHtml(d.user)}<span class="dot ${d.user.online ? 'on' : ''}"></span></span>
          <div class="nm"><b>${esc(d.user.display_name)}</b> <span class="uname">@${esc(d.user.username)}</span><small>${esc(d.last_message?.content || 'Quer conversar com você')}</small></div>
          <div class="friend-actions"><button class="round ok" data-acc="${d.id}" title="Aceitar">${icon('check')}</button><button class="round no" data-rej="${d.id}" title="Recusar">${icon('x')}</button></div>
        </div>`).join('') : emptyRequests()}
    </div>`;
  $('#menu-toggle').onclick = () => setNav(true);
  $$('[data-open]', el).forEach((r) => { r.onclick = (e) => { if (!e.target.closest('button')) navigate(`/dm/${r.dataset.open}`); }; });
  $$('[data-acc]', el).forEach((b) => { b.onclick = () => acceptDm(b.dataset.acc, true); });
  $$('[data-rej]', el).forEach((b) => { b.onclick = () => rejectDm(b.dataset.rej); });
}
function emptyRequests() {
  return `<div class="empty" style="padding:40px 0"><div><div class="ico">${icon('mail')}</div><p>Nenhuma solicitação de mensagem.</p></div></div>`;
}
async function acceptDm(did, open) {
  try { const d = await api(`/api/dms/${did}/accept`, { method: 'POST' }); upsertDm(d); if (open) navigate(`/dm/${did}`); else renderApp(); } catch (e) { toast(e.message, true); }
}
async function rejectDm(did) {
  if (!confirm('Recusar e apagar essa conversa?')) return;
  try { await api(`/api/dms/${did}`, { method: 'DELETE' }); S.dms = S.dms.filter((d) => d.id !== did); navigate('/requests'); } catch (e) { toast(e.message, true); }
}
async function addFriendByUsername(username) {
  try {
    const r = await api('/api/friends', { method: 'POST', body: { username } });
    toast(r.accepted ? `Agora vocês são amigos! 🎉` : `Pedido de amizade enviado para ${r.user.display_name}.`);
    await loadFriends(); renderSidebar();
  } catch (e) { toast(e.message, true); }
}

async function newDmDialog() {
  const m = openModal(`<h2>Nova conversa</h2><p class="sub">Converse no privado com seus amigos ou com quem está nos mesmos servidores que você.</p>
    <input class="input" id="dm-q" placeholder="Buscar pelo nome"><div class="people" id="dm-list"><div class="spinner" style="margin:16px auto"></div></div>`);
  let people = [];
  const draw = () => {
    const q = $('#dm-q', m).value.trim().toLowerCase();
    const list = people.filter((p) => p.display_name.toLowerCase().includes(q));
    $('#dm-list', m).innerHTML = list.length ? list.map((p) => `
      <button class="member-row person" data-dm="${p.id}"><span style="position:relative">${avatarHtml(p)}<span class="dot ${p.online ? 'on' : ''}"></span></span>
        <div class="nm"><b>${esc(p.display_name)}</b><small>@${esc(p.username || '')} · ${p.friend ? 'Amigo' : 'Mesmo servidor'} · ${p.online ? 'Online' : 'Offline'}</small></div>${icon('send')}</button>`).join('')
      : `<p class="hint" style="padding:12px 4px">${people.length ? 'Ninguém com esse nome.' : 'Você ainda não está em servidores com outras pessoas. Convide amigos para um servidor primeiro.'}</p>`;
    $$('[data-dm]', m).forEach((b) => { b.onclick = () => openDm(b.dataset.dm); });
  };
  $('#dm-q', m).oninput = draw;
  try { people = await api('/api/people'); } catch (e) { toast(e.message, true); }
  draw();
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
    <div class="call" id="call-root"><div class="call-grid" id="call-grid"></div><div class="call-alone" id="call-alone"></div>
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
    <button class="ctrl ${S.streamer ? 'streamer' : ''}" id="c-streamer" title="Modo streamer (${esc(KEYS.streamer || 'sem atalho')}): muta e para de ouvir">${icon('radio')}</button>
    <button class="ctrl ${call.camTrack ? 'active' : ''}" id="c-cam" title="${call.camTrack ? 'Desligar câmera' : 'Ligar câmera'}">${icon(call.camTrack ? 'video' : 'videoOff')}</button>
    ${navigator.mediaDevices?.getDisplayMedia ? `<button class="ctrl ${call.screenTrack ? 'active' : ''}" id="c-screen" title="${call.screenTrack ? 'Parar de compartilhar' : 'Compartilhar tela'}">${icon('screen')}</button>` : ''}
    <button class="ctrl leave" id="c-leave" title="Sair da chamada">${icon('phoneOff')}</button>`;
  $('#c-mic').onclick = toggleMute;
  $('#c-deaf').onclick = toggleDeafen;
  $('#c-streamer').onclick = toggleStreamer;
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
  applyMic();
  if (KEYS.ptt.on) toast(`Apertar para falar ligado: segure ${codeLabel(KEYS.ptt.code)} para falar.`);
  socket.emit('voice:join', cid, (res) => {
    if (!res || res.error) { toast(res?.error || 'Não foi possível entrar.', true); return leaveCall(true); }
    if (res.listen_only) {
      call.listenOnly = true; call.muted = true;
      applyMic();
      toast('Neste canal só a Staff fala — você entrou para ouvir e assistir.');
      renderControls(); renderSidebar();
    }
    if (S.streamer) { call.muted = true; call.deafened = true; applyMic(); applyDeafen(); renderControls(); }
    socket.emit('voice:update', { muted: call.muted, deafened: call.deafened });
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
  [c.audioTrack, c.camTrack, c.screenTrack, c.screenAudioTrack].forEach((t) => t?.stop());
  c.focusKey = null;
  clearInterval(c.speakTimer);
  speakers.clear();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  renderSidebar();
  if (S.channelId === c.channelId) renderMain();
}

function createPeer(peerId, initiator) {
  const pc = new RTCPeerConnection({ iceServers: S.iceServers });
  const peer = { pc, pending: [], audio: new MediaStream(), cam: new MediaStream(), screen: new MediaStream(), screenAudio: new MediaStream(), audioEl: null, screenAudioEl: null };
  call.peers.set(peerId, peer);

  const mkAudio = (stream) => {
    const a = document.createElement('audio');
    a.autoplay = true; a.playsInline = true; a.srcObject = stream; a.muted = call.deafened;
    const sink = callSettings().speakerId;
    if (sink && a.setSinkId) a.setSinkId(sink).catch(() => {});
    document.body.appendChild(a);
    return a;
  };
  const el = mkAudio(peer.audio);
  peer.audioEl = el;
  peer.screenAudioEl = mkAudio(peer.screenAudio);

  pc.onicecandidate = (e) => { if (e.candidate) socket.emit('rtc:signal', { to: peerId, data: { candidate: e.candidate } }); };
  pc.ontrack = (e) => {
    const idx = pc.getTransceivers().indexOf(e.transceiver);
    const target = [peer.audio, peer.cam, peer.screen, peer.screenAudio][idx] || peer.screen;
    target.getTracks().forEach((t) => target.removeTrack(t));
    target.addTrack(e.track);
    if (idx === 0) { el.play().catch(() => {}); watchSpeaking(peerId, peer.audio); }
    if (idx === 3) peer.screenAudioEl.play().catch(() => {});
    call && (call.gridKey = null, updateCallGrid());
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' && initiator) makeOffer(peerId, true);
  };
  if (initiator) {
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('audio', { direction: 'sendrecv' }); // som da transmissão
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
  t[3]?.sender.replaceTrack(call.screenAudioTrack || null).catch(() => {});
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
  peer.screenAudioEl?.remove();
  c.peers.delete(id);
  speakers.delete(id);
}
function closePeer(id) { if (call) { closePeerOf(call, id); call.gridKey = null; updateCallGrid(); } }

function listenOnlyBlock() {
  if (call?.listenOnly) { toast('Neste canal só a Staff pode falar, ligar câmera ou transmitir.'); return true; }
  return false;
}
function toggleMute() {
  if (!call || listenOnlyBlock()) return;
  S.streamer = false;
  if (!call.audioTrack) {
    return navigator.mediaDevices.getUserMedia({ audio: audioConstraints() }).then((st) => {
      if (!call) return;
      call.audioTrack = st.getAudioTracks()[0];
      call.muted = false;
      applyMic();
      call.peers.forEach(applyTracks);
      watchSpeaking('local', new MediaStream([call.audioTrack]));
      socket.emit('voice:update', { muted: false });
      renderControls(); renderSidebar();
    }).catch(() => toast('Microfone bloqueado. Libere o acesso nas permissões do navegador.', true));
  }
  call.muted = !call.muted;
  if (call.deafened && !call.muted) { call.deafened = false; applyDeafen(); }
  applyMic();
  socket.emit('voice:update', { muted: call.muted, deafened: call.deafened });
  renderControls(); renderSidebar();
}
// modo streamer: um botão que muta o microfone e para de ouvir a chamada (e desfaz)
function toggleStreamer() {
  S.streamer = !S.streamer;
  if (call) {
    if (S.streamer) { call.muted = true; call.deafened = true; }
    else { call.deafened = false; call.muted = !!call.listenOnly || !call.audioTrack; }
    applyDeafen(); applyMic();
    socket.emit('voice:update', { muted: call.muted, deafened: call.deafened });
    renderControls();
  }
  document.body.classList.toggle('streamer-on', S.streamer);
  renderSidebar();
  toast(S.streamer ? '🔴 Modo streamer LIGADO — microfone e áudio desligados.' : '🟢 Modo streamer desligado — você voltou a falar e ouvir.');
}
function applyDeafen() { call.peers.forEach((p) => { if (p.audioEl) p.audioEl.muted = call.deafened; if (p.screenAudioEl) p.screenAudioEl.muted = call.deafened; }); }
function toggleDeafen() {
  if (!call) return;
  S.streamer = false;
  call.deafened = !call.deafened;
  applyDeafen();
  if (call.deafened && call.audioTrack) call.muted = true;
  if (!call.deafened && call.audioTrack && !call.listenOnly) call.muted = false;
  applyMic();
  socket.emit('voice:update', { muted: call.muted, deafened: call.deafened });
  renderControls(); renderSidebar();
}
async function toggleCamera() {
  if (!call || listenOnlyBlock()) return;
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
  if (!call || listenOnlyBlock()) return;
  if (call.screenTrack) {
    call.screenTrack.stop(); call.screenTrack = null;
    call.screenAudioTrack?.stop(); call.screenAudioTrack = null;
  } else {
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        systemAudio: 'include', selfBrowserSurface: 'exclude',
      });
      if (!call) return st.getTracks().forEach((t) => t.stop());
      call.screenTrack = st.getVideoTracks()[0];
      call.screenAudioTrack = st.getAudioTracks()[0] || null;
      if (!call.screenAudioTrack) toast('Transmitindo sem som. Para ter áudio, marque "Compartilhar áudio" ao escolher a tela ou aba.');
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
  // modo foco (tela cheia): mostra só o bloco escolhido
  if (call.focusKey && !tiles.some((t) => t.key === call.focusKey)) exitFocus(true);
  const shown = call.focusKey ? tiles.filter((t) => t.key === call.focusKey) : tiles.slice();
  grid.classList.toggle('focus', !!call.focusKey);
  const key = (call.focusKey || '') + shown.map((t) => t.key + t.kind + t.p.muted + t.p.display_name + t.p.avatar_url).join('|');
  $('#call-alone').textContent = parts.length <= 1 ? 'Você está sozinho aqui. Chame seus amigos para este canal.' : '';
  if (key === call.gridKey) return;
  call.gridKey = key;
  tiles.length = 0; tiles.push(...shown);
  const n = tiles.length;
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  grid.style.gridTemplateColumns = window.innerWidth <= 600 && n > 1 ? '1fr' : `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.maxWidth = n <= 1 && !call.focusKey ? '960px' : '';
  grid.style.margin = '0 auto'; grid.style.width = '100%';
  grid.innerHTML = tiles.map((t) => `
    <div class="tile ${t.kind === 'screen' ? 'screen' : ''} ${t.mine && t.kind === 'cam' ? 'mirror' : ''}" data-sock="${t.kind === 'screen' ? '' : (t.mine ? 'local' : t.p.socket_id)}" data-key="${t.key}">
      ${t.kind === 'avatar' ? avatarHtml(t.p) : '<video autoplay playsinline muted></video>'}
      <div class="label">${t.p.muted ? `<span class="red">${icon('micOff')}</span>` : icon('mic')}${esc(t.p.display_name)}${t.mine ? ' (você)' : ''}${t.kind === 'screen' ? ' — tela' : ''}</div>
      <button class="icon-btn fs" title="${call.focusKey ? 'Sair da tela cheia' : 'Tela cheia'}">${icon(call.focusKey ? 'shrink' : 'expand')}</button>
    </div>`).join('');
  tiles.forEach((t) => {
    const tile = grid.querySelector(`[data-key="${CSS.escape(t.key)}"]`);
    const v = tile.querySelector('video');
    if (v) {
      if (t.mine) v.srcObject = new MediaStream([t.kind === 'screen' ? call.screenTrack : call.camTrack]);
      else { const peer = call.peers.get(t.p.socket_id); v.srcObject = t.kind === 'screen' ? peer.screen : peer.cam; }
      v.play().catch(() => {});
    }
    const toggle = () => (call.focusKey ? exitFocus() : enterFocus(t.key));
    tile.querySelector('.fs').onclick = (e) => { e.stopPropagation(); toggle(); };
    tile.ondblclick = toggle;
  });
}

// tela cheia: o container da chamada fica em tela cheia (não é recriado),
// e a grade mostra só o bloco escolhido — assim nada tira da tela cheia.
function enterFocus(key) {
  if (!call) return;
  call.focusKey = key; call.gridKey = null;
  updateCallGrid();
  const root = $('#call-root');
  if (root && !document.fullscreenElement) (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root)?.catch?.(() => {});
  // garante que o som da transmissão toque
  call.peers.forEach((p) => { p.screenAudioEl?.play().catch(() => {}); p.audioEl?.play().catch(() => {}); });
}
function exitFocus(fromGrid) {
  if (!call) return;
  call.focusKey = null; call.gridKey = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (!fromGrid) updateCallGrid();
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && call?.focusKey) { call.focusKey = null; call.gridKey = null; updateCallGrid(); }
});

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
  const st = { name: `Servidor de ${S.me.display_name}`, color: colorFor(S.me.display_name + Date.now()), icon_url: '', template: 'streamer' };
  const m = openModal(`
    <h2>Crie seu servidor</h2><p class="sub">Um lugar para você e seus amigos conversarem, jogarem e fazerem chamadas.</p>
    <form id="cs-form">
      <div class="upload-row"><div id="cs-prev"></div><div><button type="button" class="btn" id="cs-up">Enviar ícone</button><div class="hint" style="margin-top:6px">Opcional. PNG ou JPG.</div></div></div>
      <div class="field"><label>Nome do servidor</label><input class="input" name="name" maxlength="40" value="${esc(st.name)}"></div>
      <div class="field"><label>Cor</label>${colorGrid(st.color)}</div>
      <div class="field"><label>Começar com</label>
        <button type="button" class="kind-opt" data-t="streamer">${icon('sparkle')}<span><b>Modelo streamer</b><small>Cargos, regras, canais de clipes, jogos, voz e área da Staff prontos</small></span></button>
        <button type="button" class="kind-opt" data-t="ai">${icon('sparkle')}<span><b>Montar com IA</b><small>Descreva do seu jeito e a IA cria tudo</small></span></button>
        <button type="button" class="kind-opt" data-t="blank">${icon('hash')}<span><b>Em branco</b><small>Só #geral e uma sala de voz</small></span></button></div>
      <div class="error-text" id="cs-err"></div>
      <div class="foot"><button type="button" class="btn ghost" id="cs-cancel">Cancelar</button><button class="btn primary">Criar servidor</button></div>
    </form>`);
  const prev = () => { $('#cs-prev', m).innerHTML = serverIconHtml({ ...st, name: st.name || '?' }); };
  prev();
  $('[name=name]', m).oninput = (e) => { st.name = e.target.value; prev(); };
  $$('[data-color]', m).forEach((b) => { b.onclick = () => { st.color = b.dataset.color; $$('[data-color]', m).forEach((x) => x.classList.toggle('sel', x === b)); prev(); }; });
  $('#cs-up', m).onclick = async () => { const u = await pickImage(); if (u) { st.icon_url = u; prev(); } };
  const tsel = () => $$('[data-t]', m).forEach((b) => b.classList.toggle('sel', b.dataset.t === st.template));
  tsel();
  $$('[data-t]', m).forEach((b) => { b.onclick = () => { if (b.dataset.t === 'ai') { closeModal(); return aiBuildDialog(); } st.template = b.dataset.t; tsel(); }; });
  $('#cs-cancel', m).onclick = closeModal;
  $('#cs-form', m).onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter; btn.disabled = true;
    try {
      const s = await api('/api/servers', { method: 'POST', body: { name: st.name, color: st.color, icon_url: st.icon_url, template: st.template } });
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
  $('#inv-share', m)?.addEventListener('click', () => navigator.share({ title: s.name, text: `Entra no meu servidor ${s.name} no Lumix!`, url: link }).catch(() => {}));
  $('#inv-close', m).onclick = closeModal;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Link copiado!'); }
  catch { const i = $('#inv-link') || document.createElement('input'); i.value = t; i.select(); document.execCommand('copy'); toast('Link copiado!'); }
}

const PERM_LABELS = {
  admin: ['Administrador', 'Pode tudo. Dê só para quem você confia muito.'],
  manage_server: ['Gerenciar servidor', 'Mudar nome, ícone, convites e cargo automático.'],
  manage_channels: ['Gerenciar canais', 'Criar, editar, organizar e excluir canais e categorias.'],
  manage_roles: ['Gerenciar cargos', 'Criar cargos e dar/tirar cargos dos membros.'],
  manage_messages: ['Gerenciar mensagens', 'Apagar mensagens de outros e falar em canais só leitura.'],
  kick: ['Expulsar membros', 'Remover pessoas do servidor.'],
};
const perms = () => current()?.perms || {};
const roles = () => S.roles[S.serverId] || [];
const safeColor = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '');

function categoryOptions(selected) {
  const s = current();
  return `<option value="">Sem categoria</option>` + (s.categories || []).map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}
function roleChecks(selected = [], name = 'role') {
  if (!roles().length) return '<p class="hint">Crie cargos em Configurações do servidor → Cargos.</p>';
  return `<div class="role-checks">${roles().map((r) => `
    <label class="role-check"><input type="checkbox" name="${name}" value="${r.id}" ${selected.includes(r.id) ? 'checked' : ''}>
      <span class="role-dot" style="background:${safeColor(r.color) || '#99aab5'}"></span>${esc(r.name)}</label>`).join('')}</div>`;
}

function createChannelDialog(kind = 'text', categoryId) {
  let k = kind;
  const s = current();
  if (categoryId === undefined) categoryId = (s.categories || []).find((c) => /voz|voice/i.test(c.name) === (kind === 'voice'))?.id || '';
  const m = openModal(`
    <h2>Criar canal</h2><p class="sub">em ${esc(s.name)}</p>
    <form id="cc">
      <div class="field"><label>Tipo de canal</label>
        <button type="button" class="kind-opt" data-k="text">${icon('hash')}<span><b>Texto</b><small>Mensagens, links e conversas</small></span></button>
        <button type="button" class="kind-opt" data-k="voice">${icon('volume')}<span><b>Voz</b><small>Voz, vídeo e compartilhamento de tela</small></span></button></div>
      <div class="field"><label>Nome do canal</label><input class="input" name="name" maxlength="40" placeholder="novo-canal"></div>
      <div class="field"><label>Categoria</label><select class="input" name="category_id">${categoryOptions(categoryId)}</select></div>
      <div class="switch" id="cc-textonly"><span>Só texto <small class="hint" style="display:block">Bloqueia imagens, arquivos e áudios (dá para mudar depois).</small></span><input type="checkbox" name="text_only"></div>
      <div class="switch"><span>Canal privado <small class="hint" style="display:block">Só os cargos escolhidos veem o canal.</small></span><input type="checkbox" name="private"></div>
      <div id="cc-roles" class="hidden" style="padding-top:10px">${roleChecks()}</div>
      <div class="error-text" id="cc-err" style="margin-top:12px"></div>
      <div class="foot"><button type="button" class="btn ghost" id="cc-cancel">Cancelar</button><button class="btn primary">Criar canal</button></div>
    </form>`);
  const sel = () => { $$('[data-k]', m).forEach((b) => b.classList.toggle('sel', b.dataset.k === k)); $('#cc-textonly', m).classList.toggle('hidden', k !== 'text'); };
  sel();
  $$('[data-k]', m).forEach((b) => { b.onclick = () => { k = b.dataset.k; sel(); }; });
  $('[name=private]', m).onchange = (e) => $('#cc-roles', m).classList.toggle('hidden', !e.target.checked);
  $('#cc-cancel', m).onclick = closeModal;
  $('#cc', m).onsubmit = async (e) => {
    e.preventDefault(); const btn = e.submitter; btn.disabled = true;
    const f = e.target;
    const allowed = f.private.checked ? $$('[name=role]:checked', m).map((x) => x.value) : [];
    try {
      const c = await api(`/api/servers/${S.serverId}/channels`, { method: 'POST', body: { name: f.name.value, kind: k, category_id: f.category_id.value, allowed_roles: allowed, ...(k === 'text' && f.text_only.checked ? { allow: { images: false, files: false, audio: false } } : {}) } });
      const l = S.channels[S.serverId]; if (!l.some((x) => x.id === c.id)) l.push(c);
      closeModal();
      navigate(`/s/${S.serverId}/${c.id}`);
    } catch (err) { $('#cc-err', m).textContent = err.message; btn.disabled = false; }
  };
}

function channelSettingsDialog(cid) {
  const c = (S.channels[S.serverId] || []).find((x) => x.id === cid); if (!c) return;
  const priv = !!c.allowed_roles?.length;
  const m = openModal(`
    <h2>Editar canal</h2><p class="sub">${c.kind === 'voice' ? 'Canal de voz' : 'Canal de texto'}</p>
    <form id="ec">
      <div class="field"><label>Nome</label><input class="input" name="name" maxlength="40" value="${esc(c.name)}"></div>
      ${c.kind === 'text' ? `<div class="field"><label>Tópico</label><input class="input" name="topic" maxlength="200" value="${esc(c.topic || '')}" placeholder="Sobre o que é este canal?"></div>` : ''}
      <div class="field"><label>Categoria</label><select class="input" name="category_id">${categoryOptions(c.category_id)}</select></div>
      <div class="switch"><span>${c.kind === 'voice' ? 'Só a Staff fala' : 'Só leitura'} <small class="hint" style="display:block">${c.kind === 'voice' ? 'Os outros entram só para ouvir e assistir.' : 'Só quem pode gerenciar mensagens escreve aqui.'}</small></span><input type="checkbox" name="read_only" ${c.read_only ? 'checked' : ''}></div>
      ${c.kind === 'text' ? `<h4 class="perm-title">O que pode ser enviado aqui</h4>
      <div class="switch"><span>${icon('image')} Imagens</span><input type="checkbox" name="allow_images" ${c.allow?.images === false ? '' : 'checked'}></div>
      <div class="switch"><span>${icon('file')} Arquivos e vídeos</span><input type="checkbox" name="allow_files" ${c.allow?.files === false ? '' : 'checked'}></div>
      <div class="switch"><span>${icon('mic')} Áudios e mensagens de voz</span><input type="checkbox" name="allow_audio" ${c.allow?.audio === false ? '' : 'checked'}></div>
      <p class="hint" style="margin:6px 0 10px">Desligue os três para deixar o canal <b>só texto</b>. Vale para todo mundo, inclusive a Staff.</p>
      <h4 class="perm-title">Acesso</h4>` : ''}
      <div class="switch"><span>Canal privado <small class="hint" style="display:block">Só os cargos escolhidos veem o canal.</small></span><input type="checkbox" name="private" ${priv ? 'checked' : ''}></div>
      <div id="ec-roles" class="${priv ? '' : 'hidden'}" style="padding-top:10px">${roleChecks(c.allowed_roles || [])}</div>
      <div style="display:flex;gap:8px;margin-top:14px"><button type="button" class="btn ghost" data-move="-1">↑ Subir</button><button type="button" class="btn ghost" data-move="1">↓ Descer</button></div>
      <div class="error-text" id="ec-err" style="margin-top:10px"></div>
      <div class="foot" style="justify-content:space-between"><button type="button" class="btn danger" id="ec-del">${icon('trash')}Excluir</button>
      <span style="display:flex;gap:8px"><button type="button" class="btn ghost" id="ec-cancel">Cancelar</button><button class="btn primary">Salvar</button></span></div>
    </form>`);
  $('[name=private]', m).onchange = (e) => $('#ec-roles', m).classList.toggle('hidden', !e.target.checked);
  $('#ec-cancel', m).onclick = closeModal;
  $$('[data-move]', m).forEach((b) => { b.onclick = () => api(`/api/channels/${c.id}`, { method: 'PATCH', body: { move: Number(b.dataset.move) } }).catch((err) => toast(err.message, true)); });
  $('#ec-del', m).onclick = async () => {
    if (!confirm(`Excluir o canal "${c.name}"? As mensagens serão apagadas.`)) return;
    try { await api(`/api/channels/${c.id}`, { method: 'DELETE' }); closeModal(); } catch (err) { $('#ec-err', m).textContent = err.message; }
  };
  $('#ec', m).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = { name: f.name.value, category_id: f.category_id.value, read_only: f.read_only.checked,
      allowed_roles: f.private.checked ? $$('[name=role]:checked', m).map((x) => x.value) : [] };
    if (f.topic) body.topic = f.topic.value;
    if (f.allow_images) body.allow = { images: f.allow_images.checked, files: f.allow_files.checked, audio: f.allow_audio.checked };
    if (f.private.checked && !body.allowed_roles.length) { $('#ec-err', m).textContent = 'Escolha pelo menos um cargo para o canal privado.'; return; }
    try { await api(`/api/channels/${c.id}`, { method: 'PATCH', body }); closeModal(); toast('Canal salvo.'); } catch (err) { $('#ec-err', m).textContent = err.message; }
  };
}

function categoryDialog(catId) {
  const s = current();
  const cat = (s.categories || []).find((c) => c.id === catId);
  const m = openModal(`
    <h2>${cat ? 'Editar categoria' : 'Criar categoria'}</h2><p class="sub">Categorias agrupam canais na barra lateral.</p>
    <form id="cf"><div class="field"><label>Nome</label><input class="input" name="name" maxlength="40" value="${esc(cat?.name || '')}" placeholder="ex.: 🎮 Jogos"></div>
    ${cat ? `<div style="display:flex;gap:8px"><button type="button" class="btn ghost" data-move="-1">↑ Subir</button><button type="button" class="btn ghost" data-move="1">↓ Descer</button></div>` : ''}
    <div class="error-text" id="cf-err" style="margin-top:10px"></div>
    <div class="foot" style="justify-content:${cat ? 'space-between' : 'flex-end'}">${cat ? `<button type="button" class="btn danger" id="cf-del">${icon('trash')}Excluir</button>` : ''}
    <span style="display:flex;gap:8px"><button type="button" class="btn ghost" id="cf-cancel">Cancelar</button><button class="btn primary">${cat ? 'Salvar' : 'Criar'}</button></span></div></form>`);
  $('#cf-cancel', m).onclick = closeModal;
  $$('[data-move]', m).forEach((b) => { b.onclick = () => api(`/api/servers/${s.id}/categories/${cat.id}`, { method: 'PATCH', body: { move: Number(b.dataset.move) } }).catch((err) => toast(err.message, true)); });
  $('#cf-del', m)?.addEventListener('click', async () => {
    if (!confirm(`Excluir a categoria "${cat.name}"? Os canais dela não são apagados, só ficam sem categoria.`)) return;
    try { await api(`/api/servers/${s.id}/categories/${cat.id}`, { method: 'DELETE' }); closeModal(); } catch (err) { $('#cf-err', m).textContent = err.message; }
  });
  $('#cf', m).onsubmit = async (e) => {
    e.preventDefault();
    try {
      if (cat) await api(`/api/servers/${s.id}/categories/${cat.id}`, { method: 'PATCH', body: { name: e.target.name.value } });
      else await api(`/api/servers/${s.id}/categories`, { method: 'POST', body: { name: e.target.name.value } });
      closeModal();
    } catch (err) { $('#cf-err', m).textContent = err.message; }
  };
}

function serverMenu(anchor) {
  $('.menu')?.remove();
  const s = current();
  const p = perms();
  const r = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'menu';
  const canSettings = p.manage_server || p.manage_roles || p.kick;
  menu.innerHTML = `
    <button data-a="invite">Convidar pessoas ${icon('userPlus')}</button>
    ${canSettings ? `<button data-a="settings">Configurações do servidor ${icon('settings')}</button>` : ''}
    ${p.manage_roles ? `<button data-a="roles">Cargos ${icon('shield')}</button>` : ''}
    ${p.manage_channels ? `<button data-a="text">Criar canal ${icon('hash')}</button><button data-a="category">Criar categoria ${icon('folder')}</button>` : ''}
    ${s.is_owner ? `<button data-a="ai">Montar com IA ${icon('sparkle')}</button><button data-a="template">Aplicar modelo streamer ${icon('folder')}</button>` : ''}
    <button data-a="members">Membros ${icon('users')}</button>
    <hr>
    ${s.is_owner ? `<button data-a="delete" class="red">Excluir servidor ${icon('trash')}</button>` : `<button data-a="leave" class="red">Sair do servidor ${icon('door')}</button>`}`;
  document.body.appendChild(menu);
  menu.style.left = r.left + 'px'; menu.style.top = r.bottom + 6 + 'px'; menu.style.width = Math.max(240, r.width) + 'px';
  const off = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', off); } };
  setTimeout(() => document.addEventListener('mousedown', off));
  menu.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    menu.remove();
    if (a === 'invite') inviteDialog();
    if (a === 'settings') serverSettings();
    if (a === 'roles') serverSettings('roles');
    if (a === 'members') serverSettings('members');
    if (a === 'text') createChannelDialog('text');
    if (a === 'category') categoryDialog();
    if (a === 'template') serverSettings('template');
    if (a === 'ai') aiBuildDialog({ existing: true });
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
function serverSettings(tab) {
  const s = current(); if (!s) return;
  const p = perms();
  const tabs = [
    p.manage_server && ['overview', 'Visão geral'],
    p.manage_roles && ['roles', 'Cargos'],
    ['members', 'Membros'],
    p.manage_server && ['invites', 'Convites'],
    s.is_owner && ['template', 'Modelo streamer'],
  ].filter(Boolean);
  if (!tabs.some((t) => t[0] === tab)) tab = tabs[0][0];
  const m = openModal(`
    <nav class="settings-nav"><h4>${esc(s.name)}</h4>
      ${tabs.map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join('')}
      ${s.is_owner ? '<button class="red" data-tab="delete">Excluir servidor</button>' : ''}
    </nav>
    <section class="settings-body"><button class="icon-btn close" id="ss-close">${icon('x')}</button><div id="ss-body"></div></section>`,
  { wide: true, onClose: () => { S.ssRefresh = null; } });
  $('#ss-close', m).onclick = closeModal;
  let active = tab;
  const show = (t) => {
    if (t === 'delete') return deleteServer();
    active = t;
    $$('[data-tab]', m).forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    const body = $('#ss-body', m);
    if (t !== 'roles') body._open = null;
    ({ overview: ssOverview, roles: (x) => ssRoles(x, x._open), members: ssMembers, invites: ssInvites, template: ssTemplate })[t](body);
  };
  // quando algo muda no servidor, a aba aberta se atualiza (menos a de edição de texto)
  S.ssRefresh = () => { if (active === 'roles' || active === 'members') show(active); };
  $$('[data-tab]', m).forEach((b) => { b.onclick = () => show(b.dataset.tab); });
  show(tab);
}
function ssOverview(el) {
  const s = current();
  const st = { name: s.name, color: s.color, icon_url: s.icon_url, default_role_id: s.default_role_id || '' };
  el.innerHTML = `<h3>Visão geral do servidor</h3>
    <div class="upload-row"><div id="so-prev"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="so-up">Alterar ícone</button><button class="btn ghost" id="so-rm">Remover</button></div></div>
    <div class="field"><label>Nome do servidor</label><input class="input" id="so-name" maxlength="40" value="${esc(st.name)}"></div>
    <div class="field"><label>Cor</label>${colorGrid(st.color)}</div>
    <div class="field"><label>Cargo automático para quem entra</label><select class="input" id="so-role"><option value="">Nenhum</option>${roles().filter((r) => !r.perms?.admin).map((r) => `<option value="${r.id}" ${r.id === st.default_role_id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
    <div class="error-text" id="so-err"></div>
    <button class="btn primary" id="so-save">Salvar alterações</button>`;
  const prev = () => { $('#so-prev', el).innerHTML = serverIconHtml({ ...st, name: st.name || '?' }); };
  prev();
  $('#so-name', el).oninput = (e) => { st.name = e.target.value; prev(); };
  $('#so-role', el).onchange = (e) => { st.default_role_id = e.target.value; };
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

function ssRoles(el, openId) {
  const list = roles();
  const isAdmin = perms().admin;
  el.innerHTML = `<h3>Cargos</h3>
    <p class="hint" style="margin:-8px 0 14px">O cargo mais alto da lista define a cor do nome. O dono do servidor sempre pode tudo.</p>
    <button class="btn primary" id="rl-new">${icon('plus')}Criar cargo</button>
    <div class="role-list">${list.map((r, i) => `
      <div class="role-row" data-rid="${r.id}">
        <span class="role-dot" style="background:${safeColor(r.color) || '#99aab5'}"></span>
        <b style="color:${safeColor(r.color) || 'inherit'}">${esc(r.name)}</b>
        ${r.perms?.admin ? '<span class="badge">ADMIN</span>' : ''}${r.id === current().default_role_id ? '<span class="badge soft">AUTOMÁTICO</span>' : ''}
        <span class="spacer"></span>
        <button class="icon-btn" data-up="${r.id}" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" data-down="${r.id}" title="Descer" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn ghost" data-open="${r.id}">Editar</button>
      </div>
      <div class="role-edit ${openId === r.id ? '' : 'hidden'}" data-edit="${r.id}"></div>`).join('') || '<p class="hint" style="margin-top:14px">Nenhum cargo ainda.</p>'}</div>`;
  $('#rl-new', el).onclick = async () => {
    try { const r = await api(`/api/servers/${S.serverId}/roles`, { method: 'POST', body: { name: 'novo cargo', color: '#99aab5' } }); S.roles[S.serverId] = [...roles(), r]; ssRoles(el, r.id); } catch (e) { toast(e.message, true); }
  };
  $$('[data-up],[data-down]', el).forEach((b) => {
    b.onclick = () => api(`/api/roles/${b.dataset.up || b.dataset.down}`, { method: 'PATCH', body: { move: b.dataset.up ? -1 : 1 } }).catch((e) => toast(e.message, true));
  });
  const fill = (r) => {
    el._open = r.id;
    const box = $(`[data-edit="${r.id}"]`, el);
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="field"><label>Nome do cargo</label><input class="input" data-f="name" maxlength="32" value="${esc(r.name)}"></div>
      <div class="field"><label>Cor</label><div style="display:flex;gap:10px;align-items:center"><input type="color" data-f="color" value="${safeColor(r.color) || '#99aab5'}" class="color-pick">
        ${['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#99aab5'].map((c) => `<button type="button" class="swatch" data-sw="${c}" style="background:${c}"></button>`).join('')}</div></div>
      <div class="switch"><span>Mostrar separado na lista de membros</span><input type="checkbox" data-f="hoist" ${r.hoist ? 'checked' : ''}></div>
      <h4 class="perm-title">Permissões</h4>
      ${Object.entries(PERM_LABELS).map(([k, [t, d]]) => `
        <div class="switch"><span>${t}<small class="hint" style="display:block">${d}</small></span><input type="checkbox" data-p="${k}" ${r.perms?.[k] ? 'checked' : ''} ${k === 'admin' && !isAdmin ? 'disabled' : ''}></div>`).join('')}
      <div class="error-text" data-err style="margin-top:10px"></div>
      <div class="foot" style="justify-content:space-between;margin-top:6px"><button class="btn danger" data-del>${icon('trash')}Excluir cargo</button><button class="btn primary" data-save>Salvar cargo</button></div>`;
    $$('[data-sw]', box).forEach((b) => { b.onclick = () => { $('[data-f=color]', box).value = b.dataset.sw; }; });
    $('[data-del]', box).onclick = async () => {
      if (!confirm(`Excluir o cargo "${r.name}"? Quem tem esse cargo perde ele.`)) return;
      try { await api(`/api/roles/${r.id}`, { method: 'DELETE' }); } catch (e) { $('[data-err]', box).textContent = e.message; }
    };
    $('[data-save]', box).onclick = async (e) => {
      e.target.disabled = true;
      const body = { name: $('[data-f=name]', box).value, color: $('[data-f=color]', box).value, hoist: $('[data-f=hoist]', box).checked,
        perms: Object.fromEntries($$('[data-p]', box).map((x) => [x.dataset.p, x.checked])) };
      try { await api(`/api/roles/${r.id}`, { method: 'PATCH', body }); toast('Cargo salvo.'); } catch (err) { $('[data-err]', box).textContent = err.message; }
      e.target.disabled = false;
    };
  };
  $$('[data-open]', el).forEach((b) => {
    b.onclick = () => {
      const box = $(`[data-edit="${b.dataset.open}"]`, el);
      const opening = box.classList.contains('hidden');
      $$('.role-edit', el).forEach((x) => { x.classList.add('hidden'); x.innerHTML = ''; });
      el._open = null;
      if (opening) { box.classList.remove('hidden'); fill(list.find((r) => r.id === b.dataset.open)); }
    };
  });
  if (openId && list.some((r) => r.id === openId)) fill(list.find((r) => r.id === openId));
}

async function ssMembers(el) {
  const s = current();
  const p = perms();
  el.innerHTML = `<h3>Membros</h3><div class="spinner"></div>`;
  try {
    const list = await api(`/api/servers/${s.id}/members`);
    const rl = roles();
    const rank = (u) => { const i = rl.findIndex((r) => u.role_ids.includes(r.id) && r.hoist); return i < 0 ? 999 : i; };
    list.sort((a, b) => (b.is_owner - a.is_owner) || (rank(a) - rank(b)) || (b.online - a.online) || a.display_name.localeCompare(b.display_name));
    el.innerHTML = `<h3>Membros — ${list.length}</h3>${list.map((u) => `
      <div class="member-row"><span style="position:relative">${avatarHtml(u)}<span class="dot ${u.online ? 'on' : ''}"></span></span>
        <div class="nm"><b style="color:${safeColor(u.color) || 'inherit'}">${esc(u.display_name)}</b> ${u.is_owner ? '<span class="badge">DONO</span>' : ''}
          <div class="chips">${rl.filter((r) => u.role_ids.includes(r.id)).map((r) => `<span class="chip"><span class="role-dot" style="background:${safeColor(r.color) || '#99aab5'}"></span>${esc(r.name)}</span>`).join('')}</div>
          <small>@${esc(u.username || '')} · ${u.online ? 'Online' : 'Offline'} · entrou em ${new Date(u.joined_at).toLocaleDateString('pt-BR')}</small></div>
        ${u.id !== S.me.id ? `<button class="icon-btn" data-msg="${u.id}" title="Mandar mensagem">${icon('chat')}</button>` : ''}
        ${u.id !== S.me.id && u.username && !S.friends.friends.some((f) => f.user.id === u.id) ? `<button class="icon-btn" data-addf="${esc(u.username)}" title="Adicionar amigo">${icon('userPlus')}</button>` : ''}
        ${p.manage_roles && rl.length ? `<button class="btn ghost" data-roles="${u.id}">Cargos</button>` : ''}
        ${p.kick && !u.is_owner && u.id !== S.me.id ? `<button class="btn danger" data-kick="${u.id}" data-name="${esc(u.display_name)}">Remover</button>` : ''}
      </div>`).join('')}`;
    $$('[data-msg]', el).forEach((b) => { b.onclick = () => openDm(b.dataset.msg); });
    $$('[data-addf]', el).forEach((b) => { b.onclick = () => addFriendByUsername(b.dataset.addf); });
    $$('[data-kick]', el).forEach((b) => {
      b.onclick = async () => {
        if (!confirm(`Remover ${b.dataset.name} do servidor?`)) return;
        try { await api(`/api/servers/${s.id}/members/${b.dataset.kick}`, { method: 'DELETE' }); ssMembers(el); } catch (e) { toast(e.message, true); }
      };
    });
    $$('[data-roles]', el).forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        $('.menu')?.remove();
        const u = list.find((x) => x.id === b.dataset.roles);
        const menu = document.createElement('div');
        menu.className = 'menu role-menu';
        menu.innerHTML = `<div class="menu-title">Cargos de ${esc(u.display_name)}</div>${roleChecks(u.role_ids, 'mrole')}<button class="btn primary block" data-apply style="margin-top:8px;color:#fff;justify-content:center">Salvar</button>`;
        document.body.appendChild(menu);
        const r = b.getBoundingClientRect();
        menu.style.left = Math.max(8, Math.min(r.left, innerWidth - 260)) + 'px';
        menu.style.top = Math.min(r.bottom + 6, innerHeight - menu.offsetHeight - 8) + 'px';
        const off = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', off); } };
        setTimeout(() => document.addEventListener('mousedown', off));
        $('[data-apply]', menu).onclick = async () => {
          const ids = $$('[name=mrole]:checked', menu).map((x) => x.value);
          try { await api(`/api/servers/${s.id}/members/${u.id}/roles`, { method: 'PUT', body: { role_ids: ids } }); menu.remove(); toast('Cargos atualizados.'); }
          catch (err) { toast(err.message, true); }
        };
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
const TEMPLATE_PREVIEW = `
  <div class="tpl">
    <div><h4>Cargos</h4><p>👑 Dono · 🛡️ Staff · 🎥 Parceiro · ⭐ VIP · 🎮 Inscrito (automático) · 🤖 Bots</p></div>
    <div><h4>📌 Informações <small>só leitura</small></h4><p>#📜regras (já com as regras) · #📢avisos · #🎬videos-novos · #🔴ao-vivo</p></div>
    <div><h4>💬 Comunidade</h4><p>#💬geral · #🎮clipes · #😂memes · #📸prints · #💡sugestões</p></div>
    <div><h4>🎮 Jogos</h4><p>#gta-rp · #free-fire · #procurando-duo</p></div>
    <div><h4>🔊 Voz</h4><p>🔊 Geral · 🎮 Jogando 1 · 🎮 Jogando 2 · 🎥 Live do jh11 (só a Staff fala) · 💤 AFK</p></div>
    <div><h4>🛡️ Staff <small>privado</small></h4><p>#staff-chat · 🔊 Reunião Staff</p></div>
  </div>`;
function ssTemplate(el) {
  el.innerHTML = `<h3>Modelo streamer</h3>
    <p class="hint" style="margin:-8px 0 14px">Cria cargos, categorias e canais prontos. Nada que já existe é apagado — só adiciona o que falta.</p>
    ${TEMPLATE_PREVIEW}
    <button class="btn primary" id="tp-apply" style="margin-top:16px">${icon('sparkle')}Aplicar no servidor</button>`;
  $('#tp-apply', el).onclick = async (e) => {
    e.target.disabled = true;
    try {
      const r = await api(`/api/servers/${S.serverId}/template`, { method: 'POST' });
      toast(`Pronto! ${r.roles} cargos, ${r.categories} categorias e ${r.channels} canais criados.`);
      closeModal();
    } catch (err) { toast(err.message, true); e.target.disabled = false; }
  };
}

// ---------------------------------------------------------------- configurações do usuário
function userSettings(tab = 'profile') {
  const cleanup = [];
  const m = openModal(`
    <nav class="settings-nav"><h4>Configurações</h4>
      <button data-tab="profile">Perfil</button><button data-tab="call">Voz e vídeo</button><button data-tab="keys">Atalhos</button><button data-tab="account">Conta</button>
      <button class="red" data-tab="logout">Sair</button></nav>
    <section class="settings-body"><button class="icon-btn close" id="us-close">${icon('x')}</button><div id="us-body"></div></section>`,
  { wide: true, onClose: () => { capturing = null; cleanup.splice(0).forEach((f) => f()); } });
  $('#us-close', m).onclick = closeModal;
  const show = (t) => {
    if (t === 'logout') { closeModal(); return logout(); }
    cleanup.splice(0).forEach((f) => f());
    $$('[data-tab]', m).forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    capturing = null;
    ({ profile: usProfile, call: usCall, keys: usKeys, account: usAccount })[t]($('#us-body', m), cleanup);
  };
  $$('[data-tab]', m).forEach((b) => { b.onclick = () => show(b.dataset.tab); });
  show(tab);
}
function usProfile(el) {
  const st = { display_name: S.me.display_name, avatar_url: S.me.avatar_url, username: S.me.username };
  el.innerHTML = `<h3>Perfil</h3>
    <div class="upload-row"><div id="up-prev"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="up-up">Alterar foto</button><button class="btn ghost" id="up-rm">Remover</button></div></div>
    <div class="field"><label>Nome de exibição</label><input class="input" id="up-name" maxlength="32" value="${esc(st.display_name)}"></div>
    <div class="field"><label>Nome de usuário</label><div class="at-input"><span>@</span><input class="input" id="up-user" maxlength="20" value="${esc(S.me.username || '')}" spellcheck="false"></div><span class="hint">Seus amigos usam esse nome para te adicionar.</span></div>
    <div class="field"><label>E-mail</label><input class="input" value="${esc(S.me.email)}" disabled></div>
    <div class="error-text" id="up-err"></div>
    <button class="btn primary" id="up-save">Salvar alterações</button>`;
  const prev = () => { $('#up-prev', el).innerHTML = avatarHtml({ ...st, display_name: st.display_name || '?' }, 'lg'); };
  prev();
  $('#up-name', el).oninput = (e) => { st.display_name = e.target.value; prev(); };
  $('#up-user', el).oninput = (e) => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''); st.username = e.target.value; };
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

// =============================================================== IA que monta o servidor
const AI_EXAMPLES = [
  'Comunidade do meu canal de YouTube de gameplay, com lives, clipes e sorteios',
  'Servidor de GTA RP com polícia, hospital, empregos e staff',
  'Clã de Free Fire com treinos, campeonatos e escalação',
  'Servidor de amigos para jogar Valorant e Minecraft e ouvir música',
];
function planPreviewHtml(plan) {
  return `<div class="tpl">
    <div><h4>Cargos</h4><p>${plan.roles.map((r) => `<span class="chip"><span class="role-dot" style="background:${safeColor(r.color) || '#99aab5'}"></span>${esc(r.name)}${r.default ? ' <small>(automático)</small>' : ''}</span>`).join(' ')}</p></div>
    ${plan.categories.map((c) => `<div><h4>${esc(c.name)}${c.private ? ' <small>privado</small>' : ''}</h4><p>${c.channels.map((ch) => `${ch.kind === 'voice' ? '🔊' : '#'}${esc(ch.name)}${ch.read_only ? '<small> (só leitura)</small>' : ''}`).join(' · ')}</p></div>`).join('')}
    ${plan.rules ? `<div><h4>Regras</h4><p style="white-space:pre-wrap">${esc(plan.rules)}</p></div>` : ''}
  </div>`;
}
async function aiBuildDialog(opts = {}) {
  const existing = opts.existing ? current() : null;
  let plan = null;
  const m = openModal(`
    <h2>${icon('sparkle')} Montar servidor com IA</h2>
    <p class="sub">${existing ? `Descreva como você quer o <b>${esc(existing.name)}</b>` : 'Descreva o servidor dos seus sonhos'} e a IA cria cargos, categorias, canais e regras do seu jeito.</p>
    <div id="ai-step1">
      ${existing ? '' : `<div class="field"><label>Nome do servidor</label><input class="input" id="ai-name" maxlength="40" value="${esc(`Servidor de ${S.me.display_name}`)}"></div>`}
      <div class="field"><label>Como você quer o servidor?</label><textarea class="input" id="ai-prompt" rows="4" maxlength="1500" style="height:auto;padding:10px 12px;resize:vertical" placeholder="Ex.: servidor pro meu canal de gameplay, com área de clipes, sorteios, canal de GTA RP e Free Fire, staff e sala de live"></textarea></div>
      <div class="ai-chips">${AI_EXAMPLES.map((x) => `<button type="button" class="chip-btn" data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <div class="switch"><span>Usar emojis nos nomes</span><input type="checkbox" id="ai-emoji" checked></div>
      ${existing ? `<div class="switch"><span>Apagar canais, categorias e cargos atuais antes <small class="hint" style="display:block">As mensagens desses canais também são apagadas.</small></span><input type="checkbox" id="ai-replace"></div>` : ''}
      <div class="error-text" id="ai-err" style="margin-top:12px"></div>
      <div class="foot"><button class="btn ghost" id="ai-cancel">Cancelar</button><button class="btn primary" id="ai-go">${icon('sparkle')}Gerar</button></div>
    </div>
    <div id="ai-step2" class="hidden">
      <p class="hint" id="ai-source" style="margin:0 0 10px"></p>
      <div id="ai-preview" style="max-height:48vh;overflow:auto"></div>
      <div class="error-text" id="ai-err2" style="margin-top:10px"></div>
      <div class="foot" style="justify-content:space-between"><button class="btn ghost" id="ai-back">Voltar e mudar</button>
        <span style="display:flex;gap:8px"><button class="btn" id="ai-again">Gerar de novo</button><button class="btn primary" id="ai-apply">${existing ? 'Aplicar no servidor' : 'Criar servidor'}</button></span></div>
    </div>`);
  m.style.maxWidth = '600px';
  $('#ai-cancel', m).onclick = closeModal;
  $$('[data-ex]', m).forEach((b) => { b.onclick = () => { $('#ai-prompt', m).value = b.dataset.ex; }; });
  const generate = async (btn) => {
    const prompt = $('#ai-prompt', m).value.trim();
    if (prompt.length < 4) { $('#ai-err', m).textContent = 'Escreva como você quer o servidor (ou clique num exemplo).'; return; }
    btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = '<span class="spinner sm"></span>Gerando…';
    $('#ai-err', m).textContent = ''; $('#ai-err2', m).textContent = '';
    try {
      const r = await api('/api/ai/plan', { method: 'POST', body: { prompt, emoji: $('#ai-emoji', m).checked } });
      plan = r.plan;
      $('#ai-source', m).innerHTML = r.source === 'local'
        ? `${r.warning ? esc(r.warning) + ' ' : ''}Feito pelo <b>assistente básico</b> (sem chave de IA configurada no servidor).`
        : `Feito pela IA <b>${esc(r.source)}</b>. Não gostou? Gere de novo ou mude o pedido.`;
      $('#ai-preview', m).innerHTML = planPreviewHtml(plan);
      $('#ai-step1', m).classList.add('hidden'); $('#ai-step2', m).classList.remove('hidden');
    } catch (err) { ($('#ai-step2', m).classList.contains('hidden') ? $('#ai-err', m) : $('#ai-err2', m)).textContent = err.message; }
    btn.disabled = false; btn.innerHTML = old;
  };
  $('#ai-go', m).onclick = (e) => generate(e.currentTarget);
  $('#ai-again', m).onclick = (e) => generate(e.currentTarget);
  $('#ai-back', m).onclick = () => { $('#ai-step2', m).classList.add('hidden'); $('#ai-step1', m).classList.remove('hidden'); };
  $('#ai-apply', m).onclick = async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try {
      if (existing) {
        const replace = $('#ai-replace', m)?.checked;
        if (replace && !confirm('Apagar TODOS os canais, categorias e cargos atuais e montar o novo servidor?')) { btn.disabled = false; return; }
        const r = await api(`/api/servers/${existing.id}/apply-plan`, { method: 'POST', body: { plan, replace } });
        closeModal();
        toast(`Pronto! ${r.roles} cargos, ${r.categories} categorias e ${r.channels} canais criados.`);
      } else {
        const name = $('#ai-name', m).value.trim() || `Servidor de ${S.me.display_name}`;
        const s = await api('/api/servers', { method: 'POST', body: { name, plan } });
        S.servers.push(s);
        closeModal();
        navigate(`/s/${s.id}`);
        toast('Servidor criado pela IA!');
      }
    } catch (err) { $('#ai-err2', m).textContent = err.message; btn.disabled = false; }
  };
}

// =============================================================== teclas de atalho
const SHORTCUTS = [
  ['quick', 'Busca rápida (servidores, canais e conversas)', 'Ctrl+K'],
  ['mute', 'Silenciar / ativar microfone', 'Ctrl+Alt+M'],
  ['deafen', 'Desativar / ativar áudio', 'Ctrl+Alt+D'],
  ['streamer', 'Modo streamer (muta e para de ouvir)', 'F9'],
  ['camera', 'Ligar / desligar câmera', 'Ctrl+Alt+C'],
  ['screen', 'Compartilhar tela', 'Ctrl+Alt+S'],
  ['fullscreen', 'Tela cheia da transmissão', 'Ctrl+Alt+F'],
  ['leave', 'Sair da chamada', 'Ctrl+Alt+L'],
  ['prevChannel', 'Canal anterior', 'Alt+ArrowUp'],
  ['nextChannel', 'Próximo canal', 'Alt+ArrowDown'],
  ['prevServer', 'Servidor anterior', 'Ctrl+Alt+ArrowUp'],
  ['nextServer', 'Próximo servidor', 'Ctrl+Alt+ArrowDown'],
  ['dms', 'Abrir conversas', 'Ctrl+Alt+H'],
  ['newDm', 'Nova conversa', 'Ctrl+Alt+N'],
  ['settings', 'Configurações', 'Ctrl+Alt+,'],
];
function loadKeys() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('gp_keys') || '{}'); } catch { /* ignora */ }
  const map = {};
  SHORTCUTS.forEach(([k, , def]) => { map[k] = saved[k] !== undefined ? saved[k] : def; });
  map.ptt = saved.ptt || { on: false, code: 'F8' };
  return map;
}
let KEYS = loadKeys();
function saveKeys() { try { localStorage.setItem('gp_keys', JSON.stringify(KEYS)); } catch { /* ignora */ } }
function comboOf(e) {
  let k;
  if (/^Key[A-Z]$/.test(e.code)) k = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) k = e.code.slice(5);
  else if (e.code === 'Comma') k = ',';
  else if (e.code === 'Period') k = '.';
  else if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(e.key)) return '';
  else k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  return [(e.ctrlKey || e.metaKey) && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', k].filter(Boolean).join('+');
}
const KEY_NAMES = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ' ': 'Espaço', Escape: 'Esc' };
const keyLabel = (combo) => (combo ? combo.split('+').map((p) => `<kbd>${esc(KEY_NAMES[p] || p)}</kbd>`).join('<span class="plus">+</span>') : '<span class="hint">sem atalho</span>');
const codeLabel = (code) => (code || '').replace(/^Key/, '').replace(/^Digit/, '').replace('Backquote', "'") || '—';
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

function navOrder() {
  const s = current(); if (!s) return [];
  const chs = S.channels[s.id] || [];
  const known = new Set((s.categories || []).map((c) => c.id));
  return [...chs.filter((c) => !known.has(c.category_id)), ...(s.categories || []).flatMap((cat) => chs.filter((c) => c.category_id === cat.id))];
}
function stepChannel(dir) {
  if (!S.serverId) {
    const list = S.dms; if (!list.length) return;
    const i = list.findIndex((d) => d.id === S.dmId);
    const n = list[(i + dir + list.length) % list.length];
    return navigate(`/dm/${n.id}`);
  }
  const list = navOrder(); if (!list.length) return;
  const i = list.findIndex((c) => c.id === S.channelId);
  const n = list[(i + dir + list.length) % list.length];
  navigate(`/s/${S.serverId}/${n.id}`);
}
function stepServer(dir) {
  const ids = [null, ...S.servers.map((s) => s.id)];
  const i = ids.indexOf(S.serverId);
  const n = ids[(i + dir + ids.length) % ids.length];
  navigate(n ? `/s/${n}` : '/');
}
const ACTIONS = {
  quick: () => quickSwitcher(),
  mute: () => (call ? toggleMute() : toast('Você não está em uma chamada.')),
  deafen: () => (call ? toggleDeafen() : toast('Você não está em uma chamada.')),
  streamer: () => toggleStreamer(),
  camera: () => (call ? toggleCamera() : toast('Você não está em uma chamada.')),
  screen: () => (call ? toggleScreen() : toast('Você não está em uma chamada.')),
  leave: () => call && leaveCall(),
  fullscreen: () => {
    if (!call) return;
    if (call.focusKey) return exitFocus();
    const parts = S.voice[call.channelId] || [];
    const sharer = parts.find((p) => p.screen && p.socket_id !== socket.id) || parts.find((p) => p.screen);
    const k = sharer ? sharer.socket_id + ':s' : $('#call-grid .tile')?.dataset.key;
    if (S.channelId !== call.channelId) navigate(`/s/${call.serverId}/${call.channelId}`);
    if (k) setTimeout(() => enterFocus(k), 50);
  },
  prevChannel: () => stepChannel(-1),
  nextChannel: () => stepChannel(1),
  prevServer: () => stepServer(-1),
  nextServer: () => stepServer(1),
  dms: () => navigate('/'),
  newDm: () => newDmDialog(),
  settings: () => userSettings('profile'),
};

// apertar para falar
function applyMic() {
  if (!call?.audioTrack) return;
  const ptt = KEYS.ptt.on && !call.listenOnly;
  call.audioTrack.enabled = !call.muted && !call.listenOnly && (!ptt || !!call.pttDown);
}
function setPtt(down) {
  if (!call || !KEYS.ptt.on || call.pttDown === down) return;
  call.pttDown = down;
  applyMic();
  document.body.classList.toggle('ptt-live', down && !call.muted);
}
window.addEventListener('blur', () => setPtt(false));

let capturing = null;
document.addEventListener('keydown', (e) => {
  if (!S.me) return;
  if (capturing) { e.preventDefault(); e.stopPropagation(); capturing(e); return; }
  if (KEYS.ptt.on && e.code === KEYS.ptt.code && !isTyping(e.target)) { e.preventDefault(); if (!e.repeat) setPtt(true); return; }
  const combo = comboOf(e);
  if (!combo) return;
  const typing = isTyping(e.target);
  if (combo === 'Shift+?' || combo === '?') { if (!typing) { e.preventDefault(); shortcutsHelp(); } return; }
  const action = Object.keys(ACTIONS).find((k) => KEYS[k] && KEYS[k] === combo);
  if (action) {
    if (typing && !/Ctrl|Alt/.test(combo) && !/^F\d{1,2}$/.test(combo)) return;
    if ($('#modal-root').innerHTML && !['quick', 'mute', 'deafen', 'streamer'].includes(action)) closeModal();
    e.preventDefault();
    ACTIONS[action]();
    return;
  }
  // começar a digitar em qualquer lugar vai para a caixa de mensagem
  if (!typing && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && !$('#modal-root').innerHTML) $('#msg-input')?.focus();
}, true);
document.addEventListener('keyup', (e) => { if (KEYS.ptt.on && e.code === KEYS.ptt.code) setPtt(false); }, true);

function shortcutsHelp() {
  const m = openModal(`<h2>Teclas de atalho</h2><p class="sub">Funcionam com o Lumix aberto e em foco. Mude as teclas em Configurações → Atalhos.</p>
    <div class="keys-list">
      ${SHORTCUTS.map(([k, label]) => `<div class="key-row"><span>${label}</span><span>${keyLabel(KEYS[k])}</span></div>`).join('')}
      <div class="key-row"><span>Apertar para falar ${KEYS.ptt.on ? '' : '<small class="hint">(desligado)</small>'}</span><span><kbd>${esc(codeLabel(KEYS.ptt.code))}</kbd></span></div>
      <div class="key-row"><span>Mostrar esta lista</span><span><kbd>?</kbd></span></div>
      <div class="key-row"><span>Fechar janelas / sair da tela cheia</span><span><kbd>Esc</kbd></span></div>
      <div class="key-row"><span>Enviar mensagem · nova linha</span><span><kbd>Enter</kbd> · <kbd>Shift</kbd><span class="plus">+</span><kbd>Enter</kbd></span></div>
    </div>
    <div class="foot"><button class="btn" id="kh-edit">Mudar atalhos</button><button class="btn primary" id="kh-ok">Fechar</button></div>`);
  $('#kh-ok', m).onclick = closeModal;
  $('#kh-edit', m).onclick = () => userSettings('keys');
}

function quickSwitcher() {
  const items = [
    ...S.servers.map((s) => ({ label: s.name, sub: 'Servidor', go: `/s/${s.id}`, icon: serverIconHtml(s, 'mini-icon') })),
    ...S.servers.flatMap((s) => (S.channels[s.id] || []).map((c) => ({ label: c.name, sub: s.name, go: `/s/${s.id}/${c.id}`, icon: icon(c.kind === 'voice' ? 'volume' : 'hash') }))),
    ...S.dms.map((d) => ({ label: d.user.display_name, sub: 'Conversa', go: `/dm/${d.id}`, icon: avatarHtml(d.user, 'sm') })),
  ];
  let sel = 0, shown = [];
  const m = openModal(`<input class="input qs-input" id="qs" placeholder="Para onde você quer ir?" autocomplete="off"><div class="qs-list" id="qs-list"></div>
    <p class="hint" style="margin:10px 0 0"><kbd>↑</kbd> <kbd>↓</kbd> para escolher · <kbd>Enter</kbd> para ir · <kbd>Esc</kbd> para fechar</p>`);
  const inp = $('#qs', m);
  setTimeout(() => inp.focus(), 20);
  const draw = () => {
    const q = inp.value.trim().toLowerCase();
    shown = items.filter((i) => !q || i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)).slice(0, 12);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    $('#qs-list', m).innerHTML = shown.map((i, n) => `<button class="qs-item ${n === sel ? 'sel' : ''}" data-n="${n}">${i.icon}<span>${esc(i.label)}</span><small>${esc(i.sub)}</small></button>`).join('') || '<p class="hint" style="padding:10px">Nada encontrado.</p>';
    $$('[data-n]', m).forEach((b) => { b.onclick = () => go(shown[+b.dataset.n]); });
  };
  const go = (i) => { if (!i) return; closeModal(); setNav(false); navigate(i.go); };
  inp.oninput = () => { sel = 0; draw(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); draw(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); draw(); }
    if (e.key === 'Enter') { e.preventDefault(); go(shown[sel]); }
  };
  draw();
}

function usKeys(el) {
  el.innerHTML = `<h3>Teclas de atalho</h3>
    <p class="hint" style="margin:-8px 0 14px">Clique num atalho e aperte as teclas novas. <kbd>Backspace</kbd> apaga, <kbd>Esc</kbd> cancela. Os atalhos funcionam com o site aberto e em foco.</p>
    <div class="keys-list">${SHORTCUTS.map(([k, label]) => `<div class="key-row"><span>${label}</span><button class="key-btn" data-key="${k}">${keyLabel(KEYS[k])}</button></div>`).join('')}</div>
    <h4 class="perm-title">Apertar para falar</h4>
    <div class="switch"><span>Ligar "apertar para falar"<small class="hint" style="display:block">Seu microfone só transmite enquanto você segura a tecla.</small></span><input type="checkbox" id="ptt-on" ${KEYS.ptt.on ? 'checked' : ''}></div>
    <div class="key-row" style="margin-top:8px"><span>Tecla</span><button class="key-btn" id="ptt-key"><kbd>${esc(codeLabel(KEYS.ptt.code))}</kbd></button></div>
    <div class="foot" style="justify-content:flex-start"><button class="btn ghost" id="keys-reset">Voltar ao padrão</button></div>`;
  const stopCapture = () => { capturing = null; $$('.key-btn', el).forEach((b) => b.classList.remove('rec')); };
  $$('[data-key]', el).forEach((b) => {
    b.onclick = () => {
      stopCapture();
      b.classList.add('rec'); b.innerHTML = 'Aperte as teclas…';
      capturing = (e) => {
        if (e.key === 'Escape') { stopCapture(); return usKeys(el); }
        if (e.key === 'Backspace' || e.key === 'Delete') { KEYS[b.dataset.key] = ''; saveKeys(); stopCapture(); return usKeys(el); }
        const c = comboOf(e); if (!c) return;
        if (!/Ctrl|Alt/.test(c) && !/^(Shift\+)?F\d{1,2}$/.test(c)) { b.innerHTML = 'Use Ctrl, Alt ou uma tecla F1–F12'; return; }
        const clash = SHORTCUTS.find(([k]) => k !== b.dataset.key && KEYS[k] === c);
        if (clash) KEYS[clash[0]] = '';
        KEYS[b.dataset.key] = c; saveKeys(); stopCapture(); usKeys(el);
        if (clash) toast(`"${clash[1]}" ficou sem atalho.`);
      };
    };
  });
  $('#ptt-on', el).onchange = (e) => { KEYS.ptt.on = e.target.checked; saveKeys(); if (call) { call.pttDown = false; applyMic(); } };
  $('#ptt-key', el).onclick = (ev) => {
    stopCapture();
    const b = ev.currentTarget; b.classList.add('rec'); b.innerHTML = 'Aperte uma tecla…';
    capturing = (e) => {
      if (e.key === 'Escape') { stopCapture(); return usKeys(el); }
      KEYS.ptt.code = e.code; saveKeys(); stopCapture(); usKeys(el);
    };
  };
  $('#keys-reset', el).onclick = () => {
    const ptt = KEYS.ptt;
    try { localStorage.removeItem('gp_keys'); } catch { /* ignora */ }
    KEYS = loadKeys(); KEYS.ptt = ptt; saveKeys(); usKeys(el); toast('Atalhos restaurados.');
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
