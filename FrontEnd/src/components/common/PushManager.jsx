import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const DEFAULT_VAPID_PUBLIC_KEY = 'BHGknLvnvRgrQkNM9KgYts4Z-IrSJiDH8w0jPlUZ_vlGq3jQBvSO9DORscZ0AjyqD9V_qGyCtJFlKr_-pvjQHeE';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushManager() {
    const { isAuthenticated, token } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;
        
        const registerPush = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

            try {
                // 1. Register Service Worker
                const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                await navigator.serviceWorker.ready;

                // 2. Ask for permission if default
                if ('Notification' in window && Notification.permission === 'default') {
                    await Notification.requestPermission();
                }

                if (!('Notification' in window) || Notification.permission !== 'granted') return;

                const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

                // 3. Check or Create subscription
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription && publicVapidKey) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                    });
                }

                // 4. Always ensure subscription is synced with backend
                if (subscription) {
                    await api.post('/push/subscribe', subscription).catch(() => {});
                }
            } catch (error) {
                console.warn('Service Worker / WebPush Registration notice:', error.message || error);
            }
        };

        registerPush();
    }, [isAuthenticated, token]);

    return null;
}
