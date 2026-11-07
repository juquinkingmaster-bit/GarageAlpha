const { guard, wrap } = require("./_lib");
module.exports = wrap(async (req, res) => { if (await guard(req, res)) res.json({ admin: true }); });
