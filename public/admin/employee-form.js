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
const fields = ["firstName", "lastName", "jobTitle", "department", "employeeNumber"];

// Photo preview on file select
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    errEl.textContent = "Photo must be less than 5MB in size.";
    photoInput.value = "";
    return;
  }
  errEl.textContent = "";

  const reader = new FileReader();
  reader.onload = (e) => {
    previewBox.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
  };
  reader.readAsDataURL(file);
});

if (editId) {
  document.getElementById("formTitle").textContent = "Edit Employee Credential";
  try {
    const existing = await getEmployee(editId);
    if (existing) {
      for (const f of fields) {
        if (document.getElementById(f)) {
          document.getElementById(f).value = existing[f] || "";
        }
      }
      if (existing.photoUrl) {
        previewBox.innerHTML = `<img src="${existing.photoUrl}" alt="${existing.firstName}" />`;
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
    errEl.textContent = "Both first and last name are required.";
    return;
  }

  const payload = {
    firstName,
    lastName,
    jobTitle: document.getElementById("jobTitle").value.trim(),
    department: document.getElementById("department").value.trim(),
    employeeNumber: document.getElementById("employeeNumber").value.trim()
  };
  const photoFile = photoInput.files[0] || null;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving to directory…";

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
    errEl.textContent = error.message || "Couldn't save record. Check photo file size and connectivity.";
    saveBtn.disabled = false;
    saveBtn.textContent = "Save & Generate Card";
  }
});
