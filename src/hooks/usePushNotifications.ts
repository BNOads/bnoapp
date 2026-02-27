import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Hardcoded fallback in case the env var isn't injected by Vite (safe — it's a public key)
const VAPID_PUBLIC_KEY =
    (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
    'BDdhI3xMyGq-juKkR26VczbxJfCft55PJZKBhpmurOO4HqoychkhB2oFFyes1VlKLY0d9I2CY3hff4yevuUH9tI';

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

    useEffect(() => {
        const supported =
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;
        setIsSupported(supported);

        if (supported) {
            setPermission(Notification.permission as PushPermission);

            navigator.serviceWorker.ready.then(async (reg) => {
                const existing = await reg.pushManager.getSubscription();
                setIsSubscribed(!!existing);
            }).catch(() => {
                // SW not registered yet
            });
        }
    }, []);

    const subscribe = useCallback(async (): Promise<{ ok: boolean; errorMsg?: string }> => {
        if (!isSupported) {
            return { ok: false, errorMsg: 'Push não suportado neste browser. Tente instalar o app como PWA.' };
        }

        try {
            setIsLoading(true);

            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm as PushPermission);
            if (perm !== 'granted') return { ok: false, errorMsg: 'Permissão de notificação negada' };

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { ok: false, errorMsg: 'Usuário não autenticado' };

            // Get service worker (with timeout)
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Service worker timed out. Tente recarregar a página.')), 10000)
                ),
            ]);

            // Subscribe via PushManager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            const subJson = subscription.toJSON();
            const keys = subJson.keys as { auth: string; p256dh: string };

            // Delete any existing sub for this user, then insert fresh
            await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

            const { error } = await supabase.from('push_subscriptions').insert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                auth: keys.auth,
                p256dh: keys.p256dh,
            });

            if (error) {
                console.error('Erro ao salvar inscrição push:', error);
                return { ok: false, errorMsg: error.message };
            }

            setIsSubscribed(true);
            return { ok: true };
        } catch (err: any) {
            console.error('Erro ao ativar push notifications:', err);
            return { ok: false, errorMsg: err?.message ?? String(err) };
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async (): Promise<boolean> => {
        try {
            setIsLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                }
            }

            await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

            setIsSubscribed(false);
            return true;
        } catch (err) {
            console.error('Erro ao desativar push notifications:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe };
}
