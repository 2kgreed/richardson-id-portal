import { requireAdmin, logout } from "../js/auth.js";
import { listEmployees, setEmployeeStatus, checkUrlFor } from "../js/employees.js";

const user = await requireAdmin();

const rosterBody = document.getElementById("rosterBody");
const searchBox = document.getElementById("searchBox");
const metricTotal = document.getElementById("metricTotal");
const metricActive = document.getElementById("metricActive");
const metricRevoked = document.getElementById("metricRevoked");
const resultsCount = document.getElementById("resultsCount");
const adminEmailBadge = document.getElementById("adminEmailBadge");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const paginationBar = document.getElementById("paginationBar");
const paginationInfo = document.getElementById("paginationInfo");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

if (user && user.email) {
  adminEmailBadge.textContent = user.email;
  adminEmailBadge.style.display = "inline";
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await logout();
  window.location.href = "/admin/login.html";
});

let allEmployees = [];
let filteredEmployees = [];
let currentPage = 1;
const pageSize = 10;

async function load() {
  try {
    allEmployees = await listEmployees();
    updateMetrics(allEmployees);
    applyFilter();
  } catch (err) {
    console.error("Dashboard error:", err);
    rosterBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-accent); padding: 32px;">Failed to load employee directory. Please check network.</td></tr>`;
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

function applyFilter() {
  const q = searchBox.value.trim().toLowerCase();
  if (!q) {
    filteredEmployees = [...allEmployees];
  } else {
    filteredEmployees = allEmployees.filter((e) =>
      [e.firstName, e.lastName, e.department, e.employeeNumber, e.jobTitle]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }
  currentPage = 1;
  renderPage();
}

function renderPage() {
  rosterBody.replaceChildren();

  if (resultsCount) {
    resultsCount.textContent = `${filteredEmployees.length} ${filteredEmployees.length === 1 ? "record" : "records"}`;
  }

  if (filteredEmployees.length === 0) {
    paginationBar.style.display = "none";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.style.textAlign = "center";
    td.style.padding = "48px 24px";
    td.innerHTML = `
      <div style="max-width: 320px; margin: 0 auto; color: var(--slate-500);">
        <p style="font-weight: 600; font-size: 1rem; color: var(--slate-700); margin-bottom: 6px;">No records found</p>
        <p style="font-size: 0.85rem; margin: 0 0 16px;">Issue a card to register an employee into the security directory.</p>
        <a class="btn btn-primary btn-sm" href="/admin/employee-form.html">Issue First ID Card</a>
      </div>
    `;
    tr.appendChild(td);
    rosterBody.appendChild(tr);
    return;
  }

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  if (totalPages > 1) {
    paginationBar.style.display = "flex";
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredEmployees.length);
    paginationInfo.textContent = `Showing ${startIdx}-${endIdx} of ${filteredEmployees.length}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  } else {
    paginationBar.style.display = "none";
  }

  const slice = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  for (const emp of slice) {
    const tr = document.createElement("tr");

    // Employee column with avatar
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

// Pagination Event Handlers
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
  }
});

searchBox.addEventListener("input", applyFilter);

// Export CSV Feature
exportCsvBtn.addEventListener("click", () => {
  if (allEmployees.length === 0) {
    alert("No records to export.");
    return;
  }

  const headers = ["Employee ID", "First Name", "Last Name", "Job Title", "Department", "Status", "Issue Date", "Expiry Date", "Check URL"];
  const rows = allEmployees.map((e) => [
    `"${(e.employeeNumber || "").replace(/"/g, '""')}"`,
    `"${(e.firstName || "").replace(/"/g, '""')}"`,
    `"${(e.lastName || "").replace(/"/g, '""')}"`,
    `"${(e.jobTitle || "").replace(/"/g, '""')}"`,
    `"${(e.department || "").replace(/"/g, '""')}"`,
    `"${e.status || "active"}"`,
    `"${e.issueDate || ""}"`,
    `"${e.expiryDate || ""}"`,
    `"${checkUrlFor(e.id)}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ROG-ID-Roster-${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

load();
