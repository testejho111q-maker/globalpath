// Lumix — servidor completo (Express + Socket.IO + banco em arquivo JSON)
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const COOKIE = 'gp_session';
const SESSION_DAYS = 30;

// ---------------------------------------------------------------- banco
fs.mkdirSync(DATA_DIR, { recursive: true });
const EMPTY = { users: [], sessions: [], servers: [], members: [], channels: [], messages: [], roles: [], dms: [], dm_messages: [], uploads: [], friends: [], blocks: [], reports: [] };
let db;
try {
  db = { ...JSON.parse(JSON.stringify(EMPTY)), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
} catch {
  db = JSON.parse(JSON.stringify(EMPTY));
}
// armazenamento permanente (MongoDB), se configurado
const { createStore } = require('./storage');
const store = process.env.MONGODB_URI ? createStore({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB }) : null;
if (!store) console.warn('Aviso: MONGODB_URI não configurado — os dados ficam só no disco local.');

// migração de dados antigos
function migrate() {
db.servers.forEach((s) => {
  if (!Array.isArray(s.categories)) {
    s.categories = [{ id: cid(), name: 'Canais de texto' }, { id: cid(), name: 'Canais de voz' }];
    db.channels.filter((c) => c.server_id === s.id).forEach((c, i) => {
      c.category_id = c.kind === 'voice' ? s.categories[1].id : s.categories[0].id;
      c.position = i;
    });
  }
});
db.members.forEach((m) => { if (!Array.isArray(m.role_ids)) m.role_ids = []; });
Object.keys(EMPTY).forEach((k) => { if (!Array.isArray(db[k])) db[k] = []; });
// todo usuário precisa de um nome de usuário único
db.users.forEach((u) => { if (!u.username) u.username = makeUsername(u.display_name); });
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
  store?.saveDb(() => JSON.stringify(db));
}
function flushSync() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
}
async function shutdown() {
  flushSync();
  if (store) { try { await store.flush(() => JSON.stringify(db)); } catch (e) { console.error(e.message); } }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function id() { return crypto.randomBytes(12).toString('hex'); }
function cid() { return crypto.randomBytes(6).toString('hex'); }
const now = () => new Date().toISOString();
const inviteCode = () => crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8);

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.timingSafeEqual(crypto.scryptSync(pw, salt, 64), Buffer.from(hash, 'hex'));
}

const publicUser = (u) => u && ({ id: u.id, username: u.username || '', display_name: u.display_name, avatar_url: u.avatar_url || '', email: u.email,
  bio: u.bio || '', status_text: u.status_text || '', banner_url: u.banner_url || '', accent: u.accent || '', privacy: privacyOf(u),
  two_factor: !!u.totp_secret, is_admin: isAdmin(u), badges: badgesOf(u), created_at: u.created_at });
function privacyOf(u) { return { dms: u.privacy?.dms || 'servers', friend_requests: u.privacy?.friend_requests || 'everyone', show_bio: u.privacy?.show_bio !== false }; }
// administradores da plataforma: e-mails em ADMIN_EMAILS, ou a primeira conta criada
function isAdmin(u) {
  if (!u) return false;
  const list = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
  if (list.length) return list.includes(u.email);
  return db.users[0]?.id === u.id;
}
const FOUNDER_LIMIT = Number(process.env.FOUNDER_LIMIT || 100);
function badgesOf(u) {
  const out = [];
  if (isAdmin(u)) out.push('equipe');
  const idx = db.users.indexOf(u);
  if (idx >= 0 && idx < FOUNDER_LIMIT) out.push('fundador');
  return out;
}
// dados de outra pessoa (sem e-mail)
const personOf = (u) => u && ({ id: u.id, username: u.username || '', display_name: u.display_name, avatar_url: u.avatar_url || '', online: socketsOf(u.id).length > 0 });
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
function normUsername(v) { return String(v || '').trim().toLowerCase().replace(/^@/, ''); }
function usernameTaken(name, exceptId) { return db.users.some((u) => u.username === name && u.id !== exceptId); }
function makeUsername(base) {
  let b = String(base || 'user').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 14);
  if (b.length < 3) b = (b + 'user').slice(0, 6);
  let n = b;
  while (usernameTaken(n)) n = `${b}${Math.floor(1000 + Math.random() * 9000)}`;
  return n;
}
const userById = (uid) => db.users.find((u) => u.id === uid);
const memberOf = (sid, uid) => db.members.find((m) => m.server_id === sid && m.user_id === uid);
const isMember = (sid, uid) => !!memberOf(sid, uid);
const serverById = (sid) => db.servers.find((s) => s.id === sid);
const channelById = (x) => db.channels.find((c) => c.id === x);
const serverRoles = (sid) => db.roles.filter((r) => r.server_id === sid).sort((a, b) => a.position - b.position);

// ---------------------------------------------------------------- permissões
const PERMS = ['admin', 'manage_server', 'manage_channels', 'manage_roles', 'manage_messages', 'kick'];
const ALL = Object.fromEntries(PERMS.map((p) => [p, true]));
function permsOf(sid, uid) {
  const s = serverById(sid);
  const m = memberOf(sid, uid);
  if (!s || !m) return Object.fromEntries(PERMS.map((p) => [p, false]));
  if (s.owner_id === uid) return { ...ALL };
  const p = Object.fromEntries(PERMS.map((k) => [k, false]));
  serverRoles(sid).filter((r) => m.role_ids.includes(r.id)).forEach((r) => PERMS.forEach((k) => { if (r.perms?.[k]) p[k] = true; }));
  return p.admin ? { ...ALL } : p;
}
function canSee(c, uid) {
  if (!c || !isMember(c.server_id, uid)) return false;
  if (!c.allowed_roles?.length) return true;
  if (permsOf(c.server_id, uid).admin) return true;
  const m = memberOf(c.server_id, uid);
  return c.allowed_roles.some((r) => m.role_ids.includes(r));
}
function canAttach(c) {
  const a = c.allow || {};
  return { images: a.images !== false, files: a.files !== false, audio: a.audio !== false };
}
function canPost(c, uid) {
  return canSee(c, uid) && (!c.read_only || permsOf(c.server_id, uid).manage_messages);
}
// cor e cargo em destaque de um membro (o cargo mais alto que tem cor)
function topRole(sid, uid) {
  const m = memberOf(sid, uid); if (!m) return null;
  return serverRoles(sid).find((r) => m.role_ids.includes(r.id) && r.color) || null;
}

// ---------------------------------------------------------------- modelos / planos de servidor
// Um "plano" descreve cargos, categorias e canais. O modelo streamer e a IA geram planos.
const STREAMER_PLAN = {
  roles: [
    { name: '👑 Dono', color: '#ef4444', hoist: true, perms: { admin: true }, owner: true },
    { name: '🛡️ Staff', color: '#f97316', hoist: true, perms: { manage_messages: true, kick: true, manage_channels: true }, staff: true },
    { name: '🎥 Parceiro', color: '#a855f7', hoist: true, perms: {} },
    { name: '⭐ VIP', color: '#eab308', hoist: true, perms: {} },
    { name: '🎮 Inscrito', color: '#22c55e', hoist: false, perms: {}, default: true },
    { name: '🤖 Bots', color: '#9ca3af', hoist: false, perms: {} },
  ],
  categories: [
    { name: '📌 Informações', channels: [
      { name: '📜regras', kind: 'text', read_only: true, topic: 'Leia antes de participar.' },
      { name: '📢avisos', kind: 'text', read_only: true, topic: 'Novidades do canal e do servidor.' },
      { name: '🎬videos-novos', kind: 'text', read_only: true, topic: 'Todo vídeo novo aparece aqui.' },
      { name: '🔴ao-vivo', kind: 'text', read_only: true, topic: 'Aviso de live.' },
    ] },
    { name: '💬 Comunidade', channels: [
      { name: '💬geral', kind: 'text', topic: 'Bate-papo livre.' },
      { name: '🎮clipes', kind: 'text', topic: 'Mande seus melhores clipes.' },
      { name: '😂memes', kind: 'text' },
      { name: '📸prints', kind: 'text' },
      { name: '💡sugestões', kind: 'text', topic: 'Ideias de vídeo e melhorias para o servidor.' },
    ] },
    { name: '🎮 Jogos', channels: [
      { name: 'gta-rp', kind: 'text' },
      { name: 'free-fire', kind: 'text' },
      { name: 'procurando-duo', kind: 'text', topic: 'Ache alguém para jogar.' },
    ] },
    { name: '🔊 Voz', channels: [
      { name: '🔊 Geral', kind: 'voice' },
      { name: '🎮 Jogando 1', kind: 'voice' },
      { name: '🎮 Jogando 2', kind: 'voice' },
      { name: '🎥 Live do jh11', kind: 'voice', read_only: true },
      { name: '💤 AFK', kind: 'voice' },
    ] },
    { name: '🛡️ Staff', private: true, channels: [
      { name: 'staff-chat', kind: 'text' },
      { name: '🔊 Reunião Staff', kind: 'voice' },
    ] },
  ],
  rules: [
    '📜 **Regras do servidor**', '',
    '1. Respeito acima de tudo — sem ofensas, preconceito ou assédio.',
    '2. Nada de spam, flood ou divulgação sem permissão da Staff.',
    '3. Conteúdo +18, violento ou ilegal é proibido.',
    '4. Use cada canal para o assunto certo.',
    '5. Não peça cargo — a Staff dá cargo para quem ajuda a comunidade.',
    '6. Siga as orientações da Staff.', '',
    'Quem quebrar as regras pode levar castigo, expulsão ou banimento. Bora jogar! 🎮',
  ].join('\n'),
};

// limpa e limita um plano vindo de fora (IA ou navegador)
function sanitizePlan(plan) {
  const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const out = { roles: [], categories: [], rules: str(plan?.rules, 1800) };
  let owner = false, def = false;
  (Array.isArray(plan?.roles) ? plan.roles : []).slice(0, 12).forEach((r) => {
    const name = str(r?.name, 32); if (!name) return;
    const role = { name, color: validColor(r.color) ? r.color : '#99aab5', hoist: !!r.hoist, perms: {} };
    PERMS.forEach((k) => { if (r.perms?.[k]) role.perms[k] = true; });
    if (r.owner && !owner) { role.owner = true; role.perms = { admin: true }; owner = true; }
    if (r.default && !def && !role.perms.admin) { role.default = true; def = true; }
    if (r.staff) role.staff = true;
    out.roles.push(role);
  });
  let total = 0;
  (Array.isArray(plan?.categories) ? plan.categories : []).slice(0, 10).forEach((c) => {
    const name = str(c?.name, 40); if (!name) return;
    const cat = { name, private: !!c.private, channels: [] };
    (Array.isArray(c.channels) ? c.channels : []).slice(0, 15).forEach((ch) => {
      if (total >= 60) return;
      const kind = ch?.kind === 'voice' ? 'voice' : 'text';
      let n = str(ch?.name, 40);
      if (kind === 'text') n = n.toLowerCase().replace(/\s+/g, '-');
      if (!n) return;
      const item = { name: n, kind, read_only: !!ch.read_only, topic: str(ch.topic, 200) };
      if (kind === 'text' && (ch.text_only || ch.allow)) item.allow = ch.text_only ? { images: false, files: false, audio: false } : { images: ch.allow.images !== false, files: ch.allow.files !== false, audio: ch.allow.audio !== false };
      cat.channels.push(item);
      total++;
    });
    out.categories.push(cat);
  });
  return out;
}

function applyPlan(s, ownerId, rawPlan, { replace = false } = {}) {
  const plan = sanitizePlan(rawPlan);
  const out = { roles: 0, channels: 0, categories: 0 };
  if (replace) {
    const chIds = db.channels.filter((c) => c.server_id === s.id).map((c) => c.id);
    for (const [, sock] of io.sockets.sockets) if (chIds.includes(sock.data.voice)) leaveVoice(sock);
    removeUploads(attIds(db.messages.filter((m) => chIds.includes(m.channel_id))));
    db.messages = db.messages.filter((m) => !chIds.includes(m.channel_id));
    db.channels = db.channels.filter((c) => c.server_id !== s.id);
    db.roles = db.roles.filter((r) => r.server_id !== s.id);
    db.members.forEach((m) => { if (m.server_id === s.id) m.role_ids = []; });
    s.categories = [];
    s.default_role_id = null;
  }
  const base = serverRoles(s.id).length;
  const made = [];
  plan.roles.forEach((r, i) => {
    let role = db.roles.find((x) => x.server_id === s.id && x.name === r.name);
    if (!role) {
      role = { id: id(), server_id: s.id, name: r.name, color: r.color, hoist: r.hoist, perms: { ...r.perms }, position: base + i };
      db.roles.push(role); out.roles++;
    }
    made.push({ ...r, id: role.id });
  });
  const ownerRole = made.find((r) => r.owner);
  const defRole = made.find((r) => r.default);
  const staffIds = made.filter((r) => r.staff || r.owner || r.perms.admin).map((r) => r.id);
  const owner = memberOf(s.id, ownerId);
  if (owner && ownerRole && !owner.role_ids.includes(ownerRole.id)) owner.role_ids.push(ownerRole.id);
  if (defRole && !s.default_role_id) {
    s.default_role_id = defRole.id;
    db.members.filter((m) => m.server_id === s.id && m.user_id !== ownerId).forEach((m) => {
      if (!m.role_ids.includes(defRole.id)) m.role_ids.push(defRole.id);
    });
  }
  let pos = Math.max(0, ...db.channels.filter((c) => c.server_id === s.id).map((c) => c.position || 0)) + 1;
  let rulesPosted = !plan.rules;
  plan.categories.forEach((cat) => {
    let category = s.categories.find((c) => c.name === cat.name);
    if (!category) { category = { id: cid(), name: cat.name }; s.categories.push(category); out.categories++; }
    cat.channels.forEach((ch) => {
      if (db.channels.some((c) => c.server_id === s.id && c.name === ch.name && c.kind === ch.kind)) return;
      const c = { id: id(), server_id: s.id, name: ch.name, kind: ch.kind, category_id: category.id, position: pos++,
        topic: ch.topic || '', read_only: ch.read_only, allowed_roles: cat.private && staffIds.length ? [...staffIds] : [], created_at: now() };
      if (ch.allow) c.allow = ch.allow;
      db.channels.push(c); out.channels++;
      if (!rulesPosted && ch.kind === 'text' && /regra|rule/i.test(ch.name)) {
        db.messages.push({ id: id(), channel_id: c.id, server_id: s.id, author_id: ownerId, author_name: userById(ownerId)?.display_name || '', content: plan.rules, created_at: now() });
        rulesPosted = true;
      }
    });
  });
  // categorias do plano no topo, na ordem do plano
  const names = plan.categories.map((c) => c.name);
  s.categories.sort((a, b) => {
    const ia = names.indexOf(a.name), ib = names.indexOf(b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  save();
  return out;
}
const applyTemplate = (s, ownerId) => applyPlan(s, ownerId, STREAMER_PLAN);

// ---------------------------------------------------------------- IA que monta o servidor
const AI_SYSTEM = `Você monta a estrutura de servidores de comunidade (estilo Discord) para o app Lumix.
Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato:
{"roles":[{"name":"👑 Dono","color":"#ef4444","hoist":true,"perms":{"admin":true},"owner":true}],
 "categories":[{"name":"📌 Informações","private":false,"channels":[{"name":"📜regras","kind":"text","read_only":true,"topic":"Leia antes de participar."}]}],
 "rules":"texto das regras em português, com quebras de linha \\n"}
Regras:
- Tudo em português do Brasil, nomes curtos e criativos no estilo que a pessoa pedir.
- Canais de texto: minúsculas, sem espaços (use hífen). Canais de voz podem ter espaços. kind é "text" ou "voice".
- perms possíveis: admin, manage_server, manage_channels, manage_roles, manage_messages, kick.
- Exatamente um cargo com "owner":true (o dono). Marque cargos de moderação com "staff":true. Marque no máximo um cargo com "default":true (dado automaticamente a quem entra; nunca admin).
- Em canais de texto você pode usar "text_only":true (só texto, sem imagens/arquivos/áudios) ou "allow":{"images":true,"files":false,"audio":true}. Ex.: #geral só texto, #clipes e #prints com imagens.
- Categorias com "private":true só a staff vê (use para área da staff). read_only:true em canais de avisos/regras (em voz: só a staff fala).
- Inclua um canal de regras (nome com "regras") e escreva "rules" combinando com o tema.
- Entre 3 e 8 categorias, no máximo 40 canais e 10 cargos. Cores em hexadecimal #rrggbb.`;

async function aiText(prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-haiku-4-5', max_tokens: 4000, system: AI_SYSTEM, messages: [{ role: 'user', content: prompt }] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || `Erro ${r.status}`);
      return { text: (j.content || []).map((c) => c.text || '').join(''), source: 'Claude' };
    }
    if (process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: AI_SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || `Erro ${r.status}`);
      return { text: (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''), source: 'Gemini' };
    }
    return null;
  } finally { clearTimeout(timer); }
}

// gerador local (sem chave de IA): entende palavras-chave do pedido
function localPlan(prompt, useEmoji = true) {
  const t = prompt.toLowerCase();
  const e = (emoji, txt) => (useEmoji ? emoji + txt : txt);
  const eS = (emoji, txt) => (useEmoji ? `${emoji} ${txt}` : txt);
  const has = (re) => re.test(t);
  const GAMES = [
    [/gta|roleplay|\brp\b/, 'gta-rp', '🚓'], [/free ?fire|\bff\b/, 'free-fire', '🔥'], [/minecraft|\bmine\b/, 'minecraft', '⛏️'],
    [/valorant|\bvava\b|\bvalo\b/, 'valorant', '🎯'], [/fortnite/, 'fortnite', '🏗️'], [/\bcs\b|cs2|counter/, 'cs2', '💣'],
    [/\blol\b|league/, 'league-of-legends', '🧙'], [/roblox/, 'roblox', '🧱'], [/fifa|ea ?fc|futebol/, 'ea-fc', '⚽'],
    [/\bcod\b|warzone/, 'warzone', '🪖'], [/pubg/, 'pubg', '🍳'], [/apex/, 'apex', '🦊'], [/rocket/, 'rocket-league', '🚗'],
  ];
  const games = GAMES.filter(([re]) => re.test(t));
  const streamer = has(/stream|youtube|canal|live|inscrit|twitch|tiktok|criador/);
  const clan = has(/cl[aã]|time\b|equipe|squad|campeonato|x1|treino|guild|guilda/);
  const rp = has(/\brp\b|roleplay|cidade/);
  const study = has(/estud|escola|faculdade|prova|curso/);
  const music = has(/m[uú]sica|funk|rap|trap|beat|dj/);
  const anime = has(/anime|mang[aá]|otaku/);
  const events = has(/sorteio|evento|premia/);
  const shop = has(/loja|venda|vender|compra/);
  const noStaff = has(/sem staff|sem modera/);
  const voices = Math.min(6, Math.max(2, Number((t.match(/(\d+)\s*(salas?|calls?|canais de voz)/) || [])[1]) || (games.length > 2 ? 4 : 3)));

  const roles = [
    { name: eS('👑', 'Dono'), color: '#ef4444', hoist: true, perms: { admin: true }, owner: true },
  ];
  if (!noStaff) roles.push({ name: eS('🛡️', clan ? 'Capitão' : 'Staff'), color: '#f97316', hoist: true, perms: { manage_messages: true, kick: true, manage_channels: true }, staff: true });
  if (streamer) roles.push({ name: eS('🎥', 'Parceiro'), color: '#a855f7', hoist: true, perms: {} });
  if (clan) roles.push({ name: eS('⚔️', 'Titular'), color: '#3b82f6', hoist: true, perms: {} }, { name: eS('🧢', 'Reserva'), color: '#06b6d4', hoist: false, perms: {} });
  if (rp) roles.push({ name: eS('🚓', 'Polícia'), color: '#3b82f6', hoist: true, perms: {} }, { name: eS('🏥', 'Médico'), color: '#ec4899', hoist: true, perms: {} }, { name: eS('🧾', 'Civil'), color: '#94a3b8', hoist: false, perms: {} });
  if (events || streamer) roles.push({ name: eS('⭐', 'VIP'), color: '#eab308', hoist: true, perms: {} });
  roles.push({ name: eS('🎮', streamer ? 'Inscrito' : study ? 'Aluno' : clan ? 'Membro' : 'Galera'), color: '#22c55e', hoist: false, perms: {}, default: true });

  const cats = [];
  const info = [
    { name: e('📜', 'regras'), kind: 'text', read_only: true, topic: 'Leia antes de participar.' },
    { name: e('📢', 'avisos'), kind: 'text', read_only: true, topic: 'Novidades do servidor.' },
  ];
  if (streamer) info.push({ name: e('🎬', 'videos-novos'), kind: 'text', read_only: true }, { name: e('🔴', 'ao-vivo'), kind: 'text', read_only: true });
  if (events) info.push({ name: e('🎁', 'sorteios'), kind: 'text', read_only: true, topic: 'Sorteios e premiações.' });
  cats.push({ name: eS('📌', 'Informações'), channels: info });

  const chat = [{ name: e('💬', 'geral'), kind: 'text', topic: 'Bate-papo livre.' }, { name: e('😂', 'memes'), kind: 'text' }];
  if (streamer || games.length) chat.push({ name: e('🎮', 'clipes'), kind: 'text' });
  chat.push({ name: e('📸', 'prints'), kind: 'text' });
  if (music) chat.push({ name: e('🎵', 'musicas'), kind: 'text', topic: 'Mande o som.' });
  if (anime) chat.push({ name: e('🍥', 'animes'), kind: 'text' });
  chat.push({ name: e('💡', 'sugestoes'), kind: 'text' });
  cats.push({ name: eS('💬', 'Comunidade'), channels: chat });

  if (games.length) {
    cats.push({ name: eS('🎮', 'Jogos'), channels: [
      ...games.map(([, n, em]) => ({ name: e(em, n), kind: 'text' })),
      { name: e('🤝', 'procurando-duo'), kind: 'text', topic: 'Ache alguém para jogar.' },
    ] });
  }
  if (clan) {
    cats.push({ name: eS('⚔️', 'Time'), channels: [
      { name: e('📋', 'escalacao'), kind: 'text', read_only: true }, { name: e('🏆', 'campeonatos'), kind: 'text' },
      { name: e('📅', 'treinos'), kind: 'text' }, { name: eS('🎧', 'Treino'), kind: 'voice' },
    ] });
  }
  if (rp) {
    cats.push({ name: eS('🏙️', 'Cidade RP'), channels: [
      { name: e('🪪', 'registro'), kind: 'text', topic: 'Registre seu personagem.' }, { name: e('📰', 'jornal'), kind: 'text', read_only: true },
      { name: e('🚓', 'policia'), kind: 'text' }, { name: e('🏥', 'hospital'), kind: 'text' }, { name: e('💼', 'empregos'), kind: 'text' },
    ] });
  }
  if (study) {
    cats.push({ name: eS('📚', 'Estudos'), channels: [
      { name: e('❓', 'duvidas'), kind: 'text' }, { name: e('📝', 'materiais'), kind: 'text' }, { name: eS('📖', 'Sala de estudo'), kind: 'voice' },
    ] });
  }
  if (shop) cats.push({ name: eS('🛒', 'Loja'), channels: [{ name: e('🛍️', 'produtos'), kind: 'text', read_only: true }, { name: e('📦', 'pedidos'), kind: 'text' }] });

  const vc = [{ name: eS('🔊', 'Geral'), kind: 'voice' }];
  for (let i = 1; i < voices; i++) vc.push({ name: eS('🎮', `Jogando ${i}`), kind: 'voice' });
  if (music) vc.push({ name: eS('🎵', 'Música'), kind: 'voice' });
  if (streamer) vc.push({ name: eS('🎥', 'Palco da Live'), kind: 'voice', read_only: true });
  vc.push({ name: eS('💤', 'AFK'), kind: 'voice' });
  cats.push({ name: eS('🔊', 'Voz'), channels: vc });

  if (!noStaff) cats.push({ name: eS('🛡️', 'Staff'), private: true, channels: [{ name: e('🔒', 'staff-chat'), kind: 'text' }, { name: eS('🔊', 'Reunião'), kind: 'voice' }] });

  const rules = [
    useEmoji ? '📜 **Regras**' : '**Regras**', '',
    '1. Respeito com todo mundo — sem ofensas, preconceito ou assédio.',
    '2. Sem spam, flood ou divulgação sem permissão.',
    '3. Nada de conteúdo +18, violento ou ilegal.',
    '4. Cada assunto no seu canal.',
    ...(games.length ? ['5. Sem hack, trapaça ou venda de conta.'] : []),
    ...(rp ? ['6. Respeite o RP: sem metagaming nem powergaming.'] : []),
    '', 'Quem quebrar as regras pode levar castigo ou banimento.',
  ].join('\n');
  return { roles, categories: cats, rules };
}

async function makePlan(prompt, useEmoji) {
  const full = `${prompt}\n\n${useEmoji ? 'Use emojis nos nomes dos canais, categorias e cargos.' : 'NÃO use emojis nos nomes.'}`;
  try {
    const r = await aiText(full);
    if (r) {
      const m = r.text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('A IA não devolveu um plano válido.');
      const plan = sanitizePlan(JSON.parse(m[0]));
      if (!plan.categories.length) throw new Error('A IA devolveu um plano vazio.');
      if (!plan.roles.some((x) => x.owner)) plan.roles.unshift({ name: useEmoji ? '👑 Dono' : 'Dono', color: '#ef4444', hoist: true, perms: { admin: true }, owner: true });
      return { plan, source: r.source };
    }
  } catch (err) {
    console.warn('IA falhou, usando o assistente local:', err.message);
    return { plan: sanitizePlan(localPlan(prompt, useEmoji)), source: 'local', warning: `A IA falhou (${err.message}). Usei o assistente básico.` };
  }
  return { plan: sanitizePlan(localPlan(prompt, useEmoji)), source: 'local' };
}

// ---------------------------------------------------------------- app
const app = express();
app.set('trust proxy', 1);

// ---- anexos (imagens, arquivos, áudios)
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const MAX_UPLOAD = Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024;
function kindOf(type) {
  if (/^image\/(png|jpe?g|gif|webp)$/.test(type)) return 'image';
  if (/^audio\//.test(type)) return 'audio';
  if (/^video\/(mp4|webm|quicktime)$/.test(type)) return 'video';
  return 'file';
}
// qual permissão do canal cada tipo usa
const ALLOW_KEY = { image: 'images', audio: 'audio', video: 'files', file: 'files' };
const attachmentPayload = (u) => ({ id: u.id, name: u.name, type: u.type, size: u.size, kind: u.kind, url: `/files/${u.id}/${encodeURIComponent(u.name)}` });
function removeUploads(ids) {
  if (!ids.length) return;
  const set = new Set(ids);
  db.uploads = db.uploads.filter((u) => {
    if (!set.has(u.id)) return true;
    fs.unlink(path.join(UPLOAD_DIR, u.id), () => {});
    store?.delFile(u.id).catch(() => {});
    return false;
  });
}
const attIds = (list) => list.flatMap((m) => (m.attachments || []).map((a) => a.id));
app.post('/api/upload', auth, express.raw({ type: () => true, limit: MAX_UPLOAD }), async (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || !buf.length) return bad(res, 'Arquivo vazio.');
  const type = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase().slice(0, 100) || 'application/octet-stream';
  let name = 'arquivo';
  try { name = decodeURIComponent(String(req.headers['x-filename'] || 'arquivo')); } catch { /* usa padrão */ }
  name = name.replace(/[\\/\0\r\n"]/g, '_').trim().slice(0, 120) || 'arquivo';
  const u = { id: id(), user_id: req.user.id, name, type, size: buf.length, kind: kindOf(type), created_at: now(), used: false };
  fs.writeFileSync(path.join(UPLOAD_DIR, u.id), buf);
  if (store) {
    try { await store.putFile(u.id, buf, type); } catch (e) { console.error('Falha ao guardar arquivo:', e.message); return bad(res, 'Não consegui guardar o arquivo. Tente de novo.', 500); }
  }
  db.uploads.push(u);
  save();
  res.json(attachmentPayload(u));
});
app.get('/files/:fid/:name?', async (req, res) => {
  const u = db.uploads.find((x) => x.id === req.params.fid);
  if (!u) return res.status(404).send('Arquivo não encontrado.');
  const inline = u.kind !== 'file';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Content-Type', inline ? u.type : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(u.name)}`);
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  const local = path.join(UPLOAD_DIR, u.id);
  if (!fs.existsSync(local) && store) {
    try {
      const buf = await store.getFile(u.id);
      if (!buf) return res.status(404).end();
      fs.writeFileSync(local, buf);
    } catch { return res.status(503).end(); }
  }
  res.sendFile(local, (err) => { if (err && !res.headersSent) res.status(404).end(); });
});
// pega os anexos enviados por quem está mandando a mensagem
function takeAttachments(req, res, allowFn) {
  const ids = Array.isArray(req.body.attachments) ? req.body.attachments.slice(0, 10).map(String) : [];
  const out = [];
  for (const aid of ids) {
    const u = db.uploads.find((x) => x.id === aid && x.user_id === req.user.id && !x.used);
    if (!u) { bad(res, 'Um dos anexos não foi encontrado. Envie de novo.'); return null; }
    const key = ALLOW_KEY[u.kind];
    if (allowFn && !allowFn(key)) {
      bad(res, { images: 'Este canal não aceita imagens.', audio: 'Este canal não aceita áudios.', files: 'Este canal não aceita arquivos.' }[key], 403);
      return null;
    }
    out.push(u);
  }
  out.forEach((u) => { u.used = true; });
  return out.map(attachmentPayload);
}
// limpa anexos enviados e nunca usados (mais de 1 dia)
setInterval(() => {
  const old = new Date(Date.now() - 864e5).toISOString();
  removeUploads(db.uploads.filter((u) => !u.used && u.created_at < old).map((u) => u.id));
  save();
}, 3600e3).unref();

app.use(express.json({ limit: '4mb' }));

function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function sessionFromCookie(header) {
  const token = parseCookies(header)[COOKIE];
  if (!token) return null;
  const s = db.sessions.find((x) => x.token === token);
  if (!s || new Date(s.expires) < new Date()) return null;
  return s;
}
function userFromCookie(header) {
  const s = sessionFromCookie(header);
  return s ? userById(s.user_id) || null : null;
}
function deviceLabel(ua = '') {
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone/iPad' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Dispositivo';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${br} · ${os}`;
}
function setSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db.sessions.push({ token, sid: crypto.randomBytes(6).toString('hex'), user_id: userId, expires: expires.toISOString(),
    created_at: now(), last_seen: now(), device: deviceLabel(String(req.headers['user-agent'] || '')), ip: String(req.ip || '').replace(/^::ffff:/, '') });
  // limpa sessões vencidas
  const t = new Date();
  db.sessions = db.sessions.filter((x) => new Date(x.expires) > t);
  save();
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Expires=${expires.toUTCString()}${secure}`);
}
function auth(req, res, next) {
  const s = sessionFromCookie(req.headers.cookie);
  const u = s && userById(s.user_id);
  if (!u) return res.status(401).json({ error: 'Faça login para continuar.' });
  if (u.banned) return res.status(403).json({ error: 'Esta conta foi suspensa por violar as regras.' });
  if (!s.last_seen || Date.now() - new Date(s.last_seen) > 5 * 60e3) { s.last_seen = now(); save(); }
  req.user = u; req.session = s;
  next();
}
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const cleanStr = (v, max) => String(v ?? '').trim().slice(0, max);
const validImage = (v) => !v || (typeof v === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v) && v.length < 1_500_000);
const validColor = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ''));

// ---- auth
app.post('/api/auth/register', (req, res) => {
  const display_name = cleanStr(req.body.display_name, 32);
  const email = cleanStr(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || '');
  if (!display_name) return bad(res, 'Informe um nome.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, 'E-mail inválido.');
  if (password.length < 6) return bad(res, 'A senha precisa ter pelo menos 6 caracteres.');
  if (db.users.some((u) => u.email === email)) return bad(res, 'Este e-mail já está cadastrado.');
  let username = normUsername(req.body.username);
  if (username) {
    if (!USERNAME_RE.test(username)) return bad(res, 'Nome de usuário: 3 a 20 letras minúsculas, números, _ ou ponto.');
    if (usernameTaken(username)) return bad(res, 'Esse nome de usuário já está em uso.');
  } else username = makeUsername(display_name);
  const user = { id: id(), email, username, display_name, avatar_url: '', password: hashPassword(password), created_at: now() };
  db.users.push(user);
  setSession(req, res, user.id);
  res.json(publicUser(user));
});
const loginTickets = new Map(); // ticket -> { user_id, exp }
const loginFails = new Map();
app.post('/api/auth/login', (req, res) => {
  const email = cleanStr(req.body.email, 120).toLowerCase();
  const key = email + '|' + (req.ip || '');
  const fails = (loginFails.get(key) || []).filter((t) => Date.now() - t < 10 * 60e3);
  if (fails.length >= 8) return bad(res, 'Muitas tentativas. Espere alguns minutos e tente de novo.', 429);
  const user = db.users.find((u) => u.email === email);
  if (!user || !checkPassword(String(req.body.password || ''), user.password)) {
    fails.push(Date.now()); loginFails.set(key, fails);
    return bad(res, user ? 'Senha incorreta.' : 'Não existe conta com esse e-mail. Confira ou clique em Cadastre-se.', 401);
  }
  loginFails.delete(key);
  if (user.banned) return bad(res, 'Esta conta foi suspensa por violar as regras.', 403);
  if (user.totp_secret) {
    const ticket = crypto.randomBytes(18).toString('hex');
    loginTickets.set(ticket, { user_id: user.id, exp: Date.now() + 5 * 60e3, tries: 0 });
    return res.json({ need_2fa: true, ticket });
  }
  setSession(req, res, user.id);
  res.json(publicUser(user));
});
app.post('/api/auth/2fa', (req, res) => {
  const t = loginTickets.get(String(req.body.ticket || ''));
  if (!t || t.exp < Date.now()) return bad(res, 'O tempo acabou. Faça login de novo.', 401);
  const user = userById(t.user_id);
  if (!user || !checkSecondFactor(user, req.body.code)) {
    t.tries++; if (t.tries >= 5) loginTickets.delete(req.body.ticket);
    return bad(res, 'Código incorreto.', 401);
  }
  loginTickets.delete(req.body.ticket);
  save();
  setSession(req, res, user.id);
  res.json(publicUser(user));
});
app.post('/api/auth/logout', (req, res) => {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  db.sessions = db.sessions.filter((s) => s.token !== token);
  save();
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ ok: true });
});
app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));
app.patch('/api/me', auth, (req, res) => {
  const { display_name, avatar_url } = req.body;
  if (req.body.username !== undefined) {
    const un = normUsername(req.body.username);
    if (!USERNAME_RE.test(un)) return bad(res, 'Nome de usuário: 3 a 20 letras minúsculas, números, _ ou ponto.');
    if (usernameTaken(un, req.user.id)) return bad(res, 'Esse nome de usuário já está em uso.');
    req.user.username = un;
  }
  if (req.body.bio !== undefined) req.user.bio = cleanStr(req.body.bio, 190);
  if (req.body.status_text !== undefined) req.user.status_text = cleanStr(req.body.status_text, 60);
  if (req.body.accent !== undefined) req.user.accent = validColor(req.body.accent) ? req.body.accent : '';
  if (req.body.banner_url !== undefined) {
    if (!validImage(req.body.banner_url)) return bad(res, 'Capa inválida ou muito grande.');
    req.user.banner_url = req.body.banner_url || '';
  }
  if (req.body.privacy && typeof req.body.privacy === 'object') {
    const pv = req.body.privacy;
    req.user.privacy = {
      dms: ['servers', 'friends'].includes(pv.dms) ? pv.dms : privacyOf(req.user).dms,
      friend_requests: ['everyone', 'servers', 'nobody'].includes(pv.friend_requests) ? pv.friend_requests : privacyOf(req.user).friend_requests,
      show_bio: pv.show_bio !== undefined ? !!pv.show_bio : privacyOf(req.user).show_bio,
    };
  }
  if (display_name !== undefined) {
    const n = cleanStr(display_name, 32);
    if (!n) return bad(res, 'O nome não pode ficar vazio.');
    req.user.display_name = n;
  }
  if (avatar_url !== undefined) {
    if (!validImage(avatar_url)) return bad(res, 'Imagem inválida ou muito grande.');
    req.user.avatar_url = avatar_url || '';
  }
  save();
  const pu = publicUser(req.user);
  db.members.filter((m) => m.user_id === req.user.id).forEach((m) => io.to(`server:${m.server_id}`).emit('user:updated', { ...pu, email: undefined }));
  friendIdsOf(req.user.id).forEach((f) => io.to(`user:${f}`).emit('friends:update'));
  res.json(pu);
});
app.post('/api/me/password', auth, (req, res) => {
  const { current, next } = req.body;
  if (!checkPassword(String(current || ''), req.user.password)) return bad(res, 'Senha atual incorreta.');
  if (String(next || '').length < 6) return bad(res, 'A nova senha precisa ter pelo menos 6 caracteres.');
  req.user.password = hashPassword(String(next));
  const gone = db.sessions.filter((x) => x.user_id === req.user.id && x.token !== req.session.token);
  db.sessions = db.sessions.filter((x) => !gone.includes(x));
  save(); kickSessions(gone.map((x) => x.token));
  res.json({ ok: true });
});

// ---- servidores
function serverPayload(s, uid) {
  return { id: s.id, name: s.name, color: s.color, icon_url: s.icon_url, invite_code: s.invite_code, owner_id: s.owner_id,
    categories: s.categories, default_role_id: s.default_role_id || null, is_owner: s.owner_id === uid, perms: permsOf(s.id, uid) };
}
function refresh(sid) { io.to(`server:${sid}`).emit('server:refresh', { server_id: sid }); }

app.get('/api/servers', auth, (req, res) => {
  const ids = db.members.filter((m) => m.user_id === req.user.id).map((m) => m.server_id);
  res.json(db.servers.filter((s) => ids.includes(s.id)).map((s) => serverPayload(s, req.user.id)));
});
app.post('/api/servers', auth, (req, res) => {
  const name = cleanStr(req.body.name, 40);
  if (!name) return bad(res, 'Dê um nome ao servidor.');
  if (!validImage(req.body.icon_url)) return bad(res, 'Ícone inválido ou muito grande.');
  const color = /^(10|[1-9])$/.test(String(req.body.color)) ? String(req.body.color) : String(1 + Math.floor(Math.random() * 10));
  const s = { id: id(), name, color, icon_url: req.body.icon_url || '', invite_code: inviteCode(), owner_id: req.user.id, created_at: now(), categories: [] };
  db.servers.push(s);
  db.members.push({ id: id(), server_id: s.id, user_id: req.user.id, role_ids: [], joined_at: now() });
  if (req.body.plan && typeof req.body.plan === 'object') {
    applyPlan(s, req.user.id, req.body.plan);
  } else if (req.body.template === 'streamer') {
    applyTemplate(s, req.user.id);
  } else {
    s.categories = [{ id: cid(), name: 'Canais de texto' }, { id: cid(), name: 'Canais de voz' }];
    db.channels.push({ id: id(), server_id: s.id, name: 'geral', kind: 'text', category_id: s.categories[0].id, position: 0, topic: '', read_only: false, allowed_roles: [], created_at: now() });
    db.channels.push({ id: id(), server_id: s.id, name: 'Sala de voz', kind: 'voice', category_id: s.categories[1].id, position: 1, topic: '', read_only: false, allowed_roles: [], created_at: now() });
  }
  save();
  joinSocketsToServer(req.user.id, s.id);
  res.json(serverPayload(s, req.user.id));
});

function requireMember(req, res) {
  const s = serverById(req.params.sid);
  if (!s || !isMember(s.id, req.user.id)) { bad(res, 'Servidor não encontrado.', 404); return null; }
  return s;
}
function requirePerm(req, res, perm) {
  const s = requireMember(req, res);
  if (!s) return null;
  if (!permsOf(s.id, req.user.id)[perm]) { bad(res, 'Você não tem permissão para fazer isso.', 403); return null; }
  return s;
}
function requireOwner(req, res) {
  const s = requireMember(req, res);
  if (!s) return null;
  if (s.owner_id !== req.user.id) { bad(res, 'Só o dono do servidor pode fazer isso.', 403); return null; }
  return s;
}

app.get('/api/servers/:sid', auth, (req, res) => {
  const s = requireMember(req, res); if (!s) return;
  res.json(serverPayload(s, req.user.id));
});
app.patch('/api/servers/:sid', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_server'); if (!s) return;
  if (req.body.name !== undefined) { const n = cleanStr(req.body.name, 40); if (!n) return bad(res, 'Nome inválido.'); s.name = n; }
  if (req.body.color !== undefined && /^(10|[1-9])$/.test(String(req.body.color))) s.color = String(req.body.color);
  if (req.body.icon_url !== undefined) {
    if (!validImage(req.body.icon_url)) return bad(res, 'Ícone inválido ou muito grande.');
    s.icon_url = req.body.icon_url || '';
  }
  if (req.body.default_role_id !== undefined) {
    const r = req.body.default_role_id;
    s.default_role_id = r && db.roles.some((x) => x.id === r && x.server_id === s.id) ? r : null;
  }
  save(); refresh(s.id);
  res.json(serverPayload(s, req.user.id));
});
app.delete('/api/servers/:sid', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  const chIds = db.channels.filter((c) => c.server_id === s.id).map((c) => c.id);
  removeUploads(attIds(db.messages.filter((m) => chIds.includes(m.channel_id))));
  db.messages = db.messages.filter((m) => !chIds.includes(m.channel_id));
  db.channels = db.channels.filter((c) => c.server_id !== s.id);
  db.members = db.members.filter((m) => m.server_id !== s.id);
  db.roles = db.roles.filter((r) => r.server_id !== s.id);
  db.servers = db.servers.filter((x) => x.id !== s.id);
  save();
  io.to(`server:${s.id}`).emit('server:deleted', { id: s.id });
  io.in(`server:${s.id}`).socketsLeave(`server:${s.id}`);
  res.json({ ok: true });
});
app.post('/api/servers/:sid/template', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  const out = applyTemplate(s, req.user.id);
  refresh(s.id);
  res.json(out);
});
app.post('/api/servers/:sid/apply-plan', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  if (!req.body.plan || typeof req.body.plan !== 'object') return bad(res, 'Plano inválido.');
  const out = applyPlan(s, req.user.id, req.body.plan, { replace: !!req.body.replace });
  refresh(s.id);
  res.json(out);
});
const aiRate = new Map();
app.post('/api/ai/plan', auth, async (req, res) => {
  const prompt = cleanStr(req.body.prompt, 1500);
  if (prompt.length < 4) return bad(res, 'Descreva como você quer o servidor.');
  const t = Date.now();
  const hits = (aiRate.get(req.user.id) || []).filter((x) => t - x < 60000);
  if (hits.length >= 5) return bad(res, 'Espere um minutinho antes de gerar de novo.', 429);
  hits.push(t); aiRate.set(req.user.id, hits);
  res.json(await makePlan(prompt, req.body.emoji !== false));
});
app.get('/api/ai/status', auth, (req, res) => {
  res.json({ provider: process.env.ANTHROPIC_API_KEY ? 'Claude' : process.env.GEMINI_API_KEY ? 'Gemini' : 'local' });
});
app.post('/api/servers/:sid/invite', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_server'); if (!s) return;
  s.invite_code = inviteCode();
  save(); refresh(s.id);
  res.json(serverPayload(s, req.user.id));
});
app.post('/api/servers/:sid/leave', auth, (req, res) => {
  const s = requireMember(req, res); if (!s) return;
  if (s.owner_id === req.user.id) return bad(res, 'O dono não pode sair — exclua o servidor nas configurações.');
  removeMember(s.id, req.user.id);
  res.json({ ok: true });
});
function removeMember(sid, uid) {
  db.members = db.members.filter((m) => !(m.server_id === sid && m.user_id === uid));
  save();
  io.to(`server:${sid}`).emit('member:left', { server_id: sid, user_id: uid });
  for (const sock of socketsOf(uid)) {
    sock.leave(`server:${sid}`);
    if (sock.data.voice && channelById(sock.data.voice)?.server_id === sid) leaveVoice(sock);
  }
  io.to(`user:${uid}`).emit('server:removed', { id: sid });
}
app.get('/api/servers/:sid/members', auth, (req, res) => {
  const s = requireMember(req, res); if (!s) return;
  res.json(db.members.filter((m) => m.server_id === s.id).map((m) => {
    const u = userById(m.user_id); if (!u) return null;
    return { id: u.id, username: u.username || '', display_name: u.display_name, avatar_url: u.avatar_url || '', joined_at: m.joined_at, role_ids: m.role_ids,
      is_owner: m.user_id === s.owner_id, online: socketsOf(m.user_id).length > 0, color: topRole(s.id, u.id)?.color || '' };
  }).filter(Boolean));
});
app.delete('/api/servers/:sid/members/:uid', auth, (req, res) => {
  const s = requirePerm(req, res, 'kick'); if (!s) return;
  if (req.params.uid === s.owner_id) return bad(res, 'O dono não pode ser removido.');
  if (req.params.uid === req.user.id) return bad(res, 'Use "Sair do servidor".');
  if (permsOf(s.id, req.params.uid).admin && s.owner_id !== req.user.id) return bad(res, 'Só o dono pode remover um administrador.', 403);
  removeMember(s.id, req.params.uid);
  res.json({ ok: true });
});
app.put('/api/servers/:sid/members/:uid/roles', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_roles'); if (!s) return;
  const m = memberOf(s.id, req.params.uid);
  if (!m) return bad(res, 'Membro não encontrado.', 404);
  const valid = serverRoles(s.id).map((r) => r.id);
  const want = (Array.isArray(req.body.role_ids) ? req.body.role_ids : []).filter((r) => valid.includes(r));
  const me = permsOf(s.id, req.user.id);
  // quem não é administrador não pode dar nem tirar cargos de administrador
  if (!me.admin) {
    const adminRoles = serverRoles(s.id).filter((r) => r.perms?.admin).map((r) => r.id);
    const changed = [...new Set([...want, ...m.role_ids])].filter((r) => want.includes(r) !== m.role_ids.includes(r));
    if (changed.some((r) => adminRoles.includes(r))) return bad(res, 'Só administradores mexem em cargos de administrador.', 403);
  }
  m.role_ids = want;
  save(); refresh(s.id);
  res.json({ ok: true });
});

// ---- cargos
function cleanPerms(p = {}, allowAdmin) {
  const out = {};
  PERMS.forEach((k) => { out[k] = !!p[k]; });
  if (!allowAdmin) out.admin = false;
  return out;
}
app.get('/api/servers/:sid/roles', auth, (req, res) => {
  const s = requireMember(req, res); if (!s) return;
  res.json(serverRoles(s.id));
});
app.post('/api/servers/:sid/roles', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_roles'); if (!s) return;
  const name = cleanStr(req.body.name, 32) || 'novo cargo';
  const r = { id: id(), server_id: s.id, name, color: validColor(req.body.color) ? req.body.color : '#99aab5', hoist: !!req.body.hoist,
    perms: cleanPerms(req.body.perms, permsOf(s.id, req.user.id).admin), position: serverRoles(s.id).length };
  db.roles.push(r);
  save(); refresh(s.id);
  res.json(r);
});
function requireRole(req, res) {
  const r = db.roles.find((x) => x.id === req.params.rid);
  if (!r) { bad(res, 'Cargo não encontrado.', 404); return null; }
  req.params.sid = r.server_id;
  if (!requirePerm(req, res, 'manage_roles')) return null;
  if (r.perms?.admin && !permsOf(r.server_id, req.user.id).admin) { bad(res, 'Só administradores mexem nesse cargo.', 403); return null; }
  return r;
}
app.patch('/api/roles/:rid', auth, (req, res) => {
  const r = requireRole(req, res); if (!r) return;
  if (req.body.name !== undefined) { const n = cleanStr(req.body.name, 32); if (!n) return bad(res, 'Nome inválido.'); r.name = n; }
  if (req.body.color !== undefined) r.color = validColor(req.body.color) ? req.body.color : '';
  if (req.body.hoist !== undefined) r.hoist = !!req.body.hoist;
  if (req.body.perms !== undefined) r.perms = cleanPerms(req.body.perms, permsOf(r.server_id, req.user.id).admin);
  if (typeof req.body.move === 'number') {
    const list = serverRoles(r.server_id);
    const i = list.indexOf(r), j = i + Math.sign(req.body.move);
    if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; list.forEach((x, k) => { x.position = k; }); }
  }
  save(); refresh(r.server_id);
  res.json(r);
});
app.delete('/api/roles/:rid', auth, (req, res) => {
  const r = requireRole(req, res); if (!r) return;
  db.roles = db.roles.filter((x) => x.id !== r.id);
  db.members.forEach((m) => { m.role_ids = m.role_ids.filter((x) => x !== r.id); });
  db.channels.forEach((c) => { if (c.allowed_roles?.length) c.allowed_roles = c.allowed_roles.filter((x) => x !== r.id); });
  const s = serverById(r.server_id);
  if (s.default_role_id === r.id) s.default_role_id = null;
  serverRoles(r.server_id).forEach((x, k) => { x.position = k; });
  save(); refresh(r.server_id);
  res.json({ ok: true });
});

// ---- categorias
app.post('/api/servers/:sid/categories', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_channels'); if (!s) return;
  const name = cleanStr(req.body.name, 40);
  if (!name) return bad(res, 'Dê um nome à categoria.');
  const c = { id: cid(), name };
  s.categories.push(c);
  save(); refresh(s.id);
  res.json(c);
});
app.patch('/api/servers/:sid/categories/:cat', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_channels'); if (!s) return;
  const c = s.categories.find((x) => x.id === req.params.cat);
  if (!c) return bad(res, 'Categoria não encontrada.', 404);
  if (req.body.name !== undefined) { const n = cleanStr(req.body.name, 40); if (!n) return bad(res, 'Nome inválido.'); c.name = n; }
  if (typeof req.body.move === 'number') {
    const i = s.categories.indexOf(c), j = i + Math.sign(req.body.move);
    if (j >= 0 && j < s.categories.length) [s.categories[i], s.categories[j]] = [s.categories[j], s.categories[i]];
  }
  save(); refresh(s.id);
  res.json(c);
});
app.delete('/api/servers/:sid/categories/:cat', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_channels'); if (!s) return;
  s.categories = s.categories.filter((x) => x.id !== req.params.cat);
  db.channels.forEach((c) => { if (c.server_id === s.id && c.category_id === req.params.cat) c.category_id = null; });
  save(); refresh(s.id);
  res.json({ ok: true });
});

// ---- canais
function channelFields(body, s, c) {
  if (body.name !== undefined) {
    let name = cleanStr(body.name, 40);
    if (c.kind === 'text') name = name.toLowerCase().replace(/\s+/g, '-');
    if (!name) return 'Dê um nome ao canal.';
    c.name = name;
  }
  if (body.topic !== undefined) c.topic = cleanStr(body.topic, 200);
  if (body.read_only !== undefined) c.read_only = !!body.read_only;
  if (body.category_id !== undefined) c.category_id = s.categories.some((x) => x.id === body.category_id) ? body.category_id : null;
  if (body.allow && typeof body.allow === 'object') {
    c.allow = { images: body.allow.images !== false, files: body.allow.files !== false, audio: body.allow.audio !== false };
  }
  if (body.allowed_roles !== undefined) {
    const valid = serverRoles(s.id).map((r) => r.id);
    c.allowed_roles = (Array.isArray(body.allowed_roles) ? body.allowed_roles : []).filter((r) => valid.includes(r));
  }
  return null;
}
app.get('/api/servers/:sid/channels', auth, (req, res) => {
  const s = requireMember(req, res); if (!s) return;
  res.json(db.channels.filter((c) => c.server_id === s.id && canSee(c, req.user.id))
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((c) => ({ ...c, can_post: canPost(c, req.user.id), can_attach: canAttach(c, req.user.id) })));
});
app.post('/api/servers/:sid/channels', auth, (req, res) => {
  const s = requirePerm(req, res, 'manage_channels'); if (!s) return;
  const kind = req.body.kind === 'voice' ? 'voice' : 'text';
  const c = { id: id(), server_id: s.id, name: '', kind, category_id: null, topic: '', read_only: false, allowed_roles: [],
    position: Math.max(0, ...db.channels.filter((x) => x.server_id === s.id).map((x) => x.position || 0)) + 1, created_at: now() };
  const err = channelFields({ ...req.body, name: req.body.name ?? '' }, s, c);
  if (err) return bad(res, err);
  db.channels.push(c);
  save(); refresh(s.id);
  res.json({ ...c, can_post: canPost(c, req.user.id), can_attach: canAttach(c, req.user.id) });
});
function requireChannel(req, res, perm) {
  const c = channelById(req.params.cid);
  if (!c || !canSee(c, req.user.id)) { bad(res, 'Canal não encontrado.', 404); return null; }
  if (perm && !permsOf(c.server_id, req.user.id)[perm]) { bad(res, 'Você não tem permissão para fazer isso.', 403); return null; }
  return c;
}
app.patch('/api/channels/:cid', auth, (req, res) => {
  const c = requireChannel(req, res, 'manage_channels'); if (!c) return;
  const s = serverById(c.server_id);
  if (typeof req.body.move === 'number') {
    const sibs = db.channels.filter((x) => x.server_id === s.id && x.category_id === c.category_id && x.kind === c.kind).sort((a, b) => a.position - b.position);
    const i = sibs.indexOf(c), j = i + Math.sign(req.body.move);
    if (j >= 0 && j < sibs.length) { const p = sibs[i].position; sibs[i].position = sibs[j].position; sibs[j].position = p; }
  }
  const err = channelFields(req.body, s, c);
  if (err) return bad(res, err);
  save(); refresh(s.id);
  // quem perdeu acesso sai da chamada
  for (const [, sock] of io.sockets.sockets) if (sock.data.voice === c.id && !canSee(c, sock.data.user.id)) leaveVoice(sock);
  res.json(c);
});
app.delete('/api/channels/:cid', auth, (req, res) => {
  const c = requireChannel(req, res, 'manage_channels'); if (!c) return;
  db.channels = db.channels.filter((x) => x.id !== c.id);
  removeUploads(attIds(db.messages.filter((m) => m.channel_id === c.id)));
  db.messages = db.messages.filter((m) => m.channel_id !== c.id);
  save();
  for (const [, sock] of io.sockets.sockets) if (sock.data.voice === c.id) leaveVoice(sock);
  refresh(c.server_id);
  res.json({ ok: true });
});

// ---- mensagens
function messagePayload(m) {
  const u = userById(m.author_id);
  return { ...m, author_name: u ? u.display_name : m.author_name, author_avatar: u ? u.avatar_url : '', author_color: topRole(m.server_id, m.author_id)?.color || '', author_badges: u ? badgesOf(u) : [] };
}
function emitToChannel(c, event, payload) {
  for (const sock of io.sockets.adapter.rooms.get(`server:${c.server_id}`) || []) {
    const s = io.sockets.sockets.get(sock);
    if (s && canSee(c, s.data.user.id)) s.emit(event, payload);
  }
}
app.get('/api/channels/:cid/messages', auth, (req, res) => {
  const c = requireChannel(req, res); if (!c) return;
  let list = db.messages.filter((m) => m.channel_id === c.id);
  if (req.query.before) list = list.filter((m) => m.created_at < req.query.before);
  res.json(list.slice(-50).map(messagePayload));
});
const rate = new Map();
app.post('/api/channels/:cid/messages', auth, (req, res) => {
  const c = requireChannel(req, res); if (!c) return;
  if (c.kind !== 'text') return bad(res, 'Este canal não aceita mensagens.');
  if (!canPost(c, req.user.id)) return bad(res, 'Você não tem permissão para enviar mensagens neste canal.', 403);
  const t = Date.now();
  const hits = (rate.get(req.user.id) || []).filter((x) => t - x < 5000);
  if (hits.length >= 5) return bad(res, 'Calma! Você está enviando mensagens rápido demais.', 429);
  hits.push(t); rate.set(req.user.id, hits);
  const content = String(req.body.content || '').trim().slice(0, 2000);
  const perm = canAttach(c, req.user.id);
  const attachments = takeAttachments(req, res, (k) => perm[k]); if (!attachments) return;
  if (!content && !attachments.length) return bad(res, 'Mensagem vazia.');
  const m = { id: id(), channel_id: c.id, server_id: c.server_id, author_id: req.user.id, author_name: req.user.display_name, content, attachments, created_at: now() };
  db.messages.push(m);
  save();
  const p = messagePayload(m);
  emitToChannel(c, 'message:created', p);
  res.json(p);
});
app.delete('/api/messages/:mid', auth, (req, res) => {
  const m = db.messages.find((x) => x.id === req.params.mid);
  if (!m) return bad(res, 'Mensagem não encontrada.', 404);
  if (m.author_id !== req.user.id && !permsOf(m.server_id, req.user.id).manage_messages) return bad(res, 'Sem permissão.', 403);
  db.messages = db.messages.filter((x) => x.id !== m.id);
  removeUploads(attIds([m]));
  save();
  const c = channelById(m.channel_id);
  if (c) emitToChannel(c, 'message:deleted', { id: m.id, channel_id: m.channel_id });
  res.json({ ok: true });
});

// ---- conversas privadas (DM)
function sharesServer(a, b) {
  const mine = new Set(db.members.filter((m) => m.user_id === a).map((m) => m.server_id));
  return db.members.some((m) => m.user_id === b && mine.has(m.server_id));
}
const dmById = (x) => db.dms.find((d) => d.id === x);
// conversa vira "solicitação de mensagem" para quem recebeu de alguém que não é amigo, até aceitar ou responder
function isDmRequest(d, uid) {
  if (d.accepted?.[uid] || d.created_by === uid || !d.created_by) return false;
  const other = d.user_ids.find((u) => u !== uid);
  return !areFriends(uid, other);
}
function dmPayload(d, uid) {
  const other = userById(d.user_ids.find((u) => u !== uid) || uid);
  const msgs = db.dm_messages.filter((m) => m.dm_id === d.id);
  const last = msgs[msgs.length - 1];
  const read = d.read?.[uid] || '';
  return {
    id: d.id, last_at: d.last_at,
    user: other ? personOf(other) : { id: '', username: '', display_name: 'Conta removida', avatar_url: '' },
    request: isDmRequest(d, uid),
    last_message: last ? { content: (last.content || (last.attachments?.length ? `📎 ${last.attachments[0].kind === 'audio' ? 'Áudio' : last.attachments[0].kind === 'image' ? 'Imagem' : 'Arquivo'}` : '')).slice(0, 80), mine: last.author_id === uid } : null,
    unread: msgs.filter((m) => m.author_id !== uid && m.created_at > read).length,
  };
}
function dmMessagePayload(m) {
  const u = userById(m.author_id);
  return { ...m, author_name: u ? u.display_name : '?', author_avatar: u ? u.avatar_url : '', author_badges: u ? badgesOf(u) : [] };
}
function requireDm(req, res) {
  const d = dmById(req.params.did);
  if (!d || !d.user_ids.includes(req.user.id)) { bad(res, 'Conversa não encontrada.', 404); return null; }
  return d;
}
app.get('/api/people', auth, (req, res) => {
  const mine = new Set(db.members.filter((m) => m.user_id === req.user.id).map((m) => m.server_id));
  const ids = new Set(db.members.filter((m) => mine.has(m.server_id) && m.user_id !== req.user.id).map((m) => m.user_id));
  friendIdsOf(req.user.id).forEach((f) => ids.add(f));
  res.json([...ids].map(userById).filter(Boolean).map((u) => ({ ...personOf(u), friend: areFriends(req.user.id, u.id) }))
    .sort((a, b) => (b.online - a.online) || a.display_name.localeCompare(b.display_name)));
});
app.get('/api/dms', auth, (req, res) => {
  res.json(db.dms.filter((d) => d.user_ids.includes(req.user.id)).sort((a, b) => (b.last_at > a.last_at ? 1 : -1)).map((d) => dmPayload(d, req.user.id)));
});
app.post('/api/dms', auth, (req, res) => {
  const other = userById(String(req.body.user_id || ''));
  if (!other || other.id === req.user.id) return bad(res, 'Pessoa não encontrada.', 404);
  let d = db.dms.find((x) => x.user_ids.includes(req.user.id) && x.user_ids.includes(other.id));
  if (!d) {
    if (blockedEither(req.user.id, other.id)) return bad(res, 'Não é possível conversar com essa pessoa.', 403);
    if (!areFriends(req.user.id, other.id) && (privacyOf(other).dms === 'friends' || !sharesServer(req.user.id, other.id))) return bad(res, 'Essa pessoa só recebe mensagens de amigos. Mande um pedido de amizade.', 403);
    d = { id: id(), user_ids: [req.user.id, other.id], created_by: req.user.id, accepted: { [req.user.id]: true }, created_at: now(), last_at: now(), read: {} };
    db.dms.push(d); save();
  }
  res.json(dmPayload(d, req.user.id));
});
app.get('/api/dms/:did/messages', auth, (req, res) => {
  const d = requireDm(req, res); if (!d) return;
  let list = db.dm_messages.filter((m) => m.dm_id === d.id);
  if (req.query.before) list = list.filter((m) => m.created_at < req.query.before);
  res.json(list.slice(-50).map(dmMessagePayload));
});
app.post('/api/dms/:did/messages', auth, (req, res) => {
  const d = requireDm(req, res); if (!d) return;
  const t = Date.now();
  const hits = (rate.get(req.user.id) || []).filter((x) => t - x < 5000);
  if (hits.length >= 5) return bad(res, 'Calma! Você está enviando mensagens rápido demais.', 429);
  hits.push(t); rate.set(req.user.id, hits);
  const content = String(req.body.content || '').trim().slice(0, 2000);
  const otherId = d.user_ids.find((u) => u !== req.user.id);
  if (blockedEither(req.user.id, otherId)) return bad(res, 'Você não pode mandar mensagens para essa pessoa.', 403);
  const attachments = takeAttachments(req, res); if (!attachments) return;
  if (!content && !attachments.length) return bad(res, 'Mensagem vazia.');
  const m = { id: id(), dm_id: d.id, author_id: req.user.id, content, attachments, created_at: now() };
  d.accepted = d.accepted || {}; d.accepted[req.user.id] = true;
  db.dm_messages.push(m);
  d.last_at = m.created_at;
  d.read = d.read || {}; d.read[req.user.id] = m.created_at;
  save();
  const p = dmMessagePayload(m);
  d.user_ids.forEach((u) => io.to(`user:${u}`).emit('dm:message', { dm: dmPayload(d, u), message: p }));
  res.json(p);
});
app.post('/api/dms/:did/read', auth, (req, res) => {
  const d = requireDm(req, res); if (!d) return;
  d.read = d.read || {}; d.read[req.user.id] = now();
  save();
  res.json({ ok: true });
});
app.delete('/api/dm-messages/:mid', auth, (req, res) => {
  const m = db.dm_messages.find((x) => x.id === req.params.mid);
  if (!m || m.author_id !== req.user.id) return bad(res, 'Mensagem não encontrada.', 404);
  db.dm_messages = db.dm_messages.filter((x) => x.id !== m.id);
  removeUploads(attIds([m]));
  save();
  const d = dmById(m.dm_id);
  d?.user_ids.forEach((u) => io.to(`user:${u}`).emit('dm:deleted', { id: m.id, dm_id: m.dm_id }));
  res.json({ ok: true });
});

app.post('/api/dms/:did/accept', auth, (req, res) => {
  const d = requireDm(req, res); if (!d) return;
  d.accepted = d.accepted || {}; d.accepted[req.user.id] = true;
  save();
  res.json(dmPayload(d, req.user.id));
});
app.delete('/api/dms/:did', auth, (req, res) => {
  const d = requireDm(req, res); if (!d) return;
  // recusar uma solicitação apaga a conversa
  removeUploads(attIds(db.dm_messages.filter((m) => m.dm_id === d.id)));
  db.dm_messages = db.dm_messages.filter((m) => m.dm_id !== d.id);
  db.dms = db.dms.filter((x) => x.id !== d.id);
  save();
  for (const [, sk] of io.sockets.sockets) if (sk.data.voice === `dm:${d.id}`) leaveVoice(sk);
  d.user_ids.forEach((u) => io.to(`user:${u}`).emit('dm:removed', { id: d.id }));
  res.json({ ok: true });
});

// ---- amigos
const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const friendRow = (a, b) => db.friends.find((f) => f.key === pairKey(a, b));
function areFriends(a, b) { return friendRow(a, b)?.status === 'accepted'; }
function friendIdsOf(uid) {
  return db.friends.filter((f) => f.status === 'accepted' && (f.from === uid || f.to === uid)).map((f) => (f.from === uid ? f.to : f.from));
}
function notifyFriends(...ids) { ids.forEach((u) => io.to(`user:${u}`).emit('friends:update')); }
app.get('/api/friends', auth, (req, res) => {
  const me = req.user.id;
  const mine = db.friends.filter((f) => f.from === me || f.to === me);
  const other = (f) => personOf(userById(f.from === me ? f.to : f.from));
  res.json({
    friends: mine.filter((f) => f.status === 'accepted').map((f) => ({ id: f.id, since: f.accepted_at, user: other(f) })).filter((x) => x.user)
      .sort((a, b) => (b.user.online - a.user.online) || a.user.display_name.localeCompare(b.user.display_name)),
    incoming: mine.filter((f) => f.status === 'pending' && f.to === me).map((f) => ({ id: f.id, message: f.message || '', created_at: f.created_at, user: other(f) })).filter((x) => x.user),
    outgoing: mine.filter((f) => f.status === 'pending' && f.from === me).map((f) => ({ id: f.id, message: f.message || '', created_at: f.created_at, user: other(f) })).filter((x) => x.user),
  });
});
function acceptFriend(f) {
  f.status = 'accepted'; f.accepted_at = now();
  // a mensagem do pedido aparece na conversa privada
  let d = db.dms.find((x) => x.user_ids.includes(f.from) && x.user_ids.includes(f.to));
  if (!d) { d = { id: id(), user_ids: [f.from, f.to], created_by: f.from, accepted: { [f.from]: true, [f.to]: true }, created_at: now(), last_at: now(), read: {} }; db.dms.push(d); }
  else { d.accepted = { ...(d.accepted || {}), [f.from]: true, [f.to]: true }; }
  if (f.message) {
    const m = { id: id(), dm_id: d.id, author_id: f.from, content: f.message, attachments: [], created_at: now() };
    db.dm_messages.push(m); d.last_at = m.created_at;
    const p = dmMessagePayload(m);
    d.user_ids.forEach((u) => io.to(`user:${u}`).emit('dm:message', { dm: dmPayload(d, u), message: p }));
  }
}
const frRate = new Map();
app.post('/api/friends', auth, (req, res) => {
  const me = req.user.id;
  const username = normUsername(req.body.username);
  const message = cleanStr(req.body.message, 120);
  if (!username) return bad(res, 'Digite o nome de usuário.');
  const other = db.users.find((u) => u.username === username);
  if (!other) return bad(res, 'Hm, não encontramos ninguém com esse nome de usuário. Confira se digitou certinho.', 404);
  if (other.id === me) return bad(res, 'Esse é você! 😅');
  const t = Date.now();
  const hits = (frRate.get(me) || []).filter((x) => t - x < 60000);
  if (hits.length >= 10) return bad(res, 'Muitos pedidos seguidos. Espere um pouco.', 429);
  hits.push(t); frRate.set(me, hits);
  let f = friendRow(me, other.id);
  if (f?.status === 'accepted') return bad(res, `Você e ${other.display_name} já são amigos.`);
  if (blockedEither(me, other.id)) return bad(res, 'Não foi possível mandar o pedido para essa pessoa.', 403);
  const fr = privacyOf(other).friend_requests;
  if (!(f && f.to === me) && (fr === 'nobody' || (fr === 'servers' && !sharesServer(me, other.id)))) return bad(res, 'Essa pessoa não está aceitando pedidos de amizade.', 403);
  if (f && f.from === me) return bad(res, 'Você já mandou um pedido para essa pessoa.');
  if (f && f.to === me) { acceptFriend(f); save(); notifyFriends(me, other.id); return res.json({ ok: true, accepted: true, user: personOf(other) }); }
  f = { id: id(), key: pairKey(me, other.id), from: me, to: other.id, status: 'pending', message, created_at: now() };
  db.friends.push(f); save();
  notifyFriends(me, other.id);
  io.to(`user:${other.id}`).emit('friends:request', { from: personOf(req.user), message });
  res.json({ ok: true, user: personOf(other) });
});
app.post('/api/friends/:fid/accept', auth, (req, res) => {
  const f = db.friends.find((x) => x.id === req.params.fid);
  if (!f || f.to !== req.user.id || f.status !== 'pending') return bad(res, 'Pedido não encontrado.', 404);
  acceptFriend(f); save();
  notifyFriends(f.from, f.to);
  res.json({ ok: true });
});
app.delete('/api/friends/:fid', auth, (req, res) => {
  const f = db.friends.find((x) => x.id === req.params.fid);
  if (!f || (f.from !== req.user.id && f.to !== req.user.id)) return bad(res, 'Não encontrado.', 404);
  db.friends = db.friends.filter((x) => x.id !== f.id);
  save();
  notifyFriends(f.from, f.to);
  res.json({ ok: true });
});

// ---- segurança: sessões, 2 etapas, bloqueios, denúncias
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buf) { let bits = 0, val = 0, out = ''; for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) out += B32[(val << (5 - bits)) & 31]; return out; }
function unbase32(str) { let bits = 0, val = 0; const out = []; for (const c of str.replace(/=+$/, '').toUpperCase()) { const i = B32.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); }
function totp(secret, step) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', unbase32(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
function checkTotp(secret, code) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const step = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((d) => crypto.timingSafeEqual(Buffer.from(totp(secret, step + d)), Buffer.from(c)));
}
const hashCode = (c) => crypto.createHash('sha256').update(String(c).toLowerCase().replace(/[^a-z0-9]/g, '')).digest('hex');
function checkSecondFactor(user, code) {
  if (checkTotp(user.totp_secret, code)) return true;
  const h = hashCode(code || '');
  const i = (user.backup_codes || []).indexOf(h);
  if (i >= 0) { user.backup_codes.splice(i, 1); return true; }
  return false;
}
app.get('/api/sessions', auth, (req, res) => {
  const t = new Date();
  res.json(db.sessions.filter((x) => x.user_id === req.user.id && new Date(x.expires) > t).map((x) => ({
    sid: x.sid || x.token.slice(0, 12), device: x.device || 'Dispositivo antigo', ip: x.ip || '', created_at: x.created_at || '', last_seen: x.last_seen || '',
    current: x.token === req.session.token,
  })).sort((a, b) => (b.current - a.current) || (b.last_seen > a.last_seen ? 1 : -1)));
});
function kickSessions(tokens) {
  for (const [, sk] of io.sockets.sockets) if (tokens.includes(sk.data.token)) { sk.emit('session:ended'); sk.disconnect(true); }
}
app.delete('/api/sessions/:sid', auth, (req, res) => {
  const gone = db.sessions.filter((x) => x.user_id === req.user.id && (x.sid || x.token.slice(0, 12)) === req.params.sid && x.token !== req.session.token);
  db.sessions = db.sessions.filter((x) => !gone.includes(x));
  save(); kickSessions(gone.map((x) => x.token));
  res.json({ ok: true, removed: gone.length });
});
app.post('/api/sessions/logout-others', auth, (req, res) => {
  const gone = db.sessions.filter((x) => x.user_id === req.user.id && x.token !== req.session.token);
  db.sessions = db.sessions.filter((x) => !gone.includes(x));
  save(); kickSessions(gone.map((x) => x.token));
  res.json({ ok: true, removed: gone.length });
});
// troca de senha encerra as outras sessões
app.post('/api/2fa/setup', auth, async (req, res) => {
  if (req.user.totp_secret) return bad(res, 'A verificação em duas etapas já está ligada.');
  const secret = base32(crypto.randomBytes(20));
  req.user.totp_pending = secret; save();
  const label = encodeURIComponent(`Lumix:${req.user.username || req.user.email}`);
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=Lumix&digits=6&period=30`;
  let qr = '';
  try { qr = await require('qrcode').toString(uri, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' } }); } catch { /* sem qr */ }
  res.json({ secret, uri, qr });
});
app.post('/api/2fa/enable', auth, (req, res) => {
  const sec = req.user.totp_pending;
  if (!sec) return bad(res, 'Comece a configuração de novo.');
  if (!checkTotp(sec, req.body.code)) return bad(res, 'Código incorreto. Confira o relógio do celular e tente de novo.');
  req.user.totp_secret = sec; delete req.user.totp_pending;
  const codes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').replace(/(.{4})/, '$1-'));
  req.user.backup_codes = codes.map(hashCode);
  save();
  res.json({ ok: true, backup_codes: codes });
});
app.post('/api/2fa/disable', auth, (req, res) => {
  if (!req.user.totp_secret) return res.json({ ok: true });
  if (!checkPassword(String(req.body.password || ''), req.user.password)) return bad(res, 'Senha incorreta.');
  if (!checkSecondFactor(req.user, req.body.code)) return bad(res, 'Código incorreto.');
  delete req.user.totp_secret; delete req.user.backup_codes;
  save();
  res.json({ ok: true });
});

const isBlocked = (by, who) => db.blocks.some((b) => b.blocker === by && b.blocked === who);
const blockedEither = (a, b) => isBlocked(a, b) || isBlocked(b, a);
app.get('/api/blocks', auth, (req, res) => {
  res.json(db.blocks.filter((b) => b.blocker === req.user.id).map((b) => ({ ...personOf(userById(b.blocked)), blocked_at: b.created_at })).filter((x) => x.id));
});
app.post('/api/blocks', auth, (req, res) => {
  const other = userById(String(req.body.user_id || ''));
  if (!other || other.id === req.user.id) return bad(res, 'Pessoa não encontrada.', 404);
  if (!isBlocked(req.user.id, other.id)) db.blocks.push({ blocker: req.user.id, blocked: other.id, created_at: now() });
  // bloquear desfaz amizade e pedidos
  db.friends = db.friends.filter((f) => f.key !== pairKey(req.user.id, other.id));
  save();
  for (const [, sk] of io.sockets.sockets) {
    const v = sk.data.voice;
    const d = v && dmOfKey(v);
    if (d && d.user_ids.includes(req.user.id) && d.user_ids.includes(other.id)) leaveVoice(sk);
  }
  notifyFriends(req.user.id, other.id);
  io.to(`user:${req.user.id}`).emit('blocks:update');
  res.json({ ok: true });
});
app.delete('/api/blocks/:uid', auth, (req, res) => {
  db.blocks = db.blocks.filter((b) => !(b.blocker === req.user.id && b.blocked === req.params.uid));
  save();
  io.to(`user:${req.user.id}`).emit('blocks:update');
  res.json({ ok: true });
});

// denúncias e relatos de problema
const repRate = new Map();
app.post('/api/reports', auth, (req, res) => {
  const type = ['message', 'user', 'bug', 'server'].includes(req.body.type) ? req.body.type : 'bug';
  const reason = cleanStr(req.body.reason, 60);
  const details = cleanStr(req.body.details, 1500);
  if (type === 'bug' && details.length < 5) return bad(res, 'Conte um pouco do que aconteceu.');
  const t = Date.now();
  const hits = (repRate.get(req.user.id) || []).filter((x) => t - x < 3600e3);
  if (hits.length >= 15) return bad(res, 'Você já mandou muitas denúncias. Tente mais tarde.', 429);
  hits.push(t); repRate.set(req.user.id, hits);
  const r = { id: id(), type, reason, details, reporter: req.user.id, created_at: now(), status: 'aberta', page: cleanStr(req.body.page, 200) };
  if (type === 'message') {
    const m = db.messages.find((x) => x.id === req.body.target) || db.dm_messages.find((x) => x.id === req.body.target);
    if (!m) return bad(res, 'Mensagem não encontrada.', 404);
    r.target = m.id; r.target_user = m.author_id; r.snapshot = { content: m.content, attachments: m.attachments || [], created_at: m.created_at, where: m.channel_id ? 'canal' : 'conversa privada' };
  }
  if (type === 'user') {
    const u = userById(String(req.body.target || ''));
    if (!u) return bad(res, 'Pessoa não encontrada.', 404);
    r.target = u.id; r.target_user = u.id;
  }
  db.reports.push(r); save();
  db.users.filter(isAdmin).forEach((a) => io.to(`user:${a.id}`).emit('admin:report'));
  res.json({ ok: true });
});
function requireAdmin(req, res) { if (!isAdmin(req.user)) { bad(res, 'Só a equipe da Lumix pode ver isso.', 403); return false; } return true; }
app.get('/api/admin/reports', auth, (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(db.reports.slice().reverse().slice(0, 200).map((r) => ({ ...r, reporter_user: personOf(userById(r.reporter)), target_person: r.target_user ? { ...personOf(userById(r.target_user)), banned: !!userById(r.target_user)?.banned } : null })));
});
app.patch('/api/admin/reports/:rid', auth, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const r = db.reports.find((x) => x.id === req.params.rid);
  if (!r) return bad(res, 'Não encontrada.', 404);
  if (['aberta', 'resolvida', 'descartada'].includes(req.body.status)) r.status = req.body.status;
  save(); res.json(r);
});
app.post('/api/admin/users/:uid/ban', auth, (req, res) => {
  if (!requireAdmin(req, res)) return;
  const u = userById(req.params.uid);
  if (!u || isAdmin(u)) return bad(res, 'Não dá para suspender essa conta.');
  u.banned = !!req.body.banned;
  if (u.banned) { const gone = db.sessions.filter((x) => x.user_id === u.id); db.sessions = db.sessions.filter((x) => x.user_id !== u.id); kickSessions(gone.map((x) => x.token)); }
  save(); res.json({ ok: true, banned: u.banned });
});

// perfil de outra pessoa
app.get('/api/users/:uid', auth, (req, res) => {
  const u = userById(req.params.uid);
  if (!u) return bad(res, 'Pessoa não encontrada.', 404);
  const me = req.user.id;
  const myServers = new Set(db.members.filter((m) => m.user_id === me).map((m) => m.server_id));
  const mutual = db.members.filter((m) => m.user_id === u.id && myServers.has(m.server_id)).map((m) => serverById(m.server_id)).filter(Boolean).map((s) => ({ id: s.id, name: s.name, color: s.color, icon_url: s.icon_url }));
  const f = friendRow(me, u.id);
  const pv = privacyOf(u);
  const showBio = u.id === me || pv.show_bio || areFriends(me, u.id);
  res.json({
    ...personOf(u), created_at: u.created_at, badges: badgesOf(u), accent: u.accent || '', banner_url: u.banner_url || '',
    bio: showBio ? u.bio || '' : '', status_text: u.status_text || '', mutual_servers: mutual,
    mutual_friends: friendIdsOf(me).filter((x) => friendIdsOf(u.id).includes(x)).length,
    friendship: !f ? 'none' : f.status === 'accepted' ? 'friends' : f.from === me ? 'outgoing' : 'incoming', friendship_id: f?.id || null,
    blocked: isBlocked(me, u.id), me: u.id === me,
  });
});

// ---- convites
app.get('/api/invite/:code', auth, (req, res) => {
  const s = db.servers.find((x) => x.invite_code === req.params.code);
  if (!s) return bad(res, 'Convite inválido ou expirado.', 404);
  res.json({ id: s.id, name: s.name, color: s.color, icon_url: s.icon_url,
    member_count: db.members.filter((m) => m.server_id === s.id).length, already_member: isMember(s.id, req.user.id) });
});
app.post('/api/invite/:code/join', auth, (req, res) => {
  const s = db.servers.find((x) => x.invite_code === req.params.code);
  if (!s) return bad(res, 'Convite inválido ou expirado.', 404);
  if (!isMember(s.id, req.user.id)) {
    db.members.push({ id: id(), server_id: s.id, user_id: req.user.id, role_ids: s.default_role_id ? [s.default_role_id] : [], joined_at: now() });
    save();
    joinSocketsToServer(req.user.id, s.id);
    io.to(`server:${s.id}`).emit('member:joined', { server_id: s.id, user: { ...publicUser(req.user), email: undefined } });
  }
  res.json(serverPayload(s, req.user.id));
});

// ---- config de chamada (STUN/TURN)
// Servidores para as chamadas atravessarem a internet (STUN + TURN).
// Sem TURN, chamadas entre redes diferentes (4G, operadoras com CGNAT) ficam mudas ou com tela preta.
let meteredCache = { at: 0, list: null };
async function iceServersFor(uid) {
  const stun = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] };
  if (process.env.ICE_SERVERS) {
    try { return JSON.parse(process.env.ICE_SERVERS); } catch { /* ignora */ }
  }
  // Metered (grátis com cadastro): METERED_DOMAIN=seuapp.metered.live e METERED_API_KEY
  if (process.env.METERED_DOMAIN && process.env.METERED_API_KEY) {
    if (meteredCache.list && Date.now() - meteredCache.at < 30 * 60e3) return meteredCache.list;
    try {
      const r = await fetch(`https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${encodeURIComponent(process.env.METERED_API_KEY)}`);
      const list = await r.json();
      if (Array.isArray(list) && list.length) { meteredCache = { at: Date.now(), list: [stun, ...list] }; return meteredCache.list; }
    } catch (e) { console.warn('Metered falhou:', e.message); }
  }
  // Padrão: TURN público do Open Relay (credencial temporária gerada aqui)
  const host = process.env.TURN_HOST || 'staticauth.openrelay.metered.ca';
  const secret = process.env.TURN_SECRET || 'openrelayprojectsecret';
  const username = `${Math.floor(Date.now() / 1000) + 24 * 3600}:${uid || 'lumix'}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  return [stun, {
    urls: [`turn:${host}:80`, `turn:${host}:80?transport=tcp`, `turn:${host}:443`, `turns:${host}:443?transport=tcp`],
    username, credential,
  }];
}
app.get('/api/config', auth, async (req, res) => {
  res.json({ iceServers: await iceServersFor(req.user.id) });
});

// ---- front-end
app.use(express.static(path.join(__dirname, 'public'), { etag: true, maxAge: 0 }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') return bad(res, `Arquivo muito grande (máximo ${Math.round(MAX_UPLOAD / 1048576)} MB).`, 413);
  console.error(err);
  bad(res, 'Algo deu errado no servidor.', 500);
});

// ---------------------------------------------------------------- tempo real
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });

function socketsOf(uid) {
  return [...io.sockets.sockets.values()].filter((s) => s.data.user?.id === uid);
}
function joinSocketsToServer(uid, sid) {
  for (const sock of socketsOf(uid)) sock.join(`server:${sid}`);
}

// voz: channelId -> Map(socketId -> estado)
const voice = new Map();
function voiceList(vcid) {
  const room = voice.get(vcid);
  if (!room) return [];
  return [...room.entries()].map(([sockId, st]) => {
    const u = userById(st.user_id);
    return { socket_id: sockId, user_id: st.user_id, display_name: u?.display_name || '?', avatar_url: u?.avatar_url || '',
      muted: st.muted, deafened: st.deafened, camera: st.camera, screen: st.screen };
  });
}
// chamadas em conversa privada usam a sala "dm:<id>"
const dmOfKey = (k) => (typeof k === 'string' && k.startsWith('dm:') ? dmById(k.slice(3)) : null);
function broadcastVoice(vcid) {
  const d = dmOfKey(vcid);
  if (d) { d.user_ids.forEach((u) => io.to(`user:${u}`).emit('voice:state', { channel_id: vcid, participants: voiceList(vcid) })); return; }
  const c = channelById(vcid);
  if (c) emitToChannel(c, 'voice:state', { channel_id: vcid, participants: voiceList(vcid) });
}
function leaveVoice(sock) {
  const vcid = sock.data.voice;
  if (!vcid) return;
  const room = voice.get(vcid);
  if (room) { room.delete(sock.id); if (!room.size) voice.delete(vcid); }
  sock.data.voice = null;
  sock.leave(`voice:${vcid}`);
  io.to(`voice:${vcid}`).emit('rtc:peer-left', { socket_id: sock.id });
  sock.emit('voice:left', { channel_id: vcid });
  broadcastVoice(vcid);
  const d = dmOfKey(vcid);
  if (d && !voice.get(vcid)) d.user_ids.forEach((u) => io.to(`user:${u}`).emit('call:ended', { dm_id: d.id }));
}

io.use((sock, next) => {
  const ses = sessionFromCookie(sock.handshake.headers.cookie);
  const u = ses && userById(ses.user_id);
  if (!u || u.banned) return next(new Error('unauthorized'));
  sock.data.user = u;
  sock.data.token = ses.token;
  next();
});

io.on('connection', (sock) => {
  const uid = sock.data.user.id;
  sock.join(`user:${uid}`);
  db.members.filter((m) => m.user_id === uid).forEach((m) => sock.join(`server:${m.server_id}`));

  sock.on('voice:snapshot', (sid, cb) => {
    if (typeof cb !== 'function' || !isMember(sid, uid)) return;
    const out = {};
    db.channels.filter((c) => c.server_id === sid && c.kind === 'voice' && canSee(c, uid)).forEach((c) => { out[c.id] = voiceList(c.id); });
    cb(out);
  });
  sock.on('voice:dmsnapshot', (cb) => {
    if (typeof cb !== 'function') return;
    const out = {};
    db.dms.filter((d) => d.user_ids.includes(uid)).forEach((d) => { const k = `dm:${d.id}`; if (voice.get(k)) out[k] = voiceList(k); });
    cb(out);
  });
  sock.on('call:decline', ({ dm_id } = {}) => {
    const d = dmById(dm_id);
    if (!d || !d.user_ids.includes(uid)) return;
    io.to(`voice:dm:${d.id}`).emit('call:declined', { dm_id: d.id, by: sock.data.user.display_name });
    d.user_ids.forEach((u) => io.to(`user:${u}`).emit('call:stop-ring', { dm_id: d.id }));
  });
  sock.on('voice:join', (vcid, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    const dmv = dmOfKey(vcid);
    if (dmv) {
      if (!dmv.user_ids.includes(uid)) return cb?.({ error: 'Conversa indisponível.' });
      const other = dmv.user_ids.find((u) => u !== uid);
      if (blockedEither(uid, other)) return cb?.({ error: 'Não é possível ligar para essa pessoa.' });
      if (!areFriends(uid, other) && !sharesServer(uid, other)) return cb?.({ error: 'Vocês precisam ser amigos para ligar.' });
      if (sock.data.voice) leaveVoice(sock);
      const existing = voiceList(vcid);
      if (!voice.has(vcid)) voice.set(vcid, new Map());
      voice.get(vcid).set(sock.id, { user_id: uid, muted: false, deafened: false, camera: false, screen: false });
      sock.data.voice = vcid;
      sock.join(`voice:${vcid}`);
      cb?.({ ok: true, peers: existing });
      broadcastVoice(vcid);
      // toca para a outra pessoa se ela ainda não está na chamada
      if (!existing.some((p) => p.user_id === other)) {
        io.to(`user:${other}`).emit('call:ring', { dm_id: dmv.id, from: personOf(sock.data.user), video: !!opts?.video });
      } else {
        dmv.user_ids.forEach((u) => io.to(`user:${u}`).emit('call:stop-ring', { dm_id: dmv.id }));
      }
      return;
    }
    const c = channelById(vcid);
    if (!c || c.kind !== 'voice' || !canSee(c, uid)) return cb?.({ error: 'Canal indisponível.' });
    if (sock.data.voice) leaveVoice(sock);
    const existing = voiceList(vcid);
    if (!voice.has(vcid)) voice.set(vcid, new Map());
    const listenOnly = !canPost(c, uid);
    voice.get(vcid).set(sock.id, { user_id: uid, muted: listenOnly, deafened: false, camera: false, screen: false, listenOnly });
    sock.data.voice = vcid;
    sock.join(`voice:${vcid}`);
    cb?.({ ok: true, peers: existing, listen_only: listenOnly });
    broadcastVoice(vcid);
  });
  sock.on('voice:leave', () => leaveVoice(sock));
  sock.on('voice:update', (patch = {}) => {
    const vcid = sock.data.voice;
    const st = vcid && voice.get(vcid)?.get(sock.id);
    if (!st) return;
    for (const k of ['muted', 'deafened', 'camera', 'screen']) if (typeof patch[k] === 'boolean') st[k] = patch[k];
    if (st.listenOnly) { st.muted = true; st.camera = false; st.screen = false; }
    broadcastVoice(vcid);
  });
  sock.on('rtc:signal', ({ to, data } = {}) => {
    const target = io.sockets.sockets.get(to);
    if (!target || !sock.data.voice || target.data.voice !== sock.data.voice) return;
    target.emit('rtc:signal', { from: sock.id, data });
  });
  sock.on('disconnect', () => leaveVoice(sock));
});

(async () => {
  if (store) {
    try {
      const remote = await store.loadDb();
      if (remote) { db = { ...JSON.parse(JSON.stringify(EMPTY)), ...remote }; console.log('Banco carregado do MongoDB.'); }
      else console.log('MongoDB conectado (banco novo).');
    } catch (e) {
      console.error('Não consegui conectar no MongoDB:', e.message);
      console.error('Confira o MONGODB_URI e o acesso de rede (0.0.0.0/0) no Atlas. Parando para não perder dados.');
      process.exit(1);
    }
  }
  migrate();
  if (store) store.saveDb(() => JSON.stringify(db), 0);
  server.listen(PORT, () => console.log(`Lumix rodando em http://localhost:${PORT}`));
})();
