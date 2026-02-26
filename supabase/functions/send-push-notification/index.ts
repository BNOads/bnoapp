import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Base64url helpers ──────────────────────────────────────────────────────────

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

// ── VAPID JWT ──────────────────────────────────────────────────────────────────

async function buildVapidJWT(audience: string, subject: string, privateKeyB64Url: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import private key (raw d value for P-256)
  const dBytes = base64UrlToUint8Array(privateKeyB64Url);
  const privateKeyJwk = {
    kty: 'EC',
    crv: 'P-256',
    d: uint8ArrayToBase64Url(dBytes),
    // We need x and y — derive from public key (we'll pass in pubKeyB64Url)
  };

  // Build the JWK properly — Deno requires x and y for ECDSA signing
  // We'll derive from VAPID_PUBLIC_KEY env var
  const pubB64Url = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const pubBytes = base64UrlToUint8Array(pubB64Url);
  // pubBytes is uncompressed: 04 || x(32) || y(32)
  const x = uint8ArrayToBase64Url(pubBytes.slice(1, 33));
  const y = uint8ArrayToBase64Url(pubBytes.slice(33, 65));

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: uint8ArrayToBase64Url(dBytes),
    x,
    y,
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
}

// ── Web Push Encryption (AES-128-GCM + ECDH P-256) ──────────────────────────

async function encryptPayload(
  subscription: { endpoint: string; auth: string; p256dh: string },
  payload: string
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(payload);

  // Generate server ephemeral key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Client public key (p256dh)
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    base64UrlToUint8Array(subscription.p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  );

  // Auth secret
  const authSecret = base64UrlToUint8Array(subscription.auth);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Export server public key (raw)
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // HKDF PRK (info = "WebPush: info\0" + client_pub + server_pub)
  const inputKeyMaterial = new Uint8Array(sharedSecret);

  // ikm = HKDF-Extract(auth_secret, shared_secret)
  const prkKey = await crypto.subtle.importKey('raw', inputKeyMaterial, { name: 'HKDF' }, false, ['deriveBits']);

  const clientPubRaw = base64UrlToUint8Array(subscription.p256dh);
  const infoContent = new Uint8Array([
    ...encoder.encode('WebPush: info\x00'),
    ...clientPubRaw,
    ...serverPublicKeyRaw,
  ]);

  // PRK
  const prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: infoContent },
    prkKey,
    256
  );
  const prk = new Uint8Array(prkBits);

  // Derive Content Encryption Key (CEK) and nonce using PRK
  const prkImported = await crypto.subtle.importKey('raw', prk, { name: 'HKDF' }, false, ['deriveBits']);

  const cekInfo = new Uint8Array([
    ...encoder.encode('Content-Encoding: aes128gcm\x00'),
  ]);
  const nonceInfo = new Uint8Array([
    ...encoder.encode('Content-Encoding: nonce\x00'),
  ]);

  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
    prkImported,
    128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkImported,
    96
  );

  const cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);
  const nonce = new Uint8Array(nonceBits);

  // Pad plaintext: pad to nearest record size (4096). Padding: plaintext + 0x02 + zeros
  const recordSize = 4096;
  const paddedLen = recordSize - 16 - 1; // 16 = GCM tag, 1 = delimiter byte
  const padded = new Uint8Array(paddedLen);
  padded.set(plaintext);
  padded[plaintext.length] = 2; // delimiter

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    cek,
    padded
  );

  // Build aes128gcm content body:
  // salt(16) + rs(4, big-endian uint32) + idlen(1) + server_pub(65) + ciphertext
  const rs = recordSize;
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKeyRaw.length);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = serverPublicKeyRaw.length;
  header.set(serverPublicKeyRaw, 21);

  const body = new Uint8Array(header.length + encrypted.byteLength);
  body.set(header, 0);
  body.set(new Uint8Array(encrypted), header.length);

  return { body, salt, serverPublicKey: serverPublicKeyRaw };
}

// ── Send a single push notification ───────────────────────────────────────────

async function sendPush(
  subscription: { endpoint: string; auth: string; p256dh: string },
  payload: object
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

  try {
    // Determine audience (origin of endpoint)
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await buildVapidJWT(audience, vapidSubject, vapidPrivateKey);
    const payloadStr = JSON.stringify(payload);
    const { body } = await encryptPayload(subscription, payloadStr);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
      },
      body,
    });

    return { ok: response.ok, status: response.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { avisoId, titulo, conteudo, destinatarios } = body;

    let notifTitulo = titulo;
    let notifConteudo = conteudo;
    let notifDestinatarios = destinatarios ?? ['all'];

    // If avisoId provided, fetch from DB
    if (avisoId) {
      const { data: aviso, error } = await supabaseAdmin
        .from('avisos')
        .select('titulo, conteudo, destinatarios')
        .eq('id', avisoId)
        .single();

      if (error || !aviso) {
        return new Response(JSON.stringify({ error: 'Aviso não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      notifTitulo = aviso.titulo;
      notifConteudo = aviso.conteudo;
      notifDestinatarios = aviso.destinatarios ?? ['all'];
    }

    if (!notifTitulo) {
      return new Response(JSON.stringify({ error: 'Título é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch matching subscriptions
    let query = supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, auth, p256dh');

    // If not targeting 'all', filter by user_id in destinatarios
    const hasAll = notifDestinatarios.includes('all');
    if (!hasAll && notifDestinatarios.length > 0) {
      query = query.in('user_id', notifDestinatarios);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'Nenhuma inscrição push ativa' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pushPayload = {
      title: notifTitulo,
      body: notifConteudo?.substring(0, 200) ?? '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: avisoId ?? `push-${Date.now()}`,
      data: {
        url: '/notificacoes',
        avisoId,
      },
    };

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(sub => sendPush(sub, pushPayload))
    );

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const r = result.value;
        if (r.ok) {
          sent++;
        } else {
          failed++;
          // 404/410 = subscription expired, should be removed
          if (r.status === 404 || r.status === 410) {
            expiredEndpoints.push(subscriptions[i].endpoint);
          }
        }
      } else {
        failed++;
      }
    });

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    return new Response(JSON.stringify({ success: true, sent, failed, total: subscriptions.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
