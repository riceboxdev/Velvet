require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
// Supports both raw JSON and base64-encoded service account
let serviceAccount = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Base64 encoded (cleaner for env vars)
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
    console.log('[Firebase] Successfully parsed SERVICE_ACCOUNT from base64');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Raw JSON (legacy support)
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('[Firebase] Successfully parsed SERVICE_ACCOUNT from JSON');
  }
} catch (error) {
  console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT:', error.message);
}

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Initialized with Service Account');
  } catch (err) {
    console.error('[Firebase] Failed to initialize with Service Account:', err.message);
    admin.initializeApp(); // Fallback
  }
} else {
  // Local development fallback (uses default credentials)
  admin.initializeApp();
  console.log('[Firebase] Initialized with Default Credentials');
}

const db = admin.firestore();

// Ensure settings exist
db.settings({ ignoreUndefinedProperties: true });

module.exports = { db, auth: admin.auth() };
