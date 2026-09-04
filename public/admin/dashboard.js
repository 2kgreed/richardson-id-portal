import { requireAdmin, logout } from "../js/auth.js";
import { listEmployees, setEmployeeStatus, checkUrlFor } from "../js/employees.js";

const ROSTER_CACHE_KEY = "rog_roster_cache_v1";

const rosterBody = document.getElementById("rosterBody");
const searchBox = document.getElementById("searchBox");
const deptSelect = document.getElementById("deptSelect");
const toggleGroupingBtn = document.getElementById("toggleGroupingBtn");
const groupingBtnLabel = document.getElementById("groupingBtnLabel");
const deptPillsContainer = document.getElementById("deptPillsContainer");
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

let allEmployees = [];
let filteredEmployees = [];
let selectedDept = "";
let isGroupedByDept = false;
let currentPage = 1;
const pageSize = 10;

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

// 0ms Instant Stale-While-Revalidate: render cached roster immediately if present
try {
  const cached = localStorage.getItem(ROSTER_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.length > 0) {
      allEmployees = parsed;
      updateMetrics(allEmployees);
      populateDepartmentControls();
      applyFilter();
    }
  }
} catch (e) {
  console.warn("Roster cache initial load:", e);
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await logout();
  window.location.href = "/admin/login.html";
});

async function init() {
  try {
    // Concurrent auth verification and live roster retrieval
    const [user, employees] = await Promise.all([
      requireAdmin(),
      listEmployees()
    ]);

    if (user && user.email && adminEmailBadge) {
      adminEmailBadge.textContent = user.email;
      adminEmailBadge.style.display = "inline";
    }

    allEmployees = employees || [];
    try {
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(allEmployees));
    } catch (e) {
      console.warn("Failed to persist roster cache:", e);
    }

    updateMetrics(allEmployees);
    populateDepartmentControls();
    applyFilter();
  } catch (err) {
    console.error("Dashboard init error:", err);
    if (rosterBody && allEmployees.length === 0) {
      rosterBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-accent); padding: 32px;">Failed to load employee directory. Please check network connection.</td></tr>`;
    }
  }
}

function updateMetrics(list) {
  const total = list.length;
  const active = list.filter((e) => e.status !== "revoked").length;
  const revoked = total - active;

  if (metricTotal) metricTotal.textContent = total;
  if (metricActive) metricActive.textContent = active;
  if (metricRevoked) metricRevoked.textContent = revoked;
}

function populateDepartmentControls() {
  const deptCounts = {};
  for (const emp of allEmployees) {
    const dept = (emp.department || "").trim() || "Unassigned";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  }
  const depts = Object.keys(deptCounts).sort((a, b) => a.localeCompare(b));

  // Populate Dropdown
  if (deptSelect) {
    deptSelect.replaceChildren();
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = `All Departments (${allEmployees.length} staff)`;
    deptSelect.appendChild(allOpt);

    for (const d of depts) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = `${d} (${deptCounts[d]})`;
      deptSelect.appendChild(opt);
    }

    // Keep previously selected department if it still exists
    if (selectedDept && depts.includes(selectedDept)) {
      deptSelect.value = selectedDept;
    } else {
      selectedDept = "";
      deptSelect.value = "";
    }
  }

  // Populate Quick Filter Pills
  if (deptPillsContainer) {
    deptPillsContainer.replaceChildren();

    // "All Staff" pill
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = `dept-pill-btn ${selectedDept === "" ? "active" : ""}`;
    allBtn.innerHTML = `All Staff <span class="dept-pill-count">${allEmployees.length}</span>`;
    allBtn.addEventListener("click", () => {
      selectedDept = "";
      if (deptSelect) deptSelect.value = "";
      highlightActivePills();
      applyFilter();
    });
    deptPillsContainer.appendChild(allBtn);

    // Individual Department pills
    for (const d of depts) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = `dept-pill-btn ${selectedDept.toLowerCase() === d.toLowerCase() ? "active" : ""}`;
      pill.dataset.dept = d;
      pill.innerHTML = `${escapeHtml(d)} <span class="dept-pill-count">${deptCounts[d]}</span>`;
      pill.addEventListener("click", () => {
        selectedDept = d;
        if (deptSelect) deptSelect.value = d;
        highlightActivePills();
        applyFilter();
      });
      deptPillsContainer.appendChild(pill);
    }
  }
}

function highlightActivePills() {
  if (!deptPillsContainer) return;
  const pills = deptPillsContainer.querySelectorAll(".dept-pill-btn");
  for (const pill of pills) {
    const dept = pill.dataset.dept;
    if (!dept) {
      pill.classList.toggle("active", selectedDept === "");
    } else {
      pill.classList.toggle("active", selectedDept.toLowerCase() === dept.toLowerCase());
    }
  }
}

function applyFilter() {
  const q = searchBox ? searchBox.value.trim().toLowerCase() : "";

  filteredEmployees = allEmployees.filter((e) => {
    // 1. Department match
    if (selectedDept) {
      const empDept = (e.department || "").trim() || "Unassigned";
      if (empDept.toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }
    }

    // 2. Search query match
    if (q) {
      const matches = [e.firstName, e.lastName, e.department, e.employeeNumber, e.jobTitle]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
      if (!matches) return false;
    }

    return true;
  });

  currentPage = 1;
  renderPage();
}

function createEmployeeRow(emp) {
  const tr = document.createElement("tr");

  // Employee column with photo avatar
  const empTd = document.createElement("td");
  const empCell = document.createElement("div");
  empCell.className = "emp-cell";

  if (emp.photoUrl) {
    const img = document.createElement("img");
    img.className = "emp-avatar";
    img.src = emp.photoUrl;
    img.alt = `${emp.firstName || ""} ${emp.lastName || ""}`;
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
  nameEl.textContent = `${emp.firstName || ""} ${emp.lastName || ""}`;
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
    try {
      await setEmployeeStatus(emp.id, next);
      emp.status = next;
      try {
        localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(allEmployees));
      } catch (e) {
        console.warn("Cache update error:", e);
      }
      updateMetrics(allEmployees);
      populateDepartmentControls();
      applyFilter();
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status. Please try again.");
      toggleBtn.disabled = false;
      toggleBtn.textContent = isRevoked ? "Reactivate" : "Revoke";
    }
  });
  actionsTd.appendChild(toggleBtn);

  tr.appendChild(actionsTd);
  return tr;
}

function renderPage() {
  rosterBody.replaceChildren();

  if (resultsCount) {
    const deptSuffix = selectedDept ? ` in ${selectedDept}` : "";
    resultsCount.textContent = `${filteredEmployees.length} ${filteredEmployees.length === 1 ? "record" : "records"}${deptSuffix}`;
  }

  if (filteredEmployees.length === 0) {
    if (paginationBar) paginationBar.style.display = "none";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.style.textAlign = "center";
    td.style.padding = "48px 24px";
    td.innerHTML = `
      <div style="max-width: 320px; margin: 0 auto; color: var(--slate-500);">
        <p style="font-weight: 600; font-size: 1rem; color: var(--slate-700); margin-bottom: 6px;">No personnel records found</p>
        <p style="font-size: 0.85rem; margin: 0 0 16px;">${selectedDept ? `No staff registered in ${escapeHtml(selectedDept)}.` : "Issue a card to register an employee into the directory."}</p>
        <a class="btn btn-primary btn-sm" href="/admin/employee-form.html">Issue New ID Card</a>
      </div>
    `;
    tr.appendChild(td);
    rosterBody.appendChild(tr);
    return;
  }

  // GROUPED BY DEPARTMENT VIEW
  if (isGroupedByDept) {
    if (paginationBar) paginationBar.style.display = "none";

    const groups = {};
    for (const emp of filteredEmployees) {
      const dept = (emp.department || "").trim() || "Unassigned";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    }

    const sortedGroups = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    for (const deptName of sortedGroups) {
      const count = groups[deptName].length;
      const headerTr = document.createElement("tr");
      headerTr.className = "dept-group-header-row";
      headerTr.innerHTML = `
        <td colspan="5">
          <div class="dept-group-header-content">
            <span class="dept-group-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              ${escapeHtml(deptName)}
            </span>
            <span class="dept-group-count">${count} ${count === 1 ? "Staff" : "Staff"}</span>
          </div>
        </td>
      `;
      rosterBody.appendChild(headerTr);

      for (const emp of groups[deptName]) {
        rosterBody.appendChild(createEmployeeRow(emp));
      }
    }
    return;
  }

  // STANDARD PAGINATED VIEW
  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  if (totalPages > 1 && paginationBar) {
    paginationBar.style.display = "flex";
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredEmployees.length);
    if (paginationInfo) paginationInfo.textContent = `Showing ${startIdx}-${endIdx} of ${filteredEmployees.length}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
  } else if (paginationBar) {
    paginationBar.style.display = "none";
  }

  const slice = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  for (const emp of slice) {
    rosterBody.appendChild(createEmployeeRow(emp));
  }
}

// Department Dropdown Change Event
if (deptSelect) {
  deptSelect.addEventListener("change", (e) => {
    selectedDept = e.target.value;
    highlightActivePills();
    applyFilter();
  });
}

// Grouping Toggle Button Event
if (toggleGroupingBtn) {
  toggleGroupingBtn.addEventListener("click", () => {
    isGroupedByDept = !isGroupedByDept;
    if (isGroupedByDept) {
      if (groupingBtnLabel) groupingBtnLabel.textContent = "Ungroup Staff";
      toggleGroupingBtn.style.background = "#e0e7ff";
      toggleGroupingBtn.style.borderColor = "var(--primary-600)";
      toggleGroupingBtn.style.color = "var(--richardson-navy)";
    } else {
      if (groupingBtnLabel) groupingBtnLabel.textContent = "Group by Department";
      toggleGroupingBtn.style.background = "";
      toggleGroupingBtn.style.borderColor = "";
      toggleGroupingBtn.style.color = "";
    }
    renderPage();
  });
}

// Search Filter Input Event
if (searchBox) {
  searchBox.addEventListener("input", applyFilter);
}

// Pagination Event Handlers
if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredEmployees.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderPage();
    }
  });
}

// Export CSV Feature
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", () => {
    const listToExport = filteredEmployees.length > 0 ? filteredEmployees : allEmployees;
    if (listToExport.length === 0) {
      alert("No personnel records available to export.");
      return;
    }

    const headers = ["Employee ID", "First Name", "Last Name", "Job Title", "Department", "Status", "Issue Date", "Expiry Date", "Check URL"];
    const rows = listToExport.map((e) => [
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
    const deptNameSlug = selectedDept ? `-${selectedDept.replace(/[^a-zA-Z0-9]/g, "_")}` : "";
    link.setAttribute("download", `ROG-ID-Roster${deptNameSlug}-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

init();
