import { requireAdmin } from "../js/auth.js";
import { getEmployee, createEmployee, updateEmployee } from "../js/employees.js";

await requireAdmin();

const params = new URLSearchParams(window.location.search);
const editId = params.get("id");

const form = document.getElementById("employeeForm");
const errEl = document.getElementById("err");
const saveBtn = document.getElementById("saveBtn");
const photoInput = document.getElementById("photo");
const previewBox = document.getElementById("previewBox");
const issueDateInput = document.getElementById("issueDate");
const expiryDateInput = document.getElementById("expiryDate");

// Set default dates
const today = new Date();
const todayIso = today.toISOString().split("T")[0];
const twoYears = new Date();
twoYears.setFullYear(twoYears.getFullYear() + 2);
const twoYearsIso = twoYears.toISOString().split("T")[0];

if (issueDateInput && !issueDateInput.value) issueDateInput.value = todayIso;
if (expiryDateInput && !expiryDateInput.value) expiryDateInput.value = twoYearsIso;

// Instant photo preview
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;

  if (file.size > 8 * 1024 * 1024) {
    errEl.textContent = "Photo file is too large. Please select an image under 8MB.";
    photoInput.value = "";
    return;
  }
  errEl.textContent = "";

  const reader = new FileReader();
  reader.onload = (e) => {
    previewBox.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" />`;
  };
  reader.readAsDataURL(file);
});

const fields = ["firstName", "lastName", "jobTitle", "department", "employeeNumber", "issueDate", "expiryDate"];

if (editId) {
  document.getElementById("formTitle").textContent = "Edit Employee Credential";
  try {
    const existing = await getEmployee(editId);
    if (existing) {
      for (const f of fields) {
        if (document.getElementById(f) && existing[f]) {
          document.getElementById(f).value = existing[f];
        }
      }
      if (existing.photoUrl) {
        previewBox.innerHTML = `<img src="${existing.photoUrl}" alt="${existing.firstName}" style="width: 100%; height: 100%; object-fit: cover;" />`;
      }
    }
  } catch (err) {
    errEl.textContent = "Failed to load existing record details.";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errEl.textContent = "";

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  if (!firstName || !lastName) {
    errEl.textContent = "First name and last name are required.";
    return;
  }

  const payload = {
    firstName,
    lastName,
    jobTitle: document.getElementById("jobTitle").value.trim(),
    department: document.getElementById("department").value.trim(),
    employeeNumber: document.getElementById("employeeNumber").value.trim(),
    issueDate: issueDateInput ? issueDateInput.value : todayIso,
    expiryDate: expiryDateInput ? expiryDateInput.value : twoYearsIso
  };

  const photoFile = photoInput.files[0] || null;

  saveBtn.disabled = true;
  saveBtn.textContent = "Processing & Saving…";

  try {
    let id = editId;
    if (editId) {
      await updateEmployee(editId, payload, photoFile);
    } else {
      id = await createEmployee(payload, photoFile);
    }
    window.location.href = `/admin/card.html?id=${encodeURIComponent(id)}`;
  } catch (error) {
    console.error("Save error:", error);
    errEl.textContent = error.message || "Could not save employee record. Please try again.";
    saveBtn.disabled = false;
    saveBtn.textContent = "Save & Generate Card";
  }
});
