const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: SUPABASE_URL or SUPABASE_KEY environment variable is missing!");
    throw new Error("Missing Supabase environment variables: SUPABASE_URL and SUPABASE_KEY must be provided");
}

// Gunakan parameter auth jika perlu untuk mengelola session, 
// tapi untuk server-to-server biasanya kita tidak pakai auth session persistence.
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

module.exports = supabase;
