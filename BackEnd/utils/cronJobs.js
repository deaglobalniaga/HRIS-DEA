const cron = require('node-cron');
const supabase = require('../config/supabase');
const webpush = require('web-push');
const mailer = require('./mailer');
require('dotenv').config();

const DEFAULT_VAPID_PUBLIC = 'BHGknLvnvRgrQkNM9KgYts4Z-IrSJiDH8w0jPlUZ_vlGq3jQBvSO9DORscZ0AjyqD9V_qGyCtJFlKr_-pvjQHeE';
const vapidPublic = process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
    try {
        webpush.setVapidDetails(
            process.env.CONTACT_EMAIL || 'mailto:admin@deaglobalniaga.com',
            vapidPublic,
            vapidPrivate
        );
    } catch (vErr) {
        console.warn('VAPID setup warning in cron:', vErr.message);
    }
}

// Helper to get current WITA date string (YYYY-MM-DD)
const getWitaDateStr = () => {
    const wita = new Date(Date.now() + 8 * 3600 * 1000);
    return wita.toISOString().split('T')[0];
};

// 1. Morning Check-In Reminder (08:30 WITA = 00:30 UTC)
cron.schedule('30 0 * * *', async () => {
    console.log('[CRON] Running 08:30 WITA check-in reminder...');
    try {
        const today = getWitaDateStr();

        // 1. Get all active employees with a linked user_id
        const { data: employees, error: empErr } = await supabase
            .from('employees')
            .select('id, user_id, nama_lengkap')
            .not('user_id', 'is', null);

        if (empErr || !employees || employees.length === 0) return;

        // 2. Get today's attendance logs
        const { data: todayLogs } = await supabase
            .from('attendance_logs')
            .select('employee_id, check_in')
            .eq('date', today);

        const checkedInEmpIds = new Set((todayLogs || []).filter(l => !!l.check_in).map(l => l.employee_id));

        // 3. Find employees who haven't clocked in yet
        const unclocked = employees.filter(e => !checkedInEmpIds.has(e.id));
        const unclockedUserIds = unclocked.map(e => e.user_id).filter(Boolean);

        if (unclockedUserIds.length === 0) return;

        // 4. Fetch push subscriptions
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys, user_id')
            .in('user_id', unclockedUserIds);

        const payload = JSON.stringify({
            title: '⏰ Pengingat Presensi Masuk (Check-In)',
            body: 'Selamat pagi! Jangan lupa untuk melakukan Presensi Masuk di HRIS PT DEA GLOBAL NIAGA hari ini.',
            icon: '/dea.png',
            badge: '/dea.png'
        });

        // 5. Create in-app notification rows
        const notifRows = unclockedUserIds.map(uId => ({
            user_id: uId,
            title: '⏰ Pengingat Presensi Masuk (Check-In)',
            message: 'Selamat pagi! Jangan lupa untuk melakukan Presensi Masuk hari ini.',
            type: 'warning',
            link: '/attendance-hub',
            is_read: false
        }));
        await supabase.from('notifications').insert(notifRows).catch(() => {});

        // 6. Send push notifications
        if (subs && subs.length > 0) {
            for (const sub of subs) {
                webpush.sendNotification(sub, payload).catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).then();
                    }
                });
            }
        }
        console.log(`[CRON] Sent check-in reminder to ${unclocked.length} employees (${subs ? subs.length : 0} push endpoints).`);
    } catch (e) {
        console.error('[CRON] Error Check-In Reminder:', e);
    }
});

// 2. Afternoon Check-Out Reminder (17:30 WITA = 09:30 UTC)
cron.schedule('30 9 * * *', async () => {
    console.log('[CRON] Running 17:30 WITA check-out reminder...');
    try {
        const today = getWitaDateStr();

        // 1. Get all active employees with a linked user_id
        const { data: employees } = await supabase
            .from('employees')
            .select('id, user_id, nama_lengkap')
            .not('user_id', 'is', null);

        if (!employees || employees.length === 0) return;

        // 2. Get today's attendance logs
        const { data: todayLogs } = await supabase
            .from('attendance_logs')
            .select('employee_id, check_in, check_out')
            .eq('date', today);

        // Find employees who clocked in today but HAVEN'T clocked out
        const checkedInNotOutEmpIds = new Set(
            (todayLogs || [])
                .filter(l => !!l.check_in && !l.check_out)
                .map(l => l.employee_id)
        );

        const uncheckoutEmps = employees.filter(e => checkedInNotOutEmpIds.has(e.id));
        const uncheckoutUserIds = uncheckoutEmps.map(e => e.user_id).filter(Boolean);

        if (uncheckoutUserIds.length === 0) return;

        // 3. Fetch push subscriptions
        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('endpoint, keys, user_id')
            .in('user_id', uncheckoutUserIds);

        const payload = JSON.stringify({
            title: '🏠 Pengingat Presensi Pulang (Check-Out)',
            body: 'Jam kerja kantor telah selesai. Jangan lupa lakukan Presensi Pulang sebelum meninggalkan lokasi!',
            icon: '/dea.png',
            badge: '/dea.png'
        });

        // 4. In-app notification
        const notifRows = uncheckoutUserIds.map(uId => ({
            user_id: uId,
            title: '🏠 Pengingat Presensi Pulang (Check-Out)',
            message: 'Jam kerja kantor telah selesai. Jangan lupa lakukan Presensi Pulang.',
            type: 'warning',
            link: '/attendance-hub',
            is_read: false
        }));
        await supabase.from('notifications').insert(notifRows);

        // 5. Send push notifications
        if (subs && subs.length > 0) {
            for (const sub of subs) {
                webpush.sendNotification(sub, payload).catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).then();
                    }
                });
            }
        }
        console.log(`[CRON] Sent check-out reminder to ${uncheckoutEmps.length} employees (${subs ? subs.length : 0} push endpoints).`);
    } catch (e) {
        console.error('[CRON] Error Check-Out Reminder:', e);
    }
});

// 3. Daily Certificate Expiration Check (08:00 WITA = 00:00 UTC)
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running 08:00 WITA Certificate Expiration Check (<= 90 days)...');
    try {
        const { data: certs, error: certErr } = await supabase
            .from('employee_certificates')
            .select(`
                id,
                certificate_number,
                expired_date,
                is_lifetime,
                notes,
                certificate_types (name),
                employees (
                    id,
                    user_id,
                    nama_lengkap,
                    email_office,
                    users (email, recovery_email)
                )
            `)
            .eq('is_lifetime', false)
            .not('expired_date', 'is', null);

        if (certErr || !certs || certs.length === 0) return;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const expiringList = [];

        for (const cert of certs) {
            // Check if approved
            const notes = cert.notes || '';
            const isApproved = notes.includes('[STATUS:APPROVED]') || cert.is_approved === true;
            if (!isApproved) continue;

            const expDate = new Date(cert.expired_date);
            expDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((expDate - now) / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 90) {
                const emp = cert.employees || {};
                const u = emp.users || {};
                const empEmail = emp.email_office || u.recovery_email || u.email;
                const certName = cert.certificate_types?.name || 'Sertifikat Kompetensi';

                // Reminder interval: every 10 days (90, 80, 70, 60, 50, 40, 30, 20, 10) and day 0
                const isTenDayMilestone = (diffDays % 10 === 0) || (diffDays === 0);

                if (isTenDayMilestone) {
                    expiringList.push({
                        certName,
                        certNumber: cert.certificate_number || '-',
                        employeeName: emp.nama_lengkap || 'Karyawan',
                        expiryDate: cert.expired_date,
                        daysLeft: diffDays,
                        empEmail
                    });

                    // 1. Web in-app notification strictly to the certificate owner
                    if (emp.user_id) {
                        const notifMsg = diffDays === 0
                            ? `Sertifikat "${certName}" (${cert.certificate_number || '-'}) Anda habis masa berlakunya hari ini. Harap segera perpanjang.`
                            : `Sertifikat "${certName}" (${cert.certificate_number || '-'}) Anda akan kedaluwarsa dalam ${diffDays} hari. Harap siapkan dokumen perpanjangan.`;

                        await supabase.from('notifications').insert({
                            user_id: emp.user_id,
                            title: '⏰ Pengingat Masa Berlaku Sertifikat',
                            message: notifMsg,
                            type: 'warning',
                            link: '/personal-certifications',
                            is_read: false
                        }).catch(e => console.warn('[CRON] In-app cert notification err:', e.message));
                    }

                    // 2. Email reminder strictly to the certificate owner (no spam to unrelated users)
                    if (empEmail) {
                        await mailer.sendCertExpiringEmail({
                            toEmail: empEmail,
                            recipientName: emp.nama_lengkap || 'Karyawan',
                            certName,
                            certNumber: cert.certificate_number || '-',
                            expiryDate: cert.expired_date,
                            daysLeft: diffDays,
                            roleType: 'user'
                        }).catch(e => console.error('[CRON] Cert expiring email to employee err:', e.message));
                    }
                }
            }
        }

        console.log(`[CRON] Certificate check completed. Processed reminders for ${expiringList.length} certificate(s) reaching 10-day milestones.`);
    } catch (e) {
        console.error('[CRON] Error in Certificate Expiration Check:', e);
    }
});

console.log('Cron jobs for Push Notifications & Certificate Lifecycle initialized.');
