import { login, resetPassword } from "../js/auth.js";

const form = document.getElementById("loginForm");
const errEl = document.getElementById("err");
const submitBtn = document.getElementById("submitBtn");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const passwordField = document.getElementById("passwordField");

const params = new URLSearchParams(window.location.search);
if (params.get("err") === "not-admin") {
  errEl.textContent = "That account doesn't have admin access on this app.";
}

let isResetMode = false;

forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  isResetMode = !isResetMode;
  errEl.textContent = "";

  if (isResetMode) {
    passwordField.style.display = "none";
    submitBtn.textContent = "Send Password Reset Link";
    forgotPasswordLink.textContent = "Back to Sign In";
  } else {
    passwordField.style.display = "block";
    submitBtn.textContent = "Authenticate & Sign In";
    forgotPasswordLink.textContent = "Forgot password?";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.textContent = "";
  errEl.style.color = "var(--danger-accent)";

  const email = document.getElementById("email").value.trim();
  if (!email) {
    errEl.textContent = "Please enter your admin email address.";
    return;
  }

  if (isResetMode) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending reset link…";
    try {
      await resetPassword(email);
      errEl.style.color = "var(--success-accent)";
      errEl.textContent = "Password reset instructions sent to your email!";
      submitBtn.textContent = "Reset Link Sent";
    } catch (err) {
      console.error(err);
      errEl.textContent = "Could not send reset email. Ensure the account exists.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Password Reset Link";
    }
    return;
  }

  const password = document.getElementById("password").value;
  if (!password) {
    errEl.textContent = "Please enter your password.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Authenticating…";

  try {
    await login(email, password);
    window.location.href = "/admin/dashboard.html";
  } catch (error) {
    console.error("Login error:", error);
    errEl.textContent = "Couldn't sign in. Check the email and password and try again.";
    submitBtn.disabled = false;
    submitBtn.textContent = "Authenticate & Sign In";
  }
});
