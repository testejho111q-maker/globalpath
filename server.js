// GlobalPath — servidor completo (Express + Socket.IO + banco em arquivo JSON)
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
const EMPTY = { users: [], sessions: [], servers: [], members: [], channels: [], messages: [], roles: [], dms: [], dm_messages: [] };
let db;
try {
  db = { ...JSON.parse(JSON.stringify(EMPTY)), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
} catch {
  db = JSON.parse(JSON.stringify(EMPTY));
}
// migração de dados antigos
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

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}
function flushSync() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
}
process.on('SIGINT', () => { flushSync(); process.exit(0); });
process.on('SIGTERM', () => { flushSync(); process.exit(0); });

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

const publicUser = (u) => u && ({ id: u.id, display_name: u.display_name, avatar_url: u.avatar_url || '', email: u.email });
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
      cat.channels.push({ name: n, kind, read_only: !!ch.read_only, topic: str(ch.topic, 200) });
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
const AI_SYSTEM = `Você monta a estrutura de servidores de comunidade (estilo Discord) para o app GlobalPath.
Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato:
{"roles":[{"name":"👑 Dono","color":"#ef4444","hoist":true,"perms":{"admin":true},"owner":true}],
 "categories":[{"name":"📌 Informações","private":false,"channels":[{"name":"📜regras","kind":"text","read_only":true,"topic":"Leia antes de participar."}]}],
 "rules":"texto das regras em português, com quebras de linha \\n"}
Regras:
- Tudo em português do Brasil, nomes curtos e criativos no estilo que a pessoa pedir.
- Canais de texto: minúsculas, sem espaços (use hífen). Canais de voz podem ter espaços. kind é "text" ou "voice".
- perms possíveis: admin, manage_server, manage_channels, manage_roles, manage_messages, kick.
- Exatamente um cargo com "owner":true (o dono). Marque cargos de moderação com "staff":true. Marque no máximo um cargo com "default":true (dado automaticamente a quem entra; nunca admin).
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
app.use(express.json({ limit: '4mb' }));

function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function userFromCookie(header) {
  const token = parseCookies(header)[COOKIE];
  if (!token) return null;
  const s = db.sessions.find((x) => x.token === token);
  if (!s || new Date(s.expires) < new Date()) return null;
  return userById(s.user_id) || null;
}
function setSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db.sessions.push({ token, user_id: userId, expires: expires.toISOString() });
  save();
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Expires=${expires.toUTCString()}${secure}`);
}
function auth(req, res, next) {
  const u = userFromCookie(req.headers.cookie);
  if (!u) return res.status(401).json({ error: 'Faça login para continuar.' });
  req.user = u;
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
  const user = { id: id(), email, display_name, avatar_url: '', password: hashPassword(password), created_at: now() };
  db.users.push(user);
  setSession(req, res, user.id);
  res.json(publicUser(user));
});
app.post('/api/auth/login', (req, res) => {
  const email = cleanStr(req.body.email, 120).toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user || !checkPassword(String(req.body.password || ''), user.password)) return bad(res, 'E-mail ou senha incorretos.', 401);
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
  res.json(pu);
});
app.post('/api/me/password', auth, (req, res) => {
  const { current, next } = req.body;
  if (!checkPassword(String(current || ''), req.user.password)) return bad(res, 'Senha atual incorreta.');
  if (String(next || '').length < 6) return bad(res, 'A nova senha precisa ter pelo menos 6 caracteres.');
  req.user.password = hashPassword(String(next));
  save();
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
    return { id: u.id, display_name: u.display_name, avatar_url: u.avatar_url || '', joined_at: m.joined_at, role_ids: m.role_ids,
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
    .map((c) => ({ ...c, can_post: canPost(c, req.user.id) })));
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
  res.json({ ...c, can_post: canPost(c, req.user.id) });
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
  db.messages = db.messages.filter((m) => m.channel_id !== c.id);
  save();
  for (const [, sock] of io.sockets.sockets) if (sock.data.voice === c.id) leaveVoice(sock);
  refresh(c.server_id);
  res.json({ ok: true });
});

// ---- mensagens
function messagePayload(m) {
  const u = userById(m.author_id);
  return { ...m, author_name: u ? u.display_name : m.author_name, author_avatar: u ? u.avatar_url : '', author_color: topRole(m.server_id, m.author_id)?.color || '' };
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
  if (!content) return bad(res, 'Mensagem vazia.');
  const m = { id: id(), channel_id: c.id, server_id: c.server_id, author_id: req.user.id, author_name: req.user.display_name, content, created_at: now() };
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
function dmPayload(d, uid) {
  const other = userById(d.user_ids.find((u) => u !== uid) || uid);
  const msgs = db.dm_messages.filter((m) => m.dm_id === d.id);
  const last = msgs[msgs.length - 1];
  const read = d.read?.[uid] || '';
  return {
    id: d.id, last_at: d.last_at,
    user: other ? { id: other.id, display_name: other.display_name, avatar_url: other.avatar_url || '', online: socketsOf(other.id).length > 0 } : { id: '', display_name: 'Conta removida', avatar_url: '' },
    last_message: last ? { content: last.content.slice(0, 80), mine: last.author_id === uid } : null,
    unread: msgs.filter((m) => m.author_id !== uid && m.created_at > read).length,
  };
}
function dmMessagePayload(m) {
  const u = userById(m.author_id);
  return { ...m, author_name: u ? u.display_name : '?', author_avatar: u ? u.avatar_url : '' };
}
function requireDm(req, res) {
  const d = dmById(req.params.did);
  if (!d || !d.user_ids.includes(req.user.id)) { bad(res, 'Conversa não encontrada.', 404); return null; }
  return d;
}
app.get('/api/people', auth, (req, res) => {
  const mine = new Set(db.members.filter((m) => m.user_id === req.user.id).map((m) => m.server_id));
  const ids = new Set(db.members.filter((m) => mine.has(m.server_id) && m.user_id !== req.user.id).map((m) => m.user_id));
  res.json([...ids].map(userById).filter(Boolean).map((u) => ({ id: u.id, display_name: u.display_name, avatar_url: u.avatar_url || '', online: socketsOf(u.id).length > 0 }))
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
    if (!sharesServer(req.user.id, other.id)) return bad(res, 'Vocês precisam estar em um servidor em comum.', 403);
    d = { id: id(), user_ids: [req.user.id, other.id], created_at: now(), last_at: now(), read: {} };
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
  if (!content) return bad(res, 'Mensagem vazia.');
  const m = { id: id(), dm_id: d.id, author_id: req.user.id, content, created_at: now() };
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
  save();
  const d = dmById(m.dm_id);
  d?.user_ids.forEach((u) => io.to(`user:${u}`).emit('dm:deleted', { id: m.id, dm_id: m.dm_id }));
  res.json({ ok: true });
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
app.get('/api/config', (req, res) => {
  let iceServers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.ICE_SERVERS) {
    try { iceServers = JSON.parse(process.env.ICE_SERVERS); } catch { /* mantém padrão */ }
  }
  res.json({ iceServers });
});

// ---- front-end
app.use(express.static(path.join(__dirname, 'public'), { etag: true, maxAge: 0 }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

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
function broadcastVoice(vcid) {
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
}

io.use((sock, next) => {
  const u = userFromCookie(sock.handshake.headers.cookie);
  if (!u) return next(new Error('unauthorized'));
  sock.data.user = u;
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
  sock.on('voice:join', (vcid, cb) => {
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

server.listen(PORT, () => console.log(`GlobalPath rodando em http://localhost:${PORT}`));
