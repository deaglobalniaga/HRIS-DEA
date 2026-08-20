const crypto = require('crypto');
const supabase = require('./supabase');

let cachedConfig = null;
let lastFetchTime = 0;

/**
 * Fetches security & JWT configuration from database with in-memory caching
 */
const getSecurityConfig = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedConfig && (now - lastFetchTime < 30000)) {
        return cachedConfig;
    }

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('setting_key, setting_value')
            .in('setting_key', [
                'jwt_secret',
                'jwt_expiry_hours',
                'jwt_expiry_minutes',
                'jwt_expiry_value',
                'jwt_expiry_unit',
                'session_idle_timeout_minutes',
                'otp_validity_minutes',
                'otp_cooldown_minutes',
                'max_login_attempts'
            ]);

        const map = {};
        if (data && data.length > 0) {
            data.forEach(item => {
                map[item.setting_key] = item.setting_value;
            });
        }

        const jwtSecret = map.jwt_secret || process.env.JWT_SECRET || 'hris_dea_enterprise_secret_key_2026_super_secure';
        
        // Calculate exact seconds TTL
        const jwtExpiryUnit = (map.jwt_expiry_unit || (map.jwt_expiry_minutes ? 'minutes' : 'hours')).toLowerCase();
        let jwtExpiryValue = 5;
        if (map.jwt_expiry_value !== undefined && map.jwt_expiry_value !== null) {
            jwtExpiryValue = Number(map.jwt_expiry_value) || 5;
        } else if (map.jwt_expiry_minutes) {
            jwtExpiryValue = Number(map.jwt_expiry_minutes) || 300;
        } else if (map.jwt_expiry_hours) {
            jwtExpiryValue = Number(map.jwt_expiry_hours) || 5;
        }

        let totalSeconds = 5 * 3600;
        if (jwtExpiryUnit === 'minutes' || jwtExpiryUnit === 'menit') {
            totalSeconds = Math.max(10, Math.round(jwtExpiryValue * 60));
        } else if (jwtExpiryUnit === 'days' || jwtExpiryUnit === 'hari') {
            totalSeconds = Math.max(60, Math.round(jwtExpiryValue * 86400));
        } else {
            totalSeconds = Math.max(60, Math.round(jwtExpiryValue * 3600));
        }

        const sessionIdleTimeoutMinutes = Number(map.session_idle_timeout_minutes) || 30;
        const otpValidityMinutes = Number(map.otp_validity_minutes) || 10;
        const otpCooldownMinutes = Number(map.otp_cooldown_minutes) || 10;
        const maxLoginAttempts = Number(map.max_login_attempts) || 15;

        cachedConfig = {
            jwtSecret,
            jwtExpirySeconds: totalSeconds,
            jwtExpiryHours: totalSeconds / 3600,
            jwtExpiryMinutes: Math.round(totalSeconds / 60),
            jwtExpiryValue,
            jwtExpiryUnit,
            sessionIdleTimeoutMinutes,
            otpValidityMinutes,
            otpCooldownMinutes,
            maxLoginAttempts
        };
        lastFetchTime = now;

        return cachedConfig;
    } catch (err) {
        console.error('Error loading security config from settings:', err);
        return {
            jwtSecret: process.env.JWT_SECRET || 'hris_dea_enterprise_secret_key_2026_super_secure',
            jwtExpirySeconds: 5 * 3600,
            jwtExpiryHours: 5,
            jwtExpiryMinutes: 300,
            jwtExpiryValue: 5,
            jwtExpiryUnit: 'hours',
            sessionIdleTimeoutMinutes: 30,
            otpValidityMinutes: 10,
            otpCooldownMinutes: 10,
            maxLoginAttempts: 15
        };
    }
};

const getJwtSecret = async () => {
    const config = await getSecurityConfig();
    return config.jwtSecret;
};

const getJwtExpiry = async () => {
    const config = await getSecurityConfig();
    return `${config.jwtExpiryHours}h`;
};

const invalidateSecurityConfigCache = () => {
    cachedConfig = null;
    lastFetchTime = 0;
};

module.exports = {
    getSecurityConfig,
    getJwtSecret,
    getJwtExpiry,
    invalidateSecurityConfigCache
};
