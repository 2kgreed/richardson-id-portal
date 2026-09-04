# Richardson Oil and Gas — Corporate ID Card Portal

[![Status](https://img.shields.io/badge/Status-Live%20Production-success)](https://rog-id-test-84920.web.app)
[![Firebase](https://img.shields.io/badge/Platform-Firebase%20Hosting%20%2B%20Firestore-orange)](https://console.firebase.google.com/project/rog-id-test-84920/overview)
[![License](https://img.shields.io/badge/License-Proprietary-blue)](https://richardsonoilandgas.com)

Executive-grade corporate identity card and digital verification management portal built for **Richardson Oil and Gas PLC**. Provides secure personnel badge issuance, high-resolution QR verification code generation, standard CR-80 card printing, real-time revocation, and a tamper-evident public checkpoint.

---

## 🌐 Live Application Deployment

- **Production Portal**: [https://rog-id-test-84920.web.app](https://rog-id-test-84920.web.app)
- **Admin Access Point**: [https://rog-id-test-84920.web.app/admin/login.html](https://rog-id-test-84920.web.app/admin/login.html)
- **Public Verification Endpoint**: `https://rog-id-test-84920.web.app/check/<id>`
- **Firebase Project Console**: [https://console.firebase.google.com/project/rog-id-test-84920/overview](https://console.firebase.google.com/project/rog-id-test-84920/overview)

---

## 🚀 Key Features

1. **Executive Security Dashboard**:
   - Real-time directory metrics: Total Issued Cards, Active Personnel, Revoked Credentials.
   - Search & filtering by employee name, department, or corporate ID number.
   - Instant 1-click status revocation and reactivation.

2. **Standard CR80 Physical Card Printing**:
   - Sized exactly for physical PVC card printers (85.6mm × 54mm).
   - High-contrast corporate navy & amber-gold branding with company emblem.
   - Embeds scannable high-density QR code directly on badge.
   - One-click print-ready stylesheet with `@media print` layout.
   - Standalone PNG QR download for custom lanyard card fabrication.

3. **Tamper-Evident Verification Checkpoint (`/check/<id>`)**:
   - Mobile-first, dark security-themed inspection UI.
   - Real-time cryptographic validation directly against Cloud Firestore.
   - Pulsing green status indicator for valid cards (`OFFICIAL CREDENTIAL VERIFIED · ACTIVE`).
   - High-visibility red alert for deactivated badges (`CREDENTIAL REVOKED · ACCESS DENIED`).
   - Anti-counterfeit verification timestamp and employee details display.

4. **Zero Cloud Maintenance Cost (Free Spark Tier)**:
   - Client-side Firebase Web SDK v12 modular architecture.
   - Security enforced server-side via granular `firestore.rules` and `storage.rules`.
   - Free Spark plan compatible — zero paid Cloud Functions required.

---

## 🔐 Administrative Account Setup

### Step 1: Create an Admin User in Firebase Auth
1. Navigate to [Firebase Console → Authentication → Users](https://console.firebase.google.com/project/rog-id-test-84920/authentication/users).
2. Click **Add user**, enter your corporate email address and a secure password.

### Step 2: Grant the Admin Custom Claim
Run the administrative script locally on your workstation to grant the `admin: true` token claim:

```bash
cd scripts
npm install
```

Generate a private key at:
[Firebase Console → Project settings → Service accounts → Generate new private key](https://console.firebase.google.com/project/rog-id-test-84920/settings/serviceaccounts/adminsdk)

Save the downloaded JSON file as:
`scripts/service-account.json` *(already excluded in `.gitignore`)*.

Execute:
```bash
node set-admin.js you@richardsonoilandgas.com
```

To revoke administrative access later:
```bash
node set-admin.js you@richardsonoilandgas.com --revoke
```

### Step 3: Sign In
Navigate to [https://rog-id-test-84920.web.app/admin/login.html](https://rog-id-test-84920.web.app/admin/login.html) and sign in.

---

## 🛠 Local Development & Deployment

### Run Locally
```bash
# Using Python
python -m http.server 8080 --directory public

# Or using Node / npx
npx serve public
```

### Deploy Updates to Firebase
```bash
firebase deploy --only firestore:rules,hosting
```

---

## 🏷️ Custom Subdomain Setup (Optional)

To connect `id.richardsonoilandgas.com`:
1. Go to **Firebase Console → Hosting → Add custom domain**.
2. Enter `id.richardsonoilandgas.com`.
3. Add the TXT and A DNS records provided by Firebase into your DNS provider (e.g. Ultracrest / Webflow DNS manager).
4. Firebase automatically provisions an SSL certificate. All generated badges and QR links will automatically reflect the custom domain.
