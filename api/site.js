const { initialSite, isAdmin, readBody, readStoreJson, writeStoreJson } = require("./_lib/common");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(await readStoreJson("site", initialSite));
  }

  if (req.method === "PUT") {
    if (!isAdmin(req)) return res.status(401).json({ ok: false, message: "Admin login required." });
    const saved = await writeStoreJson("site", await readBody(req));
    if (!saved) {
      return res.status(503).json({
        ok: false,
        message: "CMS saving needs Vercel KV. Public content is still served from data/site.json."
      });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, message: "Method not allowed." });
};
