/* 테스트용: 브라우저 알림 기능(Notification·PushManager·서비스워커)을 흉내 낸다. 상태는 부모 창의 PUSH에 둔다 (여러 번 다시 열어도 같은 기기) */
(function () {
  const P = parent.PUSH || (parent.PUSH = { perm: 'default', sub: null, endpoint: 'https://fcm.googleapis.com/fcm/send/test-device', listeners: [] });
  P.listeners = [];
  P.swMsg = data => P.listeners.forEach(f => f({ data }));
  window.Notification = { get permission() { return P.perm; }, requestPermission: async () => (P.perm = 'granted') };
  window.PushManager = function () { };
  const pm = {
    getSubscription: async () => P.sub,
    subscribe: async o => {
      P.key = new Uint8Array(o.applicationServerKey);
      return P.sub = { endpoint: P.endpoint, toJSON: () => ({ endpoint: P.endpoint, keys: { p256dh: 'P1', auth: 'A1' } }), unsubscribe: async () => { P.sub = null; return true; } };
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    ready: Promise.resolve({ pushManager: pm }), register: async () => ({}),
    addEventListener: (t, f) => { if (t === 'message') P.listeners.push(f); },
  } });
})();
