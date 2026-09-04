import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";
import { db, storage, auth } from "./firebase-init.js";

const employeesCol = collection(db, "employees");

// Public, single-record fetch — this is what the /check page calls.
// Allowed by firestore.rules for anyone, since it requires knowing the
// exact document ID from the card's QR code.
export async function getEmployee(id) {
  const snap = await getDoc(doc(db, "employees", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Admin-only: lists every record for the dashboard. Blocked by
// firestore.rules for anyone without the admin claim.
export async function listEmployees() {
  const snap = await getDocs(query(employeesCol, orderBy("lastName")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createEmployee(fields, photoFile) {
  const payload = {
    ...fields,
    status: fields.status || "active",
    photoUrl: "",
    issuedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: auth.currentUser ? auth.currentUser.uid : "unknown"
  };
  const created = await addDoc(employeesCol, payload);

  if (photoFile) {
    const url = await uploadEmployeePhoto(created.id, photoFile);
    await updateDoc(doc(db, "employees", created.id), { photoUrl: url });
  }
  return created.id;
}

export async function updateEmployee(id, fields, photoFile) {
  const payload = { ...fields, updatedAt: serverTimestamp() };
  if (photoFile) {
    payload.photoUrl = await uploadEmployeePhoto(id, photoFile);
  }
  await updateDoc(doc(db, "employees", id), payload);
}

export async function setEmployeeStatus(id, status) {
  await updateDoc(doc(db, "employees", id), { status, updatedAt: serverTimestamp() });
}

function fileToDataUrl(file, maxWidth = 500, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
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
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadEmployeePhoto(employeeId, file) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Photo must be under 5MB.");
  }
  try {
    const photoRef = ref(storage, `employee-photos/${employeeId}`);
    await uploadBytes(photoRef, file, { contentType: file.type });
    return await getDownloadURL(photoRef);
  } catch (storageErr) {
    console.warn("Using optimized inline photo storage fallback:", storageErr);
    return await fileToDataUrl(file);
  }
}

export function checkUrlFor(employeeId) {
  return `${window.location.origin}/check/${employeeId}`;
}
