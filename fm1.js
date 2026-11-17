/* CPA 1차 재무관리(경영학 중 재무관리) 객관식 변형 문제
 * - 최근 10개년 1차 시험에서 반복 출제된 계산 유형·이론 주제를 참고해 새로 만든 문제이며, 기출 문장을 옮기지 않았다.
 * - 계산형은 2차 문제와 같은 방식: 1회독은 기본 숫자, 2회독부터 회독마다 새 숫자. 보기는 정답과 자주 하는 실수 값으로 만든다.
 * - 문제 분량은 실제 1차처럼: 상황 설명 + 자료 목록·표(풀이에 쓰지 않는 함정 자료 포함) + 단서. 일부는 두세 단계 계산.
 * - 이론형은 a~e 진술 중 '옳은 것을 모두 고르면?' 조합형이며 회독마다 보기 순서가 섞인다.
 */
(function () {
  'use strict';
  const { fmt, pc, pvif, pvifa, r4, ul, tbl, root } = window.FM_UTIL;
  const M = window.SWM_MCQ;
  const PTS = 5;
  const UNITS = [
    { k: 'tv', name: '화폐의 시간가치', desc: '연금·영구연금·실효이자율' },
    { k: 'cb', name: '자본예산', desc: 'NPV·IRR·회수기간·EAC' },
    { k: 'pf', name: '포트폴리오·CAPM', desc: '분산투자·CML·SML·성과평가' },
    { k: 'bd', name: '채권', desc: '가격·듀레이션·기간구조' },
    { k: 'sv', name: '주식가치평가', desc: '배당평가·PVGO·PER' },
    { k: 'cf', name: '자본구조·기업재무', desc: 'MM·WACC·레버리지·증자' },
    { k: 'dv', name: '파생상품', desc: '풋콜패리티·이항·선물·옵션전략' },
    { k: 'mk', name: '재무이론 종합', desc: '효율적 시장·배당·대리인' },
  ];
  const P = [];
  const add = s => P.push(M.calc(Object.assign({ pts: PTS }, s)));
  const pct = x => +(x * 100).toFixed(4);   // 0.1234 → 12.34 (%)
  const T = '1차 빈출: ';

  // 기출처럼: 상황 설명 → 자료 목록 → 묻는 말 → (단서)
  const ask = (lead, items, q, note) => `<p>${lead}</p>` + (items ? ul(items) : '') + `<p>${q}</p>` + (note ? `<p class="mut">(단, ${note})</p>` : '');
  const pvRow = (r, n) => tbl(['기간', ...[...Array(n)].map((_, i) => `${i + 1}년`)], [[`PVIF(${pc(r)}, n)`, ...[...Array(n)].map((_, i) => r4(pvif(r, i + 1)).toFixed(4))], [`PVIFA(${pc(r)}, n)`, ...[...Array(n)].map((_, i) => r4(pvifa(r, i + 1)).toFixed(4))]]);

  /* ───────── 화폐의 시간가치 ───────── */
  add({ id: 'f1-tv-perp', unit: 'tv', title: '이연된 성장영구연금의 현재가치', trend: T + '성장영구연금',
    p: { C: 1200, r: 0.1, g: 0.03, t: 3, sunk: 300, cap: 5000 },
    vary: R => ({ C: R.int(500, 3000, 100), r: R.pick([0.08, 0.1, 0.12]), g: R.pick([0.02, 0.03, 0.04]), t: R.pick([2, 3, 4]), sunk: R.int(100, 800, 50), cap: R.int(3000, 9000, 500) }),
    calc: p => ({ v: p.C / (p.r - p.g) / Math.pow(1 + p.r, p.t - 1) }),
    stem: p => ask(`㈜한빛개발은 보유 중인 상가 건물을 리모델링하여 임대사업을 하는 방안을 검토하고 있다. 이 사업과 관련된 자료는 다음과 같다.`, [
      `리모델링 공사는 앞으로 ${p.t - 1}년 동안 진행되며, 임대 순현금흐름은 ${p.t}년 말에 처음 발생한다.`,
      `첫 임대 순현금흐름은 ${fmt(p.C)}만원이며, 이후 매년 ${pc(p.g)}씩 영구히 증가할 것으로 예상된다.`,
      `회사는 작년에 이 사업의 타당성 조사비로 ${fmt(p.sunk)}만원을 지출하였다.`,
      `리모델링 공사비 ${fmt(p.cap)}만원은 별도의 차입으로 조달하며, 이 문제에서는 고려하지 않는다.`,
      `이 사업에 적용할 할인율은 연 ${pc(p.r)}이다.`,
    ], '현재 시점(0시점)에서 평가한 임대 순현금흐름의 현재가치에 가장 가까운 것은?', '현금흐름은 매년 말에 발생하고 법인세는 고려하지 않는다'),
    val: c => c.v, dp: 0, u: '만원',
    wrong: p => [p.C / (p.r - p.g), p.C / (p.r - p.g) / Math.pow(1 + p.r, p.t), p.C / p.r / Math.pow(1 + p.r, p.t - 1), p.C / (p.r - p.g) / Math.pow(1 + p.r, p.t - 1) - p.sunk],
    sol: (p, c) => `${p.t}년 말에 첫 현금흐름 → 성장영구연금 공식 C/(r − g)의 값은 ${p.t - 1}년 말 시점 가치<br>${fmt(p.C)}/(${p.r} − ${p.g}) = ${fmt(p.C / (p.r - p.g), 2)} → ÷ ${(1 + p.r)}^${p.t - 1} = <b>${fmt(c.v, 2)}</b> (조사비는 매몰원가, 공사비 조달은 문제 조건상 제외)` });

  add({ id: 'f1-tv-loan', unit: 'tv', title: '원리금 균등상환 대출의 연간 상환액', trend: T + '연금의 현재가치',
    p: { L: 10000, r: 0.06, n: 5, fee: 0.005 },
    vary: R => ({ L: R.int(5000, 20000, 1000), r: R.pick([0.05, 0.06, 0.07, 0.08]), n: R.pick([3, 4, 5, 6]), fee: R.pick([0.003, 0.005, 0.01]) }),
    calc: p => ({ A: p.L / r4(pvifa(p.r, p.n)) }),
    stem: p => ask(`개인사업자 김정우 씨는 매장 인테리어 자금을 마련하기 위해 은행과 다음 조건으로 대출 계약을 맺었다.`, [
      `대출 원금: ${fmt(p.L)}만원 (전액 현재 시점에 수령)`,
      `대출 이자율: 연 ${pc(p.r)} (연 1회 복리)`,
      `상환 방식: ${p.n}년 동안 매년 말 같은 금액을 갚는 원리금 균등분할상환`,
      `대출 취급수수료: 대출 원금의 ${pc(p.fee)}를 대출 시점에 현금으로 별도 지급`,
      `중도상환은 하지 않는다.`,
    ], '김정우 씨가 매년 말 은행에 갚아야 하는 금액(원리금)에 가장 가까운 것은?', `PVIFA(${pc(p.r)}, ${p.n}) = ${r4(pvifa(p.r, p.n)).toFixed(4)}을 이용한다`),
    val: c => c.A, dp: 0, u: '만원',
    wrong: p => [p.L / p.n * (1 + p.r), p.L / p.n + p.L * p.r, p.L / r4(pvifa(p.r, p.n - 1)), p.L * (1 + p.fee) / r4(pvifa(p.r, p.n))],
    sol: (p, c) => `대출 원금 = 상환액 × PVIFA → 상환액 = ${fmt(p.L)} ÷ ${r4(pvifa(p.r, p.n)).toFixed(4)} = <b>${fmt(c.A, 2)}</b><br>취급수수료는 대출 시점에 따로 내는 비용이라 상환액 계산과 관계없다.` });

  add({ id: 'f1-tv-ear', unit: 'tv', title: '세 예금의 실효이자율 비교', trend: T + '연이율(APR)과 실효이자율(EAR)',
    p: { a: 0.12, m: 12, b: 0.124, c: 0.119 },
    vary: R => { const a = R.pick([0.06, 0.08, 0.1, 0.12]); return { a, m: R.pick([4, 12]), b: +(a + R.pick([0.002, 0.004, 0.006])).toFixed(3), c: +(a - R.pick([0.001, 0.002, 0.003])).toFixed(3) }; },
    calc: p => { const x = pct(Math.pow(1 + p.a / p.m, p.m) - 1), y = pct(p.b), z = pct(Math.exp(p.c) - 1), best = Math.max(x, y, z); return { x, y, z, best }; },
    stem: p => ask(`투자자 박서연 씨는 1년 동안 여유자금을 맡길 예금 상품 세 가지를 비교하고 있다.`, null, '세 상품 중 연 실효이자율이 가장 높은 상품의 연 실효이자율(%)에 가장 가까운 것은?', '중도해지는 없고 세금은 고려하지 않는다') .replace('<p>세 상품', tbl(['상품', '표시 연이율', '이자 계산 방식'], [['A', pc(p.a), p.m === 4 ? '분기마다 복리' : '매월 복리'], ['B', pc(p.b), '연 1회 복리'], ['C', pc(p.c), '연속복리']]) + '<p>세 상품'),
    val: c => c.best, dp: 2, u: '%',
    wrong: (p, c) => [c.x, c.y, c.z, pct(Math.max(p.a, p.b, p.c)), pct(Math.pow(1 + p.a / 2, 2) - 1)],
    sol: (p, c) => `A: (1 + ${p.a}/${p.m})^${p.m} − 1 = ${c.x.toFixed(2)}%<br>B: ${c.y.toFixed(2)}%<br>C: e^${p.c} − 1 = ${c.z.toFixed(2)}%<br>가장 높은 값 = <b>${c.best.toFixed(2)}%</b>` });

  /* ───────── 자본예산 ───────── */
  add({ id: 'f1-cb-npv', unit: 'cb', title: '영업자료로 추정한 투자안의 NPV', trend: T + '현금흐름 추정과 NPV',
    p: { I: 3000, S: [2500, 2800, 2600], C: [1100, 1200, 1150], t: 0.25, r: 0.1, survey: 200 },
    vary: R => { const I = R.int(2000, 5000, 100), S = [0, 1, 2].map(() => Math.round(I * R.f(0.7, 1, 0.05) / 10) * 10); return { I, S, C: S.map(s => Math.round(s * R.f(0.35, 0.55, 0.05) / 10) * 10), t: R.pick([0.2, 0.25, 0.3]), r: R.pick([0.08, 0.1, 0.12]), survey: R.int(100, 400, 50) }; },
    calc: p => { const D = p.I / 3, ocf = p.S.map((s, i) => (s - p.C[i]) * (1 - p.t) + p.t * D), pv = ocf.reduce((a, x, i) => a + x * r4(pvif(p.r, i + 1)), 0); return { D, ocf, pv, npv: pv - p.I }; },
    stem: p => ask(`㈜세온전자는 신제품 생산라인 투자를 검토하고 있다. 관련 자료는 다음과 같다.`, [
      `생산설비 구입가격은 ${fmt(p.I)}만원이며 현재 시점에 전액 지급한다. 내용연수 3년, 잔존가치 0으로 정액법 상각하고 3년 후 처분가치는 없다.`,
      `신제품 시장조사비 ${fmt(p.survey)}만원은 지난달 이미 지출하였다.`,
      `연도별 매출액과 감가상각비를 제외한 현금영업비용(만원)은 아래 표와 같다.`,
      `법인세율은 ${pc(p.t)}, 이 투자안의 자본비용은 ${pc(p.r)}이다.`,
    ], '이 투자안의 순현재가치(NPV)에 가장 가까운 것은?', '현금흐름은 매년 말에 발생하며, 순운전자본은 없다') + tbl(['구분', '1년', '2년', '3년'], [['매출액', ...p.S.map(x => fmt(x))], ['현금영업비용', ...p.C.map(x => fmt(x))], [`PVIF(${pc(p.r)}, n)`, ...[1, 2, 3].map(t => r4(pvif(p.r, t)).toFixed(4))]]),
    val: c => c.npv, dp: 0, u: '만원',
    wrong: (p, c) => { const d = t => r4(pvif(p.r, t)); return [p.S.reduce((a, s, i) => a + (s - p.C[i]) * (1 - p.t) * d(i + 1), 0) - p.I, p.S.reduce((a, s, i) => a + (s - p.C[i] - c.D) * (1 - p.t) * d(i + 1), 0) - p.I, c.ocf.reduce((a, b) => a + b, 0) - p.I, c.npv - p.survey]; },
    sol: (p, c) => `감가상각비 = ${fmt(p.I)}/3 = ${fmt(c.D, 2)}, 영업현금흐름 = (매출 − 현금비용)(1 − t) + t × 감가상각비<br>${c.ocf.map((x, i) => `${i + 1}년 ${fmt(x, 2)}`).join(', ')}<br>NPV = ${c.ocf.map((x, i) => `${fmt(x, 2)}×${r4(pvif(p.r, i + 1)).toFixed(4)}`).join(' + ')} − ${fmt(p.I)} = <b>${fmt(c.npv, 2)}</b> (시장조사비는 매몰원가)` });

  add({ id: 'f1-cb-irr2', unit: 'cb', title: '2년 투자안의 IRR', trend: T + 'IRR',
    p: { I: 1000, c1: 500, c2: 720, k: 0.1 },
    vary: R => { for (;;) { const I = R.int(800, 2000, 100), c1 = Math.round(I * R.f(0.3, 0.6, 0.05) / 10) * 10, c2 = Math.round(I * R.f(0.6, 0.9, 0.05) / 10) * 10; if (c1 + c2 > I * 1.1) return { I, c1, c2, k: R.pick([0.08, 0.1, 0.12]) }; } },
    calc: p => { const y = (p.c1 + Math.sqrt(p.c1 * p.c1 + 4 * p.I * p.c2)) / (2 * p.I); return { irr: pct(y - 1), npv: -p.I + p.c1 / (1 + p.k) + p.c2 / (1 + p.k) ** 2 }; },
    stem: (p, c) => ask(`㈜대한물류는 자동 분류기 도입안을 검토하고 있다. 도입안의 현금흐름과 관련 정보는 다음과 같다.`, [
      `현재 시점에 분류기 구입비 ${fmt(p.I)}만원이 지출된다.`,
      `1년 말에 ${fmt(p.c1)}만원, 2년 말에 ${fmt(p.c2)}만원의 세후 현금유입이 발생하며 이후 현금흐름은 없다.`,
      `회사의 자본비용은 ${pc(p.k)}이며, 이 할인율로 계산한 도입안의 NPV는 ${fmt(c.npv, 1)}만원이다.`,
    ], '이 도입안의 내부수익률(IRR)에 가장 가까운 것은?'),
    val: c => c.irr, dp: 2, u: '%',
    wrong: (p, c) => [pct(((p.c1 + p.c2) / p.I - 1) / 2), pct((p.c1 + p.c2 - p.I) / p.I), pct(p.k) + c.npv / p.I * 100, pct(Math.sqrt((p.c1 + p.c2) / p.I) - 1)],
    sol: (p, c) => `${fmt(p.I)}(1+IRR)² − ${fmt(p.c1)}(1+IRR) − ${fmt(p.c2)} = 0<br>1+IRR = [${p.c1} + √(${p.c1}² + 4×${p.I}×${p.c2})] / (2×${p.I}) → IRR = <b>${c.irr.toFixed(2)}%</b> (자본비용·NPV 정보는 IRR 계산에 필요 없음)` });

  add({ id: 'f1-cb-payback', unit: 'cb', title: '회수기간', trend: T + '회수기간법',
    p: { I: 3000, cf: [800, 1000, 1200, 1500], k: 0.1, target: 3 },
    vary: R => { for (;;) { const I = R.int(2000, 5000, 100), cf = [0.2, 0.25, 0.3, 0.4].map(b => Math.round(I * (b + R.f(0, 0.15, 0.01)) / 10) * 10); const s3 = cf[0] + cf[1] + cf[2]; if (s3 > I && cf[0] + cf[1] < I) return { I, cf, k: R.pick([0.08, 0.1, 0.12]), target: R.pick([2.5, 3, 3.5]) }; } },
    calc: p => { let cum = 0; for (let i = 0; i < 4; i++) { if (cum + p.cf[i] >= p.I) return { pb: i + (p.I - cum) / p.cf[i] }; cum += p.cf[i]; } return { pb: 4 }; },
    stem: p => ask(`㈜미래식품은 투자안을 회수기간법으로 먼저 걸러낸 뒤 NPV법으로 최종 결정한다. 검토 중인 투자안 X의 자료는 다음과 같다.`, [
      `현재 시점 투자액: ${fmt(p.I)}만원`,
      `회사의 자본비용: ${pc(p.k)}`,
      `회사가 정한 목표 회수기간: ${p.target}년`,
      `연도별 세후 현금유입은 아래 표와 같으며, 각 연도 안에서는 고르게 발생한다.`,
    ], '투자안 X의 (할인하지 않은) 회수기간에 가장 가까운 것은?') + tbl(['구분', '1년', '2년', '3년', '4년'], [['현금유입(만원)', ...p.cf.map(x => fmt(x))]]),
    val: c => c.pb, dp: 2, u: '년',
    wrong: (p, c) => { let cum = 0, dpb = null; for (let i = 0; i < 4 && dpb == null; i++) { const v = p.cf[i] / (1 + p.k) ** (i + 1); if (cum + v >= p.I) dpb = i + (p.I - cum) / v; cum += v; } return [Math.ceil(c.pb), p.I / (p.cf.reduce((a, b) => a + b, 0) / 4), dpb == null ? c.pb + 0.7 : dpb, c.pb + 0.4]; },
    sol: (p, c) => `누적 현금흐름: ${p.cf.reduce((a, x, i) => (a.push((a[i - 1] || 0) + x), a), []).map(x => fmt(x)).join(' → ')}<br>${Math.floor(c.pb)}년 + 남은 금액 ÷ ${Math.floor(c.pb) + 1}년 현금흐름 = <b>${c.pb.toFixed(2)}년</b> (자본비용은 할인회수기간에만 쓰임)` });

  add({ id: 'f1-cb-ocf', unit: 'cb', title: '판매 자료로 구한 영업현금흐름', trend: T + '현금흐름 추정',
    p: { Q: 20000, P: 3000, V: 1600, F: 900, D: 600, int: 240, t: 0.25 },
    vary: R => { const P = R.int(2000, 5000, 100); return { Q: R.int(10000, 30000, 1000), P, V: Math.round(P * R.f(0.4, 0.6, 0.05) / 100) * 100, F: R.int(500, 1500, 50), D: R.int(300, 1200, 50), int: R.int(100, 500, 20), t: R.pick([0.2, 0.25, 0.3]) }; },
    calc: p => { const S = p.Q * p.P / 10000, VC = p.Q * p.V / 10000; return { S, VC, ocf: (S - VC - p.F) * (1 - p.t) + p.t * p.D }; },
    stem: p => ask(`㈜한결테크는 신규 공장을 가동할 경우 매년 다음과 같은 영업 성과가 예상된다.`, [
      `연간 판매량 ${fmt(p.Q)}개, 단위당 판매가격 ${fmt(p.P)}원, 단위당 변동비 ${fmt(p.V)}원`,
      `감가상각비를 제외한 연간 고정 현금영업비용 ${fmt(p.F)}만원`,
      `연간 감가상각비 ${fmt(p.D)}만원`,
      `공장 건설자금 차입에 따른 연간 이자비용 ${fmt(p.int)}만원`,
      `법인세율 ${pc(p.t)}`,
    ], '자본예산을 위한 이 공장의 연간 영업현금흐름(만원)에 가장 가까운 것은?', '이자비용은 할인율에 반영되어 있다'),
    val: c => c.ocf, dp: 0, u: '만원',
    wrong: (p, c) => [(c.S - c.VC - p.F - p.D) * (1 - p.t), (c.S - c.VC - p.F) * (1 - p.t), (c.S - c.VC - p.F - p.D - p.int) * (1 - p.t) + p.D, (c.S - c.VC - p.F - p.int) * (1 - p.t) + p.t * p.D],
    sol: (p, c) => `매출 ${fmt(c.S)}만원, 변동비 ${fmt(c.VC)}만원<br>OCF = (매출 − 변동비 − 고정 현금비용)(1 − t) + t × 감가상각비 = (${fmt(c.S)} − ${fmt(c.VC)} − ${fmt(p.F)})×${1 - p.t} + ${p.t}×${fmt(p.D)} = <b>${fmt(c.ocf, 2)}</b> (이자비용 제외)` });

  add({ id: 'f1-cb-eac', unit: 'cb', title: '수명이 다른 두 설비 비교: 등가연간비용(EAC)', trend: T + 'EAC·반복투자',
    p: { IA: 6000, nA: 4, mA: 500, IB: 4500, nB: 3, mB: 700, r: 0.1 },
    vary: R => { for (;;) { const p = { IA: R.int(4000, 10000, 500), nA: R.pick([4, 5]), mA: R.int(200, 800, 50), IB: R.int(3000, 7000, 500), nB: R.pick([2, 3]), mB: R.int(300, 1000, 50), r: R.pick([0.08, 0.1, 0.12]) }; const a = p.IA / r4(pvifa(p.r, p.nA)) + p.mA, b = p.IB / r4(pvifa(p.r, p.nB)) + p.mB; if (Math.abs(a - b) > Math.max(a, b) * 0.03) return p; } },
    calc: p => { const a = p.IA / r4(pvifa(p.r, p.nA)) + p.mA, b = p.IB / r4(pvifa(p.r, p.nB)) + p.mB; return { a, b, best: Math.min(a, b) }; },
    stem: p => ask(`㈜동진화학은 같은 기능을 하는 설비 A와 B 중 하나를 골라, 수명이 다하면 같은 설비로 계속 교체하며 사용할 계획이다. 두 설비의 자료는 다음과 같다.`, null, '등가연간비용(EAC)으로 비교할 때 더 유리한 설비의 등가연간비용(만원)에 가장 가까운 것은?', `자본비용은 ${pc(p.r)}이며 잔존가치와 세금은 없다`)
      .replace('<p>등가연간', tbl(['구분', '구입가격', '수명', '매년 말 운영비'], [['설비 A', fmt(p.IA) + '만원', p.nA + '년', fmt(p.mA) + '만원'], ['설비 B', fmt(p.IB) + '만원', p.nB + '년', fmt(p.mB) + '만원']]) + pvRow(p.r, 5) + '<p>등가연간'),
    val: c => c.best, dp: 0, u: '만원',
    wrong: (p, c) => [Math.max(c.a, c.b), p.IA / p.nA + p.mA, p.IB / p.nB + p.mB, Math.min(p.IA + p.mA * r4(pvifa(p.r, p.nA)), p.IB + p.mB * r4(pvifa(p.r, p.nB))) / 4],
    sol: (p, c) => `EAC = 구입가격 ÷ PVIFA + 운영비<br>A: ${fmt(p.IA)} ÷ ${r4(pvifa(p.r, p.nA)).toFixed(4)} + ${fmt(p.mA)} = ${fmt(c.a, 2)}<br>B: ${fmt(p.IB)} ÷ ${r4(pvifa(p.r, p.nB)).toFixed(4)} + ${fmt(p.mB)} = ${fmt(c.b, 2)}<br>더 작은 쪽 = <b>${fmt(c.best, 2)}</b> (수명이 달라 총비용 현가로 비교하면 안 됨)` });

  /* ───────── 포트폴리오 · CAPM ───────── */
  add({ id: 'f1-pf-var2', unit: 'pf', title: '두 자산 포트폴리오의 표준편차', trend: T + '포트폴리오 위험',
    p: { amt: 6000, tot: 10000, eA: 0.1, eB: 0.16, sA: 0.2, sB: 0.3, rho: 0.2 },
    vary: R => { const tot = R.pick([5000, 10000, 20000]); return { amt: tot * R.pick([0.3, 0.4, 0.5, 0.6, 0.7]), tot, eA: R.pick([0.08, 0.1, 0.12]), eB: R.pick([0.14, 0.16, 0.18]), sA: R.pick([0.15, 0.2, 0.25]), sB: R.pick([0.3, 0.35, 0.4]), rho: R.pick([-0.4, -0.2, 0, 0.2, 0.4, 0.5]) }; },
    calc: p => { const w = p.amt / p.tot; return { w, s: pct(Math.sqrt(w * w * p.sA * p.sA + (1 - w) ** 2 * p.sB * p.sB + 2 * w * (1 - w) * p.rho * p.sA * p.sB)) }; },
    stem: p => ask(`투자자 이현수 씨는 ${fmt(p.tot)}만원 중 ${fmt(p.amt)}만원을 주식 A에, 나머지를 주식 B에 투자하였다. 두 주식에 관한 자료는 다음과 같다.`, null, '이 포트폴리오 수익률의 표준편차에 가장 가까운 것은?')
      .replace('<p>이 포트폴리오', tbl(['구분', '기대수익률', '표준편차'], [['주식 A', pc(p.eA), pc(p.sA)], ['주식 B', pc(p.eB), pc(p.sB)]]) + `<p>두 주식 수익률의 상관계수는 ${p.rho}이다.</p><p>이 포트폴리오`),
    val: c => c.s, dp: 2, u: '%',
    wrong: (p, c) => { const w = c.w; return [pct(w * p.sA + (1 - w) * p.sB), pct(Math.sqrt(w ** 2 * p.sA ** 2 + (1 - w) ** 2 * p.sB ** 2)), pct(Math.sqrt(Math.abs(w ** 2 * p.sA ** 2 + (1 - w) ** 2 * p.sB ** 2 - 2 * w * (1 - w) * p.rho * p.sA * p.sB))), pct(w * p.eA + (1 - w) * p.eB)]; },
    sol: (p, c) => `투자비율 A ${c.w}, B ${+(1 - c.w).toFixed(2)}<br>σp² = ${c.w}²×${p.sA}² + ${+(1 - c.w).toFixed(2)}²×${p.sB}² + 2×${c.w}×${+(1 - c.w).toFixed(2)}×${p.rho}×${p.sA}×${p.sB}<br>σp = <b>${c.s.toFixed(2)}%</b> (기대수익률은 표준편차 계산에 필요 없음)` });

  add({ id: 'f1-pf-mvp', unit: 'pf', title: '최소분산포트폴리오의 투자비율', trend: T + '최소분산포트폴리오',
    p: { eA: 0.08, eB: 0.14, sA: 0.2, sB: 0.3, rho: 0.25 },
    vary: R => ({ eA: R.pick([0.06, 0.08, 0.1]), eB: R.pick([0.12, 0.14, 0.16]), sA: R.pick([0.1, 0.15, 0.2, 0.25]), sB: R.pick([0.3, 0.35, 0.4]), rho: R.pick([-0.5, -0.2, 0, 0.2, 0.3]) }),
    calc: p => ({ w: pct((p.sB ** 2 - p.rho * p.sA * p.sB) / (p.sA ** 2 + p.sB ** 2 - 2 * p.rho * p.sA * p.sB)) }),
    stem: p => ask(`위험회피형 투자자가 위험자산 A와 B만으로 포트폴리오를 구성하려 한다. 두 자산의 자료는 아래와 같고, 공매도는 허용되지 않는다.`, null, '분산이 가장 작은 포트폴리오(최소분산포트폴리오)를 만들 때 자산 A의 투자비율에 가장 가까운 것은?')
      .replace('<p>분산이', tbl(['구분', '기대수익률', '표준편차'], [['자산 A', pc(p.eA), pc(p.sA)], ['자산 B', pc(p.eB), pc(p.sB)]]) + `<p>두 자산 수익률의 상관계수는 ${p.rho}이다.</p><p>분산이`),
    val: c => c.w, dp: 2, u: '%',
    wrong: (p, c) => [pct(p.sB / (p.sA + p.sB)), pct(p.sB ** 2 / (p.sA ** 2 + p.sB ** 2)), 100 - c.w, pct(p.sA / (p.sA + p.sB))],
    sol: (p, c) => `wA = (σB² − ρσAσB) / (σA² + σB² − 2ρσAσB) = <b>${c.w.toFixed(2)}%</b>` });

  add({ id: 'f1-pf-capm', unit: 'pf', title: '상관계수로 구한 베타와 CAPM 요구수익률', trend: T + 'CAPM·베타',
    p: { rho: 0.6, sx: 0.3, sm: 0.2, rf: 0.03, rm: 0.1, P0: 20000, P1: 21000, div: 600 },
    vary: R => ({ rho: R.pick([0.4, 0.5, 0.6, 0.7, 0.8]), sx: R.pick([0.25, 0.3, 0.35, 0.4]), sm: R.pick([0.15, 0.2, 0.25]), rf: R.pick([0.02, 0.03, 0.04]), rm: R.pick([0.08, 0.1, 0.12]), P0: R.int(10000, 50000, 1000), P1: 0, div: R.int(200, 1500, 100) }),
    calc: p => { const b = p.rho * p.sx / p.sm; return { b, er: pct(p.rf + b * (p.rm - p.rf)) }; },
    stem: p => ask(`주식 X와 시장포트폴리오에 관한 자료는 다음과 같다. CAPM이 성립한다고 가정한다.`, [
      `주식 X 수익률의 표준편차 ${pc(p.sx)}, 시장포트폴리오 수익률의 표준편차 ${pc(p.sm)}`,
      `주식 X와 시장포트폴리오 수익률의 상관계수 ${p.rho}`,
      `무위험이자율 ${pc(p.rf)}, 시장포트폴리오의 기대수익률 ${pc(p.rm)}`,
      `주식 X의 현재 주가는 ${fmt(p.P0)}원이며, 1년 후 주당 ${fmt(p.div)}원의 배당이 예상된다.`,
    ], 'CAPM에 따른 주식 X의 균형 기대수익률(요구수익률)에 가장 가까운 것은?'),
    val: c => c.er, dp: 2, u: '%',
    wrong: (p, c) => [pct(p.rf + p.rho * p.sm / p.sx * (p.rm - p.rf)), pct(p.rf + p.rho * (p.rm - p.rf)), pct(p.rf + c.b * p.rm), pct(c.b * p.rm)],
    sol: (p, c) => `β = ρ × σX / σM = ${p.rho}×${p.sx}/${p.sm} = ${c.b.toFixed(4)}<br>E(R) = ${pc(p.rf)} + ${c.b.toFixed(4)}×(${pc(p.rm)} − ${pc(p.rf)}) = <b>${c.er.toFixed(2)}%</b> (주가·배당 정보는 요구수익률 계산에 필요 없음)` });

  add({ id: 'f1-pf-cml', unit: 'pf', title: 'CML 위 최적 포트폴리오의 기대수익률', trend: T + 'CML',
    p: { rf: 0.03, rm: 0.11, sm: 0.2, sp: 0.15, eY: 0.13, sY: 0.3 },
    vary: R => ({ rf: R.pick([0.02, 0.03, 0.04]), rm: R.pick([0.09, 0.1, 0.11, 0.12]), sm: R.pick([0.16, 0.2, 0.25]), sp: R.pick([0.1, 0.12, 0.15, 0.3]), eY: R.pick([0.12, 0.13, 0.14]), sY: R.pick([0.28, 0.3, 0.35]) }),
    calc: p => ({ er: pct(p.rf + (p.rm - p.rf) / p.sm * p.sp), w: p.sp / p.sm }),
    stem: p => ask(`자본시장선(CML)이 성립하는 시장에서 투자자 최민준 씨는 무위험자산과 시장포트폴리오를 결합해 포트폴리오를 만든다. 관련 자료는 다음과 같다.`, [
      `무위험이자율 ${pc(p.rf)}`,
      `시장포트폴리오: 기대수익률 ${pc(p.rm)}, 표준편차 ${pc(p.sm)}`,
      `개별 주식 Y: 기대수익률 ${pc(p.eY)}, 표준편차 ${pc(p.sY)}`,
      `최민준 씨가 감수하려는 포트폴리오의 표준편차는 ${pc(p.sp)}이다.`,
    ], '최민준 씨가 구성하는 포트폴리오의 기대수익률에 가장 가까운 것은?'),
    val: c => c.er, dp: 2, u: '%',
    wrong: p => [pct(p.rm * p.sp / p.sm), pct(p.rf + (p.rm - p.rf) * p.sp), pct(p.rf + (p.eY - p.rf) / p.sY * p.sp), pct(p.rm + (p.rm - p.rf) / p.sm * p.sp)],
    sol: (p, c) => `CML: E(Rp) = rf + [(E(Rm) − rf)/σm]×σp = ${pc(p.rf)} + (${pc(p.rm - p.rf)}/${pc(p.sm)})×${pc(p.sp)} = <b>${c.er.toFixed(2)}%</b><br>(시장포트폴리오 투자비율 ${(c.w * 100).toFixed(1)}%, 개별 주식 Y 자료는 쓰지 않음)` });

  add({ id: 'f1-pf-jensen', unit: 'pf', title: '세 펀드의 젠센 알파 비교', trend: T + '성과평가 지표',
    p: { f: [[0.14, 1.2, 0.25], [0.11, 0.8, 0.18], [0.16, 1.5, 0.3]], rf: 0.03, rm: 0.1 },
    vary: R => { for (;;) { const f = [0, 1, 2].map(() => [R.f(0.06, 0.18, 0.005), R.pick([0.6, 0.8, 1, 1.2, 1.5]), R.pick([0.15, 0.2, 0.25, 0.3])]), p = { f, rf: R.pick([0.02, 0.03, 0.04]), rm: R.pick([0.08, 0.1, 0.12]) }; const a = f.map(x => x[0] - (p.rf + x[1] * (p.rm - p.rf))).sort((x, y) => y - x); if (a[0] - a[1] > 0.004) return p; } },
    calc: p => { const a = p.f.map(x => pct(x[0] - (p.rf + x[1] * (p.rm - p.rf)))); return { a, best: Math.max(...a) }; },
    stem: p => ask(`다음은 지난 1년간 세 펀드의 운용 성과이다. 같은 기간 무위험이자율은 ${pc(p.rf)}, 시장포트폴리오의 수익률은 ${pc(p.rm)}이었다.`, null, '젠센의 알파(Jensen\'s α)가 가장 큰 펀드의 알파 값에 가장 가까운 것은?')
      .replace('<p>젠센', tbl(['펀드', '실현수익률', '베타', '표준편차'], p.f.map((x, i) => ['ABC'[i], pc(x[0]), x[1], pc(x[2])])) + '<p>젠센'),
    val: c => c.best, dp: 2, u: '%p',
    wrong: (p, c) => [...c.a, pct(Math.max(...p.f.map(x => x[0])) - p.rm), pct(Math.max(...p.f.map(x => (x[0] - p.rf) / x[1])))],
    sol: (p, c) => `α = Rp − [rf + β(Rm − rf)]<br>${p.f.map((x, i) => `${'ABC'[i]}: ${pc(x[0])} − [${pc(p.rf)} + ${x[1]}×${pc(p.rm - p.rf)}] = ${c.a[i].toFixed(2)}%p`).join('<br>')}<br>가장 큰 값 = <b>${c.best.toFixed(2)}%p</b> (표준편차는 샤프지수용)` });

  add({ id: 'f1-pf-r2', unit: 'pf', title: '단일지수모형: 총위험 중 체계적 위험의 비율', trend: T + '단일지수모형',
    p: { b: 1.2, sm: 0.2, si: 0.4, a: 0.01 },
    vary: R => { for (;;) { const p = { b: R.pick([0.6, 0.8, 1, 1.2, 1.4]), sm: R.pick([0.15, 0.2, 0.25]), si: R.pick([0.3, 0.35, 0.4, 0.45, 0.5]), a: R.pick([-0.01, 0, 0.01, 0.02]) }; if (p.b * p.sm < p.si * 0.95) return p; } },
    calc: p => ({ r2: pct(p.b ** 2 * p.sm ** 2 / p.si ** 2) }),
    stem: p => ask(`주식 Y의 수익률이 단일지수모형 R_Y = α + βR_M + ε를 따른다. 회귀분석으로 추정한 자료는 다음과 같다.`, [
      `절편(α) ${p.a}, 베타(β) ${p.b}`,
      `시장지수 수익률의 표준편차 ${pc(p.sm)}`,
      `주식 Y 수익률의 표준편차 ${pc(p.si)}`,
      `잔차(ε)는 시장지수 수익률과 상관이 없다.`,
    ], '주식 Y의 총위험(분산) 중 체계적 위험이 차지하는 비율에 가장 가까운 것은?'),
    val: c => c.r2, dp: 2, u: '%',
    wrong: (p, c) => [pct(p.b * p.sm / p.si), 100 - c.r2, pct(p.b ** 2 * p.sm / p.si), pct(p.b * p.sm ** 2 / p.si ** 2)],
    sol: (p, c) => `체계적 위험 = β²σM² = ${p.b}²×${p.sm}² = ${(p.b ** 2 * p.sm ** 2).toFixed(4)}, 총위험 σY² = ${(p.si ** 2).toFixed(4)}<br>비율 = <b>${c.r2.toFixed(2)}%</b> (= 결정계수 R², 절편은 무관)` });

  add({ id: 'f1-pf-beta3', unit: 'pf', title: '세 주식 포트폴리오의 베타와 기대수익률', trend: T + '포트폴리오 베타',
    p: { amt: [5000, 3000, 2000], b: [0.8, 1.2, 1.5], s: [0.2, 0.3, 0.35], rf: 0.03, rm: 0.1 },
    vary: R => ({ amt: R.pick([[5000, 3000, 2000], [4000, 4000, 2000], [2000, 5000, 3000], [6000, 1000, 3000], [3000, 3000, 4000]]), b: [R.pick([0.6, 0.8, 0.9]), R.pick([1, 1.1, 1.2]), R.pick([1.4, 1.5, 1.8])], s: [R.pick([0.15, 0.2]), R.pick([0.25, 0.3]), R.pick([0.35, 0.4])], rf: R.pick([0.02, 0.03]), rm: R.pick([0.09, 0.1, 0.12]) }),
    calc: p => { const tot = p.amt.reduce((a, b) => a + b, 0), w = p.amt.map(x => x / tot), bp = w.reduce((s, x, i) => s + x * p.b[i], 0); return { w, bp, er: pct(p.rf + bp * (p.rm - p.rf)) }; },
    stem: p => ask(`펀드매니저 정하늘 씨는 다음 세 주식에 총 ${fmt(p.amt.reduce((a, b) => a + b, 0))}만원을 투자하였다. 무위험이자율은 ${pc(p.rf)}, 시장포트폴리오의 기대수익률은 ${pc(p.rm)}이며 CAPM이 성립한다.`, null, '이 포트폴리오의 균형 기대수익률에 가장 가까운 것은?')
      .replace('<p>이 포트폴리오', tbl(['주식', '투자금액', '베타', '표준편차'], p.amt.map((x, i) => ['ABC'[i], fmt(x) + '만원', p.b[i], pc(p.s[i])])) + '<p>이 포트폴리오'),
    val: c => c.er, dp: 2, u: '%',
    wrong: (p, c) => { const ba = (p.b[0] + p.b[1] + p.b[2]) / 3; return [pct(p.rf + ba * (p.rm - p.rf)), pct(c.bp * p.rm), pct(p.rf + c.bp * p.rm), pct(c.bp * (p.rm - p.rf))]; },
    sol: (p, c) => `투자비율 ${c.w.map(x => x.toFixed(2)).join(', ')} → βp = Σwβ = ${c.bp.toFixed(3)}<br>E(Rp) = ${pc(p.rf)} + ${c.bp.toFixed(3)}×${pc(p.rm - p.rf)} = <b>${c.er.toFixed(2)}%</b> (표준편차는 무관)` });

  /* ───────── 채권 ───────── */
  add({ id: 'f1-bd-price', unit: 'bd', title: '이표채의 가격', trend: T + '채권가격',
    p: { c: 0.06, y: 0.08, n: 3, ytmOld: 0.06 },
    vary: R => { for (;;) { const p = { c: R.pick([0.04, 0.05, 0.06, 0.07, 0.08]), y: R.pick([0.05, 0.06, 0.07, 0.08, 0.09]), n: R.pick([2, 3, 4]), ytmOld: 0 }; p.ytmOld = p.c; if (p.c !== p.y) return p; } },
    calc: p => ({ P: 10000 * p.c * r4(pvifa(p.y, p.n)) + 10000 * r4(pvif(p.y, p.n)) }),
    stem: p => ask(`㈜가람건설은 ${p.n === 4 ? '1년 전' : '작년 초'} 다음 조건의 회사채를 액면가로 발행하였고, 이 채권은 현재 잔존만기가 ${p.n}년 남아 있다.`, [
      `액면금액 10,000원, 표면이자율 연 ${pc(p.c)}, 이자는 매년 말 1회 지급`,
      `발행 당시 만기수익률: 연 ${pc(p.ytmOld)}`,
      `최근 신용등급 변화와 금리 상승으로 이 채권의 현재 만기수익률은 연 ${pc(p.y)}이다.`,
    ], '방금 이자를 지급한 직후인 현재 시점에서 이 채권의 가격에 가장 가까운 것은?') + pvRow(p.y, p.n),
    val: c => c.P, dp: 0, u: '원',
    wrong: p => [10000, 10000 * p.c * p.n + 10000 * r4(pvif(p.y, p.n)), 10000 * p.y * r4(pvifa(p.y, p.n)) + 10000 * r4(pvif(p.y, p.n)), 10000 * p.c * r4(pvifa(p.y, p.n)) + 10000 * r4(pvif(p.y, p.n - 1))],
    sol: (p, c) => `P = ${fmt(10000 * p.c)}×PVIFA(${pc(p.y)}, ${p.n}) + 10,000×PVIF(${pc(p.y)}, ${p.n}) = ${fmt(10000 * p.c)}×${r4(pvifa(p.y, p.n)).toFixed(4)} + 10,000×${r4(pvif(p.y, p.n)).toFixed(4)} = <b>${fmt(c.P, 2)}</b> (발행 당시 수익률은 무관)` });

  add({ id: 'f1-bd-dur', unit: 'bd', title: '이표채의 맥컬리 듀레이션', trend: T + '듀레이션',
    p: { c: 0.08, y: 0.1, n: 3 },
    vary: R => ({ c: R.pick([0.05, 0.06, 0.08, 0.1]), y: R.pick([0.06, 0.08, 0.1, 0.12]), n: R.pick([2, 3]) }),
    calc: p => { let pv = 0, w = 0; const rows = []; for (let t = 1; t <= p.n; t++) { const cf = 100 * p.c + (t === p.n ? 100 : 0), v = cf * pvif(p.y, t); pv += v; w += t * v; rows.push([t, cf, v]); } return { D: w / pv, P: pv, rows }; },
    stem: (p, c) => ask(`채권 운용역 한지수 씨는 금리 위험 관리를 위해 보유 채권의 듀레이션을 계산하려 한다. 대상 채권의 조건은 다음과 같다.`, [
      `액면 100, 표면이자율 연 ${pc(p.c)}, 이자는 매년 말 1회 지급`,
      `잔존만기 ${p.n}년, 현재 만기수익률 연 ${pc(p.y)}`,
      `현재 채권가격은 ${c.P.toFixed(4)}이다.`,
    ], '이 채권의 맥컬리 듀레이션(년)에 가장 가까운 것은?'),
    val: c => c.D, dp: 3, u: '년',
    wrong: (p, c) => { let w = 0, s = 0; for (let t = 1; t <= p.n; t++) { const cf = 100 * p.c + (t === p.n ? 100 : 0); w += t * cf; s += cf; } return [p.n, c.D / (1 + p.y), w / s, (1 + p.y) / p.y]; },
    show: v => v.toFixed(3) + '년',
    sol: (p, c) => `D = Σ t × PV(CFt) / P<br>${c.rows.map(([t, cf, v]) => `${t}×${cf}/${(1 + p.y)}^${t} = ${(t * v).toFixed(4)}`).join(', ')}<br>합계 ÷ ${c.P.toFixed(4)} = <b>${c.D.toFixed(3)}년</b>` });

  add({ id: 'f1-bd-dp', unit: 'bd', title: '수정듀레이션으로 본 채권가격 변화율', trend: T + '듀레이션과 가격 민감도',
    p: { D: 4.5, y: 0.08, dy: 50, cx: 25, V: 200 },
    vary: R => ({ D: R.pick([2.5, 3.2, 4, 4.5, 5.6, 7]), y: R.pick([0.05, 0.06, 0.08, 0.1]), dy: R.pick([-100, -50, 30, 50, 100]), cx: R.pick([15, 20, 25, 40]), V: R.int(100, 500, 50) }),
    calc: p => ({ ch: -p.D / (1 + p.y) * (p.dy / 10000) * 100 }),
    stem: p => ask(`㈜온누리보험은 시가 ${fmt(p.V)}억원의 채권 포트폴리오를 보유하고 있다. 이 포트폴리오의 특성은 다음과 같다.`, [
      `맥컬리 듀레이션 ${p.D}년, 볼록성 ${p.cx}`,
      `현재 만기수익률 연 ${pc(p.y)} (연 1회 복리)`,
      `향후 시장금리 변화로 만기수익률이 ${Math.abs(p.dy)}bp ${p.dy > 0 ? '상승' : '하락'}할 것으로 예상된다.`,
    ], '볼록성을 무시하고 수정듀레이션만으로 추정한 이 포트폴리오의 가격 변화율에 가장 가까운 것은?'),
    val: c => c.ch, dp: 3, u: '%',
    wrong: (p, c) => [-p.D * p.dy / 100, -c.ch, -p.D / (1 + p.y) * p.dy / 1000, c.ch + 0.5 * p.cx * (p.dy / 10000) ** 2 * 100 + (p.dy > 0 ? 0.3 : -0.3)],
    show: v => (v > 0 ? '+' : '') + v.toFixed(3) + '%',
    sol: (p, c) => `MD = D/(1+y) = ${p.D}/${1 + p.y} = ${(p.D / (1 + p.y)).toFixed(4)}<br>ΔP/P ≈ −MD × Δy = −${(p.D / (1 + p.y)).toFixed(4)} × ${p.dy / 10000} = <b>${c.ch.toFixed(3)}%</b> (볼록성·보유 금액은 문제 조건상 쓰지 않음)` });

  add({ id: 'f1-bd-fwd', unit: 'bd', title: '무이표채 가격으로 구한 내재 선도이자율', trend: T + '이자율 기간구조',
    p: { P1: 9615, P2: 9070, P3: 8548 },
    vary: R => { for (;;) { const s1 = R.f(0.02, 0.07, 0.005), s2 = R.f(0.02, 0.08, 0.005), s3 = R.f(0.03, 0.08, 0.005); if (Math.abs(s1 - s2) >= 0.005) return { P1: Math.round(10000 / (1 + s1)), P2: Math.round(10000 / (1 + s2) ** 2), P3: Math.round(10000 / (1 + s3) ** 3) }; } },
    calc: p => { const s1 = 10000 / p.P1 - 1, s2 = Math.sqrt(10000 / p.P2) - 1; return { s1, s2, f: pct(p.P1 / p.P2 - 1) }; },
    stem: p => ask(`현재 채권시장에서 거래되는 무위험 무이표채(액면 10,000원)의 가격은 다음과 같다.`, null, '1년 후부터 2년 후까지 1년간 적용되는 내재 선도이자율에 가장 가까운 것은?', '이자율은 연 1회 복리 기준이다')
      .replace('<p>1년 후', tbl(['만기', '1년', '2년', '3년'], [['가격(원)', fmt(p.P1), fmt(p.P2), fmt(p.P3)]]) + '<p>1년 후'),
    val: c => c.f, dp: 2, u: '%',
    wrong: (p, c) => [pct(c.s2), pct((c.s1 + c.s2) / 2), pct(c.s2 - c.s1), pct(10000 / p.P2 - 1) / 2 + 1.2],
    sol: (p, c) => `s₁ = 10,000/${fmt(p.P1)} − 1 = ${pc(c.s1)}, s₂ = (10,000/${fmt(p.P2)})^(1/2) − 1 = ${pc(c.s2)}<br>1 + f₁,₂ = (1+s₂)²/(1+s₁) = P₁/P₂ = ${fmt(p.P1)}/${fmt(p.P2)} → f = <b>${c.f.toFixed(2)}%</b> (3년 가격은 쓰지 않음)` });

  add({ id: 'f1-bd-boot', unit: 'bd', title: '부트스트래핑: 이표채 가격으로 2년 현물이자율 구하기', trend: T + '현물이자율 추정',
    p: { s1: 0.05, c: 0.06, B: 10000 },
    vary: R => ({ s1: R.pick([0.03, 0.04, 0.05, 0.06]), c: R.pick([0.04, 0.05, 0.06, 0.07, 0.08]), B: R.int(9700, 10300, 50) }),
    calc: p => { const s2 = Math.sqrt(10000 * (1 + p.c) / (p.B - 10000 * p.c / (1 + p.s1))) - 1; const ytm = root(y => 10000 * p.c / (1 + y) + 10000 * (1 + p.c) / (1 + y) ** 2 - p.B, -0.5, 1); return { s2: pct(s2), ytm: pct(ytm) }; },
    stem: p => ask(`무위험 국채시장에 관한 자료는 다음과 같다. 차익거래 기회는 없다고 가정한다.`, [
      `1년 만기 무이표 국채의 만기수익률(1년 현물이자율): 연 ${pc(p.s1)}`,
      `2년 만기 이표 국채: 액면 10,000원, 표면이자율 연 ${pc(p.c)}(매년 말 지급), 현재 가격 ${fmt(p.B)}원`,
    ], '2년 만기 현물이자율에 가장 가까운 것은?', '이자율은 연 1회 복리 기준이다'),
    val: c => c.s2, dp: 2, u: '%',
    wrong: (p, c) => [c.ytm, pct(p.s1), (c.s2 + pct(p.s1)) / 2, 2 * c.ytm - pct(p.s1)],
    sol: (p, c) => `${fmt(p.B)} = ${fmt(10000 * p.c)}/${1 + p.s1} + ${fmt(10000 * (1 + p.c))}/(1+s₂)² → (1+s₂)² = ${fmt(10000 * (1 + p.c))} / (${fmt(p.B)} − ${fmt(10000 * p.c / (1 + p.s1), 2)})<br>s₂ = <b>${c.s2.toFixed(2)}%</b> (참고: 이 이표채의 만기수익률은 ${c.ytm.toFixed(2)}%)` });

  /* ───────── 주식가치평가 ───────── */
  const kOf = p => p.rf + p.beta * p.mrp;
  const gordon = p => { const g = p.b * p.roe, k = kOf(p); return { g, k, P: p.e1 * (1 - p.b) / (k - g) }; };
  const svVary = R => { for (;;) { const p = { e1: R.int(1000, 5000, 100), b: R.pick([0.3, 0.4, 0.5, 0.6]), roe: R.pick([0.1, 0.12, 0.15, 0.2]), rf: R.pick([0.02, 0.03, 0.04]), beta: R.pick([0.8, 1, 1.2, 1.5]), mrp: R.pick([0.06, 0.07, 0.08]), bv: 0 }; p.bv = Math.round(p.e1 / p.roe / 100) * 100; const k = kOf(p); if (k - p.b * p.roe >= 0.02 && Math.abs(p.roe - k) > 0.005) return p; } };
  const svStem = p => [
    `㈜한결의 다음 연도 주당순이익(EPS₁)은 ${fmt(p.e1)}원으로 예상되며, 현재 주당 장부가치는 ${fmt(p.bv)}원이다.`,
    `이 회사는 매년 이익의 ${pc(p.b)}를 유보하여 자기자본이익률(ROE) ${pc(p.roe)}로 재투자하고, 나머지는 현금배당하며 이 정책을 영구히 유지한다.`,
    `무위험이자율 ${pc(p.rf)}, 시장위험프리미엄 ${pc(p.mrp)}, ㈜한결 주식의 베타는 ${p.beta}이며 CAPM이 성립한다.`,
  ];
  add({ id: 'f1-sv-gordon', unit: 'sv', title: '항상성장모형으로 구한 주가', trend: T + '배당평가모형',
    p: { e1: 3000, b: 0.4, roe: 0.15, rf: 0.03, beta: 1.2, mrp: 0.075, bv: 20000 }, vary: svVary, calc: gordon,
    stem: p => ask('다음은 ㈜한결의 주식 가치평가 자료이다.', svStem(p), '항상성장 배당평가모형에 따른 ㈜한결의 현재 적정 주가에 가장 가까운 것은?'),
    val: c => c.P, dp: 0, u: '원',
    wrong: (p, c) => [p.e1 / c.k, p.e1 * (1 - p.b) / c.k, p.e1 / (c.k - c.g), p.e1 * (1 - p.b) * (1 + c.g) / (c.k - c.g)],
    sol: (p, c) => `k = ${pc(p.rf)} + ${p.beta}×${pc(p.mrp)} = ${pc(c.k)}, g = b × ROE = ${p.b}×${p.roe} = ${pc(c.g)}<br>D₁ = ${fmt(p.e1)}×(1−${p.b}) = ${fmt(p.e1 * (1 - p.b))} → P₀ = D₁/(k − g) = <b>${fmt(c.P, 2)}</b>` });

  add({ id: 'f1-sv-pvgo', unit: 'sv', title: '성장기회의 현재가치(PVGO)', trend: T + 'PVGO',
    p: { e1: 2000, b: 0.5, roe: 0.18, rf: 0.03, beta: 1.125, mrp: 0.08, bv: 11100 }, vary: svVary, calc: gordon,
    stem: p => ask('다음은 ㈜한결의 주식 가치평가 자료이다.', svStem(p), '항상성장모형으로 구한 주가를 기준으로 할 때, 이 주식의 성장기회의 현재가치(PVGO)에 가장 가까운 것은?'),
    val: (c, p) => c.P - p.e1 / c.k, dp: 0, u: '원',
    wrong: (p, c) => [c.P, p.e1 / c.k, p.e1 / c.k - c.P, c.P - p.e1 * (1 - p.b) / c.k],
    sol: (p, c) => `k = ${pc(c.k)}, g = ${pc(c.g)} → P₀ = ${fmt(c.P, 2)}<br>무성장 가치 EPS₁/k = ${fmt(p.e1 / c.k, 2)} → PVGO = <b>${fmt(c.P - p.e1 / c.k, 2)}</b> (ROE ${p.roe > c.k ? '>' : '<'} k 이므로 ${p.roe > c.k ? '양수' : '음수'})` });

  add({ id: 'f1-sv-per', unit: 'sv', title: '이론적 PER', trend: T + 'PER',
    p: { e1: 2500, b: 0.6, roe: 0.15, rf: 0.04, beta: 1.125, mrp: 0.08, bv: 16700 }, vary: svVary, calc: gordon,
    stem: p => ask('다음은 ㈜한결의 주식 가치평가 자료이다.', svStem(p), '항상성장모형에 따른 ㈜한결의 이론적 주가수익비율(P₀/EPS₁)에 가장 가까운 것은?'),
    val: (c, p) => (1 - p.b) / (c.k - c.g), dp: 2, u: '배',
    wrong: (p, c) => [1 / c.k, (1 - p.b) / c.k, p.b / (c.k - c.g), (1 - p.b) * (1 + c.g) / (c.k - c.g)],
    sol: (p, c) => `k = ${pc(c.k)}, g = ${pc(c.g)}<br>PER = (1 − b)/(k − g) = ${+(1 - p.b).toFixed(2)}/(${+c.k.toFixed(4)} − ${+c.g.toFixed(4)}) = <b>${((1 - p.b) / (c.k - c.g)).toFixed(2)}배</b>` });

  /* ───────── 자본구조 · 기업재무 ───────── */
  add({ id: 'f1-cf-mmv', unit: 'cf', title: 'MM(1963) 법인세가 있을 때 자기자본 가치', trend: T + 'MM 수정이론',
    p: { ebit: 1000, rho: 0.12, D: 3000, t: 0.25, kd: 0.06 },
    vary: R => ({ ebit: R.int(500, 2000, 50), rho: R.pick([0.1, 0.12, 0.15]), D: R.int(1000, 4000, 100), t: R.pick([0.2, 0.25, 0.3]), kd: R.pick([0.05, 0.06, 0.07]) }),
    calc: p => { const VU = p.ebit * (1 - p.t) / p.rho, VL = VU + p.t * p.D; return { VU, VL, E: VL - p.D }; },
    stem: p => ask(`영업위험이 같은 두 기업 U와 L이 있다. MM(1963)의 수정이론이 성립한다고 가정할 때 관련 자료는 다음과 같다.`, [
      `두 기업은 매년 영구히 같은 영업이익(EBIT) ${fmt(p.ebit)}만원을 얻으며, 이익은 전액 배당한다.`,
      `기업 U는 부채가 없고, 자기자본비용은 ${pc(p.rho)}이다.`,
      `기업 L은 액면이자율 ${pc(p.kd)}인 영구채 ${fmt(p.D)}만원을 발행하고 있으며, 부채의 시장가치는 액면과 같다.`,
      `법인세율은 ${pc(p.t)}이다.`,
    ], '기업 L의 자기자본 가치(만원)에 가장 가까운 것은?'),
    val: c => c.E, dp: 0, u: '만원',
    wrong: (p, c) => [c.VL, c.VU - p.D, p.ebit / p.rho - p.D, c.VU],
    sol: (p, c) => `VU = EBIT(1−t)/ρ = ${fmt(p.ebit)}×${1 - p.t}/${p.rho} = ${fmt(c.VU, 2)}<br>VL = VU + tD = ${fmt(c.VU, 2)} + ${p.t}×${fmt(p.D)} = ${fmt(c.VL, 2)}<br>E = VL − D = <b>${fmt(c.E, 2)}</b>` });

  add({ id: 'f1-cf-mmke', unit: 'cf', title: 'MM(1963) 레버리지 기업의 자기자본비용', trend: T + 'MM 제2명제',
    p: { rho: 0.12, kd: 0.06, t: 0.25, de: 1, V: 8000 },
    vary: R => ({ rho: R.pick([0.1, 0.12, 0.14, 0.15]), kd: R.pick([0.05, 0.06, 0.07]), t: R.pick([0.2, 0.25, 0.3]), de: R.pick([0.5, 0.8, 1, 1.5, 2]), V: R.int(5000, 20000, 1000) }),
    calc: p => ({ ke: pct(p.rho + (p.rho - p.kd) * (1 - p.t) * p.de) }),
    stem: p => ask(`현재 무부채기업인 ㈜새솔은 자사주를 매입하고 그 자금을 무위험 부채로 조달하는 자본구조 변경을 계획하고 있다.`, [
      `현재(무부채) 기업가치 ${fmt(p.V)}억원, 자기자본비용 ${pc(p.rho)}`,
      `변경 후 목표 부채비율(부채/자기자본, 시장가치 기준) ${p.de * 100}%`,
      `세전 타인자본비용 ${pc(p.kd)}, 법인세율 ${pc(p.t)}`,
    ], 'MM(1963)의 수정이론에 따를 때, 자본구조 변경 후 ㈜새솔의 자기자본비용에 가장 가까운 것은?'),
    val: c => c.ke, dp: 2, u: '%',
    wrong: p => [pct(p.rho + (p.rho - p.kd) * p.de), pct(p.rho + (p.rho - p.kd) * (1 - p.t)), pct(p.rho + (p.rho - p.kd) * p.t * p.de), pct(p.rho + (p.rho - p.kd) * (1 - p.t) * p.de / (1 + p.de))],
    sol: (p, c) => `ke = ρ + (ρ − kd)(1 − t)D/E = ${pc(p.rho)} + ${pc(p.rho - p.kd)}×${1 - p.t}×${p.de} = <b>${c.ke.toFixed(2)}%</b> (기업가치 금액은 필요 없음)` });

  add({ id: 'f1-cf-wacc', unit: 'cf', title: '시장가치와 CAPM으로 구한 가중평균자본비용(WACC)', trend: T + 'WACC',
    p: { Pm: 15000, N: 4000, Bk: 5000, D: 4000, rf: 0.03, beta: 1.4, mrp: 0.07, kd: 0.07, t: 0.25 },
    vary: R => ({ Pm: R.int(8000, 30000, 1000), N: R.int(1000, 6000, 500), Bk: R.int(2000, 8000, 500), D: R.int(1000, 6000, 500), rf: R.pick([0.02, 0.03, 0.04]), beta: R.pick([0.8, 1, 1.2, 1.4, 1.6]), mrp: R.pick([0.06, 0.07, 0.08]), kd: R.pick([0.05, 0.06, 0.07, 0.08]), t: R.pick([0.2, 0.25, 0.3]) }),
    calc: p => { const E = p.Pm * p.N / 10000, V = E + p.D, ke = p.rf + p.beta * p.mrp; return { E, V, ke, w: pct(E / V * ke + p.D / V * p.kd * (1 - p.t)) }; },
    stem: p => ask(`㈜태평양해운의 자본비용을 추정하기 위한 자료는 다음과 같다.`, [
      `발행주식 수 ${fmt(p.N)}만주, 현재 주가 ${fmt(p.Pm)}원, 자기자본 장부가치 ${fmt(p.Bk)}억원`,
      `부채(회사채)의 시장가치 ${fmt(p.D)}억원, 세전 타인자본비용 ${pc(p.kd)}`,
      `무위험이자율 ${pc(p.rf)}, 시장위험프리미엄 ${pc(p.mrp)}, 이 회사 주식의 베타 ${p.beta}`,
      `법인세율 ${pc(p.t)}`,
    ], '시장가치 기준 가중평균자본비용(WACC)에 가장 가까운 것은?', '자기자본비용은 CAPM으로 추정한다'),
    val: c => c.w, dp: 2, u: '%',
    wrong: (p, c) => { const Vb = p.Bk + p.D; return [pct(c.E / c.V * c.ke + p.D / c.V * p.kd), pct(p.Bk / Vb * c.ke + p.D / Vb * p.kd * (1 - p.t)), pct(c.E / c.V * (p.rf + p.beta * (p.mrp + p.rf)) + p.D / c.V * p.kd * (1 - p.t)), pct((c.ke + p.kd * (1 - p.t)) / 2)]; },
    sol: (p, c) => `자기자본 시장가치 = ${fmt(p.N)}만주 × ${fmt(p.Pm)}원 = ${fmt(c.E, 2)}억원, V = ${fmt(c.V, 2)}억원<br>ke = ${pc(p.rf)} + ${p.beta}×${pc(p.mrp)} = ${pc(c.ke)}<br>WACC = ${fmt(c.E, 0)}/${fmt(c.V, 0)}×${pc(c.ke)} + ${fmt(p.D)}/${fmt(c.V, 0)}×${pc(p.kd)}×(1−${p.t}) = <b>${c.w.toFixed(2)}%</b> (장부가치는 쓰지 않음)` });

  add({ id: 'f1-cf-dcl', unit: 'cf', title: '결합레버리지도(DCL)', trend: T + '영업·재무레버리지',
    p: { Q: 10000, P: 500, V: 300, F: 1200000, I: 300000, t: 0.25 },
    vary: R => { for (;;) { const P = R.int(300, 800, 50), V = Math.round(P * R.f(0.4, 0.7, 0.05) / 10) * 10, Q = R.int(5000, 20000, 1000), cm = Q * (P - V), F = Math.round(cm * R.f(0.3, 0.6, 0.05) / 10000) * 10000, I = Math.round((cm - F) * R.f(0.2, 0.5, 0.05) / 10000) * 10000; if (cm - F - I > 0 && I > 0) return { Q, P, V, F, I, t: R.pick([0.2, 0.25]) }; } },
    calc: p => { const cm = p.Q * (p.P - p.V), ebit = cm - p.F; return { cm, ebit, dol: cm / ebit, dfl: ebit / (ebit - p.I), dcl: cm / (ebit - p.I) }; },
    stem: p => ask(`㈜우진정밀의 올해 손익 자료는 다음과 같다.`, null, '현재 매출 수준에서 ㈜우진정밀의 결합레버리지도(DCL)에 가장 가까운 것은?', '우선주는 없다')
      .replace('<p>현재 매출', tbl(['항목', '금액'], [['판매량', fmt(p.Q) + '개'], ['단위당 판매가격', fmt(p.P) + '원'], ['단위당 변동비', fmt(p.V) + '원'], ['고정영업비(감가상각비 포함)', fmt(p.F) + '원'], ['이자비용', fmt(p.I) + '원'], ['법인세율', pc(p.t)]]) + '<p>현재 매출'),
    val: c => c.dcl, dp: 2, u: '',
    wrong: (p, c) => [c.dol, c.dfl, c.dol + c.dfl, c.cm / (c.cm - p.I)],
    show: v => v.toFixed(2),
    sol: (p, c) => `공헌이익 = ${fmt(p.Q)}×(${p.P} − ${p.V}) = ${fmt(c.cm)}, EBIT = ${fmt(c.ebit)}<br>DOL = ${c.dol.toFixed(3)}, DFL = EBIT/(EBIT − I) = ${c.dfl.toFixed(3)}<br>DCL = DOL × DFL = 공헌이익/(EBIT − I) = <b>${c.dcl.toFixed(2)}</b> (법인세율은 레버리지도에 영향 없음)` });

  add({ id: 'f1-cf-rights', unit: 'cf', title: '주주배정 유상증자: 권리락 주가와 신주인수권 가치', trend: T + '유상증자',
    p: { N: 100, Pc: 20000, m: 25, S: 15000, cost: 2 },
    vary: R => { const Pc = R.int(10000, 40000, 1000); return { N: 100, Pc, m: R.pick([10, 20, 25, 40, 50]), S: Math.round(Pc * R.f(0.6, 0.85, 0.05) / 100) * 100, cost: R.pick([1, 2, 3]) }; },
    calc: p => { const ex = (p.N * p.Pc + p.m * p.S) / (p.N + p.m); return { ex, r: p.Pc - ex }; },
    stem: p => ask(`㈜해솔바이오는 연구개발 자금을 마련하기 위해 주주배정 방식의 유상증자를 실시한다.`, [
      `증자 전 발행주식 수 ${p.N}만주, 권리부 주가 ${fmt(p.Pc)}원`,
      `신주 발행 수 ${p.m}만주 (구주 1주당 ${p.m / p.N}주 배정), 주당 발행가격 ${fmt(p.S)}원`,
      `발행 관련 비용은 발행 총액의 ${p.cost}%이며 회사가 부담한다 (이 문제에서는 무시한다).`,
      `증자로 조달한 자금은 NPV가 0인 사업에 투자된다.`,
    ], '구주 1주에 부여되는 신주인수권 1개의 이론적 가치에 가장 가까운 것은?'),
    val: c => c.r, dp: 0, u: '원',
    wrong: (p, c) => [p.Pc - p.S, c.ex, (p.Pc - p.S) * p.m / p.N * (p.N + p.m) / p.N, c.ex - p.S],
    sol: (p, c) => `권리락 주가 = (${p.N}×${fmt(p.Pc)} + ${p.m}×${fmt(p.S)})/(${p.N} + ${p.m}) = ${fmt(c.ex, 2)}<br>신주인수권 가치 = 권리부 주가 − 권리락 주가 = <b>${fmt(c.r, 2)}</b>` });

  add({ id: 'f1-cf-ebiteps', unit: 'cf', title: '자본조달 대안 사이의 EPS 무차별점', trend: T + 'EBIT-EPS 분석',
    p: { NA: 150, NB: 100, I: 400, t: 0.25, inv: 2500, ebitNow: 1500 },
    vary: R => { const NB = R.int(50, 150, 10); return { NA: NB + R.int(20, 80, 10), NB, I: R.int(200, 800, 50), t: R.pick([0.2, 0.25, 0.3]), inv: R.int(1000, 5000, 500), ebitNow: R.int(800, 3000, 100) }; },
    calc: p => ({ x: p.I * p.NA / (p.NA - p.NB) }),
    stem: p => ask(`현재 부채가 없는 ㈜서진은 신규 투자에 필요한 ${fmt(p.inv)}억원을 두 방법 중 하나로 조달하려 한다.`, [
      `(대안 A) 보통주 발행: 발행 후 총 발행주식 수 ${p.NA}만주`,
      `(대안 B) 회사채 발행: 발행주식 수는 현재 ${p.NB}만주 그대로, 매년 이자비용 ${fmt(p.I)}억원`,
      `투자 후 예상 EBIT는 ${fmt(p.ebitNow)}억원이며, 법인세율은 ${pc(p.t)}이다.`,
    ], '두 대안의 주당순이익(EPS)이 같아지는 EBIT(무차별점)에 가장 가까운 것은?'),
    val: c => c.x, dp: 0, u: '억원',
    wrong: p => [p.I, p.I * p.NB / (p.NA - p.NB), p.I * p.NA / p.NB, p.I * p.NA / (p.NA - p.NB) * (1 - p.t)],
    sol: (p, c) => `EBIT(1−t)/${p.NA} = (EBIT − ${p.I})(1−t)/${p.NB} → EBIT = I × N_A/(N_A − N_B) = ${p.I}×${p.NA}/${p.NA - p.NB} = <b>${fmt(c.x, 2)}</b> (법인세율·예상 EBIT와 무관)` });

  /* ───────── 파생상품 ───────── */
  add({ id: 'f1-dv-pcp', unit: 'dv', title: '풋-콜 패리티로 구한 풋옵션 가격', trend: T + '풋-콜 패리티',
    p: { S: 10000, K: 10500, r: 0.05, C: 900, sig: 0.3 },
    vary: R => { for (;;) { const S = R.int(8000, 12000, 100), K = R.int(8000, 12000, 500), r = R.pick([0.04, 0.05, 0.06]), C = Math.max(R.int(300, 1500, 10), Math.ceil(S - K / (1 + r) + 100)); const P = C - S + K / (1 + r); if (P > 100) return { S, K, r, C, sig: R.pick([0.2, 0.25, 0.3, 0.35]) }; } },
    calc: p => ({ P: p.C - p.S + p.K / (1 + p.r) }),
    stem: p => ask(`배당을 지급하지 않는 ㈜누리 주식과 이 주식을 기초자산으로 하는 유럽형 옵션에 관한 자료는 다음과 같다.`, [
      `현재 주가 ${fmt(p.S)}원, 주가 수익률의 연 표준편차 ${pc(p.sig)}`,
      `행사가격 ${fmt(p.K)}원, 만기 1년인 유럽형 콜옵션의 가격 ${fmt(p.C)}원`,
      `무위험이자율 연 ${pc(p.r)} (연 1회 복리)`,
    ], '차익거래 기회가 없다면 행사가격과 만기가 같은 유럽형 풋옵션의 가격은 얼마인가?'),
    val: c => c.P, dp: 0, u: '원',
    wrong: p => [p.C - p.S + p.K, p.C + p.S - p.K / (1 + p.r), p.C - p.S + p.K * (1 + p.r), p.S - p.K / (1 + p.r) + p.C],
    sol: (p, c) => `C − P = S − K/(1+r) → P = ${fmt(p.C)} − ${fmt(p.S)} + ${fmt(p.K)}/${1 + p.r} = <b>${fmt(c.P, 2)}</b> (변동성은 필요 없음)` });

  add({ id: 'f1-dv-binom', unit: 'dv', title: '1기간 이항모형 콜옵션 가격', trend: T + '이항옵션가격결정',
    p: { S: 10000, u: 1.2, d: 0.9, r: 0.05, K: 10000, pr: 0.6 },
    vary: R => ({ S: 10000, u: R.pick([1.1, 1.2, 1.25, 1.3]), d: R.pick([0.8, 0.85, 0.9]), r: R.pick([0.03, 0.04, 0.05]), K: R.int(9000, 11500, 500), pr: R.pick([0.5, 0.55, 0.6, 0.65]) }),
    calc: p => { const q = (1 + p.r - p.d) / (p.u - p.d), cu = Math.max(p.S * p.u - p.K, 0), cd = Math.max(p.S * p.d - p.K, 0); return { q, cu, cd, C: (q * cu + (1 - q) * cd) / (1 + p.r) }; },
    stem: p => ask(`현재 주가가 ${fmt(p.S)}원인 무배당 주식에 대한 1기간 이항모형 자료는 다음과 같다.`, [
      `1년 후 주가는 ${p.u}배로 오르거나 ${p.d}배로 내린다.`,
      `투자자들이 예상하는 주가 상승 확률은 ${p.pr}이다.`,
      `무위험이자율은 연 ${pc(p.r)}이다.`,
    ], `행사가격 ${fmt(p.K)}원, 만기 1년인 유럽형 콜옵션의 균형가격에 가장 가까운 것은?`),
    val: c => c.C, dp: 0, u: '원',
    wrong: (p, c) => [(p.pr * c.cu + (1 - p.pr) * c.cd) / (1 + p.r), c.q * c.cu + (1 - c.q) * c.cd, c.cu / (1 + p.r), (0.5 * c.cu + 0.5 * c.cd) / (1 + p.r)],
    sol: (p, c) => `위험중립확률 q = (1 + r − d)/(u − d) = ${c.q.toFixed(4)} (실제 상승 확률 ${p.pr}은 쓰지 않음)<br>Cu = ${fmt(c.cu)}, Cd = ${fmt(c.cd)} → C = [q·Cu + (1−q)·Cd]/(1+r) = <b>${fmt(c.C, 2)}</b>` });

  add({ id: 'f1-dv-fut', unit: 'dv', title: '현금배당이 있는 주식선물의 이론가격', trend: T + '선물 보유비용모형',
    p: { S: 50000, r: 0.04, D: 1000, Fm: 51500 },
    vary: R => { const S = R.int(20000, 80000, 1000); return { S, r: R.pick([0.03, 0.04, 0.05, 0.06]), D: R.int(500, 2000, 100), Fm: Math.round(S * R.f(1.01, 1.06, 0.005) / 100) * 100 }; },
    calc: p => ({ F: p.S * (1 + p.r) - p.D * Math.pow(1 + p.r, 0.5) }),
    stem: p => ask(`㈜대양 주식을 기초자산으로 하는 만기 1년 주식선물에 관한 자료는 다음과 같다.`, [
      `현재 주가 ${fmt(p.S)}원`,
      `지금부터 6개월 후 주당 ${fmt(p.D)}원의 현금배당이 확정되어 있다.`,
      `무위험이자율 연 ${pc(p.r)} (연 1회 복리, 기간에 관계없이 동일)`,
      `현재 시장에서 이 선물은 ${fmt(p.Fm)}원에 거래되고 있다.`,
    ], '보유비용모형에 따른 이 선물의 이론가격에 가장 가까운 것은?', '거래비용과 증거금은 무시한다'),
    val: c => c.F, dp: 0, u: '원',
    wrong: p => [p.S * (1 + p.r), p.S * (1 + p.r) - p.D, p.S * (1 + p.r) - p.D * (1 + p.r), p.Fm],
    sol: (p, c) => `F = S(1+r) − D(1+r)^0.5 = ${fmt(p.S)}×${1 + p.r} − ${fmt(p.D)}×${Math.sqrt(1 + p.r).toFixed(5)} = <b>${fmt(c.F, 2)}</b> (시장가격 ${fmt(p.Fm)}원과 비교해 차익거래 여부를 판단)` });

  add({ id: 'f1-dv-strad', unit: 'dv', title: '옵션 전략의 만기 손익: 스트래들', trend: T + '옵션 투자전략',
    p: { K: 300, c: 12, pp: 9, ST: 320, K2: 310, c2: 8 },
    vary: R => { for (;;) { const K = R.int(250, 350, 5), c = R.int(5, 20, 1), pp = R.int(5, 20, 1), ST = K + R.int(-50, 50, 1); if (Math.abs(Math.abs(ST - K) - (c + pp)) > 3 && ST !== K) return { K, c, pp, ST, K2: K + 10, c2: Math.max(c - 4, 1) }; } },
    calc: p => ({ pl: Math.abs(p.ST - p.K) - (p.c + p.pp) }),
    stem: p => ask(`KOSPI200 지수옵션 시장에서 만기가 같은 옵션의 가격이 다음과 같다.`, [
      `행사가격 ${p.K}pt 콜옵션 ${p.c}pt, 행사가격 ${p.K}pt 풋옵션 ${p.pp}pt`,
      `행사가격 ${p.K2}pt 콜옵션 ${p.c2}pt`,
      `투자자 윤도현 씨는 지수의 큰 변동을 예상하고 행사가격 ${p.K}pt 콜옵션과 풋옵션을 1계약씩 매수하였다.`,
    ], `만기에 KOSPI200 지수가 ${p.ST}pt라면 윤도현 씨 포지션의 1계약당 손익(pt)은?`, '거래비용과 이자는 무시한다'),
    val: c => c.pl, dp: 0, u: 'pt',
    wrong: p => [Math.abs(p.ST - p.K), Math.abs(p.ST - p.K) - (p.ST > p.K ? p.c : p.pp), -(p.c + p.pp), Math.abs(p.ST - p.K) + p.c + p.pp],
    show: v => (v > 0 ? '+' : '') + fmt(v) + 'pt',
    sol: (p, c) => `롱 스트래들: 만기 가치 = |S_T − K| = ${Math.abs(p.ST - p.K)}, 지급한 프리미엄 = ${p.c} + ${p.pp} = ${p.c + p.pp}<br>손익 = <b>${c.pl > 0 ? '+' : ''}${c.pl}pt</b> (${p.K2}pt 콜은 무관)` });

  /* ───────── 이론형: 1차 기출처럼 a~e 진술 중 '옳은 것을 모두 고르면?' (회독마다 보기 순서가 섞임) ───────── */
  const AE = ['a', 'b', 'c', 'd', 'e'];
  // 정답 조합과 크기가 비슷한 오답 조합 4개를 문제마다 고정된 순서로 고른다
  function combos(id, ok) {
    const key = s => s.join(', '), right = key(ok), all = [];
    for (let m = 1; m < 32; m++) { const s = AE.filter((_, i) => m >> i & 1); if (s.length >= 2 && s.length <= 4 && key(s) !== right && Math.abs(s.length - ok.length) <= 1) all.push(key(s)); }
    const wrong = all.sort((x, y) => M.h01(id + x) - M.h01(id + y)).slice(0, 4);
    const opts = [right, ...wrong].sort();
    return { opts, ans: opts.indexOf(right) };
  }
  const th = (id, unit, title, topic, items, sol) => {
    const ok = AE.filter((_, i) => items[i][1]), { opts, ans } = combos(id, ok);
    P.push(M.fixed({ id, unit, pts: PTS, title, trend: '1차 빈출 이론: ' + title,
      stem: `<p>${topic}에 관한 설명으로 옳은 것을 모두 고르면?</p>` + `<div class="stmts">${items.map(([t], i) => `<p>${AE[i]}. ${t}</p>`).join('')}</div>`,
      opts, ans, sol: `옳은 것: <b>${ok.join(', ')}</b><br>` + items.map(([, v, why], i) => `${AE[i]}. ${v ? '옳다' : '틀리다'} — ${why}`).join('<br>') + (sol ? '<br>' + sol : '') }));
  };
  th('f1-th-emh', 'mk', '효율적 시장가설', '효율적 시장가설', [
    ['약형 효율적 시장에서는 과거의 주가와 거래량 정보를 분석하는 기술적 분석으로 지속적인 초과수익을 얻을 수 없다.', true, '약형은 과거 가격 정보가 이미 주가에 반영된 시장이다.'],
    ['준강형 효율적 시장에서는 공시된 재무제표를 분석하는 기본적 분석으로 지속적인 초과수익을 얻을 수 없다.', true, '준강형은 공개된 모든 정보가 즉시 반영된 시장이다.'],
    ['강형 효율적 시장이 성립하더라도 약형 효율적 시장은 성립하지 않을 수 있다.', false, '강형 ⊃ 준강형 ⊃ 약형이므로 강형이 성립하면 약형도 성립한다.'],
    ['시장이 효율적이라면 새로운 정보가 없어도 주가는 일정한 추세를 따라 움직인다.', false, '효율적 시장에서 주가는 새 정보에만 반응하므로 예측 가능한 추세가 없다(랜덤워크).'],
    ['기업 공시 후 수일에 걸쳐 주가가 서서히 반응한다면 이는 준강형 효율성을 지지하는 증거이다.', false, '공시 정보가 즉시 반영되지 않았다는 뜻이므로 준강형 효율성에 반하는 증거이다.'],
  ]);
  th('f1-th-mm58', 'cf', 'MM(1958) 무관련이론', '법인세가 없는 완전자본시장에서 MM(1958)의 자본구조 이론', [
    ['기업가치는 자본구조와 관계없이 영업이익의 크기와 영업위험으로 결정된다.', true, 'MM 제1명제(VL = VU).'],
    ['부채비율이 높아지면 자기자본비용은 부채비율에 비례하여 상승한다.', true, 'MM 제2명제: ke = ρ + (ρ − kd)D/E.'],
    ['부채비율이 높아질수록 가중평균자본비용(WACC)은 낮아진다.', false, '자기자본비용 상승이 저렴한 부채의 효과를 정확히 상쇄해 WACC는 ρ로 일정하다.'],
    ['개인투자자가 기업과 같은 조건으로 차입·대출할 수 있어 기업의 레버리지를 스스로 복제할 수 있다고 가정한다.', true, '자가 레버리지(homemade leverage) 가정으로 차익거래 논리가 성립한다.'],
    ['기업가치를 극대화하는 최적자본구조가 존재한다.', false, '기업가치가 자본구조와 무관하므로 최적자본구조는 없다.'],
  ]);
  th('f1-th-capm', 'pf', 'CAPM의 의미', 'CAPM이 성립하는 균형 상태', [
    ['비체계적 위험이 큰 주식일수록 균형 기대수익률이 높다.', false, '비체계적 위험은 분산투자로 제거되므로 보상받지 못한다.'],
    ['모든 투자자는 무위험자산과 시장포트폴리오를 결합하여 보유한다.', true, '토빈의 분리정리: 위험자산 부분은 모두 시장포트폴리오이다.'],
    ['베타가 0인 자산의 균형 기대수익률은 무위험이자율과 같다.', true, 'E(R) = rf + 0 × (E(Rm) − rf) = rf.'],
    ['증권시장선(SML)보다 위쪽에 위치한 주식은 과대평가된 주식이다.', false, 'SML 위쪽은 기대수익률이 요구수익률보다 높아 과소평가(저평가)된 주식이다.'],
    ['자본시장선(CML)은 개별 주식처럼 비효율적인 자산의 위험과 기대수익률 관계도 나타낸다.', false, 'CML에는 효율적 포트폴리오만 위치하며, 개별 자산의 관계는 SML이 나타낸다.'],
  ]);
  th('f1-th-dur', 'bd', '듀레이션의 성질', '맥컬리 듀레이션(다른 조건은 같다고 가정)', [
    ['무이표채의 듀레이션은 만기와 같다.', true, '현금흐름이 만기에 한 번뿐이기 때문이다.'],
    ['표면이자율이 높은 채권일수록 듀레이션이 길다.', false, '앞쪽 현금흐름 비중이 커져 듀레이션이 짧아진다.'],
    ['만기수익률이 높을수록 듀레이션은 짧아진다.', true, '먼 현금흐름이 더 많이 할인되어 가중치가 줄어든다.'],
    ['만기수익률이 y인 영구채의 듀레이션은 (1 + y)/y이다.', true, '영구채 듀레이션 공식.'],
    ['이표채의 듀레이션은 만기보다 길다.', false, '중간에 이자를 받으므로 이표채의 듀레이션은 만기보다 짧다.'],
  ]);
  th('f1-th-opt', 'dv', '옵션 가격 결정 요인', '무배당 주식을 기초자산으로 하는 옵션의 가격(다른 조건은 같다고 가정)', [
    ['기초자산 수익률의 변동성이 커지면 유럽형 콜옵션과 풋옵션의 가격이 모두 오른다.', true, '변동성이 크면 유리한 쪽 꼬리가 커져 콜·풋 모두 가치가 오른다.'],
    ['행사가격이 높아지면 유럽형 콜옵션의 가격이 오른다.', false, '행사가격이 높을수록 콜의 행사 이익이 줄어 가격이 내린다.'],
    ['무위험이자율이 오르면 유럽형 콜옵션의 가격이 오른다.', true, '행사가격의 현재가치가 낮아져 콜 가격이 오르고 풋 가격은 내린다.'],
    ['기초자산 가격이 오르면 유럽형 풋옵션의 가격이 오른다.', false, '주가가 오르면 풋의 행사 이익이 줄어 가격이 내린다.'],
    ['무배당 주식에 대한 미국형 콜옵션은 만기 전에 조기행사하는 것이 유리한 경우가 있다.', false, '무배당 주식의 미국형 콜은 조기행사하지 않는 것이 최적이므로 유럽형 콜과 가치가 같다.'],
  ]);
  th('f1-th-div', 'mk', '배당정책 이론', '배당정책', [
    ['완전자본시장에서는 배당을 늘리면 기업가치가 증가한다.', false, '배당무관련이론에 따라 배당을 늘려도 배당락만큼 주가가 내려 주주의 부는 같다.'],
    ['MM의 배당무관련이론에 따르면 투자정책이 주어졌을 때 배당정책은 기업가치에 영향을 주지 않는다.', true, '주주는 주식 매도·재투자로 원하는 배당 흐름을 스스로 만들 수 있다.'],
    ['신호가설에 따르면 예상치 못한 배당 증가는 경영자가 미래 이익을 낙관한다는 신호로 받아들여질 수 있다.', true, '정보비대칭 하에서 배당은 경영자의 사적 정보를 전달한다.'],
    ['고객효과에 따르면 투자자들은 세금 등 자신의 상황에 맞는 배당정책을 가진 기업의 주식을 선택한다.', true, '배당 선호가 다른 투자자 집단(고객)이 형성된다.'],
    ['배당락일에 주가는 이론적으로 주당 배당금만큼 상승한다.', false, '배당락일에는 배당받을 권리가 없어지므로 주가가 배당금만큼 하락한다.'],
  ]);
  th('f1-th-cs', 'cf', '상충이론과 자본조달순위이론', '자본구조 이론', [
    ['자본조달순위이론에 따르면 기업은 내부자금, 부채, 신주 발행의 순서로 자금을 조달한다.', true, '정보비대칭으로 외부 자기자본의 비용이 가장 크기 때문이다.'],
    ['상충이론은 부채 사용에 따른 법인세 절감효과와 재무적 곤경비용을 비교하여 최적 부채비율을 찾는다.', true, '한계 절세효과 = 한계 곤경비용인 지점이 최적이다.'],
    ['자본조달순위이론에 따르면 기업은 목표 부채비율을 정하고 이를 유지하려 한다.', false, '자본조달순위이론에는 목표 부채비율이 없다. 목표 부채비율은 상충이론의 주장이다.'],
    ['정보비대칭이 있을 때 신주 발행 공시는 대체로 주가 상승 요인이 된다.', false, '주가가 고평가됐다는 신호로 해석되어 주가가 하락하기 쉽다.'],
    ['부채 비중을 늘리면 주주와 채권자 사이의 대리인 문제가 사라진다.', false, '부채가 늘수록 위험유인·과소투자 같은 주주-채권자 갈등이 커진다.'],
  ]);
  th('f1-th-div2', 'pf', '분산투자 효과', '두 위험자산으로 구성한 포트폴리오의 분산투자 효과(공매도 없음)', [
    ['두 자산 수익률의 상관계수가 +1이면 포트폴리오 표준편차는 개별 자산 표준편차의 가중평균과 같다.', true, 'σp = wAσA + wBσB가 되어 위험 감소 효과가 없다.'],
    ['두 자산 수익률의 상관계수가 −1이면 투자비율을 조절하여 표준편차가 0인 포트폴리오를 만들 수 있다.', true, 'wA = σB/(σA + σB)로 하면 위험이 완전히 상쇄된다.'],
    ['포트폴리오에 포함하는 자산 수를 계속 늘리면 체계적 위험도 0에 가까워진다.', false, '자산 수를 늘려도 제거되는 것은 비체계적 위험뿐이다.'],
    ['같은 비율로 투자하는 자산의 수가 많아질수록 포트폴리오의 분산은 자산들 사이 공분산의 평균에 가까워진다.', true, '개별 분산의 비중은 1/n로 줄고 공분산 항만 남는다.'],
    ['상관계수가 1보다 작으면 포트폴리오 표준편차는 항상 두 자산 중 작은 표준편차보다 작다.', false, '가중평균보다는 작아지지만, 작은 쪽 표준편차보다 항상 작은 것은 아니다.'],
  ]);
  th('f1-th-ts', 'bd', '이자율 기간구조 이론', '이자율 기간구조 이론', [
    ['유동성프리미엄이론에 따르면 미래 기대 현물이자율이 일정해도 수익률곡선은 우상향할 수 있다.', true, '선도이자율 = 기대 현물이자율 + 양(+)의 유동성프리미엄.'],
    ['불편기대이론에 따르면 내재 선도이자율은 미래 기대 현물이자율과 같다.', true, '불편기대이론의 핵심 가정이다.'],
    ['시장분할이론은 투자자들이 만기가 다른 채권을 완전히 대체할 수 있다고 본다.', false, '시장분할이론은 만기별 시장이 분리되어 대체되지 않는다고 본다.'],
    ['불편기대이론에서 수익률곡선이 우상향하면 시장은 미래 단기이자율의 하락을 예상하고 있다.', false, '우상향 곡선은 미래 단기이자율 상승 예상을 뜻한다.'],
    ['유동성프리미엄이론에서 장기채의 유동성프리미엄은 음(−)의 값을 가진다.', false, '투자자는 장기채의 위험에 대해 양(+)의 프리미엄을 요구한다.'],
  ]);
  th('f1-th-npv', 'cb', 'NPV법과 IRR법', '투자안 평가 방법', [
    ['상호배타적 투자안에서는 IRR이 높은 투자안이 항상 NPV도 높다.', false, '규모·현금흐름 시점이 다르면 NPV 곡선이 교차해 순위가 바뀔 수 있다.'],
    ['NPV법은 가치가산의 원칙이 성립한다.', true, 'NPV(A+B) = NPV(A) + NPV(B).'],
    ['IRR법은 투자기간 중의 현금흐름을 IRR로 재투자한다고 가정한다.', true, 'NPV법은 자본비용으로 재투자한다고 가정한다.'],
    ['현금흐름의 부호가 여러 번 바뀌는 투자안은 IRR이 여러 개 존재할 수 있다.', true, '데카르트의 부호법칙에 따라 부호 변화 횟수만큼 근이 있을 수 있다.'],
    ['수익성지수(PI)가 1보다 크면 그 투자안의 NPV는 음(−)이다.', false, 'PI > 1이면 유입 현가가 투자액보다 커서 NPV > 0이다.'],
  ]);
  th('f1-th-agency', 'mk', '대리인 문제', '대리인 문제', [
    ['부채가 많은 기업의 주주는 NPV가 음(−)이더라도 위험이 큰 투자안을 선호할 유인이 있다.', true, '성공하면 이익은 주주가, 실패하면 손실은 채권자가 떠안는 위험유인(자산대체) 문제이다.'],
    ['과소투자 문제는 기업에 부채가 전혀 없을 때 주로 발생한다.', false, '부채가 많아 투자 이익이 채권자에게 돌아갈 때 주주가 NPV > 0인 투자를 포기하는 문제이다.'],
    ['잉여현금흐름가설에 따르면 부채 사용은 경영자가 잉여현금을 낭비하는 문제를 줄여 준다.', true, '원리금 상환 의무가 경영자가 쓸 수 있는 현금을 줄인다.'],
    ['외부 주주가 있더라도 자기자본의 대리인 비용은 발생하지 않는다.', false, '경영자 지분이 100% 미만이면 특권적 소비 등 자기자본 대리인 비용이 생긴다.'],
    ['대리인 비용 중 감시비용은 대리인(경영자)만 부담한다.', false, '감시비용은 주인(주주·채권자)이 부담하고, 확증비용은 대리인이 부담한다.'],
  ]);
  th('f1-th-fut', 'dv', '선물거래의 특징', '선물거래', [
    ['현물을 보유한 투자자는 선물을 매도하여 현물 가격 하락 위험을 줄일 수 있다.', true, '매도헤지(short hedge)이다.'],
    ['선물거래는 장외에서 당사자 간 맞춤형 조건으로 거래된다.', false, '선물은 거래소에서 표준화된 조건으로 거래된다. 맞춤형 장외거래는 선도거래이다.'],
    ['선물 매수자는 계약 시점에 옵션처럼 프리미엄을 지급한다.', false, '선물에는 프리미엄이 없고 증거금만 예치한다.'],
    ['선물거래에는 증거금 제도와 일일정산 제도가 있다.', true, '매일 손익을 정산해 계약 불이행 위험을 줄인다.'],
    ['무배당 주식을 기초자산으로 하는 선물의 이론가격은 무위험이자율이 오르면 낮아진다.', false, 'F = S(1+r)^T이므로 이자율이 오르면 선물 이론가격도 오른다.'],
  ]);

  const SUMMARY = [
    { unit: 'tv', rows: [['영구연금', 'PV = C/r,  성장영구연금 PV = C₁/(r − g)'], ['연금', 'PV = C × [1 − (1+r)^−n]/r'], ['실효이자율', 'EAR = (1 + APR/m)^m − 1,  연속복리 e^APR − 1']] },
    { unit: 'cb', rows: [['NPV·IRR', 'NPV = Σ CFt/(1+k)^t − I,  IRR: NPV = 0인 할인율'], ['영업현금흐름', 'OCF = (매출 − 현금비용)(1 − t) + t × 감가상각비'], ['EAC', 'EAC = 비용의 현가 ÷ PVIFA(k, n)'], ['회수기간', '누적 현금흐름이 투자액과 같아지는 기간']] },
    { unit: 'pf', rows: [['두 자산 분산', 'σp² = wA²σA² + wB²σB² + 2wAwBρσAσB'], ['최소분산', 'wA = (σB² − ρσAσB)/(σA² + σB² − 2ρσAσB)'], ['CML·SML', 'E(Rp) = rf + [(E(Rm) − rf)/σm]σp,  E(Ri) = rf + βi[E(Rm) − rf]'], ['성과평가', '샤프 (Rp − rf)/σp,  트레이너 (Rp − rf)/βp,  젠센 α = Rp − [rf + β(Rm − rf)]'], ['단일지수모형', 'σi² = βi²σm² + σε²,  R² = βi²σm²/σi²']] },
    { unit: 'bd', rows: [['채권가격', 'P = C × PVIFA(y, n) + F × PVIF(y, n)'], ['듀레이션', 'D = Σ t × PV(CFt)/P,  ΔP/P ≈ −D/(1+y) × Δy'], ['선도이자율', '(1 + s₂)² = (1 + s₁)(1 + f₁,₂)']] },
    { unit: 'sv', rows: [['항상성장모형', 'P₀ = D₁/(k − g),  g = b × ROE'], ['PVGO', 'P₀ = EPS₁/k + PVGO'], ['PER', 'P₀/EPS₁ = (1 − b)/(k − g)']] },
    { unit: 'cf', rows: [['MM(1963)', 'VL = VU + tD,  ke = ρ + (ρ − kd)(1 − t)D/E'], ['WACC', 'E/V × ke + D/V × kd(1 − t)'], ['레버리지', 'DOL = 공헌이익/EBIT,  DFL = EBIT/(EBIT − I),  DCL = DOL × DFL'], ['권리락 주가', '(구주 × 권리부 주가 + 신주 × 발행가)/(구주 + 신주)'], ['EPS 무차별점', 'EBIT* = I × N_A/(N_A − N_B)']] },
    { unit: 'dv', rows: [['풋-콜 패리티', 'C − P = S − K/(1+r)^T'], ['이항모형', 'q = (1 + r − d)/(u − d),  C = [qCu + (1 − q)Cd]/(1 + r)'], ['선물 이론가격', 'F = S(1+r)^T − FV(배당)'], ['스트래들', '만기 손익 = |S_T − K| − (콜 + 풋 프리미엄)']] },
  ];

  const base = window.FM_CONCEPTS || [];
  const extra = [
    ['tv', '화폐의 시간가치(연금·영구연금)', '연금,영구연금,성장영구연금,현재가치,미래가치,할인', '같은 금액이라도 빨리 받을수록 가치가 크다. 연금은 일정 기간 같은 금액, 영구연금은 영원히 같은 금액(또는 일정 성장)을 받는 현금흐름이다.'],
    ['tv', '실효이자율(EAR)', 'EAR,실효이자율,APR,복리,연속복리', '1년에 여러 번 복리로 붙는 이자를 연 1회 복리 기준으로 바꾼 이자율. 복리 횟수가 많을수록 커진다.'],
    ['sv', '배당평가모형(항상성장모형)', '고든,항상성장,배당평가,정률성장,주가', '주가 = 다음 해 배당 ÷ (요구수익률 − 성장률). 성장률은 유보율 × 재투자수익률(ROE)로 구한다.'],
    ['sv', 'PVGO(성장기회의 현재가치)', 'PVGO,성장기회,무성장', '주가 중 현재 이익이 그대로 유지될 때의 가치(EPS/k)를 넘는 부분. ROE가 요구수익률보다 높을 때만 양수다.'],
    ['mk', '효율적 시장가설', '효율적 시장,약형,준강형,강형,EMH,사건연구', '주가가 이용 가능한 정보를 즉시 반영한다는 가설. 약형(과거 주가) ⊂ 준강형(공개정보) ⊂ 강형(내부정보까지).'],
    ['mk', '대리인 비용', '대리인,위험유인,과소투자,잉여현금흐름,감시비용', '주주-경영자, 주주-채권자 이해 상충으로 생기는 비용. 부채가 많으면 위험유인·과소투자 문제가 생긴다.'],
  ].map(([unit, name, alias, desc]) => ({ unit, name, alias: alias.split(','), desc }));

  window.SWM_PACKS = window.SWM_PACKS || {};
  window.SWM_PACKS.fm1 = {
    key: 'fm1', name: 'CPA 1차 재무관리', units: UNITS, probs: P, summary: SUMMARY, concepts: base.filter(c => UNITS.some(u => u.k === c.unit)).concat(extra),
    mockMix: { tv: 1, cb: 3, pf: 4, bd: 3, sv: 2, cf: 3, dv: 3, mk: 1 }, mockMin: 40, mockN: 20,
    daily: [5, 10, 15, 20], dailyDef: 10,
    kinds: [['계산형', d => !d.fixed], ['이론형', d => !!d.fixed]],
    cxUnit: [['tv', /시간가치|연금/], ['cb', /자본예산|투자안/], ['pf', /포트폴리오|capm/i], ['bd', /채권|이자율/], ['sv', /주식\s*평가|주가/], ['cf', /자본구조|기업재무/], ['dv', /파생|옵션|선물/], ['mk', /효율|배당|대리인/]],
    text: {
      sub: 'CPA 1차 재무관리 · 회독마다 숫자가 바뀌는 객관식',
      today: '2회독부터 숫자가 바뀜(이론형은 보기 순서) · 다 맞히면 복습 간격 1→3→7→14→30일, 틀리면 다음 날 다시',
      bank: '1차 기출 10개년 유형을 참고한 새 문제 · 5지선다 자동 채점 · 🔀 숫자 바꾸기',
      mockNav: '20문제', mockSub: '20문제 · 40분 · 단원 비중 반영', mockNotice: '20문제 · 40분 · 매번 새 숫자 · 문제당 5점',
      sumNav: '핵심 공식', sumSub: '단원별 자주 쓰는 식', sumNote: '1차 시험 빈출 공식 정리',
      cxPh: '예: PVGO가 뭔지 모르겠어',
    },
  };
})();
