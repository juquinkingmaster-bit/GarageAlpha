// Usage : node --env-file=.env.local scripts/import-json.js sauvegarde.json
// Importe dans MongoDB une sauvegarde (bouton « Sauvegarder » du site, ou contenu de localStorage "garage_alpha_v2").
const fs = require("fs");
const { MongoClient } = require("mongodb");
(async () => {
  const f = process.argv[2];
  if (!f || !process.env.MONGODB_URI) { console.error("Usage : node --env-file=.env.local scripts/import-json.js fichier.json  (MONGODB_URI requise)"); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(f, "utf8"));
  const cli = await new MongoClient(process.env.MONGODB_URI).connect();
  const d = cli.db(process.env.MONGODB_DB || "garage_alpha");
  await d.collection("files").createIndex({ no: 1 }, { unique: true, sparse: true });
  await d.collection("invoices").createIndex({ no: 1 }, { unique: true, sparse: true });
  for (const c of ["clients", "vehicles", "files", "invoices", "parts", "moves"]) {
    const docs = (data[c] || []).filter((x) => x && Number.isFinite(Number(x.id)));
    if (!docs.length) { console.log(c + " : 0"); continue; }
    await d.collection(c).bulkWrite(docs.map((x) => ({ replaceOne: { filter: { _id: Number(x.id) }, replacement: { ...x, id: Number(x.id), _id: Number(x.id) }, upsert: true } })), { ordered: false });
    console.log(c + " : " + docs.length + " importés");
  }
  await d.collection("meta").updateOne({ _id: "app" }, { $set: { imp: Array.isArray(data.imp) ? data.imp : [] }, $inc: { rev: 1 } }, { upsert: true });
  await cli.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
