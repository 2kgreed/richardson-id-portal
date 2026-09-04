// Zero-dependency administrator claims manager for Richardson Oil and Gas Portal.
// Uses Node's built-in crypto and fetch to authenticate directly with Google Identity Toolkit.
//
// Usage:
//   node set-admin.js someone@richardsonoilandgas.com
//   node set-admin.js someone@richardsonoilandgas.com --revoke

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const saPath = path.join(__dirname, 'service-account.json');
if (!fs.existsSync(saPath)) {
  console.error('Error: scripts/service-account.json not found.');
  console.error('Download a private key from Firebase Console -> Project settings -> Service accounts.');
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));

function getSignedJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase'
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  sign.end();
  const signature = sign.sign(sa.private_key, 'base64url');

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken() {
  const jwt = getSignedJwt();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to obtain Google access token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes('--revoke');

  if (!email || email.startsWith('--')) {
    console.error('Usage: node set-admin.js <email> [--revoke]');
    process.exit(1);
  }

  console.log(`Connecting to Firebase Auth for project ${sa.project_id}...`);
  const token = await getAccessToken();

  // Look up user by email
  const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:lookup`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: [email] })
  });
  const lookupData = await lookupRes.json();
  const user = lookupData.users && lookupData.users[0];

  if (!user) {
    console.error(`Error: User "${email}" not found in Firebase Authentication.`);
    console.error('Create the user first in Firebase Console -> Authentication -> Users.');
    process.exit(1);
  }

  // Update custom attributes
  const updateRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      localId: user.localId,
      customAttributes: JSON.stringify({ admin: !revoke })
    })
  });

  if (!updateRes.ok) {
    const err = await updateRes.json();
    console.error('Failed to update claims:', err);
    process.exit(1);
  }

  console.log(`${revoke ? 'Revoked' : 'Granted'} admin claim for ${email} (UID: ${user.localId}).`);
  console.log('If the user is currently signed in, they need to sign out and back in for token refresh.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
