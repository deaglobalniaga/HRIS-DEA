/**
 * Vercel Serverless Entry Point - Diagnostic Mode
 * Tests each module in isolation to find crash root cause
 */

// Collect all errors/status
const diagnostics = [];

function tryLoad(label, fn) {
    try {
        fn();
        diagnostics.push({ label, status: 'OK' });
    } catch (e) {
        diagnostics.push({ label, status: 'FAILED', error: e.message, stack: e.stack?.split('\n').slice(0, 5).join(' | ') });
    }
}

// Test each module individually
tryLoad('express', () => require('express'));
tryLoad('cors', () => require('cors'));
tryLoad('helmet', () => require('helmet'));
tryLoad('dotenv', () => require('dotenv'));
tryLoad('bcryptjs', () => require('bcryptjs'));
tryLoad('jsonwebtoken', () => require('jsonwebtoken'));
tryLoad('cookie-parser', () => require('cookie-parser'));
tryLoad('express-rate-limit', () => require('express-rate-limit'));
tryLoad('multer', () => require('multer'));
tryLoad('nodemailer', () => require('nodemailer'));
tryLoad('qrcode', () => require('qrcode'));
tryLoad('speakeasy', () => require('speakeasy'));
tryLoad('ua-parser-js', () => require('ua-parser-js'));
tryLoad('web-push', () => require('web-push'));
tryLoad('xlsx', () => require('xlsx'));
tryLoad('docx', () => require('docx'));
tryLoad('marked', () => require('marked'));
tryLoad('axios', () => require('axios'));
tryLoad('redis', () => require('redis'));
tryLoad('node-cron', () => require('node-cron'));
tryLoad('googleapis', () => require('googleapis'));
tryLoad('jsdom', () => require('jsdom'));
tryLoad('dompurify', () => require('dompurify'));
tryLoad('sharp (optional)', () => { try { require('sharp'); } catch(e) { /* optional, ignore */ } });

// Test config modules
tryLoad('supabase config', () => require('../BackEnd/config/supabase'));

// Test utils
tryLoad('sanitizer utils', () => require('../BackEnd/utils/sanitizer'));
tryLoad('cache utils', () => require('../BackEnd/utils/cache'));

// Test full app load
let app;
tryLoad('FULL SERVER LOAD', () => {
    app = require('../BackEnd/server.js');
});

if (!app) {
    // Fallback: return diagnostics as JSON response
    const express = require('express');
    const fallback = express();
    fallback.use('*', (req, res) => {
        res.json({ 
            mode: 'DIAGNOSTIC',
            diagnostics: diagnostics,
            failed: diagnostics.filter(d => d.status === 'FAILED')
        });
    });
    module.exports = fallback;
} else {
    module.exports = app;
}
