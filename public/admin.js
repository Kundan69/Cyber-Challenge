const editor = document.querySelector("[data-cms-editor]");
const cmsStatus = document.querySelector("[data-cms-status]");
const rows = document.querySelector("[data-registration-rows]");

async function ensureAdmin() {
  const response = await fetch("/api/session");
  const session = await response.json();
  if (!session.authenticated) window.location.href = "/login.html";
}

async function loadCms() {
  const response = await fetch("/api/site");
  const site = await response.json();
  editor.value = JSON.stringify(site, null, 2);
}

async function saveCms() {
  try {
    const site = JSON.parse(editor.value);
    cmsStatus.textContent = "Saving content...";
    const response = await fetch("/api/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site)
    });
    if (response.status === 401) window.location.href = "/login.html";
    if (!response.ok) throw new Error("Save failed");
    cmsStatus.textContent = "CMS content saved.";
  } catch (error) {
    cmsStatus.textContent = "Please fix the JSON before saving.";
  }
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function loadRegistrations() {
  const response = await fetch("/api/registrations");
  if (response.status === 401) {
    window.location.href = "/login.html";
    return;
  }
  const registrations = await response.json();
  rows.innerHTML = registrations.length ? registrations.map((entry) => `
    <tr>
      <td>${formatDate(entry.createdAt)}</td>
      <td>${entry.fullName}</td>
      <td>${entry.email}</td>
      <td>${entry.teamName}</td>
      <td>${entry.challenge}</td>
      <td>${entry.institution}</td>
    </tr>
  `).join("") : `
    <tr>
      <td colspan="6">No registrations yet.</td>
    </tr>
  `;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login.html";
}

document.querySelector("[data-save-site]").addEventListener("click", saveCms);
document.querySelector("[data-refresh-registrations]").addEventListener("click", loadRegistrations);
document.querySelector("[data-logout]").addEventListener("click", logout);

ensureAdmin().then(() => {
  loadCms();
  loadRegistrations();
});
