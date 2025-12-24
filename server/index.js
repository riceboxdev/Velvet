const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Firebase Admin (must happen before routes)
require('./config/database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
    'http://localhost:3000', // Nuxt
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const waitlistsRoutes = require('./routes/waitlists');
const waitlistRoutes = require('./routes/waitlist');
const signupRoutes = require('./routes/signup');
const settingsRoutes = require('./routes/settings');
const zapierRoutes = require('./routes/zapier');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/waitlists', waitlistsRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/signups', signupRoutes);
app.use('/api/signup', signupRoutes); // Public signup endpoint
app.use('/api/settings', settingsRoutes);
app.use('/api/zapier', zapierRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v2-debug-auth-logging' });
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Waitlist API server running on http://0.0.0.0:${PORT}`);
    console.log('[Firebase] Backend using Firestore');
});

module.exports = app;
