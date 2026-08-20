const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
}

// Gunakan parameter auth jika perlu untuk mengelola session, 
// tapi untuk server-to-server biasanya kita tidak pakai auth session persistence.
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

module.exports = supabase;
