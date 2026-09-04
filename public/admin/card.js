import { requireAdmin } from "../js/auth.js";
import { getEmployee, checkUrlFor } from "../js/employees.js";

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
  const emp = await getEmployee(id);
  if (!emp) {
    document.getElementById("empName").textContent = "Employee record not found.";
  } else {
    const fullName = `${emp.firstName} ${emp.lastName}`;
    document.getElementById("empName").textContent = `${fullName} · Official Badge`;
    document.getElementById("cardName").textContent = fullName;
    document.getElementById("cardRole").textContent = emp.jobTitle || "Personnel";
    document.getElementById("cardDept").textContent = emp.department || "General Operations";
    document.getElementById("cardNumber").textContent = emp.employeeNumber ? `ID: ${emp.employeeNumber}` : `REF: ${emp.id.slice(0, 8)}`;

    const photoEl = document.getElementById("facePhoto");
    if (emp.photoUrl) {
      photoEl.src = emp.photoUrl;
      photoEl.alt = `Photo of ${fullName}`;
    } else {
      photoEl.src = "/assets/logo.svg";
      photoEl.style.padding = "10px";
      photoEl.style.background = "#f1f5f9";
    }

    const checkUrl = checkUrlFor(id);
    const checkLink = document.getElementById("checkLink");
    const openCheckLink = document.getElementById("openCheckLink");
    checkLink.href = checkUrl;
    checkLink.textContent = checkUrl;
    openCheckLink.href = checkUrl;

    const canvas = document.getElementById("qrCanvas");
    window.QRCode.toCanvas(canvas, checkUrl, {
      width: 70,
      margin: 1,
      color: {
        dark: "#091733",
        light: "#ffffff"
      }
    });

    document.getElementById("downloadQrBtn").addEventListener("click", () => {
      const link = document.createElement("a");
      link.download = `ROG-${emp.employeeNumber || id}-QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("QR code downloaded successfully.");
    });

    document.getElementById("copyUrlBtn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(checkUrl);
        showToast("Verification URL copied to clipboard!");
      } catch (err) {
        showToast("Failed to copy URL. Please copy manually.");
      }
    });
  }
}

document.getElementById("printBtn").addEventListener("click", () => {
  window.print();
});
