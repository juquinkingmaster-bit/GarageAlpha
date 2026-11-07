const { guard, wrap, readToken, normU, checkCreds, setAuth, getAuth, newCodes, hashCode, makeToken, cookie, db, throttle, failed, cleared, ipOf } = require("./_lib");
// POST { action:"change", current, next, user? } · POST { action:"codes", current }  (session administrateur requise)
module.exports = wrap(async (req, res) => {
  if (req.method !== "POST" || !(await guard(req, res))) return;
  const key = "pw:" + ipOf(req), w = await throttle(key);
  if (w) return res.status(429).json({ error: "Trop d’essais : réessayez dans " + w + " s." });
  const b = req.body || {}, t = readToken(req), cur = String(b.current || "").slice(0, 200);
  if (!(await checkCreds(t.u, cur))) { await failed(key); return res.status(401).json({ error: "Mot de passe actuel incorrect." }); }
  await cleared(key);
  const M = (await db()).collection("meta");
  if (b.action === "codes") {
    if (!(await getAuth())) await setAuth(t.u, cur);                       // fige les identifiants actuels en base
    const codes = newCodes(), ver = Date.now();
    await M.updateOne({ _id: "auth" }, { $set: { codes: codes.map((c) => ({ h: hashCode(c), used: false })) } });
    return res.json({ codes });
  }
  const next = String(b.next || "").slice(0, 200);
  if (next.length < 8) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
  if (next === cur) return res.status(400).json({ error: "Le nouveau mot de passe doit être différent de l’ancien." });
  const u = normU(b.user) || t.u, a = await getAuth(), ver = await setAuth(u, next, a && a.codes ? {} : {});
  res.setHeader("Set-Cookie", cookie(makeToken(u, ver), 43200));       // la session courante reste valide, les autres sont fermées
  res.json({ ok: true, hasCodes: !!(a && a.codes && a.codes.some((c) => !c.used)) });
});
