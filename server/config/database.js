require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
// Supports both raw JSON and base64-encoded service account
let serviceAccount = null;
// Fallback: if no env var provided, try loading the local service account JSON file
if (!serviceAccount) {
  try {
    const path = require('path');
    const fs = require('fs');
    const localPath = path.resolve(__dirname, '../../velvet-fc372-firebase-adminsdk-fbsvc-c23cdb6bbd.json');
    if (fs.existsSync(localPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      console.log('[Firebase] Loaded service account from local file');
    }
  } catch (e) {
    console.error('[Firebase] Failed to load local service account file:', e.message);
  }
}

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Base64 encoded (cleaner for env vars)
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
    console.log('[Firebase] Successfully parsed SERVICE_ACCOUNT from base64');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Raw JSON (legacy support)
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    // Sometimes newlines are escaped as literal \n strings in env vars, we need to handle that if JSON.parse fails initially
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      console.log('[Firebase] JSON parse failed, attempting to fix escaped newlines...');
      // If the private key has real newlines that break JSON.parse, this might help,
      // but robust env vars should be single line.
      // If the user pasted a string with real newlines, JSON.parse might fail.
      serviceAccount = JSON.parse(raw); // Retrying effectively just to let the catch block below handle fatal errors
    }
    console.log('[Firebase] Successfully parsed SERVICE_ACCOUNT from JSON');
  }
} catch (error) {
  console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT:', error.message);
  // Do not crash here, let the next block handle null serviceAccount
}

let db = null;
let auth = null;


try {
  if (serviceAccount) {
    // If private_key has literal "\n" characters, Firebase SDK might need them to be real newlines
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Initialized with Service Account: ' + serviceAccount.project_id);
  } else {
    // Check if we are in production. If so, don't just try default creds blindly if they might crash
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Firebase] WARNING: No Service Account provided in production. Attempting default credentials...');
    }

    // Local development fallback (uses default credentials)
    admin.initializeApp();
    console.log('[Firebase] Initialized with Default Credentials');
  }

  db = admin.firestore();
  auth = admin.auth();

  // Ensure settings exist
  db.settings({ ignoreUndefinedProperties: true });

} catch (err) {
  console.error('[Firebase] CRITICAL ERROR: Failed to initialize Firebase:', err.message);
  // Do NOT crash the process. Instead, let it run so health check works.
  // We'll export nulls, and routes that need DB will fail gracefully or 500.
}

module.exports = { db, auth };
