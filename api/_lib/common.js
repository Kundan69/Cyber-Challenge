const crypto = require("crypto");
const initialSite = require("../../data/site.json");

const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const sessionSecret = process.env.SESSION_SECRET || adminPassword;

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

function isAdmin(req) {
  const token = parseCookies(req.headers.cookie || "").admin_session;
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

function cleanText(value) {
  return String(value || "").trim();
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

async function getKv() {
  return null;
}

async function readStoreJson(key, fallback) {
  const kv = await getKv();
  if (!kv) return fallback;
  const value = await kv.get(key);
  return value ?? fallback;
}

async function writeStoreJson(key, value) {
  const kv = await getKv();
  if (!kv) return false;
  await kv.set(key, value);
  return true;
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

module.exports = {
  adminUser,
  adminPassword,
  cleanText,
  createSession,
  initialSite,
  isAdmin,
  readBody,
  readStoreJson,
  validateRegistration,
  writeStoreJson
};
