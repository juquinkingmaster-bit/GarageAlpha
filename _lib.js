const { MongoClient } = require("mongodb");
const crypto = require("crypto");

let cached;
function db() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI manquante");
  if (!cached) {
    cached = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 }).connect()
      .then(async (c) => {
        const d = c.db(process.env.MONGODB_DB || "garage_alpha");
        await d.collection("files").createIndex({ no: 1 }, { unique: true, sparse: true });
        await d.collection("invoices").createIndex({ no: 1 }, { unique: true, sparse: true });
        return d;
      })
      .catch((e) => { cached = null; throw e; });
  }
  return cached;
}

const sign = (p) => crypto.createHmac("sha256", process.env.SESSION_SECRET || "").update(p).digest("base64url");
function makeToken(u, v = 0) {
  const p = Buffer.from(JSON.stringify({ u, v, exp: Date.now() + 12 * 3600e3 })).toString("base64url");
  return p + "." + sign(p);
}
function readToken(req) {
  if (!process.env.SESSION_SECRET) return null;
  const m = /(?:^|;\s*)ga_s=([^;]+)/.exec(req.headers.cookie || "");
  if (!m) return null;
  const [p, s] = m[1].split(".");
  if (!p || !s) return null;
  const e = sign(p);
  if (s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  try { const d = JSON.parse(Buffer.from(p, "base64url")); return d.exp > Date.now() ? d : null; } catch { return null; }
}
const cookie = (v, age) => `ga_s=${v}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`;

// --- Identifiants : en base (collection meta, _id "auth") une fois le mot de passe changé, sinon variables d'environnement.
const eq = (a, b) => a.length === b.length && crypto.timingSafeEqual(a, b);
const normU = (u) => String(u || "").slice(0, 100).trim().toLowerCase().replace(/\s+/g, " ");
const pbk = (u, p, saltB64) => new Promise((ok, ko) =>
  crypto.pbkdf2(u + "\n" + p, Buffer.from(saltB64 || "", "base64"), 210000, 32, "sha256", (e, k) => (e ? ko(e) : ok(k))));
async function getAuth() { return (await (await db()).collection("meta").findOne({ _id: "auth" })) || null; }
let _av = { t: 0, v: 0 };
async function authVer() {
  if (Date.now() - _av.t < 4000) return _av.v;
  const a = await getAuth(); _av = { t: Date.now(), v: (a && a.ver) || 0 }; return _av.v;
}
async function checkCreds(user, pass) {
  const a = await getAuth(), u = normU(user), p = String(pass || "").slice(0, 200);
  if (a) return u === a.u && eq(await pbk(u, p, a.salt), Buffer.from(a.hash, "base64"));
  const h = await pbk(u, p, process.env.ADMIN_SALT);
  return (process.env.ADMIN_HASHES || "").split(",").some((x) => x.trim() && eq(Buffer.from(x.trim(), "base64"), h));
}
async function setAuth(u, pass, extra = {}) {
  const salt = crypto.randomBytes(16), ver = Date.now();
  const hash = (await pbk(u, pass, salt.toString("base64"))).toString("base64");
  await (await db()).collection("meta").updateOne({ _id: "auth" }, { $set: { u, salt: salt.toString("base64"), hash, ver, updated: ver, ...extra } }, { upsert: true });
  _av = { t: 0, v: 0 }; return ver;
}
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCodes = (n = 8) => Array.from({ length: n }, () => { const b = crypto.randomBytes(12); const s = Array.from(b, (x) => ALPHA[x % 32]).join(""); return s.match(/.{4}/g).join("-"); });
const hashCode = (c) => crypto.createHash("sha256").update("rc|" + String(c).toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");
// Limitation des essais par adresse IP et par type d'action.
async function throttle(key) { const a = await (await db()).collection("attempts").findOne({ _id: key }); return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 1000) : 0; }
async function failed(key) {
  const A = (await db()).collection("attempts"), a = await A.findOne({ _id: key }), n = ((a && a.n) || 0) + 1;
  await A.updateOne({ _id: key }, { $set: { n, until: n >= 5 ? Date.now() + Math.min(9e5, 3e4 * 2 ** (n - 5)) : 0 } }, { upsert: true });
}
const cleared = async (key) => (await db()).collection("attempts").deleteOne({ _id: key });
const ipOf = (req) => String(req.headers["x-forwarded-for"] || "inconnu").split(",")[0].trim();

// Réponses sans cache, contrôle d'origine (CSRF) et session administrateur (invalidée si le mot de passe change).
async function guard(req, res, { auth = true } = {}) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    const o = req.headers.origin;
    if (o) { let h = ""; try { h = new URL(o).host; } catch {} if (h !== req.headers.host) { res.status(403).json({ error: "Origine refusée" }); return false; } }
  }
  if (auth) { const t = readToken(req); if (!t || (t.v || 0) !== (await authVer())) { res.status(401).json({ error: "Non connecté" }); return false; } }
  return true;
}
const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ error: "Erreur serveur" }); }
};

// Nettoie un document reçu : objet simple, id numérique, pas de champs $ ou _id.
function clean(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;
  const r = {};
  for (const k of Object.keys(o)) if (!k.startsWith("$") && k !== "_id" && !k.includes(".")) r[k] = o[k];
  r.id = id;
  return r;
}
const strip = ({ _id, ...r }) => r;

async function bump() {
  const m = await (await db()).collection("meta").findOneAndUpdate(
    { _id: "app" }, { $inc: { rev: 1 } }, { upsert: true, returnDocument: "after" });
  return m.rev;
}
// Prochain numéro de dossier GA-AAAA-NNNN (année à Kinshasa).
async function nextNo(C, entry, prefix = "GA") {
  const d = entry ? new Date(entry) : new Date();
  const y = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Kinshasa", year: "numeric" }).format(isNaN(d) ? new Date() : d);
  const last = await C.find({ no: new RegExp(`^${prefix}-${y}-\\d{4,}$`) }).sort({ no: -1 }).limit(1).toArray();
  const n = last.length ? parseInt(last[0].no.slice(8), 10) + 1 : 1;
  return `${prefix}-${y}-${String(n).padStart(4, "0")}`;
}
module.exports = { db, makeToken, readToken, cookie, guard, wrap, clean, strip, bump, nextNo, eq, normU, pbk, getAuth, authVer, checkCreds, setAuth, newCodes, hashCode, throttle, failed, cleared, ipOf };
