const { db, guard, makeToken, cookie, wrap, normU, checkCreds, getAuth, throttle, failed, cleared, ipOf } = require("./_lib");
module.exports = wrap(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  if (!(await guard(req, res, { auth: false }))) return;
  const key = "login:" + ipOf(req), w = await throttle(key);
  if (w) return res.status(429).json({ error: "Trop d’essais : réessayez dans " + w + " s." });
  const b = req.body || {};
  if (!(await checkCreds(b.user, b.password))) { await failed(key); return res.status(401).json({ error: "Identifiant ou mot de passe incorrect." }); }
  await cleared(key);
  const a = await getAuth();
  res.setHeader("Set-Cookie", cookie(makeToken(normU(b.user), (a && a.ver) || 0), 43200));
  res.json({ ok: true });
});
