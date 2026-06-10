const { isAdmin } = require("./_lib/common");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed." });
  return res.status(200).json({ authenticated: isAdmin(req) });
};
