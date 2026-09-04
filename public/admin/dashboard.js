import { requireAdmin, logout } from "../js/auth.js";
import { listEmployees, setEmployeeStatus } from "../js/employees.js";

const user = await requireAdmin();

const rosterBody = document.getElementById("rosterBody");
const searchBox = document.getElementById("searchBox");
const metricTotal = document.getElementById("metricTotal");
const metricActive = document.getElementById("metricActive");
const metricRevoked = document.getElementById("metricRevoked");
const resultsCount = document.getElementById("resultsCount");
const adminEmailBadge = document.getElementById("adminEmailBadge");

if (user && user.email) {
  adminEmailBadge.textContent = user.email;
  adminEmailBadge.style.display = "inline";
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await logout();
  window.location.href = "/admin/login.html";
});

let allEmployees = [];

async function load() {
  try {
    allEmployees = await listEmployees();
    updateMetrics(allEmployees);
    render(allEmployees);
  } catch (err) {
    rosterBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-accent); padding: 32px;">Failed to load employee directory. Please check network and permissions.</td></tr>`;
  }
}

function updateMetrics(list) {
  const total = list.length;
  const active = list.filter((e) => e.status !== "revoked").length;
  const revoked = total - active;

  metricTotal.textContent = total;
  metricActive.textContent = active;
  metricRevoked.textContent = revoked;
}

function render(list) {
  rosterBody.replaceChildren();

  if (resultsCount) {
    resultsCount.textContent = `${list.length} ${list.length === 1 ? "record" : "records"}`;
  }

  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.style.textAlign = "center";
    td.style.padding = "48px 24px";
    td.innerHTML = `
      <div style="max-width: 320px; margin: 0 auto; color: var(--slate-500);">
        <p style="font-weight: 600; font-size: 1rem; color: var(--slate-700); margin-bottom: 6px;">No employees found</p>
        <p style="font-size: 0.85rem; margin: 0 0 16px;">Issue an official ID card to register an employee into the security directory.</p>
        <a class="btn btn-primary btn-sm" href="/admin/employee-form.html">Add First Employee</a>
      </div>
    `;
    tr.appendChild(td);
    rosterBody.appendChild(tr);
    return;
  }

  for (const emp of list) {
    const tr = document.createElement("tr");

    // Employee column with avatar & title
    const empTd = document.createElement("td");
    const empCell = document.createElement("div");
    empCell.className = "emp-cell";

    if (emp.photoUrl) {
      const img = document.createElement("img");
      img.className = "emp-avatar";
      img.src = emp.photoUrl;
      img.alt = `${emp.firstName} ${emp.lastName}`;
      empCell.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "emp-avatar-placeholder";
      placeholder.textContent = `${(emp.firstName || "?")[0]}${(emp.lastName || "?")[0]}`.toUpperCase();
      empCell.appendChild(placeholder);
    }

    const textWrap = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.className = "emp-name-text";
    nameEl.textContent = `${emp.firstName} ${emp.lastName}`;
    const roleEl = document.createElement("div");
    roleEl.className = "emp-job-text";
    roleEl.textContent = emp.jobTitle || "Personnel";
    textWrap.appendChild(nameEl);
    textWrap.appendChild(roleEl);
    empCell.appendChild(textWrap);
    empTd.appendChild(empCell);
    tr.appendChild(empTd);

    // Department column
    const deptTd = document.createElement("td");
    deptTd.textContent = emp.department || "—";
    tr.appendChild(deptTd);

    // Employee Number column
    const numTd = document.createElement("td");
    if (emp.employeeNumber) {
      const numSpan = document.createElement("span");
      numSpan.className = "emp-num";
      numSpan.textContent = emp.employeeNumber;
      numTd.appendChild(numSpan);
    } else {
      numTd.textContent = "—";
    }
    tr.appendChild(numTd);

    // Status pill column
    const statusTd = document.createElement("td");
    const pill = document.createElement("span");
    const isRevoked = emp.status === "revoked";
    pill.className = isRevoked ? "pill pill-revoked" : "pill pill-active";
    pill.textContent = isRevoked ? "Revoked" : "Active";
    statusTd.appendChild(pill);
    tr.appendChild(statusTd);

    // Actions column
    const actionsTd = document.createElement("td");
    actionsTd.className = "actions-cell";

    const cardLink = document.createElement("a");
    cardLink.className = "btn btn-quiet btn-sm";
    cardLink.href = `/admin/card.html?id=${encodeURIComponent(emp.id)}`;
    cardLink.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg> Badge`;
    actionsTd.appendChild(cardLink);

    const editLink = document.createElement("a");
    editLink.className = "btn btn-quiet btn-sm";
    editLink.href = `/admin/employee-form.html?id=${encodeURIComponent(emp.id)}`;
    editLink.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit`;
    actionsTd.appendChild(editLink);

    const toggleBtn = document.createElement("button");
    toggleBtn.className = isRevoked ? "btn btn-quiet btn-sm" : "btn btn-danger btn-sm";
    toggleBtn.textContent = isRevoked ? "Reactivate" : "Revoke";
    toggleBtn.addEventListener("click", async () => {
      const next = isRevoked ? "active" : "revoked";
      const confirmAction = confirm(`Are you sure you want to ${next === "active" ? "reactivate" : "revoke"} ID credential for ${emp.firstName} ${emp.lastName}?`);
      if (!confirmAction) return;

      toggleBtn.disabled = true;
      toggleBtn.textContent = "Updating…";
      await setEmployeeStatus(emp.id, next);
      await load();
    });
    actionsTd.appendChild(toggleBtn);

    tr.appendChild(actionsTd);
    rosterBody.appendChild(tr);
  }
}

searchBox.addEventListener("input", () => {
  const q = searchBox.value.trim().toLowerCase();
  if (!q) return render(allEmployees);
  render(
    allEmployees.filter((e) =>
      [e.firstName, e.lastName, e.department, e.employeeNumber, e.jobTitle]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    )
  );
});

load();
