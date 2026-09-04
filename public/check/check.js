import { getEmployee } from "../js/employees.js";

const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const photoEl = document.getElementById("photo");
const detailsEl = document.getElementById("details");
const errorState = document.getElementById("errorState");
const errorMessage = document.getElementById("errorMessage");

// URL is /check/<id> or ?id=<id> fallback
const urlParams = new URLSearchParams(window.location.search);
let id = urlParams.get("id");

if (!id) {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1];
  if (lastSegment && lastSegment !== "check" && lastSegment !== "index.html") {
    id = lastSegment;
  }
}

async function run() {
  if (!id) {
    setMissing("No credential reference identified in this scan.");
    return;
  }

  let emp;
  try {
    emp = await getEmployee(id);
  } catch (e) {
    console.error("Verification query error:", e);
    setMissing("Unable to connect to security directory. Please check internet connection.");
    return;
  }

  if (!emp) {
    setMissing("This QR reference does not match any issued Richardson Oil & Gas card.");
    return;
  }

  const isRevoked = emp.status === "revoked";
  if (isRevoked) {
    statusBar.className = "check-status-badge revoked";
    statusText.textContent = "CREDENTIAL REVOKED · ACCESS DENIED";
  } else {
    statusBar.className = "check-status-badge valid";
    statusText.textContent = "OFFICIAL CREDENTIAL VERIFIED · ACTIVE";
  }

  document.getElementById("name").textContent = `${emp.firstName} ${emp.lastName}`;
  document.getElementById("title").textContent = emp.jobTitle || "Personnel";
  document.getElementById("department").textContent = emp.department || "General Operations";
  document.getElementById("employeeNumber").textContent = emp.employeeNumber || `ROG-ID-${id.slice(0, 8).toUpperCase()}`;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.getElementById("verifyTime").textContent = `${dateStr} at ${timeStr} UTC`;

  if (emp.photoUrl) {
    photoEl.src = emp.photoUrl;
    photoEl.alt = `Photo of ${emp.firstName} ${emp.lastName}`;
  } else {
    photoEl.src = "/assets/logo.svg";
    photoEl.style.padding = "20px";
    photoEl.style.background = "#0b1222";
  }

  detailsEl.hidden = false;
  errorState.style.display = "none";
}

function setMissing(message) {
  statusBar.className = "check-status-badge missing";
  statusText.textContent = "INVALID / UNRECOGNIZED BADGE";
  detailsEl.hidden = true;
  errorState.style.display = "block";
  errorMessage.textContent = message;
}

run();
