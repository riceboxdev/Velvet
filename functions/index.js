const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const waitlistsRoutes = require('./routes/waitlists');
const waitlistRoutes = require('./routes/waitlist');
const signupRoutes = require('./routes/signup');
const settingsRoutes = require('./routes/settings');

// Mount routes - Note: no /api prefix since the function itself is named "api"
app.use('/auth', authRoutes);
app.use('/waitlists', waitlistsRoutes);
app.use('/waitlist', waitlistRoutes);  // Public waitlist info (singular)
app.use('/signups', signupRoutes);
app.use('/signup', signupRoutes); // Public signup endpoint
app.use('/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Export Cloud Function
exports.backend = onRequest({ region: 'us-central1' }, app);
