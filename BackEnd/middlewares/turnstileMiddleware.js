const axios = require('axios');

const verifyTurnstile = async (req, res, next) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    // If Turnstile secret key is not configured (e.g. in local development), bypass check
    if (!secret || secret === 'your_turnstile_secret_key_here') {
        return next();
    }

    const token = req.body.cf_turnstile_response || req.headers['cf-turnstile-response'];
    if (!token) {
        // If secret is set but no token is passed, allow bypass in development or reject if in production
        if (process.env.NODE_ENV !== 'production') {
            return next();
        }
        return res.status(403).json({ error: 'Turnstile token missing' });
    }

    try {
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: secret,
            response: token,
            remoteip: req.ip
        });

        if (response.data.success) {
            next();
        } else {
            return res.status(403).json({ error: 'Turnstile verification failed', details: response.data['error-codes'] });
        }
    } catch (err) {
        console.error('Turnstile verification error:', err.message);
        if (process.env.NODE_ENV !== 'production') {
            return next(); // Fallback in development
        }
        return res.status(500).json({ error: 'Internal Server Error during Turnstile verification' });
    }
};

module.exports = verifyTurnstile;
