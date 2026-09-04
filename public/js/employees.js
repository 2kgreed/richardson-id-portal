import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { db, auth } from "./firebase-init.js";

const employeesCol = collection(db, "employees");
const auditCol = collection(db, "audit_logs");

// Public, single-record fetch for /check/<id>
export async function getEmployee(id) {
  const snap = await getDoc(doc(db, "employees", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Admin-only listing
export async function listEmployees() {
  const snap = await getDocs(query(employeesCol, orderBy("lastName")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Convert and compress an image file to a lightweight, web-safe 450x450 JPEG data URL
export function fileToDataUrl(file, maxWidth = 450, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image format."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Audit logger
async function logAudit(action, targetId, details = {}) {
  try {
    await addDoc(auditCol, {
      action,
      targetId,
      actorUid: auth.currentUser ? auth.currentUser.uid : "unknown",
      actorEmail: auth.currentUser ? auth.currentUser.email : "unknown",
      details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("Audit log notice:", err);
  }
}

// Single-step atomic creation
export async function createEmployee(fields, photoFile) {
  let photoUrl = "";
  if (photoFile) {
    photoUrl = await fileToDataUrl(photoFile);
  }

  const payload = {
    firstName: fields.firstName || "",
    lastName: fields.lastName || "",
    jobTitle: fields.jobTitle || "",
    department: fields.department || "",
    employeeNumber: fields.employeeNumber || "",
    issueDate: fields.issueDate || new Date().toISOString().split("T")[0],
    expiryDate: fields.expiryDate || "",
    status: fields.status || "active",
    photoUrl: photoUrl,
    issuedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: auth.currentUser ? auth.currentUser.uid : "unknown"
  };

  const created = await addDoc(employeesCol, payload);
  await logAudit("ISSUE_CREDENTIAL", created.id, {
    name: `${payload.firstName} ${payload.lastName}`,
    employeeNumber: payload.employeeNumber
  });

  return created.id;
}

// Single-step atomic update
export async function updateEmployee(id, fields, photoFile) {
  const payload = {
    ...fields,
    updatedAt: serverTimestamp()
  };

  if (photoFile) {
    payload.photoUrl = await fileToDataUrl(photoFile);
  }

  await updateDoc(doc(db, "employees", id), payload);
  await logAudit("UPDATE_CREDENTIAL", id, { fields: Object.keys(fields) });
}

// Status toggle with audit
export async function setEmployeeStatus(id, status) {
  await updateDoc(doc(db, "employees", id), {
    status,
    updatedAt: serverTimestamp()
  });
  await logAudit(status === "revoked" ? "REVOKE_CREDENTIAL" : "REACTIVATE_CREDENTIAL", id, { status });
}

export function checkUrlFor(employeeId) {
  return `${window.location.origin}/check/${employeeId}`;
}
