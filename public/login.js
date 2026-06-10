document.querySelector("[data-login-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-login-status]");
  status.textContent = "Checking admin access...";

  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
  });

  if (!response.ok) {
    status.textContent = "Wrong password.";
    return;
  }

  window.location.href = "/admin.html";
});
