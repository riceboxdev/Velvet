const rateLimit = {};

// Simple in-memory rate limiter
const rateLimiter = (options = {}) => {
    const { windowMs = 60000, max = 100, message = 'Too many requests' } = options;

    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();

        if (!rateLimit[key]) {
            rateLimit[key] = { count: 1, resetAt: now + windowMs };
        } else if (rateLimit[key].resetAt < now) {
            rateLimit[key] = { count: 1, resetAt: now + windowMs };
        } else {
            rateLimit[key].count++;
        }

        if (rateLimit[key].count > max) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message,
                retryAfter: Math.ceil((rateLimit[key].resetAt - now) / 1000)
            });
        }

        next();
    };
};

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const key in rateLimit) {
        if (rateLimit[key].resetAt < now) {
            delete rateLimit[key];
        }
    }
}, 60000);

module.exports = { rateLimiter };
