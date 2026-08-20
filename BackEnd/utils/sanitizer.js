/**
 * Security & Sanitization Utilities
 * PT DEA GLOBAL NIAGA HRIS Enterprise Security
 */

// 1. Anti-XSS: Recursively sanitize and strip dangerous HTML/script tags
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/<[^>]*>/g, '') // strip all HTML tags
        .trim();
};

const sanitizeInput = (obj) => {
    if (!obj || typeof obj !== 'object') {
        return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeInput(item));
    }
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = sanitizeInput(value);
    }
    return cleaned;
};

// 2. Anti-SQLi: Escape dangerous characters in search terms
const sanitizeSearchQuery = (query) => {
    if (typeof query !== 'string') return '';
    return query
        .replace(/['";\\]/g, '') // remove quotes, semicolons, backslashes
        .replace(/--/g, '')      // remove SQL comment indicators
        .replace(/\/\*/g, '')    // remove multi-line comment start
        .replace(/\*\//g, '')    // remove multi-line comment end
        .trim();
};

// 3. File Upload Validator: Whitelist PDF, JPG, PNG, WEBP and reject malicious extensions
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const DANGEROUS_EXTENSIONS = ['.exe', '.php', '.phtml', '.php3', '.php4', '.php5', '.sh', '.bat', '.cmd', '.js', '.vbs', '.html', '.htm', '.svg', '.jar', '.dll'];

const validateUploadedFile = (file) => {
    if (!file) return { valid: false, error: 'File tidak ditemukan' };
    
    // Check file size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'Ukuran file melebihi batas maksimal 5MB' };
    }

    const originalName = (file.originalname || file.name || '').toLowerCase();
    const ext = originalName.slice(originalName.lastIndexOf('.'));

    // Check for dangerous extensions
    if (DANGEROUS_EXTENSIONS.includes(ext) || originalName.includes('.php') || originalName.includes('.svg')) {
        return { valid: false, error: 'Tipe file berbahaya terdeteksi dan diblokir oleh sistem keamanan' };
    }

    // Check against allowed extensions
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: 'Format file tidak diizinkan. Hanya PDF, JPG, PNG, dan WEBP yang diperbolehkan' };
    }

    // Check MIME type
    if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
        return { valid: false, error: 'MIME-type file tidak valid' };
    }

    return { valid: true };
};

// 4. GPS Anti-Spoofing & Geofence Validator
const validateGPSCoordinates = ({ lat, lng, accuracy, timestamp }) => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedAccuracy = parseFloat(accuracy);

    // Reject null / NaN / zero coordinates
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
        return { valid: false, error: 'Koordinat GPS tidak valid' };
    }

    if (parsedLat === 0 && parsedLng === 0) {
        return { valid: false, error: 'Koordinat GPS 0,0 terdeteksi (Mock Location terindikasi)' };
    }

    // Check coordinate boundaries (Indonesia latitude approx -11 to 6, longitude 95 to 141)
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
        return { valid: false, error: 'Koordinat GPS berada di luar jangkauan geografis bumi' };
    }

    // Accuracy threshold check (reject if accuracy > 200 meters)
    if (!isNaN(parsedAccuracy) && parsedAccuracy > 250) {
        return { valid: false, error: `Akurasi sinyal GPS terlalu lemah (${Math.round(parsedAccuracy)}m). Pastikan Anda berada di area terbuka dan nyalakan High Accuracy GPS` };
    }

    // Freshness check: reject timestamps older than 10 minutes
    if (timestamp) {
        const gpsTime = new Date(timestamp).getTime();
        const now = Date.now();
        if (!isNaN(gpsTime) && Math.abs(now - gpsTime) > 10 * 60 * 1000) {
            return { valid: false, error: 'Sinyal waktu GPS kedaluwarsa. Silakan segarkan halaman presensi' };
        }
    }

    return { valid: true, lat: parsedLat, lng: parsedLng };
};

// 5. Haversine Distance Calculation (in meters)
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

module.exports = {
    sanitizeString,
    sanitizeInput,
    sanitizeSearchQuery,
    validateUploadedFile,
    validateGPSCoordinates,
    calculateDistanceMeters
};
