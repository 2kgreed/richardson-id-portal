import { requireAdmin } from "../js/auth.js";
import { getEmployee, checkUrlFor } from "../js/employees.js";

// Always attach print button right away so printing is never blocked
const printBtn = document.getElementById("printBtn");
if (printBtn) {
  printBtn.addEventListener("click", () => {
    window.print();
  });
}

await requireAdmin();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const toast = document.getElementById("toast");
function showToast(msg) {
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
    const emp = await getEmployee(id);
    if (!emp) {
      document.getElementById("empName").textContent = "Employee record not found.";
    } else {
      const fullName = `${emp.firstName} ${emp.lastName}`.trim();
      document.getElementById("empName").textContent = `${fullName} · Official Badge`;
      document.getElementById("cardName").textContent = fullName;
      document.getElementById("cardRole").textContent = emp.jobTitle || "Personnel";
      document.getElementById("cardDept").textContent = emp.department || "Operations";
      document.getElementById("cardNumber").textContent = emp.employeeNumber ? `ID: ${emp.employeeNumber}` : `REF: ${emp.id.slice(0, 8).toUpperCase()}`;

      // Expiry & validity
      const expiryText = emp.expiryDate ? `EXP: ${emp.expiryDate}` : "VALID PERSONNEL";
      document.getElementById("cardValidity").textContent = expiryText;

      // Status indicator on badge
      if (emp.status === "revoked") {
        const tag = document.getElementById("badgeStatusTag");
        tag.textContent = "REVOKED";
        tag.style.color = "#f87171";
      }

      // Photo
      const photoEl = document.getElementById("facePhoto");
      if (emp.photoUrl) {
        photoEl.src = emp.photoUrl;
        photoEl.alt = `Photo of ${fullName}`;
      } else {
        photoEl.src = "/assets/logo.svg";
        photoEl.style.padding = "8px";
        photoEl.style.background = "#f1f5f9";
      }

      // Verification URL
      const checkUrl = checkUrlFor(id);
      const checkLink = document.getElementById("checkLink");
      const openCheckLink = document.getElementById("openCheckLink");
      checkLink.href = checkUrl;
      checkLink.textContent = checkUrl;
      openCheckLink.href = checkUrl;

      // Edit Button
      const editBtn = document.getElementById("editBtn");
      if (editBtn) {
        editBtn.href = `/admin/employee-form.html?id=${encodeURIComponent(id)}`;
      }

      // QR Code Generation using local QRCode library
      const qrContainer = document.getElementById("qrContainer");
      qrContainer.innerHTML = ""; // Clear any placeholder

      if (window.QRCode) {
        new window.QRCode(qrContainer, {
          text: checkUrl,
          width: 66,
          height: 66,
          colorDark: "#091733",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } else {
        console.error("Local QRCode library not loaded.");
        qrContainer.textContent = "QR Error";
      }

      // Download QR Code Button
      document.getElementById("downloadQrBtn").addEventListener("click", () => {
        const canvas = qrContainer.querySelector("canvas");
        const img = qrContainer.querySelector("img");
        let dataUrl = "";
        if (canvas) {
          dataUrl = canvas.toDataURL("image/png");
        } else if (img && img.src) {
          dataUrl = img.src;
        }

        if (dataUrl) {
          const link = document.createElement("a");
          link.download = `ROG-${emp.employeeNumber || id}-QR.png`;
          link.href = dataUrl;
          link.click();
          showToast("QR code downloaded successfully.");
        } else {
          showToast("Unable to export QR image.");
        }
      });

      // Copy Verification URL Button
      document.getElementById("copyUrlBtn").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(checkUrl);
          showToast("Verification URL copied to clipboard!");
        } catch (err) {
          const tempInput = document.createElement("input");
          tempInput.value = checkUrl;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand("copy");
          document.body.removeChild(tempInput);
          showToast("Verification URL copied to clipboard!");
        }
      });
    }
  } catch (err) {
    console.error("Error loading card:", err);
    document.getElementById("empName").textContent = "Failed to load card information.";
  }
}
