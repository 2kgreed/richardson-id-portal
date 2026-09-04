import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { auth } from "./firebase-init.js";

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function logout() {
  return signOut(auth);
}

// Resolves with the current user only if their token carries the admin
// claim, otherwise redirects to the login page. This is a UI convenience,
// not the security boundary — a user without the claim gets bounced here,
// but even if they bypassed this check, firestore.rules would still refuse
// every write and every collection listing. Never treat this function as
// the thing keeping data safe.
export function requireAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/admin/login.html";
        return;
      }
      const token = await user.getIdTokenResult(true);
      if (token.claims.admin !== true) {
        window.location.href = "/admin/login.html?err=not-admin";
        return;
      }
      resolve(user);
    });
  });
}
