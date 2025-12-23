require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
// On Render, we'll use a service account passed via environment variable
let serviceAccount = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('[Firebase] Successfully parsed SERVICE_ACCOUNT');
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

module.exports = db;
