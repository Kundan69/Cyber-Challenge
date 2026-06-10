module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed." });
  res.setHeader("Set-Cookie", "admin_session=; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=0");
  return res.status(200).json({ ok: true });
};
