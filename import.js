const { db, guard, wrap, clean, bump } = require("./_lib");
// Import en masse (création ou remplacement par id) : { clients:[], vehicles:[], files:[] }, 4 Mo max par requête.
module.exports = wrap(async (req, res) => {
  if (req.method !== "POST" || !(await guard(req, res))) return res.status(405).end();
  const d = await db(), out = {};
  for (const c of ["clients", "vehicles", "files", "invoices", "parts", "moves"]) {
    const docs = (Array.isArray((req.body || {})[c]) ? req.body[c] : []).map(clean).filter(Boolean);
    if (!docs.length) continue;
    const r = await d.collection(c).bulkWrite(docs.map((x) => ({ replaceOne: { filter: { _id: x.id }, replacement: { ...x, _id: x.id }, upsert: true } })), { ordered: false });
    out[c] = r.upsertedCount + r.matchedCount;
  }
  res.json({ ok: true, imported: out, rev: await bump() });
});
