const cron = require('node-cron');
const supabase = require('../config/supabase');
const webpush = require('web-push');

// 08:30 WITA = 00:30 UTC
cron.schedule('30 0 * * *', async () => {
    console.log('[CRON] Running 08:30 WITA check-in reminder...');
    try {
        const witaTime = new Date();
        witaTime.setUTCHours(witaTime.getUTCHours() + 8);
        witaTime.setUTCHours(0, 0, 0, 0);
        witaTime.setUTCHours(witaTime.getUTCHours() - 8);
        const startOfDayUTC = witaTime.toISOString();
        const endOfDayUTC = new Date(witaTime.getTime() + 86400000 - 1).toISOString();

        // Get all active users
        const { data: users } = await supabase.from('users').select('id, full_name, username').eq('status', 'active');
        
        // Get users who have checked in today
        const { data: attendances } = await supabase.from('attendance').select('user_id').eq('type', 'Check In').gte('timestamp', startOfDayUTC).lte('timestamp', endOfDayUTC);
        const checkedInUserIds = new Set((attendances || []).map(a => a.user_id));

        // Users who haven't checked in
        const usersToRemind = (users || []).filter(u => !checkedInUserIds.has(u.id));

        for (const u of usersToRemind) {
            const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, keys').eq('user_id', u.id);
            if (subs && subs.length > 0) {
                const payload = JSON.stringify({
                    title: 'Waktunya Check-In!',
                    body: 'Halo ' + (u.full_name || u.username || 'Karyawan') + ', jangan lupa melakukan Check-In absensi pagi ini ya!'
                });
                for (const sub of subs) {
                    webpush.sendNotification(sub, payload).catch(err => {
                        console.error('Error sending push to', u.id, err);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).then();
                        }
                    });
                }
            }
        }
    } catch (e) { console.error('Cron Error Check-In:', e); }
});

// 17:30 WITA = 09:30 UTC
cron.schedule('30 9 * * *', async () => {
    console.log('[CRON] Running 17:30 WITA check-out reminder...');
    try {
        const witaTime = new Date();
        witaTime.setUTCHours(witaTime.getUTCHours() + 8);
        witaTime.setUTCHours(0, 0, 0, 0);
        witaTime.setUTCHours(witaTime.getUTCHours() - 8);
        const startOfDayUTC = witaTime.toISOString();
        const endOfDayUTC = new Date(witaTime.getTime() + 86400000 - 1).toISOString();

        const { data: users } = await supabase.from('users').select('id, full_name, username').eq('status', 'active');
        
        // Get users who checked in but haven't checked out
        const { data: checkIns } = await supabase.from('attendance').select('user_id').eq('type', 'Check In').gte('timestamp', startOfDayUTC).lte('timestamp', endOfDayUTC);
        const { data: checkOuts } = await supabase.from('attendance').select('user_id').eq('type', 'Check Out').gte('timestamp', startOfDayUTC).lte('timestamp', endOfDayUTC);
        
        const checkedInIds = new Set((checkIns || []).map(a => a.user_id));
        const checkedOutIds = new Set((checkOuts || []).map(a => a.user_id));

        const usersToRemind = (users || []).filter(u => checkedInIds.has(u.id) && !checkedOutIds.has(u.id));

        for (const u of usersToRemind) {
            const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, keys').eq('user_id', u.id);
            if (subs && subs.length > 0) {
                const payload = JSON.stringify({
                    title: 'Waktunya Check-Out!',
                    body: 'Halo ' + (u.full_name || u.username || 'Karyawan') + ', jam kerja sudah usai. Jangan lupa Check-Out!'
                });
                for (const sub of subs) {
                    webpush.sendNotification(sub, payload).catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).then();
                        }
                    });
                }
            }
        }
    } catch (e) { console.error('Cron Error Check-Out:', e); }
});

console.log('Cron jobs for Push Notifications initialized.');
