const { guard, wrap, normU, getAuth, setAuth, hashCode, eq, db, throttle, failed, cleared, ipOf } = require("./_lib");
// POST { user, code, next } : réinitialise le mot de passe avec un code de secours à usage unique.
module.exports = wrap(async (req, res) => {
  if (req.method !== "POST" || !(await guard(req, res, { auth: false }))) return;
  const key = "rec:" + ipOf(req), w = await throttle(key);
  if (w) return res.status(429).json({ error: "Trop d’essais : réessayez dans " + w + " s." });
  const b = req.body || {}, a = await getAuth(), next = String(b.next || "").slice(0, 200);
  const h = hashCode(b.code || ""), i = a && a.codes ? a.codes.findIndex((c) => !c.used && eq(Buffer.from(c.h), Buffer.from(h))) : -1;
  if (!a || normU(b.user) !== a.u || i < 0) { await failed(key); return res.status(401).json({ error: "Identifiant ou code de secours incorrect." }); }
  if (next.length < 8) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
  await cleared(key);
  const codes = a.codes.map((c, k) => (k === i ? { ...c, used: true } : c));
  await setAuth(a.u, next, { codes });
  res.json({ ok: true, remaining: codes.filter((c) => !c.used).length });
});
