// Armazenamento permanente opcional no MongoDB (Atlas grátis).
// Sem MONGODB_URI, tudo fica só no disco local (que o Render grátis apaga ao reiniciar).
const zlib = require('zlib');

const DB_NAME = 'db.json.gz';
const FILE_PREFIX = 'up:';

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
function writeTo(bucket, filename, buf, metadata) {
  return new Promise((resolve, reject) => {
    const up = bucket.openUploadStream(filename, { metadata });
    up.once('error', reject);
    up.once('finish', () => resolve(up.id));
    up.end(buf);
  });
}

function createStore({ uri, dbName, bucket: injected } = {}) {
  let bucket = injected || null;
  let client = null;
  let pending = null;   // último snapshot esperando para subir
  let running = null;   // envio em andamento
  let timer = null;

  async function connect() {
    if (bucket) return;
    const { MongoClient, GridFSBucket } = require('mongodb');
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
    await client.connect();
    bucket = new GridFSBucket(client.db(dbName || 'globalpath'), { bucketName: 'gp' });
  }

  async function newest(filename) {
    const list = await bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray();
    return list[0] || null;
  }

  async function loadDb() {
    await connect();
    const f = await newest(DB_NAME);
    if (!f) return null;
    const buf = await streamToBuffer(bucket.openDownloadStream(f._id));
    return JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
  }

  async function pushDb(json) {
    const buf = zlib.gzipSync(Buffer.from(json));
    const newId = await writeTo(bucket, DB_NAME, buf, { at: new Date() });
    const old = await bucket.find({ filename: DB_NAME, _id: { $ne: newId } }).toArray();
    for (const o of old) await bucket.delete(o._id).catch(() => {});
  }

  async function drain() {
    while (pending !== null) {
      const json = pending; pending = null;
      try { await pushDb(json); } catch (e) { console.error('Falha ao salvar no MongoDB:', e.message); pending = pending ?? json; await new Promise((r) => setTimeout(r, 5000)); }
    }
    running = null;
  }
  // agenda o envio do banco (junta várias mudanças seguidas num envio só)
  function saveDb(getJson, delay = 2000) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending = getJson();
      if (!running) running = drain();
    }, delay);
  }
  async function flush(getJson) {
    clearTimeout(timer);
    pending = getJson();
    if (!running) running = drain();
    await running;
  }

  async function putFile(id, buf, type) {
    await writeTo(bucket, FILE_PREFIX + id, buf, { type });
  }
  async function getFile(id) {
    const f = await newest(FILE_PREFIX + id);
    if (!f) return null;
    return streamToBuffer(bucket.openDownloadStream(f._id));
  }
  async function delFile(id) {
    const list = await bucket.find({ filename: FILE_PREFIX + id }).toArray();
    for (const f of list) await bucket.delete(f._id).catch(() => {});
  }

  return { loadDb, saveDb, flush, putFile, getFile, delFile, connect, close: () => client?.close() };
}

module.exports = { createStore };
