// Usage : node --env-file=.env.local scripts/reset-password.js "Identifiant" "NouveauMotDePasse"
// Réinitialise l'accès administrateur directement dans MongoDB (récupération si plus aucun code de secours).
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
(async () => {
  const [user, pass] = process.argv.slice(2);
  if (!user || !pass || pass.length < 8 || !process.env.MONGODB_URI) { console.error('Usage : node --env-file=.env.local scripts/reset-password.js "Identifiant" "MotDePasse(8+)"  (MONGODB_URI requise)'); process.exit(1); }
  const u = user.trim().toLowerCase().replace(/\s+/g, " "), salt = crypto.randomBytes(16), ver = Date.now();
  const hash = crypto.pbkdf2Sync(u + "\n" + pass, salt, 210000, 32, "sha256").toString("base64");
  const cli = await new MongoClient(process.env.MONGODB_URI).connect();
  await cli.db(process.env.MONGODB_DB || "garage_alpha").collection("meta").updateOne({ _id: "auth" }, { $set: { u, salt: salt.toString("base64"), hash, ver, updated: ver, codes: [] } }, { upsert: true });
  await cli.close(); console.log("Accès réinitialisé pour « " + u + " ». Toutes les sessions ouvertes sont fermées.");
})().catch((e) => { console.error(e.message); process.exit(1); });
