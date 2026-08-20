const supabase = require('../config/supabase');
const webpush = require('web-push');
require('dotenv').config();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.CONTACT_EMAIL || 'mailto:admin@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

exports.subscribe = async (req, res) => {
    try {
        const userId = req.userId;
        const subscription = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        const { data: existing } = await supabase.from('push_subscriptions').select('id').eq('user_id', userId).eq('endpoint', subscription.endpoint).single();

        if (!existing) {
            const { error } = await supabase.from('push_subscriptions').insert([{ user_id: userId, endpoint: subscription.endpoint, keys: subscription.keys }]);
            if (error) throw error;
        }

        res.status(201).json({ message: 'Subscription saved successfully.' });
    } catch (err) {
        console.error('Error saving subscription:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
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
