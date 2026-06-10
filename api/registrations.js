const crypto = require("crypto");
const { isAdmin, readBody, readStoreJson, validateRegistration, writeStoreJson } = require("./_lib/common");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    if (!isAdmin(req)) return res.status(401).json({ ok: false, message: "Admin login required." });
    return res.status(200).json(await readStoreJson("registrations", []));
  }

  if (req.method === "POST") {
    const validation = validateRegistration(await readBody(req));
    if (!validation.valid) return res.status(400).json({ ok: false, message: validation.message });

    const registrations = await readStoreJson("registrations", []);
    const registration = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...validation.fields
    };
    registrations.unshift(registration);
    const saved = await writeStoreJson("registrations", registrations);

    return res.status(201).json({
      ok: true,
      persisted: saved,
      registration,
      message: saved ? "Registration saved." : "Registration received. Add Vercel KV to persist submissions."
    });
  }

  return res.status(405).json({ ok: false, message: "Method not allowed." });
};
