/* 테스트 전용 가짜 Supabase: 메모리 테이블·저장소 + schema.sql의 RLS 규칙을 흉내 낸다 */
// 테스트 iframe(srcdoc)에서는 진짜 Worker를 만들 수 없어 신호를 직접 보낼 수 있는 가짜로 바꾼다
window.Worker = class { constructor(url) { this.url = url; } terminate() { this.dead = true; } };
(function () {
  const DB = window.parent.FAKE_DB;           // 부모 테스트 페이지가 들고 있는 상태 (iframe을 다시 띄워도 유지)
  DB.tables.attendance = DB.tables.attendance || [];
  DB.storage = DB.storage || {};
  DB.tables.messages = DB.tables.messages || [];
  const isAdmin = () => !!DB.session && DB.tables.profiles.some(p => p.id === DB.session.user.id && p.role === 'admin');
  const me = () => DB.session && DB.session.user.id;
  const ownerKey = { profiles: 'id', progress: 'user_id', mock_results: 'user_id', assignments: 'user_id', attendance: 'user_id' };
  const pk = { progress: r => r.user_id + '|' + r.pid, mock_results: r => r.id, assignments: r => r.id, profiles: r => r.id, attendance: r => r.user_id + '|' + r.day + '|' + r.block };
  // 서버 시각(한국시각): schema.sql의 current_block()과 같은 규칙
  const serverNow = () => (DB.now ? new Date(DB.now) : new Date());
  function kst() {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(serverNow());
    const g = k => f.find(x => x.type === k).value;
    return { day: `${g('year')}-${g('month')}-${g('day')}`, min: (+g('hour') % 24) * 60 + +g('minute') };
  }
  const currentBlock = () => { const m = kst().min; return m >= 480 && m < 600 ? 1 : m >= 720 && m < 840 ? 2 : m >= 1080 && m < 1200 ? 3 : null; };
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = null; this.one = false; }
    select() { return this; }
    eq(k, v) { this.f.push([k, x => String(x) === String(v)]); return this; }
    gte(k, v) { this.f.push([k, x => x >= v]); return this; }
    lt(k, v) { this.f.push([k, x => x < v]); return this; }
    gt(k, v) { this.f.push([k, x => x > v]); return this; }
    in(k, v) { this.f.push([k, x => v.includes(x)]); return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.one = true; return this; }
    order(k, o) { this.ord = [k, !(o && o.ascending === false)]; return this; }
    maybeSingle() { this.one = true; return this; }
    range(a, b) { this.rg = [a, b]; return this; }
    upsert(rows) { this.op = 'upsert'; this.rows = [].concat(rows); return this; }
    insert(row) { this.op = 'insert'; this.rows = [].concat(row); return this; }
    update(v) { this.op = 'update'; this.val = v; return this; }
    delete() { this.op = 'delete'; return this; }
    then(res, rej) { try { res(this.run()); } catch (e) { rej(e); } }
    match(r) { return this.f.every(([k, fn]) => fn(r[k])); }
    runMsg() {   // msg_select / msg_insert 정책 + chat_broadcast 트리거 흉내
      const T = DB.tables.messages, can = r => r.room === 'all' || r.room.split(':').slice(1).includes(me()), cl = x => JSON.parse(JSON.stringify(x));
      if (this.op === 'select') {
        let d = T.filter(r => can(r) && this.match(r));
        if (this.ord) d = d.slice().sort((a, b) => (a[this.ord[0]] > b[this.ord[0]] ? 1 : -1) * (this.ord[1] ? 1 : -1));
        if (this.lim) d = d.slice(0, this.lim);
        return { data: this.one ? cl(d[0] || null) : cl(d), error: null };
      }
      if (this.op === 'insert') {
        const r0 = this.rows[0], r = { id: ++DB.seq, room: r0.room, sender: me(), body: r0.body, created_at: new Date().toISOString() };
        const parts = String(r.room).split(':');
        const okRoom = r.room === 'all' || (parts.length === 3 && parts[0] === 'dm' && parts[1] < parts[2] && parts.includes(me()) && DB.tables.profiles.some(p => p.id !== me() && parts.includes(p.id)));
        if (!okRoom || !r.body || r.body.length > 1000) return { data: null, error: { message: 'new row violates row-level security policy (messages)' } };
        T.push(r); DB.chatSend(cl(r));
        return { data: this.one ? cl(r) : [cl(r)], error: null };
      }
      return { data: null, error: { message: 'not allowed' } };
    }
    run() {
      DB.calls.push(this.op + ' ' + this.t);
      const T = DB.tables[this.t], own = ownerKey[this.t];
      if (!me()) return { data: null, error: { message: 'not authenticated' } };
      if (this.t === 'messages') return this.runMsg();
      if (this.op === 'select') {
        let d = T.filter(r => (isAdmin() || r[own] === me()) && this.match(r));
        if (this.ord) d = d.slice().sort((a, b) => (a[this.ord[0]] > b[this.ord[0]] ? 1 : -1) * (this.ord[1] ? 1 : -1));
        if (this.rg) d = d.slice(this.rg[0], this.rg[1] + 1);
        d = JSON.parse(JSON.stringify(d));
        return { data: this.one ? (d[0] || null) : d, error: null };
      }
      if (this.op === 'upsert' || this.op === 'insert') {
        for (const r0 of this.rows) {
          const r = Object.assign({ created_at: new Date().toISOString() }, JSON.parse(JSON.stringify(r0)));
          if (this.t === 'progress' || this.t === 'mock_results') { r.user_id = r.user_id || me(); if (r.user_id !== me()) return { error: { message: 'RLS: 남의 기록은 쓸 수 없음' } }; }
          if (this.t === 'assignments') { if (!isAdmin()) return { error: { message: 'RLS: 관리자만 배정' } }; r.id = r.id || ++DB.seq; r.active = r.active ?? true; }
          if (this.t === 'attendance') {   // att_insert 정책: 본인 · 오늘(한국) · 현재 블록만
            r.user_id = r.user_id || me(); r.id = ++DB.seq; r.taken_at = serverNow().toISOString();
            if (r.user_id !== me() || r.day !== kst().day || r.block !== currentBlock()) return { error: { message: 'new row violates row-level security policy (attendance)' } };
          }
          const i = T.findIndex(x => pk[this.t](x) === pk[this.t](r));
          if (i >= 0) { if (this.op === 'insert') return { error: { message: 'duplicate key value violates unique constraint' } }; if (T[i][own] !== me()) return { error: { message: 'RLS: update 차단' } }; T[i] = Object.assign(T[i], r); }
          else T.push(r);
        }
        return { data: null, error: null };
      }
      if (this.op === 'update') {
        if ((this.t === 'assignments' || this.t === 'profiles') && !isAdmin()) return { error: { message: 'RLS' } };
        T.filter(r => this.match(r)).forEach(r => Object.assign(r, this.val));
        return { data: null, error: null };
      }
      if (this.op === 'delete') {
        if ((this.t === 'attendance' || this.t === 'assignments') && !isAdmin()) return { data: null, error: null };   // RLS: 조용히 0행
        DB.tables[this.t] = T.filter(r => !this.match(r));
        return { data: null, error: null };
      }
    }
  }
  // 저장소: att_photo_* 정책 흉내 (업로드는 본인 폴더 + 출석 시간, 열람은 본인·관리자, 삭제는 관리자)
  const bucket = name => ({
    upload: async (path, blob, opt) => {
      if (!me()) return { error: { message: 'not authenticated' } };
      if (path.split('/')[0] !== me() || currentBlock() == null) return { error: { message: 'new row violates row-level security policy (storage)' } };
      if (DB.storage[name + '/' + path] && !(opt && opt.upsert)) return { error: { message: 'The resource already exists' } };   // upsert면 att_photo_update 정책으로 덮어쓰기
      DB.storage[name + '/' + path] = { owner: me(), size: blob.size, type: blob.type };
      return { data: { path }, error: null };
    },
    createSignedUrl: async (path) => {
      const o = DB.storage[name + '/' + path];
      if (!o || (o.owner !== me() && !isAdmin())) return { data: null, error: { message: 'Object not found' } };
      return { data: { signedUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, error: null };
    },
    remove: async (paths) => { if (isAdmin()) paths.forEach(p => delete DB.storage[name + '/' + p]); return { data: null, error: null }; },
  });
  DB.presence = DB.presence || {}; DB.chans = DB.chans || [];
  const presSync = () => DB.chans.forEach(c => { try { c.cb && c.cb(); } catch (e) { } });
  DB.presSync = presSync;
  DB.chatSend = r => DB.chans.forEach(c => { try { if (c.bcb && (r.room === 'all' ? c.topic === 'chat:all' : r.room.split(':').slice(1).some(id => c.topic === 'chat:u:' + id))) c.bcb({ payload: r }); } catch (e) { } });
  const channel = (name, opt) => {
    const key = opt.config.presence && opt.config.presence.key, ch = {
      topic: name,
      on(type, filter, cb) { if (type === 'broadcast') this.bcb = cb; else this.cb = cb; return this; },
      subscribe(cb) {
        if (name.startsWith('chat:u:') && name !== 'chat:u:' + me()) { setTimeout(() => cb && cb('CHANNEL_ERROR'), 0); return this; }   // chat_read 정책
        DB.chans.push(this); setTimeout(() => { cb && cb('SUBSCRIBED'); presSync(); }, 0); return this;
      },
      track(p) { DB.presence[key] = [p]; presSync(); return Promise.resolve('ok'); },
      untrack() { delete DB.presence[key]; presSync(); return Promise.resolve('ok'); },
      presenceState() { return JSON.parse(JSON.stringify(DB.presence)); },
    };
    return ch;
  };
  window.supabase = {
    createClient: () => ({
      from: t => new Q(t),
      rpc: async (fn, a) => {
        if (fn === 'chat_members' && me()) return { data: DB.tables.profiles.map(p => ({ id: p.id, name: p.name })), error: null };
        if (fn === 'study_today' && me()) {   // schema.sql study_today와 같음: 모든 사용자 + 오늘 공부 구간(segs·hb)만
          const now = window.FM_TEST_NOW ? new Date(window.FM_TEST_NOW) : new Date(), day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
          return { data: DB.tables.profiles.map(p => { const r = DB.tables.progress.find(x => x.user_id === p.id && x.pid === 't:' + day); return { id: p.id, name: p.name, role: p.role, data: r ? { segs: r.data.segs, hb: r.data.hb } : null }; }), error: null };
        }
        if (fn === 'study_now' && me()) {   // schema.sql study_now와 같은 규칙(오늘 기록의 마지막 구간이 진행 중 + hb 3시간 이내, 관리자 제외)
          const now = window.FM_TEST_NOW ? new Date(window.FM_TEST_NOW) : new Date(), day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
          const rows = DB.tables.progress.filter(r => r.pid === 't:' + day && r.data && Array.isArray(r.data.segs) && r.data.segs.length && r.data.segs[r.data.segs.length - 1].e == null && (r.data.hb || r.data.segs[r.data.segs.length - 1].s) > now.getTime() - 3 * 3600e3);
          return { data: rows.map(r => DB.tables.profiles.find(p => p.id === r.user_id)).filter(p => p && p.role !== 'admin').map(p => ({ id: p.id, name: p.name, since: 0 })), error: null };
        }
        const ps = DB.tables.push_subs || (DB.tables.push_subs = []);
        if (fn === 'push_register' && me()) { DB.tables.push_subs = ps.filter(s => s.endpoint !== a.p_endpoint).concat({ endpoint: a.p_endpoint, user_id: me(), p256dh: a.p_p256dh, auth: a.p_auth }); return { data: null, error: null }; }
        if (fn === 'push_unregister' && me()) { DB.tables.push_subs = ps.filter(s => !(s.endpoint === a.p_endpoint && s.user_id === me())); return { data: null, error: null }; }
        return { data: null, error: { message: 'rpc ' + fn } };
      },
      channel,
      // 실시간 연결 흉내: keepAlive가 라이브러리 하트비트 타이머를 걷어 내고 워커 신호로 하트비트를 보내는지 확인용
      realtime: window.FM_FAKE_RT || (window.FM_FAKE_RT = { heartbeatTimer: setInterval(() => { }, 1e9), heartbeatIntervalMs: 30000, stateChangeCallbacks: { open: [], close: [], error: [], message: [] }, beats: 0, _sendHeartbeat() { this.beats++; }, isConnected: () => true, setAuth() { } }),   // 클라이언트를 여러 번 만들어도 같은 연결(실제 라이브러리도 앱의 클라이언트 하나만 씀)
      storage: { from: bucket },
      auth: {
        getSession: async () => ({ data: { session: DB.session } }),
        signInWithPassword: async ({ email, password }) => {
          const u = DB.users.find(x => x.email === email && x.pw === password);
          if (!u) return { data: {}, error: { message: 'Invalid login credentials' } };
          DB.session = { user: { id: u.id, email: u.email } }; return { data: { user: DB.session.user }, error: null };
        },
        signOut: async (o) => { if (o && o.scope === 'others') { DB.othersOut = (DB.othersOut || 0) + 1; return { error: null }; } DB.session = null; return { error: null }; },
        updateUser: async ({ password }) => {
          const u = DB.session && DB.users.find(x => x.id === DB.session.user.id);
          if (!u) return { data: null, error: { message: 'Auth session missing!' } };
          if (password === u.pw) return { data: null, error: { message: 'New password should be different from the old password.' } };
          u.pw = password; return { data: { user: DB.session.user }, error: null };
        },
      },
    }),
  };
})();
