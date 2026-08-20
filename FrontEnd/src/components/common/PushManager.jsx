import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

export default function PushManager() {
    const { isAuthenticated, token } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;
        
        const registerPush = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    // 1. Register Service Worker
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    
                    // 2. Ask for permission if not granted/denied yet
                    if (Notification.permission === 'default') {
                        const permission = await Notification.requestPermission();
                        if (permission !== 'granted') return;
                    }

                    if (Notification.permission !== 'granted') return;

                    // 3. Subscribe to push
                    let subscription = await registration.pushManager.getSubscription();
                    if (!subscription) {
                        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                        if (!publicVapidKey) {
                            console.warn('VAPID public key not found in env.');
                            return;
                        }
                        
                        function urlBase64ToUint8Array(base64String) {
                            const padding = '='.repeat((4 - base64String.length % 4) % 4);
                            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                            const rawData = window.atob(base64);
                            const outputArray = new Uint8Array(rawData.length);
                            for (let i = 0; i < rawData.length; ++i) {
                                outputArray[i] = rawData.charCodeAt(i);
                            }
                            return outputArray;
                        }

                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                        });
                    }

                    // 4. Send subscription to backend
                    await api.post('/push/subscribe', subscription);
                } catch (error) {
                    console.error('Service Worker / Push Error:', error);
                }
            }
        };

        registerPush();
    }, [isAuthenticated, token]);

    return null;
}
