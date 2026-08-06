const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/KRAVEN/Documents/DGN/project/HRIS/BackEnd/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    const hash = await bcrypt.hash('12345678', 10);
    await supabase.from('users').update({ password: hash }).eq('username', 'arya_admin');
    console.log('Password updated for arya_admin');
}
run();
