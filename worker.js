/* Cloudflare Worker: 정적 파일은 그대로 내보내고, /api/push 만 처리한다.
 * Supabase가 새 메시지마다 받는 사람의 알림 구독 목록과 VAPID 키를 보내 주면,
 * 여기서 웹 푸시 규격(RFC 8291 암호화 + RFC 8292 VAPID 서명)대로 각 브라우저 푸시 서버에 전달한다.
 * 키는 이 코드에 없다 (Supabase의 비공개 표 push_config에만 있음).
 */
const PUSH_HOSTS = /(^|\.)(googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; a.forEach(x => { o.set(x, i); i += x.length; }); return o; };
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// RFC 8291: 받는 브라우저의 공개키(p256dh)·auth로 내용을 암호화 (aes128gcm, 레코드 1개)
export async function encryptPayload(text, p256dh, auth, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const ua = unb64u(p256dh), secret = unb64u(auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hmac(await hmac(secret, shared), cat(enc.encode('WebPush: info\0'), ua, as, [1]));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode('Content-Encoding: aes128gcm\0'), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode('Content-Encoding: nonce\0'), [1]))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(text), [2])));
  return cat(salt, [0, 0, 16, 0], [as.length], as, ct);   // 헤더: salt · 레코드 크기 4096 · 키 길이 · 보낸 쪽 공개키
}

// RFC 8292: 푸시 서버에 "이 앱이 보낸 알림"임을 증명하는 서명 (ES256 JWT)
export async function vapidHeader(endpoint, jwk, sub) {
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: jwk.d, x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const part = o => b64u(enc.encode(JSON.stringify(o)));
  const head = part({ typ: 'JWT', alg: 'ES256' }) + '.' + part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub });
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head));
  return `vapid t=${head}.${b64u(sig)}, k=${b64u(cat([4], unb64u(jwk.x), unb64u(jwk.y)))}`;
}

async function sendOne(s, text, jwk, sub) {
  let host; try { host = new URL(s.endpoint).hostname; } catch (e) { return 0; }
  if (!s.endpoint.startsWith('https://') || !PUSH_HOSTS.test(host)) return 0;   // 브라우저 푸시 서버로만 보냄
  const r = await fetch(s.endpoint, {
    method: 'POST', body: await encryptPayload(text, s.p256dh, s.auth),
    headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high', Authorization: await vapidHeader(s.endpoint, jwk, sub) },
  });
  return r.status;
}

async function push(req) {
  let j; try { j = await req.json(); } catch (e) { return new Response('bad json', { status: 400 }); }
  const { vapid, subs, msg } = j || {};
  if (!vapid || !vapid.d || !Array.isArray(subs) || !msg || subs.length > 50) return new Response('bad request', { status: 400 });
  const text = JSON.stringify(msg).slice(0, 3000);
  const res = await Promise.all(subs.map(s => sendOne(s, text, vapid, vapid.sub || new URL(req.url).origin).catch(() => 0)));
  // 404·410 = 브라우저가 구독을 끊은 기기 → Supabase가 다음 메시지 때 이 목록을 보고 지운다
  return Response.json({ status: res, gone: subs.filter((s, i) => res[i] === 404 || res[i] === 410).map(s => s.endpoint) });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/push') return req.method === 'POST' ? push(req) : new Response('POST only', { status: 405 });
    return env.ASSETS.fetch(req);
  },
};
