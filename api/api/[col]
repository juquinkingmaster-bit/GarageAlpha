const { db, guard, wrap, clean, strip, bump, nextNo } = require("./_lib");
const COLS = ["clients", "vehicles", "files", "invoices", "parts", "moves"];

// CRUD : GET /api/<col>[?id=] · POST /api/<col> · PUT /api/<col>?id= · DELETE /api/<col>?id=
module.exports = wrap(async (req, res) => {
  const c = req.query.col;
  if (!COLS.includes(c)) return res.status(404).json({ error: "Ressource inconnue" });
  if (!(await guard(req, res))) return;
  const C = (await db()).collection(c);
  const id = req.query.id !== undefined ? Number(String(req.query.id)) : undefined;

  if (req.method === "GET") {
    if (id === undefined) return res.json((await C.find().toArray()).map(strip));
    const d = await C.findOne({ _id: id });
    return d ? res.json(strip(d)) : res.status(404).json({ error: "Introuvable" });
  }
  if (req.method === "POST") {
    const doc = clean(req.body);
    if (!doc) return res.status(400).json({ error: "Données invalides" });
    if (await C.findOne({ _id: doc.id })) return res.status(409).json({ error: "Identifiant déjà utilisé" });
    for (let i = 0; i < 4; i++) {           // le serveur garantit un numéro de dossier unique
      try {
        const num = c === "files" || c === "invoices";
        if (num && (i > 0 || !doc.no)) doc.no = await nextNo(C, doc.entry || doc.date, c === "invoices" ? (doc.kind === "PROFORMA" ? "PF" : "FA") : "GA");
        await C.insertOne({ ...doc, _id: doc.id });
        break;
      } catch (e) { if (!((c === "files" || c === "invoices") && e.code === 11000 && /no_1/.test(e.message) && i < 3)) throw e; }
    }
    return res.status(201).json({ ...doc, rev: await bump() });
  }
  if (!Number.isFinite(id)) return res.status(400).json({ error: "id manquant" });
  if (req.method === "PUT") {
    const doc = clean(req.body);
    if (!doc || doc.id !== id) return res.status(400).json({ error: "Données invalides" });
    const r = await C.replaceOne({ _id: id }, { ...doc, _id: id });
    return r.matchedCount ? res.json({ ...doc, rev: await bump() }) : res.status(404).json({ error: "Introuvable" });
  }
  if (req.method === "DELETE") {
    const r = await C.deleteOne({ _id: id });
    return r.deletedCount ? res.json({ ok: true, rev: await bump() }) : res.status(404).json({ error: "Introuvable" });
  }
  res.status(405).end();
});
