/* CPA 2차 재무관리 변형 문제 엔진
 * - 문제마다 기본 숫자(p)와 숫자 생성기(vary)를 갖는다. 1회독은 기본 숫자, 2회독부터는 회독마다 새 숫자로 출제된다.
 * - calc(p)가 모든 정답을 계산하므로 숫자가 바뀌어도 자동 채점된다.
 * - 금융감독원 공개 기출(2023~2026)의 출제 경향(단원 비중·물음 구성)을 참고해 새로 만든 문제이며, 기출 원문을 옮기지 않았다.
 */
(function () {
  'use strict';
  const pvif = (r, n) => Math.pow(1 + r, -n);
  const pvifa = (r, n) => (1 - Math.pow(1 + r, -n)) / r;
  const r4 = x => Math.round(x * 1e4) / 1e4;
  const fmt = (x, dp = 0) => Number(x).toLocaleString('ko-KR', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const pc = x => `${+(x * 100).toFixed(2)}%`;           // 0.125 → "12.5%"
  const num = x => fmt(+x.toFixed(4), Math.min(4, (String(+x.toFixed(4)).split('.')[1] || '').length));
  const tbl = (head, rows) => `<table class="dt"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const ul = items => `<ul class="facts">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  // 근을 구간 [a,b]에서 이분법으로 찾는다 (f(a)·f(b) < 0 가정)
  function root(f, a, b) {
    let fa = f(a);
    for (let i = 0; i < 200; i++) {
      const m = (a + b) / 2, fm = f(m);
      if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }

  const UNITS = [
    { k: 'cb', name: '자본예산', desc: 'NPV·IRR·MIRR·교체·회수기간' },
    { k: 'pf', name: '포트폴리오·CAPM·APT', desc: '효용·CML·SML·APT' },
    { k: 'bd', name: '채권', desc: '기간구조·듀레이션·면역' },
    { k: 'dv', name: '파생상품', desc: '이항모형·선물·차익거래' },
    { k: 'cf', name: '기업재무', desc: 'MM·합병·배당/자사주' },
  ];

  const P = [];

  /* ───────── 자본예산 ───────── */
  P.push({
    id: 'cb-replace', unit: 'cb', pts: 20, real: true, title: '설비 교체 의사결정 종합: 증분현금흐름·NPV·최대 구입가격',
    trend: '2018 문1·2021 문1·2025 문1 (교체 결정, 증분현금흐름, 최대 지급가격)',
    p: { oldCost: 9000, oldLife: 6, oldAge: 3, sell0: 4200, sellN: 600, price: 12000, inst: 600, salv: 1200, sellNew: 2000, dRev: 2500, dCost: 800, nwcR: 0.2, survey: 300, debtR: 0.06, t: 0.25, r: 0.1 },
    vary(R) {
      for (;;) {
        const oldLife = R.pick([5, 6, 8]), oldCost = R.int(5000, 12000, 500), price = R.int(8000, 16000, 500), inst = R.int(200, 1000, 100);
        const bv = oldCost * 3 / oldLife, salv = Math.round((price + inst) * R.f(0.05, 0.15, 0.01) / 100) * 100;
        const p = { oldCost, oldLife, oldAge: oldLife - 3, sell0: Math.round(bv * R.f(0.7, 1.2, 0.05) / 100) * 100, sellN: R.int(0, 1000, 100), price, inst, salv,
          sellNew: Math.round(salv * R.f(0.8, 2, 0.1) / 100) * 100, dRev: R.int(1500, 4000, 100), dCost: R.int(300, 1500, 100), nwcR: R.pick([0.1, 0.15, 0.2]),
          survey: R.int(100, 500, 50), debtR: R.f(0.04, 0.08, 0.005), t: R.pick([0.2, 0.22, 0.25]), r: R.pick([0.08, 0.1, 0.12]) };
        const c = this.calc(p);
        if (Math.abs(c.npv) > 50 && c.Xmax > 0) return p;
      }
    },
    calc(p) {
      const n = p.oldLife - p.oldAge, base = p.price + p.inst;
      const oldBV = p.oldCost * n / p.oldLife, oldDep = p.oldCost / p.oldLife, newDep = (base - p.salv) / n, nwc = p.nwcR * p.dRev;
      const sell0AT = p.sell0 - p.t * (p.sell0 - oldBV), cf0 = -base + sell0AT - nwc;
      const ocf = (p.dRev + p.dCost) * (1 - p.t) + p.t * (newDep - oldDep);
      const newAT = p.sellNew - p.t * (p.sellNew - p.salv), oldAT = p.sellN - p.t * p.sellN, term = newAT - oldAT + nwc;
      const A = r4(pvifa(p.r, n)), F = r4(pvif(p.r, n)), npv = cf0 + ocf * A + term * F;
      const slope = -1 + A * p.t / n, Xmax = p.price - npv / slope;   // NPV는 구입가격에 대해 선형
      return { n, base, oldBV, oldDep, newDep, nwc, sell0AT, cf0, ocf, newAT, oldAT, term, A, F, npv, slope, Xmax };
    },
    body: (p, c) => `<p>㈜태성정밀은 생산라인의 노후 설비를 신형 설비로 교체할지 검토하고 있다. 금액 단위는 만원이다.</p>` + ul([
      `구형 설비는 ${p.oldAge}년 전 ${fmt(p.oldCost)}만원에 취득했으며, 내용연수 ${p.oldLife}년·잔존가치 0으로 정액법 상각 중이다. 지금 처분하면 ${fmt(p.sell0)}만원을 받을 수 있고, 계속 사용하면 ${c.n}년 후 ${fmt(p.sellN)}만원에 처분할 수 있다.`,
      `신형 설비의 구입가격은 ${fmt(p.price)}만원이며, 설치·시운전비 ${fmt(p.inst)}만원이 추가로 들고 이는 취득원가에 포함된다. 신형 설비는 내용연수 ${c.n}년, 잔존가치 ${fmt(p.salv)}만원으로 정액법 상각하며, ${c.n}년 후 ${fmt(p.sellNew)}만원에 처분할 수 있다.`,
      `신형 설비를 쓰면 매년 말 매출액이 ${fmt(p.dRev)}만원 늘고, 감가상각비를 제외한 현금영업비용이 ${fmt(p.dCost)}만원 줄어든다.`,
      `매출 증가에 대응하여 매출액 증가분의 ${pc(p.nwcR)}에 해당하는 순운전자본이 현재 시점에 필요하며, 사업 종료 시점에 전액 회수된다.`,
      `㈜태성정밀은 작년에 이 교체안의 타당성 조사비로 ${fmt(p.survey)}만원을 지출하였다.`,
      `신형 설비 구입자금 중 일부는 연 ${pc(p.debtR)}의 은행 차입으로 조달할 예정이다.`,
      `법인세율은 ${pc(p.t)}이며, 자산 처분손익에 대한 법인세 효과는 처분 시점에 발생한다. 이 교체안의 자본비용은 ${pc(p.r)}이다.`,
    ]) + tbl(['구분', ...[...Array(c.n)].map((_, i) => `${i + 1}년`)], [[`PVIF(${pc(p.r)}, n)`, ...[...Array(c.n)].map((_, i) => r4(pvif(p.r, i + 1)).toFixed(4))], [`PVIFA(${pc(p.r)}, n)`, ...[...Array(c.n)].map((_, i) => r4(pvifa(p.r, i + 1)).toFixed(4))]])
      + `<p>※ (물음 5)는 (물음 4)와 독립적이다.</p>`,
    qs: [
      { lab: '물음 1', type: 'num', text: '교체안의 현재 시점(t=0) 증분현금흐름을 구하시오. (유출은 음수)', unit: '만원', dp: 0, ans: c => c.cf0,
        sol: (p, c) => `신형 취득원가 −(${fmt(p.price)} + ${fmt(p.inst)}) = −${fmt(c.base)}<br>구형 장부가 ${fmt(p.oldCost)}×${c.n}/${p.oldLife} = ${fmt(c.oldBV, 2)} → 처분 세후현금 ${fmt(p.sell0)} − ${p.t}×(${fmt(p.sell0)} − ${fmt(c.oldBV, 2)}) = ${fmt(c.sell0AT, 2)}<br>순운전자본 −${fmt(c.nwc, 2)} (타당성 조사비는 매몰원가라 제외)<br>합계 <b>${fmt(c.cf0, 2)}</b>` },
      { lab: '물음 2', type: 'num', text: '1년 말부터 사업 종료 시점까지 매년 발생하는 증분 영업현금흐름을 구하시오.', unit: '만원', dp: 0, ans: c => c.ocf,
        sol: (p, c) => `감가상각비 증가 = ${fmt(c.newDep, 2)} − ${fmt(c.oldDep, 2)} = ${fmt(c.newDep - c.oldDep, 2)}<br>(${fmt(p.dRev)} + ${fmt(p.dCost)})×(1−${p.t}) + ${p.t}×${fmt(c.newDep - c.oldDep, 2)} = <b>${fmt(c.ocf, 2)}</b> (이자비용은 할인율에 반영되므로 제외)` },
      { lab: '물음 3', type: 'num', textf: (p, c) => `사업 종료 시점(t=${p.oldLife - p.oldAge})에 영업현금흐름 외에 추가로 발생하는 증분현금흐름(설비 처분 및 순운전자본 회수)을 구하시오.`, unit: '만원', dp: 0, ans: c => c.term,
        sol: (p, c) => `신형 처분 세후 ${fmt(p.sellNew)} − ${p.t}×(${fmt(p.sellNew)} − ${fmt(p.salv)}) = ${fmt(c.newAT, 2)}<br>포기하는 구형 처분 세후 ${fmt(p.sellN)} − ${p.t}×(${fmt(p.sellN)} − 0) = ${fmt(c.oldAT, 2)}<br>${fmt(c.newAT, 2)} − ${fmt(c.oldAT, 2)} + 순운전자본 회수 ${fmt(c.nwc, 2)} = <b>${fmt(c.term, 2)}</b>` },
      { lab: '물음 4 ①', type: 'num', text: '교체안의 NPV를 구하시오.', unit: '만원', dp: 0, ans: c => c.npv,
        sol: (p, c) => `${fmt(c.cf0, 2)} + ${fmt(c.ocf, 2)}×${c.A} + ${fmt(c.term, 2)}×${c.F} = <b>${fmt(c.npv, 2)}</b>` },
      { lab: '물음 4 ②', type: 'choice', text: '교체안의 채택 여부는?', opts: ['채택', '기각'], ans: c => (c.npv > 0 ? 0 : 1), sol: (p, c) => `NPV ${c.npv > 0 ? '> 0 → 채택' : '< 0 → 기각'}` },
      { lab: '물음 5', type: 'num', text: '다른 조건이 같을 때, 교체안의 NPV를 0으로 만드는 신형 설비의 구입가격(설치비 제외)을 구하시오.', unit: '만원', dp: 0, ans: c => c.Xmax,
        sol: (p, c) => `구입가격이 1만원 늘면 t=0 유출 1 증가, 매년 감가상각 절세효과 ${p.t}/${c.n} 증가 → NPV 변화 = −1 + ${c.A}×${p.t}/${c.n} = ${c.slope.toFixed(6)}<br>X = ${fmt(p.price)} − (${fmt(c.npv, 2)})/(${c.slope.toFixed(6)}) = <b>${fmt(c.Xmax, 2)}</b>` },
      { lab: '물음 6', type: 'essay', text: '이 교체안의 현금흐름을 추정할 때 타당성 조사비와 은행 차입 이자비용을 제외한 이유를 각각 한 줄로 설명하시오.',
        model: '타당성 조사비는 교체 여부와 관계없이 이미 지출되어 회수할 수 없는 매몰원가이므로 증분현금흐름이 아니다. 이자비용은 자금조달 비용으로서 할인율(자본비용)에 이미 반영되어 있으므로 현금흐름에 포함하면 이중계산이 된다.',
        kw: ['매몰원가', '증분', '자본비용', '할인율', '이중'] },
    ],
  });

  P.push({
    id: 'cb-payback', unit: 'cb', pts: 15, real: true, title: '투자안 평가 지표 종합과 자본할당',
    trend: '2025 문1 (회수기간·PI) · 2026 문1 (MIRR) · 자본할당',
    p: { k: 0.1, P: [1000, [500, 400, 300, 200]], Q: [1500, [200, 400, 700, 900]], R: [800, [300, 300, 300, 300]], B: 2300 },
    vary(R) {
      for (;;) {
        const k = R.pick([0.08, 0.1, 0.12]);
        const IP = R.int(800, 1500, 100), IQ = R.int(1200, 2000, 100), IR = R.int(600, 1200, 100);
        const P1 = [R.f(0.4, 0.55, 0.05), R.f(0.3, 0.45, 0.05), R.f(0.25, 0.35, 0.05), R.f(0.1, 0.25, 0.05)].map(x => Math.round(IP * x / 10) * 10);
        const Q1 = [R.f(0.1, 0.2, 0.05), R.f(0.2, 0.3, 0.05), R.f(0.35, 0.5, 0.05), R.f(0.5, 0.7, 0.05)].map(x => Math.round(IQ * x / 10) * 10);
        const lev = Math.round(IR * R.f(0.3, 0.4, 0.01) / 10) * 10;
        const p = { k, P: [IP, P1], Q: [IQ, Q1], R: [IR, [lev, lev, lev, lev]], B: 0 };
        p.B = Math.round((IQ + IR) / 100) * 100;
        const c = this.calc(p);
        if (c.pb != null && c.dpb != null && [c.P.npv, c.Q.npv, c.R.npv].every(x => x > 20) && c.best && c.best.length === 2 && c.gap > 5) return p;
      }
    },
    calc(p) {
      const d = t => r4(pvif(p.k, t)), A4 = r4(pvifa(p.k, 4));
      const one = ([I, cf]) => { const pv = cf.map((x, i) => x * d(i + 1)); const PV = pv.reduce((a, b) => a + b, 0); return { I, cf, pv, PV, npv: PV - I, pi: PV / I }; };
      const P_ = one(p.P), Q_ = one(p.Q), R_ = one(p.R);
      const back = (I, flows) => { let cum = 0; for (let i = 0; i < flows.length; i++) { if (cum + flows[i] >= I) return i + (I - cum) / flows[i]; cum += flows[i]; } return null; };
      const pb = back(P_.I, P_.cf), dpb = back(Q_.I, Q_.pv);
      const fv = P_.cf.reduce((s, x, i) => s + x * r4(Math.pow(1 + p.k, 3 - i)), 0), mirr = Math.pow(fv / P_.I, 0.25) - 1;
      const items = { P: P_, Q: Q_, R: R_ }, names = ['P', 'Q', 'R'];
      const subsets = [['P'], ['Q'], ['R'], ['P', 'Q'], ['P', 'R'], ['Q', 'R'], ['P', 'Q', 'R']].filter(s => s.reduce((a, k) => a + items[k].I, 0) <= p.B);
      const val = s => s.reduce((a, k) => a + items[k].npv, 0);
      const sorted = subsets.slice().sort((a, b) => val(b) - val(a));
      const best = sorted[0], gap = sorted.length > 1 ? val(sorted[0]) - val(sorted[1]) : 0;
      const pairIdx = best ? ['P,Q', 'P,R', 'Q,R'].indexOf(best.join(',')) : -1;
      return { P: P_, Q: Q_, R: R_, pb, dpb, fv, mirr, best, bestNPV: best ? val(best) : 0, gap, pairIdx, A4, names };
    },
    body: (p, c) => `<p>㈜한누리는 다음 세 개의 독립적인 투자안을 검토하고 있다. 각 투자안의 투자액은 현재(t=0) 전액 지출되며, 현금흐름은 매년 말에 발생한다. 자본비용(재투자수익률)은 <b>${pc(p.k)}</b>이고 금액 단위는 만원이다.</p>`
      + tbl(['투자안', 't=0', 't=1', 't=2', 't=3', 't=4'], [['P', `(${fmt(p.P[0])})`, ...p.P[1].map(x => fmt(x))], ['Q', `(${fmt(p.Q[0])})`, ...p.Q[1].map(x => fmt(x))], ['R', `(${fmt(p.R[0])})`, ...p.R[1].map(x => fmt(x))]])
      + tbl(['n', '1', '2', '3', '4'], [[`PVIF(${pc(p.k)}, n)`, ...[1, 2, 3, 4].map(t => r4(pvif(p.k, t)).toFixed(4))], [`(1 + ${pc(p.k)})ⁿ`, ...[1, 2, 3, 4].map(t => r4(Math.pow(1 + p.k, t)).toFixed(4))]])
      + `<p>회수기간과 할인회수기간은 연중 현금흐름이 균등하게 발생한다고 보고 보간하여 구한다. 계산과정에서는 위 표의 계수를 이용한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '투자안 P의 회수기간을 구하시오.', unit: '년', dp: 2, ans: c => c.pb,
        sol: (p, c) => { let cum = 0, i = 0; while (cum + p.P[1][i] < p.P[0]) cum += p.P[1][i++]; return `${i}년까지 누적 ${fmt(cum)} → ${i} + (${fmt(p.P[0])} − ${fmt(cum)})/${fmt(p.P[1][i])} = <b>${c.pb.toFixed(4)}</b>`; } },
      { lab: '물음 1 ②', type: 'num', text: '투자안 Q의 할인회수기간을 구하시오.', unit: '년', dp: 2, ans: c => c.dpb,
        sol: (p, c) => { let cum = 0, i = 0; while (cum + c.Q.pv[i] < p.Q[0]) cum += c.Q.pv[i++]; return `연도별 현가 ${c.Q.pv.map(x => x.toFixed(2)).join(', ')}<br>${i}년까지 누적 ${cum.toFixed(2)} → ${i} + (${fmt(p.Q[0])} − ${cum.toFixed(2)})/${c.Q.pv[i].toFixed(2)} = <b>${c.dpb.toFixed(4)}</b>`; } },
      { lab: '물음 1 ③', type: 'num', text: '투자안 Q의 수익성지수(PI)를 구하시오.', unit: '', dp: 2, ans: c => c.Q.pi, sol: (p, c) => `${c.Q.PV.toFixed(4)}/${fmt(p.Q[0])} = <b>${c.Q.pi.toFixed(4)}</b>` },
      { lab: '물음 1 ④', type: 'num', text: '투자안 P의 수정내부수익률(MIRR)을 구하시오.', unit: '%', dp: 2, ans: c => c.mirr * 100,
        sol: (p, c) => `유입의 4년 말 종가 = ${p.P[1].map((x, i) => `${fmt(x)}×${r4(Math.pow(1 + p.k, 3 - i)).toFixed(4)}`).join(' + ')} = ${c.fv.toFixed(2)}<br>(${c.fv.toFixed(2)}/${fmt(p.P[0])})^(1/4) − 1 = <b>${(c.mirr * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ①', type: 'choice', textf: p => `투자 예산이 ${fmt(p.B)}만원으로 제한되고 투자안은 쪼갤 수 없다. NPV를 극대화하는 투자 조합은?`, opts: ['P와 Q', 'P와 R', 'Q와 R'], ans: c => c.pairIdx,
        sol: (p, c) => `NPV: P ${c.P.npv.toFixed(2)}, Q ${c.Q.npv.toFixed(2)}, R ${c.R.npv.toFixed(2)} (R = ${fmt(p.R[1][0])}×${c.A4} − ${fmt(p.R[0])})<br>예산 안의 조합 중 NPV 합이 가장 큰 것: <b>${c.best.join('와 ')}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '그 조합의 NPV 합계를 구하시오.', unit: '만원', dp: 2, ans: c => c.bestNPV, sol: (p, c) => `<b>${c.bestNPV.toFixed(4)}</b>` },
      { lab: '물음 3', type: 'essay', text: '자본할당 상황에서 수익성지수(PI)가 높은 순서대로 투자안을 고르는 방법이 NPV 극대화에 실패할 수 있는 이유를 두 줄 이내로 설명하시오.',
        model: 'PI 순위법은 투자안을 쪼갤 수 있고 예산을 남김없이 쓸 수 있다고 가정한다. 투자안을 쪼갤 수 없으면 PI가 높은 투자안을 먼저 고른 뒤 남는 예산을 쓰지 못해, 예산을 모두 쓰는 다른 조합보다 NPV 합계가 작아질 수 있다.',
        kw: ['분할', '쪼갤', '예산', '남는', '조합'] },
    ],
  });

  P.push({
    id: 'cb-mirr', unit: 'cb', pts: 15, real: true, title: '상호배타적 투자안: 피셔의 수익률과 수명이 다른 투자안 비교',
    trend: '2026 문1 (IRR·MIRR, EAC) · 상호배타적 투자안 순위 충돌',
    p: { k: 0.1, A: [2000, [1200, 1000, 400]], B: [2000, [300, 800, 1800]], C: [1200, [800, 700]] },
    vary(R) {
      for (;;) {
        const k = R.pick([0.08, 0.1, 0.12]), I = R.int(1500, 3000, 100);
        const A = [R.f(0.5, 0.65, 0.05), R.f(0.4, 0.55, 0.05), R.f(0.1, 0.25, 0.05)].map(x => Math.round(I * x / 10) * 10);
        const B = [R.f(0.1, 0.2, 0.05), R.f(0.3, 0.45, 0.05), R.f(0.8, 1.0, 0.05)].map(x => Math.round(I * x / 10) * 10);
        const IC = Math.round(I * R.f(0.5, 0.7, 0.05) / 100) * 100;
        const C = [R.f(0.6, 0.75, 0.05), R.f(0.5, 0.65, 0.05)].map(x => Math.round(IC * x / 10) * 10);
        const p = { k, A: [I, A], B: [I, B], C: [IC, C] }, c = this.calc(p);
        if (c.fisher > k + 0.01 && c.fisher < 0.4 && c.A.npv > 0 && c.B.npv > c.A.npv + 5 && c.irrA > c.irrB && c.C.npv > 0 && Math.abs(c.eA - c.eC) > 3) return p;
      }
    },
    calc(p) {
      const d = t => r4(pvif(p.k, t));
      const one = ([I, cf]) => { const npv = cf.reduce((s, x, i) => s + x * d(i + 1), 0) - I; return { I, cf, npv }; };
      const irr = ([I, cf]) => root(r => cf.reduce((s, x, i) => s + x / (1 + r) ** (i + 1), 0) - I, -0.5, 3);
      const A = one(p.A), B = one(p.B), C = one(p.C);
      const diff = p.A[1].map((x, i) => x - p.B[1][i]);
      const fisher = root(r => diff.reduce((s, x, i) => s + x / (1 + r) ** (i + 1), 0), 0.0001, 3);
      const fa3 = r4(pvifa(p.k, 3)), fa2 = r4(pvifa(p.k, 2));
      return { A, B, C, irrA: irr(p.A), irrB: irr(p.B), fisher, diff, fa3, fa2, eA: A.npv / fa3, eC: C.npv / fa2 };
    },
    body: (p, c) => `<p>㈜가온테크는 생산설비 투자안을 검토하고 있다. 투자액은 현재(t=0) 지출되고 현금흐름은 매년 말에 발생한다. 자본비용은 <b>${pc(p.k)}</b>이고 금액 단위는 만원이다.</p>`
      + tbl(['투자안', 't=0', 't=1', 't=2', 't=3'], [['A', `(${fmt(p.A[0])})`, ...p.A[1].map(x => fmt(x))], ['B', `(${fmt(p.B[0])})`, ...p.B[1].map(x => fmt(x))], ['C', `(${fmt(p.C[0])})`, ...p.C[1].map(x => fmt(x)), '–']])
      + tbl(['n', '1', '2', '3'], [[`PVIF(${pc(p.k)}, n)`, ...[1, 2, 3].map(t => r4(pvif(p.k, t)).toFixed(4))], [`PVIFA(${pc(p.k)}, n)`, ...[1, 2, 3].map(t => r4(pvifa(p.k, t)).toFixed(4))]])
      + `<p>※ (물음 1)·(물음 2)는 투자안 A와 B가 상호배타적인 경우이고, (물음 3)은 투자안 A와 C가 상호배타적이며 수명이 끝나면 같은 조건으로 무한히 반복 투자할 수 있는 경우이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '투자안 A의 NPV를 구하시오.', unit: '만원', dp: 2, ans: c => c.A.npv, sol: (p, c) => `${p.A[1].map((x, i) => `${fmt(x)}×${r4(pvif(p.k, i + 1)).toFixed(4)}`).join(' + ')} − ${fmt(p.A[0])} = <b>${c.A.npv.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '투자안 B의 NPV를 구하시오.', unit: '만원', dp: 2, ans: c => c.B.npv, sol: (p, c) => `${p.B[1].map((x, i) => `${fmt(x)}×${r4(pvif(p.k, i + 1)).toFixed(4)}`).join(' + ')} − ${fmt(p.B[0])} = <b>${c.B.npv.toFixed(4)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '투자안 A의 내부수익률(IRR)을 구하시오.', unit: '%', dp: 2, ans: c => c.irrA * 100, sol: (p, c) => `Σ CF/(1+r)ᵗ = ${fmt(p.A[0])}을 풀면 <b>${(c.irrA * 100).toFixed(4)}%</b> (참고: B의 IRR ${(c.irrB * 100).toFixed(2)}%)` },
      { lab: '물음 1 ④', type: 'num', text: '두 투자안의 NPV가 같아지는 할인율(피셔의 수익률)을 구하시오.', unit: '%', dp: 2, ans: c => c.fisher * 100,
        sol: (p, c) => `차이 현금흐름(A−B) = (${c.diff.map(x => fmt(x)).join(', ')})의 IRR → <b>${(c.fisher * 100).toFixed(4)}%</b>` },
      { lab: '물음 2', type: 'choice', text: 'IRR법과 NPV법의 결론이 서로 다르다. 자본비용에서 선택해야 하는 투자안은?', opts: ['투자안 A (IRR이 더 높음)', '투자안 B (NPV가 더 큼)'], ans: () => 1,
        sol: (p, c) => `자본비용 ${pc(p.k)} < 피셔의 수익률 ${(c.fisher * 100).toFixed(2)}% → 이 구간에서는 B의 NPV가 더 크다. 주주가치 기준인 NPV로 판단해 <b>B</b>` },
      { lab: '물음 3 ①', type: 'num', text: '투자안 C의 연간균등가치(EAA = NPV ÷ 연금현가계수)를 구하시오.', unit: '만원', dp: 2, ans: c => c.eC,
        sol: (p, c) => `NPV_C = ${c.C.npv.toFixed(4)} → ${c.C.npv.toFixed(4)}/${c.fa2} = <b>${c.eC.toFixed(4)}</b>` },
      { lab: '물음 3 ②', type: 'choice', text: '반복 투자를 고려할 때 선택해야 하는 투자안은?', opts: ['투자안 A', '투자안 C'], ans: c => (c.eA >= c.eC ? 0 : 1),
        sol: (p, c) => `EAA: A ${c.A.npv.toFixed(2)}/${c.fa3} = ${c.eA.toFixed(2)}, C ${c.eC.toFixed(2)} → ${c.eA >= c.eC ? 'A' : 'C'}` },
      { lab: '물음 4', type: 'essay', text: '수명이 다른 상호배타적 투자안을 각자의 NPV로 바로 비교하면 안 되는 이유와, 연간균등가치로 비교하는 방법의 의미를 두 줄 이내로 설명하시오.',
        model: '수명이 다르면 한 투자안이 끝난 뒤 재투자할 수 있는 기회가 반영되지 않아 NPV를 같은 기간 기준으로 비교할 수 없다. 연간균등가치는 NPV를 수명 동안 매년 같은 금액으로 환산한 것으로, 무한 반복 투자를 가정한 비교와 같은 결론을 준다.',
        kw: ['수명', '반복', '재투자', '매년', '같은 기간'] },
    ],
  });

  /* ───────── 포트폴리오 · CAPM · APT ───────── */
  /* ── 실전형 CAPM · APT (긴 지문 · 소물음) ── */
  const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  function solve3(m, v) {   // 크라머 공식
    const D = det3(m);
    return [0, 1, 2].map(j => det3(m.map((row, i) => row.map((x, k) => (k === j ? v[i] : x)))) / D);
  }
  const s1 = x => x.toFixed(1), s2 = x => x.toFixed(2);

  P.push({
    id: 'pf-capm-alpha-arb', unit: 'pf', pts: 15, title: 'SML 가격오류, 무비용·제로베타 차익거래, 단일지수모형의 위험 분해',
    trend: '2026 문2 (과대/과소평가 → 제로베타 차익거래) · 2023 문2 (체계적위험 비율)', real: true,
    p: { rf: 0.03, Em: 0.11, sm: 0.2, X: { s: 0.3, r: 0.8 }, Y: { s: 0.25, r: 0.6, a: 0.01 }, Z: { s: 0.4, r: 0.7, a: -0.012 }, M: 900, w: 0.4 },
    vary(R) {
      for (;;) {
        const rf = R.f(0.02, 0.05, 0.005), sm = R.f(0.15, 0.25, 0.01);
        const p = { rf, Em: rf + R.f(0.05, 0.09, 0.005), sm,
          X: { s: R.f(0.2, 0.35, 0.01), r: R.f(0.5, 0.9, 0.05) },
          Y: { s: R.f(0.15, 0.35, 0.01), r: R.f(0.4, 0.9, 0.05), a: R.pick([-1, 1]) * R.f(0.006, 0.02, 0.002) },
          Z: { s: R.f(0.25, 0.45, 0.01), r: R.f(0.4, 0.9, 0.05), a: R.pick([-1, 1]) * R.f(0.006, 0.02, 0.002) },
          M: R.int(500, 2000, 100), w: R.f(0.2, 0.8, 0.1) };
        const c = this.calc(p);
        if (Math.abs(c.Y.a) >= 0.004 && Math.abs(c.Z.a) >= 0.004 && c.Y.b > 0.3 && c.X.ev > 0 && c.Z.ev > 0) return p;
      }
    },
    calc(p) {
      const prem = p.Em - p.rf;
      const st = (o, alpha) => {
        const b = o.r * o.s / p.sm, req = p.rf + b * prem;
        const E = Math.round((req + alpha) * 1e4) / 1e4;   // 표에 보이는 기대수익률(소수 둘째 자리 %)
        return { b, req, E, a: E - req, ev: o.s ** 2 - b * b * p.sm ** 2 };
      };
      const X = st(p.X, 0), Y = st(p.Y, p.Y.a), Z = st(p.Z, p.Z.a);
      const sideY = Y.a > 0 ? 1 : -1;                  // +1: Y 매수(과소평가)
      const WY = p.M / Y.b, rfPos = -(sideY * WY - sideY * p.M);
      const bP = p.w * X.b + (1 - p.w) * Z.b, sys = bP * bP * p.sm ** 2, non = p.w ** 2 * X.ev + (1 - p.w) ** 2 * Z.ev;
      return { X, Y, Z, sideY, WY, rfPos, profit: Math.abs(Y.a) * WY, bP, sys, non, ratio: non / (sys + non) };
    },
    body: (p, c) => `<p>투자자 갑은 다음과 같은 시장 정보를 바탕으로 주식 X, Y, Z의 가격 적정성을 판단하고 차익거래 기회를 찾고자 한다. CAPM이 성립하며, 모든 자산은 공매가 가능하고 1단위 이하로 분할하여 거래할 수 있으며 거래비용은 없다.</p>`
      + tbl(['구분', '기대수익률', '표준편차'], [['시장포트폴리오(M)', pc(p.Em), pc(p.sm)], ['무위험자산', pc(p.rf), '–']])
      + tbl(['주식', '시장에서 예상하는 기대수익률', '표준편차', '시장포트폴리오와의 상관계수'], [['X', pc(c.X.E), pc(p.X.s), s2(p.X.r)], ['Y', pc(c.Y.E), pc(p.Y.s), s2(p.Y.r)], ['Z', pc(c.Z.E), pc(p.Z.s), s2(p.Z.r)]])
      + `<p>※ (물음 3)은 (물음 1)·(물음 2)와 독립적이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '주식 Z의 베타를 구하시오.', unit: '', dp: 2, ans: c => c.Z.b,
        sol: (p, c) => `β_Z = ${s2(p.Z.r)}×${pc(p.Z.s)}/${pc(p.sm)} = <b>${c.Z.b.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'choice', text: 'CAPM을 기준으로 주식 Y와 Z의 가격 상태를 판단하시오.', opts: ['Y 과소평가 · Z 과대평가', 'Y 과대평가 · Z 과소평가', 'Y 과소평가 · Z 과소평가', 'Y 과대평가 · Z 과대평가'],
        ans: c => (c.Y.a > 0 ? (c.Z.a > 0 ? 2 : 0) : (c.Z.a > 0 ? 1 : 3)),
        sol: (p, c) => `Y: 요구수익률 ${pc(p.rf)} + ${c.Y.b.toFixed(4)}×${pc(p.Em - p.rf)} = ${(c.Y.req * 100).toFixed(2)}% vs 기대 ${pc(c.Y.E)} → α = ${(c.Y.a * 100).toFixed(2)}%p (${c.Y.a > 0 ? '과소' : '과대'}평가)<br>Z: 요구수익률 ${(c.Z.req * 100).toFixed(2)}% vs 기대 ${pc(c.Z.E)} → α = ${(c.Z.a * 100).toFixed(2)}%p (${c.Z.a > 0 ? '과소' : '과대'}평가)` },
      { lab: '물음 2 ①', type: 'num', textf: p => `주식 Y의 가격오류를 이용하여 주식 Y, 시장포트폴리오, 무위험자산으로 무비용·제로베타 포트폴리오를 구성하려 한다. 시장포트폴리오의 거래금액이 ${fmt(p.M)}만원일 때 주식 Y의 거래금액을 구하시오.`, unit: '만원', dp: 0, ans: c => c.WY,
        sol: (p, c) => `제로베타: β_Y × W_Y = 시장 거래금액 → W_Y = ${fmt(p.M)}/${c.Y.b.toFixed(4)} = <b>${fmt(c.WY, 2)}</b> (Y ${c.sideY > 0 ? '매수' : '공매'}, 시장 ${c.sideY > 0 ? '공매' : '매수'})` },
      { lab: '물음 2 ②', type: 'num', text: '이때 무위험자산 거래금액을 구하시오. 대출(무위험자산 매수)은 양수, 차입은 음수로 표시한다.', unit: '만원', dp: 0, ans: c => c.rfPos,
        sol: (p, c) => `무비용: Y ${c.sideY > 0 ? '+' : '−'}${fmt(c.WY, 2)}, 시장 ${c.sideY > 0 ? '−' : '+'}${fmt(p.M)} → 무위험자산 = <b>${fmt(c.rfPos, 2)}</b> (${c.rfPos < 0 ? '차입' : '대출'})` },
      { lab: '물음 2 ③', type: 'num', text: '이 전략의 1년 후 기대이익을 구하시오.', unit: '만원', dp: 2, ans: c => c.profit,
        sol: (p, c) => `|α_Y| × W_Y = ${(Math.abs(c.Y.a) * 100).toFixed(2)}% × ${fmt(c.WY, 2)} = <b>${c.profit.toFixed(4)}</b>` },
      { lab: '물음 3', type: 'num', textf: p => `단일지수모형이 성립한다고 하자. 주식 X에 ${pc(p.w)}, 주식 Z에 ${pc(1 - p.w)}를 투자한 포트폴리오의 총위험(분산) 중 비체계적위험이 차지하는 비율을 구하시오.`, unit: '%', dp: 2, ans: c => c.ratio * 100,
        sol: (p, c) => `σ²(e_X) = ${pc(p.X.s)}² − ${c.X.b.toFixed(4)}²×${pc(p.sm)}² = ${c.X.ev.toFixed(6)}, σ²(e_Z) = ${c.Z.ev.toFixed(6)}<br>β_P = ${c.bP.toFixed(4)}, 체계적 = β_P²σm² = ${c.sys.toFixed(6)}, 비체계적 = ${p.w.toFixed(1)}²×${c.X.ev.toFixed(6)} + ${(1 - p.w).toFixed(1)}²×${c.Z.ev.toFixed(6)} = ${c.non.toFixed(6)}<br>비율 = <b>${(c.ratio * 100).toFixed(4)}%</b>` },
      { lab: '물음 4', type: 'essay', text: 'CAPM에서 개별 주식의 샤프비율이 시장포트폴리오의 샤프비율보다 일반적으로 낮은 이유를 세 줄 이내로 설명하시오.',
        model: '균형에서 개별 주식의 위험프리미엄은 체계적위험(βσ=ρσᵢ)에 대해서만 보상된다. 따라서 샤프비율은 ρ × 시장 샤프비율이 되고, 상관계수가 1보다 작으면 비체계적위험만큼 보상 없는 위험을 지므로 샤프비율이 낮다.',
        kw: ['체계적', '비체계적', '상관계수', '보상', 'ρ'] },
    ],
  });

  P.push({
    id: 'pf-cml-sml-eff', unit: 'pf', pts: 15, title: 'CML 위의 효율적 포트폴리오와 SML 위의 개별주식',
    trend: '2024 문4·2026 문3 (CML, 위험회피계수, 샤프비율)', real: true,
    p: { rf: 0.04, Em: 0.12, sm: 0.2, sA: 0.3, sB: 0.35, rB: 0.5, g: 3 },
    vary(R) {
      for (;;) {
        const rf = R.f(0.02, 0.05, 0.005);
        const p = { rf, Em: rf + R.f(0.05, 0.09, 0.005), sm: R.f(0.15, 0.25, 0.01), sA: R.f(0.1, 0.4, 0.01), sB: R.f(0.2, 0.45, 0.01), rB: R.f(0.3, 0.9, 0.05), g: R.int(2, 6, 1) };
        if (Math.abs(p.sA - p.sm) > 0.02) return p;
      }
    },
    calc(p) {
      const sh = (p.Em - p.rf) / p.sm, EA = p.rf + sh * p.sA, bA = p.sA / p.sm, wf = 1 - bA;
      const bB = p.rB * p.sB / p.sm, reqB = p.rf + bB * (p.Em - p.rf), sysB = p.rB ** 2;
      const sOpt = (p.Em - p.rf) / (p.g * p.sm);
      return { sh, EA, bA, wf, bB, reqB, sysB, sOpt };
    },
    body: p => `<p>CAPM이 성립하는 자본시장에서 시장포트폴리오(M)의 기대수익률은 <b>${pc(p.Em)}</b>, 표준편차는 <b>${pc(p.sm)}</b>이며 무위험이자율은 <b>${pc(p.rf)}</b>이다. 무위험이자율로 차입과 대출이 자유롭다.</p>`
      + ul([`포트폴리오 A는 자본시장선(CML) 위에 있는 효율적 포트폴리오이며, 수익률의 표준편차는 <b>${pc(p.sA)}</b>이다.`,
        `주식 B는 균형가격에 거래되고 있으며, 수익률의 표준편차는 <b>${pc(p.sB)}</b>, 시장포트폴리오 수익률과의 상관계수는 <b>${s2(p.rB)}</b>이다.`,
        `투자자 을의 효용함수는 U = E(R<sub>P</sub>) − 0.5 × γ × σ<sub>P</sub>² 이고 위험회피계수 γ는 <b>${p.g}</b>이다.`])
      + `<p>※ 각 물음은 독립적이다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '포트폴리오 A의 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.EA * 100,
        sol: (p, c) => `${pc(p.rf)} + (${pc(p.Em)} − ${pc(p.rf)})/${pc(p.sm)} × ${pc(p.sA)} = <b>${(c.EA * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ②', type: 'num', text: '포트폴리오 A를 구성할 때 무위험자산에 투자하는 비중을 구하시오. 차입은 음수로 표시한다.', unit: '%', dp: 2, ans: c => c.wf * 100,
        sol: (p, c) => `M 비중 = σ_A/σm = ${c.bA.toFixed(4)} → 무위험자산 = 1 − ${c.bA.toFixed(4)} = <b>${(c.wf * 100).toFixed(2)}%</b>${c.wf < 0 ? ' (차입)' : ''}` },
      { lab: '물음 2 ①', type: 'num', text: '주식 B의 균형 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.reqB * 100,
        sol: (p, c) => `β_B = ${s2(p.rB)}×${pc(p.sB)}/${pc(p.sm)} = ${c.bB.toFixed(4)} → ${pc(p.rf)} + ${c.bB.toFixed(4)}×${pc(p.Em - p.rf)} = <b>${(c.reqB * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ②', type: 'num', text: '주식 B의 총위험(분산) 중 체계적위험이 차지하는 비율을 구하시오.', unit: '%', dp: 2, ans: c => c.sysB * 100,
        sol: (p, c) => `β_B²σm²/σ_B² = ρ² = ${s2(p.rB)}² = <b>${(c.sysB * 100).toFixed(2)}%</b>` },
      { lab: '물음 2 ③', type: 'num', text: '포트폴리오 A와 주식 B 수익률 간의 상관계수를 구하시오.', unit: '', dp: 2, ans: (c, p) => p.rB,
        sol: p => `A = M과 무위험자산의 결합이므로 Cov(A,B) = (σ_A/σm)·Cov(M,B) → ρ(A,B) = ρ(M,B) = <b>${s2(p.rB)}</b>` },
      { lab: '물음 3', type: 'num', text: '투자자 을이 선택하는 최적 포트폴리오의 표준편차를 구하시오.', unit: '%', dp: 2, ans: c => c.sOpt * 100,
        sol: (p, c) => `y* = (E(Rm)−Rf)/(γσm²), σ* = y*·σm = ${pc(p.Em - p.rf)}/(${p.g}×${pc(p.sm)}) = <b>${(c.sOpt * 100).toFixed(4)}%</b>` },
      { lab: '물음 4', type: 'essay', text: '주식 B는 증권시장선(SML) 위에 있지만 자본시장선(CML) 아래에 위치한다. 그 이유를 세 줄 이내로 설명하시오.',
        model: 'SML은 체계적위험(β)과 기대수익률의 관계로 균형 자산은 모두 SML 위에 있다. CML은 총위험(σ) 기준으로 완전분산된 효율적 포트폴리오만 위치하는데, 주식 B는 시장과의 상관계수가 1보다 작아 비체계적위험을 지니므로 같은 총위험의 효율적 포트폴리오보다 기대수익률이 낮아 CML 아래에 있다.',
        kw: ['체계적', '총위험', '비체계적', '효율적', '상관계수'] },
    ],
  });

  P.push({
    id: 'pf-apt-three', unit: 'pf', pts: 15, title: '세 포트폴리오로 2요인 APT 균형식 추정과 복제 차익거래',
    trend: '2025 문5 (APT 차익거래) · 2023 문2 (요인모형)', real: true,
    p: { l: [0.04, 0.06, 0.05], A: [1.0, 0.6], B: [0.5, 1.2], C: [0.8, 0.2], D: [1.2, 0.8], alpha: 0.018 },
    vary(R) {
      for (;;) {
        const b = () => [R.f(0.2, 1.8, 0.1), R.f(0.1, 1.6, 0.1)];
        const A = b(), B = b(), C = b();
        if (Math.abs(det3([[1, ...A], [1, ...B], [1, ...C]])) < 0.3) continue;
        const p = { l: [R.f(0.02, 0.05, 0.005), R.f(0.02, 0.08, 0.005), R.f(0.01, 0.06, 0.005)], A, B, C, D: b(), alpha: R.pick([-1, 1]) * R.f(0.008, 0.03, 0.002) };
        const c = this.calc(p);
        if (c.w.every(x => Math.abs(x) < 4)) return p;
      }
    },
    calc(p) {
      const E = b => p.l[0] + b[0] * p.l[1] + b[1] * p.l[2];
      const EA = E(p.A), EB = E(p.B), EC = E(p.C), Deq = E(p.D), ED = Deq + p.alpha;
      const lam = solve3([[1, ...p.A], [1, ...p.B], [1, ...p.C]], [EA, EB, EC]);
      const w = solve3([[1, 1, 1], [p.A[0], p.B[0], p.C[0]], [p.A[1], p.B[1], p.C[1]]], [1, p.D[0], p.D[1]]);
      return { EA, EB, EC, Deq, ED, lam, w, profit: Math.abs(p.alpha) * 10000 };
    },
    body: (p, c) => `<p>주식 수익률이 서로 독립적인 두 공통요인 F₁, F₂에 의해 결정되는 2요인 APT가 성립하는 경제를 가정한다. 시장에는 잘 분산된 포트폴리오 A, B, C, D가 거래되고 있으며, <b>무위험자산은 존재하지 않는다.</b> 모든 자산은 공매가 가능하고 1단위 이하로 분할하여 거래할 수 있으며 거래비용은 없다.</p>`
      + `<p class="eq">E(R<sub>i</sub>) = λ₀ + b<sub>i1</sub>λ₁ + b<sub>i2</sub>λ₂</p>`
      + tbl(['포트폴리오', '요인1 민감도(b₁)', '요인2 민감도(b₂)', '기대수익률'], [['A', s1(p.A[0]), s1(p.A[1]), pc(c.EA)], ['B', s1(p.B[0]), s1(p.B[1]), pc(c.EB)], ['C', s1(p.C[0]), s1(p.C[1]), pc(c.EC)], ['D', s1(p.D[0]), s1(p.D[1]), pc(c.ED)]])
      + `<p>포트폴리오 A, B, C는 균형가격에 거래되고 있다. 계산결과는 % 단위로 소수점 아래 셋째 자리에서 반올림하여 둘째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: 'λ₀(두 요인 민감도가 모두 0인 포트폴리오의 기대수익률)을 구하시오.', unit: '%', dp: 2, ans: c => c.lam[0] * 100,
        sol: (p, c) => `${pc(c.EA)} = λ₀ + ${s1(p.A[0])}λ₁ + ${s1(p.A[1])}λ₂, ${pc(c.EB)} = λ₀ + ${s1(p.B[0])}λ₁ + ${s1(p.B[1])}λ₂, ${pc(c.EC)} = λ₀ + ${s1(p.C[0])}λ₁ + ${s1(p.C[1])}λ₂ 연립 → λ₀ = <b>${(c.lam[0] * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ②', type: 'num', text: '요인 1의 위험프리미엄 λ₁을 구하시오.', unit: '%', dp: 2, ans: c => c.lam[1] * 100, sol: (p, c) => `같은 연립방정식 → λ₁ = <b>${(c.lam[1] * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ③', type: 'num', text: '요인 2의 위험프리미엄 λ₂를 구하시오.', unit: '%', dp: 2, ans: c => c.lam[2] * 100, sol: (p, c) => `같은 연립방정식 → λ₂ = <b>${(c.lam[2] * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ①', type: 'num', text: 'APT에 따른 포트폴리오 D의 균형 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.Deq * 100,
        sol: (p, c) => `${(c.lam[0] * 100).toFixed(2)}% + ${s1(p.D[0])}×${(c.lam[1] * 100).toFixed(2)}% + ${s1(p.D[1])}×${(c.lam[2] * 100).toFixed(2)}% = <b>${(c.Deq * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ②', type: 'num', text: 'A, B, C로 포트폴리오 D와 요인 민감도가 같은 복제포트폴리오를 만들 때, 포트폴리오 A의 투자 비중을 구하시오. (공매는 음수)', unit: '%', dp: 2, ans: c => c.w[0] * 100,
        sol: (p, c) => `w_A + w_B + w_C = 1, ${s1(p.A[0])}w_A + ${s1(p.B[0])}w_B + ${s1(p.C[0])}w_C = ${s1(p.D[0])}, ${s1(p.A[1])}w_A + ${s1(p.B[1])}w_B + ${s1(p.C[1])}w_C = ${s1(p.D[1])}<br>→ w_A = <b>${(c.w[0] * 100).toFixed(4)}%</b>, w_B = ${(c.w[1] * 100).toFixed(2)}%, w_C = ${(c.w[2] * 100).toFixed(2)}%` },
      { lab: '물음 2 ③', type: 'choice', text: '차익거래를 위해 포트폴리오 D를 어떻게 거래해야 하는가?', opts: ['D 매수 + 복제포트폴리오 공매', 'D 공매 + 복제포트폴리오 매수'], ans: (c, p) => (p.alpha > 0 ? 0 : 1),
        sol: (p, c) => `D의 기대수익률 ${pc(c.ED)} ${p.alpha > 0 ? '>' : '<'} 균형 ${(c.Deq * 100).toFixed(2)}% → ${p.alpha > 0 ? '과소평가된 D 매수' : '과대평가된 D 공매'}` },
      { lab: '물음 2 ④', type: 'num', text: '포트폴리오 D를 1억원 거래하는 순투자 0의 차익거래에서 1년 후 차익거래이익을 구하시오.', unit: '만원', dp: 0, ans: c => c.profit,
        sol: (p, c) => `요인 위험이 모두 상쇄되므로 이익 = |${pc(c.ED)} − ${(c.Deq * 100).toFixed(2)}%| × 10,000만원 = <b>${fmt(c.profit, 2)}</b>` },
    ],
  });

  P.push({
    id: 'pf-factor-cov', unit: 'pf', pts: 15, title: '2요인 모형의 공분산 구조와 요인 중립 포트폴리오',
    trend: '2023 문2 (2요인모형, 체계적·비체계적위험)', real: true,
    p: { f1: 0.2, f2: 0.1, X: [1.2, 0.5, 0.15], Y: [0.8, 1.5, 0.2] },
    vary(R) {
      for (;;) {
        const p = { f1: R.f(0.12, 0.25, 0.01), f2: R.f(0.05, 0.15, 0.01),
          X: [R.f(0.6, 1.6, 0.1), R.f(0.2, 1.2, 0.1), R.f(0.08, 0.25, 0.01)], Y: [R.f(0.4, 1.4, 0.1), R.f(0.4, 1.8, 0.1), R.f(0.08, 0.25, 0.01)] };
        if (Math.abs(p.X[0] - p.Y[0]) >= 0.3 && Math.abs(p.X[1] - p.Y[1]) >= 0.2) return p;
      }
    },
    calc(p) {
      const v1 = p.f1 ** 2, v2 = p.f2 ** 2;
      const vX = p.X[0] ** 2 * v1 + p.X[1] ** 2 * v2 + p.X[2] ** 2, vY = p.Y[0] ** 2 * v1 + p.Y[1] ** 2 * v2 + p.Y[2] ** 2;
      const cov = p.X[0] * p.Y[0] * v1 + p.X[1] * p.Y[1] * v2;
      const wX = -p.Y[0] / (p.X[0] - p.Y[0]), wY = 1 - wX;
      const b2 = wX * p.X[1] + wY * p.Y[1], eN = Math.sqrt(wX ** 2 * p.X[2] ** 2 + wY ** 2 * p.Y[2] ** 2);
      const sysX = (p.X[0] ** 2 * v1 + p.X[1] ** 2 * v2) / vX;
      return { v1, v2, vX, vY, sX: Math.sqrt(vX), sY: Math.sqrt(vY), cov, rho: cov / Math.sqrt(vX * vY), wX, wY, b2, eN, sysX };
    },
    body: p => `<p>주식 수익률이 다음과 같은 2요인 모형에 의해 생성된다고 가정한다. 두 공통요인 F₁, F₂는 서로 상관관계가 없고, 잔차 e<sub>i</sub>는 공통요인 및 다른 주식의 잔차와 상관관계가 없다.</p>`
      + `<p class="eq">R<sub>i</sub> = E(R<sub>i</sub>) + b<sub>i1</sub>F₁ + b<sub>i2</sub>F₂ + e<sub>i</sub></p>`
      + tbl(['구분', '요인 F₁', '요인 F₂'], [['표준편차', pc(p.f1), pc(p.f2)]])
      + tbl(['주식', 'b₁', 'b₂', '잔차 표준편차 σ(e)'], [['X', s1(p.X[0]), s1(p.X[1]), pc(p.X[2])], ['Y', s1(p.Y[0]), s1(p.Y[1]), pc(p.Y[2])]])
      + `<p>모든 주식은 공매가 가능하다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '주식 X 수익률의 표준편차를 구하시오.', unit: '%', dp: 2, ans: c => c.sX * 100,
        sol: (p, c) => `σ_X² = ${s1(p.X[0])}²×${c.v1.toFixed(4)} + ${s1(p.X[1])}²×${c.v2.toFixed(4)} + ${pc(p.X[2])}² = ${c.vX.toFixed(6)} → <b>${(c.sX * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ②', type: 'num', text: '주식 X의 총위험(분산) 중 체계적위험(두 요인에 의한 위험)이 차지하는 비율을 구하시오.', unit: '%', dp: 2, ans: c => c.sysX * 100,
        sol: (p, c) => `(${(c.vX - p.X[2] ** 2).toFixed(6)}) / ${c.vX.toFixed(6)} = <b>${(c.sysX * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ③', type: 'num', text: '주식 X와 주식 Y 수익률 간의 상관계수를 구하시오.', unit: '', dp: 2, ans: c => c.rho,
        sol: (p, c) => `Cov = ${s1(p.X[0])}×${s1(p.Y[0])}×${c.v1.toFixed(4)} + ${s1(p.X[1])}×${s1(p.Y[1])}×${c.v2.toFixed(4)} = ${c.cov.toFixed(6)}, σ_Y = ${(c.sY * 100).toFixed(2)}%<br>ρ = ${c.cov.toFixed(6)}/(${c.sX.toFixed(4)}×${c.sY.toFixed(4)}) = <b>${c.rho.toFixed(4)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '주식 X와 Y만으로 요인 1에 대한 민감도가 0인 포트폴리오를 만들 때 주식 X의 투자 비중을 구하시오. (공매는 음수)', unit: '%', dp: 2, ans: c => c.wX * 100,
        sol: (p, c) => `${s1(p.X[0])}w + ${s1(p.Y[0])}(1−w) = 0 → w = −${s1(p.Y[0])}/(${s1(p.X[0])} − ${s1(p.Y[0])}) = <b>${(c.wX * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ②', type: 'num', text: '이 포트폴리오의 요인 2에 대한 민감도를 구하시오.', unit: '', dp: 2, ans: c => c.b2,
        sol: (p, c) => `${c.wX.toFixed(4)}×${s1(p.X[1])} + ${c.wY.toFixed(4)}×${s1(p.Y[1])} = <b>${c.b2.toFixed(4)}</b>` },
      { lab: '물음 2 ③', type: 'num', text: '이 포트폴리오의 잔차(비체계적) 위험을 표준편차로 구하시오.', unit: '%', dp: 2, ans: c => c.eN * 100,
        sol: (p, c) => `√(${c.wX.toFixed(4)}²×${pc(p.X[2])}² + ${c.wY.toFixed(4)}²×${pc(p.Y[2])}²) = <b>${(c.eN * 100).toFixed(4)}%</b>` },
      { lab: '물음 3', type: 'essay', text: 'CAPM과 비교한 APT의 장점과, APT를 현실에 적용할 때의 한계를 세 줄 이내로 설명하시오.',
        model: '장점: 시장포트폴리오의 존재·관측이나 투자자 효용(평균-분산)에 대한 강한 가정 없이 무차익 조건만으로 균형을 도출하고 여러 요인을 반영할 수 있다. 한계: 요인의 수와 정체를 이론이 알려주지 않아 자의적으로 선택해야 하며, 잘 분산된 포트폴리오에서만 정확히 성립한다.',
        kw: ['시장포트폴리오', '무차익', '요인', '자의적', '분산된'] },
    ],
  });

  /* ───────── 채권 ───────── */
  /* ───────── 파생상품 ───────── */
  /* ───────── 기업재무 ───────── */
  /* ───────── 핵심 공식 요약 ───────── */
  const SUMMARY = [
    { unit: 'cb', rows: [
      ['NPV / PI', 'NPV = Σ CFt/(1+k)^t − I₀,  PI = PV(유입)/I₀'],
      ['세후 영업현금흐름', 'OCF = (매출 − 현금비용)(1 − t) + t × 감가상각비'],
      ['처분 세후현금', '처분가 − t × (처분가 − 장부가)'],
      ['MIRR', '[유입의 종가(재투자율 k) ÷ 유출의 현가]^(1/n) − 1'],
      ['피셔의 수익률', '두 투자안 현금흐름 차이의 IRR (NPV 곡선의 교차점)'],
      ['연간균등비용 EAC', 'EAC = 비용의 현가 ÷ PVIFA(k, n)'],
      ['실질 ↔ 명목', '(1 + 명목) = (1 + 실질)(1 + 인플레이션)'],
    ] },
    { unit: 'pf', rows: [
      ['효용·최적 비중', 'U = E − ½γσ²,  y* = (E − Rf)/(γσ²)'],
      ['CML', 'E(Rp) = Rf + [(E(Rm) − Rf)/σm] σp'],
      ['SML (CAPM)', 'E(Ri) = Rf + βi[E(Rm) − Rf],  βi = Cov(i,m)/Var(m) = ρσi/σm'],
      ['최소분산 비중', 'wA = (σB² − σAB)/(σA² + σB² − 2σAB)'],
      ['샤프비율', '(E(Rp) − Rf)/σp — CAPM에서 개별자산 샤프비율 = ρ × 시장 샤프비율'],
      ['APT', 'E(Ri) = Rf + Σ bik λk — 같은 민감도의 복제로 차익거래'],
    ] },
    { unit: 'bd', rows: [
      ['현물·선도', '(1+s₂)² = (1+s₁)(1+f₁,₂),  f(t−1,t) = P(t−1)/P(t) − 1'],
      ['맥컬리 듀레이션', 'D = Σ t × PV(CFt)/P,  영구채 D = (1+y)/y'],
      ['가격 변화', 'ΔP/P ≈ −MD·Δy + ½·Convexity·(Δy)²,  MD = D/(1+y)'],
      ['면역전략', '자산 PV = 부채 PV, 자산 D = 부채 D(목표시기)'],
      ['기대가설·유동성프리미엄', '선도이자율 = 기대 현물이자율 (+ 유동성프리미엄)'],
    ] },
    { unit: 'dv', rows: [
      ['풋-콜 패리티', 'C − P = S − PV(K)'],
      ['이항모형', 'q = (1+r−d)/(u−d),  C = [qCu + (1−q)Cd]/(1+r)'],
      ['복제', 'Δ = (Cu − Cd)/(Su − Sd),  차입액 B = ΔS − C'],
      ['선물 이론가격', 'F = S(1+r)^T − FV(배당)  또는  S[1 + (r − d)T]'],
      ['베타 조정', 'N = (β목표 − β현재) × V ÷ (F × 승수)'],
    ] },
    { unit: 'cf', rows: [
      ['MM(1963)', 'VL = VU + tD,  ke = ρ + (ρ − kd)(1−t)D/E,  WACC = ρ(1 − tD/V)'],
      ['MM(1958)', 'VL = VU,  ke = ρ + (ρ − kd)D/E'],
      ['합병 NPV', 'NPV = 시너지 − 프리미엄,  주식교환 시 대가 = 신주 비율 × 합병 후 가치'],
      ['권리락 주가', '(구주 수 × 권리부 주가 + 신주 수 × 발행가)/(구주 + 신주)'],
      ['배당·자사주', '배당락 주가 = (V − 배당)/N,  자사주 매입은 주가 불변·주식수 감소'],
    ] },
  ];

  // 시드 고정 난수 (mulberry32) — 같은 시드면 같은 변형 숫자가 나온다
  function makeR(seed) {
    let a = seed >>> 0;
    const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const step = (a, b, s) => { const k = Math.floor(u() * (Math.round((b - a) / s) + 1)); return +(a + k * s).toFixed(6); };
    return { u, pick: arr => arr[Math.floor(u() * arr.length)], int: (a, b, s = 1) => Math.round(step(a, b, s)), f: step };
  }
  // 문제 하나의 출제 인스턴스: seed가 없으면 기본 숫자
  function instance(def, seed) {
    const p = seed == null ? def.p : def.vary(makeR(seed));
    return { p, c: def.calc(p) };
  }

  window.FM_UNITS = UNITS;
  window.FM_PROBLEMS = P;
  window.FM_SUMMARY = SUMMARY;
  window.FM_UTIL = { fmt, pc, num, makeR, instance, pvif, pvifa, r4, tbl, ul, root, det3, solve3, s1, s2 };
})();
