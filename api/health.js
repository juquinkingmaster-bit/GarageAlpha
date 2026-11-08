const { db, getAuth } = require("./_lib");
// Diagnostic : GET /api/health (ne révèle aucune valeur secrète).
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const env = Object.fromEntries(["MONGODB_URI", "SESSION_SECRET", "ADMIN_SALT", "ADMIN_HASHES"].map((k) => [k, !!process.env[k]]));
  let base = "ok", auth = "variables d’environnement";
  try { const a = await getAuth(); if (a) auth = "base de données (mot de passe modifié)"; } catch { base = "échec : vérifiez MONGODB_URI et l’accès réseau d’Atlas (0.0.0.0/0)"; }
  res.status(200).json({ api: "en ligne", env, base, identifiants: auth });
};
