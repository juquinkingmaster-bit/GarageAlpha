// Usage : node --env-file=.env.local scripts/test-connexion.js
// Vérifie que MONGODB_URI fonctionne et affiche ce que contient la base (aucun secret affiché).
const { MongoClient } = require("mongodb");
(async () => {
  if (!process.env.MONGODB_URI) { console.error("MONGODB_URI manquante (vercel env pull .env.local)."); process.exit(1); }
  const cli = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    await cli.connect();
    const d = cli.db(process.env.MONGODB_DB || "garage_alpha");
    await d.command({ ping: 1 });
    console.log("Connexion MongoDB : OK (base « " + d.databaseName + " »)");
    for (const c of ["clients", "vehicles", "files", "invoices", "parts", "moves"]) console.log(" - " + c + " : " + (await d.collection(c).estimatedDocumentCount()));
  } catch (e) {
    console.error("Connexion impossible : " + e.message);
    console.error("Vérifiez : mot de passe de l'utilisateur Atlas (caractères spéciaux à encoder), Network Access 0.0.0.0/0, nom du cluster.");
    process.exit(1);
  } finally { await cli.close(); }
})();
