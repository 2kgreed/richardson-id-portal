import { requireAdmin } from "../js/auth.js";
import { getEmployee, checkUrlFor } from "../js/employees.js";

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

if (!id) {
  document.getElementById("empName").textContent = "No employee record specified.";
} else {
  try {
    // Parallelize authentication check and Firestore fetch for fastest load
    const [_, emp] = await Promise.all([
      requireAdmin(),
      getEmployee(id)
    ]);
    if (!emp) {
      document.getElementById("empName").textContent = "Employee record not found.";
    } else {
      const firstName = (emp.firstName || "").trim();
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();

      // Set document.title to the employee's first name so browser print/PDF export names the file after them
      if (firstName) {
        document.title = firstName;
      }

      window.addEventListener("beforeprint", () => {
        if (firstName) document.title = firstName;
      });

      document.getElementById("empName").textContent = `${fullName} · Official Badge`;
      const cardNameEl = document.getElementById("cardName");
      if (cardNameEl) cardNameEl.textContent = fullName || "—";

      const cardNumberText = document.getElementById("cardNumberText");
      if (cardNumberText) {
        cardNumberText.textContent = emp.employeeNumber ? `ID: ${emp.employeeNumber}` : `REF: ${emp.id.slice(0, 8).toUpperCase()}`;
      } else {
        const cardNumber = document.getElementById("cardNumber");
        if (cardNumber) {
          cardNumber.textContent = emp.employeeNumber ? `ID: ${emp.employeeNumber}` : `REF: ${emp.id.slice(0, 8).toUpperCase()}`;
        }
      }

      // Status indicator on badge
      const statusTag = document.getElementById("badgeStatusTag");
      if (statusTag) {
        if (emp.status === "revoked") {
          statusTag.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> REVOKED`;
          statusTag.style.color = "#dc2626";
          statusTag.style.background = "#fef2f2";
          statusTag.style.borderColor = "#fecaca";
        } else {
          statusTag.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> OFFICIAL ID`;
          statusTag.style.color = "var(--richardson-navy)";
          statusTag.style.background = "#f8fafc";
          statusTag.style.borderColor = "#cbd5e1";
        }
      }

      // Photo rendering
      const photoEl = document.getElementById("facePhoto");
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
        photoEl.style.padding = "8px";
        photoEl.style.background = "#f1f5f9";
      }

      // Verification URL & links
      const checkUrl = checkUrlFor(id);
      const checkLink = document.getElementById("checkLink");
      const openCheckLink = document.getElementById("openCheckLink");
      if (checkLink) {
        checkLink.href = checkUrl;
        checkLink.textContent = checkUrl;
      }
      if (openCheckLink) {
        openCheckLink.href = checkUrl;
      }

      // Edit Button
      const editBtn = document.getElementById("editBtn");
      if (editBtn) {
        editBtn.href = `/admin/employee-form.html?id=${encodeURIComponent(id)}`;
      }

      // QR Code Generation using local qrcode-generator
      const qrContainer = document.getElementById("qrContainer");
      if (qrContainer && window.qrcode) {
        try {
          // typeNumber 0 = auto-detect size based on URL length
          // 'M' error correction allows scanning even with slight smudges
          const qr = window.qrcode(0, "M");
          qr.addData(checkUrl);
          qr.make();

          // Cell size 3 creates a crisp ~65x65 image
          const qrImgData = qr.createDataURL(4, 0);
          qrContainer.innerHTML = `<img src="${qrImgData}" alt="QR Verification Code" />`;
        } catch (qrErr) {
          console.error("QR render error:", qrErr);
          qrContainer.innerHTML = `<span style="font-size: 8px; color: red;">QR Error</span>`;
        }
      }

      // Download QR Button
      const downloadQrBtn = document.getElementById("downloadQrBtn");
      if (downloadQrBtn) {
        downloadQrBtn.addEventListener("click", (e) => {
          e.preventDefault();
          try {
            if (!window.qrcode) throw new Error("QR library unavailable");
            const qrHigh = window.qrcode(0, "H");
            qrHigh.addData(checkUrl);
            qrHigh.make();
            const highResData = qrHigh.createDataURL(10, 4);

            const a = document.createElement("a");
            a.download = `ROG-${emp.employeeNumber || id}-QR.png`;
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

      // Copy Verification URL Button
      const copyUrlBtn = document.getElementById("copyUrlBtn");
      const copyBtnText = document.getElementById("copyBtnText");
      if (copyUrlBtn) {
        copyUrlBtn.addEventListener("click", async (e) => {
          e.preventDefault();
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
    }
  } catch (err) {
    console.error("Card load error:", err);
    document.getElementById("empName").textContent = "Failed to load badge record.";
  }
}
