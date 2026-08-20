/**
 * Vercel Serverless Entry Point - Test api/node_modules
 */
const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/ping', (req, res) => {
    let results = {};
    const mods = ['bcryptjs','jsonwebtoken','cors','helmet','dotenv','multer','nodemailer','speakeasy','web-push','ua-parser-js','@supabase/supabase-js','express-rate-limit'];
    for (const m of mods) {
        try { require(m); results[m] = 'OK'; } catch(e) { results[m] = 'FAIL: ' + e.message.substring(0,80); }
    }
    // test BackEnd relative path
    try { require('../BackEnd/config/supabase'); results['supabase_config'] = 'OK'; } catch(e) { results['supabase_config'] = 'FAIL: ' + e.message.substring(0,80); }
    res.json({ status: 'api_node_modules_test', node: process.version, modules: results });
});

app.get('/api/settings/public', (req, res) => {
    res.json({ company_name: 'PT DEA GLOBAL NIAGA', brand_name: 'DEA Global Niaga', status: 'api_package_json_test_mode' });
});

app.post('/api/auth/login', (req, res) => {
    res.json({ message: 'test mode - modules only' });
});

app.use('*', (req, res) => {
    res.json({ path: req.path, method: req.method, status: 'api_package_json_test_mode' });
});

module.exports = app;
