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
const EMPTY = { users: [], sessions: [], servers: [], members: [], channels: [], messages: [] };
let db = EMPTY;
try {
  db = { ...EMPTY, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
} catch {
  db = JSON.parse(JSON.stringify(EMPTY));
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
}
function flushSync() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
}
process.on('SIGINT', () => { flushSync(); process.exit(0); });
process.on('SIGTERM', () => { flushSync(); process.exit(0); });

const id = () => crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();
const inviteCode = () => crypto.randomBytes(5).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8);

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function checkPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

const publicUser = (u) => u && ({ id: u.id, display_name: u.display_name, avatar_url: u.avatar_url || '', email: u.email });
const userById = (uid) => db.users.find((u) => u.id === uid);
const isMember = (sid, uid) => db.members.some((m) => m.server_id === sid && m.user_id === uid);
const serverById = (sid) => db.servers.find((s) => s.id === sid);
const channelById = (cid) => db.channels.find((c) => c.id === cid);

// ---------------------------------------------------------------- app
const app = express();
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
function setSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db.sessions.push({ token, user_id: userId, expires: expires.toISOString() });
  save();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
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
  setSession(res, user.id);
  res.json(publicUser(user));
});

app.post('/api/auth/login', (req, res) => {
  const email = cleanStr(req.body.email, 120).toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user || !checkPassword(String(req.body.password || ''), user.password)) return bad(res, 'E-mail ou senha incorretos.', 401);
  setSession(res, user.id);
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
  // avisa todos os servidores em que a pessoa está
  db.members.filter((m) => m.user_id === req.user.id).forEach((m) => io.to(`server:${m.server_id}`).emit('user:updated', pu));
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
  return { ...s, is_owner: s.owner_id === uid };
}
app.get('/api/servers', auth, (req, res) => {
  const ids = db.members.filter((m) => m.user_id === req.user.id).map((m) => m.server_id);
  res.json(db.servers.filter((s) => ids.includes(s.id)).map((s) => serverPayload(s, req.user.id)));
});

app.post('/api/servers', auth, (req, res) => {
  const name = cleanStr(req.body.name, 40);
  if (!name) return bad(res, 'Dê um nome ao servidor.');
  if (!validImage(req.body.icon_url)) return bad(res, 'Ícone inválido ou muito grande.');
  const color = /^(10|[1-9])$/.test(String(req.body.color)) ? String(req.body.color) : String(1 + Math.floor(Math.random() * 10));
  const s = { id: id(), name, color, icon_url: req.body.icon_url || '', invite_code: inviteCode(), owner_id: req.user.id, created_at: now() };
  db.servers.push(s);
  db.members.push({ id: id(), server_id: s.id, user_id: req.user.id, joined_at: now() });
  db.channels.push({ id: id(), server_id: s.id, name: 'geral', kind: 'text', created_at: now() });
  db.channels.push({ id: id(), server_id: s.id, name: 'Sala de voz', kind: 'voice', created_at: now() });
  save();
  joinSocketsToServer(req.user.id, s.id);
  res.json(serverPayload(s, req.user.id));
});

function requireMember(req, res) {
  const s = serverById(req.params.sid);
  if (!s || !isMember(s.id, req.user.id)) { bad(res, 'Servidor não encontrado.', 404); return null; }
  return s;
}
function requireOwner(req, res) {
  const s = requireMember(req, res);
  if (!s) return null;
  if (s.owner_id !== req.user.id) { bad(res, 'Só o dono do servidor pode fazer isso.', 403); return null; }
  return s;
}

app.patch('/api/servers/:sid', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  if (req.body.name !== undefined) {
    const n = cleanStr(req.body.name, 40); if (!n) return bad(res, 'Nome inválido.'); s.name = n;
  }
  if (req.body.color !== undefined && /^(10|[1-9])$/.test(String(req.body.color))) s.color = String(req.body.color);
  if (req.body.icon_url !== undefined) {
    if (!validImage(req.body.icon_url)) return bad(res, 'Ícone inválido ou muito grande.');
    s.icon_url = req.body.icon_url || '';
  }
  save();
  io.to(`server:${s.id}`).emit('server:updated', s);
  res.json(serverPayload(s, req.user.id));
});

app.delete('/api/servers/:sid', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  const chIds = db.channels.filter((c) => c.server_id === s.id).map((c) => c.id);
  db.messages = db.messages.filter((m) => !chIds.includes(m.channel_id));
  db.channels = db.channels.filter((c) => c.server_id !== s.id);
  db.members = db.members.filter((m) => m.server_id !== s.id);
  db.servers = db.servers.filter((x) => x.id !== s.id);
  save();
  io.to(`server:${s.id}`).emit('server:deleted', { id: s.id });
  io.in(`server:${s.id}`).socketsLeave(`server:${s.id}`);
  res.json({ ok: true });
});

app.post('/api/servers/:sid/invite', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  s.invite_code = inviteCode();
  save();
  io.to(`server:${s.id}`).emit('server:updated', s);
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
  const list = db.members.filter((m) => m.server_id === s.id).map((m) => ({
    ...publicUser(userById(m.user_id)), email: undefined, joined_at: m.joined_at, is_owner: m.user_id === s.owner_id,
    online: socketsOf(m.user_id).length > 0,
  })).filter((m) => m.id);
  res.json(list);
});

app.delete('/api/servers/:sid/members/:uid', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  if (req.params.uid === s.owner_id) return bad(res, 'Você não pode remover a si mesmo.');
  removeMember(s.id, req.params.uid);
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
    db.members.push({ id: id(), server_id: s.id, user_id: req.user.id, joined_at: now() });
    save();
    joinSocketsToServer(req.user.id, s.id);
    io.to(`server:${s.id}`).emit('member:joined', { server_id: s.id, user: publicUser(req.user) });
  }
  res.json(serverPayload(s, req.user.id));
});

// ---- canais
app.get('/api/servers/:sid/channels', auth, (req, res) => {
  const s = requireMember(req, res); if (!s) return;
  res.json(db.channels.filter((c) => c.server_id === s.id));
});
app.post('/api/servers/:sid/channels', auth, (req, res) => {
  const s = requireOwner(req, res); if (!s) return;
  const kind = req.body.kind === 'voice' ? 'voice' : 'text';
  let name = cleanStr(req.body.name, 40);
  if (kind === 'text') name = name.toLowerCase().replace(/\s+/g, '-');
  if (!name) return bad(res, 'Dê um nome ao canal.');
  const c = { id: id(), server_id: s.id, name, kind, created_at: now() };
  db.channels.push(c);
  save();
  io.to(`server:${s.id}`).emit('channel:created', c);
  res.json(c);
});
function requireChannel(req, res, owner = false) {
  const c = channelById(req.params.cid);
  if (!c || !isMember(c.server_id, req.user.id)) { bad(res, 'Canal não encontrado.', 404); return null; }
  if (owner && serverById(c.server_id).owner_id !== req.user.id) { bad(res, 'Só o dono do servidor pode fazer isso.', 403); return null; }
  return c;
}
app.patch('/api/channels/:cid', auth, (req, res) => {
  const c = requireChannel(req, res, true); if (!c) return;
  let name = cleanStr(req.body.name, 40);
  if (c.kind === 'text') name = name.toLowerCase().replace(/\s+/g, '-');
  if (!name) return bad(res, 'Nome inválido.');
  c.name = name; save();
  io.to(`server:${c.server_id}`).emit('channel:updated', c);
  res.json(c);
});
app.delete('/api/channels/:cid', auth, (req, res) => {
  const c = requireChannel(req, res, true); if (!c) return;
  db.channels = db.channels.filter((x) => x.id !== c.id);
  db.messages = db.messages.filter((m) => m.channel_id !== c.id);
  save();
  for (const [, sock] of io.sockets.sockets) if (sock.data.voice === c.id) leaveVoice(sock);
  io.to(`server:${c.server_id}`).emit('channel:deleted', { id: c.id, server_id: c.server_id });
  res.json({ ok: true });
});

// ---- mensagens
function messagePayload(m) {
  const u = userById(m.author_id);
  return { ...m, author_name: u ? u.display_name : m.author_name, author_avatar: u ? u.avatar_url : '' };
}
app.get('/api/channels/:cid/messages', auth, (req, res) => {
  const c = requireChannel(req, res); if (!c) return;
  let list = db.messages.filter((m) => m.channel_id === c.id);
  if (req.query.before) list = list.filter((m) => m.created_at < req.query.before);
  res.json(list.slice(-50).map(messagePayload));
});
app.post('/api/channels/:cid/messages', auth, (req, res) => {
  const c = requireChannel(req, res); if (!c) return;
  if (c.kind !== 'text') return bad(res, 'Este canal não aceita mensagens.');
  const content = String(req.body.content || '').trim().slice(0, 2000);
  if (!content) return bad(res, 'Mensagem vazia.');
  const m = { id: id(), channel_id: c.id, server_id: c.server_id, author_id: req.user.id, author_name: req.user.display_name, content, created_at: now() };
  db.messages.push(m);
  save();
  const p = messagePayload(m);
  io.to(`server:${c.server_id}`).emit('message:created', p);
  res.json(p);
});
app.delete('/api/messages/:mid', auth, (req, res) => {
  const m = db.messages.find((x) => x.id === req.params.mid);
  if (!m) return bad(res, 'Mensagem não encontrada.', 404);
  const s = serverById(m.server_id);
  if (m.author_id !== req.user.id && s?.owner_id !== req.user.id) return bad(res, 'Sem permissão.', 403);
  db.messages = db.messages.filter((x) => x.id !== m.id);
  save();
  io.to(`server:${m.server_id}`).emit('message:deleted', { id: m.id, channel_id: m.channel_id });
  res.json({ ok: true });
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
app.use(express.static(path.join(__dirname, 'public')));
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
function voiceList(cid) {
  const room = voice.get(cid);
  if (!room) return [];
  return [...room.entries()].map(([sockId, st]) => {
    const u = userById(st.user_id);
    return { socket_id: sockId, user_id: st.user_id, display_name: u?.display_name || '?', avatar_url: u?.avatar_url || '',
      muted: st.muted, deafened: st.deafened, camera: st.camera, screen: st.screen };
  });
}
function broadcastVoice(cid) {
  const c = channelById(cid);
  if (c) io.to(`server:${c.server_id}`).emit('voice:state', { channel_id: cid, participants: voiceList(cid) });
}
function leaveVoice(sock) {
  const cid = sock.data.voice;
  if (!cid) return;
  const room = voice.get(cid);
  if (room) {
    room.delete(sock.id);
    if (!room.size) voice.delete(cid);
  }
  sock.data.voice = null;
  sock.leave(`voice:${cid}`);
  io.to(`voice:${cid}`).emit('rtc:peer-left', { socket_id: sock.id });
  sock.emit('voice:left', { channel_id: cid });
  broadcastVoice(cid);
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
    db.channels.filter((c) => c.server_id === sid && c.kind === 'voice').forEach((c) => { out[c.id] = voiceList(c.id); });
    cb(out);
  });

  sock.on('voice:join', (cid, cb) => {
    const c = channelById(cid);
    if (!c || c.kind !== 'voice' || !isMember(c.server_id, uid)) return cb?.({ error: 'Canal indisponível.' });
    if (sock.data.voice) leaveVoice(sock);
    const existing = voiceList(cid);
    if (!voice.has(cid)) voice.set(cid, new Map());
    voice.get(cid).set(sock.id, { user_id: uid, muted: false, deafened: false, camera: false, screen: false });
    sock.data.voice = cid;
    sock.join(`voice:${cid}`);
    cb?.({ ok: true, peers: existing });
    broadcastVoice(cid);
  });

  sock.on('voice:leave', () => leaveVoice(sock));

  sock.on('voice:update', (patch = {}) => {
    const cid = sock.data.voice;
    const st = cid && voice.get(cid)?.get(sock.id);
    if (!st) return;
    for (const k of ['muted', 'deafened', 'camera', 'screen']) if (typeof patch[k] === 'boolean') st[k] = patch[k];
    broadcastVoice(cid);
  });

  // sinalização WebRTC — só entre pessoas do mesmo canal de voz
  sock.on('rtc:signal', ({ to, data } = {}) => {
    const target = io.sockets.sockets.get(to);
    if (!target || !sock.data.voice || target.data.voice !== sock.data.voice) return;
    target.emit('rtc:signal', { from: sock.id, data });
  });

  sock.on('disconnect', () => leaveVoice(sock));
});

server.listen(PORT, () => console.log(`GlobalPath rodando em http://localhost:${PORT}`));
