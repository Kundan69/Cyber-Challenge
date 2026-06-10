const iconSet = ["TCQ", "CCTNS", "DP", "CCTV", "eDC"];

function text(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function renderSite(site) {
  text("[data-brand-name]", site.brand.name);
  text("[data-brand-tagline]", site.brand.tagline);
  text("[data-brand-badge]", site.brand.badge);
  text("[data-brand-headline]", site.brand.headline);
  text("[data-brand-summary]", site.brand.summary);

  document.querySelector("[data-stats]").innerHTML = site.stats.map((stat, index) => `
    <div class="stat">
      <span class="stat-icon">${["+", "#", "^"][index] || "*"}</span>
      <span><strong>${stat.value}</strong><span>${stat.label}</span></span>
    </div>
  `).join("");

  document.querySelector("[data-challenges]").innerHTML = site.challenges.map((challenge, index) => `
    <a class="challenge-card theme-${challenge.theme || slugify(challenge.title)}" href="/challenge.html?id=${slugify(challenge.title)}">
      <span class="challenge-status">${challenge.status}</span>
      <span class="challenge-icon">
        ${challenge.logo ? `<img src="${challenge.logo}" alt="${challenge.title} logo">` : iconSet[index % iconSet.length]}
      </span>
      <h3>${challenge.title}</h3>
      <p>${challenge.summary}</p>
      <span class="challenge-meta">${challenge.category} - ${formatDate(challenge.date)}</span>
      <span class="challenge-location">${challenge.location || ""}</span>
      <span class="challenge-link">Open brief</span>
    </a>
  `).join("");

  document.querySelector("[data-objectives]").innerHTML = site.objectives.map((objective, index) => `
    <div class="objective">
      <span class="objective-icon">${["IN", "OK", "SK", "CO"][index] || "GO"}</span>
      <strong>${objective.title}</strong>
      <p>${objective.text}</p>
    </div>
  `).join("");

  const fame = [...site.hallOfFame].sort((a, b) => a.rank - b.rank);
  document.querySelector("[data-fame]").innerHTML = fame.map((winner) => `
    <div class="winner">
      <span class="winner-badge">${winner.rank}</span>
      <strong>${winner.team}</strong>
      <span>${winner.year}</span>
    </div>
  `).join("");

  document.querySelector("[data-updates]").innerHTML = site.updates.map((update) => `
    <article class="update">
      <span class="update-date">${update.date}</span>
      <div>
        <h3>${update.title}</h3>
        <p>${update.summary}</p>
      </div>
    </article>
  `).join("");

  document.querySelector("[data-events]").innerHTML = site.events.map((event) => `
    <article class="event-card">
      <h3>${event.title}</h3>
      <p>${formatDate(event.date)} - ${event.location}</p>
    </article>
  `).join("");

  document.querySelector("[data-partners]").innerHTML = site.partners.map((partner) => `
    <span class="partner-chip">${partner}</span>
  `).join("") + site.partners.map((partner) => `
    <span class="partner-chip">${partner}</span>
  `).join("");

  document.querySelector("[data-challenge-select]").innerHTML = `
    <option value="">Select challenge</option>
    ${site.challenges.map((challenge) => `<option>${challenge.title}</option>`).join("")}
  `;
}

async function loadSite() {
  const response = await fetch("/api/site");
  const site = await response.json();
  renderSite(site);
}

async function submitRegistration(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-form-status]");
  const payload = Object.fromEntries(new FormData(form).entries());

  status.textContent = "Submitting registration...";
  const response = await fetch("/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();

  if (!response.ok) {
    status.textContent = result.message || "Registration failed.";
    return;
  }

  form.reset();
  status.textContent = `Registration received for ${result.registration.teamName}.`;
}

document.querySelector("[data-registration-form]").addEventListener("submit", submitRegistration);
document.querySelector("[data-nav-toggle]").addEventListener("click", () => {
  document.body.classList.toggle("nav-open");
});
document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => document.body.classList.remove("nav-open"));
});
loadSite().catch(() => {
  document.querySelector("[data-form-status]").textContent = "Unable to load site data.";
});
