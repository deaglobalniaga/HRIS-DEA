const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { sanitizeInput } = require('./utils/sanitizer');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable trust proxy for accurate IP resolution behind Vite proxy/Nginx
app.set('trust proxy', 1);

// 1. Anti-Clickjacking & Comprehensive Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "*"],
            connectSrc: ["'self'", "https:", "wss:", "*"],
            frameAncestors: ["'none'"], // Strict Anti-Clickjacking
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        }
    },
    frameguard: { action: 'deny' }, // Anti-Clickjacking Header: X-Frame-Options: DENY
    xssFilter: true, // X-XSS-Protection: 1; mode=block
    noSniff: true,   // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// 2. CORS & Cookie Parser
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Global Input Sanitization Middleware (Anti-XSS)
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeInput(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeInput(req.query);
    }
    next();
});

// 4. Traffic Defense & Rate Limiters (Layer 3, 4, dan 7 DoS / DDoS & Brute-Force Attack Shield)
// A. Strict Login & MFA Brute-Force Defense (Layer 7 Application Protection - 15 attempts per 15 mins)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // Allow exactly 15 login/mfa attempts per 15 minutes before temporary lockout
    skip: (req) => req.method === 'OPTIONS', // Ensure CORS preflight requests do not consume rate limit attempts
    validate: { xForwardedForHeader: false },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak percobaan autentikasi. Akun terkunci sementara demi keamanan, silakan coba lagi setelah 15 menit.' }
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/mfa/verify', loginLimiter);

// B. Heavy Computation & Export Traffic Limiter (Layer 4/7 Resource Starvation Protection)
const exportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skip: (req) => req.method === 'OPTIONS',
    validate: { xForwardedForHeader: false },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Batas frekuensi ekspor data tercapai, silakan coba beberapa saat lagi.' }
});
app.use('/api/hris/reports', exportLimiter);

// C. General API Flood Limiter (Layer 3/4/7 Volumetric DoS / DDoS Mitigation - 3,000 requests per 15 mins per IP)
const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000,
    skip: (req) => req.method === 'OPTIONS',
    validate: { xForwardedForHeader: false },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Batas permintaan API tercapai (Layer 3/4/7 DoS Shield Active), silakan coba lagi beberapa saat lagi.' }
});
app.use('/api/', globalApiLimiter);

// 5. Modular HRIS Routes (Supabase Cloud Architecture)
app.use('/api/hris', require('./routes/employeeRoutes'));
app.use('/api/hris', require('./routes/attendanceRoutes'));
app.use('/api/hris', require('./routes/dashboardRoutes'));
app.use('/api/hris', require('./routes/analyticsRoutes'));
app.use('/api/hris', require('./routes/certificationRoutes'));
app.use('/api/hris', require('./routes/leaveRoutes'));
app.use('/api/hris', require('./routes/performanceRoutes'));
app.use('/api/hris', require('./routes/notificationRoutes'));
app.use('/api/hris', require('./routes/reportRoutes'));
app.use('/api/hris', require('./routes/calendarRoutes'));
app.use('/api/hris', require('./routes/permissionRoutes'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));

// Initialize Cron Jobs (Only in traditional server mode, not in Vercel Serverless)
if (!process.env.VERCEL) {
    require('./utils/cronJobs');
}

app.get('/', (req, res) => {
    res.json({
        service: 'HRIS PT DEA GLOBAL NIAGA Cloud API',
        status: 'Operational & Protected',
        version: '1.1.0-Enterprise',
        security: 'Strict RBAC & MFA Enforced'
    });
});

// Global 404 & Error Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.use((err, req, res, next) => {
    console.error('Unhandled Application Error:', err);

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Ukuran file terlalu besar! Maksimal ukuran file adalah 15MB.' });
        }
        return res.status(400).json({ error: `Gagal mengunggah file: ${err.message}` });
    }

    if (err.message && (err.message.includes('Tipe berkas') || err.message.includes('Hanya file'))) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Terjadi kesalahan pada server. Permintaan telah diamankan.' });
});

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🛡️ HRIS PT DEA GLOBAL NIAGA Server running on port ${PORT} with Enterprise Cybersecurity Shield`);
    });
}

module.exports = app;
