import { login } from "../js/auth.js";

const form = document.getElementById("loginForm");
const errEl = document.getElementById("err");
const submitBtn = document.getElementById("submitBtn");

const params = new URLSearchParams(window.location.search);
if (params.get("err") === "not-admin") {
  errEl.textContent = "That account doesn't have admin access on this app.";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await login(email, password);
    window.location.href = "/admin/dashboard.html";
  } catch (error) {
    errEl.textContent = "Couldn't sign in. Check the email and password and try again.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});
