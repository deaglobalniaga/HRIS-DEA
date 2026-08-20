/**
 * Vercel Serverless Entry Point - Ultra Minimal Test
 */
const express = require('express');
const app = express();

// Load env vars
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../BackEnd/.env') });

app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', env_supabase: !!process.env.SUPABASE_URL, node: process.version });
});

app.get('/api/settings/public', (req, res) => {
    res.json({ 
        company_name: 'PT DEA GLOBAL NIAGA',
        brand_name: 'DEA Global Niaga',
        status: 'MINIMAL_MODE - testing serverless function routing'
    });
});

app.post('/api/auth/login', (req, res) => {
    res.json({ 
        message: 'Minimal mode - testing routing only',
        body_received: !!req.body
    });
});

app.use('*', (req, res) => {
    res.json({ path: req.path, method: req.method, status: 'minimal_mode' });
});

module.exports = app;
