const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In Cloud Functions, this uses default credentials automatically
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
