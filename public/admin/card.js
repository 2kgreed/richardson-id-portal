import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { auth } from "../js/firebase-init.js";
import { getEmployee, checkUrlFor } from "../js/employees.js";

const ROSTER_CACHE_KEY = "rog_roster_cache_v2";

// 1. Unconditionally wire the print button immediately
const printBtn = document.getElementById("printBtn");
if (printBtn) {
  printBtn.addEventListener("click", () => {
    window.print();
  });
}

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const toast = document.getElementById("toast");
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 2500);
}

let currentEmp = null;

function renderBadge(emp) {
  if (!emp) return;
  currentEmp = emp;

  const firstName = (emp.firstName || "").trim();
  const lastName = (emp.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim() || "Personnel";

  // PDF print file naming: set document.title to first name
  if (firstName) {
    document.title = firstName;
  }

  window.addEventListener("beforeprint", () => {
    if (firstName) document.title = firstName;
  });

  const headingEl = document.getElementById("empName");
  if (headingEl) {
    headingEl.textContent = `${fullName} · Official Badge`;
  }

  const cardNameEl = document.getElementById("cardName");
  if (cardNameEl) {
    cardNameEl.textContent = fullName;
  }

  const cardNumberText = document.getElementById("cardNumberText");
  const numDisplay = emp.employeeNumber ? `ID: ${emp.employeeNumber}` : `REF: ${emp.id.slice(0, 8).toUpperCase()}`;
  if (cardNumberText) {
    cardNumberText.textContent = numDisplay;
  } else {
    const cardNumber = document.getElementById("cardNumber");
    if (cardNumber) cardNumber.textContent = numDisplay;
  }

  // Status indicator on badge
  const statusTag = document.getElementById("badgeStatusTag");
  if (statusTag) {
    if (emp.status === "revoked") {
      statusTag.textContent = "REVOKED";
      statusTag.style.color = "#dc2626";
      statusTag.style.background = "#fef2f2";
      statusTag.style.borderColor = "#fecaca";
    } else {
      statusTag.textContent = "OFFICIAL ID";
      statusTag.style.color = "var(--richardson-navy)";
      statusTag.style.background = "#f8fafc";
      statusTag.style.borderColor = "#cbd5e1";
    }
  }

  // Photo rendering with graceful error fallback
  const photoEl = document.getElementById("facePhoto");
  if (photoEl) {
    photoEl.onerror = () => {
      photoEl.src = "/assets/logo.svg";
      photoEl.style.objectFit = "contain";
      photoEl.style.padding = "6px";
      photoEl.style.background = "#f1f5f9";
    };

    if (emp.photoUrl) {
      photoEl.src = emp.photoUrl;
      photoEl.alt = `Photo of ${fullName}`;
      photoEl.style.objectFit = "cover";
      photoEl.style.objectPosition = "center 20%";
      photoEl.style.padding = "0";
      photoEl.style.background = "#ffffff";
    } else {
      photoEl.src = "/assets/logo.svg";
      photoEl.alt = "Richardson Oil and Gas";
      photoEl.style.objectFit = "contain";
      photoEl.style.padding = "6px";
      photoEl.style.background = "#f1f5f9";
    }
  }

  // Verification URL & links
  const checkUrl = checkUrlFor(emp.id);
  const checkLink = document.getElementById("checkLink");
  const openCheckLink = document.getElementById("openCheckLink");
  if (checkLink) {
    checkLink.href = checkUrl;
    checkLink.textContent = checkUrl;
  }
  if (openCheckLink) {
    openCheckLink.href = checkUrl;
  }

  const editBtn = document.getElementById("editBtn");
  if (editBtn) {
    editBtn.href = `/admin/employee-form.html?id=${encodeURIComponent(emp.id)}`;
  }

  // QR Code Generation using local qrcode-generator
  const qrContainer = document.getElementById("qrContainer");
  if (qrContainer) {
    try {
      if (typeof window.qrcode === "function") {
        const qr = window.qrcode(0, "M");
        qr.addData(checkUrl);
        qr.make();
        const qrImgData = qr.createDataURL(4, 0);
        qrContainer.innerHTML = `<img src="${qrImgData}" alt="QR Verification Code" />`;
      }
    } catch (qrErr) {
      console.error("QR render error:", qrErr);
    }
  }
}

// Wire Download QR Button
const downloadQrBtn = document.getElementById("downloadQrBtn");
if (downloadQrBtn) {
  downloadQrBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!id) return;
    const checkUrl = checkUrlFor(id);
    try {
      if (!window.qrcode) throw new Error("QR library unavailable");
      const qrHigh = window.qrcode(0, "H");
      qrHigh.addData(checkUrl);
      qrHigh.make();
      const highResData = qrHigh.createDataURL(10, 4);

      const a = document.createElement("a");
      const nameSlug = currentEmp && currentEmp.firstName ? currentEmp.firstName : (currentEmp && currentEmp.employeeNumber ? currentEmp.employeeNumber : id);
      a.download = `ROG-${nameSlug}-QR.png`;
      a.href = highResData;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("QR code downloaded successfully.");
    } catch (err) {
      console.error("Download error:", err);
      showToast("Unable to download QR code.");
    }
  });
}

// Wire Copy Verification URL Button
const copyUrlBtn = document.getElementById("copyUrlBtn");
const copyBtnText = document.getElementById("copyBtnText");
if (copyUrlBtn) {
  copyUrlBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!id) return;
    const checkUrl = checkUrlFor(id);
    try {
      await navigator.clipboard.writeText(checkUrl);
    } catch (err) {
      const temp = document.createElement("input");
      temp.value = checkUrl;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }

    if (copyBtnText) {
      const orig = copyBtnText.textContent;
      copyBtnText.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!`;
      copyUrlBtn.style.color = "var(--success-accent)";
      setTimeout(() => {
        copyBtnText.textContent = orig;
        copyUrlBtn.style.color = "";
      }, 2000);
    }
    showToast("Verification URL copied to clipboard!");
  });
}

// Main Load Function
async function load() {
  if (!id) {
    document.getElementById("empName").textContent = "No employee record specified.";
    return;
  }

  // Fast path 1: Instant cache load if available
  let loadedFromCache = false;
  try {
    const cached = localStorage.getItem(ROSTER_CACHE_KEY);
    if (cached) {
      const list = JSON.parse(cached);
      const found = list.find((e) => e.id === id);
      if (found) {
        renderBadge(found);
        loadedFromCache = true;
      }
    }
  } catch (e) {
    console.warn("Roster cache lookup:", e);
  }

  // Fast path 2: Direct Firestore fetch (public single document get)
  try {
    const emp = await getEmployee(id);
    if (emp) {
      renderBadge(emp);
    } else if (!loadedFromCache) {
      document.getElementById("empName").textContent = "Employee record not found.";
    }
  } catch (err) {
    console.error("Firestore getEmployee error:", err);
    if (!loadedFromCache) {
      document.getElementById("empName").textContent = "Failed to load badge record.";
    }
  }
}

// Background Non-blocking Auth check
try {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const token = await user.getIdTokenResult();
        if (token.claims.admin === true) {
          const editBtn = document.getElementById("editBtn");
          if (editBtn && id) {
            editBtn.style.display = "inline-flex";
            editBtn.href = `/admin/employee-form.html?id=${encodeURIComponent(id)}`;
          }
        }
      } catch (e) {
        console.warn("Auth token check:", e);
      }
    }
  });
} catch (e) {
  console.warn("Auth listener:", e);
}

load();
