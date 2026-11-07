const { db, guard, wrap, strip } = require("./_lib");
const COLS = ["clients", "vehicles", "files", "invoices", "parts", "moves"];
// Lecture des données. ?check=1 : renvoie seulement l'empreinte. ?since=<tag> : {same:true} si rien n'a changé.
// L'empreinte (compteur d'écritures + nombre de documents) détecte aussi les ajouts faits directement dans MongoDB.
module.exports = wrap(async (req, res) => {
  if (req.method !== "GET" || !(await guard(req, res))) return;
  const d = await db();
  const [m, ...n] = await Promise.all([d.collection("meta").findOne({ _id: "app" }), ...COLS.map((c) => d.collection(c).estimatedDocumentCount())]);
  const rev = (m && m.rev) || 0, tag = [rev, ...n].join("."), any = rev > 0 || n.some((x) => x > 0);
  if (req.query.check !== undefined) return res.json({ rev, tag });
  if (req.query.since !== undefined && any && String(req.query.since) === tag) return res.json({ same: true, rev, tag });
  const [clients, vehicles, files, invoices, parts, moves] = await Promise.all(COLS.map((c) => d.collection(c).find().toArray()));
  res.json({ rev, tag, imp: (m && m.imp) || [], empty: !any,
    clients: clients.map(strip), vehicles: vehicles.map(strip), files: files.map(strip), invoices: invoices.map(strip), parts: parts.map(strip), moves: moves.map(strip) });
});
