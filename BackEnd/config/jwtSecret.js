const crypto = require('crypto');
const Setting = require('../models/Setting');

let cachedSecret = null;

const getJwtSecret = async () => {
    if (cachedSecret) return cachedSecret;
    
    // Fallback to env var first for reliability
    if (process.env.JWT_SECRET) {
        cachedSecret = process.env.JWT_SECRET;
        return cachedSecret;
    }

    try {
        let setting = await Setting.findOne({ key: 'jwt_secret' });
        if (!setting) {
            // Generate a new random secret if none exists
            const newSecret = crypto.randomBytes(32).toString('hex');
            setting = new Setting({ 
                key: 'jwt_secret', 
                value: newSecret,
                label: 'JWT Secret Key',
                category: 'sistem'
            });
            await setting.save();
        }
        cachedSecret = setting.value;
        return cachedSecret;
    } catch (err) {
        // If DB lookup fails, use env var or hardcoded fallback
        const fallback = process.env.JWT_SECRET || 'hris_dea_secret_fallback_2026';
        cachedSecret = fallback;
        return cachedSecret;
    }
};

const updateJwtSecret = async (newSecret) => {
    let setting = await Setting.findOne({ key: 'jwt_secret' });
    if (!setting) {
        setting = new Setting({ 
            key: 'jwt_secret', 
            value: newSecret,
            label: 'JWT Secret Key',
            category: 'sistem'
        });
    } else {
        setting.value = newSecret;
    }
    await setting.save();
    cachedSecret = newSecret;
    return cachedSecret;
};

module.exports = { getJwtSecret, updateJwtSecret };

