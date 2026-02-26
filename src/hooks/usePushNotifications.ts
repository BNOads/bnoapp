import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export type PushPermission = 'default' | 'granted' | 'denied';

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<PushPermission>('default');
    const [isLoading, setIsLoading] = useState(false);

    // Check support and current state on mount
    useEffect(() => {
        const supported =
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;
        setIsSupported(supported);

        if (supported) {
            setPermission(Notification.permission as PushPermission);

            // Check if already subscribed
            navigator.serviceWorker.ready.then(async (reg) => {
                const existing = await reg.pushManager.getSubscription();
                setIsSubscribed(!!existing);
            });
        }
    }, []);

    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) return false;

        try {
            setIsLoading(true);

            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm as PushPermission);
            if (perm !== 'granted') return false;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            const subJson = subscription.toJSON();
            const keys = subJson.keys as { auth: string; p256dh: string };

            // Save to DB
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    endpoint: subscription.endpoint,
                    auth: keys.auth,
                    p256dh: keys.p256dh,
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Erro ao salvar inscrição push:', error);
                return false;
            }

            setIsSubscribed(true);
            return true;
        } catch (err) {
            console.error('Erro ao ativar push notifications:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) return false;

        try {
            setIsLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                const endpoint = subscription.endpoint;
                await subscription.unsubscribe();

                // Remove from DB
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('endpoint', endpoint);
            }

            setIsSubscribed(false);
            return true;
        } catch (err) {
            console.error('Erro ao desativar push notifications:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    return { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe };
}
