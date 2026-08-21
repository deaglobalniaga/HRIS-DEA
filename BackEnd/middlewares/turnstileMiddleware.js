const axios = require('axios');

const verifyTurnstile = async (req, res, next) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    // If Turnstile secret key is not configured (e.g. in local development), bypass check
    if (!secret || secret === 'your_turnstile_secret_key_here') {
        return next();
    }

    const token = req.body.cf_turnstile_response || req.headers['cf-turnstile-response'];
    if (!token) {
        // No token provided — reject with clear message (both dev and production)
        return res.status(403).json({ error: 'Verifikasi keamanan diperlukan. Silakan muat ulang halaman.' });
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
        // If Cloudflare Turnstile is unreachable, log and allow through
        // Do NOT block legitimate users due to 3rd-party service failures
        console.error('Turnstile verification error (non-blocking):', err.message);
        return next();
    }
};

module.exports = verifyTurnstile;
