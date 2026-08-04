const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Supabase URL or Key is missing from Environment Variables!");
    console.error("SUPABASE_URL:", supabaseUrl, "SUPABASE_KEY:", supabaseKey ? "Exists" : "Undefined");
    console.error("Keys in process.env:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

module.exports = supabase;
