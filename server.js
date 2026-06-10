const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const publicDir = path.join(root, "public");
const dataDir = path.join(root, "data");
const sitePath = path.join(dataDir, "site.json");
const registrationPath = path.join(dataDir, "registrations.json");
const port = Number(process.env.PORT || 4199);
const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const sessions = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
  );
}

function isAdmin(req) {
  const token = parseCookies(req).admin_session;
  return Boolean(token && sessions.has(token));
}

function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  sendJson(res, 401, { ok: false, message: "Admin login required." });
  return false;
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function parseJsonBody(req) {
  const body = await collectBody(req);
  if (!body) return {};
  return JSON.parse(body);
}

function cleanText(value) {
  return String(value || "").trim();
}

function validateRegistration(input) {
  const fields = {
    fullName: cleanText(input.fullName),
    email: cleanText(input.email),
    phone: cleanText(input.phone),
    institution: cleanText(input.institution),
    role: cleanText(input.role),
    challenge: cleanText(input.challenge),
    teamName: cleanText(input.teamName),
    experience: cleanText(input.experience)
  };

  const missing = Object.entries(fields)
    .filter(([key, value]) => key !== "experience" && !value)
    .map(([key]) => key);

  if (missing.length) {
    return { valid: false, message: `Missing fields: ${missing.join(", ")}` };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return { valid: false, message: "Please enter a valid email address." };
  }

  return { valid: true, fields };
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/session" && req.method === "GET") {
    return sendJson(res, 200, { authenticated: isAdmin(req) });
  }

  if (pathname === "/api/login" && req.method === "POST") {
    const payload = await parseJsonBody(req);
    const userOk = cleanText(payload.username || adminUser) === adminUser;
    const passwordOk = cleanText(payload.password) === adminPassword;
    if (!userOk || !passwordOk) {
      return sendJson(res, 401, { ok: false, message: "Invalid admin credentials." });
    }

    const token = crypto.randomUUID();
    sessions.add(token);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    const token = parseCookies(req).admin_session;
    if (token) sessions.delete(token);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": "admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (pathname === "/api/site" && req.method === "GET") {
    return sendJson(res, 200, await readJson(sitePath, {}));
  }

  if (pathname === "/api/site" && req.method === "PUT") {
    if (!requireAdmin(req, res)) return;
    const payload = await parseJsonBody(req);
    await writeJson(sitePath, payload);
    return sendJson(res, 200, { ok: true, site: payload });
  }

  if (pathname === "/api/registrations" && req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await readJson(registrationPath, []));
  }

  if (pathname === "/api/registrations" && req.method === "POST") {
    const validation = validateRegistration(await parseJsonBody(req));
    if (!validation.valid) return sendJson(res, 400, { ok: false, message: validation.message });

    const registrations = await readJson(registrationPath, []);
    const entry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...validation.fields
    };
    registrations.unshift(entry);
    await writeJson(registrationPath, registrations);
    return sendJson(res, 201, { ok: true, registration: entry });
  }

  return sendJson(res, 404, { ok: false, message: "API route not found." });
}

async function serveStatic(req, res, pathname) {
  if (pathname === "/admin.html" && !isAdmin(req)) {
    return redirect(res, "/login.html");
  }

  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const file = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
    } else {
      await serveStatic(req, res, url.pathname);
    }
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, message: "Server error." });
  }
});

server.listen(port, () => {
  console.log(`Cyber Challenge India running at http://localhost:${port}`);
});
