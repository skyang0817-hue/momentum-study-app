/* 오프라인용 서비스워커: 같은 출처 파일은 네트워크 우선(새 배포가 바로 반영), 실패하면 캐시 사용 */
const CACHE = 'cpa-fm-v109';
const SHELL = ['./', 'index.html', 'app.js', 'problems.js', 'problems3.js', 'problems2.js', 'problems4.js', 'essays.js', 'ai_fm2.js', 'keepalive.js', 'concepts.js', 'packs.js', 'quotes.js', 'mcq.js', 'fm1.js', 'net.js', 'config.js', 'vendor/supabase-2.45.4.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'logo-96.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 메신저 알림: 앱 창을 닫아 둬도 새 메시지가 오면 기기 알림으로 보여 준다 (앱을 보고 있을 때는 화면 배지로 충분)
self.addEventListener('push', e => {
  let m = {}; try { m = e.data.json(); } catch (x) { }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs.some(c => c.visibilityState === 'visible' && c.focused)) return;
    const st = m.kind === 'st';   // 공부 시간 '일시정지 잊음' 알림
    return self.registration.showNotification(m.title || (st ? '모멘텀' : '새 메시지'), { body: m.body || '', tag: m.tag || ('chat-' + (m.room || '')), renotify: true, icon: 'icon-192.png', badge: 'icon-192.png',
      data: st ? { kind: 'st' } : { room: m.room || '' }, actions: st ? [{ action: 'pause', title: '일시정지' }, { action: 'keep', title: '계속 공부 중' }] : [], requireInteraction: st });
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const nd = e.notification.data || {};
  if (nd.kind === 'st') {   // 공부 시간 알림: 앱을 열어 확인 창(계속·일시정지)을 띄운다
    const act = e.action || 'ask';
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      if (cs[0]) { cs[0].postMessage({ type: 'st', act }); return cs[0].focus(); }
      return self.clients.openWindow('./?st=' + act);
    }));
    return;
  }
  const room = nd.room || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs[0]) { cs[0].postMessage({ type: 'open-chat', room }); return cs[0].focus(); }
    return self.clients.openWindow('./?chat=' + encodeURIComponent(room));
  }));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // Supabase API 등은 건드리지 않음
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })   // 브라우저 HTTP 캐시도 거치지 않고 서버에 최신 여부를 확인
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
