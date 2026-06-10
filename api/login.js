const { adminPassword, adminUser, cleanText, createSession, readBody } = require("./_lib/common");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed." });

  const payload = await readBody(req);
  const userOk = cleanText(payload.username || adminUser) === adminUser;
  const passwordOk = cleanText(payload.password) === adminPassword;
  if (!userOk || !passwordOk) return res.status(401).json({ ok: false, message: "Invalid admin credentials." });

  res.setHeader("Set-Cookie", `admin_session=${createSession()}; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=86400`);
  return res.status(200).json({ ok: true });
};
