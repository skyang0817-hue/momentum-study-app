/* 모멘텀(Momentum) 웹앱 본체 (과목 팩: packs.js · fm1.js · net.js …)
 * - 로컬 모드: config.js가 비어 있으면 localStorage에만 저장
 * - 서버 모드: Supabase 로그인 → progress / mock_results / assignments 테이블과 동기화 (RLS로 사용자별 분리)
 */
(function () {
  'use strict';
  // 화면(index.html)과 코드(app.js)의 버전이 다르면(브라우저 캐시에 옛 파일이 남은 경우) 한 번 새로고침해 맞춘다
  const APP_VER = '2026.11.16-109';
  const pageVer = (document.querySelector('meta[name="app-ver"]') || {}).content;
  if (pageVer !== APP_VER) {
    let tried = null; try { tried = sessionStorage.getItem('cpa-fm-reload'); } catch (e) { }
    if (tried !== APP_VER) { try { sessionStorage.setItem('cpa-fm-reload', APP_VER); } catch (e) { } location.reload(); return; }
  }
  const CFG = window.FM_CONFIG || {};
  const START_DAY = CFG.startDay || '2026-10-29';   // 서비스 시작일: 출석 기록표·학습일지는 이 날짜부터
  // 과목 팩: 주소의 ?subj= 또는 이 기기에서 마지막으로 연 과목. 로그인 후 계정에 허용된 과목인지 다시 확인한다.
  const PACKS = window.SWM_PACKS || {}, ORDER = (window.SWM_ORDER || Object.keys(PACKS)).filter(k => PACKS[k]);
  const SUBJ_KEY = 'swm-subj';
  let SUBJ = new URLSearchParams(location.search).get('subj');
  if (!PACKS[SUBJ]) { try { SUBJ = localStorage.getItem(SUBJ_KEY); } catch (e) { SUBJ = null; } }
  if (!PACKS[SUBJ]) SUBJ = ORDER[0];
  const PACK = PACKS[SUBJ], PT = PACK.text || {};
  ORDER.forEach(k => { const pk = PACKS[k]; pk.byId = Object.fromEntries([...pk.probs, ...((pk.ai || {}).probs || [])].map(d => [d.id, d])); pk.calcList = pk.probs.filter(d => !d.essay); });
  const ALLID = Object.assign({}, ...ORDER.map(k => PACKS[k].byId));
  const UNITS = PACK.units, PROBS = PACK.probs, SUMMARY = PACK.summary;
  const DKEY = SUBJ === 'fm2' ? 'daily' : 'daily_' + SUBJ, EKEY = SUBJ === 'fm2' ? 'exam' : 'exam_' + SUBJ;   // 과목마다 하루 목표·시험일
  const { fmt, instance } = window.FM_UTIL;
  const SB_SRC = 'vendor/supabase-2.45.4.js';   // 외부 CDN 대신 앱에 포함(npm 공식 배포본과 같은지 확인함) — CSP로 외부 스크립트를 막기 위해
  const BOX_DAYS = [0, 1, 3, 7, 14, 30, 60];   // 상자 번호별 다음 복습까지 일수
  const MOCK_MIX = PACK.mockMix, MOCK_MIN = PACK.mockMin;

  const byId = Object.fromEntries([...PROBS, ...((PACK.ai || {}).probs || [])].map(d => [d.id, d]));   // AI 출제 문제는 문제은행·모의고사 목록(PROBS)에는 넣지 않음
  const CALC = PROBS.filter(d => !d.essay);
  const uName = k => (UNITS.find(u => u.k === k) || {}).name || k;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => ymd(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const hash = s => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const rand32 = () => (Math.random() * 4294967296) >>> 0;

  let sbFail = false;
  const DEMO = new URLSearchParams(location.search).has('demo');   // 체험 모드: 서버 없이 예시 기록으로 (아래 demoSeed)
  let sb = null, uid = 'local', me = { name: '나', role: 'member' }, myAssign = [];
  let S = blank();
  function blank() { return { progress: {}, mocks: [], settings: { daily: 4, exam: '' }, memo: { c: {} }, journal: {}, timer: {} }; }
  const lsKey = () => 'cpa-fm-v1:' + uid;
  function loadLocal() { try { const j = JSON.parse(localStorage.getItem(lsKey()) || 'null'); S = j ? Object.assign(blank(), j) : blank(); if (!S.memo.c) S.memo = { c: {} }; } catch (e) { S = blank(); } }
  function saveLocal() { try { localStorage.setItem(lsKey(), JSON.stringify(S)); } catch (e) { /* 저장 공간이 막힌 브라우저 */ } }

  /* ───────── 서버 동기화 ───────── */
  const dirty = new Set(); let pushT = null, lastPull = 0;
  function badge(kind, msg) {
    const el = $('#savebadge');
    const t = { ok: ['sb-ok', '● 서버에 저장됨'], busy: ['sb-busy', '● 저장 중…'], local: ['sb-warn', '● 로컬 모드 · 이 기기에만 저장'], demo: ['sb-warn', '● 체험 모드 · 예시 기록 · 서버에 저장 안 됨'], err: ['sb-bad', '● 저장 실패 · 다시 시도합니다'], nolib: ['sb-bad', '● 서버 연결 실패 · 이 기기에만 저장 중'] }[kind];
    el.className = 'savebadge ' + t[0]; el.textContent = t[1]; el.title = msg || '';
  }
  function dataOf(pid) {
    if (pid === '_settings') return S.settings;
    if (pid === '_memo') return S.memo;
    if (pid.startsWith('j:')) return S.journal[pid.slice(2)] || (S.journal[pid.slice(2)] = { items: [] });
    if (pid.startsWith('t:')) return S.timer[pid.slice(2)] || (S.timer[pid.slice(2)] = { segs: [] });
    return S.progress[pid];
  }
  function touch(pid) {
    dataOf(pid).u = Date.now();
    dirty.add(pid); saveLocal();
    if (!sb) { badge(DEMO ? 'demo' : 'local'); return; }
    badge('busy'); clearTimeout(pushT); pushT = setTimeout(push, 700);
  }
  // 풀이 기록 합치기: 두 기기에서 따로 푼 기록이 서로를 지우지 않게 양쪽 풀이를 모두 남긴다.
  // 풀이마다 붙인 i로 같은 풀이를 알아보고(i가 없는 예전 기록은 내용과 순번으로), 다시 채점한 풀이는 나중에 저장한 쪽을 따른다.
  const attKey = h => h.i ? 'i:' + h.i : JSON.stringify([h.d, h.sc, h.mx, h.v || 0, h.m || 0]);
  const attMap = l => { const cnt = {}; return new Map(l.map(h => { const k = attKey(h); cnt[k] = (cnt[k] || 0) + 1; return [k + '#' + cnt[k], h]; })); };
  // 내 정리(note·noteAt)와 풀이별 오답 이유(hist[].w·wt)는 행 전체 저장 시각과 상관없이 더 나중에 고친 쪽을 남긴다
  function keepNotes(m, srv, loc) {
    if (!m || typeof m !== 'object') return m;
    let out = m;
    const nb = [srv, loc].filter(x => x && x.noteAt).sort((a, b) => b.noteAt - a.noteAt)[0];
    if (nb && (m.noteAt || 0) < nb.noteAt) out = Object.assign({}, out, { note: nb.note, noteAt: nb.noteAt });
    if (Array.isArray(m.hist)) {
      const tg = {};
      [srv, loc].forEach(x => (x && Array.isArray(x.hist) ? x.hist : []).forEach(h => { if (h && h.i && h.wt && (!tg[h.i] || tg[h.i].wt < h.wt)) tg[h.i] = h; }));
      const old = h => h && h.i && tg[h.i] && (h.wt || 0) < tg[h.i].wt;
      if (m.hist.some(old)) out = Object.assign({}, out, { hist: m.hist.map(h => old(h) ? Object.assign({}, h, { w: tg[h.i].w, wt: tg[h.i].wt }) : h) });
    }
    return out;
  }
  const mergeProg = (srv, loc) => keepNotes(mergeRows(srv, loc), srv, loc);
  function mergeRows(srv, loc) {
    const [newer, older] = (srv.u || 0) >= (loc.u || 0) ? [srv, loc] : [loc, srv];
    if (!Array.isArray(newer.hist) || !Array.isArray(older.hist)) return newer;
    const A = attMap(older.hist), B = attMap(newer.hist), onlyA = [...A.keys()].filter(k => !B.has(k)), onlyB = [...B.keys()].filter(k => !A.has(k));
    if (!onlyA.length) return newer;   // 더 늦게 저장한 쪽이 이미 모든 풀이를 갖고 있음 (풀이 기록이 없는 행도 여기서 끝)
    const hist = [...new Map([...A, ...B]).values()].map((h, ix) => [h, ix])
      .sort((a, b) => String(a[0].d).localeCompare(String(b[0].d)) || (a[0].t || 0) - (b[0].t || 0) || a[1] - b[1]).map(x => x[0]).slice(-40);
    const isOk = k => { const h = A.get(k) || B.get(k); return h.sc === h.mx; };
    const total = (a, b, addA, addB) => Math.max(a, b, Math.min(a + addA, b + addB));   // 40개를 넘어 잘린 기록도 있어 길이 대신 양쪽 횟수에 서로 없는 풀이를 더한다
    const nO = +older.n || 0, nN = +newer.n || 0, okO = +older.ok || 0, okN = +newer.ok || 0;
    const merged = Object.assign({}, older, newer);
    if (!newer.dr) delete merged.dr;   // 이미 채점해 지운 입력 중 답을 되살리지 않음
    return Object.assign(merged, {
      hist, n: total(nO, nN, onlyB.length, onlyA.length), ok: total(okO, okN, onlyB.filter(isOk).length, onlyA.filter(isOk).length),
      last: [older.last, newer.last].filter(Boolean).sort().pop(), u: Math.max(srv.u || 0, loc.u || 0),
    });
  }
  async function mergeBeforePush(pids) {
    const probs = pids.filter(pid => { const d = dataOf(pid); return d && Array.isArray(d.hist) && d.hist.length; });
    let moved = false;
    for (let i = 0; i < probs.length; i += 100) {
      const { data, error } = await sb.from('progress').select('pid,data').eq('user_id', uid).in('pid', probs.slice(i, i + 100));
      if (error) return error;
      (data || []).forEach(r => {
        const loc = S.progress[r.pid]; if (!loc) return;
        const m = mergeProg(r.data, loc);
        if (m !== loc) { if (m.n !== loc.n) moved = true; S.progress[r.pid] = m; }
      });
    }
    if (probs.length) saveLocal();
    if (moved) syncRefresh();
    return null;
  }
  async function pushNow() {
    if (!sb || !dirty.size) return;
    const pids = [...dirty]; dirty.clear();
    let error = null;
    try {
      error = await mergeBeforePush(pids);
      if (!error) {
        const rows = pids.map(pid => ({ user_id: uid, pid, data: dataOf(pid), updated_at: new Date().toISOString() }));
        ({ error } = await sb.from('progress').upsert(rows));
      }
    } catch (e) { error = e; }
    if (error) { pids.forEach(p => dirty.add(p)); badge('err', error.message); clearTimeout(pushT); pushT = setTimeout(push, 8000); }
    else if (!dirty.size) badge('ok');
  }
  let pushQ = Promise.resolve();
  const push = () => (pushQ = pushQ.then(pushNow));   // 저장이 겹쳐 먼저 만든 내용이 나중 내용을 덮지 않게 차례로
  // Supabase는 한 번에 최대 1000행만 돌려주므로 나눠서 모두 가져온다
  async function fetchAll(make) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const r = await make().range(from, from + 999);
      if (r.error) return r;
      out.push(...r.data);
      if (r.data.length < 1000) return { data: out, error: null };
    }
  }
  async function pull() {
    const [pg, mk, as, pf] = await Promise.all([
      fetchAll(() => sb.from('progress').select('pid,data').eq('user_id', uid).order('pid')),
      fetchAll(() => sb.from('mock_results').select('id,data,created_at').eq('user_id', uid).order('created_at')),
      sb.from('assignments').select('*').eq('user_id', uid).eq('active', true).order('created_at'),
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    ]);
    for (const r of [pg, mk, as, pf]) if (r.error) throw r.error;
    const seen = new Set(); let changed = false;
    for (const r of pg.data) {
      seen.add(r.pid);
      if (r.pid === '_settings') { if ((r.data.u || 0) >= (S.settings.u || 0)) S.settings = Object.assign(S.settings, r.data); else dirty.add('_settings'); continue; }
      if (r.pid === '_memo') { if ((r.data.u || 0) >= (S.memo.u || 0)) S.memo = Object.assign({ c: {} }, r.data); else dirty.add('_memo'); continue; }
      if (r.pid.startsWith('t:')) { const d = r.pid.slice(2), loc = S.timer[d]; if (!loc || (r.data.u || 0) >= (loc.u || 0)) S.timer[d] = r.data; else dirty.add(r.pid); continue; }
      if (r.pid.startsWith('j:')) { const d = r.pid.slice(2), loc = S.journal[d]; if (!loc || (r.data.u || 0) >= (loc.u || 0)) S.journal[d] = r.data; else dirty.add(r.pid); continue; }
      const loc = S.progress[r.pid], m = loc ? mergeProg(r.data, loc) : r.data;
      if (m !== r.data) dirty.add(r.pid);
      if (byId[r.pid] && (!loc || (m !== loc && ((m.u || 0) !== (loc.u || 0) || m.n !== loc.n || (m.hist || []).length !== (loc.hist || []).length)))) changed = true;
      S.progress[r.pid] = m;
    }
    // 오프라인에서 남긴 기록 올리기
    Object.keys(S.progress).forEach(pid => { if (!seen.has(pid)) dirty.add(pid); });
    Object.keys(S.journal).forEach(d => { if (!seen.has('j:' + d)) dirty.add('j:' + d); });
    Object.keys(S.timer).forEach(d => { if (!seen.has('t:' + d)) dirty.add('t:' + d); });
    if (S.memo.u && !seen.has('_memo')) dirty.add('_memo');
    S.mocks = mk.data.map(x => Object.assign({ id: x.id }, x.data));
    myAssign = as.data;
    if (pf.data) me = { name: pf.data.name || me.name, role: pf.data.role || 'member', subjects: pf.data.subjects };
    saveLocal();
    return changed;
  }
  async function saveMock(m) {
    saveLocal();
    if (!sb) return;
    const { id, ...data } = m;
    const { error } = await sb.from('mock_results').upsert({ id, user_id: uid, data });
    badge(error ? 'err' : 'ok', error && error.message);
  }

  /* ───────── 진도 계산 ───────── */
  const prog = pid => S.progress[pid] || (S.progress[pid] = { n: 0, box: 0, due: null, ok: 0, hist: [] });
  const peek = pid => S.progress[pid];
  const lastRes = pid => { const p = peek(pid); const h = p && p.hist[p.hist.length - 1]; return h ? (h.sc === h.mx ? 'ok' : 'bad') : 'none'; };
  const seedFor = pid => { const p = peek(pid); return !p || !p.n ? null : hash(`${uid}|${pid}|${p.n}`); };
  const curSeed = pid => { const p = peek(pid), r = p && p.rr; return r && (r.n || 0) === (p.n || 0) ? r.s : seedFor(pid); };   // 숫자 바꾸기는 진도 행 rr에 저장해 모든 기기·화면이 같은 숫자를 쓴다
  function unitAcc(progress, pk = PACK) {
    const r = {}; pk.units.forEach(u => r[u.k] = { sc: 0, mx: 0, att: 0 });
    for (const [pid, p] of Object.entries(progress)) {
      const d = pk.byId[pid]; if (!d || !p.hist) continue;
      p.hist.forEach(h => { r[d.unit].sc += h.sc; r[d.unit].mx += h.mx; r[d.unit].att++; });
    }
    return r;
  }
  function roundCounts(progress, pk = PACK) { return [1, 2, 3].map(k => pk.calcList.filter(d => (progress[d.id] || {}).n >= k).length); }

  /* ───────── 문제 카드 ───────── */
  const cards = {};   // key → 상태
  const DP_TXT = { 0: '소수점 아래 첫째 자리에서 반올림하여 정수로', 2: '소수점 아래 셋째 자리에서 반올림하여 둘째 자리까지', 4: '소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지' };
  // 기출 문제지처럼 계산 지시문을 문장으로 (밑줄은 CSS)
  function ruleText(q) {
    const unit = q.unit === '%' ? '% 단위로 ' : q.unit && !['', '%'].includes(q.unit) ? `${q.unit} 단위로 ` : '';
    return `계산결과는 ${unit}${DP_TXT[q.dp]} 표시한다.`;
  }
  // '물음 2 ①' → (물음 2) ①
  function qLabel(q, i) {
    if (q.nolab) return '';
    const m = /^물음\s*(\d+)\s*(.*)$/.exec(q.lab || '');
    return m ? `<span class="qno">(물음 ${m[1]})</span>${m[2] ? m[2] + ' ' : ''}` : `<span class="qno">(물음 ${i + 1})</span>`;
  }
  function makeCard(key, pid, mode, seed) {
    const d = byId[pid];
    const c = cards[key] = { key, pid, mode, seed, inst: instance(d, seed), ans: {}, res: {}, graded: false, shown: false, recorded: false, snap: null };
    if (mode === 'bank') { c.custom = seed !== seedFor(pid); const dr = (peek(pid) || {}).dr; if (dr && dr.s == seed) c.ans = Object.assign({}, dr.a); }   // 같은 회독 숫자로 쓰던 답 이어서
    return c;
  }
  // 문제은행·AI 출제 목록: 처음에는 한 줄로 접어 두고 누른 문제만 펼친다 (펼친 상태는 이 화면을 쓰는 동안 유지)
  const OPEN = new Set();
  const foldable = c => c.mode === 'bank' && /^(b|aw|af)-/.test(c.key);
  // 목록 한 줄: '단원명 - 핵심 개념'. 과목 팩에 정해 둔 개념이 없으면 제목에서 뽑는다
  function foldLabel(d) {
    let t = (PACK.labels || {})[d.id];
    if (!t) { t = String(d.title).replace(/^\[[^\]]*\]\s*/, '').replace(/^O\/X · /, ''); if (d.ipe) t = t.split(' · ')[0]; }
    return `${uName(d.unit)} - ${t}`;
  }
  function setFold(key, open) {
    const el = $(`#cd-${key}`); if (!el) return;
    if (open) OPEN.add(key); else OPEN.delete(key);
    el.classList.toggle('fold', !open);
    const h = el.querySelector('.card-head'); if (h) h.setAttribute('aria-expanded', String(open));
    const w = el.previousElementSibling; if (w && w.classList.contains('ai-why')) w.classList.toggle('off', !open);
  }
  const selfPending = c => c.recorded && Object.keys(c.res).length < byId[c.pid].qs.length;   // 기록은 했지만 직접 채점이 남음
  const optsOf = (q, p, cc) => q.optsf ? q.optsf(p, cc) : q.opts;
  function roundTag(c) {
    if (byId[c.pid].essay) return `<span class="tag">${PT.essayTag || '약술형'}</span>`;
    if (byId[c.pid].fixed) { const n = (peek(c.pid) || {}).n || 0; return c.mode === 'mock' ? '' : `<span class="tag${n ? ' okt' : ''}">${n + 1}회독</span>`; }
    if (byId[c.pid].official) return `<span class="tag y26">${byId[c.pid].official} 기출</span>`;
    if (c.mode === 'mock' || c.mode === 'review') return '<span class="tag warnt">모의고사 숫자</span>';
    const p = peek(c.pid), n = p ? p.n : 0;
    if (selfPending(c)) return `<span class="tag warnt">${n}회독 · 직접 채점 남음</span>`;
    if (c.seed == null) return '<span class="tag">1회독 · 기본 숫자</span>';
    if (c.seed === seedFor(c.pid)) return `<span class="tag okt">${n + 1}회독 · 변형 숫자</span>`;
    return '<span class="tag warnt">연습 숫자</span>';
  }
  const ansCopy = c => Object.fromEntries(Object.entries(c.ans).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 3000) : v]));
  // 문제은행·AI 출제에서 입력 중인 답: 진도 행의 dr에 저장해 다른 기기에서 이어 쓴다 (채점하면 지난 답 la로 옮김)
  let bdT = null; const bdK = new Set();
  function bankDraft(c) {
    if (c.mode !== 'bank' || c.recorded) return;
    const a = ansCopy(c), p = prog(c.pid);
    if (Object.keys(a).length) p.dr = { s: c.seed == null ? null : c.seed, a }; else delete p.dr;
    bdK.add(c.pid); clearTimeout(bdT); bdT = setTimeout(bankDraftFlush, 800);
  }
  function bankDraftFlush() { clearTimeout(bdT); bdK.forEach(pid => touch(pid)); bdK.clear(); }
  // 펼친 문제의 각 물음에 지난 풀이의 맞음/틀림을 보여 준다. 새로 채점하면 이번 결과로 바뀐다.
  function qLastHTML(c, i) {
    const la = foldable(c) && !c.graded ? (peek(c.pid) || {}).la : null; if (!la || !la.r) return '';
    const r = la.r[i], [k, t] = r === true ? ['ok', '맞음'] : r === false ? ['no', '틀림'] : ['none', '직접 채점 안 함'];
    return `<div class="q-last ${k}">지난 풀이: ${t}</div>`;
  }
  function lastAnsHTML(c) {
    const la = (peek(c.pid) || {}).la; if (!la || !la.a || c.mode !== 'bank' || c.graded) return '';
    const d = byId[c.pid]; let inst = null;
    try { inst = instance(d, la.s == null ? null : la.s); } catch (e) { }
    const rows = d.qs.map((q, i) => {
      const v = la.a[i]; let txt = v == null ? '(입력 안 함)' : String(v);
      if (q.type === 'choice' && v != null && inst) { try { txt = String(optsOf(q, inst.p, inst.c)[v]); } catch (e) { } }
      const r = (la.r || {})[i];
      return `<div class="la-q"><b>${esc(q.lab || '물음 ' + (i + 1))}</b> ${esc(txt)}${r === true ? ' <span class="la-ok">맞음</span>' : r === false ? ' <span class="la-no">틀림</span>' : ' <span class="la-note">직접 채점 안 함 · 틀림으로 계산</span>'}</div>`;
    }).join('');
    return `<details class="last-ans"><summary>지난 풀이에서 쓴 내 답 (${esc(String(la.d).slice(5))})</summary>${rows}<div class="la-note">회독마다 숫자가 바뀌어 지금 문제와 숫자가 다를 수 있어요.</div></details>`;
  }
  // 채점해 기록하면 카드 아래 '풀이 기록' 줄을 바로 새로 (전에는 화면을 다시 열 때까지 지난 기록이 보였음)
  function histPaint(c) {
    if (c.mode !== 'bank' || !c.recorded) return;
    const card = $(`#cd-${c.key}`); if (!card) return;
    const old = card.querySelector('.hist'), html = histLine(c.pid);
    if (old) old.outerHTML = html; else { const a = $(`#wt-${c.key}`); if (a && html) a.insertAdjacentHTML('afterend', html); }
  }
  function histLine(pid) {
    const p = peek(pid); if (!p || !p.hist.length) return '';
    const tail = p.hist.slice(-6).map(h => `${h.d.slice(5)} ${h.sc}/${h.mx}`).join(' · ');
    return `<div class="hist">풀이 기록 ${p.hist.length}회 — ${tail}${p.due ? ` · 다음 복습 <b>${p.due}</b>` : ''}</div>`;
  }
  // 2차 재무관리 기출 변형 문제의 출처 주석: trend('2018 문1·2021 문1 (교체 결정…)')에서 연도·문항만 뽑아 "2018년(제53회) 문제 1"로 (2026년 = 제61회)
  function srcNote(d) {
    if (SUBJ !== 'fm2' || d.official || d.ai || !d.trend) return '';
    const items = []; let last = 0;
    d.trend.replace(/\([^)]*\)/g, ' ').split('·').forEach(tok => {
      tok = tok.trim(); let m;
      if ((m = /^(\d{4})\s*년?\s*문\s*(\d+)/.exec(tok))) { last = +m[1]; items.push([last, +m[2]]); }
      else if (last && (m = /^(\d{1,2})(?!\d)/.exec(tok))) items.push([last, +m[1]]);   // '2018 문6·7'의 7
    });
    if (!items.length) return '';
    items.sort((a, b) => a[0] - b[0] || a[1] - b[1]);   // 연도순
    return `<div class="src-note">※ ${d.essay ? '참고 기출' : '기출 변형'}: ${items.map(([y, n]) => `${y}년(제${y - 1965}회) 문제 ${n}`).join(' · ')}</div>`;
  }
  function cardHTML(c, no) {
    const d = byId[c.pid], { p, c: cc } = c.inst;
    const mock = c.mode === 'mock' || c.mode === 'review', ro = c.mode === 'review' || c.qtOver ? ' readonly' : '';
    const st = c.recorded ? (selfPending(c) ? 'st-part' : Object.values(c.res).every(Boolean) ? 'st-ok' : Object.values(c.res).some(Boolean) ? 'st-part' : 'st-bad') : '';
    const lr = lastRes(c.pid);
    const qs = d.qs.map((q, i) => {
      const text = q.textf ? q.textf(p) : q.text;
      let input = '';
      if (q.type === 'num') input = `<div class="qin"><input class="my1" data-k="${c.key}" data-qi="${i}" inputmode="decimal" autocomplete="off" placeholder="답 입력" value="${esc(c.ans[i] || '')}"${ro}><span class="uname">${esc(q.unit)}</span><span class="res" id="r-${c.key}-${i}"></span></div>`;
      else if (q.type === 'text') input = `<div class="qin qtx">${q.mono || (q.rows || 1) > 1 ? `<textarea class="my my1 mytext${q.mono ? ' mono' : ''}" rows="${q.rows || 2}" data-k="${c.key}" data-qi="${i}" autocomplete="off" spellcheck="false" placeholder="답 입력"${ro}>${esc(c.ans[i] || '')}</textarea>` : `<input class="my1 mytext" data-k="${c.key}" data-qi="${i}" autocomplete="off" spellcheck="false" placeholder="답 입력" value="${esc(c.ans[i] || '')}"${ro}>`}<span class="res" id="r-${c.key}-${i}"></span></div>`;
      else if (q.type === 'choice') input = `<div class="qin${q.mc ? ' mc' : ''}">${optsOf(q, p, cc).map((o, j) => `<button class="opt${c.ans[i] === j ? ' on' : ''}" data-act="opt" data-k="${c.key}" data-qi="${i}" data-j="${j}">${esc(o)}</button>`).join('')}<span class="res" id="r-${c.key}-${i}"></span></div>`;
      else input = `<textarea class="my" data-k="${c.key}" data-qi="${i}" placeholder="답안을 적어 보세요 (채점 후 모범답안과 비교)"${ro}>${esc(c.ans[i] || '')}</textarea><div class="qin" id="self-${c.key}-${i}" hidden><span class="uname">직접 채점</span><button class="btn ok" data-act="self" data-k="${c.key}" data-qi="${i}" data-v="1">맞음</button><button class="btn bad" data-act="self" data-k="${c.key}" data-qi="${i}" data-v="0">틀림</button><span class="res" id="r-${c.key}-${i}"></span></div>`;
      return `<div class="q"><div class="qhead">${qLabel(q, i)}<div class="qtext">${text}${q.type === 'num' && !q.norule ? ` <span class="rule">${ruleText(q)}</span>` : ''}</div></div>${qLastHTML(c, i)}${input}<div class="sol" id="s-${c.key}-${i}"></div></div>`;
    }).join('');
    const fd = foldable(c), isOpen = OPEN.has(c.key), band = fd && !st && lr !== 'none' ? (lr === 'ok' ? 'st-ok' : 'st-bad') : st;
    return `<article class="card ${band}${fd ? ' foldable' : ''}${fd && !isOpen ? ' fold' : ''}" id="cd-${c.key}">
      ${fd ? `<button class="card-head" type="button" data-act="fold" data-k="${c.key}" aria-expanded="${isOpen}"><span class="ch-mark" aria-hidden="true"></span><span class="ch-txt">${esc(foldLabel(d))}</span>${qtOn(c) ? `<span class="ch-qt" id="qth-${c.key}">${qtRun(c) ? '⏱ ' + mmss(QT[c.key].e - nowMs()) : ''}</span>` : ''}</button>` : ''}
      ${fd ? '<div class="card-body">' : ''}
      <div class="meta"><span class="num">${no ? `문제 ${no}` : ''}</span><span class="tag unit">${uName(d.unit)}</span><span class="tag">${d.pts}점</span>${d.ai ? `<span class="tag ait">AI 출제 · 난이도 ${d.lv}</span>` : d.real ? '<span class="tag badt">실전형</span>' : ''}${roundTag(c)}
        ${!mock && lr !== 'none' ? `<span class="tag ${lr === 'ok' ? 'okt' : 'badt'}">최근 ${lr === 'ok' ? '모두 맞음' : '틀림 있음'}</span>` : ''}
        ${!mock && !d.ai ? `<span class="tag" title="출제 경향 참고">경향: ${esc(d.trend)}</span>` : ''}</div>
      <h3 class="ctitle">${esc(d.title)}</h3>
      ${qtOn(c) ? `<div class="qt-bar" id="qt-${c.key}">${qtBarHTML(c)}</div>` : ''}
      <div class="paper">
        <div class="pno">【문제 ${no || ''}】 (${d.pts}점)</div>
        ${c.mode === 'mock' ? '' : srcNote(d)}
        <div class="qbody">${d.body(p, cc)}</div>
        ${fd && !c.graded && (peek(c.pid) || {}).hist && peek(c.pid).hist.length && !peek(c.pid).la ? '<div class="q-last-none">이전 풀이는 물음별 기록이 없어요. 다시 풀면 물음마다 저장됩니다.</div>' : ''}
        <div class="qs">${qs}</div>
      </div>
      ${d.explain ? `<div class="xpl" id="x-${c.key}"></div>` : ''}
      ${!mock ? `<div class="actions"><button class="btn primary" data-act="grade" data-k="${c.key}">채점하기</button><button class="btn" data-act="showsol" data-k="${c.key}">${c.shown ? '해설 숨기기' : '해설 보기'}</button>${d.essay || d.official || d.fixed ? '' : `<button class="btn ghost" data-act="reroll" data-k="${c.key}" title="같은 유형을 다른 숫자로 다시 풀기">🔀 숫자 바꾸기</button>`}</div>` : ''}
      <div class="verdict" id="v-${c.key}"></div>
      <div class="wt" id="wt-${c.key}" data-wpid="${esc(c.pid)}" data-wai="${esc(wtAi(c))}">${wtHTML(c)}</div>
      ${c.mode === 'bank' && oldNote(c.pid) ? `<div class="ipe-note"><b>내 메모(이전 앱)</b>${esc(oldNote(c.pid))}</div>` : ''}
      ${!mock ? histLine(c.pid) + lastAnsHTML(c) : ''}
      ${fd ? `<div class="card-foot"><button class="btn ghost" type="button" data-act="fold-close" data-k="${c.key}">접기</button><button class="btn" type="button" data-act="fold-next" data-k="${c.key}">다음 문제 ▸</button></div></div>` : ''}
    </article>`;
  }
  function solHTML(c, i) {
    const d = byId[c.pid], q = d.qs[i], { p, c: cc } = c.inst;
    if (q.type === 'essay') {
      const txt = c.ans[i] || '';
      return `<b>모범답안</b> ${esc(q.model)}<div>${q.kw.map(k => `<span class="kw${txt.includes(k) ? ' hit' : ''}">${esc(k)}</span>`).join('')}</div>${q.extra || ''}`;
    }
    if (q.type === 'text') {   // 정답(과목 팩이 만든 HTML) + 틀렸을 때 채점 안내
      const why = c.res[i] === false && q.msg ? q.msg(c.ans[i] || '') : '';
      return `정답 <span class="ans tx${q.mono ? ' pre' : ''}">${q.show}</span>${why ? ` <span class="mut">(${esc(why)})</span>` : ''}${q.sol ? '<br>' + q.sol(p, cc) : ''}`;
    }
    const a = q.ans(cc, p);
    const shown = q.type === 'choice' ? optsOf(q, p, cc)[a] : `${fmt(a, q.dp)} ${q.unit}`;
    return `정답 <span class="ans">${esc(shown)}</span><br>${q.sol ? q.sol(p, cc) : ''}`;
  }
  function parseNum(s) { const t = String(s || '').replace(/[,\s원%만억주년배계약pt]/g, '').replace(/[−–]/g, '-'); return t === '' || isNaN(+t) ? null : +t; }
  function checkNum(q, a, v) {
    if (v == null) return false;
    return [a, ...(q.alts || [])].some(x => {
      const r = Math.round(x * 10 ** q.dp) / 10 ** q.dp;
      return Math.abs(v - r) <= (q.tol != null ? q.tol : Math.max(10 ** -q.dp, Math.abs(x) * 0.001)) + 1e-9;
    });
  }
  function showResult(c, i) {
    const el = $(`#r-${c.key}-${i}`); if (!el) return;
    const r = c.res[i];
    el.className = 'res ' + (r === true ? 'ok' : r === false ? 'bad' : '');
    el.textContent = r === true ? '✔ 정답' : r === false ? '✘ 오답' : '';
  }
  function revealSol(c, on = true) {
    byId[c.pid].qs.forEach((q, i) => { const s = $(`#s-${c.key}-${i}`); if (!s) return; s.innerHTML = solHTML(c, i); s.classList.toggle('on', on); });
    const x = $(`#x-${c.key}`); if (x) { x.innerHTML = on ? '<h4 class="xh">그림으로 보는 풀이</h4>' + byId[c.pid].explain(c.inst.p, c.inst.c) : ''; x.classList.toggle('on', on); }   // AI 출제 문제: 그림·풀이 근거
    c.shown = on;
  }
  function grade(c) {
    const d = byId[c.pid], { p, c: cc } = c.inst;
    if (qtRun(c)) { c.qtFrac = (nowMs() - QT[c.key].b) / Math.max(1, QT[c.key].e - QT[c.key].b); c.qtMsg = `풀이 시간 ${mmss(nowMs() - QT[c.key].b)} / ${QT_MIN[qtLv(d)]}분`; delete QT[c.key]; qtSave(); qtPaint(c.key); }
    d.qs.forEach((q, i) => {
      if (q.type === 'num') c.res[i] = checkNum(q, q.ans(cc, p), parseNum(c.ans[i]));
      else if (q.type === 'choice') c.res[i] = c.ans[i] === q.ans(cc, p);
      else if (q.type === 'text') c.res[i] = !!q.check(c.ans[i] || '');
      else { const sf = $(`#self-${c.key}-${i}`); if (sf) sf.hidden = false; }
      showResult(c, i);
    });
    c.graded = true; revealSol(c, true);
    const el = $(`#cd-${c.key}`); if (el) el.querySelectorAll('.q-last,.q-last-none').forEach(x => x.remove());
    const sb_ = $(`#cd-${c.key} [data-act="showsol"]`); if (sb_) sb_.textContent = '해설 숨기기';
    maybeRecord(c);
  }
  // 채점한 뒤 답을 바꾸면: 그 물음의 결과 표시를 지우고 다시 채점할 수 있게 (다시 채점하면 이번 회독 기록이 새 결과로 바뀜)
  function ungrade(c, i) {
    if (!c.graded || c.mode === 'mock' || c.mode === 'review') return;
    c.graded = false; delete c.res[i]; showResult(c, i);
    const v = $(`#v-${c.key}`); if (v) { v.className = 'verdict on v-part'; v.textContent = '답을 바꿨어요 · 채점하기를 다시 누르면 이번 회독 기록이 새 결과로 바뀝니다.'; }
    const card = $(`#cd-${c.key}`); if (card) card.classList.remove('st-ok', 'st-part', 'st-bad');
  }
  function verdict(c) {
    const d = byId[c.pid], v = $(`#v-${c.key}`); if (!v) return;
    const total = d.qs.length, done = Object.keys(c.res).length, ok = Object.values(c.res).filter(Boolean).length;
    v.className = 'verdict on ' + (done < total ? 'v-part' : ok === total ? 'v-ok' : ok ? 'v-part' : 'v-bad');
    if (done < total && c.recorded) v.textContent = `${done ? `자동 채점 ${ok}/${done} 정답 · ` : ''}풀이를 기록했어요. 직접 채점이 남은 물음은 틀린 것으로 계산되니, 맞음/틀림을 고르면 점수와 복습일이 바로잡힙니다.`;
    else if (done < total) v.textContent = done ? `자동 채점 ${ok}/${done} 정답 · 나머지를 직접 채점하면 기록됩니다.` : '모범답안과 비교해 맞음/틀림을 직접 채점하면 기록됩니다.';
    else if (c.mode === 'mock' || c.mode === 'review') v.textContent = `${ok}/${total} 정답`;
    else {
      const pr = peek(c.pid);
      v.textContent = `${ok}/${total} 정답 — ${ok === total ? `모두 맞았어요. 다음 복습은 ${pr.due}` : `틀린 물음이 있어 내일(${pr.due}) 다시 나옵니다`}${c.seed == null || byId[c.pid].fixed ? '' : ' · 다음 회독엔 또 다른 숫자로 출제'}`;
    }
    const card = $(`#cd-${c.key}`);
    if (card && done === total) card.classList.remove('st-ok', 'st-part', 'st-bad');
    if (card && done === total) card.classList.add(ok === total ? 'st-ok' : ok ? 'st-part' : 'st-bad');
    else if (card && c.recorded) { card.classList.remove('st-ok', 'st-bad'); card.classList.add('st-part'); }   // 직접 채점이 남은 기록: 다시 그린 카드와 같은 색
  }
  function maybeRecord(c) {
    const total = byId[c.pid].qs.length, done = Object.keys(c.res).length;
    if ((done === total || c.graded) && c.mode !== 'mock') {
      const was = c.recorded && c.attI ? histOf(c.pid, c.attI) : null;   // 직접 채점을 바꿔 다시 기록해도 고른 오답 이유는 유지
      if (c.recorded) Object.assign(S.progress, { [c.pid]: JSON.parse(c.snap) });   // 직접 채점을 바꾸면 다시 기록
      else c.snap = JSON.stringify(prog(c.pid));
      record(c); c.recorded = true;
      const now = histOf(c.pid, c.attI); if (was && now && was.w) { now.w = was.w.slice(); now.wt = was.wt; touch(c.pid); }
    }
    verdict(c); wtPaint(c); histPaint(c);
    if (c.daily) { if (dmLocked(c) && !DM.bulk) dmScore(c.daily); }
    else if (c.mode === 'mock' && MOCK.submitted && !MOCK.bulk) mockScore();
  }
  function record(c) {
    const total = byId[c.pid].qs.length, ok = Object.values(c.res).filter(Boolean).length;
    const p = prog(c.pid), t = today();
    const h = { d: t, sc: ok, mx: total, v: c.seed == null ? 0 : 1, m: c.mode === 'mock' ? 1 : 0, i: c.attI || (c.attI = rand32().toString(36)), t: Date.now() };
    if (ok < total) { const a = autoTags(c); if (a.length) h.a = a; }   // 자동으로 알 수 있는 실수 (부호·단위·반올림·시간)
    p.n++; p.hist.push(h);
    p.la = { d: t, s: c.seed == null ? null : c.seed, a: ansCopy(c), r: Object.assign({}, c.res) }; delete p.dr; delete p.rr; bdK.delete(c.pid);   // 채점이 저장하므로 입력 중 답 저장은 취소

    if (p.hist.length > 40) p.hist = p.hist.slice(-40);
    if (ok === total) { p.box = Math.min((p.box || 0) + 1, BOX_DAYS.length - 1); p.ok = (p.ok || 0) + 1; } else p.box = 1;
    p.due = addDays(t, BOX_DAYS[p.box]); p.last = t;
    touch(c.pid); refreshCounts();
  }

  /* ───────── 문제은행 ───────── */
  const F = { unit: '전체', status: '전체', kind: '전체' };
  function renderBank() {
    $('#f-unit').innerHTML = ['전체', ...UNITS.map(u => u.k)].map(k => `<button class="chip${F.unit === k ? ' on' : ''}" data-act="f" data-f="unit" data-v="${k}">${k === '전체' ? '전체' : uName(k)} <small>${k === '전체' ? PROBS.length : PROBS.filter(d => d.unit === k).length}</small></button>`).join('');
    const kinds = Object.fromEntries([['전체', PROBS.length], ...PACK.kinds.map(([k, f]) => [k, PROBS.filter(f).length])]);
    if ($('#f-kind')) $('#f-kind').innerHTML = Object.entries(kinds).map(([k, n]) => `<button class="chip${F.kind === k ? ' on' : ''}" data-act="f" data-f="kind" data-v="${k}">${k} <small>${n}</small></button>`).join('');
    $('#f-status').innerHTML = ['전체', '미풀이', '틀림', '맞음', '복습 예정'].map(k => `<button class="chip${F.status === k ? ' on' : ''}" data-act="f" data-f="status" data-v="${k}">${k}</button>`).join('');
    const t = today(), asg = new Set(myAssign.map(a => a.unit));
    if ($('#bank-import')) $('#bank-import').innerHTML = ipeImportBox();
    $('#bank-assign').innerHTML = myAssign.length ? `<div class="assign">📌 <b>관리자 배정</b> — ${myAssign.map(a => `${esc(uName(a.unit))}${a.note ? ` (${esc(a.note)})` : ''}`).join(' · ')} 단원을 먼저 보여 줍니다.</div>` : '';
    const list = PROBS.filter(d => (F.unit === '전체' || d.unit === F.unit) && (F.kind === '전체' || (PACK.kinds.find(x => x[0] === F.kind) || [0, () => true])[1](d)) && (F.status === '전체'
      || (F.status === '미풀이' && lastRes(d.id) === 'none') || (F.status === '틀림' && lastRes(d.id) === 'bad')
      || (F.status === '맞음' && lastRes(d.id) === 'ok') || (F.status === '복습 예정' && (peek(d.id) || {}).due && peek(d.id).due <= t)))
      .map((d, i) => [d, i]).sort((a, b) => (asg.has(b[0].unit) - asg.has(a[0].unit)) || a[1] - b[1]).map(x => x[0]);
    $('#bank-count').textContent = `${list.length}문제 · 물음 ${list.reduce((s, d) => s + d.qs.length, 0)}개`;
    $('#bank-list').innerHTML = list.length ? list.map((d, i) => { const key = 'b-' + d.id; const c = cards[key] || makeCard(key, d.id, 'bank', curSeed(d.id)); return cardHTML(c, i + 1); }).join('') : '<div class="empty">조건에 맞는 문제가 없습니다.</div>';
    list.forEach(d => { const c = cards['b-' + d.id]; if (c.graded) restore(c); });
  }
  function restore(c) {   // 다시 그린 카드에 채점 상태 복원
    byId[c.pid].qs.forEach((q, i) => { showResult(c, i); if (q.type === 'essay' && c.graded) { const sf = $(`#self-${c.key}-${i}`); if (sf) sf.hidden = false; } });
    if (c.shown) revealSol(c, true);
    if (c.graded) verdict(c);
    wtPaint(c);
  }


  /* ───────── AI 출제: 약점 분석 모델 · 기출 빈도 (ai_fm2.js) ───────── */
  const AIX = PACK.ai || null, AIP = AIX ? AIX.probs : [];
  const AF = { lv: '전체', pts: '전체' }, LV = ['하', '중', '상'];
  const topicOf = pid => { const d = byId[pid]; return (d && d.topic) || (AIX && AIX.topicOf[pid]) || null; };
  const tName = k => ((AIX && AIX.topics.find(t => t.k === k)) || {}).name || k;
  // 주제별 정답률 추정: 최근 풀이일수록 가중치를 크게(21일마다 절반), 풀이가 적은 주제는 내 전체 정답률 쪽으로 당겨서(베이지안 평활, 물음 3개 분량) 추정
  function weakModel() {
    const now = new Date(today() + 'T00:00:00'), T = {}; let SC = 0, MX = 0;
    AIX.topics.forEach(t => { T[t.k] = { sc: 0, mx: 0, n: 0, bad: 0 }; });
    for (const [pid, pr] of Object.entries(S.progress)) {
      const tk = topicOf(pid); if (!tk || !T[tk] || !pr || !pr.hist) continue;
      pr.hist.forEach(h => {
        const w = Math.pow(0.5, Math.max(0, (now - new Date(h.d + 'T00:00:00')) / 864e5) / 21);
        T[tk].sc += w * h.sc; T[tk].mx += w * h.mx; T[tk].n++; if (h.sc < h.mx) T[tk].bad++; SC += w * h.sc; MX += w * h.mx;
      });
    }
    const prior = MX ? SC / MX : 0.6;
    Object.values(T).forEach(x => { x.acc = (x.sc + 3 * prior) / (x.mx + 3); x.weak = 1 - x.acc; });
    return { T, prior, any: MX > 0, target: prior < 0.45 ? 0 : prior < 0.7 ? 1 : 2 };
  }
  const freqN = k => AIX.freq.filter(f => f[2] === k).length;
  function aiRank(M) {
    return AIP.map(d => {
      const x = M.T[d.topic], tried = (peek(d.id) || {}).n || 0;
      const s = x.weak + 0.1 * Math.min(x.bad, 3) / 3 - 0.08 * Math.abs(LV.indexOf(d.lv) - M.target) - 0.05 * Math.min(tried, 3) + (lastRes(d.id) === 'bad' ? 0.15 : 0) + 0.02 * freqN(d.topic) / 7;
      return { d, s, x };
    }).sort((a, b) => b.s - a.s);
  }
  function aiCards(items, pre) {
    return items.map(({ d, why }, i) => { const key = pre + d.id; const c = cards[key] || makeCard(key, d.id, 'bank', curSeed(d.id)); return `<div class="ai-why${OPEN.has(key) ? '' : ' off'}">${why}</div>` + cardHTML(c, i + 1); }).join('');
  }
  function aiRestore(items, pre) { items.forEach(({ d }) => { const c = cards[pre + d.id]; if (c && c.graded) restore(c); }); }
  function renderAiw() {
    if (!AIX) return;
    const M = weakModel(), rank = aiRank(M);
    const top = AIX.topics.map(t => Object.assign({ t }, M.T[t.k])).filter(x => x.n).sort((a, b) => b.weak - a.weak).slice(0, 6);
    $('#aiw-model').innerHTML = `<h3>내 약점 분석</h3>` + (M.any
      ? `<div class="ai-bars">${top.map(x => `<div class="ai-bar"><span class="nm">${esc(x.t.name)} <small>${esc(uName(x.t.unit))}</small></span><span class="bar"><i style="width:${Math.round(x.acc * 100)}%"></i></span><span class="pc">${Math.round(x.acc * 100)}%</span><small class="mut">풀이 ${x.n}회 · 틀림 ${x.bad}회</small></div>`).join('')}</div>`
      : '<div class="mut">아직 풀이 기록이 없어요. 문제은행·모의고사를 풀면 약한 주제부터 추천합니다. 지금은 권장 난이도와 기출 빈도 순서로 보여 줘요.</div>')
      + `<div class="ai-how">추정 방법: 문제은행·모의고사·AI 출제 풀이 기록을 세부 주제 ${AIX.topics.length}개로 묶어 정답률을 구하되, 최근 풀이일수록 크게 반영(21일마다 절반)하고 풀이가 적은 주제는 내 전체 정답률(${Math.round(M.prior * 100)}%)에 가깝게 추정합니다. 권장 난이도: <b>${LV[M.target]}</b></div>`;
    const cnt = (k, v) => AIP.filter(d => v === '전체' || String(d[k]) === v).length;
    $('#aiw-f').innerHTML = `<div class="frow"><span class="lbl">난이도</span>${['전체', ...LV].map(v => `<button class="chip${AF.lv === v ? ' on' : ''}" data-act="af" data-f="lv" data-v="${v}">${v} <small>${cnt('lv', v)}</small></button>`).join('')}</div>`
      + `<div class="frow"><span class="lbl">크기</span>${['전체', '10', '15', '20'].map(v => `<button class="chip${AF.pts === v ? ' on' : ''}" data-act="af" data-f="pts" data-v="${v}">${v === '전체' ? '전체' : v + '점'} <small>${cnt('pts', v)}</small></button>`).join('')}</div>`;
    const items = rank.filter(({ d }) => (AF.lv === '전체' || d.lv === AF.lv) && (AF.pts === '전체' || String(d.pts) === AF.pts))
      .map(({ d, x }) => ({ d, why: `추천 이유 · <b>${esc(tName(d.topic))}</b> ${x.n ? `추정 정답률 ${Math.round(x.acc * 100)}% (풀이 ${x.n}회)` : '아직 풀지 않은 주제'}${lastRes(d.id) === 'bad' ? ' · 이 문제를 최근에 틀림' : ''} · 난이도 ${d.lv} · ${d.pts}점` }));
    $('#aiw-list').innerHTML = items.length ? aiCards(items, 'aw-') : '<div class="empty">조건에 맞는 문제가 없습니다.</div>';
    aiRestore(items, 'aw-');
  }
  // 출제 빈도표는 기본으로 접어 두고, 펼친 상태는 이 기기에 기억한다
  (function aifFold() {
    const el = $('#aif-fold'); if (!el) return;
    try { el.open = localStorage.getItem('cpa-fm-aif-open') === '1'; } catch (e) { }
    el.addEventListener('toggle', () => { try { localStorage.setItem('cpa-fm-aif-open', el.open ? '1' : '0'); } catch (e) { } });
  })();
  function renderAif() {
    if (!AIX) return;
    const [y0, y1] = AIX.years, yrs = []; for (let y = y0; y <= y1; y++) yrs.push(y);
    const aiT = new Set(AIP.map(d => d.topic));
    const rows = AIX.topics.map(t => { const ys = AIX.freq.filter(f => f[2] === t.k).map(f => f[0]); const last = Math.max(...ys); return { t, n: ys.length, ys: new Set(ys), last, gap: y1 - last }; });
    const maxN = Math.max(...rows.map(r => r.n));
    $('#aif-table').innerHTML = UNITS.map(u => `<div class="fq-unit"><h4>${esc(u.name)} <small>${rows.filter(r => r.t.unit === u.k).reduce((s, r) => s + r.n, 0)}문제</small></h4>${rows.filter(r => r.t.unit === u.k).map(r => `
      <div class="fq-row${aiT.has(r.t.k) ? ' ai' : ''}"><span class="nm">${esc(r.t.name)}${aiT.has(r.t.k) ? ' <span class="tag ait">AI 문제</span>' : ''}</span>
        <span class="fq-n"><i style="width:${Math.round(r.n / maxN * 100)}%"></i><b>${r.n}회</b></span>
        <span class="fq-y">${yrs.map(y => `<i class="${r.ys.has(y) ? 'on' : ''}" title="${y}"></i>`).join('')}</span>
        <span class="fq-g${r.gap >= 3 && r.n >= 2 ? ' gap' : ''}">마지막 ${r.last}${r.gap ? ` · 공백 ${r.gap}년` : ''}</span></div>`).join('')}</div>`).join('')
      + `<div class="fq-axis">점은 ${y0}년(왼쪽)부터 ${y1}년(오른쪽)까지 출제 여부 · <span class="fq-g gap">주황</span> = 2회 이상 나왔는데 3년 넘게 안 나온 주제</div>`;
    const items = AIP.map(d => { const r = rows.find(x => x.t.k === d.topic); return { d, why: `출제 근거 · <b>${esc(r.t.name)}</b> 10년 ${r.n}회 · 마지막 ${r.last}년${r.gap ? ` (공백 ${r.gap}년)` : ''} — ${r.gap >= 3 ? '오래 안 나온 주제' : '빈출 주제'}` }; });
    $('#aif-list').innerHTML = aiCards(items, 'af-');
    aiRestore(items, 'af-');
  }


  /* ───────── 정보처리기사: 예전 앱 기록 가져오기 (data/progress.json → 회독 기록·메모) ───────── */
  const ipeNotes = () => peek('ipe-notes') || {};
  async function ipeImport(file) {
    let json; try { json = JSON.parse(await file.text()); } catch (err) { alert('JSON 파일을 읽지 못했어요: ' + err.message); return; }
    if (!json || typeof json.items !== 'object' || !PACK.importOld) { alert('예전 정보처리기사 앱 폴더의 data\\progress.json 파일을 골라 주세요.'); return; }
    const { prog, notes } = PACK.importOld(json, { BOX_DAYS, addDays });
    let added = 0, skipped = 0, nNotes = 0;
    for (const [pid, p] of Object.entries(prog)) {
      const cur = peek(pid);
      if (cur && cur.n) { if (p.note && !cur.note) { cur.note = p.note; touch(pid); nNotes++; } skipped++; continue; }
      S.progress[pid] = Object.assign({ n: 0, box: 0, due: null, ok: 0, hist: [] }, cur || {}, p); touch(pid);
      if (p.hist) added++; if (p.note) nNotes++;
    }
    const old = ipeNotes();
    S.progress['ipe-notes'] = { n: 0, box: 0, due: null, ok: 0, hist: [], cx: Object.assign({}, old.cx || {}, notes.cx), mine: notes.u.length ? notes.u : (old.mine || []), plan: Object.assign({}, old.plan || {}, notes.plan || {}), at: today() };   // u는 저장 시각 필드라 내 개념은 mine
    touch('ipe-notes'); refreshCounts(); renderBank();
    alert(`가져오기 완료\n· 문제 풀이 기록 ${added}개${skipped ? ` (이 앱에서 이미 푼 ${skipped}개는 그대로 둠)` : ''}\n· 문제 메모 ${nNotes}개\n· 개념 메모 ${Object.keys(notes.cx).length}개 · 내가 추가한 개념 ${notes.u.length}개 · 단원 메모 ${Object.keys(notes.plan || {}).length}개\n개념 찾기 첫 화면의 '내 정리 모아보기'에서 한꺼번에 볼 수 있어요.\n예전 앱 파일과 기록은 바뀌지 않았어요.`);
  }
  function ipeImportBox() {
    if (!PACK.importable) return '';
    const n = ipeNotes();
    return `<div class="ipe-imp"><span>${n.at ? `예전 정보처리기사 앱 기록을 가져왔어요 (${esc(n.at)}).` : '예전 정보처리기사 실기 앱에서 공부한 기록(맞음·틀림·메모)을 이 앱으로 옮길 수 있어요. PC에서 예전 앱 폴더의 <b>data\\progress.json</b>을 고르세요.'}</span>`
      + `<button class="btn${n.at ? ' ghost' : ' primary'}" data-act="ipe-import">${n.at ? '다시 가져오기' : '이전 앱 기록 가져오기'}</button><input type="file" id="ipeFile" accept=".json,application/json" hidden></div>`;
  }

  /* ───────── 모의고사 ───────── */
  const MOCK = { keys: [], t0: 0, timer: null, submitted: false, rec: null };
  function pickMock() {
    const out = [];
    for (const [u, n] of Object.entries(MOCK_MIX)) {
      const pool = CALC.filter(d => d.unit === u && (!PACK.mockPool || PACK.mockPool(d))).sort((a, b) => ((peek(a.id) || {}).n || 0) - ((peek(b.id) || {}).n || 0) || Math.random() - 0.5);
      out.push(...pool.slice(0, n));
    }
    return out;
  }
  function mockStart() {
    if (MOCK.timer && !MOCK.submitted && !confirm('진행 중인 모의고사를 버리고 새로 시작할까요?')) return;
    clearInterval(MOCK.timer);
    const set = pickMock();
    MOCK.keys = set.map((d, i) => { const key = `m${i}-${d.id}`; makeCard(key, d.id, 'mock', rand32()); return key; });
    MOCK.submitted = false; MOCK.t0 = Date.now(); MOCK.rec = null;
    $('#mock-list').innerHTML = MOCK.keys.map((k, i) => cardHTML(cards[k], i + 1)).join('');
    $('#submitBtn').disabled = false; $('#mscore').textContent = '';
    MOCK.timer = setInterval(tick, 1000); tick();
    window.scrollTo({ top: 0 });
  }
  function tick() {
    const left = MOCK_MIN * 60 - Math.floor((Date.now() - MOCK.t0) / 1000);
    $('#timer').textContent = left <= 0 ? '00:00' : `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    $('#timer').style.color = left < 600 ? 'var(--bad)' : '';
    if (left <= 0) mockSubmit(true);
  }
  function mockSubmit(auto) {
    if (MOCK.submitted) return;
    if (!auto && !confirm('제출하고 채점할까요?')) return;
    clearInterval(MOCK.timer); MOCK.submitted = true; $('#submitBtn').disabled = true;
    const mins = Math.round((Date.now() - MOCK.t0) / 60000);
    MOCK.rec = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), d: today(), mins, items: [], subj: SUBJ };
    MOCK.bulk = true; MOCK.keys.forEach(k => grade(cards[k])); MOCK.bulk = false;
    mockScore();
  }
  function mockScore() {
    let sc = 0, pend = 0;
    const items = MOCK.keys.map(k => {
      const c = cards[k], d = byId[c.pid], tot = d.qs.length, ok = Object.values(c.res).filter(Boolean).length;
      pend += tot - Object.keys(c.res).length; sc += d.pts * ok / tot;
      if (Object.keys(c.res).length === tot && !c.mrec) { c.mrec = 1; c.recorded = false; record(c); c.recorded = true; }
      const ans = Object.fromEntries(Object.entries(c.ans).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 800) : v]));
      return { pid: c.pid, u: d.unit, ok, mx: tot, pts: d.pts, seed: c.seed, res: d.qs.map((q, i) => (c.res[i] === undefined ? null : !!c.res[i])), ans };
    });
    sc = Math.round(sc * 10) / 10;
    $('#mscore').innerHTML = `점수 <span style="color:${sc >= 60 ? 'var(--ok)' : 'var(--bad)'}">${sc}</span> / 100${pend ? ` · 약술형 ${pend}개 직접 채점 대기` : ''}`;
    Object.assign(MOCK.rec, { score: sc, pending: pend, items });
    const i = S.mocks.findIndex(m => m.id === MOCK.rec.id);
    if (i < 0) S.mocks.push({ ...MOCK.rec }); else S.mocks[i] = { ...MOCK.rec };
    saveMock({ ...MOCK.rec }); renderMockHist();
  }
  // 회차별 기록: 회차·점수·단원별 정답 수·틀린 문제(물음)와, 그 회차 숫자 그대로 문제·내 답·해설 다시 보기
  const qLab = (q, i) => q.lab || (q.nolab ? '' : `물음 ${i + 1}`);   // 객관식(물음 하나)은 물음 이름 없이
  function renderMockHist() {
    const all = S.mocks.filter(m => (m.subj || 'fm2') === SUBJ);
    if (!all.length) { $('#mock-hist').innerHTML = ''; return; }
    const sc = all.map(m => +m.score || 0), best = Math.max(...sc), avg = Math.round(sc.reduce((a, b) => a + b, 0) / sc.length * 10) / 10;
    const open = new Set([...document.querySelectorAll('#mock-hist details[open]')].map(d => d.dataset.id));
    if (MOCK.rec) open.add(MOCK.rec.id);
    $('#mock-hist').innerHTML = `<div class="mh"><h3>회차별 기록 <small>${all.length}회 · 최고 ${best}점 · 평균 ${avg}점</small></h3>` + all.map((m, i) => ({ m, no: i + 1 })).reverse().map(({ m, no }) => {
      const items = m.items || [], wrong = items.map((x, j) => ({ x, j })).filter(({ x }) => x.ok < x.mx), old = items.length && !items[0].res;
      const units = UNITS.map(u => { const it = items.filter(x => x.u === u.k), ok = it.reduce((s, x) => s + x.ok, 0), mx = it.reduce((s, x) => s + x.mx, 0); return mx ? `<span class="chip">${esc(u.name)} <small>${ok}/${mx}</small></span>` : ''; }).join('');
      const list = wrong.map(({ x, j }) => {
        const d = byId[x.pid]; if (!d) return `<li class="mut">${esc(x.pid)} (지금은 없는 문제)</li>`;
        const qs = x.res ? d.qs.map((q, qi) => x.res[qi] === false ? qLab(q, qi) : x.res[qi] == null ? (qLab(q, qi) + ' 채점 대기').trim() : null).filter(Boolean) : [];
        return `<li><div class="mh-wl"><span class="tag unit">${esc(uName(d.unit))}</span><b>${esc(d.title)}</b><span class="mut">${x.ok}/${x.mx} 정답${qs.length ? ' · ' + qs.map(esc).join(', ') : ''}</span>${x.res ? `<button class="btn ghost" data-act="mock-review" data-id="${esc(m.id)}" data-j="${j}">문제·해설 보기</button>` : ''}</div><div class="mh-rv" id="rv-${esc(m.id)}-${j}"></div></li>`;
      }).join('');
      return `<details class="mh-r" data-id="${esc(m.id)}"${open.has(m.id) ? ' open' : ''}><summary><b class="mh-no">${no}회차</b><span>${esc(m.d)}</span><b style="color:${(+m.score || 0) >= 60 ? 'var(--ok)' : 'var(--bad)'}">${esc(m.score)}점</b><span class="mut">${esc(m.mins)}분 · 틀린 문제 ${wrong.length}개${m.pending ? ` · 채점 대기 ${esc(m.pending)}` : ''}</span></summary>
        <div class="mh-units">${units}</div>
        ${wrong.length ? `<ol class="mh-wrong">${list}</ol>` : '<div class="mut">모든 문제를 맞혔어요.</div>'}
        ${old ? '<div class="mut">이 회차는 예전 방식으로 저장돼 틀린 물음과 문제 다시 보기는 볼 수 없어요.</div>' : ''}</details>`;
    }).join('') + '</div>';
  }


  /* ───────── 문제별 제한 시간 (문제은행·AI 출제 목록, 팩에 qTimer가 있는 과목만 — 현재 2차 재무관리) ─────────
   * 난이도 하 10분 · 중 15분 · 상 20분. 문제은행은 난이도 표시가 없어 배점으로 정함(10점 이하 하, 15점 중, 20점 이상 상).
   * 끝나는 시각을 이 기기(localStorage)에 저장해 화면을 옮기거나 앱을 다시 열어도 이어서 센다.
   * 시간이 다 되면 자동 채점하고 답을 잠근다. 입력한 답이 하나도 없으면 0점 기록이 복습 일정을 망치지 않게 채점·기록하지 않는다. */
  const QT_MIN = { 하: 10, 중: 15, 상: 20 };
  const qtLv = d => (QT_MIN[d.lv] ? d.lv : +d.pts <= 10 ? '하' : +d.pts >= 20 ? '상' : '중');
  const qtOn = c => !!PACK.qTimer && foldable(c);
  let QT = {}, qtU = null, qtReady = false;
  const qtRun = c => { const t = QT[c.key]; return !!t && t.s === (c.seed == null ? null : c.seed); };
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  function qtLoad() { qtU = uid; try { QT = JSON.parse(localStorage.getItem('cpa-fm-qt:' + uid) || '{}') || {}; } catch (e) { QT = {}; } }
  function qtSave() { try { const k = 'cpa-fm-qt:' + uid; if (Object.keys(QT).length) localStorage.setItem(k, JSON.stringify(QT)); else localStorage.removeItem(k); } catch (e) { } }
  function qtBarHTML(c) {
    const d = byId[c.pid], lv = qtLv(d);
    if (qtRun(c)) { const left = QT[c.key].e - nowMs(); return `<span class="qt-clock${left <= 60000 ? ' end' : ''}">⏱ ${mmss(left)}</span><span class="mut">남음 · 시간이 다 되면 자동 채점</span><button class="btn ghost" data-act="qt-stop" data-k="${c.key}">타이머 취소</button>`; }
    if (c.qtMsg) return `<span class="qt-msg">${esc(c.qtMsg)}</span>`;
    if (c.graded || c.recorded) return '';
    return `<button class="btn" data-act="qt-start" data-k="${c.key}">⏱ ${QT_MIN[lv]}분 타이머 시작</button><span class="mut">난이도 ${lv}${QT_MIN[d.lv] ? '' : ' (배점 기준)'}</span>`;
  }
  function qtPaint(key) {
    const c = cards[key]; if (!c) return;
    const el = $(`#qt-${key}`), h = $(`#qth-${key}`);
    if (el) { el.innerHTML = qtBarHTML(c); el.classList.toggle('on', qtRun(c)); }
    if (h) h.textContent = qtRun(c) ? '⏱ ' + mmss(QT[key].e - nowMs()) : '';
  }
  function qtStart(c) {
    QT[c.key] = { p: c.pid, s: c.seed == null ? null : c.seed, b: nowMs(), e: nowMs() + QT_MIN[qtLv(byId[c.pid])] * 60000 };
    delete c.qtMsg; qtSave(); qtPaint(c.key);
  }
  function qtLock(c) { document.querySelectorAll(`#cd-${c.key} input.my1, #cd-${c.key} textarea`).forEach(el => { el.readOnly = true; }); }
  function qtTick() {   // 1초마다 (studyTick)
    if (!PACK.qTimer || !qtReady) return;
    if (qtU !== uid) qtLoad();
    const now = nowMs();
    Object.keys(QT).forEach(k => {
      const t = QT[k]; if (/^mt-/.test(k)) { delete QT[k]; qtSave(); return; }   // 예전(v98~v102) 점검 문제의 타이머는 버림
      if (!byId[t.p]) return;   // 다른 과목 문제는 그 과목을 열 때 처리
      let c = cards[k];
      if (c && c.seed !== t.s) { delete QT[k]; qtSave(); qtPaint(k); return; }   // 숫자가 바뀐 카드(다른 회독·숫자 바꾸기)
      if (now < t.e) {
        const ck = document.querySelector(`#qt-${k} .qt-clock`), h = $(`#qth-${k}`), txt = '⏱ ' + mmss(t.e - now);
        if (ck) { ck.textContent = txt; ck.classList.toggle('end', t.e - now <= 60000); }
        if (h) h.textContent = txt;
        return;
      }
      delete QT[k]; qtSave();
      if (!c) c = makeCard(k, t.p, 'bank', t.s);   // 화면에 없거나 앱을 다시 연 경우: 저장해 둔 입력 중 답으로
      if (c.graded || c.recorded) { qtPaint(k); return; }
      const lim = QT_MIN[qtLv(byId[t.p])];
      if (!dmaAnswered(c.ans)) c.qtMsg = `시간 종료(${lim}분) · 입력한 답이 없어 채점하지 않았어요`;
      else { c.qtOver = true; grade(c); c.qtMsg = `시간 종료(${lim}분) · 자동 채점했어요`; qtLock(c); }
      qtPaint(k);
    });
  }

  /* ───────── 오답 이유 · 오답 패턴 ─────────
   * (v101~v105의 '내 정리' 글 칸은 v106에서 없앰 — 오답 기록은 '왜 틀렸나요?' 버튼 하나로 통일. 저장된 note는 서버에 그대로 둠)
   * 오답 이유: 틀린 풀이 기록(hist 한 줄)에 w = 사용자가 고른 이유, a = 앱이 자동으로 알아낸 실수(부호·단위·반올림·빈칸·시간)
   * 오답 패턴: 단원 × 이유를 세고, 단원 비율을 '내 전체 평균'과 비교(배수). 표본이 적은 단원은 평균 쪽으로 당겨(K=5) 우연을 거름.
   *   같은 이유 3회 이상 · 1.5배 이상만 패턴으로 알려 줌. 최근 2주와 그 이전을 비교해 추세도 보여 줌. 모두 앱 안에서 계산(외부 AI 없음). */
  const WT_USER = [['calc', '계산 실수'], ['formula', '공식 혼동'], ['concept', '개념 모름'], ['read', '문제 잘못 읽음'], ['time', '시간 부족']];
  const WT_AUTO = { sign: '부호 실수', unit: '단위·% 실수', round: '반올림·끝자리 차이', blank: '빈칸', tover: '시간 종료', tpress: '시간 압박' };
  const RS_NAME = Object.assign(Object.fromEntries(WT_USER), { sign: '부호 실수', unit: '단위·% 실수', round: '반올림·끝자리 차이', blank: '빈칸(못 풂)' });
  const RS_MAP = { tover: 'time', tpress: 'time' };   // 자동 '시간 종료·시간 압박'은 '시간 부족'으로 함께 센다
  const rsOf = h => new Set([...(Array.isArray(h.w) ? h.w : []), ...(Array.isArray(h.a) ? h.a : []).map(x => RS_MAP[x] || x)].filter(r => RS_NAME[r]));
  const josa = (w, a, b) => { const m = String(w).match(/[가-힣](?=[^가-힣]*$)/); return w + (m && (m[0].charCodeAt(0) - 0xac00) % 28 ? a : b); };
  const histOf = (pid, ai) => (((peek(pid) || {}).hist) || []).find(h => h && h.i === ai);
  function autoTags(c) {
    const d = byId[c.pid], { p, c: cc } = c.inst, a = new Set();
    d.qs.forEach((q, i) => {
      if (c.res[i] !== false) return;
      const raw = c.ans[i];
      if (raw == null || raw === '') { a.add('blank'); return; }
      if (q.type !== 'num') return;
      let x; try { x = q.ans(cc, p); } catch (e) { return; }
      const v = parseNum(raw); if (v == null || !isFinite(x) || !x) return;
      const near = (y, rel) => Math.abs(v - y) <= Math.max(Math.abs(y) * rel, 10 ** -q.dp) + 1e-9;
      if (near(-x, 0.002)) a.add('sign');
      else if ([100, 0.01, 1000, 0.001, 10000, 0.0001].some(f => near(x * f, 0.005))) a.add('unit');
      else if (near(x, 0.003) || Math.abs(v - x) <= 3 * 10 ** -q.dp + 1e-9) a.add('round');
    });
    if (c.qtOver) a.add('tover'); else if (c.qtFrac >= 0.9) a.add('tpress');
    return [...a];
  }
  function wtBox(pid, ai, compact, past) {
    const h = histOf(pid, ai); if (!h || h.sc >= h.mx) return '';
    const w = new Set(Array.isArray(h.w) ? h.w : []), a = Array.isArray(h.a) ? h.a.filter(x => WT_AUTO[x]) : [];
    return `${compact ? '' : `<div class="wt-h">${past ? `<span class="wt-past">지난 풀이 ${md(h.d)} · ${h.sc}/${h.mx}</span> ` : ''}왜 틀렸나요? <span class="mut">여러 개 골라도 돼요 · 오답 패턴 분석에 쓰여요</span></div>`}
      <div class="wt-chips">${WT_USER.map(([k, t]) => `<button class="chip${w.has(k) ? ' on' : ''}" data-act="wt" data-pid="${esc(pid)}" data-ai="${esc(ai)}" data-r="${k}" aria-pressed="${w.has(k)}">${t}</button>`).join('')}</div>
      ${a.length ? `<div class="wt-auto">자동 감지 ${a.map(x => `<span class="tag">${WT_AUTO[x]}</span>`).join(' ')}</div>` : ''}`;
  }
  const oldNote = pid => { const p = peek(pid) || {}; return p.note && !p.noteAt ? p.note : ''; };   // 이전 앱에서 가져온 문제 메모(읽기 전용)
  function wtAi(c) {
    if ((c.recorded || c.mrec) && c.attI) return c.attI;
    if (!foldable(c) || c.graded) return '';
    const h = (((peek(c.pid) || {}).hist) || []).slice(-1)[0];
    return h && h.i && h.mx && h.sc < h.mx ? h.i : '';
  }
  const wtHTML = c => { const ai = wtAi(c); return ai ? wtBox(c.pid, ai, false, !(c.recorded || c.mrec)) : ''; };
  function wtPaint(c) { const el = $(`#wt-${c.key}`); if (!el) return; el.dataset.wai = wtAi(c); el.innerHTML = wtHTML(c); }
  function wtToggle(pid, ai, r) {
    const h = histOf(pid, ai); if (!h || !RS_NAME[r]) return;
    const w = new Set(Array.isArray(h.w) ? h.w : []); if (w.has(r)) w.delete(r); else w.add(r);
    h.w = [...w]; h.wt = Date.now(); touch(pid);
    document.querySelectorAll('.wt[data-wpid]').forEach(el => { if (el.dataset.wpid === pid && el.dataset.wai === ai) el.innerHTML = wtBox(pid, ai, el.classList.contains('wt-c')); });
    if ($('#pat-sum')) $('#pat-sum').innerHTML = patSumHTML(patStats(S.progress, PACK));
  }
  // 오답 패턴 통계 (관리자 화면에서도 같은 계산을 사용자별로)
  function patStats(progress, pk, now = today()) {
    const att = [];
    for (const [pid, p] of Object.entries(progress)) {
      const d = pk.byId[pid]; if (!d || !p || !Array.isArray(p.hist)) continue;
      p.hist.forEach(h => { if (h && h.mx) att.push({ pid, u: d.unit, h, bad: h.sc < h.mx, R: h.sc < h.mx ? rsOf(h) : new Set() }); });
    }
    const N = att.length, wrong = att.filter(x => x.bad), W = wrong.length, T = wrong.filter(x => x.R.size).length;
    const rs = Object.keys(RS_NAME).filter(r => wrong.some(x => x.R.has(r)));
    const cnt = Object.fromEntries(rs.map(r => [r, wrong.filter(x => x.R.has(r)).length]));
    const units = pk.units.map(u => ({ k: u.k, name: u.name, n: att.filter(x => x.u === u.k).length, c: Object.fromEntries(rs.map(r => [r, wrong.filter(x => x.u === u.k && x.R.has(r)).length])) }));
    const K = 5, flags = [];
    units.forEach(u => rs.forEach(r => {
      const c = u.c[r], base = cnt[r] / N; if (c < 3 || !base) return;
      const lift = ((c + K * base) / (u.n + K)) / base;
      if (lift >= 1.5) flags.push({ u: u.k, name: u.name, r, cnt: c, n: u.n, lift });
    }));
    flags.sort((a, b) => b.lift - a.lift || b.cnt - a.cnt);
    const cut = addDays(now, -14), rec = att.filter(x => x.h.d >= cut), old = att.filter(x => x.h.d < cut), trend = [];
    if (rec.length >= 10 && old.length >= 10) rs.forEach(r => {
      const a = old.filter(x => x.R.has(r)).length, b = rec.filter(x => x.R.has(r)).length, ra = a / old.length, rb = b / rec.length;
      if (Math.max(a, b) >= 3 && Math.abs(rb - ra) >= 0.1) trend.push({ r, ra, rb });
    });
    const rep = [];
    [...new Set(wrong.map(x => x.pid))].forEach(pid => rs.forEach(r => { const n = wrong.filter(x => x.pid === pid && x.R.has(r)).length; if (n >= 2) rep.push({ pid, r, n }); }));
    rep.sort((a, b) => b.n - a.n);
    const todo = wrong.filter(x => x.h.i && !(Array.isArray(x.h.w) && x.h.w.length) && x.h.d >= addDays(now, -30)).sort((a, b) => (b.h.t || 0) - (a.h.t || 0) || String(b.h.d).localeCompare(String(a.h.d)));
    const top = rs.map(r => {
      const by = {}; wrong.filter(x => x.R.has(r)).forEach(x => { const b = by[x.pid] || (by[x.pid] = { pid: x.pid, n: 0, d: '' }); b.n++; if (String(x.h.d) > b.d) b.d = String(x.h.d); });
      return { r, n: cnt[r], qs: Object.values(by).sort((a, b) => b.n - a.n || b.d.localeCompare(a.d)) };
    }).sort((a, b) => b.n - a.n);
    const byP = {};
    att.forEach(x => { const b = byP[x.pid] || (byP[x.pid] = { pid: x.pid, n: 0, w: 0, h: x.h }); b.n++; if (x.bad) b.w++; const c = String(x.h.d).localeCompare(String(b.h.d)); if (c > 0 || (c === 0 && (x.h.t || 0) >= (b.h.t || 0))) b.h = x.h; });
    const probs = Object.values(byP).sort((a, b) => String(b.h.d).localeCompare(String(a.h.d)) || (b.h.t || 0) - (a.h.t || 0));
    return { N, W, T, rs, cnt, units, flags, trend, rep, todo, top, probs };
  }
  const pct = x => Math.round(x * 100) + '%';
  // 패턴과 연결된 개념: 그 패턴의 오답 문제와 많이 연결된 개념 순
  function patConcepts(f, progress) {
    if (!CONCEPTS.length) return [];
    const pids = new Set(Object.entries(progress).filter(([pid, p]) => byId[pid] && byId[pid].unit === f.u && Array.isArray(p.hist) && p.hist.some(h => h && h.sc < h.mx && rsOf(h).has(f.r))).map(([pid]) => pid));
    const L = cxLinks();
    return CONCEPTS.map((c, i) => ({ i, n: L[i].probs.filter(d => pids.has(d.id)).length })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 3);
  }
  // 머리줄의 '풀이 n회'·'오답 n회'를 누르면 펼치는 문제 목록 (최근 푼 순서, 누르면 그 문제로 이동)
  const PAT = { list: null };
  const patItems = (s, k) => k === 'bad' ? s.probs.filter(x => x.w) : s.probs;
  function patListHTML(s) {
    if (!PAT.list) return '';
    const l = patItems(s, PAT.list); if (!l.length) return '';
    return `<div class="pat-list" id="pat-list"><div class="pat-st">${PAT.list === 'bad' ? `틀린 적 있는 문제 ${l.length}개` : `푼 문제 ${l.length}개`} <span class="mut">· 누르면 그 문제로 이동</span></div>${l.map(x => {
      const d = byId[x.pid], h = x.h, okH = h.sc >= h.mx;
      return `<button class="pat-li" data-act="pat-go" data-id="${esc(x.pid)}"><span class="pl-t">${qNoTag(d)} <span class="tag unit">${esc(uName(d.unit))}</span> ${esc(d.title)}</span>
        <span class="pl-m">${md(h.d)} <b class="${okH ? 'ok' : 'bad'}">${h.sc}/${h.mx}</b> · ${PAT.list === 'bad' ? `오답 ${x.w}회 / 풀이 ${x.n}회` : `풀이 ${x.n}회${x.w ? ` · 오답 ${x.w}` : ''}`} ›</span></button>`;
    }).join('')}</div>`;
  }
  function patList(k) {
    const s = patStats(S.progress, PACK), l = patItems(s, k);
    if (l.length === 1) { PAT.list = null; goProb(l[0].pid); return; }   // 문제가 하나면 바로 그 문제로
    PAT.list = PAT.list === k ? null : k;
    const box = $('#pat-sum'); if (box) box.innerHTML = patSumHTML(s);
  }
  // 문제은행 번호 = 필터 없이 연 문제은행 목록의 순서(관리자 배정 단원이 먼저) → 카드에 보이는 '문제 n'과 같다
  function bankNo(id) {
    const asg = new Set(myAssign.map(a => a.unit));
    const order = PROBS.map((d, i) => [d, i]).sort((a, b) => (asg.has(b[0].unit) - asg.has(a[0].unit)) || a[1] - b[1]);
    const i = order.findIndex(([d]) => d.id === id); return i < 0 ? 0 : i + 1;
  }
  const qShort = d => { const t = (PACK.labels || {})[d.id] || String(d.title).replace(/^\[[^\]]*\]\s*/, ''); return t.length > 22 ? t.slice(0, 21) + '…' : t; };
  const qNoTag = d => PROBS.includes(d) ? `<b class="qno-b">${bankNo(d.id)}번</b>` : '<b class="qno-b ai">AI</b>';
  // 문제로 이동: 문제은행 문제는 문제은행에서, AI 출제 문제는 '약점 맞춤 문제'에서 펼쳐 보여 줌
  function goProb(id) {
    const d = byId[id]; if (!d) return;
    let key;
    if (PROBS.includes(d)) { F.unit = '전체'; F.kind = '전체'; F.status = '전체'; openTab('bank'); key = 'b-' + id; }
    else if (AIX) { AF.lv = '전체'; AF.pts = '전체'; openTab('aiw'); key = 'aw-' + id; }
    else return;
    const el = $('#cd-' + key); if (!el) return;
    setFold(key, true); el.scrollIntoView({ block: 'start' });   // 카드의 scroll-margin-top이 위 막대만큼 띄움
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
  }
  function patSumHTML(s) {
    if (!s.N) return '<div class="mut">아직 풀이 기록이 없어요. 문제를 풀고 틀린 문제에 이유를 남기면 여기서 패턴을 알려 드려요.</div>';
    const lk = (k, label, n) => n ? `<button class="pat-lk${PAT.list === k ? ' on' : ''}" data-act="pat-list" data-k="${k}" aria-expanded="${PAT.list === k}">${label} <b>${n}</b>회</button>` : `${label} <b>0</b>회`;
    const head = `<div class="pat-head">${lk('all', '풀이', s.N)} · ${lk('bad', '오답', s.W)} · 이유가 있는 오답 <b>${s.T}</b>회 <span class="mut">(자동 감지 포함)</span></div>${patListHTML(s)}`;
    if (!s.W) return head + '<div class="mut">틀린 풀이가 없어요.</div>';
    const flags = s.flags.slice(0, 3).map(f => {
      const cx = patConcepts(f, S.progress);
      return `<div class="pat-f">📌 <b>${esc(f.name)}</b>에서 <b>${josa(RS_NAME[f.r], '이', '가')}</b> 내 평균의 <b>${f.lift.toFixed(1)}배</b>예요 <span class="mut">(${f.n}번 풀어 ${f.cnt}번)</span>
        ${cx.length ? `<div class="pat-cx">관련 개념 ${cx.map(x => `<button class="chip" data-act="pat-cx" data-i="${x.i}">${esc(CONCEPTS[x.i].name)}</button>`).join('')}</div>` : ''}</div>`;
    }).join('');
    const none = !s.flags.length ? `<div class="mut pat-wait">아직 뚜렷한 패턴은 없어요. 같은 이유가 한 단원에서 3번 이상, 내 평균보다 1.5배 이상 나오면 알려 드려요.</div>` : '';
    const trend = s.trend.map(t => `<div class="pat-t ${t.rb < t.ra ? 'up' : 'down'}">${t.rb < t.ra ? '📈' : '📉'} <b>${esc(RS_NAME[t.r])}</b> ${pct(t.ra)} → ${pct(t.rb)} <span class="mut">(풀이 대비 · 최근 2주 vs 그 전)</span></div>`).join('');
    const rep = s.rep.slice(0, 5).map(x => { const d = byId[x.pid]; return `<div class="pat-r">🔁 ${qNoTag(d)} <span>${esc(d.title)}</span> <span class="tag badt">${esc(RS_NAME[x.r])} ${x.n}회</span> <button class="chip" data-act="pat-go" data-id="${esc(d.id)}">다시 풀기</button></div>`; }).join('');
    const top = s.top.map(t => `<div class="pat-rk"><div class="pat-bar"><span>${esc(RS_NAME[t.r])}</span><i><b style="width:${Math.round(t.n / s.W * 100)}%"></b></i><span class="mut">${t.n}회</span></div>
      <div class="pat-qs">${t.qs.map(x => { const d = byId[x.pid]; return `<button class="chip pq" data-act="pat-go" data-id="${esc(x.pid)}" title="${esc(uName(d.unit) + ' · ' + d.title)}">${qNoTag(d)} ${esc(qShort(d))}${x.n > 1 ? ` <small>×${x.n}</small>` : ''}</button>`; }).join('')}</div></div>`).join('');
    const hot = new Set(s.flags.map(f => f.u + '|' + f.r));
    const mx = s.rs.length ? `<div class="wrapx"><table class="lt pat-mx"><tr><th>단원</th><th>풀이</th>${s.rs.map(r => `<th>${esc(RS_NAME[r])}</th>`).join('')}</tr>${s.units.filter(u => u.n).map(u => `<tr><td>${esc(u.name)}</td><td>${u.n}</td>${s.rs.map(r => `<td class="${hot.has(u.k + '|' + r) ? 'hot' : u.c[r] ? 'some' : ''}">${u.c[r] || ''}</td>`).join('')}</tr>`).join('')}</table></div>` : '';
    return head + flags + none + (trend ? `<div class="pat-sec">${trend}</div>` : '') + (rep ? `<div class="pat-sec"><div class="pat-st">반복 실수</div>${rep}</div>` : '')
      + (top ? `<div class="pat-sec"><div class="pat-st">오답 이유 순위 <span class="mut">· 오답 ${s.W}회 기준, 한 오답에 이유가 여러 개면 각각 셈 · 번호를 누르면 그 문제로</span></div>${top}</div>` : '') + (mx ? `<details class="pat-sec pat-mxw"><summary>단원 × 이유 표</summary>${mx}</details>` : '');
  }
  function renderPat() {
    const box = $('#pat-box'); if (!box) return;
    const s = patStats(S.progress, PACK), todo = s.todo.slice(0, 6);
    box.innerHTML = demoNotice() + `<div class="box pat"><h3>오답 패턴 <small class="mut">내가 왜 틀리는지 · 앱 안에서 계산</small></h3><div id="pat-sum">${patSumHTML(s)}</div>
      ${todo.length ? `<div class="pat-todo"><div class="pat-st">이유를 남기지 않은 최근 오답 <small class="mut">${s.todo.length > todo.length ? `${s.todo.length}개 중 최근 ${todo.length}개` : `${todo.length}개`}</small></div>${todo.map(x => { const d = byId[x.pid]; return `<div class="pat-ti"><div>${qNoTag(d)} <b>${esc(d.title)}</b> <span class="mut">${md(x.h.d)} · ${x.h.sc}/${x.h.mx}${x.h.m ? ' · 시험형' : ''}</span></div><div class="wt wt-c" data-wpid="${esc(x.pid)}" data-wai="${esc(x.h.i)}">${wtBox(x.pid, x.h.i, true)}</div></div>`; }).join('')}</div>` : ''}</div>`;
  }
  function patAdminHTML(pk, progress, label) {
    const s = patStats(progress, pk); if (!s.N) return '';
    const t = s.top[0], f = s.flags[0];
    return `<div class="hist pat-adm"><b>오답 패턴${label ? ' · ' + esc(pk.name) : ''}</b> 오답 ${s.W}/${s.N}회 · 이유 있는 오답 ${s.T}회${t ? ` · 가장 많은 이유 <b>${esc(RS_NAME[t.r])}</b> ${t.n}회` : ''}${f ? ` · 패턴 <b>${esc(f.name)} – ${esc(RS_NAME[f.r])}</b> (${f.lift.toFixed(1)}배, ${f.n}번 중 ${f.cnt}번)` : ''}</div>`;
  }

  /* ───────── 체험 모드 (?demo): 문제를 풀지 않고 오답 패턴을 둘러보기 ─────────
   * 서버에 연결하지 않고 이 기기의 별도 저장 공간(cpa-fm-v1:demo)에 예시 기록을 만든다. 실제 기록·다른 사용자에게 영향 없음.
   * 예시 = 10일 전·5일 전·오늘, 단원마다 1문제씩 문제은행에서 푼 기록 15회. 단원 순서대로 ① 모두 정답 ② 계산 실수 2회 ③ 공식 혼동 3회 ④ 부호 실수 1회 ⑤ 단위 실수 3회(자동 감지만, 같은 문제) */
  const DEMO_PLAN = [
    [['ok'], ['ok'], ['ok']],
    [['calc', 'calc'], ['calc', 'calc'], ['ok']],
    [['formula', 'formula'], ['formula', 'formula'], ['formula', 'formula', 'concept']],
    [['ok'], ['sign', 'read'], ['ok']],
    [['unit'], ['unit'], ['unit']],
  ];
  function demoSeed() {
    S = blank(); S.settings.demo = 2;
    const now = Date.now(), DAY = 864e5, us = UNITS.slice(0, 5);
    [10, 5, 0].forEach((ago, r) => {
      const ts = now - ago * DAY - (2 - r) * 1000, d = ymd(new Date(ts));
      us.forEach((u, ui) => {
        const pool = PROBS.filter(x => x.unit === u.k && !x.essay); if (!pool.length) return;
        const def = pool[ui === 4 ? 0 : (r * 7 + ui * 3) % pool.length], seed = hash('demo|' + r + '|' + u.k), inst = instance(def, seed);
        const [how, ...tags] = (DEMO_PLAN[ui] || [])[r] || ['ok'];
        let target = how === 'ok' ? -1 : def.qs.findIndex(q => q.type === 'num' && Math.abs(q.ans(inst.c, inst.p)) > 1);
        if (how !== 'ok' && target < 0) target = def.qs.findIndex(q => q.type === 'choice');
        const ans = {}, res = [];
        def.qs.forEach((q, i) => {
          const bad = i === target;
          if (q.type === 'num') { const x = q.ans(inst.c, inst.p); ans[i] = String(+(bad ? { calc: x * 1.05, formula: x * 0.8, unit: x / 100, sign: -x }[how] : x).toFixed(6)); }
          else if (q.type === 'choice') { const a = q.ans(inst.c, inst.p), n = optsOf(q, inst.p, inst.c).length; ans[i] = bad ? (a + 1) % n : a; }
          else if (q.type === 'text') ans[i] = String(q.show || '').replace(/<[^>]+>/g, '').trim();
          else ans[i] = q.model || '';
          res.push(!bad);
        });
        const ok = res.filter(Boolean).length, mx = res.length, ai = 'demo' + r + ui;
        const h = { d, sc: ok, mx, v: 1, m: 0, i: ai, t: ts + ui };
        if (target >= 0 && def.qs[target].type === 'num' && (how === 'unit' || how === 'sign')) h.a = [how];
        if (ok < mx && tags.length) { h.w = tags; h.wt = ts; }
        const p = S.progress[def.id] || (S.progress[def.id] = { n: 0, box: 0, due: null, ok: 0, hist: [] });
        p.n++; p.hist.push(h); p.la = { d, s: seed, a: ans, r: Object.assign({}, res) }; if (ok === mx) p.ok++; p.box = ok === mx ? 2 : 1; p.last = d; p.due = addDays(d, BOX_DAYS[p.box]); p.u = now;
      });
    });
    saveLocal();
  }
  function demoReset() {
    if (!confirm('예시 기록을 처음 상태로 되돌릴까요? 체험하며 바꾼 내용은 지워져요.')) return;
    demoSeed(); Object.keys(cards).forEach(k => delete cards[k]); showTab('plan');
  }
  const demoNotice = () => DEMO ? `<div class="notice demo-n"><b>체험 모드</b> · 단원마다 3번씩, 15번 푼 예시 기록이에요. 이유를 고르면 숫자가 바로 바뀌어요. 이 기기에만 저장되고 실제 기록·다른 사용자에게는 영향이 없어요. <button class="btn ghost" data-act="demo-reset">예시 기록 처음으로</button></div>`
    : sb && me.role === 'admin' ? `<div class="notice demo-n">관리자: 문제를 풀지 않고 기능만 보려면 <a href="?demo&amp;subj=${encodeURIComponent(SUBJ)}" target="_blank" rel="noopener">체험 모드 열기 ↗</a> (예시 기록 · 서버에 저장 안 됨)</div>` : '';

  /* ───────── 일일 모의고사 (팩에 dailyMock이 있는 과목만, 현재 2차 재무관리) ─────────
   * 하루 5문제 = 단원마다 1문제. 문제은행 전체에서 사용자별로 무작위 추출하고, 이전 일자에 나온 문제는 그 단원 문제를 다 쓸 때까지 다시 내지 않음.
   * 기록은 사용자 본인의 progress 행 'dm:<과목>:<날짜>'에 저장(서버 변경 없음). 같은 사용자·날짜·이력이면 어느 기기에서 열어도 같은 문제·숫자가 나옴. */
  const DM = { sel: null, bulk: false, draftT: null, draftK: null };
  const DM_PRE = 'dm:' + SUBJ + ':';
  const dmKey = d => DM_PRE + d;
  const dmMix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
  const dmDates = () => Object.keys(S.progress).filter(k => k.startsWith(DM_PRE)).map(k => k.slice(DM_PRE.length)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  function dmPick(date) {
    const cnt = {};
    dmDates().filter(d => d !== date).forEach(d => (peek(dmKey(d)).items || []).forEach(x => { cnt[x.pid] = (cnt[x.pid] || 0) + 1; }));
    const rank = d => dmMix(hash(`${uid}|${date}|${d.id}`));
    return UNITS.map(u => {
      const pool = PROBS.filter(d => d.unit === u.k); if (!pool.length) return null;
      const min = Math.min(...pool.map(d => cnt[d.id] || 0));
      const d = pool.filter(x => (cnt[x.id] || 0) === min).sort((a, b) => rank(a) - rank(b))[0];
      return { pid: d.id, seed: hash(`${uid}|dm|${date}|${d.id}`), re: min > 0 ? 1 : 0 };
    }).filter(Boolean);
  }
  function dmEnsure(date) {
    const k = dmKey(date);
    if (!peek(k)) { S.progress[k] = { n: 0, box: 0, due: null, ok: 0, hist: [], d: date, items: dmPick(date) }; touch(k); }
    return peek(k);
  }
  const dmLocked = c => !!(c.daily && (peek(dmKey(c.daily)) || {}).sub);
  const dmCardKey = (date, pid) => `dm-${date}-${pid}`;
  function dmCards(rec, date) {
    return (rec.items || []).filter(x => byId[x.pid]).map(x => {
      const key = dmCardKey(date, x.pid); let c = cards[key];
      if (c && rec.sub && !c.graded) c = null;   // 다른 기기에서 제출한 경우 제출 내용으로 다시 만듦
      if (!c) {
        c = makeCard(key, x.pid, 'mock', x.seed); c.daily = date;
        if (rec.sub) {
          c.ans = Object.assign({}, x.ans || {}); (x.res || []).forEach((r, i) => { if (r != null) c.res[i] = r; });
          c.graded = true; c.shown = true; c.mrec = x.res && x.res.every(r => r != null) ? 1 : 0; c.attI = x.i;
        } else c.ans = Object.assign({}, (rec.draft || {})[x.pid] || {});
      }
      return key;
    });
  }
  function dmBadge() {
    const el = $('#dmN'); if (!el || !PACK.dailyMock) return;
    el.textContent = (peek(dmKey(kstNow().day)) || {}).sub ? '오늘 제출 완료' : '오늘 5문제';
  }
  function dmScoreHTML(rec) {
    if (!rec.sub) return '';
    const sc = +rec.score || 0, mx = +rec.max || 0;
    return `점수 <span style="color:${mx && sc / mx >= 0.6 ? 'var(--ok)' : 'var(--bad)'}">${sc}</span> / ${mx}${rec.pend ? ` · 약술형 ${+rec.pend}개 직접 채점 대기` : ''}`;
  }
  function renderDaily() {
    if (!PACK.dailyMock) return;
    const t = kstNow().day; dmEnsure(t);
    if (!DM.sel || !peek(dmKey(DM.sel))) DM.sel = t;
    const date = DM.sel, rec = peek(dmKey(date)), keys = dmCards(rec, date);
    const re = (rec.items || []).filter(x => x.re).length;
    $('#dm-title').textContent = `${date === t ? '오늘' : md(date)} 문제${rec.sub ? ' · 제출함' : date === t ? '' : ' · 아직 제출 안 함'}`;
    $('#dm-note').textContent = re ? `단원 문제를 한 바퀴 모두 받아서 ${re}문제는 다시 나왔어요. 숫자가 바뀌는 문제는 새 숫자로 나와요.` : '';
    $('#dm-note').hidden = !re;
    $('#dmSubmit').disabled = !!rec.sub; $('#dmSubmit').hidden = !!rec.sub;
    $('#dmToday').hidden = date === t;
    $('#dmScore').innerHTML = dmScoreHTML(rec);
    $('#dm-list').innerHTML = keys.map((k, i) => cardHTML(cards[k], i + 1)).join('') || '<div class="empty">출제할 문제가 없어요.</div>';
    keys.forEach(k => restore(cards[k]));
    if (rec.sub) dmLock();
    const past = dmDates().filter(d => d !== t).reverse(), done = dmDates().map(d => peek(dmKey(d))).filter(r => r.sub && +r.max);
    const avg = done.length ? Math.round(done.reduce((s, r) => s + r.score / r.max, 0) / done.length * 100) : null;
    $('#dm-hist').innerHTML = past.length || done.length ? `<div class="mh"><h3>지난 기록 <small>제출 ${done.length}회${avg == null ? '' : ` · 평균 ${avg}%`}</small></h3><div class="dm-past">${past.map(d => {
      const r = peek(dmKey(d));
      return `<button class="chip${d === date ? ' on' : ''}" data-act="dm-sel" data-d="${d}">${md(d)} <small>${r.sub ? `${+r.score || 0}/${+r.max || 0}` : '미제출'}</small></button>`;
    }).join('')}</div></div>` : '';
    dmBadge();
  }
  function dmLock() { document.querySelectorAll('#dm-list input.my1, #dm-list textarea').forEach(el => { el.readOnly = true; }); }
  function dmDraft(c) {
    const rec = peek(dmKey(c.daily)); if (!rec || rec.sub) return;
    (rec.draft || (rec.draft = {}))[c.pid] = Object.fromEntries(Object.entries(c.ans).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 800) : v]));
    DM.draftK = dmKey(c.daily); clearTimeout(DM.draftT); DM.draftT = setTimeout(dmDraftFlush, 800);
  }
  function dmDraftFlush() { clearTimeout(DM.draftT); if (DM.draftK) { touch(DM.draftK); DM.draftK = null; } }
  function dmSubmit() {
    const date = DM.sel, rec = peek(dmKey(date)); if (!rec || rec.sub) return;
    if (!confirm('제출하고 채점할까요? 제출하면 답을 고칠 수 없어요.')) return;
    dmDraftFlush(); rec.sub = Date.now();
    const keys = (rec.items || []).map(x => dmCardKey(date, x.pid)).filter(k => cards[k]);
    DM.bulk = true; keys.forEach(k => grade(cards[k])); DM.bulk = false;
    dmScore(date); dmLock();
    $('#dmSubmit').disabled = true; $('#dmSubmit').hidden = true;
    $('#dm-title').textContent = $('#dm-title').textContent.replace(/( · 아직 제출 안 함)?$/, ' · 제출함');
    window.scrollTo({ top: 0 });
  }
  function dmScore(date) {
    const rec = peek(dmKey(date)); if (!rec) return;
    let sc = 0, mx = 0, pend = 0;
    rec.items = (rec.items || []).map(x => {
      const c = cards[dmCardKey(date, x.pid)], d = byId[x.pid]; if (!c || !d) return x;
      const tot = d.qs.length, done = Object.keys(c.res).length, ok = Object.values(c.res).filter(Boolean).length;
      pend += tot - done; sc += d.pts * ok / tot; mx += d.pts;
      if (done === tot && !c.mrec) { c.mrec = 1; c.recorded = false; record(c); c.recorded = true; }
      const ans = Object.fromEntries(Object.entries(c.ans).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 800) : v]));
      return { pid: x.pid, seed: x.seed, re: x.re || 0, u: d.unit, ok, mx: tot, pts: d.pts, res: d.qs.map((q, i) => (c.res[i] === undefined ? null : !!c.res[i])), ans, i: c.attI || x.i };
    });
    rec.score = Math.round(sc * 10) / 10; rec.max = mx; rec.pend = pend; delete rec.draft;
    touch(dmKey(date));
    $('#dmScore').innerHTML = dmScoreHTML(rec); dmBadge();
    const hist = $('#dm-hist .mh small'), done = dmDates().map(d => peek(dmKey(d))).filter(r => r.sub && +r.max);
    if (hist) hist.textContent = `제출 ${done.length}회 · 평균 ${Math.round(done.reduce((s, r) => s + r.score / r.max, 0) / done.length * 100)}%`;
  }

  /* ───────── 핵심 공식 ───────── */
  function renderSum() {
    if (PACK.summaryHtml) { $('#sum-body').innerHTML = PACK.summaryHtml + `<div class="notice">${PT.sumNote || ''}</div>`; return; }
    $('#sum-body').innerHTML = SUMMARY.map(s => `<div class="box"><h3>${uName(s.unit)}</h3><table>${s.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table></div>`).join('')
      + `<div class="notice">${PT.sumNote || '출처: 금감원 공개 기출(2017~2026) 출제 경향 참고'}</div>`;
  }

  /* ───────── 약술 암기 ───────── */
  // 약술형 문항 전체: 약술 전용 문제 + 계산형 문제 속 약술 물음
  const MEMO = [...PROBS, ...(PACK.memoCards || [])].flatMap(d => d.qs.map((q, i) => q.type === 'essay' ? { key: `${d.id}:${i}`, d, q, src: d.essay ? d.trend : `${d.title} 중 약술 물음` } : null).filter(Boolean));
  /* ───────── 처음 화면: 오늘의 약술 (약술형 전용 문제가 있는 과목, 없으면 명언) ─────────
   * 평일에 하루 1개씩 공개(과목마다 모든 사용자 같은 순서), 주말에는 그 주 5개를 모아 보기.
   * 둘째 주부터 평일에는 바로 전주(N-1주차) 약술만으로 복습 퀴즈 1개를 내고, '맞았어요'로 채점해야 오늘의 약술이 열림(다시 볼게요는 재도전).
   * 통과 기록은 본인 progress 행 'dq:<과목>:<날짜>'에 저장(틀린 동안은 행 없음), 약술 암기의 외움/다시 상태에도 반영. */
  const DE_POOL = MEMO.filter(m => m.d.essay), DE_EPOCH = '2026-11-02', DE_PRE = 'dq:' + SUBJ + ':';   // 2026-11-02(월)이 1주차
  const DE = { day: null, ans: '', checked: false, open: false, retry: false };
  function deAt(week, i) {
    const n = DE_POOL.length, slot = Math.max(0, week) * 5 + i, cycle = Math.floor(slot / n);
    const rank = m => dmMix(hash(`${SUBJ}|${cycle}|${m.key}`));
    return DE_POOL.slice().sort((a, b) => rank(a) - rank(b))[slot - cycle * n];   // 한 바퀴를 다 보면 순서를 바꿔 다시
  }
  const deWeek = day => Math.round((new Date(mondayOf(day) + 'T00:00:00') - new Date(DE_EPOCH + 'T00:00:00')) / 6048e5);
  function deQuiz(day, week, di) {
    if (week < 1) return null;
    const mon = mondayOf(day), rec = peek(DE_PRE + day);
    if (rec) return { rec };
    const taken = new Set();
    for (let j = 0; j < di; j++) { const r = peek(DE_PRE + addDays(mon, j)); if (r && r.key) taken.add(r.key); }
    const last = [0, 1, 2, 3, 4].map(i => deAt(week - 1, i));
    return { m: last.find(m => !taken.has(m.key)) || last[di] };
  }
  const deKw = (m, typed) => m.q.kw && m.q.kw.length ? `<div>${m.q.kw.map(k => `<span class="kw${typed && typed.includes(k) ? ' hit' : ''}">${esc(k)}</span>`).join('')}</div>` : '';
  const deMeta = (label, m) => `<div class="de-h"><b>${esc(label)}</b>${m ? `<span class="tag unit">${esc(uName(m.d.unit))}</span>` : ''}</div>`;
  function renderHomeEss() {
    const box = $('#homeEss'), qt = $('#quote'); if (!box) return;
    if (!DE_POOL.length) { box.hidden = true; if (qt) qt.hidden = false; return; }
    if (qt) qt.hidden = true; box.hidden = false;
    const day = kstNow().day;
    if (DE.day !== day) { DE.day = day; DE.ans = ''; DE.checked = false; DE.open = false; DE.retry = false; }
    const di = (new Date(day + 'T00:00:00').getDay() + 6) % 7, week = deWeek(day);
    if (di >= 5) {
      const list = [0, 1, 2, 3, 4].map(i => ({ i, m: deAt(week, i) }));
      box.innerHTML = deMeta('이번 주 약술 모아보기') + `<div class="mut de-sub">평일에 나온 5개를 다시 정리해 보세요. 다음 주 평일에 복습 퀴즈로 나와요.</div>`
        + list.map(({ i, m }) => `<details class="de-w"><summary><span class="de-d">${WD[i]}</span>${esc(m.q.text)}</summary><div class="mans"><b>모범답안</b> ${esc(m.q.model)}${deKw(m)}</div></details>`).join('');
      return;
    }
    const qz = deQuiz(day, week, di);
    if (qz && qz.m) {
      const m = qz.m;
      box.innerHTML = deMeta('지난주 복습 퀴즈', m) + `<div class="mut de-sub">${DE.retry ? '아직 열리지 않았어요. 답을 다시 떠올려 적어 보세요.' : '맞히면 오늘의 퀴즈가 열려요.'}</div><div class="de-q">${esc(m.q.text)}</div>`
        + `<textarea class="my" id="deAns" rows="3" placeholder="답을 떠올려 적어 보세요"${DE.checked ? ' readonly' : ''}>${esc(DE.ans)}</textarea>`
        + (DE.checked
          ? `<div class="mans"><b>모범답안</b> ${esc(m.q.model)}${deKw(m, DE.ans)}</div><div class="actions"><button class="btn ok" data-act="de-grade" data-v="1">✔ 맞았어요</button><button class="btn bad" data-act="de-grade" data-v="0">↺ 다시 볼게요</button></div>`
          : '<div class="actions"><button class="btn primary" data-act="de-check">답 확인</button></div>');
      return;
    }
    const m = deAt(week, di), r = qz && qz.rec;
    box.innerHTML = (r ? '<div class="de-done">복습 퀴즈 통과</div>' : '') + deMeta(`오늘의 퀴즈 · ${md(day)}(${WD[di]})`, m)
      + `<div class="de-q">${esc(m.q.text)}</div><div class="actions"><button class="btn${DE.open ? '' : ' primary'}" data-act="de-open">${DE.open ? '답 가리기' : '답 보기'}</button></div>`
      + (DE.open ? `<div class="mans"><b>모범답안</b> ${esc(m.q.model)}${deKw(m)}</div>` : '');
  }
  function deGrade(ok) {
    const day = kstNow().day, di = (new Date(day + 'T00:00:00').getDay() + 6) % 7, qz = deQuiz(day, deWeek(day), di);
    if (!qz || !qz.m) return;
    const k = qz.m.key, o = S.memo.c[k] || {}, pid = DE_PRE + day;
    if (ok) { S.progress[pid] = { n: 0, box: 0, due: null, ok: 0, hist: [], key: k, res: 1, d: day }; touch(pid); }
    S.memo.c[k] = { s: ok ? 'know' : 'again', n: (o.n || 0) + 1, last: today() }; touch('_memo'); memoStats();
    DE.ans = ''; DE.checked = false; DE.open = false; DE.retry = !ok;
    renderHomeEss();
  }
  const MF = { unit: '전체', st: '전체', order: null, open: new Set(), typed: {} };
  const mstate = k => (S.memo.c[k] || {}).s || 'none';
  function memoCard(m) {
    const st = mstate(m.key), open = MF.open.has(m.key), typed = MF.typed[m.key] || '';
    return `<article class="mcard m-${st}" id="mc-${m.key.replace(':', '_')}">
      <div class="meta"><span class="tag unit">${uName(m.d.unit)}</span><span class="tag">${esc(m.src)}</span>${st === 'know' ? '<span class="tag okt">외움</span>' : st === 'again' ? '<span class="tag badt">다시</span>' : ''}${(S.memo.c[m.key] || {}).n ? `<span class="tag">확인 ${S.memo.c[m.key].n}회</span>` : ''}</div>
      <div class="mq">${esc(m.q.text)}</div>
      <textarea class="my mtyped" data-mk="${m.key}" placeholder="답을 먼저 떠올려 적어 보세요 (선택, 저장 안 됨)">${esc(typed)}</textarea>
      <div class="actions"><button class="btn${open ? '' : ' primary'}" data-act="memo-open" data-mk="${m.key}">${open ? '답 가리기' : '답 보기'}</button>
        <button class="btn ok${st === 'know' ? ' on' : ''}" data-act="memo-set" data-mk="${m.key}" data-v="know">✔ 외웠어요</button>
        <button class="btn bad${st === 'again' ? ' on' : ''}" data-act="memo-set" data-mk="${m.key}" data-v="again">↺ 다시 볼게요</button></div>
      <div class="mans"${open ? '' : ' hidden'}><b>모범답안</b> ${esc(m.q.model)}<div>${m.q.kw.map(k => `<span class="kw${typed.includes(k) ? ' hit' : ''}">${esc(k)}</span>`).join('')}</div></div>
    </article>`;
  }
  function memoStats() {
    if (!$('#memo-stats')) return;
    const c = { none: 0, know: 0, again: 0 }; MEMO.forEach(m => c[mstate(m.key)]++);
    $('#memo-stats').innerHTML = [['전체', MEMO.length], ['외움', c.know], ['다시 볼 것', c.again], ['아직 안 봄', c.none]].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
    $('#memoN').textContent = c.again + c.none;
  }
  function renderMemo() {
    memoStats();
    $('#mf-unit').innerHTML = ['전체', ...UNITS.map(u => u.k)].map(k => `<button class="chip${MF.unit === k ? ' on' : ''}" data-act="mf" data-f="unit" data-v="${k}">${k === '전체' ? '전체' : uName(k)} <small>${k === '전체' ? MEMO.length : MEMO.filter(m => m.d.unit === k).length}</small></button>`).join('');
    $('#mf-st').innerHTML = [['전체', '전체'], ['none', '아직 안 봄'], ['again', '다시 볼 것'], ['know', '외움']].map(([v, n]) => `<button class="chip${MF.st === v ? ' on' : ''}" data-act="mf" data-f="st" data-v="${v}">${n}</button>`).join('');
    let list = MEMO.filter(m => (MF.unit === '전체' || m.d.unit === MF.unit) && (MF.st === '전체' || mstate(m.key) === MF.st));
    if (MF.order) list = list.slice().sort((a, b) => MF.order.indexOf(a.key) - MF.order.indexOf(b.key));
    $('#memo-count').textContent = `${list.length}문항`;
    $('#memo-list').innerHTML = list.length ? list.map(memoCard).join('') : '<div class="empty">조건에 맞는 문항이 없습니다.</div>';
  }

  function memoRefreshCard(key) {
    const m = MEMO.find(x => x.key === key), el = $('#mc-' + key.replace(':', '_'));
    if (m && el) el.outerHTML = memoCard(m);
    memoStats();
  }

  /* ───────── 오늘의 학습일지 (주간 시간표) ───────── */
  const H0 = 6, H1 = 24, HPX = 44;   // 시간표 범위(시)와 1시간 높이(px)
  const toMin = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const durTxt = m => `${Math.floor(m / 60) ? Math.floor(m / 60) + '시간 ' : ''}${m % 60 ? (m % 60) + '분' : Math.floor(m / 60) ? '' : '0분'}`.trim();
  const mondayOf = s => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
  const JN = { week: null, sel: null, edit: null };
  const DOW = ['월', '화', '수', '목', '금', '토', '일'];
  const jItems = d => ((S.journal[d] || {}).items || []).slice().sort((a, b) => toMin(a.s) - toMin(b.s));
  function renderJournal() {
    const t = today(); if (!JN.week) { JN.week = mondayOf(t); JN.sel = t; }
    if (JN.week < mondayOf(START_DAY)) JN.week = mondayOf(START_DAY);
    const days = [...Array(7)].map((_, i) => addDays(JN.week, i));
    if (!days.includes(JN.sel) || JN.sel < START_DAY) JN.sel = days.find(d => d >= START_DAY);
    const first = JN.week <= mondayOf(START_DAY);
    const mins = d => jItems(d).reduce((s, it) => s + Math.max(toMin(it.e) - toMin(it.s), 0), 0);
    const wk = days.reduce((s, d) => s + mins(d), 0);
    const mobile = window.innerWidth < 700, shown = mobile ? [JN.sel] : days;
    const hours = [...Array(H1 - H0)].map((_, i) => H0 + i);
    $('#jn-head').innerHTML = `<button class="btn" data-act="jn-week" data-v="-7"${first ? ' disabled' : ''}>◀ 지난주</button><button class="btn" data-act="jn-week" data-v="0">이번 주</button><button class="btn" data-act="jn-week" data-v="7">다음주 ▶</button>
      <b class="jn-range">${days[0].slice(5).replace('-', '/')} ~ ${days[6].slice(5).replace('-', '/')}</b><span class="mut">이번 주 기록 ${durTxt(wk)}</span>
      <button class="btn primary" data-act="jn-new" style="margin-left:auto">+ 기록 추가</button>`;
    $('#jn-days').innerHTML = mobile ? days.map((d, i) => `<button class="chip${d === JN.sel ? ' on' : ''}" data-act="jn-sel" data-d="${d}"${d < START_DAY ? ' disabled' : ''}>${DOW[i]} ${d.slice(8)}${mins(d) ? ' •' : ''}</button>`).join('') : '';
    $('#jn-grid').innerHTML = `<div class="tt" style="grid-template-columns:44px repeat(${shown.length},minmax(0,1fr))">
      <div class="tt-h"></div>${shown.map(d => { const i = days.indexOf(d); return `<button class="tt-h${d === JN.sel ? ' sel' : ''}${d === t ? ' today' : ''}${d < START_DAY ? ' pre' : ''}" data-act="jn-sel" data-d="${d}"${d < START_DAY ? ' disabled' : ''}><b>${DOW[i]}</b> ${d.slice(5).replace('-', '/')}<small>${mins(d) ? durTxt(mins(d)) : ''}</small></button>`; }).join('')}
      <div class="tt-hours">${hours.map(h => `<div style="height:${HPX}px">${h}</div>`).join('')}</div>
      ${shown.map(d => `<div class="tt-col${d === JN.sel ? ' sel' : ''}${d < START_DAY ? ' pre' : ''}" data-act="jn-slot" data-d="${d}" style="height:${(H1 - H0) * HPX}px;background-size:100% ${HPX}px">${jItems(d).map(it => {
        const top = (Math.max(toMin(it.s), H0 * 60) - H0 * 60) / 60 * HPX, h = Math.max((Math.min(toMin(it.e), H1 * 60) - Math.max(toMin(it.s), H0 * 60)) / 60 * HPX, 18);
        return `<button class="tt-blk" data-act="jn-edit" data-d="${d}" data-id="${it.id}" style="top:${top}px;height:${h}px;--uc:var(--u-${it.unit || 'etc'})" title="${esc(it.s + '–' + it.e + ' ' + it.title + (it.note ? '\n' + it.note : ''))}"><b>${esc(it.title)}</b><small>${it.s}–${it.e}</small></button>`;
      }).join('')}</div>`).join('')}
    </div>`;
    renderJournalDay();
    renderWeekly($('#jn-weekly'));
  }
  function renderJournalDay() {
    const d = JN.sel, items = jItems(d);
    const solved = PROBS.flatMap(p => ((peek(p.id) || {}).hist || []).filter(h => h.d === d).map(h => ({ p, h })));
    const memoN = Object.values(S.memo.c).filter(x => x.last === d).length;
    const ed = JN.edit;
    $('#jn-day').innerHTML = `<div class="box"><h3>${d.replace(/-/g, '.')} (${DOW[(new Date(d + 'T00:00:00').getDay() + 6) % 7]}) 학습일지</h3>
      ${ed ? `<form class="jn-form" id="jn-form">
        <div class="jf-row"><label>날짜<input type="date" name="d" value="${ed.d}" min="${START_DAY}" required></label><label>시작<input type="time" name="s" value="${ed.s}" step="600" required></label><label>종료<input type="time" name="e" value="${ed.e}" step="600" required></label>
          <label>단원<select name="unit">${[...UNITS.map(u => [u.k, u.name]), ['etc', '기타']].map(([k, n]) => `<option value="${k}"${ed.unit === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <label class="jf-wide">오늘 배운 개념<input name="title" value="${esc(ed.title)}" placeholder="예: 듀레이션과 볼록성, 면역전략 재조정" required maxlength="80"></label>
        <label class="jf-wide">정리 메모<textarea name="note" rows="4" placeholder="핵심 공식, 헷갈린 점, 다음에 다시 볼 것">${esc(ed.note)}</textarea></label>
        <div class="actions"><button class="btn primary" type="submit">저장</button>${ed.id ? '<button class="btn bad" type="button" data-act="jn-del">삭제</button>' : ''}<button class="btn ghost" type="button" data-act="jn-cancel">취소</button><span class="jf-err" id="jf-err"></span></div>
      </form>` : ''}
      ${items.length ? items.map(it => `<div class="jn-item" style="--uc:var(--u-${it.unit || 'etc'})"><div class="jn-t">${it.s}–${it.e}<small>${durTxt(toMin(it.e) - toMin(it.s))}</small></div><div><span class="tag unit">${it.unit === 'etc' ? '기타' : uName(it.unit)}</span> <b>${esc(it.title)}</b>${it.note ? `<div class="jn-note">${esc(it.note)}</div>` : ''}</div><button class="btn ghost" data-act="jn-edit" data-d="${d}" data-id="${it.id}">수정</button></div>`).join('') : (ed ? '' : '<div class="mut">아직 기록이 없습니다. 시간표의 빈 칸을 누르거나 ‘+ 기록 추가’를 누르세요.</div>')}
      <div class="jn-auto"><b>자동 기록</b> — 이날 푼 문제 ${solved.length}개${solved.length ? ': ' + solved.map(x => `${esc(x.p.title.slice(0, 16))}${x.p.title.length > 16 ? '…' : ''} ${x.h.sc}/${x.h.mx}`).join(' · ') : ''}${memoN ? ` · ${PT.memoNav || '약술 암기'} ${memoN}문항 확인` : ''}</div></div>`;
  }
  function jnOpen(d, it, startMin) {
    const s = it ? it.s : hm(startMin != null ? startMin : Math.min(Math.max(Math.floor((new Date().getHours() * 60) / 30) * 30, H0 * 60), (H1 - 1) * 60));
    JN.sel = d; JN.edit = it ? { ...it, d, orig: d } : { id: '', d, s, e: hm(Math.min(toMin(s) + 60, 24 * 60 - 1)), unit: 'cb', title: '', note: '' };
    renderJournal();
    const f = $('#jn-form'); if (f) { f.scrollIntoView({ block: 'nearest' }); f.title.focus(); }
  }

  /* ───────── 공부 시간 측정 ───────── */
  // '▶ 시작' 버튼으로 시작(출석 사진 없이도 가능). 그날 기록이 없을 때 출석 인증에 성공해도 시작. 구간(segs) 단위로 기록하므로, 일시정지 후 재개하지 않으면 그날 공부시간은 일시정지 시각까지만 남는다.
  // 하루는 한국시각 0시 기준이며, 일시정지하지 않고 넘어간 경우에는 그날 24시까지만 센다.
  const nowMs = () => (window.FM_TEST_NOW ? new Date(window.FM_TEST_NOW).getTime() : Date.now());
  const dayEndMs = d => new Date(addDays(d, 1) + 'T00:00:00+09:00').getTime();
  const tKey = d => 't:' + d;
  // 공부 시간은 시작 뒤 '일시정지'를 누를 때까지 계속 센다(앱을 나가거나 화면이 꺼져도). 사용자·관리자 모두 같은 규칙.
  // 안전장치: 앱을 3시간 넘게 한 번도 열지 않으면 마지막으로 앱을 본 시각 + 3시간에서 자동 일시정지(끄는 걸 잊고 잠든 경우 등).
  const AWAY_MS = 3 * 60 * 60 * 1000;
  function studyMsOf(t, d, now = nowMs()) {
    if (!t || !t.segs) return 0;
    const end = Math.min(now, dayEndMs(d), t.hb ? t.hb + AWAY_MS : Infinity);
    return t.segs.reduce((s, g) => s + Math.max(0, Math.min(g.e == null ? end : g.e, end) - g.s), 0);
  }
  const isRunning = t => !!(t && t.segs && t.segs.length && t.segs[t.segs.length - 1].e == null);
  // 측정 기기: 시작·출석하거나 재개한 기기만 '공부 중' 신호를 보낸다 (같은 계정으로 PC에 앱을 띄워 둬도 시간이 이어지지 않게)
  const DEV = (() => { try { let v = localStorage.getItem('cpa-fm-dev'); if (!v) { v = Math.random().toString(36).slice(2, 10); localStorage.setItem('cpa-fm-dev', v); } return v; } catch (e) { return 'dev'; } })();
  const mine = t => !!t && t.dev === DEV;
  // 실제로 측정 중인지: 기록상 진행 중이어도 측정 기기가 3시간 넘게 열리지 않았으면 멈춘 것으로 본다
  const live = t => isRunning(t) && !(t.hb && nowMs() - t.hb > AWAY_MS);
  const hms = ms => { const s = Math.floor(ms / 1000); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, '0')).join(':'); };
  const clock = ms => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
  function timerStart(d) {
    if (S.timer[d]) return;
    S.timer[d] = { segs: [{ s: nowMs(), e: null }], hb: nowMs(), dev: DEV }; touch(tKey(d)); renderTimer(); presUpdate();
  }
  // 다른 기기(휴대폰·PC)에서 바꾼 공부 시간 기록이 서버에 더 최신이면 그것을 따른다
  async function timerFromServer(d) {
    if (!sb || uid === 'local') return false;   // 로그인 전(사용자 미정)에는 서버에 묻지 않음
    try {
      const { data } = await sb.from('progress').select('data').eq('user_id', uid).eq('pid', tKey(d)).maybeSingle();
      if (data && data.data && (data.data.u || 0) > ((S.timer[d] || {}).u || 0)) { S.timer[d] = data.data; saveLocal(); renderTimer(); presUpdate(); return true; }
    } catch (e) { /* 연결이 안 되면 이 기기 기록으로 계속 */ }
    return false;
  }
  let toggling = false;
  async function timerToggle() {
    if (toggling) return; toggling = true;
    const wasRun = live(S.timer[kstNow().day]);   // 누를 때 화면에 보이던 상태
    try { await timerFromServer(kstNow().day); } finally { toggling = false; }
    const d = kstNow().day, t = S.timer[d];
    if (!t) { timerStart(d); return; }
    if (live(t) !== wasRun) return;   // 다른 기기에서 이미 그 상태로 바꿔 둠: '시작'을 눌렀는데 멈추는 일이 없게
    const seg = t.segs[t.segs.length - 1];
    if (live(t)) seg.e = nowMs();
    else {   // 재개: 측정 기기가 떠나 멈춘 구간은 마지막 신호 시각에서 닫고, 이 기기에서 새로 측정
      if (isRunning(t)) seg.e = Math.max(Math.min(nowMs(), (t.hb || seg.s) + AWAY_MS, dayEndMs(d)), seg.s);   // 멈춘 구간은 실제로 멈춘 시각(마지막 확인 + 3시간)에서 닫음
      t.segs.push({ s: nowMs(), e: null }); t.hb = nowMs(); t.dev = DEV; delete t.auto;
    }
    touch(tKey(d)); renderTimer(); presUpdate();
  }
  // 앱이 화면에 있는 동안 '마지막 확인 시각'(hb)을 1분마다 남긴다. 앱을 나가 있어도 시간은 계속 세지만,
  // 3시간 넘게 한 번도 열지 않으면 hb + 3시간에서 자동 일시정지한다(돌아오지 않아도 studyMsOf가 hb + 3시간까지만 센다).
  function heartbeat(force) {
    const d = kstNow().day, t = S.timer[d];
    if (!isRunning(t) || !mine(t) || (!force && nowMs() - (t.hb || 0) < 60000)) return;
    t.hb = nowMs();
    if (force || !sb) { touch(tKey(d)); return; }
    // 1분마다: 서버에 다른 기기의 더 최신 기록(예: 일시정지)이 있으면 그것을 따르고, 없을 때만 저장
    timerFromServer(d).then(newer => { if (!newer && isRunning(S.timer[d])) { S.timer[d].hb = t.hb; touch(tKey(d)); } });
  }
  function autoPauseCheck() {
    let changed = false;
    for (const [d, t] of Object.entries(S.timer)) {
      if (!isRunning(t) || !mine(t)) continue;   // 다른 기기가 측정 중인 기록은 그 기기가 정리한다 (화면에는 live로 멈춘 것으로 보임)
      const now = nowMs(), seg = t.segs[t.segs.length - 1];
      if ((t.hb && now - t.hb > AWAY_MS) || now >= dayEndMs(d)) {
        seg.e = Math.max(Math.min((t.hb || now) + AWAY_MS, now, dayEndMs(d)), seg.s); t.auto = seg.e; touch(tKey(d)); changed = true;
      }
    }
    if (changed) { renderTimer(); presUpdate(); }
  }
  let lastSync = 0;
  function studyTick() {
    if (document.visibilityState === 'visible') {
      autoPauseCheck(); heartbeat();
      // 이 기기가 측정 중이 아니면 30초마다 서버 상태를 받아 온다 (다른 기기에서 시작·일시정지한 것 반영)
      const d = kstNow().day, t = S.timer[d];
      if (sb && !(isRunning(t) && mine(t)) && Math.abs(nowMs() - lastSync) >= 30000) { lastSync = nowMs(); timerFromServer(d); }
    }
    renderTimer(); admStudyRender(); dockPad(); qtTick();
  }
  function renderTimer() {
    const d = kstNow().day, t = S.timer[d], run = live(t), ms = studyMsOf(t, d), autoAt = t && (t.auto || (isRunning(t) && !run ? Math.min((t.hb || 0) + AWAY_MS, dayEndMs(d)) : 0));
    const w = $('#stimer');
    if (w) {
      w.className = 'stimer' + (run ? ' run' : t ? ' pause' : ' idle');
      $('#stTime').textContent = t ? hms(ms) : '--:--:--';
      $('#stState').textContent = run ? '측정 중' : t ? (autoAt ? `자동 일시정지 (${clock(autoAt)})` : '일시정지') : '시작 전';
      const b = $('#stBtn'); b.textContent = run ? '⏸ 일시정지' : t ? '▶ 재개' : '▶ 시작';
    }
    const ht = $('#homeToday');   // 처음 화면: 오늘 공부 시간
    // 1초마다 호출되므로 내용이 같으면 다시 그리지 않음 (누르는 도중 버튼이 교체되어 클릭이 사라지는 것 방지)
    const setH = (el, h) => { if (el._h !== h) { el._h = h; el.innerHTML = h; } };
    if (ht) setH(ht, t ? `⏱ <b>${hms(ms)}</b> 오늘 공부 · ${run ? '측정 중' : '일시정지'}` : '<button class="ht-start" data-act="st-toggle">▶ 공부 시작</button>');
    const box = $('#jn-timer'); if (!box) return;
    const days = [...Array(7)].map((_, i) => addDays(d, -6 + i)).filter(x => x >= START_DAY);
    setH(box, `<div class="jt-main"><div><div class="mut">오늘의 공부 시간</div><div class="jt-time">${t ? hms(ms) : '--:--:--'}</div>
        <div class="mut">${run ? '측정 중 · 앱을 나가도 계속 측정돼요. 쉬거나 끝낼 때는 일시정지를 눌러 주세요 (3시간 넘게 앱을 열지 않으면 자동 일시정지)' : t ? (autoAt ? `앱을 오래 열지 않아 ${clock(autoAt)}에 자동 일시정지됐어요 · 다시 공부하려면 재개를 누르세요` : '일시정지 중 · 재개하지 않으면 일시정지한 시각까지만 기록돼요') : '시작을 누르면 측정돼요 · 출석 사진은 찍지 않아도 돼요'}</div></div>
        <button class="btn primary" data-act="st-toggle">${run ? '⏸ 일시정지' : t ? '▶ 재개' : '▶ 시작'}</button></div>
      ${pushHint()}
      ${t ? `<div class="jt-segs">${t.segs.map((g, i) => `<span class="tag">${i + 1}구간 ${clock(g.s)} – ${g.e == null ? (run ? '진행 중' : clock(Math.min((t.hb || g.s) + AWAY_MS, dayEndMs(d)))) : clock(g.e)}</span>`).join('')}</div>` : ''}
      <div class="jt-week">${days.map(x => { const m = studyMsOf(S.timer[x], x); return `<div class="jw"><div class="jw-bar"><i style="height:${Math.min(m / 36e6 * 100, 100)}%"></i></div><small>${x.slice(8)}일</small><b>${m ? hms(m).slice(0, 5) : '–'}</b></div>`; }).join('')}</div>`);
  }


  /* ───────── 공부 시간 현황: 다른 사람(관리자 포함)의 오늘 공부 시간 (화면 왼쪽 아래, 내 공부 시간 바로 밑) ───────── */
  // 서버 함수 study_today()로 모든 사용자의 오늘 공부 구간을 받는다(로그인 사용자 누구나). 함수가 아직 없으면 관리자만 직접 조회로 본다.
  // 사용자 기기가 출석·재개·일시정지할 때 바로, 측정 중에는 1분마다 서버에 기록하므로 30초마다 받아 오고 화면 숫자는 1초마다 이어서 센다.
  const ADM = { users: [], rows: {}, day: '', open: !matchMedia('(max-width:760px)').matches };
  async function admStudyLoad() {
    if (!sb || uid === 'local') return;
    const d = kstNow().day;
    try {
      const r = typeof sb.rpc === 'function' ? await sb.rpc('study_today') : { error: 1 };
      if (!r.error && Array.isArray(r.data)) {
        ADM.users = r.data.filter(u => u.id !== uid).map(u => ({ id: u.id, name: u.name, role: u.role }));
        ADM.rows = Object.fromEntries(r.data.filter(u => u.data).map(u => [u.id, u.data]));
      } else if (me.role === 'admin') {
        const [pf, pr] = await Promise.all([sb.from('profiles').select('id,name,role'), sb.from('progress').select('user_id,data').eq('pid', tKey(d))]);
        if (pf.error || pr.error) return;
        ADM.users = pf.data.filter(u => u.id !== uid); ADM.rows = Object.fromEntries(pr.data.map(x => [x.user_id, x.data]));
      } else return;
      ADM.day = d;
    } catch (e) { return; }
    admStudyRender();
  }
  setInterval(() => { if (document.visibilityState === 'visible') admStudyLoad(); }, 30000);
  function admStudyRender() {
    const box = $('#stAdm'), w = $('#stimer'); if (!box) return;
    if (!sb || !ADM.users.length) { box.hidden = true; if (w) w.style.bottom = ''; if ($('#stWho')) $('#stWho').hidden = true; return; }
    if (ADM.day !== kstNow().day) { ADM.rows = {}; ADM.day = kstNow().day; admStudyLoad(); }
    const d = ADM.day, list = ADM.users.map(u => { const t = ADM.rows[u.id]; return { u, t, run: live(t), ms: studyMsOf(t, d) }; }).sort((a, b) => (b.run - a.run) || (b.ms - a.ms) || String(a.u.name).localeCompare(String(b.u.name)));
    const nRun = list.filter(x => x.run).length, mob = matchMedia('(max-width:760px)').matches, who = $('#stWho');
    if (who) { who.hidden = false; who.textContent = `👥 ${nRun}`; who.title = `공부 시간 현황 · ${nRun}명 측정 중`; }
    box.classList.toggle('open', ADM.open);
    box.hidden = false;
    box.innerHTML = `<button class="sa-h" data-act="adm-st" aria-expanded="${ADM.open}"><b>공부 시간 현황</b><small>${nRun ? `${nRun}명 측정 중` : '측정 중 없음'}</small><span>${ADM.open ? '▾' : '▸'}</span></button>`
      + (ADM.open ? `<div class="sa-l">${list.map(x => `<div class="sa-r ${x.run ? 'run' : x.t ? 'pause' : 'idle'}"><span class="sa-n">${esc(x.u.name || '이름 없음')}${x.u.role === 'admin' ? ' <em>관리자</em>' : ''}</span><b>${x.t ? hms(x.ms) : '--:--:--'}</b><small>${x.run ? '측정 중' : x.t ? '일시정지' : '시작 전'}</small></div>`).join('')}</div>` : '');
    // PC: 내 공부 시간을 목록 위로 / 휴대폰: 아래 막대는 그대로 두고, 펼친 목록을 막대 위에
    if (mob) { if (w) w.style.bottom = ''; box.style.bottom = ((w ? w.offsetHeight : 40) + 20) + 'px'; }
    else { box.style.bottom = ''; if (w) w.style.bottom = (box.offsetHeight + 26) + 'px'; }
  }


  const WD = ['월', '화', '수', '목', '금', '토', '일'];
  const md = d => d ? `${+d.slice(5, 7)}/${+d.slice(8)}` : '';

  /* ───────── 일시정지 잊음 알림을 눌렀을 때: 계속 / 지금 일시정지 / 마지막으로 앱을 본 시각에 멈춘 걸로 ───────── */
  let stToastT = null;
  async function stAsk(act) {
    const box = $('#stAsk'); if (!box) return;
    const d = kstNow().day; await timerFromServer(d);
    const t = S.timer[d];
    if (!isRunning(t)) { box.hidden = false; box.innerHTML = '<b>공부 시간이 이미 멈춰 있어요.</b><div class="sa-btns"><button class="btn" data-act="st-close">닫기</button></div>'; clearTimeout(stToastT); stToastT = setTimeout(() => { box.hidden = true; }, 4000); return; }
    if (act === 'keep') { stKeep(); box.hidden = false; box.innerHTML = '<b>계속 측정할게요.</b> 쉬거나 끝낼 때는 일시정지를 눌러 주세요.'; clearTimeout(stToastT); stToastT = setTimeout(() => { box.hidden = true; }, 3000); return; }
    const hb = t.hb || t.segs[t.segs.length - 1].s;
    box.hidden = false;
    box.innerHTML = `<b>⏱ ${clock(hb)} 이후로 앱을 열지 않았어요. 지금도 공부 중인가요?</b>
      <div class="mut">${clock(hb)}에 멈춘 걸로 하면 그 뒤 시간은 공부 시간에서 빠져요.</div>
      <div class="sa-btns"><button class="btn primary" data-act="st-keep">계속 공부 중</button><button class="btn" data-act="st-now">지금 일시정지</button><button class="btn" data-act="st-back">${clock(hb)}에 멈춘 걸로</button></div>`;
  }
  function stKeep() { const d = kstNow().day, t = S.timer[d]; if (!isRunning(t)) return; t.hb = nowMs(); t.dev = DEV; touch(tKey(d)); renderTimer(); presUpdate(); }
  function stStop(atHb) {
    const d = kstNow().day, t = S.timer[d]; if (!isRunning(t)) return;
    const seg = t.segs[t.segs.length - 1];
    seg.e = Math.max(seg.s, atHb ? (t.hb || seg.s) : Math.min(nowMs(), (t.hb || seg.s) + AWAY_MS, dayEndMs(d)));
    touch(tKey(d)); renderTimer(); presUpdate();
  }
  window.FM_STASK = stAsk;   // 테스트용
  let stUrlDone = false;
  function stFromUrl() { if (stUrlDone || !sb) return; stUrlDone = true; const a = new URLSearchParams(location.search).get('st'); if (a) { history.replaceState(history.state, '', location.pathname + (SUBJ ? '?subj=' + SUBJ : '')); setTimeout(() => stAsk(a), 500); } }
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'st') stAsk(e.data.act); });
  // 알림 켜기 안내(공부 시간 화면): 메신저와 같은 이 기기의 알림 구독으로 공부 시간 알림도 받는다
  function pushHint() {
    let st; try { st = CH.push; } catch (e) { return ''; }
    const m = { off: '알림을 켜 두면 측정 중에 1시간 넘게 앱을 안 열 때 "아직 공부 중이신가요?" 알림을 보내 드려요.', err: '알림을 켜지 못했어요. 다시 시도해 주세요.', denied: '이 사이트 알림이 차단돼 있어요. 주소창 자물쇠 → 알림 → 허용으로 바꾸면 일시정지 잊음 알림을 받을 수 있어요.', ios: '아이폰은 Safari 공유 → "홈 화면에 추가"로 설치한 앱에서 알림을 켜면 일시정지 잊음 알림을 받을 수 있어요.', on: '🔔 측정 중에 1시간 넘게 앱을 안 열면 이 기기로 알림을 보내 드려요.' }[st];
    return m ? `<div class="push-hint"><span>${m}</span>${st === 'off' || st === 'err' ? '<button class="btn primary" data-act="push-on">알림 켜기</button>' : ''}</div>` : '';
  }


  // 화면 아래에 떠 있는 것(공부 시간 타이머·공부 시간 현황·메신저 버튼)이 차지하는 높이만큼 페이지 아래 여백을 둔다
  // → 학습 메뉴 맨 아래 'AI 출제' 타일이나 목록 끝이 타이머에 가려지지 않게 (휴대폰은 스크롤로, PC는 처음 화면에서 바로 보이게)
  let dockH = -1;
  function dockPad() {
    const tops = ['#stimer', '#stAdm', '#chatFab'].map(s => $(s)).filter(el => el && !el.hidden && getComputedStyle(el).display !== 'none')
      .map(el => el.getBoundingClientRect()).filter(r => r.height > 0 && r.top > innerHeight / 2).map(r => r.top);
    const h = tops.length ? Math.max(0, Math.round(innerHeight - Math.min(...tops))) : 0;
    if (h !== dockH) { dockH = h; document.documentElement.style.setProperty('--dock', h + 'px'); }
  }
  addEventListener('resize', dockPad);

  /* ───────── 주 평균 공부 시간 (시작일부터 7일 단위, 7일이 다 차면 막대 하나) ───────── */
  function weeklyStudy() {
    const t = kstNow().day, weeks = [];
    for (let i = 0; ; i++) {
      const s = addDays(START_DAY, 7 * i), e = addDays(s, 6);
      if (s > t) break;
      const days = [...Array(7)].map((_, j) => addDays(s, j)).filter(d => d <= t);
      const ms = days.reduce((a, d) => a + studyMsOf(S.timer[d], d), 0);
      weeks.push({ n: i + 1, s, e, done: e < t, cnt: days.filter(d => d < t).length, avg: ms / 7, avgSoFar: ms / days.length });
    }
    return weeks;
  }
  const hmTxt = ms => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
  function renderWeekly(box) {
    if (!box) return;
    const ws = weeklyStudy(), done = ws.filter(w => w.done).slice(-8), cur = ws.find(w => !w.done);
    const md = d => d.slice(5).replace('-', '/');
    const curTxt = cur ? `<div class="mut wk-cur">${cur.n}주차(${md(cur.s)}~${md(cur.e)}) 진행 중 · ${cur.cnt}/7일 쌓임${cur.cnt ? ` · 지금까지 하루 평균 ${hmTxt(cur.avgSoFar)}` : ''}</div>` : '';
    if (!done.length) {
      box.innerHTML = `<h3>주 평균 공부 시간</h3><div class="mut">7일이 쌓이면 주마다 하루 평균 공부 시간이 그래프로 나타나요.</div>${curTxt}`;
      return;
    }
    const max = Math.max(...done.map(w => w.avg), 1), last = done[done.length - 1];
    box.innerHTML = `<h3>주 평균 공부 시간 <small class="mut">하루 평균 · 측정한 시간</small></h3>
      <div class="wk-chart" role="img" aria-label="${done.map(w => `${w.n}주차 하루 평균 ${hmTxt(w.avg)}`).join(', ')}">
        ${done.map(w => `<div class="wk-col" data-tip="${w.n}주차 ${md(w.s)}~${md(w.e)} · 하루 평균 ${hmTxt(w.avg)}">${w === last ? `<b class="wk-v">${hmTxt(w.avg)}</b>` : ''}<i style="height:${Math.max(w.avg / max * 100, 1.5)}%"></i></div>`).join('')}
      </div>
      <div class="wk-x">${done.map(w => `<span>${w.n}주차<small>${md(w.s)}</small></span>`).join('')}</div>${curTxt}`;
  }

  /* ───────── 접속 현황 (Supabase Realtime Presence) ───────── */
  // 관리자는 접속 목록에 올리지 않는다(track 안 함). 관리자도 목록은 볼 수 있다.
  let presCh = null, presence = [];
  const presPayload = () => { const d = kstNow().day, t = S.timer[d]; return { name: me.name, st: live(t) ? 'study' : t ? 'pause' : 'online', at: Date.now() }; };
  function presUpdate() { if (presCh && me.role !== 'admin') presCh.track(presPayload()); }
  let presErr = '';
  // PC에서 다른 창을 보고 있어도 접속이 끊기지 않게: 가려진 창에서는 브라우저가 타이머를 늦춰 실시간 연결의 하트비트가 밀리고,
  // 서버가 연결을 끊어 접속 현황에서 빠진다. 라이브러리의 하트비트 타이머 대신 늦춰지지 않는 웹 워커(keepalive.js)의 신호로 보낸다.
  // 안전장치: 워커가 실제로 신호를 보내는 동안에만 라이브러리 타이머를 걷어 내고, 워커가 조용히 멈추면(일부 기기·브라우저) 원래 타이머로 되돌린다.
  function keepAlive() {
    const rt = sb && sb.realtime;
    if (!rt || rt._swmKA || typeof Worker !== 'function' || typeof rt._sendHeartbeat !== 'function' || !rt.stateChangeCallbacks) return;
    let w; try { w = new Worker('keepalive.js'); } catch (e) { return; }
    rt._swmKA = w; rt._swmBeat = 0;
    const alive = () => rt._swmKA && Date.now() - rt._swmBeat < 60000;
    const libOn = () => { if (!rt.heartbeatTimer && rt.isConnected && rt.isConnected()) rt.heartbeatTimer = setInterval(() => rt._sendHeartbeat(), rt.heartbeatIntervalMs); };
    const take = () => { if (alive() && rt.heartbeatTimer) { clearInterval(rt.heartbeatTimer); rt.heartbeatTimer = null; } };
    rt.stateChangeCallbacks.open.push(take);   // 연결(재연결)될 때마다 라이브러리가 새로 만드는 타이머를 걷어 냄(워커가 살아 있을 때만)
    let pend = 0;
    w.onmessage = () => {
      rt._swmBeat = Date.now(); take();
      // 보낸 하트비트의 응답을 아직 못 받았으면 한 번은 기다린다(라이브러리 타이머와 겹쳐 연결을 끊는 일 방지). 두 번 연속이면 끊긴 연결로 보고 라이브러리 처리에 맡김(재연결)
      if (rt.pendingHeartbeatRef && pend++ < 1) return;
      pend = 0; try { rt._sendHeartbeat(); } catch (e) { }
    };
    w.onerror = () => { rt._swmKA = null; w.terminate(); libOn(); };   // 워커를 못 쓰면 원래 방식으로
    setInterval(() => { if (!alive()) libOn(); }, 30000);   // 워커가 1분 넘게 조용하면 원래 타이머 복구
  }
  async function presInit() {
    if (!sb || typeof sb.channel !== 'function' || presCh) return;
    // enabled: 직접 접속을 등록하지 않는 관리자도 목록을 받도록 (구버전 라이브러리는 이 값을 자동으로 보내지 않음)
    presCh = sb.channel('online-users', { config: { private: true, presence: { key: uid, enabled: true } } });
    // 비공개 채널은 로그인 토큰이 있어야 들어갈 수 있다. supabase-js 2.45는 저장된 로그인을 복원할 때
    // 실시간 연결에 토큰을 넘기지 않으므로 직접 넘긴다.
    try { const { data } = await sb.auth.getSession(); if (data.session && sb.realtime) sb.realtime.setAuth(data.session.access_token); } catch (e) { }
    keepAlive(); studyRefresh();
    presCh.on('presence', { event: 'sync' }, () => {
      const st = presCh.presenceState();
      presence = Object.entries(st).map(([id, arr]) => Object.assign({ id }, arr[arr.length - 1]));
      renderPresence(); chatRender();
    });
    presCh.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') { presErr = ''; presUpdate(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { presErr = '접속 현황 연결 실패 · 새로고침해 주세요' + (err && err.message ? ` (${err.message})` : ''); renderPresence(); }
    });
  }
  // 앱을 나가 있어도 오늘 공부 시간이 측정 중인 사람(서버 함수 study_now). 실시간 접속 목록에 없는 사람만 '공부 중 · 앱 밖'으로 덧붙인다.
  let studyOff = [];
  async function studyRefresh() {
    if (!sb || uid === 'local' || typeof sb.rpc !== 'function') return;
    try { const { data, error } = await sb.rpc('study_now'); if (!error && Array.isArray(data)) { studyOff = data; renderPresence(); } } catch (e) { }
  }
  setInterval(() => { if (document.visibilityState === 'visible') studyRefresh(); }, 60000);
  // 표시 규칙: ① 공부 시간이 측정 중 → 앱을 나가 있어도 표시(공부 중 · 앱 밖)  ② 시작 전(측정 기록 없음) → 앱이 켜져 있을 때만 '접속'
  //           ③ 일시정지 중 → 다른 사람 목록에는 표시하지 않음(내 화면의 '(나)'에는 내 상태를 보여 줌)
  const presList = () => {
    const label = { study: 1, pause: 1, online: 1 }, all = presence.map(p => Object.assign({}, p, { st: label[p.st] ? p.st : 'online' })), ids = new Set(all.map(p => p.id));
    const on = all.filter(p => p.st !== 'pause' || p.id === uid);
    const off = studyOff.filter(x => x && x.id && !ids.has(x.id) && x.id !== uid).map(x => ({ id: x.id, name: x.name, st: 'study', away: true }));
    return on.concat(off).sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : 0) || (a.away || 0) - (b.away || 0));
  };
  // ⋯ 메뉴의 접속 현황: 나 + 지금 접속한 사람(상태), ⋯ 버튼에는 다른 접속자 수
  function renderTbPres() {
    const box = $('#tbPres'), badge = $('#tbN'); if (!box) return;
    if (!sb) { box.innerHTML = ''; badge.textContent = ''; return; }
    const label = { study: ['공부 중', 'okt'], pause: ['일시정지', 'warnt'], online: ['접속', ''] };
    const list = presList();
    const others = list.filter(p => p.id !== uid), meIn = list.some(p => p.id === uid);
    badge.textContent = others.length ? others.length : '';
    const row = p => `<div class="tbp"><i class="dot ${p.st}"></i><span>${esc(p.name || '이름 없음')}${p.id === uid ? ' <b>(나)</b>' : ''}</span><span class="tag ${label[p.st][1]}">${label[p.st][0]}${p.away ? ' · 앱 밖' : ''}</span></div>`;
    box.innerHTML = `<div class="tbp-h"><b>접속 현황</b><span class="mut">${presErr ? '연결 실패' : `지금 ${list.length + (meIn ? 0 : 1)}명`}</span></div>`
      + (meIn ? '' : `<div class="tbp"><i class="dot online"></i><span>${esc(me.name)} <b>(나)</b></span><span class="tag">관리자</span></div>`)
      + list.map(row).join('')
      + (!meIn && me.role === 'admin' ? '<div class="tbp-note">관리자는 다른 사용자의 접속 현황에는 표시되지 않아요.</div>' : '')
      + (presErr ? `<div class="tbp-note">${esc(presErr)}</div>` : !others.length ? '<div class="tbp-note">지금 접속한 다른 사람은 없어요.</div>' : '');
  }
  function renderPresence() {
    renderTbPres();
    const box = $('#presence'); if (!box) return;
    if (!sb) { box.innerHTML = '<div class="mut">서버에 연결하면 함께 공부하는 사람의 접속 현황이 표시돼요.</div>'; return; }
    const label = { study: ['공부 중', 'okt'], pause: ['일시정지', 'warnt'], online: ['접속', ''] };
    const list = presList();
    if (presErr) { box.innerHTML = `<div class="pr-h"><b>접속 현황</b><span class="mut">${esc(presErr)}</span></div>`; return; }
    box.innerHTML = `<div class="pr-h"><b>접속 현황</b><span class="mut">지금 ${list.length}명 접속</span></div>`
      + (list.length ? `<div class="pr-list">${list.map(p => `<span class="pr"><i class="dot ${p.st}"></i>${esc(p.name || '이름 없음')}${p.id === uid ? ' (나)' : ''}<span class="tag ${label[p.st] ? label[p.st][1] : ''}">${label[p.st] ? label[p.st][0] : '접속'}${p.away ? ' · 앱 밖' : ''}</span></span>`).join('')}</div>`
        : '<div class="mut">지금 접속한 사람이 없어요.</div>');
  }

  /* ───────── 출석 인증 (카메라) ───────── */
  // 블록: 08–10시, 12–14시, 18–20시 (한국시각). 서버 모드에서는 저장 시 서버가 시각을 다시 확인한다(schema.sql의 current_block).
  const BLOCKS = [{ n: 1, name: '오전', s: 8 * 60, e: 10 * 60 }, { n: 2, name: '점심', s: 12 * 60, e: 14 * 60 }, { n: 3, name: '저녁', s: 18 * 60, e: 20 * 60 }];
  const ATT_KEEP = 30;   // 사진 보관 일수
  const ATT_START = START_DAY;   // 출석 기록표는 이 날짜부터 (그 전 날짜는 표시하지 않음)
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  function kstNow() {
    const d = window.FM_TEST_NOW ? new Date(window.FM_TEST_NOW) : new Date();
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
    const g = k => f.find(x => x.type === k).value, min = (+g('hour') % 24) * 60 + +g('minute');
    return { day: `${g('year')}-${g('month')}-${g('day')}`, min, hm: hhmm(min) };
  }
  const curBlock = m => BLOCKS.find(b => m >= b.s && m < b.e);
  let ATT = {};   // 날짜 → 블록 → { t, path | img }
  async function loadAtt() {
    const k = kstNow();
    if (!sb) { ATT = S.att || {}; return; }
    const { data, error } = await sb.from('attendance').select('day,block,taken_at,photo_path').eq('user_id', uid).gte('day', addDays(k.day, -13));
    if (error) return;
    ATT = {};
    data.forEach(r => { (ATT[r.day] || (ATT[r.day] = {}))[r.block] = { t: new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(r.taken_at)), path: r.photo_path }; });
  }
  function renderAtt() {
    renderWeekly($('#att-weekly'));
    const k = kstNow(), cb = curBlock(k.min), mine = ATT[k.day] || {};
    $('#att-now').textContent = `지금(한국시각) ${k.day} ${k.hm}`;
    $('#att-blocks').innerHTML = BLOCKS.map(b => {
      const done = mine[b.n], live = cb && cb.n === b.n, past = k.min >= b.e;
      const st = done ? `<span class="tag okt">출석 ${done.t}</span>` : live ? '<span class="tag warnt">지금 출석 가능</span>' : past ? '<span class="tag badt">결석</span>' : '<span class="tag">예정</span>';
      return `<div class="ablk${done ? ' done' : live ? ' live' : ''}"><div class="ab-h"><b>${b.name}</b><span class="mut">${hhmm(b.s)} – ${hhmm(b.e)}</span></div>${st}
        ${done && done.img ? `<img class="ab-img" src="${done.img}" alt="내 출석 사진">` : ''}
        <button class="btn primary" data-act="att-open" data-b="${b.n}"${live && !done ? '' : ' disabled'}>📷 출석 인증</button></div>`;
    }).join('');
    const days = [...Array(14)].map((_, i) => addDays(k.day, -i)).filter(d => d >= ATT_START);
    const n = days.reduce((s, d) => s + Object.keys(ATT[d] || {}).length, 0);
    $('#att-hist').innerHTML = `<div class="hist">최근 ${days.length}일 출석 ${n}회 / ${days.length * 3}블록</div><div class="wrapx"><table class="lt att-t"><tr><th>날짜</th>${BLOCKS.map(b => `<th>${b.name}</th>`).join('')}</tr>${days.map(d => `<tr><td>${d.slice(5)}</td>${BLOCKS.map(b => { const r = (ATT[d] || {})[b.n]; return `<td>${r ? `✔ ${r.t}` : (d < k.day || (d === k.day && k.min >= b.e)) ? '<span class="mut">✘</span>' : ''}</td>`; }).join('')}</tr>`).join('')}</table></div>`;
    $('#attN').textContent = cb && !mine[cb.n] ? '!' : '';
  }
  // 카메라
  let camStream = null, camBlob = null, camBlockN = null;
  function camMsg(t) { $('#camErr').textContent = t || ''; }
  function camStop() { if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  function camUI(shot) { $('#camVideo').hidden = shot; $('#camShot').hidden = !shot; $('#camShoot').hidden = shot; $('#camRetake').hidden = !shot; $('#camSave').hidden = !shot; }
  async function camOpen(n) {
    if (!S.settings.attConsent) {
      if (!confirm('출석 인증을 위해 카메라로 얼굴 사진을 찍어 저장합니다.\n· 사진은 본인과 관리자만 볼 수 있고, 다른 사용자는 볼 수 없습니다.\n· 사진은 ' + ATT_KEEP + '일 후 삭제됩니다.\n동의하십니까?')) return;
      S.settings.attConsent = today(); touch('_settings');
    }
    camBlockN = n; camBlob = null; camMsg(''); camUI(false);
    $('#camTitle').textContent = `${BLOCKS[n - 1].name} 출석 인증`; $('#camOv').classList.add('on');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camMsg('이 브라우저에서는 카메라를 쓸 수 없습니다. https 주소에서 열었는지 확인하세요.'); return; }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      $('#camVideo').srcObject = camStream;
    } catch (e) {
      camMsg(e.name === 'NotAllowedError' ? '카메라 권한이 거부되었습니다. 주소창의 카메라 아이콘에서 허용해 주세요.' : e.name === 'NotFoundError' ? '사용할 수 있는 카메라가 없습니다.' : '카메라를 켜지 못했습니다: ' + e.message);
    }
  }
  function camShoot() {
    const v = $('#camVideo'), c = $('#camCanvas');
    if (!v.videoWidth) { camMsg('카메라 화면이 아직 준비되지 않았습니다.'); return; }
    const w = 320, h = Math.round(w * v.videoHeight / v.videoWidth);
    c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h);
    const url = c.toDataURL('image/jpeg', 0.7); $('#camShot').src = url;
    const bin = atob(url.split(',')[1]), arr = new Uint8Array(bin.length);   // 사진을 바로 파일로 변환 (toBlob은 비동기라 저장을 서두르면 비어 있을 수 있음)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    camBlob = new Blob([arr], { type: 'image/jpeg' });
    camUI(true);
  }
  async function camSave() {
    const k = kstNow(), b = curBlock(k.min);
    if (!b || b.n !== camBlockN) { camMsg('출석 가능 시간이 지났습니다.'); return; }
    if ((ATT[k.day] || {})[b.n]) { camMsg('이 블록은 이미 출석했습니다.'); return; }
    const img = $('#camShot').src;
    if (sb) {
      if (!camBlob) { camMsg('사진을 처리하는 중입니다. 잠시 후 다시 눌러 주세요.'); return; }
      const path = `${uid}/${k.day}-${b.n}.jpg`;
      const up = await sb.storage.from('attendance').upload(path, camBlob, { contentType: 'image/jpeg', upsert: true });
      if (up.error) { camMsg('사진 저장 실패: ' + up.error.message); return; }
      const ins = await sb.from('attendance').insert({ day: k.day, block: b.n, photo_path: path });
      if (ins.error) { camMsg('출석 기록 실패(서버 시각 기준 출석 시간이 아니거나 이미 출석): ' + ins.error.message); return; }
      (ATT[k.day] || (ATT[k.day] = {}))[b.n] = { t: k.hm, path, img };
    } else {
      S.att = S.att || {};
      (S.att[k.day] || (S.att[k.day] = {}))[b.n] = { t: k.hm, img };
      Object.keys(S.att).filter(d => d < addDays(k.day, -13)).forEach(d => delete S.att[d]);   // 로컬은 최근 14일만
      saveLocal(); ATT = S.att;
    }
    timerStart(k.day);   // 그날 기록이 없으면 공부 시간 측정 시작 (이미 있으면 그대로)
    camStop(); $('#camOv').classList.remove('on'); renderAtt();
  }
  async function showAttPhoto(path, label) {
    const { data, error } = await sb.storage.from('attendance').createSignedUrl(path, 120);
    if (error) { alert('사진을 불러오지 못했습니다: ' + error.message); return; }
    $('#photoImg').src = data.signedUrl; $('#photoCap').textContent = label; $('#photoOv').classList.add('on');
  }

  /* ───────── 개념 찾기 (질문 → 개념 → 이 앱의 공식·약술·문제, 내 오답 우선) ───────── */
  // 정보처리기사 앱의 개념 검색 방식: 조사·불용어를 떼고, 개념 이름·동의어가 질문에 들어 있는지 본다.
  const CONCEPTS = PACK.concepts || [];
  const cxNorm = s => String(s).toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[\s·,.\-_/()\[\]{}?!~'"`:;→←=+*|<>]/g, '');
  const cxRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const CX_STOP = new Set(['개념', '잘', '모르겠다', '모르겠어', '모르겠어요', '모르겠음', '모르는', '몰라', '몰라요', '헷갈려', '헷갈려요', '헷갈린다', '헷갈림', '뭐야', '뭐예요', '뭔지', '무엇', '알려줘', '알려주세요', '설명', '설명해줘', '오늘', '연습서', '풀다가', '풀다', '것', '같다', '같아', '같아요', '대한', '대해', '대해서', '부분', '문제', '공부', '다시', '어떻게', '이해', '안돼', '안된다', '안', '좀', '하는', '하고', '있는', '있다', '때', '중', '중에', '관련', '내용', '파트']);
  const CX_PART = /(이라는|이란|라는|에서|으로|에게|한테|은|는|이|가|을|를|의|와|과|랑|로|에|도|만|야|요)$/;
  const CX_UNIT = PACK.cxUnit || [];
  function cxTokens(q) {
    return q.toLowerCase().split(/[\s,.?!·/()~]+/).map(t => { let u = t; for (let n = 0; n < 2; n++) { const v = u.replace(CX_PART, ''); if (v && v !== u) u = v; } return u; })
      .filter(t => t.length >= 2 && !CX_STOP.has(t));
  }
  function cxNameIn(name, qLow, qN) {   // 영문은 단어 경계로, 한글은 공백을 무시하고 비교
    if (/^[a-z0-9]/i.test(name)) return new RegExp('(^|[^a-z0-9])' + cxRe(name.toLowerCase()) + '($|[^a-z0-9])').test(qLow);
    const n = cxNorm(name); return n.length >= 2 && qN.includes(n);
  }
  const cxBase = c => c.name.replace(/\(.*\)/, '');
  let CX_LINK = null;   // 개념 → 관련 공식 줄·약술 카드·문제 (처음 쓸 때 한 번 계산)
  function cxLinks() {
    if (CX_LINK) return CX_LINK;
    const hit = (txt, c) => { const low = String(txt).toLowerCase(), n = cxNorm(txt); return [cxBase(c), ...c.alias].some(a => cxNameIn(a, low, n)); };
    const ptxt = d => [d.title, d.trend, ...d.qs.map(q => q.text || '')].join(' ');
    CX_LINK = CONCEPTS.map(c => ({
      sum: SUMMARY.filter(x => x.unit === c.unit).flatMap(x => x.rows).filter(r => hit(r[0] + ' ' + r[1], c)),
      memo: MEMO.filter(m => m.d.unit === c.unit && hit(m.q.text + ' ' + (m.q.model || ''), c)),
      probs: PROBS.filter(d => d.unit === c.unit && !d.essay && hit(ptxt(d), c)),
    }));
    return CX_LINK;
  }
  function cxSearch(q) {
    const qLow = q.toLowerCase(), qN = cxNorm(q), toks = cxTokens(q);
    const unit = (CX_UNIT.find(([, re]) => re.test(q)) || [])[0];
    return CONCEPTS.map((c, i) => {
      let sc = 0;
      [cxBase(c), ...c.alias].forEach(a => { if (cxNameIn(a, qLow, qN)) sc = Math.max(sc, 10 + cxNorm(a).length); });
      if (!sc) { const txt = cxNorm(c.name + c.alias.join('') + c.desc); toks.forEach(t => { if (txt.includes(cxNorm(t))) sc += 2; }); }
      if (sc && unit) sc += c.unit === unit ? 6 : -4;
      return { i, sc };
    }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 3).map(x => x.i);
  }
  const resRank = { bad: 0, none: 1, ok: 2 };
  function cxCard(i) {
    const c = CONCEPTS[i], L = cxLinks()[i];
    const probs = L.probs.slice().sort((a, b) => resRank[lastRes(a.id)] - resRank[lastRes(b.id)]).slice(0, 4);
    const tag = r => r === 'bad' ? '<span class="tag badt">내 오답</span>' : r === 'ok' ? '<span class="tag okt">맞음</span>' : '<span class="tag">미풀이</span>';
    return `<div class="box cx-card"><div class="cx-path"><span class="tag unit">${uName(c.unit)}</span> › <b>${esc(c.name)}</b></div>
      ${c.html ? `<div class="cx-desc cx-html">${c.html}</div>` : `<p class="cx-desc">${esc(c.desc)}</p>`}
      ${(ipeNotes().cx || {})[c.name] ? `<div class="ipe-note"><b>내 정리(이전 앱)</b>${esc(ipeNotes().cx[c.name])}</div>` : ''}
      ${L.sum.length ? `<div class="cx-sec"><b>핵심 공식</b><table>${L.sum.slice(0, 4).map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table></div>` : ''}
      ${L.memo.length ? `<div class="cx-sec"><b>약술로 정리</b>${L.memo.slice(0, 3).map(m => `<details class="cx-memo"><summary>${esc(m.q.text)}</summary><div>${esc(m.q.model || '')}</div></details>`).join('')}</div>` : ''}
      ${probs.length ? `<div class="cx-sec"><b>다시 풀어 볼 문제</b>${probs.map(d => `<button class="cx-prob" data-act="cx-prob" data-id="${d.id}">${tag(lastRes(d.id))}<span>${esc(d.title)}</span><span class="mut">풀기 ›</span></button>`).join('')}</div>` : ''}
    </div>`;
  }
  const CX_S = { q: '' };
  function cxIndex() {
    const N = ipeNotes(), mine = N.mine || [];
    return ipeNotesBox(N) + `<div class="box"><h3>단원별 개념</h3>${UNITS.map(u => `<div class="cx-unit"><span class="tag unit">${u.name}</span><div class="cx-chips">${CONCEPTS.map((c, i) => c.unit === u.k ? `<button class="chip" data-act="cx-pick" data-i="${i}">${esc(c.name)}</button>` : '').join('')}</div></div>`).join('')}</div>`
      + (mine.length ? `<div class="box"><h3>내가 추가한 개념 <small class="mut">(이전 앱)</small></h3>${mine.map(x => `<details class="cx-memo"><summary>${esc(x.k)}${x.ch ? ` <small class="mut">${esc(x.ch)}</small>` : ''}</summary><div>${esc(x.d)}</div></details>`).join('')}</div>` : '');
  }
  // 예전 정보처리기사 앱에서 가져온 내 정리(개념 메모·문제 메모·단원 메모)를 한곳에
  function ipeNotesBox(N) {
    const cx = Object.entries(N.cx || {}), plan = Object.entries(N.plan || {}), qn = PROBS.filter(d => oldNote(d.id));
    if (!cx.length && !plan.length && !qn.length) return '';
    const idx = Object.fromEntries(CONCEPTS.map((c, i) => [c.name, i]));
    const byUnit = UNITS.map(u => [u, cx.filter(([k]) => idx[k] != null && CONCEPTS[idx[k]].unit === u.k)]).filter(([, l]) => l.length), etc = cx.filter(([k]) => idx[k] == null);
    const item = ([k, v]) => `<details class="cx-memo"><summary>${esc(k)}${idx[k] != null ? ` <button class="chip" data-act="cx-pick" data-i="${idx[k]}">개념 보기</button>` : ''}</summary><div>${esc(v)}</div></details>`;
    return `<div class="box ipe-mine"><h3>내 정리 모아보기 <small class="mut">(이전 앱 · 개념 ${cx.length} · 문제 ${qn.length}${plan.length ? ` · 단원 ${plan.length}` : ''})</small></h3>`
      + byUnit.map(([u, l]) => `<details class="ipe-grp" open><summary><span class="tag unit">${esc(u.name)}</span> 개념 메모 ${l.length}개</summary>${l.map(item).join('')}</details>`).join('')
      + (etc.length ? `<details class="ipe-grp"><summary>기타 개념 메모 ${etc.length}개</summary>${etc.map(item).join('')}</details>` : '')
      + (qn.length ? `<details class="ipe-grp"><summary>문제 메모 ${qn.length}개</summary>${qn.map(d => `<details class="cx-memo"><summary>${esc(d.title)} <button class="chip" data-act="cx-prob" data-id="${d.id}">문제 풀기</button></summary><div>${esc(oldNote(d.id))}</div></details>`).join('')}</details>` : '')
      + (plan.length ? `<details class="ipe-grp"><summary>단원 공부 메모 ${plan.length}개</summary>${plan.map(([k, v]) => `<details class="cx-memo"><summary>${esc(k)}</summary><div>${esc(v)}</div></details>`).join('')}</details>` : '')
      + '</div>';
  }
  function renderCx() {
    const out = $('#cx-out'); if (!out) return;
    const q = CX_S.q.trim();
    if (q) {
      const hits = cxSearch(q);
      out.innerHTML = hits.length ? `<div class="count">관련 개념 ${hits.length}개 · 가까운 순</div>` + hits.map(cxCard).join('')
        : `<div class="empty">찾는 개념이 없어요. 'WACC', '듀레이션', '풋콜패리티'처럼 개념 이름을 넣거나 아래 목록에서 골라 보세요.</div>` + cxIndex();
      return;
    }
    // 질문 전: 내 오답에 걸린 개념을 먼저 추천
    const L = cxLinks(), wrong = new Set(PROBS.filter(d => lastRes(d.id) === 'bad').map(d => d.id));
    const rec = CONCEPTS.map((c, i) => ({ i, n: L[i].probs.filter(d => wrong.has(d.id)).length })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 5);
    out.innerHTML = (rec.length ? `<div class="box cx-rec"><h3>내 오답에서 추천</h3><div class="mut" style="margin-bottom:8px">최근에 틀린 문제와 연결된 개념이에요.</div><div class="cx-chips">${rec.map(x => `<button class="chip" data-act="cx-pick" data-i="${x.i}">${esc(CONCEPTS[x.i].name)} <small>오답 ${x.n}</small></button>`).join('')}</div></div>` : '') + cxIndex();
  }

  /* ───────── 메신저 (사용자끼리 실시간 대화) ───────── */
  // 메시지는 Supabase messages 테이블에 저장하고, 새 메시지는 서버가 받는 사람의 비공개 채널로 바로 보낸다.
  // 실시간 연결이 끊겨도 15초마다 새 메시지를 다시 확인한다. 읽은 위치는 이 기기에만 저장한다.
  const CH = { on: false, open: false, room: null, members: [], msgs: {}, lastId: 0, read: {}, push: 'no' };
  const chatReadKey = () => 'cpa-fm-chatread:' + uid;
  const roomOf = other => 'dm:' + [uid, other].sort().join(':');
  const roomPeer = r => r.split(':').slice(1).find(x => x !== uid);
  const memberName = id => (CH.members.find(m => m.id === id) || {}).name || '(알 수 없음)';
  const roomName = r => r === 'all' ? '전체 대화방' : memberName(roomPeer(r));
  const unreadOf = r => (CH.msgs[r] || []).filter(m => m.id > (CH.read[r] || 0) && m.sender !== uid).length;
  /* 읽음 위치 기기 간 공유: 본인 progress 행 'chatread'. 관리자도 progress를 조회할 수 있어 대화방 이름은 해시로만 저장(누구와 대화하는지 안 드러나게).
   * 안 읽은 메시지가 있을 때 5초마다, 앱으로 돌아올 때 확인. 위치는 늘어나기만 하므로 기기끼리 큰 값으로 합침. */
  const CR_PID = 'chatread', crKey = r => hash(`${uid}|${r}`).toString(36);
  const crSaveLocal = () => { try { localStorage.setItem(chatReadKey(), JSON.stringify(CH.read)); } catch (e) { } };
  function crSave() {
    const old = peek(CR_PID) || { n: 0, box: 0, due: null, ok: 0, hist: [], r: {} }, r = Object.assign({}, old.r);
    Object.entries(CH.read).forEach(([room, id]) => { const k = crKey(room); r[k] = Math.max(+r[k] || 0, +id || 0); });
    S.progress[CR_PID] = Object.assign(old, { r }); touch(CR_PID);
  }
  function crMerge(data) {   // 서버 값이 더 크면 받아 오고, 이 기기가 더 앞서면 다시 저장
    const r = (data && data.r) || {}; let moved = false, ahead = false;
    new Set([...Object.keys(CH.msgs), ...Object.keys(CH.read)]).forEach(room => {
      const v = +r[crKey(room)] || 0, cur = CH.read[room] || 0;
      if (v > cur) { CH.read[room] = v; moved = true; } else if (cur > v) ahead = true;
    });
    if (moved) crSaveLocal();
    if (ahead) crSave();
    return moved;
  }
  async function crPoll() {
    if (!CH.on) return;
    const { data, error } = await sb.from('progress').select('data').eq('user_id', uid).eq('pid', CR_PID).maybeSingle();
    if (error || !data) return;
    if (crMerge(data.data)) chatRender();
  }
  function chatAdd(rows) {
    let readMoved = false;
    rows.forEach(m => {
      if (!m || !m.room) return;
      const l = CH.msgs[m.room] || (CH.msgs[m.room] = []);
      if (!l.some(x => x.id === m.id)) { l.push(m); l.sort((a, b) => a.id - b.id); }
      CH.lastId = Math.max(CH.lastId, m.id);
      // 내가 어느 기기에서든 보냈다면 그 대화방의 그 앞 메시지는 읽은 것: PC에서 답장하면 휴대폰 배지도 꺼짐(서버가 내 메시지도 내 채널로 실시간 전달)
      if (m.sender === uid && m.id > (CH.read[m.room] || 0)) { CH.read[m.room] = m.id; readMoved = true; }
    });
    if (readMoved) { crSaveLocal(); crSave(); }
  }
  async function chatInit() {
    if (!sb || CH.on || typeof sb.rpc !== 'function') return;
    CH.on = true; $('#chatFab').hidden = false;
    try { CH.read = JSON.parse(localStorage.getItem(chatReadKey()) || '{}'); } catch (e) { CH.read = {}; }
    const [mb, ms] = await Promise.all([sb.rpc('chat_members'),
      sb.from('messages').select('id,room,sender,body,created_at').order('id', { ascending: false }).limit(300)]);
    if (!mb.error) CH.members = mb.data || [];
    if (!ms.error) chatAdd(ms.data || []);
    else CH.err = '메신저를 불러오지 못했어요 (관리자가 schema.sql을 다시 실행해야 할 수 있어요)';
    crMerge(peek(CR_PID));
    try { const { data } = await sb.auth.getSession(); if (data.session && sb.realtime) sb.realtime.setAuth(data.session.access_token); } catch (e) { }
    ['chat:all', 'chat:u:' + uid].forEach(topic => {
      sb.channel(topic, { config: { private: true } }).on('broadcast', { event: 'msg' }, ({ payload }) => { chatAdd([payload]); chatRender(); }).subscribe();
    });
    chatRender();
    wpSync().then(chatRender);
    const want = new URLSearchParams(location.search).get('chat');   // 알림을 눌러 앱이 새로 열린 경우
    if (want !== null) { history.replaceState(history.state, '', location.pathname); chatOpenRoom(want); }
  }
  function chatOpenRoom(r) {
    CH.open = true; CH.room = r === 'all' || (/^dm:/.test(r) && r.split(':').includes(uid) && CH.members.some(m => m.id === roomPeer(r))) ? r : null;
    chatPoll(); chatRender();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (CH.on && e.data && e.data.type === 'open-chat') chatOpenRoom(e.data.room); });

  /* 메신저 알림 (웹 푸시): 이 기기에서 켜 두면 앱을 닫아도 새 메시지가 기기 알림으로 온다.
     구독 정보는 push_register()로 서버에 맡기고, 새 메시지가 저장되면 서버가 Cloudflare Worker(/api/push)를 거쳐 보낸다. */
  const wpKey = () => { const s = CFG.pushKey || '', b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  // 서비스워커가 준비되지 않는 환경(파일로 연 경우 등)에서 '설정 중…'에 멈추지 않게 5초까지만 기다린다
  const wpReady = () => Promise.race([navigator.serviceWorker.ready.then(r => r.pushManager), new Promise((_, no) => setTimeout(() => no(new Error('sw timeout')), 5000))]);
  async function wpState() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (!CFG.pushKey || !('serviceWorker' in navigator) || !window.isSecureContext) return 'no';
    if (ios && !app) return 'ios';
    if (!('PushManager' in window) || !('Notification' in window)) return 'no';
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission !== 'granted') return 'off';
    return (await wpReady()).getSubscription().then(s => s ? 'on' : 'off');
  }
  const wpRegister = s => { const j = s.toJSON(); return sb.rpc('push_register', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth }); };
  async function wpSync() {   // 앱을 열 때마다: 켜 둔 기기면 이 계정으로 구독을 다시 등록 (만료·계정 변경 대비)
    try { CH.push = await wpState(); if (CH.push === 'on') { const s = await (await wpReady()).getSubscription(); const r = await wpRegister(s); if (r.error) CH.push = 'err'; } }
    catch (e) { CH.push = 'no'; }
  }
  async function wpOn() {
    CH.push = 'busy'; chatRender();
    try {
      if (await Notification.requestPermission() !== 'granted') { CH.push = await wpState(); return; }
      const pm = await wpReady(), s = (await pm.getSubscription()) || await pm.subscribe({ userVisibleOnly: true, applicationServerKey: wpKey() });
      const r = await wpRegister(s);
      CH.push = r.error ? 'err' : 'on';
    } catch (e) { CH.push = 'err'; }
    finally { chatRender(); renderTimer(); }
  }
  async function wpOff() {
    try {
      const s = await (await wpReady()).getSubscription();
      if (s) { await sb.rpc('push_unregister', { p_endpoint: s.endpoint }); await s.unsubscribe(); }
    } catch (e) { }
    CH.push = 'off';
  }
  function wpRow() {
    const m = {
      off: ['새 메시지·공부 시간 알림을 이 기기로 받기', '<button class="btn primary" data-act="push-on">알림 켜기</button>'],
      on: ['🔔 이 기기로 새 메시지·일시정지 잊음 알림이 와요 (앱을 닫아도)', '<button class="btn ghost" data-act="push-off">끄기</button>'],
      busy: ['알림 설정 중…', ''],
      denied: ['이 사이트 알림이 차단돼 있어요. 주소창 왼쪽 자물쇠 → 알림 → 허용으로 바꾼 뒤 새로고침하세요.', ''],
      ios: ['아이폰은 Safari 공유 버튼 → "홈 화면에 추가"로 설치한 앱에서 알림을 켤 수 있어요.', ''],
      err: ['알림을 켜지 못했어요 (관리자가 schema.sql을 다시 실행해야 할 수 있어요).', '<button class="btn ghost" data-act="push-on">다시 시도</button>'],
    }[CH.push];
    return m ? `<div class="chat-push"><span>${m[0]}</span>${m[1]}</div>` : '';
  }
  async function chatPoll() {
    if (!CH.on) return;
    const r = await sb.from('messages').select('id,room,sender,body,created_at').gt('id', CH.lastId).order('id').limit(200);
    if (!r.error && r.data.length) { chatAdd(r.data); chatRender(); }
  }
  const msgTime = iso => { const d = new Date(iso), k = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d); return k === kstNow().day ? clock(d.getTime()) : k.slice(5).replace('-', '/'); };
  function chatRender() {
    if (!CH.on) return;
    const total = Object.keys(CH.msgs).reduce((s, r) => s + (CH.open && CH.room === r ? 0 : unreadOf(r)), 0);
    $('#chatN').textContent = total ? (total > 99 ? '99+' : total) : '';
    const pane = $('#chatPanel'); pane.hidden = !CH.open;
    if (!CH.open) return;
    const body = $('#chatBody'), online = new Set(presence.map(x => x.id));
    $('#chatBack').hidden = !CH.room; $('#chatForm').hidden = !CH.room;
    if (!CH.room) {
      $('#chatTitle').textContent = '메신저';
      const rooms = ['all', ...CH.members.filter(m => m.id !== uid).map(m => roomOf(m.id))];
      body.innerHTML = wpRow() + (CH.err ? `<div class="mut chat-err">${esc(CH.err)}</div>` : '') + rooms.map(r => {
        const last = (CH.msgs[r] || []).slice(-1)[0], n = unreadOf(r), peer = r === 'all' ? null : roomPeer(r);
        return `<button class="chat-room" data-act="chat-room" data-room="${esc(r)}"><span class="chat-av${r === 'all' ? ' all' : ''}">${r === 'all' ? '전체' : esc(memberName(peer).slice(0, 1))}${peer && online.has(peer) ? '<i class="on"></i>' : ''}</span>
          <span class="chat-rm"><b>${esc(roomName(r))}</b><small>${last ? esc(last.body.slice(0, 40)) : '대화를 시작해 보세요'}</small></span>
          <span class="chat-rt">${last ? `<small>${msgTime(last.created_at)}</small>` : ''}${n ? `<em>${n}</em>` : ''}</span></button>`;
      }).join('');
      return;
    }
    $('#chatTitle').textContent = roomName(CH.room);
    const list = CH.msgs[CH.room] || [];
    body.innerHTML = list.length ? list.map((m, i) => {
      const meMsg = m.sender === uid, prev = list[i - 1], showName = !meMsg && CH.room === 'all' && (!prev || prev.sender !== m.sender);
      return `<div class="chat-msg${meMsg ? ' me' : ''}">${showName ? `<div class="chat-who">${esc(memberName(m.sender))}</div>` : ''}<div class="chat-line"><div class="chat-bub">${esc(m.body)}</div><small>${msgTime(m.created_at)}</small></div></div>`;
    }).join('') : '<div class="mut chat-empty">아직 대화가 없어요. 첫 메시지를 보내 보세요.</div>';
    body.scrollTop = body.scrollHeight;
    if (list.length && list[list.length - 1].id > (CH.read[CH.room] || 0)) { CH.read[CH.room] = list[list.length - 1].id; crSaveLocal(); crSave(); }
  }
  async function chatSend(text) {
    const t = text.trim(); if (!t || !CH.room) return;
    $('#chatErr').textContent = '';
    const { data, error } = await sb.from('messages').insert({ room: CH.room, body: t.slice(0, 1000) }).select('id,room,sender,body,created_at').single();
    if (error) { $('#chatErr').textContent = '보내지 못했어요: ' + error.message; return false; }
    chatAdd([data]); chatRender(); return true;
  }
  setInterval(() => { if (CH.on && document.visibilityState === 'visible') chatPoll(); }, 15000);
  setInterval(() => { if (CH.on && document.visibilityState === 'visible' && $('#chatN').textContent) crPoll(); }, 5000);   // 다른 기기에서 읽으면 배지 끄기
  document.addEventListener('visibilitychange', () => { if (!document.hidden && CH.on) crPoll(); });

  /* ───────── 관리자 ───────── */
  function attGrid(u, rows) {
    const k = kstNow(), days = [...Array(7)].map((_, i) => addDays(k.day, -i)).filter(d => d >= ATT_START);
    rows = rows.filter(r => r.day >= ATT_START);
    const fmtT = s => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(s));
    return `<div class="hist">최근 ${days.length}일 출석 ${rows.length}/${days.length * 3}블록 (✔를 누르면 인증 사진)</div><div class="wrapx"><table class="lt att-t"><tr><th></th>${days.map(d => `<th>${d.slice(5)}</th>`).join('')}</tr>${BLOCKS.map(b => `<tr><td>${b.name}</td>${days.map(d => { const r = rows.find(x => x.day === d && x.block === b.n); return `<td>${r ? `<button class="btn ghost att-c" data-act="att-photo" data-path="${esc(r.photo_path)}" data-label="${esc(u.name || '')} · ${d} ${b.name} ${fmtT(r.taken_at)}">✔ ${fmtT(r.taken_at)}</button>` : (d < k.day || (d === k.day && k.min >= b.e)) ? '<span class="mut">✘</span>' : ''}</td>`; }).join('')}</tr>`).join('')}</table></div>`;
  }
  async function attCleanup() {   // 보관기간이 지난 출석 사진·기록 삭제 (관리자 화면을 열 때)
    const cut = addDays(kstNow().day, -ATT_KEEP);
    const old = await sb.from('attendance').select('id,photo_path').lt('day', cut);
    if (old.error || !old.data.length) return;
    await sb.storage.from('attendance').remove(old.data.map(r => r.photo_path));
    await sb.from('attendance').delete().lt('day', cut);
  }
  async function renderAdmin() {
    const box = $('#admin-body');
    if (!sb || me.role !== 'admin') { box.innerHTML = '<div class="empty">관리자만 볼 수 있습니다.</div>'; return; }
    box.innerHTML = '<div class="empty">불러오는 중…</div>';
    const [pf, pg, mk, as, at] = await Promise.all([
      sb.from('profiles').select('*').order('created_at'),
      fetchAll(() => sb.from('progress').select('user_id,pid,data').order('user_id').order('pid')),
      fetchAll(() => sb.from('mock_results').select('user_id,data,created_at').order('created_at', { ascending: false })),
      sb.from('assignments').select('*').eq('active', true).order('created_at'),
      fetchAll(() => sb.from('attendance').select('user_id,day,block,taken_at,photo_path').gte('day', addDays(kstNow().day, -6)).order('day')),
    ]);
    const err = [pf, pg, mk, as].find(r => r.error);
    attCleanup();
    if (err) { box.innerHTML = `<div class="empty">불러오기 실패: ${esc(err.error.message)}</div>`; return; }
    const t = today();
    dmaLoad(pf.data, pg.data);
    box.innerHTML = `<div class="notice demo-n">문제를 풀지 않고 오답 패턴을 보려면 <a href="?demo&amp;subj=${encodeURIComponent(SUBJ)}" target="_blank" rel="noopener">체험 모드 열기 ↗</a> (예시 기록 · 서버에 저장 안 됨)</div><div id="adm-dm"></div>` + (pf.data.map(u => {
      const progress = {}; pg.data.filter(r => r.user_id === u.id && ALLID[r.pid]).forEach(r => progress[r.pid] = r.data);
      const jr = pg.data.filter(r => r.user_id === u.id && r.pid.startsWith('j:') && r.pid.slice(2) >= addDays(t, -6)).flatMap(r => (r.data.items || []).map(it => ({ d: r.pid.slice(2), ...it })));
      const jmin = jr.reduce((s, it) => s + Math.max(toMin(it.e) - toMin(it.s), 0), 0);
      const subs = adminSubjects(u, progress), mainPk = PACKS[subs[0]];
      const last = Object.values(progress).map(p => p.last).filter(Boolean).sort().pop();
      const mocks = mk.data.filter(m => m.user_id === u.id).slice(0, 3);
      const asg = as.data.filter(a => a.user_id === u.id);
      return `<div class="ucard"><h3>${esc(u.name || '이름 없음')} ${u.role === 'admin' ? '<span class="tag unit">관리자</span>' : ''}<small>마지막 학습 ${esc(last || '없음')} · ${subs.map(k => esc(PACKS[k].name)).join(' · ')}</small></h3>
        ${u.role === 'admin' ? '' : `<div class="aform subj-f"><span class="mut">과목</span>${ORDER.map(k => `<label class="chk"><input type="checkbox" class="sj-${u.id}" value="${k}"${(Array.isArray(u.subjects) && u.subjects.length ? u.subjects : ['fm2']).includes(k) ? ' checked' : ''}> ${esc(PACKS[k].name)}</label>`).join('')}<button class="btn" data-act="subj-save" data-uid="${u.id}">과목 저장</button></div>`}
        ${subs.map(k => adminSubjBlock(PACKS[k], progress, subs.length > 1)).join('')}
        ${u.role === 'admin' ? '' : subs.map(k => patAdminHTML(PACKS[k], progress, subs.length > 1)).join('')}
        <div class="hist">최근 7일 학습일지: ${jr.length ? `${jr.length}건 · ${Math.floor(jmin / 60)}시간 ${jmin % 60}분 — ${jr.slice(-3).map(it => `${esc(it.d.slice(5))} ${esc(it.title)}`).join(' · ')}` : '없음'}</div>
        <div class="hist">오늘 공부 시간(본인 기기 측정): ${(() => { const r = pg.data.find(x => x.user_id === u.id && x.pid === 't:' + kstNow().day); return r ? `<b>${hms(studyMsOf(r.data, kstNow().day))}</b> (${live(r.data) ? '측정 중' : '일시정지'})` : '측정 기록 없음'; })()}</div>
        ${attGrid(u, at.error ? [] : at.data.filter(r => r.user_id === u.id))}
        <div class="hist">최근 모의고사: ${mocks.length ? mocks.map(m => `${esc(m.data.d)}${subs.length > 1 && PACKS[m.data.subj || 'fm2'] ? `(${esc(PACKS[m.data.subj || 'fm2'].name)})` : ''} <b>${esc(m.data.score)}점</b>`).join(' · ') : '없음'}</div>
        <div class="hist">배정: ${asg.length ? asg.map(a => `${esc(uName(a.unit))}${a.note ? `(${esc(a.note)})` : ''} <button class="btn ghost" data-act="unassign" data-id="${a.id}">해제</button>`).join(' ') : '없음'}</div>
        <div class="aform"><select id="as-u-${u.id}">${mainPk.units.map(x => `<option value="${x.k}">${x.name}</option>`).join('')}</select><input id="as-n-${u.id}" placeholder="메모 (예: 옵션 복제 보강)"><button class="btn primary" data-act="assign" data-uid="${u.id}">단원 배정</button></div>
      </div>`;
    }).join('') || '<div class="empty">사용자가 없습니다.</div>');
    renderDma();
  }

  /* 관리자: 사용자별 일일 모의고사 현황. 기록은 각 사용자의 progress 행 'dm:<과목>:<날짜>' (쓴 답의 내용은 보여 주지 않고 입력 여부만) */
  const DMA = { users: [], rec: {}, end: null, sel: null };
  const dmaAnswered = a => Object.values(a || {}).some(v => v !== '' && v != null);
  const dmaItems = r => (Array.isArray(r.items) ? r.items : []);
  function dmaLoad(users, rows) {
    DMA.users = users; DMA.rec = {};
    rows.forEach(r => { const m = /^dm:([^:]+):(\d{4}-\d{2}-\d{2})$/.exec(r.pid); if (m) (DMA.rec[`${r.user_id}|${m[1]}`] || (DMA.rec[`${r.user_id}|${m[1]}`] = {}))[m[2]] = r.data; });
  }
  function dmaCell(r) {
    if (!r) return { c: 'h0', t: '–' };
    if (r.sub) { const sc = +r.score || 0, mx = +r.max || 0; return { c: mx && sc / mx >= 0.6 ? 'h3' : 'h1', t: `${sc}/${mx}${+r.pend ? ` · 대기 ${+r.pend}` : ''}` }; }
    const items = dmaItems(r), n = items.filter(x => dmaAnswered((r.draft || {})[x.pid])).length;
    return n ? { c: 'h2', t: `풀이 중 ${n}/${items.length}` } : { c: 'h0', t: '열어 봄' };
  }
  function dmaDetail(u, pk, d, r) {
    const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const when = !r.sub ? '아직 제출 안 함' : +r.sub > 1e12 ? `제출 ${fmt.format(new Date(+r.sub))}` : '제출함';
    const un = k => (pk.units.find(x => x.k === k) || {}).name || '';
    const li = dmaItems(r).map(x => {
      const q = pk.byId[x.pid];
      const head = `<span class="tag unit">${esc(q ? un(q.unit) : '단원 없음')}</span><b>${esc(q ? q.title : '삭제된 문제')}</b>`;
      if (!r.sub) return `<li>${head}<span class="mut">${dmaAnswered((r.draft || {})[x.pid]) ? '답 입력함' : '입력 안 함'}</span></li>`;
      const res = Array.isArray(x.res) ? x.res : [], pts = +x.pts || 0, ok = +x.ok || 0, mx = +x.mx || 0;
      return `<li>${head}<span class="mut">${mx ? Math.round(pts * ok / mx * 10) / 10 : 0}/${pts}점 · ${ok}/${mx} 정답</span><div class="dma-qs">${res.map((v, i) => `<span class="dma-q ${v === true ? 'ok' : v === false ? 'no' : 'none'}">물음 ${i + 1} ${v === true ? '맞음' : v === false ? '틀림' : '직접 채점 대기'}</span>`).join('')}</div></li>`;
    }).join('');
    return `<div class="dma-d"><b>${esc(u.name || '이름 없음')} · ${md(d)} 문제</b> <small class="mut">${when}${r.sub ? ` · ${+r.score || 0}/${+r.max || 0}점` : ''}</small><ul>${li || '<li class="mut">문제 없음</li>'}</ul></div>`;
  }
  function renderDma() {
    const el = $('#adm-dm'); if (!el) return;
    const t = kstNow().day, end = DMA.end || t, days = [...Array(7)].map((_, i) => addDays(end, i - 6));
    const earlier = Object.values(DMA.rec).some(by => Object.keys(by).some(d => d < days[0]));
    const sl = [...el.querySelectorAll('.wrapx')].map(x => x.scrollLeft);
    el.innerHTML = ORDER.filter(k => PACKS[k].dailyMock).map(k => {
      const pk = PACKS[k], recOf = u => DMA.rec[`${u.id}|${k}`] || {};
      const users = DMA.users.filter(u => Object.keys(recOf(u)).length || (u.role !== 'admin' && (Array.isArray(u.subjects) && u.subjects.length ? u.subjects : ['fm2']).includes(k)));
      const sel = DMA.sel && DMA.sel.k === k ? DMA.sel : null, su = sel && users.find(u => u.id === sel.uid), sr = su && recOf(su)[sel.d];
      return `<div class="dma"><h3>일일 모의고사 현황 <small>${esc(pk.name)}</small></h3>
        <div class="wrapx"><table class="lt"><tr><th>사용자</th>${days.map(d => `<th>${d === t ? '오늘' : md(d)}</th>`).join('')}<th>제출</th><th>평균</th></tr>
        ${users.map(u => {
          const rec = recOf(u), done = Object.values(rec).filter(r => r.sub && +r.max);
          const avg = done.length ? Math.round(done.reduce((s, r) => s + (+r.score || 0) / +r.max, 0) / done.length * 100) + '%' : '–';
          return `<tr><td>${esc(u.name || '이름 없음')}</td>${days.map(d => { const r = rec[d], x = dmaCell(r); return `<td>${r ? `<button class="dma-c ${x.c}${sel && sel.uid === u.id && sel.d === d ? ' on' : ''}" data-act="dma-sel" data-k="${esc(k)}" data-uid="${esc(u.id)}" data-d="${d}">${esc(x.t)}</button>` : `<span class="mut">${x.t}</span>`}</td>`; }).join('')}<td>${done.length}회</td><td>${avg}</td></tr>`;
        }).join('') || `<tr><td colspan="${days.length + 3}" class="mut">대상 사용자가 없어요.</td></tr>`}</table></div>
        <div class="dma-nav"><button class="btn ghost" data-act="dma-nav" data-v="-7"${earlier ? '' : ' disabled'}>‹ 이전 7일</button><button class="btn ghost" data-act="dma-nav" data-v="7"${end >= t ? ' disabled' : ''}>다음 7일 ›</button><span class="mut">칸을 누르면 문제별 결과가 나와요 · 평균은 전체 제출 기준 · – 는 그날 문제를 열지 않음</span></div>
        ${sr ? dmaDetail(su, pk, sel.d, sr) : ''}</div>`;
    }).join('');
    el.querySelectorAll('.wrapx').forEach((x, i) => { x.scrollLeft = sl[i] == null ? x.scrollWidth : sl[i]; });   // 좁은 화면에서는 최근 날짜부터 보이게
  }

  // 관리자 화면에 보여 줄 과목: 일반 사용자는 지정된 과목, 관리자 본인은 실제로 푼 기록이 있는 과목
  function adminSubjects(u, progress) {
    const set = Array.isArray(u.subjects) && u.subjects.length ? u.subjects.filter(k => PACKS[k]) : [];
    if (u.role === 'admin') { const used = ORDER.filter(k => PACKS[k].calcList.some(d => progress[d.id])); return used.length ? used : [SUBJ]; }
    return set.length ? set : ['fm2'];
  }
  function adminSubjBlock(pk, progress, label) {
    const t = today(), acc = unitAcc(progress, pk), rc = roundCounts(progress, pk), L = pk.calcList;
    const all = Object.values(acc).reduce((s, x) => ({ sc: s.sc + x.sc, mx: s.mx + x.mx }), { sc: 0, mx: 0 });
    const weak = pk.units.filter(x => acc[x.k].mx).sort((a, b) => acc[a.k].sc / acc[a.k].mx - acc[b.k].sc / acc[b.k].mx)[0];
    const un = k => (pk.units.find(u => u.k === k) || {}).name || k;
    const cell = d => { const p = progress[d.id]; if (!p || !p.n) return '<td class="c h0">–</td>'; const h = p.hist[p.hist.length - 1]; const cls = h.sc === h.mx ? 'h3' : h.sc ? 'h2' : 'h1'; return `<td class="c ${cls}" title="${esc(d.title)} · ${esc(p.n)}회 · 다음 ${esc(p.due || '-')}">${esc(p.n)}회${p.due && p.due <= t ? '⏰' : ''}</td>`; };
    return `<div class="subj-b">${label ? `<div class="subj-h">${esc(pk.name)}</div>` : ''}
      <div class="hist">1/2/3회독 ${rc.join('/')} (총 ${L.length}) · 정답률 ${all.mx ? Math.round(all.sc / all.mx * 100) + '%' : '–'}${weak ? ` · 약한 단원 <b>${weak.name}</b>` : ''}</div>
      <div>${pk.units.map(x => { const a = acc[x.k], r = a.mx ? a.sc / a.mx : 0; return `<div class="urow"><span>${x.name}</span><div class="bar"><i style="width:${r * 100}%;background:${r >= 0.8 ? 'var(--ok)' : r >= 0.5 ? 'var(--warn)' : 'var(--bad)'}"></i></div><span class="pct">${a.mx ? Math.round(r * 100) + '%' : '–'}</span></div>`; }).join('')}</div>
      ${L.length <= 40 ? `<div class="wrapx"><table class="lt heat"><tr>${L.map((d, i) => `<th title="${esc(d.title)}">${un(d.unit).slice(0, 2)}${i + 1}</th>`).join('')}</tr><tr>${L.map(cell).join('')}</tr></table></div>` : ''}</div>`;
  }

  /* ───────── 공통 화면 ───────── */
  function refreshCounts() { $('#bankN').textContent = PROBS.length; dmBadge(); }
  function renderWho() {
    $('#who').innerHTML = sb ? `<b>${esc(me.name)}</b>${me.role === 'admin' ? '<span class="role">관리자</span>' : ''}<button class="btn ghost" data-act="logout">로그아웃</button>` : '<b>로컬 모드</b><span class="sub">config.js에 Supabase를 연결하면 계정별 저장</span>';
    $('#adminTab').hidden = $('#adminG').hidden = $('#admGrp').hidden = !(sb && me.role === 'admin');
  }
  function renderDday() {
    const e = S.settings[EKEY]; $('#examDate').value = e || '';
    if (!e) { $('#dday').textContent = '시험일 설정'; return; }
    const n = Math.round((new Date(e + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
    $('#dday').textContent = n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : `D+${-n}`;
  }
  let curTab = null;
  // 화면 상태: home(첫 화면) · menu(학습 메뉴) · tab(각 메뉴 본문). 기록(history)에 남겨 휴대폰 뒤로 가기로 되돌아간다.
  const HOME_TABS = ['journal', 'att', 'dm'];
  // 처음 화면·학습 메뉴로 돌아오면 이전에 누른 메뉴 버튼의 선택 표시와 포커스를 지운다
  function clearNavMark() { document.querySelectorAll('nav.tabs button.on').forEach(b => b.classList.remove('on')); if (document.activeElement && document.activeElement.closest('nav.tabs')) document.activeElement.blur(); }
  function setView(v, push) {
    const st = { v, tab: v === 'tab' ? curTab : null };
    if (v !== 'tab') clearNavMark();
    document.documentElement.dataset.view = v;
    document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i === (v === 'menu' ? 1 : 0)));
    $('#backLbl').textContent = HOME_TABS.includes(curTab) ? '처음으로' : '학습 메뉴';
    try { if (push) history.pushState(st, ''); else history.replaceState(st, ''); } catch (e) { }
    if (v !== 'tab') window.scrollTo({ top: 0 });
  }
  // 메뉴 본문끼리 옮겨 갈 때(개념 찾기 → 문제 등)는 기록을 쌓지 않고 바꿔치기 → 뒤로 가기는 늘 학습 메뉴나 처음 화면으로
  function openTab(tab) { const fromTab = document.documentElement.dataset.view === 'tab'; showTab(tab); setView('tab', !fromTab); }
  function goBack() {
    if (history.state && history.state.v && history.state.v !== 'home') { history.back(); return; }
    setView(document.documentElement.dataset.view === 'tab' && !HOME_TABS.includes(curTab) ? 'menu' : 'home');
  }
  window.addEventListener('popstate', e => {
    const st = e.state || { v: 'home' };
    if (st.v === 'tab' && st.tab) { showTab(st.tab); document.documentElement.dataset.view = 'tab'; $('#backLbl').textContent = HOME_TABS.includes(st.tab) ? '처음으로' : '학습 메뉴'; }
    else { clearNavMark(); document.documentElement.dataset.view = st.v; document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i === (st.v === 'menu' ? 1 : 0))); }
  });
  // 휴대폰: 첫 화면을 왼쪽으로 밀면 학습 메뉴, 오른쪽으로 밀면 첫 화면
  (function swipe() {
    const deck = $('#deck'); if (!deck) return;
    let x0 = null, y0 = 0;
    deck.addEventListener('touchstart', e => { if (e.target.closest && e.target.closest('#homeEss textarea')) { x0 = null; return; } const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    deck.addEventListener('touchend', e => {
      if (x0 == null) return;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      const v = document.documentElement.dataset.view;
      if (dx < 0 && v === 'home') setView('menu', true);
      else if (dx > 0 && v === 'menu') goBack();
    }, { passive: true });
  })();
  // PC 터치패드 두 손가락 가로 밀기: 첫 화면 ↔ 학습 메뉴를 화살표와 똑같이 넘기고, 메뉴 본문에서는 오른쪽으로 밀면 뒤로
  (function wheelSwipe() {
    let acc = 0, lock = 0, rt = null;
    const scrollsX = (el, dir) => { for (; el && el !== document.body; el = el.parentElement) { if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX) && (dir > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0)) return true; } return false; };
    window.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || e.ctrlKey) return;
      if (document.querySelector('.overlay.on') || (document.querySelector('#chatPanel') && !$('#chatPanel').hidden && e.target.closest('#chatPanel'))) return;
      if (scrollsX(e.target, e.deltaX)) return;   // 표 등 가로로 스크롤되는 곳은 그대로 스크롤
      clearTimeout(rt); rt = setTimeout(() => { acc = 0; }, 250);
      if (Date.now() < lock) return;
      acc += e.deltaX;
      if (Math.abs(acc) < 80) return;
      const v = document.documentElement.dataset.view, dir = acc > 0 ? 1 : -1; acc = 0; lock = Date.now() + 700;
      if (dir > 0 && v === 'home') setView('menu', true);
      else if (dir < 0 && (v === 'menu' || v === 'tab')) goBack();
    }, { passive: true });
  })();
  // 첫 화면 명언: 8초마다 서서히 바뀜
  (function quotes() {
    const Q = window.SWM_QUOTES || [], box = $('#quote'); if (!Q.length || !box) return;
    let i = Math.floor(Math.random() * Q.length);
    const show = () => { $('#qText').textContent = Q[i][0]; $('#qWho').textContent = Q[i][1]; };
    show();
    setInterval(() => {
      if (box.hidden || document.hidden || document.documentElement.dataset.view === 'tab') return;
      box.classList.add('fade');
      setTimeout(() => { let j; do { j = Math.floor(Math.random() * Q.length); } while (Q.length > 1 && j === i); i = j; show(); box.classList.remove('fade'); }, 600);
    }, 8000);
  })();
  function showTab(tab) {
    curTab = tab;
    document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + tab));
    if (['bank', 'aiw', 'aif'].includes(tab)) {   // 다른 탭에서 회독이 진행됐으면 문제은행·AI 출제 카드도 다음 회독 숫자로 교체
      Object.keys(cards).filter(k => /^(b|aw|af)-/.test(k)).forEach(k => { const c = cards[k]; if (selfPending(c)) return; if (c.recorded || (c.seed !== curSeed(c.pid) && !Object.keys(c.ans).length)) delete cards[k]; });
    }
    if (tab === 'bank') renderBank(); else if (tab === 'mock') renderMockHist(); else if (tab === 'admin') renderAdmin(); else if (tab === 'memo') renderMemo(); else if (tab === 'cx') renderCx(); else if (tab === 'plan') { PAT.list = null; renderPat(); } else if (tab === 'dm') { DM.sel = null; renderDaily(); } else if (tab === 'aiw') renderAiw(); else if (tab === 'aif') renderAif(); else if (tab === 'journal') { renderJournal(); renderTimer(); } else if (tab === 'att') { loadAtt().then(renderAtt); renderAtt(); }
    window.scrollTo({ top: 0 });
  }
  function applyPack() {
    document.querySelectorAll('[data-pk]').forEach(el => { if (PT[el.dataset.pk]) el.textContent = PT[el.dataset.pk]; });
    if (PT.cxPh && $('#cx-q')) $('#cx-q').placeholder = PT.cxPh;
    const mt = $('[data-tab="memo"]'); if (mt) mt.hidden = !MEMO.length;
    if ($('#homeDm')) $('#homeDm').hidden = $('[data-tab="dm"]').hidden = !PACK.dailyMock;   // 일일 모의고사: 현재 2차 재무관리만
    if ($('#aiSec')) $('#aiSec').hidden = !AIX;   // AI 출제는 과목 팩에 ai가 있을 때만(현재 2차 재무관리)
    document.documentElement.dataset.subj = SUBJ;
  }
  function renderAll() { qtReady = true; if (!S.timer) S.timer = {}; autoPauseCheck(); heartbeat(); renderWho(); renderDday(); renderHomeEss(); renderSum(); refreshCounts(); memoStats(); renderTimer(); presInit(); renderPresence(); chatInit(); admStudyLoad(); stFromUrl(); loadAtt().then(() => { if ($('#att-blocks')) renderAtt(); }); if (curTab) showTab(curTab); $('#menuSubj').textContent = PACK.name; }
  setInterval(() => { if (curTab === 'att') renderAtt(); }, 60000);
  setInterval(studyTick, 1000);   // 공부 시간 표시 1초마다 갱신 + 자동 일시정지 확인
  window.FM_TICK = studyTick;     // 테스트용(시각을 바꾼 뒤 즉시 한 번 실행)
  window.FM_CARDS = cards;        // 테스트용(정답 입력 확인)
  const leave = () => { bankDraftFlush(); heartbeat(true); clearTimeout(pushT); push(); };   // 떠나는 순간을 바로 저장
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); else { studyTick(); timerFromServer(kstNow().day); chatPoll(); syncResume(); } });
  window.addEventListener('pagehide', leave);
  // 앱으로 돌아오면 다른 기기에서 푼 기록을 받아 온다 (10초에 한 번까지, 그 안이면 간격이 지난 뒤 한 번)
  const PULL_GAP = 10000; let pullBusy = false, pullT = null;
  async function syncResume() {
    if (!sb || uid === 'local' || pullBusy || document.hidden) return;
    const left = lastPull + PULL_GAP - Date.now();
    if (left > 0) { clearTimeout(pullT); pullT = setTimeout(syncResume, left); return; }
    pullBusy = true; lastPull = Date.now();
    try { const changed = await pull(); if (dirty.size) push(); if (changed) syncRefresh(); }
    catch (e) { /* 연결이 안 되면 이 기기 기록으로 계속, 다음 복귀 때 다시 받음 */ }
    finally { pullBusy = false; }
  }
  // 받아 온 기록을 화면에 반영. 입력 중인 칸·진행 중인 모의고사는 건드리지 않는다.
  function syncRefresh() {
    renderSum(); refreshCounts(); memoStats();
    const a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !!a.closest('.panel');
    const draw = { bank: renderBank, aiw: renderAiw, aif: renderAif }[curTab];
    if (!draw || typing) return;
    Object.keys(cards).filter(k => /^(b|aw|af)-/.test(k)).forEach(k => { const c = cards[k]; if (!c.graded && !c.recorded && !Object.keys(c.ans).length && (c.seed !== curSeed(c.pid) || (peek(c.pid) || {}).dr)) delete cards[k]; });   // 아직 손대지 않은 카드만 다음 회독 숫자·이어 쓸 답으로
    const y = window.scrollY; draw(); window.scrollTo({ top: y });
  }
  window.addEventListener('focus', syncResume);
  window.addEventListener('online', syncResume);
  window.addEventListener('pageshow', e => { if (e.persisted) syncResume(); });
  let rsT = null;   // 시간표는 화면 폭에 따라 한 주/하루 보기가 바뀜
  window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (curTab === 'journal') renderJournal(); }, 200); });

  /* 테마: 자동 → 다크 → 라이트 */
  function applyTheme() { let t = null; try { t = localStorage.getItem('cpa-fm-theme'); } catch (e) { } if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; $('#themeBtn').textContent = { dark: '테마: 다크', light: '테마: 라이트' }[t] || '테마: 자동'; }
  function cycleTheme() { let t = null; try { t = localStorage.getItem('cpa-fm-theme'); } catch (e) { } const n = !t ? 'dark' : t === 'dark' ? 'light' : null; try { n ? localStorage.setItem('cpa-fm-theme', n) : localStorage.removeItem('cpa-fm-theme'); } catch (e) { } applyTheme(); }

  /* ───────── 이벤트 ───────── */
  document.addEventListener('click', async e => {
    const more = $('#tbMore');   // 휴대폰 설정 메뉴: 바깥을 누르면 닫힘
    if (more && more.classList.contains('open') && !e.target.closest('#tbMore,[data-act="tb-menu"]')) { more.classList.remove('open'); $('[data-act="tb-menu"]').setAttribute('aria-expanded', 'false'); }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, c = b.dataset.k && cards[b.dataset.k];
    if (act === 'tab') openTab(b.dataset.tab);
    else if (act === 'pg') setView(b.dataset.pg === '1' ? 'menu' : 'home', b.dataset.pg === '1');
    else if (act === 'back') goBack();
    else if (act === 'pw-mode') setPwMode(!pwMode);
    else if (act === 'mock-review') {
      const box = $(`#rv-${CSS.escape(b.dataset.id)}-${b.dataset.j}`); if (!box) return;
      if (box.innerHTML) { box.innerHTML = ''; b.textContent = '문제·해설 보기'; return; }
      const m = S.mocks.find(x => x.id === b.dataset.id), x = m && m.items[+b.dataset.j]; if (!x || !byId[x.pid]) return;
      const c = makeCard(`r-${m.id}-${b.dataset.j}`, x.pid, 'review', x.seed == null ? null : x.seed);
      c.ans = Object.assign({}, x.ans || {}); (x.res || []).forEach((r, i) => { if (r != null) c.res[i] = r; }); c.graded = true; c.shown = true;
      box.innerHTML = cardHTML(c, +b.dataset.j + 1); restore(c); b.textContent = '접기';
    }
    else if (act === 'tb-menu') { const o = $('#tbMore').classList.toggle('open'); b.setAttribute('aria-expanded', String(o)); if (o) studyRefresh(); }
    else if (act === 'theme') cycleTheme();
    else if (act === 'grade' && c) grade(c);
    else if (act === 'qt-start' && c) qtStart(c);
    else if (act === 'qt-stop' && c) { delete QT[c.key]; qtSave(); qtPaint(c.key); }
    else if (act === 'demo-reset') demoReset();
    else if (act === 'wt') wtToggle(b.dataset.pid, b.dataset.ai, b.dataset.r);
    else if (act === 'pat-cx') { CX_S.q = cxBase(CONCEPTS[+b.dataset.i]); openTab('cx'); $('#cx-q').value = CX_S.q; renderCx(); }
    else if (act === 'showsol' && c) { revealSol(c, !c.shown); b.textContent = c.shown ? '해설 숨기기' : '해설 보기'; }
    else if (act === 'fold' && c) setFold(c.key, !OPEN.has(c.key));
    else if (act === 'fold-close' && c) {
      setFold(c.key, false);
      const el = $(`#cd-${c.key}`);
      if (el.getBoundingClientRect().top < 60) el.scrollIntoView({ block: 'start' });
    }
    else if (act === 'fold-next' && c) {
      setFold(c.key, false);
      let n = $(`#cd-${c.key}`).nextElementSibling;
      while (n && !n.classList.contains('card')) n = n.nextElementSibling;
      if (n) { setFold(n.id.slice(3), true); n.scrollIntoView({ block: 'start' }); }
    }
    else if (act === 'reroll' && c) {
      const fresh = makeCard(c.key, c.pid, c.mode, rand32()); fresh.custom = true;
      if (foldable(fresh)) {   // 다른 기기·다른 화면도 같은 숫자로
        const p = prog(c.pid); p.rr = { n: p.n || 0, s: fresh.seed }; delete p.dr; bdK.delete(c.pid);
        Object.keys(cards).forEach(k => { const o = cards[k]; if (o !== fresh && o.pid === c.pid && foldable(o) && !o.recorded && !o.graded) delete cards[k]; });
        touch(c.pid);
      }
      $(`#cd-${c.key}`).outerHTML = cardHTML(fresh, +($(`#cd-${c.key} .num`).textContent.replace(/\D/g, '')) || 0);
    }
    else if (act === 'opt' && c) {
      if (c.mode === 'review' || c.qtOver || (c.mode === 'mock' && (c.daily ? dmLocked(c) : MOCK.submitted))) return;   // 제출한 모의고사·회차 다시 보기는 고칠 수 없음
      const qi = +b.dataset.qi, j = +b.dataset.j, off = c.ans[qi] === j;   // 같은 선지를 다시 누르면 선택 취소
      if (off) delete c.ans[qi]; else c.ans[qi] = j;
      b.parentElement.querySelectorAll('.opt').forEach(o => o.classList.toggle('on', !off && o === b));
      ungrade(c, qi); if (c.daily) dmDraft(c); else bankDraft(c);
    }
    else if (act === 'self' && c) {
      if (c.mode === 'review') return;
      c.res[+b.dataset.qi] = b.dataset.v === '1';
      b.parentElement.querySelectorAll('.btn').forEach(o => o.classList.toggle('on', o === b));
      showResult(c, +b.dataset.qi); maybeRecord(c);
    }
    else if (act === 'f') { F[b.dataset.f] = b.dataset.v; renderBank(); }
    else if (act === 'st-keep') { stKeep(); $('#stAsk').hidden = true; }
    else if (act === 'st-now') { stStop(false); $('#stAsk').hidden = true; }
    else if (act === 'st-back') { stStop(true); $('#stAsk').hidden = true; }
    else if (act === 'st-close') $('#stAsk').hidden = true;
    else if (act === 'adm-st') { ADM.open = !ADM.open; admStudyRender(); }
    else if (act === 'ipe-import') { const f = $('#ipeFile'); if (f) { f.value = ''; f.click(); } }
    else if (act === 'af') { AF[b.dataset.f] = b.dataset.v; renderAiw(); }
    // 약술 암기
    else if (act === 'mf') { MF[b.dataset.f] = b.dataset.v; renderMemo(); }
    else if (act === 'memo-shuffle') { MF.order = MEMO.map(m => m.key).sort(() => Math.random() - 0.5); renderMemo(); }
    else if (act === 'memo-inorder') { MF.order = null; renderMemo(); }
    else if (act === 'memo-openall') { const all = MEMO.every(m => MF.open.has(m.key)); MEMO.forEach(m => all ? MF.open.delete(m.key) : MF.open.add(m.key)); renderMemo(); }
    else if (act === 'chat-toggle') { CH.open = !CH.open; if (CH.open) chatPoll(); chatRender(); if (CH.open && CH.room) $('#chatIn').focus(); }
    else if (act === 'chat-close') { CH.open = false; chatRender(); }
    else if (act === 'chat-back') { CH.room = null; chatRender(); }
    else if (act === 'push-on') wpOn();
    else if (act === 'push-off') { await wpOff(); chatRender(); }
    else if (act === 'chat-room') { CH.room = b.dataset.room; chatRender(); $('#chatIn').focus(); }
    else if (act === 'cx-pick') { CX_S.q = cxBase(CONCEPTS[+b.dataset.i]); $('#cx-q').value = CX_S.q; renderCx(); }
    else if (act === 'cx-prob' || act === 'pat-go') goProb(b.dataset.id);
    else if (act === 'pat-list') patList(b.dataset.k);
    else if (act === 'de-open') { DE.open = !DE.open; renderHomeEss(); }
    else if (act === 'de-check') { const t = $('#deAns'); DE.ans = t ? t.value : ''; DE.checked = true; renderHomeEss(); }
    else if (act === 'de-grade') deGrade(b.dataset.v === '1');
    else if (act === 'memo-open') { const k = b.dataset.mk; MF.open.has(k) ? MF.open.delete(k) : MF.open.add(k); memoRefreshCard(k); }
    else if (act === 'memo-set') {
      const k = b.dataset.mk, o = S.memo.c[k] || {};
      S.memo.c[k] = { s: b.dataset.v, n: (o.n || 0) + 1, last: today() }; MF.open.add(k); touch('_memo'); memoRefreshCard(k);
    }
    // 출석 인증
    else if (act === 'att-open') camOpen(+b.dataset.b);
    else if (act === 'cam-shoot') camShoot();
    else if (act === 'cam-retake') { camBlob = null; camUI(false); camMsg(''); }
    else if (act === 'cam-save') camSave();
    else if (act === 'cam-close') { camStop(); $('#camOv').classList.remove('on'); }
    else if (act === 'att-photo') showAttPhoto(b.dataset.path, b.dataset.label);
    else if (act === 'photo-close') $('#photoOv').classList.remove('on');
    else if (act === 'st-toggle') timerToggle();
    // 학습일지
    else if (act === 'jn-week') { JN.week = +b.dataset.v ? addDays(JN.week, +b.dataset.v) : mondayOf(today()); JN.sel = +b.dataset.v ? JN.week : today(); JN.edit = null; renderJournal(); }
    else if (act === 'jn-sel') { if (b.dataset.d < START_DAY) return; JN.sel = b.dataset.d; JN.edit = null; renderJournal(); }
    else if (act === 'jn-new') jnOpen(JN.sel, null);
    else if (act === 'jn-slot') {
      if (b.dataset.d < START_DAY) return;
      const y = e.clientY - b.getBoundingClientRect().top, m = H0 * 60 + Math.floor(y / HPX * 2) * 30;
      jnOpen(b.dataset.d, null, Math.min(m, (H1 - 1) * 60));
    }
    else if (act === 'jn-edit') { const it = jItems(b.dataset.d).find(x => x.id === b.dataset.id); if (it) jnOpen(b.dataset.d, it); }
    else if (act === 'jn-cancel') { JN.edit = null; renderJournal(); }
    else if (act === 'jn-del') {
      const ed = JN.edit; if (!ed || !confirm('이 기록을 삭제할까요?')) return;
      S.journal[ed.orig].items = S.journal[ed.orig].items.filter(x => x.id !== ed.id); touch('j:' + ed.orig); JN.edit = null; renderJournal();
    }
    else if (act === 'mock-start') mockStart();
    else if (act === 'dm-submit') dmSubmit();
    else if (act === 'dm-sel') { dmDraftFlush(); DM.sel = b.dataset.d; renderDaily(); window.scrollTo({ top: 0 }); }
    else if (act === 'dm-today') { dmDraftFlush(); DM.sel = null; renderDaily(); window.scrollTo({ top: 0 }); }
    else if (act === 'mock-submit') mockSubmit(false);
    else if (act === 'logout') {
      bankDraftFlush(); clearTimeout(pushT); await push();
      if (CH.push === 'on') await wpOff();   // 공용 기기에서 다른 사람이 내 알림을 받지 않게
      if (!dirty.size) { try { localStorage.removeItem(lsKey()); } catch (e) { } }   // 공용 기기에 기록을 남기지 않음
      await sb.auth.signOut(); location.reload();
    }
    else if (act === 'admin-refresh') renderAdmin();
    else if (act === 'dma-sel') {
      const { k, uid: id, d } = b.dataset, s = DMA.sel;
      DMA.sel = s && s.k === k && s.uid === id && s.d === d ? null : { k, uid: id, d }; renderDma();
    }
    else if (act === 'dma-nav') {
      const t = kstNow().day, e = addDays(DMA.end || t, +b.dataset.v);
      DMA.end = e >= t ? null : e; DMA.sel = null; $('#adm-dm').innerHTML = ''; renderDma();
    }
    else if (act === 'subj-save') {
      const id = b.dataset.uid, subjects = [...document.querySelectorAll(`.sj-${CSS.escape(id)}:checked`)].map(x => x.value);
      if (!subjects.length) { alert('과목을 하나 이상 고르세요.'); return; }
      const { error } = await sb.from('profiles').update({ subjects }).eq('id', id);
      if (error) alert('과목 저장 실패: ' + error.message + (/subjects/.test(error.message) ? ' (schema.sql을 다시 실행해야 합니다)' : '')); renderAdmin();
    }
    else if (act === 'assign') {
      const id = b.dataset.uid;
      const { error } = await sb.from('assignments').insert({ user_id: id, unit: $(`#as-u-${id}`).value, note: $(`#as-n-${id}`).value.trim(), created_by: uid });
      if (error) alert('배정 실패: ' + error.message); renderAdmin();
    }
    else if (act === 'unassign') {
      const { error } = await sb.from('assignments').update({ active: false }).eq('id', b.dataset.id);
      if (error) alert('해제 실패: ' + error.message); renderAdmin();
    }
  });
  document.addEventListener('input', e => {
    const el = e.target; const c = el.dataset && el.dataset.k && cards[el.dataset.k];
    if (c && !dmLocked(c) && !c.qtOver) { c.ans[+el.dataset.qi] = el.value; if (el.classList.contains('my1')) ungrade(c, +el.dataset.qi); if (c.daily) dmDraft(c); else bankDraft(c); }
    if (el.dataset && el.dataset.mk) MF.typed[el.dataset.mk] = el.value;
    if (el.id === 'deAns') DE.ans = el.value;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) dmDraftFlush(); else if (DE.day && DE.day !== kstNow().day) renderHomeEss(); });
  setInterval(() => { if (DE.day && DE.day !== kstNow().day) renderHomeEss(); }, 30000);   // 켜 둔 채 날짜가 바뀌면 오늘 것으로
  document.addEventListener('change', e => { if (e.target.id === 'ipeFile' && e.target.files && e.target.files[0]) ipeImport(e.target.files[0]); });
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'chatForm') return;
    e.preventDefault(); const inp = $('#chatIn'), v = inp.value; inp.value = '';
    inp.focus({ preventScroll: true });   // 휴대폰: 보내기 버튼을 눌러도 키패드가 닫히지 않게 입력창에 포커스를 돌려 둠
    if ((await chatSend(v)) === false) inp.value = v;
  });
  document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('#chatForm button')) e.preventDefault(); });   // 보내기 버튼이 입력창 포커스를 빼앗지 않게
  document.addEventListener('keydown', e => {   // Enter 보내기, Shift+Enter 줄바꿈
    if (e.target.id === 'chatIn' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chatForm').requestSubmit(); }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'cx-form') return;
    e.preventDefault(); CX_S.q = $('#cx-q').value; renderCx();
  });
  let cxT = null;
  document.addEventListener('input', e => {
    if (e.target.id !== 'cx-q') return;
    clearTimeout(cxT); cxT = setTimeout(() => { CX_S.q = e.target.value; renderCx(); }, 300);
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'jn-form') return;
    e.preventDefault();
    const f = e.target, ed = JN.edit, v = k => f.elements[k].value.trim();
    if (toMin(v('e')) <= toMin(v('s'))) { $('#jf-err').textContent = '종료 시각은 시작 시각보다 늦어야 합니다.'; return; }
    if (v('d') < START_DAY) { $('#jf-err').textContent = `학습일지는 ${START_DAY}부터 기록할 수 있습니다.`; return; }
    const it = { id: ed.id || String(Date.now()), s: v('s'), e: v('e'), unit: v('unit'), title: v('title'), note: f.elements.note.value.trim() };
    if (ed.id && ed.orig !== v('d')) { S.journal[ed.orig].items = S.journal[ed.orig].items.filter(x => x.id !== ed.id); touch('j:' + ed.orig); }
    const day = S.journal[v('d')] || (S.journal[v('d')] = { items: [] });
    day.items = day.items.filter(x => x.id !== it.id).concat(it);
    touch('j:' + v('d'));
    JN.sel = v('d'); JN.week = mondayOf(v('d')); JN.edit = null; renderJournal();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList.contains('my1')) return;
    const c = cards[e.target.dataset.k]; if (c && c.mode !== 'mock') grade(c);
  });
  $('#examDate').addEventListener('change', e => { S.settings[EKEY] = e.target.value; touch('_settings'); renderDday(); });

  /* ───────── 시작 ───────── */
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function startUser(user) {
    uid = user.id; me = { name: (user.email || '').split('@')[0], role: 'member' };
    loadLocal(); $('#loginOv').classList.remove('on');
    lastPull = Date.now();
    try { await pull(); badge('ok'); } catch (err) { badge('err', err.message); }
    if (dirty.size) { badge('busy'); push(); }
    const al = mySubjects();
    if (!al.includes(SUBJ)) { await push(); setSubj(al[0]); return; }
    renderSubjSel(al);
    renderAll();
  }
  // 이 계정이 볼 수 있는 과목: 관리자는 전부, 일반 사용자는 관리자가 정해 준 과목 (정해지지 않았으면 2차 재무관리)
  function mySubjects() {
    if (me.role === 'admin') return ORDER.slice();
    const s = (Array.isArray(me.subjects) ? me.subjects : []).filter(k => PACKS[k]);
    return s.length ? s : ['fm2'];
  }
  function setSubj(k) {
    try { localStorage.setItem(SUBJ_KEY, k); } catch (e) { }
    location.replace(location.pathname + '?subj=' + encodeURIComponent(k) + (DEMO ? '&demo' : ''));   // 체험 모드는 과목을 바꿔도 유지
  }
  function renderSubjSel(al) {
    const el = $('#subjSel'); if (!el) return;
    el.hidden = al.length < 2;
    el.innerHTML = al.map(k => `<option value="${k}"${k === SUBJ ? ' selected' : ''}>${esc(PACKS[k].name)}</option>`).join('');
  }
  // 로그인 화면의 '비밀번호 변경': 현재 비밀번호로 본인 확인 → 새 비밀번호로 변경 → 다른 기기의 로그인은 모두 끊고 이 기기로 로그인
  let pwMode = false;
  function setPwMode(on) {
    pwMode = on; $('#lgNew').hidden = !on; $('#lgPw1').required = $('#lgPw2').required = on;
    $('#lgPw').placeholder = on ? '현재 비밀번호' : '비밀번호';
    $('#lgBtn').textContent = on ? '비밀번호 변경 후 로그인' : '로그인';
    $('#lgMode').textContent = on ? '취소하고 로그인으로' : '비밀번호 변경';
    $('#lgErr').textContent = ''; $('#lgErr').classList.remove('okm');
  }
  const lgMsg = (t, good) => { $('#lgErr').textContent = t; $('#lgErr').classList.toggle('okm', !!good); };
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); lgMsg('');
    const email = $('#lgEmail').value.trim(), pw = $('#lgPw').value;
    if (pwMode) {
      const p1 = $('#lgPw1').value, p2 = $('#lgPw2').value;
      if (p1.length < 8) return lgMsg('새 비밀번호는 8자 이상으로 정해 주세요.');
      if (p1 !== p2) return lgMsg('새 비밀번호와 확인이 서로 다릅니다.');
      if (p1 === pw) return lgMsg('새 비밀번호가 현재 비밀번호와 같습니다.');
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) return lgMsg('로그인 실패: ' + (error.message === 'Invalid login credentials' ? `이메일 또는 ${pwMode ? '현재 ' : ''}비밀번호가 맞지 않습니다` : error.message));
    if (pwMode) {
      const r = await sb.auth.updateUser({ password: $('#lgPw1').value });
      if (r.error) {
        await sb.auth.signOut();
        const m = r.error.message || '';
        return lgMsg('비밀번호를 바꾸지 못했어요: ' + (/different/i.test(m) ? '새 비밀번호가 이전 비밀번호와 같습니다' : /at least|weak|short/i.test(m) ? '새 비밀번호가 너무 짧거나 쉽습니다' : m));
      }
      try { await sb.auth.signOut({ scope: 'others' }); } catch (x) { }   // 다른 기기에 남아 있던 로그인 끊기
      $('#lgPw').value = $('#lgPw1').value = $('#lgPw2').value = '';
      setPwMode(false); lgMsg('비밀번호를 바꿨어요. 다른 기기는 새 비밀번호로 다시 로그인해야 합니다.', true);
    }
    startUser(data.user);
  });
  window.addEventListener('beforeunload', () => { if (dirty.size) push(); });

  $('#subjSel') && $('#subjSel').addEventListener('change', e => setSubj(e.target.value));
  (async function boot() {
    applyTheme(); applyPack(); setView('home');
    // 개발 PC(localhost)에서 주소 뒤에 ?local을 붙이면 서버 없이 로컬 모드로 연다 (테스트용)
    const forceLocal = DEMO || (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && new URLSearchParams(location.search).has('local'));
    if (CFG.supabaseUrl && CFG.supabaseAnonKey && !forceLocal) {
      try { if (!window.supabase) await loadScript(SB_SRC); sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey); }
      catch (err) { sb = null; sbFail = true; }
    }
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session) await startUser(data.session.user);
      else { $('#loginOv').classList.add('on'); badge('busy'); }
    } else if (DEMO) { uid = 'demo'; loadLocal(); if (S.settings.demo !== 2) demoSeed(); renderSubjSel(ORDER); renderAll(); badge('demo'); openTab('plan'); }
    else { uid = 'local'; loadLocal(); renderSubjSel(ORDER); renderAll(); badge(sbFail ? 'nolib' : 'local', sbFail ? 'Supabase 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.' : ''); }
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  })();
})();
