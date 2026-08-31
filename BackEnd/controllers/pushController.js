const supabase = require('../config/supabase');
const webpush = require('web-push');
require('dotenv').config();

const DEFAULT_VAPID_PUBLIC = 'BHGknLvnvRgrQkNM9KgYts4Z-IrSJiDH8w0jPlUZ_vlGq3jQBvSO9DORscZ0AjyqD9V_qGyCtJFlKr_-pvjQHeE';
const DEFAULT_VAPID_PRIVATE = 'vL3_sO8q9rQv_d2Z9L3wN1_kK8mP2_sA1_xX8yZ0_qA'; // Or process.env.VAPID_PRIVATE_KEY

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
        console.warn('VAPID setup warning:', vErr.message);
    }
}

exports.subscribe = async (req, res) => {
    try {
        const userId = req.userId;
        const subscription = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // Check if subscription already exists for this endpoint
        const { data: existing } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', subscription.endpoint)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('push_subscriptions')
                .update({
                    user_id: userId,
                    keys: subscription.keys,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('push_subscriptions')
                .insert([{
                    user_id: userId,
                    endpoint: subscription.endpoint,
                    keys: subscription.keys,
                    created_at: new Date().toISOString()
                }]);
        }

        res.status(201).json({ message: 'Subscription saved successfully.' });
    } catch (err) {
        console.error('Error saving subscription:', err);
        res.status(500).json({ error: 'Gagal menyimpan langganan push notifikasi: ' + err.message });
    }
};

exports.unsubscribe = async (req, res) => {
    try {
        const userId = req.userId;
        const { endpoint } = req.body;

        if (endpoint) {
            await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
        } else {
            await supabase.from('push_subscriptions').delete().eq('user_id', userId);
        }

        res.status(200).json({ message: 'Unsubscribed successfully.' });
    } catch (err) {
        console.error('Error unsubscribing:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
};

exports.testPush = async (req, res) => {
    try {
        const userId = req.userId;
        const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, keys').eq('user_id', userId);
        
        if (!subs || subs.length === 0) {
            return res.status(404).json({ message: 'Belum ada perangkat terdaftar untuk notifikasi push pada akun ini.' });
        }

        const payload = JSON.stringify({
            title: '🔔 Uji Coba Notifikasi HRIS',
            body: 'Notifikasi push berhasil terhubung! Anda akan menerima update presensi dan aktivitas kerja secara real-time.',
            icon: '/dea.png',
            badge: '/dea.png'
        });

        let sentCount = 0;
        for (const sub of subs) {
            try {
                await webpush.sendNotification(sub, payload);
                sentCount++;
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                }
            }
        }

        res.json({ message: `Notifikasi push berhasil dikirim ke ${sentCount} perangkat.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
