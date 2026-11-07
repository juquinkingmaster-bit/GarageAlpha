const { db, guard, wrap } = require("./_lib");
// Drapeaux d'import (ex. "cahier1") pour ne pas réimporter deux fois les mêmes données.
module.exports = wrap(async (req, res) => {
  if (req.method !== "PUT" || !(await guard(req, res))) return res.status(405).end();
  const imp = Array.isArray((req.body || {}).imp) ? req.body.imp.filter((x) => typeof x === "string").slice(0, 50) : [];
  await (await db()).collection("meta").updateOne({ _id: "app" }, { $set: { imp }, $inc: { rev: 1 } }, { upsert: true });
  res.json({ ok: true });
});
