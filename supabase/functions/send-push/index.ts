import webpush from 'npm:web-push';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function b64UrlDecode(s: string): Uint8Array {
  const n = s.length % 4;
  const padded = n ? s + '='.repeat(4 - n) : s;
  return Uint8Array.from(atob(padded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

function b64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signVapidJWT(audience: string, vapidPub: string, vapidPriv: string): Promise<string> {
  const pubBytes  = b64UrlDecode(vapidPub);
  const privBytes = b64UrlDecode(vapidPriv);
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: b64UrlEncode(privBytes), x: b64UrlEncode(pubBytes.slice(1, 33)), y: b64UrlEncode(pubBytes.slice(33, 65)) },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const enc = (o: object) => b64UrlEncode(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:famtastic@famtastic.app' })}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64UrlEncode(sig)}`;
}

Deno.serve(async (req) => {
  console.log('[push] handler called', req.method);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
    console.log('[push] VAPID pub len:', VAPID_PUBLIC.length, 'priv len:', VAPID_PRIVATE.length);

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ error: 'VAPID keys missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const reqBody = await req.json();
    const testEmpty = !!reqBody.test_empty;
    console.log('[push] family_id:', reqBody.family_id, 'member_id:', reqBody.member_id, 'exclude:', reqBody.exclude_member_id, 'test_empty:', testEmpty);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let query = supabase.from('push_subscriptions').select('id, member_id, subscription_json');
    if (reqBody.member_id) {
      // Single-member targeting (e.g. notify the child who got paid)
      query = query.eq('member_id', reqBody.member_id);
    } else {
      query = query.eq('family_id', reqBody.family_id);
      if (reqBody.exclude_member_id) query = query.neq('member_id', reqBody.exclude_member_id);
    }

    const { data: subs, error: dbErr } = await query;
    console.log('[push] subs found:', subs?.length ?? 0, 'db error:', dbErr?.message ?? 'none');

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, note: 'no subs' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let sent = 0, failed = 0;

    for (const row of subs) {
      try {
        const sub = JSON.parse(row.subscription_json);
        console.log('[push] sending to endpoint prefix:', sub.endpoint.slice(0, 60));

        if (testEmpty) {
          // No-body push for diagnostics (bypasses encryption)
          const url = new URL(sub.endpoint);
          const jwt = await signVapidJWT(`${url.protocol}//${url.host}`, VAPID_PUBLIC, VAPID_PRIVATE);
          const res = await fetch(sub.endpoint, {
            method: 'POST',
            headers: { Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC}`, TTL: '60', Urgency: 'high' },
          });
          const resText = await res.text();
          console.log('[push] test_empty status:', res.status, resText.slice(0, 100));
          if (res.status === 410 || res.status === 404) {
            console.log('[push] stale sub — deleting row id:', row.id, 'member:', row.member_id);
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
            failed++;
          } else {
            res.ok ? sent++ : failed++;
          }
        } else {
          // npm:web-push handles RFC 8030/8291/8188 compliant aes128gcm encryption
          const payload = JSON.stringify({
            title: reqBody.title || 'FamTastic',
            body:  reqBody.body  || '',
            icon:  '/icon-192.png',
            url:   '/',
          });
          const details = webpush.generateRequestDetails(sub, payload, {
            vapidDetails: { subject: 'mailto:famtastic@famtastic.app', publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE },
            urgency: 'high',
            TTL: 86400,
          });
          const res = await fetch(details.endpoint, {
            method:  details.method,
            headers: details.headers as Record<string, string>,
            body:    details.body,
          });
          const resText = await res.text();
          console.log('[push] push service status:', res.status, 'body:', resText.slice(0, 200));
          if (res.status === 410 || res.status === 404) {
            // Subscription expired or revoked — remove from DB so we stop sending to it
            console.log('[push] stale sub — deleting row id:', row.id, 'member:', row.member_id);
            await supabase.from('push_subscriptions').delete().eq('id', row.id);
            failed++;
          } else {
            res.ok ? sent++ : failed++;
          }
        }
      } catch (e) {
        console.error('[push] error for sub:', String(e));
        failed++;
      }
    }

    console.log('[push] done. sent:', sent, 'failed:', failed);
    return new Response(JSON.stringify({ sent, failed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[push] top-level error:', String(err));
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
