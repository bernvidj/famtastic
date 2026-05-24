// Hook: manage Web Push subscription for current member
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw      = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(familyId, memberId) {
  const [supported,   setSupported]   = useState(false);
  const [subscribed,  setSubscribed]  = useState(false);
  const [permission,  setPermission]  = useState('default');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY);
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  async function subscribe() {
    if (!supported || !familyId || !memberId) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return false; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await supabase.rpc('upsert_push_subscription', {
        p_member_id:   memberId,
        p_family_id:   familyId,
        p_subscription: JSON.stringify(sub),
      });

      setSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.warn('Push subscribe failed:', err);
      setLoading(false);
      return false;
    }
  }

  async function unsubscribe() {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await supabase.rpc('delete_push_subscription', { p_member_id: memberId });
      setSubscribed(false);
    } catch (err) {
      console.warn('Push unsubscribe failed:', err);
    }
    setLoading(false);
  }

  // Check current subscription status on mount
  useEffect(() => {
    if (!supported || !memberId) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    );
  }, [supported, memberId]);

  return { supported, subscribed, permission, loading, subscribe, unsubscribe };
}
