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
const { notifyRole } = require('../controllers/notificationController');

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
                certificate_types (name, category),
                employees (
                    id,
                    user_id,
                    nama_lengkap,
                    email
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
                const certName = cert.certificate_types?.name || 'Sertifikat Kompetensi';
                const isGeneral = notes.includes('[CATEGORY:GENERAL]') || cert.category === 'General' || (cert.certificate_types?.category || '').toLowerCase().includes('general');
                const certCategory = isGeneral ? 'General' : 'K3';

                // Resolve real personal email for employee
                let empEmail = await mailer.resolveUserPersonalEmail(supabase, {
                    userId: emp.user_id,
                    employeeId: emp.id,
                    userObj: u
                });
                if (!empEmail) {
                    empEmail = emp.email || emp.email_office || u.recovery_email || u.email;
                }

                // Reminder interval: every 10 days (90, 80, 70, 60, 50, 40, 30, 20, 10) and day 0
                const isTenDayMilestone = (diffDays % 10 === 0) || (diffDays === 0);

                if (isTenDayMilestone) {
                    expiringList.push({
                        certName,
                        certNumber: cert.certificate_number || '-',
                        employeeName: emp.nama_lengkap || 'Karyawan',
                        expiryDate: cert.expired_date,
                        daysLeft: diffDays,
                        empEmail,
                        category: certCategory
                    });

                    // 1. Web in-app notification strictly to the certificate owner with direct upload action link
                    if (emp.user_id) {
                        const notifMsg = diffDays === 0
                            ? `Sertifikat ${certCategory} "${certName}" (${cert.certificate_number || '-'}) Anda habis masa berlakunya hari ini. Harap segera unggah perpanjangan.`
                            : `Sertifikat ${certCategory} "${certName}" (${cert.certificate_number || '-'}) Anda akan kedaluwarsa dalam ${diffDays} hari. Klik untuk unggah sertifikat terbaru.`;

                        const directUploadLink = `/personal-certifications?action=upload&certName=${encodeURIComponent(certName)}&category=${certCategory}`;

                        await supabase.from('notifications').insert({
                            user_id: emp.user_id,
                            title: '⏰ Pengingat Masa Berlaku Sertifikat',
                            message: notifMsg,
                            type: 'warning',
                            link: directUploadLink,
                            is_read: false
                        }).catch(e => console.warn('[CRON] In-app cert notification err:', e.message));
                    }

                    // 2. Email reminder strictly to the certificate owner with "Perbarui Sertifikat" button
                    if (empEmail) {
                        await mailer.sendCertExpiringEmail({
                            toEmail: empEmail,
                            recipientName: emp.nama_lengkap || 'Karyawan',
                            employeeName: emp.nama_lengkap || 'Karyawan',
                            certName,
                            certNumber: cert.certificate_number || '-',
                            expiryDate: cert.expired_date,
                            daysLeft: diffDays,
                            roleType: 'user',
                            category: certCategory,
                            certId: cert.id
                        }).catch(e => console.error('[CRON] Cert expiring email to employee err:', e.message));
                    }

                    // 3. In-App Notification to Respective Admin Team (HSE for K3, HRGA for General)
                    const targetAdminRole = isGeneral ? 'hrga_admin' : 'hse_admin';
                    const adminNotifMsg = diffDays === 0
                        ? `Sertifikat ${certCategory} "${certName}" milik ${emp.nama_lengkap || 'Karyawan'} habis masa berlakunya hari ini.`
                        : `Sertifikat ${certCategory} "${certName}" milik ${emp.nama_lengkap || 'Karyawan'} akan kedaluwarsa dalam ${diffDays} hari.`;

                    await notifyRole(
                        targetAdminRole,
                        '⚠️ Peringatan Masa Berlaku Sertifikat Karyawan',
                        adminNotifMsg,
                        'warning',
                        '/organization?tab=certifications&expiry=expiring'
                    ).catch(e => console.warn('[CRON] Admin in-app cert notification err:', e.message));

                    // 4. Email Alert to Respective Admin Team (HSE for K3, HRGA for General)
                    if (isGeneral) {
                        const hrgaEmails = await mailer.getHrgaAdminEmails(supabase);
                        for (const aEmail of hrgaEmails) {
                            await mailer.sendCertExpiringEmail({
                                toEmail: aEmail,
                                recipientName: 'Tim HRGA Admin',
                                employeeName: emp.nama_lengkap || 'Karyawan',
                                certName,
                                certNumber: cert.certificate_number || '-',
                                expiryDate: cert.expired_date,
                                daysLeft: diffDays,
                                roleType: 'hrga_admin',
                                category: 'General',
                                certId: cert.id
                            }).catch(e => console.error('[CRON] Cert expiring email to HRGA err:', e.message));
                        }
                    } else {
                        const hseEmails = await mailer.getHseAdminEmails(supabase);
                        for (const aEmail of hseEmails) {
                            await mailer.sendCertExpiringEmail({
                                toEmail: aEmail,
                                recipientName: 'Tim HSE Compliance Admin',
                                employeeName: emp.nama_lengkap || 'Karyawan',
                                certName,
                                certNumber: cert.certificate_number || '-',
                                expiryDate: cert.expired_date,
                                daysLeft: diffDays,
                                roleType: 'hse_admin',
                                category: 'K3',
                                certId: cert.id
                            }).catch(e => console.error('[CRON] Cert expiring email to HSE err:', e.message));
                        }
                    }
                }
            }
        }

        console.log(`[CRON] Certificate check completed. Processed reminders for ${expiringList.length} certificate(s) reaching 10-day milestones.`);
    } catch (e) {
        console.error('[CRON] Error in Certificate Expiration Check:', e);
    }
});

// Helper to extract storage path from a Supabase public URL
const extractStoragePath = (fileUrl, bucketName) => {
    if (!fileUrl || !bucketName) return null;
    try {
        const marker = `/storage/v1/object/public/${bucketName}/`;
        const idx = fileUrl.indexOf(marker);
        if (idx !== -1) {
            return decodeURIComponent(fileUrl.substring(idx + marker.length));
        }
    } catch (_) {}
    return null;
};

/**
 * 4. Daily Auto-Purge: Clean up deleted files from trash older than 1 week (7 days)
 * Scheduled at 02:00 WITA (18:00 UTC) every day
 */
const autoPurgeTrashFiles = async () => {
    try {
        const nowIso = new Date().toISOString();
        const { data: expiredTrash, error } = await supabase
            .from('file_trash')
            .select('*')
            .lte('purge_at', nowIso)
            .eq('is_purged', false);

        if (error) {
            console.warn('[TRASH-PURGE] Could not fetch expired trash items:', error.message);
            return;
        }

        if (!expiredTrash || expiredTrash.length === 0) {
            console.log('[TRASH-PURGE] Tidak ada berkas sampah yang melewati batas 1 minggu (7 hari).');
            return;
        }

        console.log(`[TRASH-PURGE] Memproses pembersihan permanen untuk ${expiredTrash.length} berkas yang telah dihapus > 1 minggu...`);

        for (const item of expiredTrash) {
            try {
                // Delete physical file from 'trash' storage bucket
                if (item.trash_file_path) {
                    await supabase.storage.from('trash').remove([item.trash_file_path]);
                }

                // Also check if original file_url was located in certificates or documents
                if (item.file_url && item.file_url.startsWith('http')) {
                    const buckets = ['certificates', 'documents', 'trash'];
                    for (const b of buckets) {
                        const fp = extractStoragePath(item.file_url, b);
                        if (fp) {
                            await supabase.storage.from(b).remove([fp]).catch(() => {});
                        }
                    }
                }

                // Update trash record to is_purged = true
                await supabase
                    .from('file_trash')
                    .update({
                        is_purged: true,
                        purged_at: new Date().toISOString()
                    })
                    .eq('id', item.id);

                console.log(`[TRASH-PURGE] Berhasil membersihkan berkas secara permanen: ID ${item.id} (${item.file_name})`);
            } catch (err) {
                console.error(`[TRASH-PURGE] Gagal membersihkan item ${item.id}:`, err.message);
            }
        }
    } catch (e) {
        console.error('[TRASH-PURGE] Error in autoPurgeTrashFiles:', e);
    }
};

// Schedule daily at 02:00 WITA
cron.schedule('0 18 * * *', autoPurgeTrashFiles);

// Execute once on startup
autoPurgeTrashFiles().catch(() => {});

console.log('Cron jobs for Push Notifications, Certificate Lifecycle & Trash Auto-Purge (1 Week) initialized.');

