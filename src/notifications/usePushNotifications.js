// Hook: manage Web Push subscription for current member
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const VAPID_PUBLIC_KEY = 'BAe0bve35wnJ2rXxthhrjtVSBVeOV2_n67wQhWiYXS_wP8NQmYNKZSoNK33LGvMUK_3CyDl25YTVhV_tVI01Urk';

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

  // Check current subscription status on mount and re-sync to DB.
  // If permission is already granted but the browser subscription is gone (app reinstalled,
  // PWA removed from home screen, etc.) — auto-resubscribe silently so the user doesn't
  // need to tap the bell again.
  useEffect(() => {
    if (!supported || !memberId || !familyId) return;
    navigator.serviceWorker.ready.then(async reg => {
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Existing subscription — re-sync endpoint to DB in case it rotated
          setSubscribed(true);
          supabase.rpc('upsert_push_subscription', {
            p_member_id:    memberId,
            p_family_id:    familyId,
            p_subscription: JSON.stringify(sub),
          }).catch(err => console.warn('Push re-sync failed:', err));
        } else if ('Notification' in window && Notification.permission === 'granted') {
          // Permission already granted but no active subscription (e.g. app reinstalled) —
          // silently re-subscribe without prompting the user again.
          try {
            const newSub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            await supabase.rpc('upsert_push_subscription', {
              p_member_id:    memberId,
              p_family_id:    familyId,
              p_subscription: JSON.stringify(newSub),
            });
            setSubscribed(true);
            console.log('[push] auto-resubscribed after reinstall/reset');
          } catch (resubErr) {
            console.warn('Push auto-resubscribe failed:', resubErr);
            setSubscribed(false);
          }
        } else {
          setSubscribed(false);
        }
      } catch (err) {
        console.warn('Push status check failed:', err);
      }
    });
  }, [supported, memberId, familyId]);

  return { supported, subscribed, permission, loading, subscribe, unsubscribe };
}
