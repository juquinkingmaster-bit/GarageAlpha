const { guard, cookie, wrap } = require("./_lib");
module.exports = wrap(async (req, res) => {
  if (!(await guard(req, res, { auth: false }))) return;
  res.setHeader("Set-Cookie", cookie("", 0));
  res.json({ ok: true });
});
