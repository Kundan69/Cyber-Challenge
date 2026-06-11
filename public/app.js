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
      <span class="challenge-art" aria-hidden="true"></span>
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

function initScrollReveal() {
  document.body.classList.add("effects-ready");
  const nodes = document.querySelectorAll(".reveal-on-scroll, .challenge-card, .panel, .event-card, .contact-card, .objective, .winner, .update, .stat, .hero-command-board div");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });
  nodes.forEach((node) => observer.observe(node));
  window.setTimeout(() => {
    nodes.forEach((node) => node.classList.add("is-visible"));
  }, 900);
}

function initPointerGlow() {
  window.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
  }, { passive: true });
}

function syncMotionToggle() {
  const enabled = localStorage.getItem("cci-motion") !== "off";
  document.body.classList.toggle("motion-paused", !enabled);
  document.querySelectorAll("[data-motion-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(enabled));
    button.classList.toggle("is-off", !enabled);
  });
}

function initMotionToggle() {
  syncMotionToggle();
  document.querySelectorAll("[data-motion-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const enabled = button.getAttribute("aria-pressed") !== "true";
      localStorage.setItem("cci-motion", enabled ? "on" : "off");
      syncMotionToggle();
    });
  });
}

function initPremiumMotion() {
  document.body.classList.add("motion-ready");

  let progress = document.querySelector(".scroll-progress");
  if (!progress) {
    progress = document.createElement("div");
    progress.className = "scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);
  }

  document.querySelectorAll('a[href^="#"]:not([href="#register"]):not([data-smooth-bound])').forEach((link) => {
    link.dataset.smoothBound = "true";
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 86;
      window.scrollTo({ top, behavior: "smooth" });
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });

  const parallaxNodes = document.querySelectorAll(".hero-visual, .threat-window, .hero-command-board, .mission-panel, .fame-panel, .updates-panel");
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    progress.style.transform = `scaleX(${ratio})`;
    document.documentElement.style.setProperty("--page-scroll", `${window.scrollY}px`);
    parallaxNodes.forEach((node, index) => {
      const rect = node.getBoundingClientRect();
      const offset = (window.innerHeight / 2 - rect.top - rect.height / 2) * 0.025 * ((index % 3) + 1);
      node.style.setProperty("--float-y", `${Math.max(-24, Math.min(24, offset))}px`);
    });
  };

  if (!document.body.dataset.scrollMotionBound) {
    document.body.dataset.scrollMotionBound = "true";
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateScroll();
        ticking = false;
      });
    }, { passive: true });
  }
  updateScroll();

  document.querySelectorAll(".challenge-card:not([data-tilt-bound]), .panel:not([data-tilt-bound]), .event-card:not([data-tilt-bound]), .contact-card:not([data-tilt-bound])").forEach((card) => {
    card.dataset.tiltBound = "true";
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty("--shine-x", `${x * 100}%`);
      card.style.setProperty("--shine-y", `${y * 100}%`);
      card.style.setProperty("--tilt-x", `${(0.5 - y) * 7}deg`);
      card.style.setProperty("--tilt-y", `${(x - 0.5) * 7}deg`);
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}

async function loadSite() {
  let response = await fetch("/api/site");
  if (!response.ok) response = await fetch("/site-data.json");
  const site = await response.json();
  renderSite(site);
  initScrollReveal();
  initPremiumMotion();
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

function openRegistration(event) {
  if (event) event.preventDefault();
  const modal = document.querySelector("[data-registration-modal]");
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const firstInput = modal.querySelector("input, select, textarea, button");
  if (firstInput) firstInput.focus();
}

function closeRegistration() {
  const modal = document.querySelector("[data-registration-modal]");
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  if (window.location.hash === "#register") {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

document.querySelector("[data-registration-form]").addEventListener("submit", submitRegistration);
document.querySelectorAll('a[href="#register"]').forEach((link) => {
  link.addEventListener("click", openRegistration);
});
document.querySelector("[data-close-registration]").addEventListener("click", closeRegistration);
document.querySelector("[data-registration-modal]").addEventListener("click", (event) => {
  if (event.target.matches("[data-registration-modal]")) closeRegistration();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.querySelector("[data-registration-modal]").hidden) closeRegistration();
});
document.querySelector("[data-nav-toggle]").addEventListener("click", () => {
  document.body.classList.toggle("nav-open");
});
document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => document.body.classList.remove("nav-open"));
});
initPointerGlow();
initMotionToggle();
loadSite().catch(() => {
  document.querySelector("[data-form-status]").textContent = "Unable to load site data.";
});
initPremiumMotion();

if (window.location.hash === "#register") {
  openRegistration();
}
