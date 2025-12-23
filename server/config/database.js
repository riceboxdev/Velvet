require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
// On Render, we'll use a service account passed via environment variable
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('[Firebase] Initialized with Service Account');
} else {
  // Local development fallback (uses default credentials)
  admin.initializeApp();
  console.log('[Firebase] Initialized with Default Credentials');
}

const db = admin.firestore();

// Ensure settings exist
db.settings({ ignoreUndefinedProperties: true });

module.exports = db;
