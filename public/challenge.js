function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function renderChallenge(challenge) {
  const detail = document.querySelector("[data-challenge-detail]");
  const overview = challenge.overview || `${challenge.summary} This challenge brings teams together to solve practical cyber defence problems through research, analysis and secure engineering.`;
  const tracks = challenge.tracks || ["Threat analysis", "Secure design", "Prototype submission"];
  const deliverables = challenge.deliverables || ["Problem solution", "Working prototype", "Final presentation"];
  const highlights = challenge.highlights || [];
  const sections = challenge.contentSections || [];

  detail.innerHTML = `
    <section class="challenge-hero-detail reveal-on-scroll theme-${challenge.theme || slugify(challenge.title)}">
      <div class="challenge-hero-layout">
        <div>
          <p class="section-kicker">${challenge.status} Challenge</p>
          <h1 class="glitch-title" data-text="${challenge.title}">${challenge.title}</h1>
          <p>${overview}</p>
          <div class="hero-actions">
            <a class="primary-button large" href="/#register">Register Now</a>
            <a class="secondary-button large" href="/">Back to Home</a>
          </div>
        </div>
        ${challenge.logo ? `<div class="challenge-hero-logo"><img src="${challenge.logo}" alt="${challenge.title} logo"></div>` : ""}
      </div>
    </section>

    <section class="challenge-overview-strip reveal-on-scroll">
      <div><span>Status</span><strong>${challenge.status}</strong></div>
      <div><span>Deadline</span><strong>${formatDate(challenge.date)}</strong></div>
      <div><span>Location</span><strong>${challenge.location || "TBD"}</strong></div>
      <div><span>Category</span><strong>${challenge.category}</strong></div>
    </section>

    <section class="challenge-info-grid reveal-on-scroll">
      <article class="panel">
        <p class="section-kicker">Overview</p>
        <h2>${challenge.category}</h2>
        <p>${challenge.summary}</p>
      </article>
      <article class="panel">
        <p class="section-kicker">Schedule</p>
        <h2>${formatDate(challenge.date)}</h2>
        <p>${challenge.location || "Location to be announced"}</p>
      </article>
      <article class="panel">
        <p class="section-kicker">Tracks</p>
        <ul class="detail-list">${tracks.map((track) => `<li>${track}</li>`).join("")}</ul>
      </article>
      <article class="panel">
        <p class="section-kicker">Deliverables</p>
        <ul class="detail-list">${deliverables.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
      <article class="panel wide-panel">
        <p class="section-kicker">Key Highlights</p>
        <ul class="detail-list">${highlights.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
    </section>

    <section class="challenge-content reveal-on-scroll">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Complete Challenge Brief</p>
          <h2>Program Details</h2>
        </div>
      </div>
      ${sections.map((section) => `
        <article class="brief-card">
          <h3>${section.title}</h3>
          ${(section.paragraphs || []).map((paragraph) => `<p>${paragraph}</p>`).join("")}
          ${(section.items || []).length ? `<ul class="detail-list">${section.items.map((item) => `<li>${item}</li>`).join("")}</ul>` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function initScrollReveal() {
  document.body.classList.add("effects-ready");
  const nodes = document.querySelectorAll(".reveal-on-scroll, .panel, .brief-card");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
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

async function loadChallenge() {
  const slug = new URLSearchParams(window.location.search).get("id");
  let response = await fetch("/api/site");
  if (!response.ok) response = await fetch("/site-data.json");
  const site = await response.json();
  const challenge = site.challenges.find((item) => slugify(item.title) === slug);

  if (!challenge) {
    document.querySelector("[data-challenge-detail]").innerHTML = `
      <section class="challenge-hero-detail">
        <p class="section-kicker">Not Found</p>
        <h1>Challenge unavailable</h1>
        <p>This challenge could not be found. Please return to active challenges.</p>
        <a class="primary-button large" href="/#challenges">View Challenges</a>
      </section>
    `;
    return;
  }

  document.title = `${challenge.title} | Cyber Challenge India`;
  renderChallenge(challenge);
  initScrollReveal();
}

loadChallenge();
initPointerGlow();

document.querySelector("[data-nav-toggle]").addEventListener("click", () => {
  document.body.classList.toggle("nav-open");
});
document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => document.body.classList.remove("nav-open"));
});
