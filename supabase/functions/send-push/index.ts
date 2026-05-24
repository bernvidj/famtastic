// ============================================
// FamTastic — Edge Function: send-push
// Pure Web Crypto implementation (RFC 8291 + RFC 8292)
// No npm dependencies — works reliably in Deno
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Base64url helpers ────────────────────────────────────────────────────────
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

// ── VAPID JWT (RFC 8292) ─────────────────────────────────────────────────────
async function signVapidJWT(audience: string, vapidPub: string, vapidPriv: string): Promise<string> {
  const pubBytes  = b64UrlDecode(vapidPub);   // 65 bytes: 0x04 + x(32) + y(32)
  const privBytes = b64UrlDecode(vapidPriv);  // 32 bytes: scalar

  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256',
      d: b64UrlEncode(privBytes),
      x: b64UrlEncode(pubBytes.slice(1, 33)),
      y: b64UrlEncode(pubBytes.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const enc = (o: object) => b64UrlEncode(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: 'mailto:famtastic@famtastic.app',
  })}`;

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${b64UrlEncode(sig)}`;
}

// ── Web Push payload encryption (RFC 8291 aes128gcm) ────────────────────────
async function encryptPayload(
  plaintext: Uint8Array,
  p256dh: string,
  authSecret: string,
): Promise<Uint8Array> {
  const RS   = 4096;
  if (plaintext.length + 1 > RS) throw new Error('Payload too large for single record');

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Server ephemeral ECDH key pair
  const serverPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const serverPub = new Uint8Array(await crypto.subtle.exportKey('raw', serverPair.publicKey)); // 65 bytes

  // Import client (UA) public key
  const clientPubBytes = b64UrlDecode(p256dh);
  const clientPub = await crypto.subtle.importKey(
    'raw', clientPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // ECDH shared secret
  const ecdhBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPub }, serverPair.privateKey, 256
  );

  const auth = b64UrlDecode(authSecret);

  // IKM via HKDF (RFC 8291 §3.3)
  const ecdhKey = await crypto.subtle.importKey('raw', ecdhBits, 'HKDF', false, ['deriveBits']);
  const infoKey = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\x00'),
    ...clientPubBytes,
    ...serverPub,
  ]);
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: auth, info: infoKey },
    ecdhKey, 256
  );

  // CEK (16 bytes) and nonce (12 bytes) via HKDF (RFC 8188 §2.3)
  const ikmKey    = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const cekInfo   = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 1]);
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\x00'),    1]);

  const cekBits   = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo   }, ikmKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, ikmKey,  96);

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);

  // Padded plaintext (single record): plaintext || 0x02 || 0x00...
  const padded = new Uint8Array(RS);
  padded.set(plaintext);
  padded[plaintext.length] = 2; // last-record delimiter per RFC 8188

  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBits }, cek, padded
  )); // RS + 16 bytes

  // Build RFC 8188 content: salt(16) + rs(4) + idlen(1) + serverPub(65) + cipher
  const out = new Uint8Array(16 + 4 + 1 + 65 + cipher.byteLength);
  let off = 0;
  out.set(salt, off);                                           off += 16;
  new DataView(out.buffer).setUint32(off, RS, false);           off += 4;
  out[off++] = 65;                                              // idlen
  out.set(serverPub, off);                                      off += 65;
  out.set(cipher, off);
  return out;
}

// ── Send one push notification ───────────────────────────────────────────────
async function sendOnePush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPub: string,
  vapidPriv: string,
): Promise<{ ok: boolean; status: number }> {
  const url  = new URL(sub.endpoint);
  const jwt  = await signVapidJWT(`${url.protocol}//${url.host}`, vapidPub, vapidPriv);
  const body = await encryptPayload(new TextEncoder().encode(payload), sub.keys.p256dh, sub.keys.auth);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization:      `vapid t=${jwt},k=${vapidPub}`,
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL:                '86400',
    },
    body,
  });
  return { ok: res.ok, status: res.status };
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? '';
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not set in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { family_id, exclude_member_id, title, body } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let query = supabase.from('push_subscriptions').select('subscription_json').eq('family_id', family_id);
    if (exclude_member_id) query = query.neq('member_id', exclude_member_id);

    const { data: subs, error: dbErr } = await query;
    if (dbErr) throw dbErr;
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, note: 'no subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({ title, body, icon: '/icon-192.png', url: '/' });

    const results = await Promise.allSettled(
      subs.map(row => sendOnePush(JSON.parse(row.subscription_json), payload, VAPID_PUBLIC, VAPID_PRIVATE))
    );

    const sent   = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
