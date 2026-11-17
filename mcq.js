/* 객관식·O/X 문제 만들기 도우미 (CPA 1차·네트워크관리사 등 과목 팩이 공통으로 사용)
 * - calc: 숫자가 회독마다 바뀌는 계산형 5지선다. 정답과 '자주 하는 실수' 값으로 보기를 만들고 오름차순으로 늘어놓는다.
 * - fixed: 문장형 객관식. 회독마다 보기 순서만 섞인다.
 * - ox: O/X 문제.
 * - card: 암기 카드(약술형과 같은 방식으로 암기 페이지에 쓰임).
 */
(function () {
  'use strict';
  const { fmt } = window.FM_UTIL;
  const NO = ['①', '②', '③', '④', '⑤'];
  const lab = (arr) => arr.map((t, i) => `${NO[i]} ${t}`);

  // 문자열 → 0~1 사이 고정 난수 (같은 문제·같은 숫자면 같은 값)
  const h01 = str => { let h = 0x811c9dc5; for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };

  // 정답 + 오답 후보 → 서로 충분히 다른 5개 값(오름차순). 정답이 몇 번째에 올지는 pos(0~4)로 정한다.
  // 오답 후보 중 정답보다 작은 것·큰 것이 모자라면 정답에서 6%씩 떨어진 값으로 채운다.
  function choices(ans, wrong, dp, pos = 2) {
    const r = v => Math.round(v * 10 ** dp) / 10 ** dp, A = r(ans);
    const far = (a, b) => Math.abs(a - b) > Math.max(10 ** -dp * 1.5, Math.abs(ans) * 0.004);
    const step = Math.max(Math.abs(ans) * 0.06, 10 ** -dp * 5);
    const pick = (side, n) => {
      const got = [];
      const ok = v => Number.isFinite(v) && (side < 0 ? v < A : v > A) && [A, ...got].every(x => far(x, v));
      wrong.map(r).forEach(v => { if (got.length < n && ok(v)) got.push(v); });
      for (let k = 1; got.length < n && k < 60; k++) { const v = r(ans + side * step * k); if (ok(v)) got.push(v); }
      return got;
    };
    const lo = pick(-1, pos), hi = pick(1, 4 - pos);
    const vals = [...lo, A, ...hi].sort((a, b) => a - b);
    return { vals, ans: vals.indexOf(A) };
  }

  function calc(s) {
    const dp = s.dp == null ? 0 : s.dp, show = s.show || (v => fmt(v, dp) + (s.u ? s.u : ''));
    return {
      id: s.id, unit: s.unit, pts: s.pts, title: s.title, trend: s.trend, mcq: true,
      p: s.p, vary: s.vary,
      calc(p) { const c = s.calc(p); c._ch = choices(s.val(c, p), s.wrong(p, c), dp, Math.floor(h01(s.id + JSON.stringify(p)) * 5)); return c; },
      body: (p, c) => s.stem(p, c),
      qs: [{ type: 'choice', mc: true, nolab: true, text: s.q || '', optsf: (p, c) => lab(c._ch.vals.map(show)), ans: c => c._ch.ans, sol: s.sol }],
    };
  }

  // 문장형: opts[0]이 정답이 아니어도 됨 (ans로 지정). 회독마다 보기 순서를 섞는다.
  // 1회독(기본 순서)에서도 정답이 늘 ①이 되지 않도록 문제마다 고정된 순서로 섞는다
  function shuffle(arr, seed) { const o = arr.slice(); let x = Math.floor(seed * 2147483647) || 1; for (let i = o.length - 1; i > 0; i--) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o; }
  function fixed(s) {
    const n = s.opts.length, id = [...Array(n).keys()];
    return {
      id: s.id, unit: s.unit, pts: s.pts, title: s.title, trend: s.trend, mcq: true, fixed: true,
      p: { o: shuffle(id, h01(s.id)) }, vary(R) { const o = id.slice(); for (let i = n - 1; i > 0; i--) { const j = Math.floor(R.u() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return { o }; },
      calc: p => ({ o: p.o }),
      body: () => s.stem,
      qs: [{ type: 'choice', mc: true, nolab: true, text: '', optsf: p => lab(p.o.map(i => s.opts[i])), ans: (c, p) => p.o.indexOf(s.ans), sol: () => s.sol }],
    };
  }

  function ox(s) {
    return {
      id: s.id, unit: s.unit, pts: s.pts, title: 'O/X · ' + s.title, trend: s.trend || 'O/X 확인', mcq: true, fixed: true, ox: true,
      p: {}, vary: () => ({}), calc: () => ({}),
      body: () => `<p>${s.stmt}</p>`,
      qs: [{ type: 'choice', nolab: true, text: '옳으면 O, 틀리면 X', opts: ['O', 'X'], ans: () => (s.ok ? 0 : 1), sol: () => s.sol }],
    };
  }

  function card(s) {
    return {
      id: s.id, unit: s.unit, pts: s.pts || 2, essay: true, title: s.q.length > 34 ? s.q.slice(0, 34) + '…' : s.q, trend: s.src || '암기 카드',
      p: {}, vary: () => ({}), calc: () => ({}), body: () => '',
      qs: [{ lab: '암기', type: 'essay', text: s.q, model: s.a, kw: s.kw }],
    };
  }

  window.SWM_MCQ = { calc, fixed, ox, card, choices, h01 };
})();
