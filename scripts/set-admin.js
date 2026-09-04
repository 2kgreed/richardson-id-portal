// Run this locally whenever you need to grant (or revoke) admin access.
// It never runs in the browser and is not deployed with `firebase deploy`
// for Hosting — that's what keeps this on the free Spark plan, since a
// Cloud Function equivalent would require enabling Blaze billing.
//
// Setup (one time):
//   cd scripts
//   npm install
//   Download a service account key: Firebase Console -> Project settings
//   -> Service accounts -> Generate new private key. Save it as
//   scripts/service-account.json (already in .gitignore — never commit it).
//
// Usage:
//   node set-admin.js someone@richardsonoilandgas.com
//   node set-admin.js someone@richardsonoilandgas.com --revoke

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("Usage: node set-admin.js <email> [--revoke]");
    process.exit(1);
  }

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: !revoke });

  console.log(`${revoke ? "Revoked" : "Granted"} admin claim for ${email} (uid: ${user.uid}).`);
  console.log("They need to sign out and back in for the change to take effect.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
