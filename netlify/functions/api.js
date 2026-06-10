const crypto = require("crypto");
const initialSite = require("../../data/site.json");
const { getStore } = require("@netlify/blobs");

const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const sessionSecret = process.env.SESSION_SECRET || adminPassword;

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function parseCookies(header = "") {
  return Object.fromEntries(
    String(header)
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
  );
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function createSession() {
  const payload = JSON.stringify({ user: adminUser, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function isAdmin(event) {
  const token = parseCookies(event.headers.cookie || event.headers.Cookie).admin_session;
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || signature !== sign(encoded)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.user === adminUser && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function parseBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.body);
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

  if (missing.length) return { valid: false, message: `Missing fields: ${missing.join(", ")}` };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return { valid: false, message: "Please enter a valid email address." };
  }

  return { valid: true, fields };
}

async function readStoreJson(key, fallback) {
  const store = getStore("cyber-challenge-cms");
  const value = await store.get(key, { type: "json" });
  return value ?? fallback;
}

async function writeStoreJson(key, value) {
  const store = getStore("cyber-challenge-cms");
  await store.setJSON(key, value);
}

exports.handler = async (event) => {
  let route = event.path
    .replace(/^\/\.netlify\/functions\/api\/?/, "/")
    .replace(/^\/api\/?/, "/");
  if (route === "") route = "/";
  const method = event.httpMethod;

  try {
    if (route === "/session" && method === "GET") {
      return json(200, { authenticated: isAdmin(event) });
    }

    if (route === "/login" && method === "POST") {
      const payload = parseBody(event);
      const userOk = cleanText(payload.username || adminUser) === adminUser;
      const passwordOk = cleanText(payload.password) === adminPassword;
      if (!userOk || !passwordOk) return json(401, { ok: false, message: "Invalid admin credentials." });

      return json(200, { ok: true }, {
        "Set-Cookie": `admin_session=${createSession()}; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=86400`
      });
    }

    if (route === "/logout" && method === "POST") {
      return json(200, { ok: true }, {
        "Set-Cookie": "admin_session=; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=0"
      });
    }

    if (route === "/site" && method === "GET") {
      return json(200, await readStoreJson("site", initialSite));
    }

    if (route === "/site" && method === "PUT") {
      if (!isAdmin(event)) return json(401, { ok: false, message: "Admin login required." });
      const payload = parseBody(event);
      await writeStoreJson("site", payload);
      return json(200, { ok: true, site: payload });
    }

    if (route === "/registrations" && method === "GET") {
      if (!isAdmin(event)) return json(401, { ok: false, message: "Admin login required." });
      return json(200, await readStoreJson("registrations", []));
    }

    if (route === "/registrations" && method === "POST") {
      const validation = validateRegistration(parseBody(event));
      if (!validation.valid) return json(400, { ok: false, message: validation.message });

      const registrations = await readStoreJson("registrations", []);
      const registration = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...validation.fields
      };
      registrations.unshift(registration);
      await writeStoreJson("registrations", registrations);
      return json(201, { ok: true, registration });
    }

    return json(404, { ok: false, message: "API route not found." });
  } catch (error) {
    console.error(error);
    return json(500, { ok: false, message: "Server error." });
  }
};
