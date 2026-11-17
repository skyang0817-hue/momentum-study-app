/* AI 출제 (CPA 2차 재무관리): 약점 맞춤 · 기출 빈도 기반 새 접근 문제
 * - FREQ: 금감원 공개 2차 기출 10개년(2017~2026, 70문제)을 세부 주제로 분류한 표. 문제 문장은 옮기지 않고 주제만 기록했다.
 * - PROBS: 단원별 2문제(빈출 주제를 새 각도로 1 + 최근 출제 공백 주제 1). 형식은 problems.js와 같고 회독마다 숫자가 바뀐다.
 * - TOPIC_OF: 기존 문제은행 문제의 세부 주제(약점 분석에 사용)
 */
(function () {
  'use strict';
  const { fmt, pc, pvif, pvifa, r4, tbl, ul } = window.FM_UTIL;
  const f2 = x => fmt(x, 2), f4 = x => fmt(x, 4);
  const p2 = x => (x * 100).toFixed(2) + '%';

  const TOPICS = [
    { k: 'npv', unit: 'cb', name: '현금흐름 추정·NPV·IRR' },
    { k: 'wacc', unit: 'cb', name: 'WACC·APV' },
    { k: 'risk', unit: 'cb', name: '확실성등가·위험조정' },
    { k: 'ropt', unit: 'cb', name: '실물옵션' },
    { k: 'util', unit: 'pf', name: '효용·최적 포트폴리오·CML' },
    { k: 'capm', unit: 'pf', name: 'CAPM·SML·베타' },
    { k: 'apt', unit: 'pf', name: '시장모형·요인모형·APT' },
    { k: 'perf', unit: 'pf', name: '성과평가' },
    { k: 'term', unit: 'bd', name: '기간구조·채권 차익거래' },
    { k: 'dur', unit: 'bd', name: '듀레이션·면역' },
    { k: 'credit', unit: 'bd', name: '신용위험·옵션부 채권' },
    { k: 'fwd', unit: 'dv', name: '선물·선도·헤지' },
    { k: 'opt', unit: 'dv', name: '옵션 전략·패리티·상태가격' },
    { k: 'bin', unit: 'dv', name: '이항모형' },
    { k: 'swap', unit: 'dv', name: '스왑' },
    { k: 'mm', unit: 'cf', name: '자본구조(MM·상충이론)' },
    { k: 'ma', unit: 'cf', name: '합병·인수' },
    { k: 'agency', unit: 'cf', name: '대리문제·정보비대칭' },
    { k: 'equity', unit: 'cf', name: '유상증자·기업분할' },
    { k: 'payout', unit: 'cf', name: '배당·자사주' },
    { k: 'val', unit: 'cf', name: '기업가치평가(FCFF·RIM)' },
  ];
  // [연도, 문제 번호, 주제] — 연도별 7문제
  const FREQ = [
    [2017, 1, 'mm'], [2017, 2, 'ma'], [2017, 3, 'perf'], [2017, 4, 'credit'], [2017, 5, 'mm'], [2017, 6, 'swap'], [2017, 7, 'bin'],
    [2018, 1, 'wacc'], [2018, 2, 'ropt'], [2018, 3, 'agency'], [2018, 4, 'util'], [2018, 5, 'util'], [2018, 6, 'fwd'], [2018, 7, 'opt'],
    [2019, 1, 'mm'], [2019, 2, 'ma'], [2019, 3, 'capm'], [2019, 4, 'apt'], [2019, 5, 'perf'], [2019, 6, 'dur'], [2019, 7, 'term'],
    [2020, 1, 'risk'], [2020, 2, 'val'], [2020, 3, 'payout'], [2020, 4, 'perf'], [2020, 5, 'term'], [2020, 6, 'opt'], [2020, 7, 'swap'],
    [2021, 1, 'npv'], [2021, 2, 'agency'], [2021, 3, 'apt'], [2021, 4, 'capm'], [2021, 5, 'term'], [2021, 6, 'fwd'], [2021, 7, 'bin'],
    [2022, 1, 'val'], [2022, 2, 'npv'], [2022, 3, 'ropt'], [2022, 4, 'util'], [2022, 5, 'perf'], [2022, 6, 'credit'], [2022, 7, 'apt'],
    [2023, 1, 'npv'], [2023, 2, 'apt'], [2023, 3, 'dur'], [2023, 4, 'mm'], [2023, 5, 'ma'], [2023, 6, 'util'], [2023, 7, 'dur'],
    [2024, 1, 'wacc'], [2024, 2, 'equity'], [2024, 3, 'risk'], [2024, 4, 'util'], [2024, 5, 'term'], [2024, 6, 'fwd'], [2024, 7, 'opt'],
    [2025, 1, 'npv'], [2025, 2, 'ma'], [2025, 3, 'agency'], [2025, 4, 'util'], [2025, 5, 'apt'], [2025, 6, 'term'], [2025, 7, 'fwd'],
    [2026, 1, 'npv'], [2026, 2, 'capm'], [2026, 3, 'util'], [2026, 4, 'equity'], [2026, 5, 'ma'], [2026, 6, 'dur'], [2026, 7, 'bin'],
  ];
  const TOPIC_OF = {
    'cb-replace': 'npv', 'cb-payback': 'npv', 'cb-mirr': 'npv', 'cb-apv': 'wacc', 'cb-ceq': 'risk', 'cb-realopt': 'ropt', 'cb-valuation': 'val',
    'pf-capm-alpha-arb': 'capm', 'pf-cml-sml-eff': 'capm', 'pf-capm-states': 'capm', 'pf-apt-three': 'apt', 'pf-factor-cov': 'apt', 'pf-apt': 'apt',
    'pf-perf': 'perf', 'pf-cml-utility': 'util', 'pf-two-asset': 'util',
    'bd-replicate-arb': 'term', 'bd-spot-duration': 'term', 'bd-credit': 'credit', 'bd-immun-convex': 'dur', 'bd-immunization': 'dur',
    'dv-swap': 'swap', 'dv-parity-strategy': 'opt', 'dv-binomial': 'bin', 'dv-futures': 'fwd',
    'cf-rights': 'equity', 'cf-agency': 'agency', 'cf-mm': 'mm', 'cf-merger-eps': 'ma', 'cf-payout': 'payout',
    'y26-1': 'npv', 'y26-2': 'capm', 'y26-3': 'util', 'y26-4': 'equity', 'y26-5': 'ma', 'y26-6': 'dur', 'y26-7': 'bin',
  };

  const P = [];
  const AI = { ai: true, real: true };

  /* ───────── 자본예산 ① 빈출(NPV) × 새 각도: 손익분기와 민감도 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-cb-breakeven', unit: 'cb', topic: 'npv', lv: '중', pts: 15,
    title: '재무적 손익분기점과 회계적 손익분기점, 가격 민감도',
    trend: 'AI 출제 · 빈출 주제(현금흐름·NPV) 새 접근',
    p: { I: 24000, n: 5, P: 50, v: 30, FC: 3000, t: 0.25, r: 0.1, Q: 650 },
    vary(R) {
      for (;;) {
        const p = { I: R.int(15000, 40000, 1000), n: R.pick([4, 5, 6]), P: R.int(40, 80, 5), v: 0, FC: R.int(2000, 5000, 500), t: R.pick([0.2, 0.22, 0.25]), r: R.pick([0.08, 0.1, 0.12]), Q: 0 };
        p.v = Math.round(p.P * R.f(0.45, 0.65, 0.05));
        const c = this.calc(Object.assign({}, p, { Q: 1 }));
        p.Q = Math.round(c.Qf * R.f(1.08, 1.3, 0.02) / 10) * 10;
        const cc = this.calc(p);
        if (cc.Qf > cc.Qa * 1.05 && cc.npv > 100) return p;
      }
    },
    calc(p) {
      const A = r4(pvifa(p.r, p.n)), D = p.I / p.n, m = p.P - p.v;
      const eac = p.I / A;
      const Qf = ((eac - p.t * D) / (1 - p.t) + p.FC) / m;
      const Qa = (p.FC + D) / m;
      const ocf = (p.Q * m - p.FC) * (1 - p.t) + p.t * D;
      const npv = -p.I + ocf * A;
      const dNpv = -0.01 * p.P * p.Q * (1 - p.t) * A;
      return { A, D, m, eac, Qf, Qa, ocf, npv, dNpv, el: dNpv / npv * 100 };
    },
    body: (p, c) => `<p>㈜한빛소재는 신제품 생산라인 투자를 검토하고 있다. 금액 단위는 만원, 판매량 단위는 개이다.</p>` + ul([
      `생산라인 투자액은 ${fmt(p.I)}만원으로 현재 전액 지출되며, 내용연수 ${p.n}년·잔존가치 0으로 정액법 상각한다. 사업 종료 시 처분가치는 없다.`,
      `제품 단위당 판매가격은 ${fmt(p.P)}만원, 단위당 변동비는 ${fmt(p.v)}만원이며, 감가상각비를 제외한 연간 고정현금비용은 ${fmt(p.FC)}만원이다.`,
      `연간 예상 판매량은 ${fmt(p.Q)}개이며 매년 같다. 법인세율은 ${pc(p.t)}, 자본비용은 ${pc(p.r)}이다.`,
    ]) + tbl(['구분', `PVIFA(${pc(p.r)}, ${p.n})`], [['계수', c.A.toFixed(4)]]),
    qs: [
      { lab: '물음 1', type: 'num', text: '투자액의 연간 등가비용(EAC: 투자액을 내용연수 동안 매년 같은 금액으로 환산한 값)을 구하시오.', unit: '만원', dp: 2, ans: c => c.eac,
        sol: (p, c) => `EAC = ${fmt(p.I)} ÷ ${c.A} = <b>${f2(c.eac)}</b>` },
      { lab: '물음 2', type: 'num', text: '이 투자안의 NPV를 0으로 만드는 연간 판매량(재무적 손익분기점)을 구하시오.', unit: '개', dp: 2, ans: c => c.Qf,
        sol: (p, c) => `NPV = 0 ⇔ 매년 영업현금흐름 = EAC<br>(Q×${c.m} − ${fmt(p.FC)})×(1−${p.t}) + ${p.t}×${fmt(c.D, 2)} = ${f2(c.eac)}<br>Q = [(${f2(c.eac)} − ${f2(p.t * c.D)})/(1−${p.t}) + ${fmt(p.FC)}] ÷ ${c.m} = <b>${f2(c.Qf)}</b>` },
      { lab: '물음 3', type: 'num', text: '세후 회계적 이익을 0으로 만드는 연간 판매량(회계적 손익분기점)을 구하시오.', unit: '개', dp: 2, ans: c => c.Qa,
        sol: (p, c) => `(Q×${c.m} − ${fmt(p.FC)} − ${fmt(c.D, 2)})×(1−${p.t}) = 0 → Q = (${fmt(p.FC)} + ${fmt(c.D, 2)}) ÷ ${c.m} = <b>${f2(c.Qa)}</b><br>법인세율과 관계없이 같은 값이 나온다.` },
      { lab: '물음 4', type: 'num', text: '예상 판매량을 기준으로 이 투자안의 NPV를 구하시오.', unit: '만원', dp: 2, ans: c => c.npv,
        sol: (p, c) => `영업현금흐름 = (${fmt(p.Q)}×${c.m} − ${fmt(p.FC)})×(1−${p.t}) + ${p.t}×${fmt(c.D, 2)} = ${f2(c.ocf)}<br>NPV = −${fmt(p.I)} + ${f2(c.ocf)}×${c.A} = <b>${f2(c.npv)}</b>` },
      { lab: '물음 5', type: 'num', text: '다른 조건이 같을 때 판매가격이 1% 하락하면 NPV는 몇 % 변하는가? (감소는 음수)', unit: '%', dp: 2, ans: c => c.el,
        sol: (p, c) => `NPV 변화 = −0.01×${fmt(p.P)}×${fmt(p.Q)}×(1−${p.t})×${c.A} = ${f2(c.dNpv)}<br>변화율 = ${f2(c.dNpv)} ÷ ${f2(c.npv)} = <b>${c.el.toFixed(2)}%</b> — 가격 1% 변화가 NPV를 크게 흔든다(영업 레버리지).` },
      { lab: '물음 6', type: 'essay', text: '판매량이 회계적 손익분기점과 같을 때 이 투자안을 채택하면 안 되는 이유를 두 줄 이내로 설명하시오.',
        model: '회계적 손익분기점에서는 감가상각비로 투자원금만 회수할 뿐 투자자금의 기회비용(자본비용)을 회수하지 못하므로 NPV가 음수이다. 재무적 손익분기점은 EAC를 기준으로 자본비용까지 회수하는 판매량이므로 회계적 손익분기점보다 크다.',
        kw: ['기회비용', '자본비용', 'NPV', '음수', 'EAC'] },
    ],
  }));

  /* ───────── 자본예산 ② 출제 공백(실물옵션): 확장·포기옵션 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-cb-realopt', unit: 'cb', topic: 'ropt', lv: '상', pts: 20,
    title: '확장옵션과 포기옵션이 함께 있는 투자안, 최소 매각가격 역산',
    trend: 'AI 출제 · 출제 공백 주제(실물옵션) 새 접근',
    p: { I: 1000, Vu: 1500, Vd: 600, pr: 0.5, k: 0.15, rf: 0.05, e: 0.4, X: 450, L: 750 },
    vary(R) {
      for (;;) {
        const Vd = R.int(400, 900, 50), Vu = Vd + R.int(500, 1200, 50), pr = R.pick([0.4, 0.5, 0.6]), k = R.pick([0.12, 0.14, 0.15, 0.16]), rf = R.pick([0.03, 0.04, 0.05]);
        const p = { I: 0, Vu, Vd, pr, k, rf, e: R.pick([0.3, 0.4, 0.5]), X: 0, L: 0 };
        const V0 = (pr * Vu + (1 - pr) * Vd) / (1 + k);
        p.I = Math.round(V0 * R.f(1.03, 1.12, 0.01) / 10) * 10;
        p.X = Math.round(p.e * (Vd + (Vu - Vd) * R.f(0.35, 0.7, 0.05)) / 10) * 10;
        p.L = Math.round((Vd + (Vu - Vd) * R.f(0.1, 0.4, 0.05)) / 10) * 10;
        const c = this.calc(p);
        if (c.q > 0.05 && c.q < 0.95 && p.e * Vd < p.X && p.e * Vu > p.X && p.L > Vd && p.L < Vu && c.npv < -5 && c.npv + c.exp < -5 && c.all > 5) return p;
      }
    },
    calc(p) {
      const V0 = (p.pr * p.Vu + (1 - p.pr) * p.Vd) / (1 + p.k), npv = V0 - p.I;
      const q = (V0 * (1 + p.rf) - p.Vd) / (p.Vu - p.Vd);
      const expU = Math.max(0, p.e * p.Vu - p.X), expD = Math.max(0, p.e * p.Vd - p.X);
      const exp = (q * expU + (1 - q) * expD) / (1 + p.rf);
      const abU = Math.max(0, p.L - p.Vu), abD = Math.max(0, p.L - p.Vd);
      const ab = (q * abU + (1 - q) * abD) / (1 + p.rf);
      const all = npv + exp + ab, need = -(npv + exp), Lmin = p.Vd + need * (1 + p.rf) / (1 - q);
      return { V0, npv, q, expU, exp, abD, ab, all, need, Lmin, dec: npv > 0 ? 0 : all > 0 ? 1 : 2 };
    },
    body: (p, c) => `<p>㈜그린모빌리티는 전기 이륜차 충전망 사업을 검토하고 있다. 금액 단위는 억원이다.</p>` + ul([
      `현재(t=0) 투자액은 ${fmt(p.I)}억원이다. 1년 후(t=1) 사업의 가치(이후 현금흐름의 t=1 현재가치)는 수요가 많으면 ${fmt(p.Vu)}억원, 적으면 ${fmt(p.Vd)}억원이며, 수요가 많을 실제 확률은 ${pc(p.pr)}이다.`,
      `이 사업의 위험을 반영한 할인율은 연 ${pc(p.k)}, 무위험이자율은 연 ${pc(p.rf)}이다. 사업가치와 같은 위험을 가진 자산이 시장에서 거래되어 위험중립 평가가 가능하다.`,
      `<b>확장옵션</b>: t=1에 ${fmt(p.X)}억원을 추가 투자하면 사업 규모를 늘려 그 시점 사업가치를 ${pc(p.e)} 높일 수 있다.`,
      `<b>포기옵션</b>: t=1에 사업을 포기하고 설비와 부지를 ${fmt(p.L)}억원에 매각할 수 있다(포기하면 사업가치는 사라진다).`,
      `두 옵션은 t=1에만 행사할 수 있으며, 수요 상황을 확인한 뒤 행사 여부를 결정한다.`,
    ]),
    qs: [
      { lab: '물음 1', type: 'num', text: '옵션을 고려하지 않은 이 사업의 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.npv,
        sol: (p, c) => `V₀ = (${p.pr}×${fmt(p.Vu)} + ${+(1 - p.pr).toFixed(2)}×${fmt(p.Vd)}) ÷ ${1 + p.k} = ${f2(c.V0)}<br>NPV = ${f2(c.V0)} − ${fmt(p.I)} = <b>${f2(c.npv)}</b>` },
      { lab: '물음 2', type: 'num', text: '수요가 많은 상황의 위험중립확률을 구하시오.', unit: '', dp: 4, ans: c => c.q,
        sol: (p, c) => `V₀(1+r_f) = q×${fmt(p.Vu)} + (1−q)×${fmt(p.Vd)}<br>q = (${f2(c.V0)}×${1 + p.rf} − ${fmt(p.Vd)}) ÷ (${fmt(p.Vu)} − ${fmt(p.Vd)}) = <b>${c.q.toFixed(4)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '확장옵션의 현재가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.exp,
        sol: (p, c) => `수요 많음: ${p.e}×${fmt(p.Vu)} − ${fmt(p.X)} = ${f2(c.expU)} (행사), 수요 적음: ${f2(p.e * p.Vd)} − ${fmt(p.X)} < 0 (포기)<br>${c.q.toFixed(4)}×${f2(c.expU)} ÷ ${1 + p.rf} = <b>${f2(c.exp)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '포기옵션의 현재가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.ab,
        sol: (p, c) => `수요 적음: ${fmt(p.L)} − ${fmt(p.Vd)} = ${f2(c.abD)} (행사), 수요 많음: 매각가 < 사업가치 (행사 안 함)<br>${(1 - c.q).toFixed(4)}×${f2(c.abD)} ÷ ${1 + p.rf} = <b>${f2(c.ab)}</b>` },
      { lab: '물음 4 ①', type: 'num', text: '두 옵션을 모두 고려한 이 사업의 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.all,
        sol: (p, c) => `두 옵션은 서로 다른 상황에서 행사되므로(확장은 수요 많음, 포기는 수요 적음) 가치를 더할 수 있다.<br>${f2(c.npv)} + ${f2(c.exp)} + ${f2(c.ab)} = <b>${f2(c.all)}</b>` },
      { lab: '물음 4 ②', type: 'choice', text: '이 사업에 대한 올바른 판단은?', opts: ['옵션이 없어도 채택', '옵션을 고려하면 채택', '옵션을 고려해도 기각'], ans: c => c.dec,
        sol: (p, c) => `옵션 없는 NPV ${f2(c.npv)} < 0, 두 옵션 고려 시 ${f2(c.all)} > 0 → <b>옵션을 고려하면 채택</b>` },
      { lab: '물음 5', type: 'num', text: '확장옵션은 그대로 두고, 이 사업의 NPV를 0으로 만드는 최소 매각가격(포기가치)을 구하시오.', unit: '억원', dp: 2, ans: c => c.Lmin,
        sol: (p, c) => `확장옵션까지 더한 NPV = ${f2(c.npv + c.exp)} → 포기옵션이 ${f2(c.need)} 이상이어야 함<br>(1−q)(L − ${fmt(p.Vd)}) ÷ ${1 + p.rf} = ${f2(c.need)}<br>L = ${fmt(p.Vd)} + ${f2(c.need)}×${1 + p.rf} ÷ ${(1 - c.q).toFixed(4)} = <b>${f2(c.Lmin)}</b>` },
      { lab: '물음 6', type: 'essay', text: '실물옵션의 가치를 위험조정할인율로 할인하지 않고 위험중립확률과 무위험이자율로 평가하는 이유를 두 줄 이내로 설명하시오.',
        model: '옵션은 기초자산보다 위험(레버리지)이 커서 그 위험이 상황마다 달라지므로 기초자산의 위험조정할인율을 그대로 쓸 수 없다. 복제 포트폴리오로 평가하면 위험은 위험중립확률에 반영되고 할인은 무위험이자율로 하면 된다.',
        kw: ['위험', '복제', '위험중립', '무위험', '할인율'] },
    ],
  }));

  /* ───────── 포트폴리오 ① 빈출(효용·최적 포트폴리오) × 새 각도: 위험회피계수 역추정과 새 자산 편입 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-pf-addasset', unit: 'pf', topic: 'util', lv: '상', pts: 20,
    title: '보유 비중으로 위험회피계수 역추정, 샤프비율이 낮은 자산의 편입 효과',
    trend: 'AI 출제 · 최빈출 주제(효용·최적 포트폴리오) 새 접근',
    p: { rf: 0.03, EM: 0.1, sM: 0.2, y0: 0.6, EG: 0.06, sG: 0.15, rho: 0.2 },
    vary(R) {
      for (;;) {
        const rf = R.pick([0.02, 0.03, 0.04]), EM = rf + R.f(0.05, 0.09, 0.005), sM = R.f(0.16, 0.24, 0.01);
        const SM = (EM - rf) / sM, rho = R.pick([0, 0.1, 0.2, 0.3]), sG = R.f(0.1, 0.2, 0.01);
        const SG = SM * R.f(Math.max(rho + 0.15, 0.3), 0.85, 0.05);
        const p = { rf, EM, sM, y0: R.f(0.4, 0.9, 0.05), EG: +(rf + SG * sG).toFixed(4), sG, rho };
        const c = this.calc(p);
        if (c.SG < c.SM && c.SG > p.rho * c.SM + 0.02 && c.wM > 0.2 && c.wM < 0.95 && c.dCE > 0.0002) return p;
      }
    },
    calc(p) {
      const R1 = p.EM - p.rf, R2 = p.EG - p.rf, v1 = p.sM ** 2, v2 = p.sG ** 2, cov = p.rho * p.sM * p.sG;
      const A = R1 / (p.y0 * v1);
      const CE0 = p.rf + p.y0 * R1 - 0.5 * A * p.y0 ** 2 * v1;
      const wM = (R1 * v2 - R2 * cov) / (R1 * v2 + R2 * v1 - (R1 + R2) * cov), wG = 1 - wM;
      const ET = wM * p.EM + wG * p.EG, sT = Math.sqrt(wM ** 2 * v1 + wG ** 2 * v2 + 2 * wM * wG * cov);
      const SM = R1 / p.sM, SG = R2 / p.sG, ST = (ET - p.rf) / sT;
      const y = (ET - p.rf) / (A * sT ** 2);
      const dCE = (ST ** 2 - SM ** 2) / (2 * A);
      return { R1, R2, cov, A, CE0, wM, wG, ET, sT, SM, SG, ST, y, dCE };
    },
    body: (p, c) => `<p>투자자 갑의 효용함수는 U = E(R) − ½·A·σ² 이며(A는 위험회피계수), 현재 전 재산 중 <b>${pc(p.y0)}</b>를 시장 인덱스펀드 M에, 나머지를 무위험자산에 투자하고 있다. 갑의 현재 배분은 M과 무위험자산만 있을 때의 최적 배분이다.</p>`
      + tbl(['자산', '기대수익률', '표준편차'], [['인덱스펀드 M', pc(p.EM), pc(p.sM)], ['인프라펀드 G', p2(p.EG), pc(p.sG)], ['무위험자산', pc(p.rf), '0%']])
      + `<p>M과 G 수익률의 상관계수는 ${p.rho}이며, 공매도·차입·대출은 무위험이자율로 제한 없이 가능하다.</p>`,
    qs: [
      { lab: '물음 1', type: 'num', text: '갑의 위험회피계수 A를 구하시오.', unit: '', dp: 2, ans: c => c.A,
        sol: (p, c) => `최적 비중 y = (E_M − r_f)/(A·σ_M²) → A = ${f4(c.R1)} ÷ (${p.y0}×${f4(p.sM ** 2)}) = <b>${c.A.toFixed(4)}</b>` },
      { lab: '물음 2', type: 'num', text: '갑의 현재 포트폴리오의 확실성등가수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.CE0 * 100,
        sol: (p, c) => `${p.rf} + ${p.y0}×${f4(c.R1)} − ½×${c.A.toFixed(4)}×${p.y0}²×${f4(p.sM ** 2)} = <b>${(c.CE0 * 100).toFixed(4)}%</b>` },
      { lab: '물음 3', type: 'choice', text: 'G의 샤프비율과 M의 샤프비율을 비교하면?', opts: ['G가 더 높다', 'G가 더 낮다', '같다'], ans: c => (c.SG > c.SM ? 0 : c.SG < c.SM ? 1 : 2),
        sol: (p, c) => `M: ${f4(c.R1)}/${p.sM} = ${c.SM.toFixed(4)}, G: ${f4(c.R2)}/${p.sG} = ${c.SG.toFixed(4)} → <b>G가 더 낮다</b>` },
      { lab: '물음 4 ①', type: 'num', text: 'M과 G로 구성한 접점 포트폴리오에서 M의 투자 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.wM * 100,
        sol: (p, c) => `Cov = ${p.rho}×${p.sM}×${p.sG} = ${c.cov.toFixed(6)}<br>w_M = [${f4(c.R1)}×${f4(p.sG ** 2)} − ${f4(c.R2)}×${c.cov.toFixed(6)}] ÷ [${f4(c.R1)}×${f4(p.sG ** 2)} + ${f4(c.R2)}×${f4(p.sM ** 2)} − (${f4(c.R1)} + ${f4(c.R2)})×${c.cov.toFixed(6)}] = <b>${(c.wM * 100).toFixed(4)}%</b>` },
      { lab: '물음 4 ②', type: 'num', text: '그 접점 포트폴리오의 샤프비율을 구하시오.', unit: '', dp: 4, ans: c => c.ST,
        sol: (p, c) => `E = ${(c.ET * 100).toFixed(4)}%, σ = ${(c.sT * 100).toFixed(4)}% → (${f4(c.ET)} − ${p.rf}) ÷ ${c.sT.toFixed(6)} = <b>${c.ST.toFixed(4)}</b> (M의 ${c.SM.toFixed(4)}보다 큼)` },
      { lab: '물음 5', type: 'num', text: 'G를 편입할 수 있게 된 뒤 갑이 접점 포트폴리오에 투자할 최적 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.y * 100,
        sol: (p, c) => `y* = (${f4(c.ET)} − ${p.rf}) ÷ (${c.A.toFixed(4)}×${(c.sT ** 2).toFixed(6)}) = <b>${(c.y * 100).toFixed(4)}%</b>` },
      { lab: '물음 6', type: 'num', text: 'G 편입으로 갑의 확실성등가수익률은 몇 %p 높아지는가?', unit: '%p', dp: 2, ans: c => c.dCE * 100,
        sol: (p, c) => `최적 배분에서 CE = r_f + S²/(2A) → ΔCE = (${c.ST.toFixed(4)}² − ${c.SM.toFixed(4)}²) ÷ (2×${c.A.toFixed(4)}) = <b>${(c.dCE * 100).toFixed(4)}%p</b>` },
      { lab: '물음 7', type: 'essay', text: '샤프비율이 M보다 낮은 G를 편입했는데도 최적 포트폴리오의 샤프비율이 높아진 이유와, 편입이 이득이 되는 조건을 두 줄 이내로 쓰시오.',
        model: '상관계수가 1보다 작아 분산투자 효과가 생기기 때문이다. G의 샤프비율이 (상관계수 × M의 샤프비율)보다 크면, 즉 E(R_G) − r_f > ρ·σ_G·(E(R_M) − r_f)/σ_M 이면 G를 일부 편입해 샤프비율을 높일 수 있다.',
        kw: ['상관계수', '분산투자', '샤프비율', 'ρ', '조건'] },
    ],
  }));

  /* ───────── 포트폴리오 ② 출제 공백(성과평가): 트레이너-블랙 모형 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-pf-treynorblack', unit: 'pf', topic: 'perf', lv: '상', pts: 15,
    title: '정보비율과 트레이너-블랙 모형: 액티브 펀드의 최적 편입 비중과 M²',
    trend: 'AI 출제 · 출제 공백 주제(성과평가) 새 접근',
    p: { rf: 0.03, EM: 0.09, sM: 0.18, al: 0.015, be: 1.2, se: 0.1 },
    vary(R) {
      for (;;) {
        const rf = R.pick([0.02, 0.03, 0.04]), p = { rf, EM: rf + R.f(0.05, 0.08, 0.005), sM: R.f(0.15, 0.22, 0.01), al: R.f(0.01, 0.035, 0.0025), be: R.pick([0.8, 0.9, 1.1, 1.2, 1.3]), se: R.f(0.06, 0.15, 0.01) };
        const c = this.calc(p);
        if (c.w0 > 0.1 && c.w0 < 1.2 && c.ws > 0.05 && c.ws < 1.2) return p;
      }
    },
    calc(p) {
      const SM = (p.EM - p.rf) / p.sM, IR = p.al / p.se;
      const w0 = (p.al / p.se ** 2) / ((p.EM - p.rf) / p.sM ** 2);
      const ws = w0 / (1 + (1 - p.be) * w0);
      const SP = Math.sqrt(SM ** 2 + IR ** 2), M2 = (SP - SM) * p.sM;
      return { SM, IR, w0, ws, SP, M2 };
    },
    body: (p, c) => `<p>연기금 운용역 김씨는 시장 인덱스펀드 M에 투자하면서, 증권분석으로 저평가 종목을 고른 액티브 펀드 A를 함께 편입할지 검토하고 있다. A의 수익률은 단일지수모형 R_A − r_f = α_A + β_A(R_M − r_f) + e_A 를 따른다.</p>`
      + tbl(['항목', '값'], [['무위험이자율', pc(p.rf)], ['M의 기대수익률', p2(p.EM)], ['M의 표준편차', pc(p.sM)], ['A의 알파(α_A)', p2(p.al)], ['A의 베타(β_A)', String(p.be)], ['A의 잔차 표준편차 σ(e_A)', pc(p.se)]])
      + `<p>김씨는 M과 A로 샤프비율이 가장 큰 위험 포트폴리오를 만들며, 공매도는 가능하다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '시장 인덱스펀드 M의 샤프비율을 구하시오.', unit: '', dp: 4, ans: c => c.SM, sol: (p, c) => `(${f4(p.EM)} − ${p.rf}) ÷ ${p.sM} = <b>${c.SM.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '액티브 펀드 A의 정보비율(알파 ÷ 잔차 표준편차)을 구하시오.', unit: '', dp: 4, ans: c => c.IR, sol: (p, c) => `${f4(p.al)} ÷ ${p.se} = <b>${c.IR.toFixed(4)}</b>` },
      { lab: '물음 2', type: 'num', text: '베타를 1로 가정했을 때 위험 포트폴리오에서 A의 초기 비중 w₀ = (α/σ²(e)) ÷ [(E(R_M) − r_f)/σ_M²] 를 구하시오.', unit: '%', dp: 2, ans: c => c.w0 * 100,
        sol: (p, c) => `(${f4(p.al)}/${f4(p.se ** 2)}) ÷ (${f4(p.EM - p.rf)}/${f4(p.sM ** 2)}) = <b>${(c.w0 * 100).toFixed(4)}%</b>` },
      { lab: '물음 3', type: 'num', text: 'A의 실제 베타를 반영해 조정한 최적 비중 w* = w₀ ÷ [1 + (1 − β_A)w₀] 를 구하시오.', unit: '%', dp: 2, ans: c => c.ws * 100,
        sol: (p, c) => `${c.w0.toFixed(6)} ÷ [1 + (1 − ${p.be})×${c.w0.toFixed(6)}] = <b>${(c.ws * 100).toFixed(4)}%</b>${p.be > 1 ? ' (베타가 1보다 커서 비중을 낮춤)' : ' (베타가 1보다 작아 비중을 높임)'}` },
      { lab: '물음 4', type: 'num', text: '최적 위험 포트폴리오의 샤프비율을 구하시오.', unit: '', dp: 4, ans: c => c.SP,
        sol: (p, c) => `S_P² = S_M² + (정보비율)² → √(${c.SM.toFixed(4)}² + ${c.IR.toFixed(4)}²) = <b>${c.SP.toFixed(4)}</b>` },
      { lab: '물음 5', type: 'num', text: '최적 위험 포트폴리오를 무위험자산과 섞어 표준편차를 M과 같게 만들었을 때, M보다 기대수익률이 몇 %p 높은가? (M² 측정치)', unit: '%p', dp: 2, ans: c => c.M2 * 100,
        sol: (p, c) => `M² = (S_P − S_M)×σ_M = (${c.SP.toFixed(4)} − ${c.SM.toFixed(4)})×${p.sM} = <b>${(c.M2 * 100).toFixed(4)}%p</b>` },
      { lab: '물음 6', type: 'essay', text: '알파 추정치에 오차가 클 때 트레이너-블랙 모형의 최적 비중을 그대로 쓰면 생기는 문제와 보완 방법을 두 줄 이내로 설명하시오.',
        model: '최적 비중은 알파에 비례하므로 추정 오차가 큰 알파를 그대로 쓰면 액티브 비중이 과도해져 실제로는 잔차위험만 커질 수 있다. 과거 예측 정확도(예측 알파와 실현 알파의 관계)로 알파를 줄여(축소 조정) 반영한다.',
        kw: ['오차', '과도', '잔차', '축소', '조정'] },
    ],
  }));

  /* ───────── 채권 ① 빈출(기간구조) × 새 각도: 수익률곡선 타기 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-bd-ride', unit: 'bd', topic: 'term', lv: '중', pts: 15,
    title: '수익률곡선 타기 전략: 보유수익률·선도이자율·손익분기 이자율',
    trend: 'AI 출제 · 빈출 주제(기간구조) 새 접근',
    p: { s1: 0.03, s2: 0.04, s3: 0.045, sh: 0.01 },
    vary(R) {
      const s1 = R.f(0.02, 0.04, 0.0025), s2 = s1 + R.f(0.004, 0.012, 0.001), s3 = s2 + R.f(0.002, 0.008, 0.001);
      return { s1: +s1.toFixed(4), s2: +s2.toFixed(4), s3: +s3.toFixed(4), sh: R.pick([0.005, 0.0075, 0.01]) };
    },
    calc(p) {
      const P1 = Math.round(10000 / (1 + p.s1)), P2 = Math.round(10000 / (1 + p.s2) ** 2), P3 = Math.round(10000 / (1 + p.s3) ** 3);
      const y1 = 10000 / P1 - 1, y2 = Math.sqrt(10000 / P2) - 1, y3 = Math.cbrt(10000 / P3) - 1;
      const f12 = P1 / P2 - 1, f23 = P2 / P3 - 1;
      const hpr = P2 / P3 - 1;
      const Psh = 10000 / (1 + y2 + p.sh) ** 2, hprSh = Psh / P3 - 1;
      const be = Math.sqrt(10000 / (P3 * (1 + y1))) - 1;
      return { P1, P2, P3, y1, y2, y3, f12, f23, hpr, Psh, hprSh, be };
    },
    body: (p, c) => `<p>현재 시장에서 액면 10,000원인 무위험 무이표채가 다음 가격에 거래되고 있다. 펀드매니저 이씨의 투자기간은 1년이다.</p>`
      + tbl(['만기', '1년', '2년', '3년'], [['가격(원)', fmt(c.P1), fmt(c.P2), fmt(c.P3)]])
      + `<p>이씨는 1년 만기 채권을 사서 만기까지 보유하는 대신, 3년 만기 채권을 사서 1년 후 매도하는 전략(수익률곡선 타기)을 검토하고 있다. 거래비용과 세금은 없다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '2년 만기 현물이자율을 구하시오.', unit: '%', dp: 2, ans: c => c.y2 * 100,
        sol: (p, c) => `(10,000/${fmt(c.P2)})^(1/2) − 1 = <b>${(c.y2 * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ②', type: 'num', text: '1년 후부터 1년간 적용되는 선도이자율 f(1,2)를 구하시오.', unit: '%', dp: 2, ans: c => c.f12 * 100,
        sol: (p, c) => `f(1,2) = P₁/P₂ − 1 = ${fmt(c.P1)}/${fmt(c.P2)} − 1 = <b>${(c.f12 * 100).toFixed(4)}%</b>` },
      { lab: '물음 2', type: 'num', text: '1년 후 현물이자율 곡선이 지금과 똑같다면, 3년 만기 채권을 사서 1년 후 매도할 때의 1년 보유수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.hpr * 100,
        sol: (p, c) => `1년 후 이 채권은 잔존만기 2년 → 가격은 지금의 2년 채권 가격 ${fmt(c.P2)}원<br>${fmt(c.P2)}/${fmt(c.P3)} − 1 = <b>${(c.hpr * 100).toFixed(4)}%</b> (1년 채권 ${(c.y1 * 100).toFixed(4)}%보다 높음). 이 값은 2년 후 1년 선도이자율 f(2,3) = P₂/P₃ − 1 과 같다.` },
      { lab: '물음 3', type: 'num', textf: p => `1년 후 2년 만기 현물이자율이 (물음 1 ①)의 값보다 ${(p.sh * 100).toFixed(2)}%p 높아진다면, 이 전략의 1년 보유수익률은?`, unit: '%', dp: 2, ans: c => c.hprSh * 100,
        sol: (p, c) => `매도가격 = 10,000/(1 + ${(c.y2 + p.sh).toFixed(6)})² = ${f2(c.Psh)}<br>${f2(c.Psh)}/${fmt(c.P3)} − 1 = <b>${(c.hprSh * 100).toFixed(4)}%</b>` },
      { lab: '물음 4', type: 'num', text: '1년 후 2년 만기 현물이자율이 몇 % 이하이면 이 전략이 1년 만기 채권 보유보다 유리한가? (손익분기 이자율)', unit: '%', dp: 2, ans: c => c.be * 100,
        sol: (p, c) => `매도가격 ≥ ${fmt(c.P3)}×(1+${(c.y1 * 100).toFixed(4)}%) ⇔ 10,000/(1+y)² ≥ ${f2(c.P3 * (1 + c.y1))}<br>y ≤ √(10,000/${f2(c.P3 * (1 + c.y1))}) − 1 = <b>${(c.be * 100).toFixed(4)}%</b> — 기대가설에서는 이것이 1년 후 2년 현물이자율의 기대값(선도이자율)과 같다.` },
      { lab: '물음 5', type: 'choice', text: '순수기대가설이 성립한다면 이 전략의 기대 1년 보유수익률은 1년 만기 채권 수익률과 비교해 어떠한가? (금리 변동성에 따른 볼록성 효과는 무시)', opts: ['더 높다', '같다', '더 낮다'], ans: () => 1,
        sol: () => '순수기대가설에서는 선도이자율이 미래 현물이자율의 기대값이므로 모든 만기 채권의 기대 1년 보유수익률이 1년 현물이자율과 <b>같다</b>. 곡선 타기의 초과수익은 곡선이 그대로 유지될 때(기대보다 금리가 덜 오를 때)에만 생긴다.' },
      { lab: '물음 6', type: 'essay', text: '(물음 2)의 보유수익률이 선도이자율 f(2,3)과 같아지는 이유를 두 줄 이내로 설명하시오.',
        model: '곡선이 그대로이면 1년 후 매도가격은 지금의 2년 채권 가격과 같으므로 보유수익률은 P₂/P₃ − 1 이다. 이는 2년 후 1년간의 선도이자율 정의와 같아, 결국 가장 긴 구간의 선도이자율만큼 1년 동안 벌게 된다.',
        kw: ['매도가격', '2년', '선도이자율', 'P₂/P₃', '그대로'] },
    ],
  }));

  /* ───────── 채권 ② 출제 공백(신용위험): 위험중립 부도확률과 CDS ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-bd-cds', unit: 'bd', topic: 'credit', lv: '상', pts: 15,
    title: '회사채 가격으로 위험중립 부도확률 역산, 신용스프레드와 CDS 프리미엄',
    trend: 'AI 출제 · 출제 공백 주제(신용위험) 새 접근',
    p: { s1: 0.03, s2: 0.035, R: 0.4, cp: 0.06, l1: 0.02, l2: 0.03 },
    vary(R) {
      const s1 = R.f(0.02, 0.04, 0.0025);
      return { s1, s2: +(s1 + R.f(0.0025, 0.01, 0.0025)).toFixed(4), R: R.pick([0.3, 0.4, 0.5]), cp: R.pick([0.05, 0.06, 0.07]), l1: R.f(0.01, 0.04, 0.005), l2: R.f(0.015, 0.05, 0.005) };
    },
    calc(p) {
      const F = 10000, d1 = 1 / (1 + p.s1), d2 = 1 / (1 + p.s2) ** 2, C = F * p.cp;
      const PX = Math.round(((1 - p.l1) * F + p.l1 * p.R * F) * d1);
      const PY = Math.round(((1 - p.l1) * C + p.l1 * p.R * F) * d1 + (1 - p.l1) * ((1 - p.l2) * (F + C) + p.l2 * p.R * F) * d2);
      const q1 = (F - PX * (1 + p.s1)) / (F * (1 - p.R));
      const spr = F / PX - 1 - p.s1;
      const first = ((1 - q1) * C + q1 * p.R * F) * d1;
      const rest = (PY - first) / ((1 - q1) * d2);   // = (1−q2)(F+C) + q2·R·F
      const q2 = (F + C - rest) / (F + C - p.R * F);
      const surv = (1 - q1) * (1 - q2);
      const prot = (1 - p.R) * (q1 * d1 + (1 - q1) * q2 * d2), prem = (1 - q1) * d1 + surv * d2, cds = prot / prem;
      return { F, C, PX, PY, q1, spr, first, rest, q2, surv, prot, prem, cds };
    },
    body: (p, c) => `<p>현재 무위험 현물이자율은 1년 ${p2(p.s1)}, 2년 ${p2(p.s2)}이다. ㈜대양건설이 발행한 다음 두 채권이 시장에서 거래되고 있다(액면 10,000원).</p>`
      + tbl(['채권', '만기', '액면이자(연 1회)', '현재 가격'], [['X (무이표채)', '1년', '-', `${fmt(c.PX)}원`], ['Y (이표채)', '2년', `${pc(p.cp)}`, `${fmt(c.PY)}원`]])
      + ul([`부도는 각 연도 말에만 일어나며, 부도가 나면 그 해의 이자는 받지 못하고 액면의 ${pc(p.R)}를 그 시점에 회수한다.`,
        `가격은 위험중립 부도확률로 기대현금흐름을 구해 무위험 현물이자율로 할인한 값과 같다. 2년차 부도확률은 1년차에 부도나지 않았을 때의 조건부 확률이다.`]),
    qs: [
      { lab: '물음 1', type: 'num', text: '1년차 위험중립 부도확률을 구하시오.', unit: '%', dp: 2, ans: c => c.q1 * 100,
        sol: (p, c) => `${fmt(c.PX)} = [(1−q₁)×10,000 + q₁×${p.R}×10,000] ÷ ${(1 + p.s1).toFixed(4)}<br>q₁ = (10,000 − ${fmt(c.PX)}×${(1 + p.s1).toFixed(4)}) ÷ (10,000×${+(1 - p.R).toFixed(2)}) = <b>${(c.q1 * 100).toFixed(4)}%</b>` },
      { lab: '물음 2', type: 'num', text: '채권 X의 신용스프레드(만기수익률 − 무위험이자율)를 구하시오.', unit: '%p', dp: 2, ans: c => c.spr * 100,
        sol: (p, c) => `X의 만기수익률 = 10,000/${fmt(c.PX)} − 1 = ${((10000 / c.PX - 1) * 100).toFixed(4)}% → 스프레드 = <b>${(c.spr * 100).toFixed(4)}%p</b>` },
      { lab: '물음 3', type: 'num', text: '채권 Y의 가격을 이용해 2년차 조건부 위험중립 부도확률을 구하시오.', unit: '%', dp: 2, ans: c => c.q2 * 100,
        sol: (p, c) => `1년차 기대현금흐름의 현가 = [(1−q₁)×${fmt(c.C)} + q₁×${fmt(p.R * c.F)}] ÷ ${(1 + p.s1).toFixed(4)} = ${f2(c.first)}<br>2년차: (${fmt(c.PY)} − ${f2(c.first)}) ÷ [(1−q₁)×PVIF₂] = ${f2(c.rest)} = (1−q₂)×${fmt(c.F + c.C)} + q₂×${fmt(p.R * c.F)}<br>q₂ = (${fmt(c.F + c.C)} − ${f2(c.rest)}) ÷ (${fmt(c.F + c.C)} − ${fmt(p.R * c.F)}) = <b>${(c.q2 * 100).toFixed(4)}%</b>` },
      { lab: '물음 4', type: 'num', text: '2년 동안 부도나지 않을 위험중립 확률(누적 생존확률)을 구하시오.', unit: '%', dp: 2, ans: c => c.surv * 100,
        sol: (p, c) => `(1 − ${c.q1.toFixed(6)})×(1 − ${c.q2.toFixed(6)}) = <b>${(c.surv * 100).toFixed(4)}%</b>` },
      { lab: '물음 5', type: 'num', text: '㈜대양건설을 준거기업으로 하는 만기 2년 CDS의 공정 연간 프리미엄(명목금액 대비)을 구하시오. 프리미엄은 각 연도 말, 그 해에 부도가 없었을 때만 지급하며, 부도 시 보장매도자는 명목금액 × (1 − 회수율)을 지급한다.', unit: '%', dp: 2, ans: c => c.cds * 100,
        sol: (p, c) => `보장 다리 = ${+(1 - p.R).toFixed(2)}×[q₁×PVIF₁ + (1−q₁)q₂×PVIF₂] = ${c.prot.toFixed(6)}<br>프리미엄 다리(1원당) = (1−q₁)×PVIF₁ + (1−q₁)(1−q₂)×PVIF₂ = ${c.prem.toFixed(6)}<br>프리미엄 = ${c.prot.toFixed(6)} ÷ ${c.prem.toFixed(6)} = <b>${(c.cds * 100).toFixed(4)}%</b>` },
      { lab: '물음 6', type: 'essay', text: '시장가격에서 구한 위험중립 부도확률이 신용평가사의 실제(역사적) 부도율보다 높게 나타나는 이유를 두 줄 이내로 설명하시오.',
        model: '위험중립 부도확률에는 투자자가 부도위험을 부담하는 대가(신용위험 프리미엄)와 유동성 프리미엄이 함께 반영되어 있다. 위험회피적인 투자자는 부도가 나는 나쁜 상황에 더 큰 가중치를 두므로 실제 확률보다 높게 나온다.',
        kw: ['위험 프리미엄', '위험회피', '유동성', '가중치', '실제'] },
    ],
  }));

  /* ───────── 파생상품 ① 빈출(이항모형) × 새 각도: 원금보장형 ELS 분해 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-dv-els', unit: 'dv', topic: 'bin', lv: '상', pts: 20,
    title: '원금보장형 ELS를 무이표채와 콜옵션으로 분해: 공정 참여율과 수익 상한',
    trend: 'AI 출제 · 빈출 주제(이항모형) 새 접근',
    p: { N: 10000, u: 1.2, d: 0.9, rf: 0.03, fee: 0.01, g: 0.3 },
    vary(R) {
      for (;;) {
        const p = { N: R.pick([5000, 10000, 20000]), u: R.pick([1.15, 1.2, 1.25]), d: R.pick([0.85, 0.9]), rf: R.pick([0.02, 0.03, 0.04]), fee: R.pick([0.005, 0.01, 0.015]), g: R.pick([0.2, 0.25, 0.3, 0.35]) };
        const ud = p.u * p.d, uu = p.u * p.u;
        if (1 + p.g > ud + 0.02 && 1 + p.g < uu - 0.02) { const c = this.calc(p); if (c.k > 0.2 && c.k2 > c.k) return p; }
      }
    },
    calc(p) {
      const q = (1 + p.rf - p.d) / (p.u - p.d), D2 = 1 / (1 + p.rf) ** 2;
      const S = [100 * p.u * p.u, 100 * p.u * p.d, 100 * p.d * p.d], w = [q * q, 2 * q * (1 - q), (1 - q) ** 2];
      const call = K => S.reduce((s, x, i) => s + w[i] * Math.max(0, x - K), 0) * D2;
      const B = p.N * D2, C = call(100), C2 = call(100 * (1 + p.g));
      const budget = p.N * (1 - p.fee) - B, nC = p.N / 100;
      const k = budget / (C * nC), k2 = budget / ((C - C2) * nC);
      const pay = p.N * (1 + k2 * Math.min(Math.max(0, S[0] / 100 - 1), p.g));
      return { q, S, B, C, C2, budget, nC, k, k2, pay };
    },
    body: (p, c) => `<p>㈜미래증권은 KOSPI200 지수(현재 100.00)를 기초자산으로 하는 만기 2년 원금보장형 ELS를 발행하려 한다. 금액 단위는 만원이며, 고객 1인당 투자금(원금)은 ${fmt(p.N)}만원이다.</p>` + ul([
      `만기 상환금액 = 원금 × [1 + 참여율 × max(0, 만기 지수 ÷ 100 − 1)]. 중도 상환은 없다.`,
      `지수는 매년 ${p.u}배로 오르거나 ${p.d}배로 내리는 2기간 이항과정을 따르며, 배당은 없다. 무위험이자율은 연 ${pc(p.rf)}(연 복리)이다.`,
      `증권사는 투자금의 ${pc(p.fee)}를 발행 시점에 판매·운용 수수료로 떼고, 나머지로 무위험채권과 지수 콜옵션(지수 1포인트 = 1만원)을 사서 상환금액을 복제한다.`,
    ]),
    qs: [
      { lab: '물음 1', type: 'num', text: '원금 보장을 위해 필요한 무위험채권(무이표채)의 현재 매입금액을 구하시오.', unit: '만원', dp: 2, ans: c => c.B,
        sol: (p, c) => `${fmt(p.N)} ÷ ${(1 + p.rf).toFixed(2)}² = <b>${f2(c.B)}</b>` },
      { lab: '물음 2', type: 'num', text: '만기 2년, 행사가격 100인 유럽형 지수 콜옵션 1계약(지수 1포인트)의 현재가치를 구하시오.', unit: '만원', dp: 4, ans: c => c.C,
        sol: (p, c) => `q = (1 + ${p.rf} − ${p.d}) ÷ (${p.u} − ${p.d}) = ${c.q.toFixed(4)}<br>만기 지수 ${c.S.map(x => x.toFixed(2)).join(' / ')} → 콜 가치 ${c.S.map(x => Math.max(0, x - 100).toFixed(2)).join(' / ')}<br>[${c.q.toFixed(4)}²×${Math.max(0, c.S[0] - 100).toFixed(2)} + 2×${c.q.toFixed(4)}×${(1 - c.q).toFixed(4)}×${Math.max(0, c.S[1] - 100).toFixed(2)}] ÷ ${(1 + p.rf).toFixed(2)}² = <b>${c.C.toFixed(4)}</b>` },
      { lab: '물음 3', type: 'num', text: '수수료를 뗀 뒤 남는 금액으로 상환금액을 정확히 복제할 수 있는 공정 참여율을 구하시오.', unit: '%', dp: 2, ans: c => c.k * 100,
        sol: (p, c) => `콜 매입에 쓸 수 있는 금액 = ${fmt(p.N)}×(1−${p.fee}) − ${f2(c.B)} = ${f2(c.budget)}<br>참여율 k만큼 복제하려면 콜 ${fmt(c.nC)}×k 계약 필요 → k = ${f2(c.budget)} ÷ (${c.C.toFixed(4)}×${fmt(c.nC)}) = <b>${(c.k * 100).toFixed(4)}%</b>` },
      { lab: '물음 4', type: 'num', textf: p => `지수 상승률에 ${pc(p.g)}의 상한을 두어 상환금액을 원금 × [1 + 참여율 × min(max(0, 만기 지수 ÷ 100 − 1), ${p.g})]로 바꾸면 공정 참여율은?`, unit: '%', dp: 2, ans: c => c.k2 * 100,
        sol: (p, c) => `상한 = 행사가격 100 콜 매입 + 행사가격 ${(100 * (1 + p.g)).toFixed(0)} 콜 매도(강세 스프레드)<br>행사가격 ${(100 * (1 + p.g)).toFixed(0)} 콜 = ${c.q.toFixed(4)}²×${Math.max(0, c.S[0] - 100 * (1 + p.g)).toFixed(2)} ÷ ${(1 + p.rf).toFixed(2)}² = ${c.C2.toFixed(4)}<br>k = ${f2(c.budget)} ÷ [(${c.C.toFixed(4)} − ${c.C2.toFixed(4)})×${fmt(c.nC)}] = <b>${(c.k2 * 100).toFixed(4)}%</b>` },
      { lab: '물음 5', type: 'num', text: '(물음 4)의 상품에서 지수가 2년 연속 상승했을 때 고객이 받는 만기 상환금액을 구하시오.', unit: '만원', dp: 2, ans: c => c.pay,
        sol: (p, c) => `만기 지수 ${c.S[0].toFixed(2)} → 상승률 ${((c.S[0] / 100 - 1) * 100).toFixed(2)}% 중 상한 ${pc(p.g)}만 인정<br>${fmt(p.N)}×(1 + ${c.k2.toFixed(6)}×${p.g}) = <b>${f2(c.pay)}</b>` },
      { lab: '물음 6', type: 'essay', text: '다른 조건이 같을 때 무위험이자율이 낮아지면 원금보장형 ELS의 참여율이 낮아지는 이유를 두 줄 이내로 설명하시오.',
        model: '금리가 낮으면 원금을 보장하는 무이표채 가격이 비싸져 콜옵션을 살 수 있는 금액이 줄어든다. 금리가 낮아지면 콜옵션 가격도 내려가 참여율을 높이는 방향으로 작용하지만, 일반적인 조건에서는 채권 매입액 증가 효과가 더 커서 참여율이 낮아진다.',
        kw: ['무이표채', '채권 가격', '콜옵션', '금액', '줄어'] },
    ],
  }));

  /* ───────── 파생상품 ② 출제 공백(스왑): 통화스왑 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-dv-ccs', unit: 'dv', topic: 'swap', lv: '하', pts: 10,
    title: '비교우위에 따른 통화스왑의 이득 배분과 스왑 가치평가',
    trend: 'AI 출제 · 출제 공백 주제(스왑) 새 접근',
    p: { a1: 0.04, a2: 0.06, b1: 0.055, b2: 0.065, m: 0.002, Nw: 1300, Nd: 100, cw: 0.04, cd: 0.056, S1: 1400, rw: 0.035, rd: 0.05 },
    vary(R) {
      for (;;) {
        const a1 = R.f(0.03, 0.045, 0.0025), b1 = a1 + R.f(0.01, 0.02, 0.0025), a2 = R.f(0.05, 0.065, 0.0025), b2 = a2 + R.f(0, 0.0075, 0.0025);
        const S0 = R.pick([1200, 1250, 1300, 1350]), Nd = R.pick([50, 100, 200]);
        const p = { a1, a2, b1, b2, m: R.pick([0.001, 0.002, 0.003]), Nw: S0 * Nd / 100, Nd, cw: a1, cd: 0, S1: S0 + R.int(-100, 150, 10), rw: a1 + R.f(-0.01, 0.005, 0.0025), rd: a2 + R.f(-0.01, 0.005, 0.0025) };
        const c = this.calc(p);
        p.cd = +c.effD.toFixed(4);
        if (c.G - p.m > 0.002) return p;
      }
    },
    calc(p) {
      const G = (p.b1 - p.a1) - (p.b2 - p.a2), effD = p.a2 - (G - p.m) / 2;
      const Bw = p.Nw * p.cw / (1 + p.rw) + p.Nw * (1 + p.cw) / (1 + p.rw) ** 2;
      const Bd = p.Nd * p.cd / (1 + p.rd) + p.Nd * (1 + p.cd) / (1 + p.rd) ** 2;
      const V = Bw - p.S1 * Bd / 100, Sbe = Bw / Bd * 100;
      return { G, effD, Bw, Bd, V, Sbe };
    },
    body: (p, c) => `<p>한국의 ㈜한별전자는 미국 공장 건설에 달러 자금이, 미국의 Apex사는 한국 지사 운영에 원화 자금이 필요하다. 두 회사가 각 통화로 직접 차입할 때의 고정금리는 다음과 같다.</p>`
      + tbl(['', '원화 차입', '달러 차입'], [['㈜한별전자', p2(p.a1), p2(p.a2)], ['Apex사', p2(p.b1), p2(p.b2)]])
      + `<p>두 회사는 각자 비교우위가 있는 통화로 차입한 뒤 은행을 통해 원금과 이자를 교환하는 통화스왑을 맺는다. 은행은 연 ${p2(p.m)}의 중개 수수료를 가져가고, 남는 이득은 두 회사가 똑같이 나눈다.</p>`,
    qs: [
      { lab: '물음 1', type: 'num', text: '두 회사가 스왑으로 얻을 수 있는 총 금리 이득(은행 수수료 포함)을 구하시오.', unit: '%p', dp: 2, ans: c => c.G * 100,
        sol: (p, c) => `원화 금리차 ${((p.b1 - p.a1) * 100).toFixed(2)}%p − 달러 금리차 ${((p.b2 - p.a2) * 100).toFixed(2)}%p = <b>${(c.G * 100).toFixed(2)}%p</b> (㈜한별전자는 원화, Apex사는 달러에 비교우위)` },
      { lab: '물음 2', type: 'num', text: '스왑 후 ㈜한별전자가 부담하는 실효 달러 차입금리(원화 차입·스왑을 합친 결과)를 구하시오.', unit: '%', dp: 2, ans: c => c.effD * 100,
        sol: (p, c) => `회사별 이득 = (${(c.G * 100).toFixed(2)} − ${(p.m * 100).toFixed(2)}) ÷ 2 = ${((c.G - p.m) / 2 * 100).toFixed(3)}%p<br>${p2(p.a2)} − ${((c.G - p.m) / 2 * 100).toFixed(3)}%p = <b>${(c.effD * 100).toFixed(4)}%</b>` },
      { lab: '물음 3', type: 'num', textf: p => `1년 후 ㈜한별전자의 스왑 포지션은 원화 원금 ${fmt(p.Nw)}억원에 연 ${p2(p.cw)} 원화 이자를 받고, 달러 원금 ${fmt(p.Nd)}백만 달러에 연 ${p2(p.cd)} 달러 이자를 지급하는 계약이며 잔존 2년(연 1회 이자, 만기에 원금 재교환)이다. 이때 원화 금리는 연 ${p2(p.rw)}, 달러 금리는 연 ${p2(p.rd)}(만기 무관 동일), 환율은 1달러당 ${fmt(p.S1)}원이다. ㈜한별전자 입장에서 스왑의 가치를 구하시오. (1백만 달러 × 1원/달러 = 1백만원)`, unit: '억원', dp: 2, ans: c => c.V,
        sol: (p, c) => `원화 채권 가치 = ${f2(p.Nw * p.cw)}/${(1 + p.rw).toFixed(4)} + ${f2(p.Nw * (1 + p.cw))}/${(1 + p.rw).toFixed(4)}² = ${f2(c.Bw)}억원<br>달러 채권 가치 = ${f4(p.Nd * p.cd)}/${(1 + p.rd).toFixed(4)} + ${f4(p.Nd * (1 + p.cd))}/${(1 + p.rd).toFixed(4)}² = ${f4(c.Bd)}백만 달러 → ×${fmt(p.S1)}원 = ${f2(p.S1 * c.Bd / 100)}억원<br>스왑 가치 = 받는 원화 − 주는 달러 = <b>${f2(c.V)}</b>` },
      { lab: '물음 4', type: 'num', text: '(물음 3)에서 다른 조건이 같을 때, 환율이 몇 원 이상이면 ㈜한별전자의 스왑 가치가 음수가 되는가?', unit: '원', dp: 2, ans: c => c.Sbe,
        sol: (p, c) => `${f2(c.Bw)}억원 ÷ ${f4(c.Bd)}백만 달러 × 100 = <b>${f2(c.Sbe)}</b>원/달러 — 달러 지급 포지션이므로 원화 약세(환율 상승)에 손해` },
    ],
  }));

  /* ───────── 기업재무 ① 빈출(자본구조) × 새 각도: 상충이론과 자본재구성 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-cf-tradeoff', unit: 'cf', topic: 'mm', lv: '중', pts: 15,
    title: '상충이론에 따른 최적 부채와 차입 자사주 매입의 주가 효과',
    trend: 'AI 출제 · 빈출 주제(자본구조) 새 접근',
    p: { EBIT: 300, rho: 0.12, t: 0.25, N: 100, kd: 0.06, Ds: [400, 800, 1200], BC: [10, 60, 200] },
    vary(R) {
      for (;;) {
        const EBIT = R.int(200, 500, 20), rho = R.pick([0.1, 0.12, 0.14]), t = R.pick([0.2, 0.25]);
        const VU = EBIT * (1 - t) / rho, D1 = Math.round(VU * R.f(0.15, 0.25, 0.01) / 50) * 50, D2 = D1 * 2, D3 = D1 * 3;
        const b1 = Math.round(t * D1 * R.f(0.05, 0.3, 0.05)), b2 = Math.round(t * D2 * R.f(0.35, 0.75, 0.05)), b3 = Math.round(t * D3 * R.f(0.85, 1.3, 0.05));
        const p = { EBIT, rho, t, N: R.pick([50, 100, 200]), kd: R.pick([0.05, 0.06, 0.07]), Ds: [D1, D2, D3], BC: [b1, b2, b3] };
        const c = this.calc(p);
        const vs = c.VL.slice().sort((a, b) => b - a);
        if (vs[0] - vs[1] > 3 && c.EPS1 > 0) return p;
      }
    },
    calc(p) {
      const VU = p.EBIT * (1 - p.t) / p.rho;
      const VL = p.Ds.map((D, i) => VU + p.t * D - p.BC[i]);
      const bi = VL.indexOf(Math.max(...VL)), D = p.Ds[bi];
      const P1 = VL[bi] / p.N * 1e4;          // 억원/만주 → 원
      const n = D / P1 * 1e4;                 // 매입 주식 수(만주)
      const EPS0 = p.EBIT * (1 - p.t) / p.N * 1e4;
      const EPS1 = (p.EBIT - p.kd * D) * (1 - p.t) / (p.N - n) * 1e4;
      const marg = p.t * (p.Ds[2] - p.Ds[1]) - (p.BC[2] - p.BC[1]);
      return { VU, VL, bi, D, P1, n, EPS0, EPS1, marg };
    },
    body: (p, c) => `<p>무부채기업 ㈜다온식품은 매년 ${fmt(p.EBIT)}억원의 영업이익(EBIT)을 영구히 올릴 것으로 예상되며, 발행주식은 ${fmt(p.N)}만 주이다. 무부채 상태의 자기자본비용은 ${pc(p.rho)}, 법인세율은 ${pc(p.t)}, 차입이자율은 ${pc(p.kd)}이다(부채는 영구채).</p>`
      + `<p>회사는 영구부채를 발행해 그 자금 전액으로 자기주식을 매입하는 자본재구성을 검토하고 있다. 부채 규모별 기대파산비용의 현재가치는 다음과 같다.</p>`
      + tbl(['부채 규모(억원)', ...p.Ds.map(x => fmt(x))], [['기대파산비용 현재가치(억원)', ...p.BC.map(x => fmt(x))]])
      + `<p>법인세 외의 세금은 없고, 시장은 효율적이어서 자본재구성 발표 즉시 주가에 반영된다. 자기주식은 발표 후 주가로 매입한다. 부채는 액면으로 발행되며, 계산의 편의상 차입이자율은 부채 규모와 관계없이 같다고 가정한다(부도위험은 기대파산비용에만 반영).</p>`,
    qs: [
      { lab: '물음 1', type: 'num', text: '현재(무부채) 기업가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.VU,
        sol: (p, c) => `${fmt(p.EBIT)}×(1−${p.t}) ÷ ${p.rho} = <b>${f2(c.VU)}</b>` },
      { lab: '물음 2', type: 'choice', text: '상충이론에 따라 기업가치를 극대화하는 부채 규모는?', optsf: p => p.Ds.map(x => `${fmt(x)}억원`), ans: c => c.bi,
        sol: (p, c) => `V_L = V_U + tD − 기대파산비용: ${p.Ds.map((D, i) => `${fmt(D)} → ${f2(c.VL[i])}`).join(', ')}<br>최대: <b>${fmt(c.D)}억원</b>` },
      { lab: '물음 3', type: 'num', text: '최적 부채로 자본재구성을 발표한 직후의 주가를 구하시오.', unit: '원', dp: 0, ans: c => c.P1,
        sol: (p, c) => `발표 시점에는 아직 주식 수가 그대로이므로 기업가치 증가분이 모두 주가에 반영<br>${f2(c.VL[c.bi])}억원 ÷ ${fmt(p.N)}만 주 = <b>${fmt(c.P1)}원</b>` },
      { lab: '물음 4', type: 'num', text: '부채 발행 자금으로 매입하는 자기주식 수를 구하시오.', unit: '만주', dp: 2, ans: c => c.n,
        sol: (p, c) => `${fmt(c.D)}억원 ÷ ${fmt(c.P1)}원 = <b>${f2(c.n)}만 주</b> (매입 후 주가는 그대로 ${fmt(c.P1)}원)` },
      { lab: '물음 5', type: 'num', text: '자본재구성 후 주당순이익(EPS)을 구하시오.', unit: '원', dp: 0, ans: c => c.EPS1,
        sol: (p, c) => `(${fmt(p.EBIT)} − ${p.kd}×${fmt(c.D)})×(1−${p.t}) ÷ (${fmt(p.N)} − ${f2(c.n)})만 주 = <b>${fmt(c.EPS1)}원</b> (재구성 전 ${fmt(c.EPS0)}원)` },
      { lab: '물음 6', type: 'num', textf: p => `부채를 ${fmt(p.Ds[1])}억원에서 ${fmt(p.Ds[2])}억원으로 늘릴 때 기업가치의 순변화(추가 절세효과 − 추가 기대파산비용)를 구하시오.`, unit: '억원', dp: 2, ans: c => c.marg,
        sol: (p, c) => `${p.t}×(${fmt(p.Ds[2])} − ${fmt(p.Ds[1])}) − (${fmt(p.BC[2])} − ${fmt(p.BC[1])}) = <b>${f2(c.marg)}</b>` },
      { lab: '물음 7', type: 'essay', text: '수익성이 높은 기업의 부채비율에 대해 상충이론과 자본조달순서이론이 서로 다른 예측을 하는 이유를 두 줄 이내로 설명하시오.',
        model: '상충이론에서는 수익성이 높으면 절세효과를 누릴 이익이 많고 파산위험이 낮아 부채비율이 높아야 한다. 자본조달순서이론에서는 수익성이 높을수록 내부자금이 많아 외부 부채를 덜 쓰므로 부채비율이 낮아진다.',
        kw: ['절세', '파산', '내부자금', '높', '낮'] },
    ],
  }));

  /* ───────── 기업재무 ② 출제 공백(배당·자사주): 개인세가 있는 배당정책 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-cf-paytax', unit: 'cf', topic: 'payout', lv: '하', pts: 10,
    title: '개인세가 있을 때의 배당락 주가와 배당·자사주 매입의 세후 비교',
    trend: 'AI 출제 · 출제 공백 주제(배당·자사주) 새 접근',
    p: { V: 1000, N: 1000, DPS: 1000, td: 0.15, tg: 0.1, B: 6000, h: 1000 },
    vary(R) {
      for (;;) {
        const N = R.pick([500, 1000, 2000]), P0 = R.int(8000, 20000, 500), DPS = R.int(300, 1500, 100);
        const p = { V: P0 * N / 1e4, N, DPS, td: R.pick([0.14, 0.15, 0.2, 0.25]), tg: R.pick([0.05, 0.1, 0.11]), B: Math.round(P0 * R.f(0.4, 0.8, 0.05) / 100) * 100, h: R.pick([500, 1000, 2000]) };
        if (p.td > p.tg) return p;
      }
    },
    calc(p) {
      const Pc = p.V / p.N * 1e4;                   // 억원/만주 → 원
      const Pex0 = Pc - p.DPS;
      const drop = p.DPS * (1 - p.td) / (1 - p.tg), Pex = Pc - drop;
      const divNet = p.h * p.DPS * (1 - p.td);
      const sold = p.h * p.DPS / Pc, tax = sold * (Pc - p.B) * p.tg, bbNet = p.h * p.DPS - tax;
      const tdStar = p.tg * (Pc - p.B) / Pc;
      return { Pc, Pex0, drop, Pex, divNet, sold, tax, bbNet, diff: (bbNet - divNet) / 1e4, tdStar };
    },
    body: (p, c) => `<p>㈜세온은 자기자본 시장가치 ${fmt(p.V)}억원, 발행주식 ${fmt(p.N)}만 주(주가 ${fmt(c.Pc)}원)인 무부채기업이다. 회사는 주당 ${fmt(p.DPS)}원에 해당하는 잉여현금을 주주에게 돌려주려 하며, 현금배당과 자기주식 매입(현재 주가로 매입) 중 하나를 고른다.</p>` + ul([
      `주주의 배당소득세율은 ${pc(p.td)}, 양도소득세율은 ${pc(p.tg)}이며 양도소득세는 처분 시점에 실현된 차익에만 부과된다. 법인세와 거래비용은 없다.`,
      `주주 갑은 이 회사 주식 ${fmt(p.h)}주를 주당 ${fmt(p.B)}원에 취득해 보유하고 있다.`,
    ]),
    qs: [
      { lab: '물음 1', type: 'num', text: '개인세가 없다면 현금배당 직후(배당락) 주가는 얼마인가?', unit: '원', dp: 0, ans: c => c.Pex0,
        sol: (p, c) => `${fmt(c.Pc)} − ${fmt(p.DPS)} = <b>${fmt(c.Pex0)}원</b>` },
      { lab: '물음 2', type: 'num', text: '배당락일 전후에 사고팔아도 세후 이익이 없도록 주가가 결정된다면(엘튼-그루버), 배당락 주가는 얼마인가?', unit: '원', dp: 2, ans: c => c.Pex,
        sol: (p, c) => `주가 하락폭 = 배당 × (1 − t_d)/(1 − t_g) = ${fmt(p.DPS)}×${+(1 - p.td).toFixed(2)}/${+(1 - p.tg).toFixed(2)} = ${f2(c.drop)}<br>배당락 주가 = ${fmt(c.Pc)} − ${f2(c.drop)} = <b>${f2(c.Pex)}원</b> (하락폭이 배당보다 작음)` },
      { lab: '물음 3', type: 'num', text: '갑이 현금배당을 받는 경우와, 자기주식 매입에 응해 같은 금액의 현금을 받을 만큼만 주식을 파는 경우의 세후 현금 차이(자사주 매입 − 현금배당)를 구하시오. (개인세가 없을 때의 주가를 기준으로 계산하고, 계속 보유하는 주식의 미실현 차익에 대한 세금은 고려하지 않는다)', unit: '만원', dp: 2, ans: c => c.diff,
        sol: (p, c) => `현금배당: ${fmt(p.h)}×${fmt(p.DPS)}×(1−${p.td}) = ${fmt(c.divNet)}원<br>자사주 매입: ${fmt(p.h * p.DPS)}원 ÷ ${fmt(c.Pc)} = ${c.sold.toFixed(4)}주 매도, 양도세 = ${c.sold.toFixed(4)}×(${fmt(c.Pc)} − ${fmt(p.B)})×${p.tg} = ${f2(c.tax)}원 → 세후 ${f2(c.bbNet)}원<br>차이 = <b>${f2(c.diff)}만원</b>` },
      { lab: '물음 4', type: 'num', text: '갑과 같은 취득가격을 가진 주주에게 현금배당이 자기주식 매입보다 유리해지려면 배당소득세율이 몇 % 미만이어야 하는가?', unit: '%', dp: 2, ans: c => c.tdStar * 100,
        sol: (p, c) => `DPS(1−t_d) > DPS − (DPS/P)(P − B)t_g ⇔ t_d < t_g(P − B)/P = ${p.tg}×(${fmt(c.Pc)} − ${fmt(p.B)})/${fmt(c.Pc)} = <b>${(c.tdStar * 100).toFixed(4)}%</b><br>취득가가 낮을수록(차익이 클수록) 기준 세율이 높아져 배당을 선호할 여지가 커진다(고객효과).` },
    ],
  }));

  /* ───────── 해설 그림(SVG)과 풀이 근거 — 해설 보기/채점 시 문제 아래에 표시. 색은 CSS 변수라 밝은·어두운 화면 모두 대응 ───────── */
  const n1 = x => x.toFixed(1);
  const fig = (W, H, g, cap) => `<figure class="xfig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${cap.replace(/<[^>]+>/g, '')}">${g}</svg><figcaption>${cap}</figcaption></figure>`;
  const T = (x, y, s, cls = '', a = 'middle') => `<text x="${n1(x)}" y="${n1(y)}" text-anchor="${a}" class="${cls}">${s}</text>`;
  const Ln = (x1, y1, x2, y2, cls) => `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" class="${cls}"/>`;
  // 꺾은선 그래프: xs·ys 범위, xt·yt 눈금 [값, 글자], vl 세로 보조선 [x, 글자, 줄], series [{pts, cls, lab:[x, y, 글자, 정렬]}], pt 점 [x, y, 글자, 정렬]
  function chart(o) {
    const W = 340, H = 220, L = 50, R = 14, Tp = 24, B = 36, [x0, x1] = o.xs, [y0, y1] = o.ys;
    const X = x => L + (x - x0) / (x1 - x0) * (W - L - R), Y = y => H - B - (y - y0) / (y1 - y0) * (H - Tp - B);
    let g = (o.yt || []).map(([v, s]) => Ln(L, Y(v), W - R, Y(v), 'xg') + T(L - 5, Y(v) + 3.5, s, 'xs', 'end')).join('');
    g += (o.xt || []).map(([v, s]) => Ln(X(v), H - B, X(v), H - B + 4, 'xa') + T(X(v), H - B + 15, s, 'xs')).join('');
    if (y0 < 0 && y1 > 0) g += Ln(L, Y(0), W - R, Y(0), 'xz');
    g += Ln(L, H - B, W - R, H - B, 'xa') + Ln(L, Tp, L, H - B, 'xa');
    g += (o.vl || []).map(([v, s, k]) => Ln(X(v), Tp, X(v), H - B, 'xv') + T(X(v), Tp - 4 + (k || 0) * 11, s, 'xs')).join('');
    g += (o.area || []).map(a => `<polygon class="${a.cls}" points="${a.pts.map(([x, y]) => n1(X(x)) + ',' + n1(Y(y))).join(' ')}"/>`).join('');
    g += o.series.map(s => `<polyline class="${s.cls || 's1'}" points="${s.pts.map(([x, y]) => n1(X(x)) + ',' + n1(Y(y))).join(' ')}"/>` + (s.lab ? T(X(s.lab[0]), Y(s.lab[1]), s.lab[2], 'xl ' + (s.cls || 's1').split(' ')[0] + 't', s.lab[3] || 'start') : '')).join('');
    g += (o.pt || []).map(([x, y, s, a]) => `<circle cx="${n1(X(x))}" cy="${n1(Y(y))}" r="3.5" class="xp"/>` + (s ? T(X(x) + (a === 'end' ? -6 : 6), Y(y) - 6, s, 'xl', a || 'start') : '')).join('');
    g += T((L + W - R) / 2, H - 6, o.xl, 'xs') + T(L - 2, 12, o.yl, 'xs', 'start');
    return fig(W, H, g, o.cap);
  }
  // 트리: cols 열 이름, nodes [{c 열, r 행(위 −, 아래 +), t 글자 줄 배열, hi 강조}], edges [[from, to, 글자]]
  function tree(o) {
    const W = 340, H = o.h || 230, cw = (W - 104) / (o.cols.length - 1), gap = o.gap || 62;
    const X = c => 52 + c * cw, Y = r => (H - 24) / 2 + r * gap, hw = (o.nw || 88) / 2;
    let g = o.edges.map(([a, b, s]) => { const A = o.nodes[a], Bn = o.nodes[b], x1 = X(A.c) + hw, y1 = Y(A.r), x2 = X(Bn.c) - hw, y2 = Y(Bn.r);
      return Ln(x1, y1, x2, y2, 'xe') + (s ? T((x1 + x2) / 2, (y1 + y2) / 2 + (y2 < y1 ? -6 : 13), s, 'xs') : ''); }).join('');
    g += o.nodes.map(n => { const h = n.t.length * 12 + 8, x = X(n.c), y = Y(n.r);
      return `<rect x="${n1(x - hw)}" y="${n1(y - h / 2)}" width="${hw * 2}" height="${h}" rx="6" class="xn${n.hi ? ' hi' : ''}"/>` + n.t.map((s, i) => T(x, y - h / 2 + 14 + i * 12, s, i ? 'xs' : 'tb')).join(''); }).join('');
    g += o.cols.map((s, i) => T(X(i), H - 6, s, 'xs')).join('');
    return fig(W, H, g, o.cap);
  }
  // 현금흐름 타임라인: n 기간, flows [[t, 글자, +1 유입 / −1 유출]], mark [t, 글자] 세로 표시
  function tl(o) {
    const W = 340, groups = {}; o.flows.forEach(f => { const k = f[0] + '|' + f[2]; (groups[k] = groups[k] || []).push(f); });
    const up = Math.max(1, ...Object.values(groups).filter(g => g[0][2] > 0).map(g => g.length)), dn = Math.max(1, ...Object.values(groups).filter(g => g[0][2] < 0).map(g => g.length));
    const ay = 30 + up * 13 + 18, H = ay + 18 + dn * 13 + 22, X = t => 34 + t * (W - 68) / o.n;
    let g = Ln(16, ay, W - 10, ay, 'xa') + `<polygon class="xa2" points="${W - 10},${ay} ${W - 17},${ay - 4} ${W - 17},${ay + 4}"/>`;
    for (let t = 0; t <= o.n; t++) g += Ln(X(t), ay - 4, X(t), ay + 4, 'xa') + T(X(t), ay + 15, (o.labels || [])[t] || `t=${t}`, 'xs');
    if (o.mark) g += Ln(X(o.mark[0]), 14, X(o.mark[0]), H - 8, 'xv') + T(X(o.mark[0]) + 4, 12, o.mark[1], 'xs', 'start');
    Object.values(groups).forEach(gr => { const t = gr[0][0], s = gr[0][2], x = X(t), cls = s > 0 ? 'xin' : 'xout', ye = s > 0 ? ay - 18 : ay + 34;
      g += Ln(x, s > 0 ? ay - 3 : ay + 20, x, ye, cls) + `<polygon class="${cls}f" points="${n1(x)},${n1(ye - s * 5)} ${n1(x - 3.5)},${n1(ye)} ${n1(x + 3.5)},${n1(ye)}"/>`;
      const an = t === 0 ? 'start' : t === o.n ? 'end' : 'middle', tx0 = t === 0 ? x - 6 : t === o.n ? x + 6 : x;
      gr.forEach((f, i) => { g += T(tx0, s > 0 ? ye - 9 - i * 13 : ye + 15 + i * 13, f[1], s > 0 ? 'tin' : 'tout', an); }); });
    return fig(W, H, g, o.cap);
  }
  const basis = items => `<div class="xb"><h4>풀이 근거</h4><ol>${items.map(([k, v]) => `<li><b>${k}</b> ${v}</li>`).join('')}</ol></div>`;
  const ok = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)) ? '<span class="xok">✓ 일치</span>' : '<span class="xno">✗ 불일치</span>';
  const X_ = id => P.find(d => d.id === id);

  X_('ai-cb-breakeven').explain = (p, c) => {
    const npvQ = Q => -p.I + ((Q * c.m - p.FC) * (1 - p.t) + p.t * c.D) * c.A, qa = c.Qa * 0.6, qb = p.Q * 1.25;
    const lo = Math.min(npvQ(qa), -p.I * 0.3), hi = npvQ(qb);
    return chart({ xs: [qa, qb], ys: [lo, hi], xl: '연간 판매량(개)', yl: 'NPV(만원)', yt: [[lo, fmt(lo)], [0, '0'], [hi, fmt(hi)]],
        vl: [[c.Qa, `회계적 ${fmt(c.Qa, 0)}`, 0], [c.Qf, `재무적 ${fmt(c.Qf, 0)}`, 1], [p.Q, `예상 ${fmt(p.Q)}`, 0]],
        series: [{ pts: [[qa, npvQ(qa)], [qb, npvQ(qb)]], cls: 's1' }], pt: [[c.Qa, npvQ(c.Qa), fmt(npvQ(c.Qa), 0), 'start'], [c.Qf, 0, 'NPV=0', 'end'], [p.Q, c.npv, fmt(c.npv, 0), 'end']],
        cap: 'NPV는 판매량에 대해 직선이다. 회계적 손익분기점에서도 NPV는 음수이고, 재무적 손익분기점에서 비로소 0이 된다.' })
      + tl({ n: p.n, flows: [[0, `−${fmt(p.I)}`, -1], ...[...Array(p.n)].map((_, i) => [i + 1, fmt(c.ocf, 0), 1])], cap: `예상 판매량일 때의 현금흐름(만원): 매년 영업현금흐름 ${f2(c.ocf)} = (판매량×공헌이익 − 고정비)×(1−t) + t×감가상각비` })
      + basis([
        ['이론', 'NPV = −I + OCF × PVIFA(r, n). NPV = 0 ⇔ OCF = I ÷ PVIFA = EAC(연간 등가비용)이므로, 재무적 손익분기점은 매년 EAC만큼 영업현금흐름을 내는 판매량이다(기업재무 교재의 손익분기 분석: 회계적·현금·재무적 손익분기점).'],
        ['회계적 손익분기점', '세후 순이익 = (Q(P−v) − FC − D)(1−t) = 0 → Q = (FC + D)/(P−v). 감가상각비로 원금만 회수하고 자본비용은 회수하지 못하므로 재무적 손익분기점보다 작다.'],
        ['가정', '매년 판매량·가격·비용이 같고, 감가상각비의 절세효과는 매년 그대로 누린다(다른 이익과 상계). 운전자본과 잔존가치는 없다.'],
        ['검산', `판매량 = 재무적 손익분기점(${f2(c.Qf)})을 대입한 NPV = ${f2(npvQ(c.Qf))} ${ok(npvQ(c.Qf), 0, 1e-3)} · 판매량 = 회계적 손익분기점일 때 NPV = ${f2(npvQ(c.Qa))} (음수)`],
        ['민감도', 'NPV가 가격에 대해 직선이므로 가격 1% 변화의 NPV 효과는 정확히 −0.01 × P × Q × (1−t) × PVIFA 이다.'],
      ]);
  };

  X_('ai-cb-realopt').explain = (p, c) => {
    const repl = (Cu, Cd) => { const D = (Cu - Cd) / (p.Vu - p.Vd), Bb = (D * p.Vu - Cu) / (1 + p.rf); return { D, Bb, v: D * c.V0 - Bb }; };
    const e = repl(c.expU, 0), a = repl(0, c.abD), wrong = p.pr * c.expU / (1 + p.k);
    const vx0 = p.Vd * 0.8, vx1 = p.Vu * 1.1, ymax = Math.max(p.e * vx1 - p.X, p.L - vx0);
    return tree({ cols: ['t=0', 't=1'], nodes: [
        { c: 0, r: 0, t: [`V₀ ${fmt(c.V0, 1)}`, `투자 ${fmt(p.I)}`, `NPV ${fmt(c.npv, 1)}`] },
        { c: 1, r: -1, t: [`V ${fmt(p.Vu)}`, `확장 +${fmt(c.expU, 1)}`, '포기 안 함'], hi: 1 },
        { c: 1, r: 1, t: [`V ${fmt(p.Vd)}`, '확장 안 함', `포기 +${fmt(c.abD, 1)}`], hi: 1 }],
      edges: [[0, 1, `q ${c.q.toFixed(4)} (실제 ${p.pr})`], [0, 2, `1−q ${(1 - c.q).toFixed(4)}`]],
      cap: '1기간 이항 트리: 수요가 많으면 확장, 적으면 포기한다. 옵션 가치는 위험중립확률 q로 기대값을 구해 무위험이자율로 할인한다.' })
      + chart({ xs: [vx0, vx1], ys: [0, ymax * 1.1], xl: 't=1 사업가치 V(억원)', yl: '옵션 만기 가치(억원)', yt: [[0, '0'], [ymax, fmt(ymax, 0)]],
        vl: [[p.Vd, `V_d ${fmt(p.Vd)}`, 0], [p.Vu, `V_u ${fmt(p.Vu)}`, 0], [p.X / p.e, `확장 시작 ${fmt(p.X / p.e, 0)}`, 1]],
        series: [{ pts: [[vx0, 0], [p.X / p.e, 0], [vx1, p.e * vx1 - p.X]], cls: 's1', lab: [vx1, p.e * vx1 - p.X, '확장', 'end'] }, { pts: [[vx0, p.L - vx0], [p.L, 0], [vx1, 0]], cls: 's2', lab: [vx0, p.L - vx0, '포기', 'start'] }],
        pt: [[p.Vu, c.expU, ''], [p.Vd, c.abD, '']],
        cap: `확장옵션은 콜(행사가격 X ÷ e = ${fmt(p.X / p.e, 1)}), 포기옵션은 풋(행사가격 L = ${fmt(p.L)})과 같은 모양이다. 두 옵션이 행사되는 구간이 겹치지 않아 가치를 더할 수 있다.` })
      + basis([
        ['이론', '실물옵션은 금융옵션과 같은 방법으로 평가한다: 사업가치와 같은 위험의 자산(쌍둥이 증권)과 무위험채권으로 옵션의 t=1 가치를 복제하면, 투자자의 위험선호와 관계없이 q = [V₀(1+r_f) − V_d]/(V_u − V_d)인 위험중립확률로 평가할 수 있다(이항옵션모형, 실물옵션 이론).'],
        ['가산성', '확장은 수요가 많을 때만, 포기는 적을 때만 행사되므로 두 옵션의 상태별 가치가 겹치지 않아 합산할 수 있다. 같은 상태에서 둘 다 가치가 생기면(예: 포기하면 확장할 대상이 없음) 합보다 작아진다.'],
        ['검산 ① 복제', `확장옵션: Δ = ${f2(c.expU)}/${fmt(p.Vu - p.Vd)} = ${e.D.toFixed(6)}, 차입 B = (Δ×${fmt(p.Vu)} − ${f2(c.expU)})/${1 + p.rf} = ${f2(e.Bb)} → Δ×V₀ − B = ${f2(e.v)} ${ok(e.v, c.exp)}<br>포기옵션: Δ = ${a.D.toFixed(6)}, B = ${f2(a.Bb)} → ${f2(a.v)} ${ok(a.v, c.ab)}`],
        ['검산 ② 흔한 오답', `실제확률과 위험조정할인율로 할인하면 확장옵션 = ${p.pr}×${f2(c.expU)}/${1 + p.k} = ${f2(wrong)}로 복제가치 ${f2(c.exp)}와 다르다. 옵션은 기초자산보다 위험이 커 같은 할인율을 쓸 수 없기 때문이다.`],
        ['최소 매각가격', `NPV + 확장 + 포기(L) = 0을 L에 대해 풀었다. L* = ${f2(c.Lmin)}는 V_d(${fmt(p.Vd)})보다 크고 V_u(${fmt(p.Vu)})보다 작아, 수요가 적을 때만 포기한다는 전제와 맞다.`],
      ]);
  };

  X_('ai-pf-addasset').explain = (p, c) => {
    const covMT = c.wM * p.sM ** 2 + c.wG * c.cov, covGT = c.wM * c.cov + c.wG * p.sG ** 2, rM = c.R1 / covMT, rG = c.R2 / covGT;
    const sx = Math.max(p.sM, p.sG, c.sT) * 1.35, ex = Math.max(p.EM, p.EG, c.ET) * 1.25;
    const fr = []; for (let w = -0.3; w <= 1.3001; w += 0.05) { const e = w * p.EM + (1 - w) * p.EG, s = Math.sqrt(w * w * p.sM ** 2 + (1 - w) ** 2 * p.sG ** 2 + 2 * w * (1 - w) * c.cov); if (s <= sx) fr.push([s, e]); }
    const yS = c.y * c.sT, yE = p.rf + c.y * (c.ET - p.rf), oS = p.y0 * p.sM, oE = p.rf + p.y0 * c.R1;
    return chart({ xs: [0, sx], ys: [p.rf * 0.5, ex], xl: '표준편차 σ', yl: '기대수익률 E(R)', xt: [[p.sM, p2(p.sM)]], yt: [[p.rf, p2(p.rf)], [p.EM, p2(p.EM)]],
        series: [{ pts: fr, cls: 's3 sd' }, { pts: [[0, p.rf], [sx, p.rf + c.SM * sx]], cls: 's2' }, { pts: [[0, p.rf], [sx, p.rf + c.ST * sx]], cls: 's1' }],
        pt: [[p.sM, p.EM, 'M'], [p.sG, p.EG, 'G'], [c.sT, c.ET, 'T', 'end'], [oS, oE, ''], [yS, yE, '']],
        cap: `<b class="c1">주황</b> = G 편입 후 자본배분선(기울기 = 샤프비율 ${c.ST.toFixed(4)}), <b class="c2">파랑</b> = M만 쓸 때(${c.SM.toFixed(4)}), <b class="c3">초록 점선</b> = M과 G로 만든 투자기회선, T = 접점 포트폴리오. 이름 없는 두 점은 갑의 이전(파랑 선 위, σ ${p2(oS)})·이후(주황 선 위, σ ${p2(yS)}) 위치다. 같은 위험회피도로 더 가파른 선 위로 옮겨 효용이 오른다.` })
      + basis([
        ['이론', '평균-분산 효용 U = E − ½Aσ²에서 무위험자산과 위험자산 하나의 최적 비중은 y* = (E − r_f)/(Aσ²)이고, 최적일 때 확실성등가는 r_f + S²/(2A)이다(투자론 교재의 자본배분). 이 식을 거꾸로 써서 보유 비중으로 A를 구했다.'],
        ['접점 포트폴리오', '두 위험자산의 접점 비중 w₁ = [R₁σ₂² − R₂σ₁₂]/[R₁σ₂² + R₂σ₁² − (R₁+R₂)σ₁₂] (R은 초과수익률)를 썼다.'],
        ['편입 조건', `새 자산을 일부라도 넣으면 샤프비율이 오르는 조건은 S_G > ρ×S_M 이다. 여기서 S_G = ${c.SG.toFixed(4)} > ${p.rho}×${c.SM.toFixed(4)} = ${(p.rho * c.SM).toFixed(4)} 이므로, S_G가 S_M보다 낮아도 편입이 이득이다.`],
        ['검산 ① 접점 조건', `접점에서는 모든 위험자산의 초과수익률 ÷ 접점과의 공분산이 같아야 한다: M ${rM.toFixed(4)}, G ${rG.toFixed(4)} ${ok(rM, rG)}`],
        ['검산 ② 현재 CE', `물음 2의 값은 r_f + S_M²/(2A) = ${((p.rf + c.SM ** 2 / (2 * c.A)) * 100).toFixed(4)}%와 같다 ${ok(p.rf + c.SM ** 2 / (2 * c.A), c.CE0)} (현재 배분이 최적이라는 문제 조건과 일치)`],
      ]);
  };

  X_('ai-pf-treynorblack').explain = (p, c) => {
    const bP = c.ws * p.be + (1 - c.ws), eP = c.ws * p.al + bP * (p.EM - p.rf), sP = Math.sqrt(bP ** 2 * p.sM ** 2 + c.ws ** 2 * p.se ** 2), SPd = eP / sP;
    const sx = Math.max(p.sM, sP) * 1.3, ex = p.rf + Math.max(c.SP, c.SM) * sx * 1.05;
    return chart({ xs: [0, sx], ys: [0, ex], xl: '표준편차 σ', yl: '기대수익률 E(R)', xt: [[p.sM, 'σ_M ' + p2(p.sM)]], yt: [[p.rf, p2(p.rf)], [p.EM, p2(p.EM)]],
        vl: [[p.sM, '', 0]],
        series: [{ pts: [[0, p.rf], [sx, p.rf + c.SM * sx]], cls: 's2' }, { pts: [[0, p.rf], [sx, p.rf + c.SP * sx]], cls: 's1' }, { pts: [[p.sM, p.EM], [p.sM, p.rf + c.SP * p.sM]], cls: 's3' }],
        pt: [[p.sM, p.EM, 'M', 'start'], [sP, p.rf + eP, 'P', 'end']],
        cap: `<b class="c2">파랑</b> = 시장 M과 무위험자산(CML, 기울기 ${c.SM.toFixed(4)}), <b class="c1">주황</b> = 최적 위험 포트폴리오 P와 무위험자산(기울기 ${c.SP.toFixed(4)}). σ_M 위치에서 두 선의 높이 차이(<b class="c3">초록</b> 세로선)가 M² = ${(c.M2 * 100).toFixed(2)}%p 이다.` })
      + basis([
        ['이론', '트레이너-블랙 모형(투자론 교재의 액티브·패시브 결합): 액티브 포트폴리오의 초기 비중은 α/σ²(e)를 시장의 (E(R_M) − r_f)/σ_M²으로 나눈 값이고, 베타가 1이 아니면 w* = w₀/[1 + (1−β)w₀]로 조정한다. 결합 포트폴리오의 샤프비율 제곱은 시장 샤프비율 제곱 + 정보비율 제곱이다.'],
        ['M²', 'Modigliani-Modigliani 측정치: 비교 대상 포트폴리오를 무위험자산과 섞어 시장과 같은 표준편차로 맞춘 뒤 기대수익률 차이를 본다 = (S_P − S_M)×σ_M.'],
        ['가정', '단일지수모형이 성립하고 잔차는 시장과 독립이다. 알파·베타·잔차위험 추정치는 정확하다고 본다(물음 6에서 이 가정의 한계를 다룸).'],
        ['검산', `w* = ${(c.ws * 100).toFixed(2)}%로 포트폴리오를 직접 만들면 베타 ${bP.toFixed(4)}, 초과수익률 ${(eP * 100).toFixed(4)}%, 표준편차 ${(sP * 100).toFixed(4)}% → 샤프비율 ${SPd.toFixed(4)} ${ok(SPd, c.SP)} (물음 4의 공식 값과 같음)`],
      ]);
  };

  X_('ai-bd-ride').explain = (p, c) => {
    const mn = Math.min(c.y1, c.y2) - 0.005, mx = Math.max(c.y3, c.y2 + p.sh) + 0.005;
    return chart({ xs: [0.6, 3.4], ys: [mn, mx], xl: '만기(년)', yl: '현물이자율', xt: [[1, '1년'], [2, '2년'], [3, '3년']], yt: [[c.y1, p2(c.y1)], [c.y2, p2(c.y2)], [c.y3, p2(c.y3)]],
        series: [{ pts: [[1, c.y1], [2, c.y2], [3, c.y3]], cls: 's1' }, { pts: [[1, c.y1 + p.sh], [2, c.y2 + p.sh]], cls: 's2 sd' }],
        pt: [[3, c.y3, '산 시점', 'end'], [2, c.y2, '판 시점', 'start'], [2, c.y2 + p.sh, '', 'start']],
        cap: `<b class="c1">주황</b> = 현재 현물이자율 곡선, <b class="c2">파랑 점선</b> = 1년 후 곡선이 ${(p.sh * 100).toFixed(2)}%p 오른 경우. 1년이 지나면 채권의 잔존만기가 3년 → 2년으로 줄어 곡선을 따라 내려온다(수익률 하락 = 가격 상승). 곡선이 오르면 이 이득이 줄어든다.` })
      + tl({ n: 3, labels: ['t=0', 't=1', 't=2', 't=3'], flows: [[0, `−${fmt(c.P3)} 3년채 매입`, -1], [1, `+${fmt(c.P2)} 매도(곡선 불변)`, 1], [1, `+${fmt(c.Psh, 0)} 매도(금리 상승)`, 1], [0, `비교: −${fmt(c.P1)} 1년채`, -1], [1, '비교: +10,000 1년채 만기', 1]],
        cap: '두 전략 모두 1년 후 현금화한다. 3년채는 t=1에 시장에서 팔아야 하므로 그때의 2년 현물이자율이 수익을 결정한다.' })
      + basis([
        ['이론', '무이표채 가격으로 현물이자율 (1+s_n)ⁿ = 10,000/P_n, 선도이자율 1 + f(n−1, n) = P_{n−1}/P_n 을 구했다(이자율 기간구조).'],
        ['곡선 불변 시 보유수익률', '1년 후 잔존 2년 채권 가격은 그때의 2년 현물이자율로 정해진다. 곡선이 그대로면 그 가격은 지금의 P₂이므로 보유수익률 = P₂/P₃ − 1 = f(2,3)이다.'],
        ['손익분기 이자율', '3년채의 1년 후 매도가격이 P₃(1 + s₁) 이상이어야 1년채보다 유리하다. 순수기대가설에서는 이 손익분기 이자율이 선도이자율로 본 1년 후 2년 현물이자율 기대값 √[(1+f(1,2))(1+f(2,3))] − 1 과 같아, 기대 초과수익이 0이 된다.'],
        ['검산 ① 기간구조', `(1+s₃)³ = ${((1 + c.y3) ** 3).toFixed(6)}, (1+s₁)(1+f(1,2))(1+f(2,3)) = ${((1 + c.y1) * (1 + c.f12) * (1 + c.f23)).toFixed(6)} ${ok((1 + c.y3) ** 3, (1 + c.y1) * (1 + c.f12) * (1 + c.f23))}`],
        ['검산 ② 손익분기', `√[(1+f(1,2))(1+f(2,3))] − 1 = ${((Math.sqrt((1 + c.f12) * (1 + c.f23)) - 1) * 100).toFixed(4)}% ${ok(Math.sqrt((1 + c.f12) * (1 + c.f23)) - 1, c.be)} (물음 4의 값)`],
      ]);
  };

  X_('ai-bd-cds').explain = (p, c) => {
    const d1 = 1 / (1 + p.s1), d2 = 1 / (1 + p.s2) ** 2, PXr = ((1 - c.q1) * c.F + c.q1 * p.R * c.F) * d1;
    const PYr = ((1 - c.q1) * c.C + c.q1 * p.R * c.F) * d1 + (1 - c.q1) * ((1 - c.q2) * (c.F + c.C) + c.q2 * p.R * c.F) * d2;
    return tree({ cols: ['t=0', 't=1', 't=2'], h: 250, gap: 58, nodes: [
        { c: 0, r: 0, t: ['채권 Y', `${fmt(c.PY)}원`] },
        { c: 1, r: 1.2, t: ['부도', `회수 ${fmt(p.R * c.F)}`], hi: 1 },
        { c: 1, r: -0.8, t: ['생존', `이자 ${fmt(c.C)}`] },
        { c: 2, r: 0.4, t: ['부도', `회수 ${fmt(p.R * c.F)}`], hi: 1 },
        { c: 2, r: -1.6, t: ['생존', `${fmt(c.F + c.C)}`] }],
      edges: [[0, 1, `q₁ ${(c.q1 * 100).toFixed(2)}%`], [0, 2, `1−q₁`], [2, 3, `q₂ ${(c.q2 * 100).toFixed(2)}%`], [2, 4, '1−q₂']],
      cap: '부도 사건 트리: 1년차에 살아남은 경우에만 2년차로 넘어간다. 각 가지의 현금흐름에 위험중립확률을 곱하고 무위험 현물이자율로 할인한 합이 가격이다.' })
      + tl({ n: 2, flows: [[1, '부도 시 +(1−R)', 1], [2, '부도 시 +(1−R)', 1], [1, '생존 시 −s', -1], [2, '생존 시 −s', -1]],
        cap: `CDS 보장매수자의 현금흐름(명목 1원당): 살아 있는 동안 프리미엄 s를 내고, 부도 시 ${+(1 - p.R).toFixed(2)}을 받는다. 두 다리의 현재가치가 같아지는 s가 공정 프리미엄 ${(c.cds * 100).toFixed(2)}%이다.` })
      + basis([
        ['이론', '위험중립 가격결정: 채권 가격 = Σ(위험중립 확률 × 상황별 현금흐름) × 무위험 할인계수. 만기가 짧은 채권(X)으로 q₁을, 그다음 Y로 q₂를 차례로 구했다(신용위험 부트스트래핑, 옵션·선물 교재의 신용위험 장).'],
        ['CDS 평가', '보장 다리 = (1−R)×Σ 그 해 부도확률×할인계수, 프리미엄 다리 = Σ 그 해 말까지 생존확률×할인계수. 공정 프리미엄 = 보장 다리 ÷ 프리미엄 다리. 이 문제는 프리미엄을 연말에만 낸다고 정해 경과 프리미엄은 없다.'],
        ['가정', '부도는 연말에만, 회수는 그 시점에 액면의 R. 금리와 부도는 서로 독립이다.'],
        ['검산 ① 가격 재현', `구한 q₁, q₂로 다시 계산한 가격: X ${f2(PXr)}원 ${ok(PXr, c.PX, 1e-9)}, Y ${f2(PYr)}원 ${ok(PYr, c.PY, 1e-9)}`],
        ['검산 ② 근사식', `신용 삼각형 근사 '스프레드 ≈ 부도확률×(1−R)': 1년 ${(c.q1 * (1 - p.R) * 100).toFixed(3)}% vs X의 스프레드 ${(c.spr * 100).toFixed(3)}%, 2년 CDS ${(c.cds * 100).toFixed(3)}%로 크기가 비슷하다(정확히 같지는 않음: 할인·연복리 효과).`],
      ]);
  };

  X_('ai-dv-els').explain = (p, c) => {
    const K2 = 100 * (1 + p.g), pay = (S, K) => Math.max(0, S - K), r1 = 1 + p.rf;
    const Cu = (c.q * pay(c.S[0], 100) + (1 - c.q) * pay(c.S[1], 100)) / r1, Cd = (c.q * pay(c.S[1], 100) + (1 - c.q) * pay(c.S[2], 100)) / r1, C0 = (c.q * Cu + (1 - c.q) * Cd) / r1;
    const Su = 100 * p.u, Sd = 100 * p.d;
    const total = p.N * p.fee + c.B + c.k * c.nC * c.C, total2 = p.N * p.fee + c.B + c.k2 * c.nC * (c.C - c.C2);
    const x0 = 60, x1 = Math.max(160, c.S[0] + 10), els = (S, k, cap) => p.N * (1 + k * Math.min(Math.max(0, S / 100 - 1), cap));
    return tree({ cols: ['t=0', 't=1', 't=2'], h: 280, gap: 58, nodes: [
        { c: 0, r: 0, t: ['S 100', `콜 ${C0.toFixed(3)}`] },
        { c: 1, r: -1, t: [`S ${Su.toFixed(1)}`, `콜 ${Cu.toFixed(3)}`] }, { c: 1, r: 1, t: [`S ${Sd.toFixed(1)}`, `콜 ${Cd.toFixed(3)}`] },
        { c: 2, r: -1.6, t: [`S ${c.S[0].toFixed(1)}`, `K100: ${pay(c.S[0], 100).toFixed(1)}`, `K${K2.toFixed(0)}: ${pay(c.S[0], K2).toFixed(1)}`], hi: 1 },
        { c: 2, r: 0, t: [`S ${c.S[1].toFixed(1)}`, `K100: ${pay(c.S[1], 100).toFixed(1)}`, `K${K2.toFixed(0)}: ${pay(c.S[1], K2).toFixed(1)}`] },
        { c: 2, r: 1.6, t: [`S ${c.S[2].toFixed(1)}`, `K100: 0`, `K${K2.toFixed(0)}: 0`] }],
      edges: [[0, 1, `q ${c.q.toFixed(4)}`], [0, 2, `1−q`], [1, 3, 'q'], [1, 4, ''], [2, 4, ''], [2, 5, '1−q']],
      cap: `지수 이항 트리와 행사가격 100 콜의 가치(뒤에서부터 계산). 만기 노드에는 두 행사가격의 콜 만기가치를 함께 적었다. u = ${p.u}, d = ${p.d}, r = ${pc(p.rf)}` })
      + chart({ xs: [x0, x1], ys: [p.N * 0.9, els(x1, c.k2, 9) * 1.03], xl: '만기 지수', yl: '상환금액(만원)', xt: [[100, '100'], [K2, K2.toFixed(0)]], yt: [[p.N, fmt(p.N)], [els(K2, c.k2, p.g), fmt(els(K2, c.k2, p.g), 0)]],
        vl: [[100, '원금 보장 시작', 0], [K2, '상한', 1]],
        series: [{ pts: [[x0, p.N], [100, p.N], [x1, els(x1, c.k, 9)]], cls: 's2', lab: [x1, els(x1, c.k, 9), `상한 없음 k=${(c.k * 100).toFixed(1)}%`, 'end'] },
          { pts: [[x0, p.N], [100, p.N], [K2, els(K2, c.k2, p.g)], [x1, els(x1, c.k2, p.g)]], cls: 's1', lab: [K2, els(K2, c.k2, p.g), `상한 k=${(c.k2 * 100).toFixed(1)}%`, 'end'] }],
        cap: '상환금액 = 원금(무이표채) + 참여율×콜. 상한을 두면 높은 행사가격의 콜을 판 것과 같아(강세 스프레드) 그 판매대금만큼 참여율을 높일 수 있다.' })
      + basis([
        ['이론', '원금보장형 구조화상품의 분해: 상환금액 = 원금 + k×(N/100)×max(0, S_T − 100)이므로 무이표채 1개 + 행사가격 100 콜 k×N/100개와 같다. 상한은 행사가격 100(1+g) 콜 매도를 더한 강세 콜 스프레드다.'],
        ['이항모형', 'Cox-Ross-Rubinstein 이항모형: q = (1 + r − d)/(u − d), 유럽형 옵션 가치 = Σ 이항확률 × 만기가치 ÷ (1 + r)². 트리의 t=1 값으로 뒤에서부터 계산해도 같다.'],
        ['가정', '배당·신용위험(발행사 부도)은 없고, 수수료는 발행 시점에 한 번 뗀다. 콜 1계약 = 지수 1포인트 = 1만원.'],
        ['검산 ① 역방향 계산', `t=1 콜 가치 ${Cu.toFixed(4)}, ${Cd.toFixed(4)} → t=0 ${C0.toFixed(4)} ${ok(C0, c.C)} (물음 2)`],
        ['검산 ② 가격 일치', `수수료 ${f2(p.N * p.fee)} + 채권 ${f2(c.B)} + 콜 ${f2(c.k * c.nC * c.C)} = ${f2(total)} ${ok(total, p.N)} · 상한 상품: ${f2(total2)} ${ok(total2, p.N)} (원금과 같아야 공정)`],
      ]);
  };

  X_('ai-dv-ccs').explain = (p, c) => {
    const s = (c.G - p.m) / 2, effW = p.b1 - s, lo = c.Sbe * 0.88, hi = c.Sbe * 1.12, V = S => c.Bw - S * c.Bd / 100;
    return tl({ n: 3, labels: ['시작', '1년', '2년', '3년(만기)'], mark: [1, '평가 시점(물음 3)'],
        flows: [[0, `+$${fmt(p.Nd)}백만`, 1], [0, `−₩${fmt(p.Nw)}억`, -1], [1, `+₩이자 ${fmt(p.Nw * p.cw, 1)}억`, 1], [1, `−$이자 ${fmt(p.Nd * p.cd, 2)}`, -1], [2, '+₩이자', 1], [2, '−$이자', -1],
          [3, '+₩원금·이자', 1], [3, '−$원금·이자', -1]],
      cap: '㈜한별전자 입장의 통화스왑 현금흐름: 시작할 때 원화 원금을 주고 달러를 받으며, 매년 원화 이자를 받고 달러 이자를 내고, 만기에 원금을 되돌려 교환한다.' })
      + chart({ xs: [lo, hi], ys: [V(hi), V(lo)], xl: '환율(원/달러)', yl: '스왑 가치(억원)', yt: [[V(lo), f2(V(lo))], [0, '0'], [V(hi), f2(V(hi))]], xt: [[p.S1, fmt(p.S1)]],
        vl: [[c.Sbe, `손익분기 ${fmt(c.Sbe, 0)}`, 0]], series: [{ pts: [[lo, V(lo)], [hi, V(hi)]], cls: 's1' }], pt: [[p.S1, c.V, `현재 ${f2(c.V)}`, p.S1 > c.Sbe ? 'end' : 'start']],
        cap: '스왑 가치 = 원화 채권 − 환율×달러 채권이므로 환율에 대해 직선으로 줄어든다. 달러를 지급하는 쪽은 원화 약세(환율 상승)에 손해를 본다.' })
      + basis([
        ['이론', '비교우위: 한 회사가 두 통화 모두 싸게 빌리더라도, 두 시장 금리차의 차이 (b₁−a₁) − (b₂−a₂)만큼 스왑으로 함께 이득을 볼 수 있다(옵션·선물 교재의 스왑 장).'],
        ['스왑 가치평가', '통화스왑은 받는 통화의 채권을 사고 주는 통화의 채권을 판 것과 같다: V = B_원화 − S × B_달러 (각 채권은 그 통화 금리로 할인).'],
        ['가정', '원금은 시작과 만기에 교환하고, 거래상대방 신용위험은 없으며, 금리는 만기와 관계없이 같다.'],
        ['검산 ① 이득 배분', `두 회사의 실효금리 합(한별 달러 ${(c.effD * 100).toFixed(3)}% + Apex 원화 ${(effW * 100).toFixed(3)}%) = ${((c.effD + effW) * 100).toFixed(3)}%는, 시장에 실제로 내는 금리(한별 원화 a₁ + Apex 달러 b₂) + 은행 수수료 = ${((p.a1 + p.b2 + p.m) * 100).toFixed(3)}%와 같아야 한다 ${ok(c.effD + effW, p.a1 + p.b2 + p.m)}`],
        ['검산 ② 손익분기', `환율 ${f2(c.Sbe)}원에서 V = ${f2(c.Bw)} − ${f2(c.Sbe)}×${f4(c.Bd)}/100 = ${f2(Math.abs(V(c.Sbe)) < 0.005 ? 0 : V(c.Sbe))} ${ok(V(c.Sbe), 0, 1e-6)}`],
      ]);
  };

  X_('ai-cf-tradeoff').explain = (p, c) => {
    const dmax = p.Ds[2] * 1.1, vmax = c.VU + p.t * dmax, eq = c.VL[c.bi] - c.D, eq2 = c.P1 * (p.N - c.n) / 1e4;
    return chart({ xs: [0, dmax], ys: [c.VU * 0.95, vmax * 1.02], xl: '부채 D(억원)', yl: '기업가치(억원)', xt: p.Ds.map(D => [D, fmt(D)]), yt: [[c.VU, fmt(c.VU, 0)], [c.VL[c.bi], fmt(c.VL[c.bi], 0)]],
        series: [{ pts: [[0, c.VU], [dmax, vmax]], cls: 's2 sd' }, { pts: [[0, c.VU], ...p.Ds.map((D, i) => [D, c.VL[i]])], cls: 's1' }],
        pt: p.Ds.map((D, i) => [D, c.VL[i], i === c.bi ? '최적' : '', 'start']),
        cap: '<b class="c2">파랑 점선</b> = V_U + tD(파산비용을 무시한 MM 1963), <b class="c1">주황</b> = 상충이론의 기업가치. 부채가 늘면 절세효과는 직선으로 커지지만 기대파산비용이 더 빨리 커져, 실제 기업가치는 중간에서 최대가 된다.' })
      + basis([
        ['이론', '상충이론: V_L = V_U + PV(이자 절세효과) − PV(기대파산비용). 영구부채의 절세효과 현재가치는 tD(MM 1963)이다.'],
        ['자본재구성과 주가', '효율적 시장에서는 발표 즉시 기업가치 증가분이 기존 주주에게 돌아가 주가가 V_L/N이 된다. 그 뒤 공정한 가격(같은 주가)에 자사주를 사므로 매입 후에도 주가는 변하지 않는다.'],
        ['가정', '차입이자율은 부채 규모와 관계없이 같고(부채 시장가치 = 액면), 법인세 외 세금은 없다.'],
        ['검산', `매입 후 자기자본 = V_L − D = ${f2(eq)}억원, 주가 × 남은 주식 = ${fmt(c.P1)}원 × ${f2(p.N - c.n)}만 주 = ${f2(eq2)}억원 ${ok(eq, eq2)}`],
      ]);
  };

  X_('ai-cf-paytax').explain = (p, c) => {
    const arb = -c.Pc + p.DPS * (1 - p.td) + c.Pex + p.tg * (c.Pc - c.Pex);
    return tl({ n: 1, labels: ['배당부(매수)', '배당락(매도)'], flows: [[0, `−${fmt(c.Pc)} 매수`, -1], [1, `+배당 ${fmt(p.DPS)}×(1−${p.td})`, 1], [1, `+${f2(c.Pex)} 매도`, 1], [1, `+양도손실 절세 ${f2(p.tg * (c.Pc - c.Pex))}`, 1]],
        cap: '배당락 직전에 사서 직후에 파는 거래(주당). 한계투자자에게 이 거래의 세후 손익이 0이 되도록 배당락 주가가 정해진다.' })
      + basis([
        ['이론', '개인세가 없으면 배당정책은 기업가치와 무관하다(MM 1961). 개인세가 있으면 엘튼-그루버(1970): 배당락 직전 매수·직후 매도의 세후 손익이 0이 되도록 ΔP/D = (1−t_d)/(1−t_g)가 된다.'],
        ['배당 vs 자사주', '자사주 매입에 응한 주주는 실현한 차익에만 양도소득세를 내므로, 배당 전액에 배당소득세를 내는 것보다 세금이 적을 수 있다. 취득가가 낮을수록(차익이 클수록) 이 차이는 줄어 배당을 선호할 수 있다(고객효과).'],
        ['가정', '물음 3·4는 문제에 적은 대로 개인세가 없을 때의 주가로 계산하고, 계속 보유하는 주식의 미실현 차익 세금은 비교에서 뺐다.'],
        ['검산', `배당락 직전 매수 → 직후 매도의 세후 손익 = −${fmt(c.Pc)} + ${f2(p.DPS * (1 - p.td))} + ${f2(c.Pex)} + ${f2(p.tg * (c.Pc - c.Pex))} = ${f2(Math.abs(arb) < 0.005 ? 0 : arb)} ${ok(arb, 0, 1e-6)}`],
      ]);
  };

  /* ───────── 파생상품 ③ 2026 기출 문7 응용(심화): 상태가격으로 콜·풋·구조화 상품 평가와 차익거래 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-dv-statepx', unit: 'dv', topic: 'opt', lv: '상', pts: 20,
    title: '[심화] 세 가지 상황의 상태가격: 콜로 역산, 풋·구조화 상품 평가, 디지털옵션 차익거래',
    trend: 'AI 출제 · 2026 문7(상태가격·지급구조 분해) 응용 심화',
    p: { S0: 50000, H: 65000, M: 52000, L: 38000, rf: 0.04, K1: 60000, C1: 1442, pH: 0.4, pM: 0.4, pL: 0.2, K2: 55000, a: 40000, b: 110000, cc: 2, Pq: 3300 },
    vary(R) {
      for (;;) {
        const S0 = R.pick([40000, 50000, 60000, 80000]), rf = R.pick([0.03, 0.04, 0.05]);
        const H = Math.round(S0 * R.f(1.25, 1.45, 0.01) / 1000) * 1000, M = Math.round(S0 * R.f(1.0, 1.1, 0.01) / 1000) * 1000, L = Math.round(S0 * R.f(0.65, 0.85, 0.01) / 1000) * 1000;
        const qH = R.f(0.2, 0.4, 0.01), qM = (S0 * (1 + rf) - H * qH - L * (1 - qH)) / (M - L), qL = 1 - qH - qM;
        if (!(qM > 0.1 && qL > 0.1)) continue;
        const K1 = Math.round((M + (H - M) * R.f(0.3, 0.7, 0.05)) / 1000) * 1000, C1 = Math.round(qH * (H - K1) / (1 + rf));
        const K2 = Math.round((M + (H - M) * R.f(0.1, 0.5, 0.05)) / 1000) * 1000, cc = R.pick([2, 3]);
        const Ks = Math.round((L + (M - L) * R.f(0.3, 0.9, 0.05)) / 1000) * 1000, a = Math.round(S0 * R.f(0.7, 0.9, 0.05) / 1000) * 1000, b = Ks * (1 + cc) - a;
        const pH = R.pick([0.3, 0.4, 0.5]), pL = R.pick([0.15, 0.2, 0.25]);
        const p = { S0, H, M, L, rf, K1, C1, pH, pM: +(1 - pH - pL).toFixed(2), pL, K2, a, b, cc, Pq: 0 };
        const c0 = this.calc(Object.assign({}, p, { Pq: 1 }));
        if (!(c0.psi.every(x => x > 0) && K1 > M && K1 < H && K2 > M && K2 < H && b > 0)) continue;
        p.Pq = Math.round(c0.dig * (R.u() < 0.5 ? R.f(1.12, 1.3, 0.01) : R.f(0.7, 0.88, 0.01)));
        return p;
      }
    },
    calc(p) {
      const D = 1 / (1 + p.rf), S = [p.H, p.M, p.L];
      const pH = p.C1 / (p.H - p.K1), pM = (p.S0 - p.H * pH - p.L * (D - pH)) / (p.M - p.L), pL = D - pH - pM, psi = [pH, pM, pL];
      const val = f => S.reduce((s, x, i) => s + psi[i] * f(x), 0);
      const put2 = val(x => Math.max(p.K2 - x, 0)), call2 = val(x => Math.max(x - p.K2, 0));
      const pay = x => Math.max(x - p.a, p.b - p.cc * x), Ks = (p.a + p.b) / (1 + p.cc), putS = val(x => Math.max(Ks - x, 0));
      const st = val(pay), stDec = p.S0 - p.a * D + (1 + p.cc) * putS;
      const dig = 10000 * pL, arb = Math.abs(p.Pq - dig), dir = p.Pq > dig ? 0 : 1;
      const q = psi.map(x => x * (1 + p.rf));
      const callExp = p.pH * (p.H - p.K1) / p.C1 - 1, stockExp = (p.pH * p.H + p.pM * p.M + p.pL * p.L) / p.S0 - 1;
      return { D, S, psi, put2, call2, Ks, putS, st, stDec, pays: S.map(pay), dig, arb, dir, q, callExp, stockExp };
    },
    body: (p, c) => `<p>무배당 주식 A의 현재 주가는 ${fmt(p.S0)}원이며, 1년 후 주가는 다음 세 가지 중 하나가 된다. 무위험이자율은 연 ${pc(p.rf)}이고, 모든 증권은 거래비용 없이 공매도할 수 있다.</p>`
      + tbl(['상황', '호황', '보통', '불황'], [['실제 확률', pc(p.pH), pc(p.pM), pc(p.pL)], ['1년 후 주가', fmt(p.H), fmt(p.M), fmt(p.L)]])
      + ul([`주식 A를 기초자산으로 하는 만기 1년, 행사가격 ${fmt(p.K1)}원의 유럽형 콜옵션이 ${fmt(p.C1)}원에 거래되며, 이 가격은 무차익 균형가격이다.`,
        `상태가격(ψ)은 해당 상황에서만 1원을 지급하는 증권의 현재가격이다.`]),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '호황 상황의 상태가격 ψ_호황을 구하시오.', unit: '', dp: 4, ans: c => c.psi[0],
        sol: (p, c) => `콜은 호황에서만 ${fmt(p.H - p.K1)}원을 지급 → ψ_호황 = ${fmt(p.C1)} ÷ ${fmt(p.H - p.K1)} = <b>${c.psi[0].toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '불황 상황의 상태가격 ψ_불황을 구하시오.', unit: '', dp: 4, ans: c => c.psi[2],
        sol: (p, c) => `무위험채권: ψ_호황 + ψ_보통 + ψ_불황 = 1/${(1 + p.rf).toFixed(2)} = ${c.D.toFixed(6)}<br>주식: ${fmt(p.H)}ψ_호황 + ${fmt(p.M)}ψ_보통 + ${fmt(p.L)}ψ_불황 = ${fmt(p.S0)}<br>→ ψ_보통 = ${c.psi[1].toFixed(6)}, ψ_불황 = <b>${c.psi[2].toFixed(4)}</b>` },
      { lab: '물음 2', type: 'num', textf: p => `만기 1년, 행사가격 ${fmt(p.K2)}원인 유럽형 풋옵션의 무차익 가격을 구하시오.`, unit: '원', dp: 0, ans: c => c.put2,
        sol: (p, c) => `만기 지급: 호황 0, 보통 ${fmt(p.K2 - p.M)}, 불황 ${fmt(p.K2 - p.L)}<br>${fmt(p.K2 - p.M)}×${c.psi[1].toFixed(6)} + ${fmt(p.K2 - p.L)}×${c.psi[2].toFixed(6)} = <b>${fmt(c.put2, 2)}원</b>` },
      { lab: '물음 3', type: 'num', textf: p => `1년 후 max(S<sub>T</sub> − ${fmt(p.a)}, ${fmt(p.b)} − ${p.cc}S<sub>T</sub>)원을 지급하는 상품의 현재가격을 구하시오. (S<sub>T</sub>는 1년 후 주가)`, unit: '원', dp: 0, ans: c => c.st,
        sol: (p, c) => `상황별 지급: ${c.pays.map(x => fmt(x)).join(' / ')} → Σψ×지급 = <b>${fmt(c.st, 2)}원</b><br>분해: (S<sub>T</sub> − ${fmt(p.a)}) + ${1 + p.cc}×max(${fmt(c.Ks, 0)} − S<sub>T</sub>, 0) = 주식 1주 − 채권(액면 ${fmt(p.a)}) + 행사가격 ${fmt(c.Ks, 0)} 풋 ${1 + p.cc}개 → ${fmt(p.S0)} − ${fmt(p.a)}×${c.D.toFixed(6)} + ${1 + p.cc}×${fmt(c.putS, 2)} = ${fmt(c.stDec, 2)}` },
      { lab: '물음 4 ①', type: 'choice', textf: p => `불황 상황에서만 10,000원을 지급하는 디지털옵션이 시장에서 ${fmt(p.Pq)}원에 거래되고 있다. 차익거래 전략으로 옳은 것은?`, opts: ['디지털옵션 매도 + 같은 지급을 복제한 포트폴리오 매입', '디지털옵션 매입 + 같은 지급을 복제한 포트폴리오 매도'], ans: c => c.dir,
        sol: (p, c) => `공정가격 = 10,000 × ψ_불황 = ${fmt(c.dig, 2)}원 ${p.Pq > c.dig ? '< 시장가 → 비싼 디지털옵션을 팔고 복제 포트폴리오를 산다' : '> 시장가 → 싼 디지털옵션을 사고 복제 포트폴리오를 판다'}` },
      { lab: '물음 4 ②', type: 'num', text: '이 전략으로 디지털옵션 1개당 현재 시점에 확보하는 무위험 차익을 구하시오.', unit: '원', dp: 2, ans: c => c.arb,
        sol: (p, c) => `|${fmt(p.Pq)} − ${fmt(c.dig, 2)}| = <b>${fmt(c.arb, 2)}원</b> (만기에는 두 포지션의 지급이 상쇄됨)` },
      { lab: '물음 5', type: 'num', textf: p => `실제 확률을 기준으로 행사가격 ${fmt(p.K1)}원 콜옵션의 1년 기대수익률을 구하시오.`, unit: '%', dp: 2, ans: c => c.callExp * 100,
        sol: (p, c) => `E[지급] = ${p.pH}×${fmt(p.H - p.K1)} = ${fmt(p.pH * (p.H - p.K1), 2)} → ${fmt(p.pH * (p.H - p.K1), 2)}/${fmt(p.C1)} − 1 = <b>${(c.callExp * 100).toFixed(4)}%</b> (주식 기대수익률 ${(c.stockExp * 100).toFixed(2)}%보다 훨씬 큼)` },
      { lab: '물음 6', type: 'essay', text: '주식과 무위험채권만 있을 때는 이 콜옵션을 복제할 수 없지만, 콜옵션이 거래되면 모든 상품의 가격이 하나로 정해지는 이유를 두 줄 이내로 설명하시오.',
        model: '상황이 세 가지인데 주식과 채권 두 자산만으로는 세 상황의 지급을 마음대로 만들 수 없어(불완비시장) 콜 가격이 하나로 정해지지 않는다. 지급이 서로 독립인 세 번째 자산(콜)이 추가되면 시장이 완비되어 세 상태가격이 유일하게 정해지고, 모든 지급구조의 가격이 결정된다.',
        kw: ['불완비', '완비', '세 가지', '상태가격', '독립'] },
    ],
  }));

  /* ───────── 파생상품 ④ 2026 기출 문7 응용(심화): 배당이 있는 3기간 이항, 미국형 조기행사와 선택옵션 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-dv-amdiv', unit: 'dv', topic: 'bin', lv: '상', pts: 20,
    title: '[심화] 배당이 있는 3기간 이항모형: 미국형 콜·풋의 조기행사 시점과 선택옵션',
    trend: 'AI 출제 · 2026 문7(다기간 이항·미국형) 응용 심화',
    p: { S0: 10000, u: 1.2, d: 0.9, rf: 0.05, dv: 0.12, K: 9500 },
    vary(R) {
      for (;;) {
        const p = { S0: R.pick([10000, 20000, 50000]), u: R.pick([1.15, 1.2, 1.25]), d: R.pick([0.85, 0.9]), rf: R.pick([0.03, 0.04, 0.05]), dv: R.pick([0.08, 0.1, 0.12, 0.15]), K: 0 };
        p.K = Math.round(p.S0 * R.f(0.85, 1.05, 0.05) / 100) * 100;
        const c = this.calc(p);
        if (c.callEx === 0 && c.Cam - c.Ceu > 3 && c.putFirst >= 0 && c.Peu > 1) return p;
      }
    },
    calc(p) {
      const q = (1 + p.rf - p.d) / (p.u - p.d), D = 1 / (1 + p.rf);
      const cum1 = j => p.S0 * p.u ** (1 - j) * p.d ** j;
      const Sx = (t, j) => (t === 0 ? p.S0 : p.S0 * (1 - p.dv) * p.u ** (t - j) * p.d ** j);   // t ≥ 1: 배당락 후 주가
      const roll = (fT, am, cumF) => {
        const V = [[], [], [], []], ex = [[], [], [], []];
        for (let j = 0; j <= 3; j++) V[3][j] = fT(Sx(3, j));
        for (let t = 2; t >= 0; t--) for (let j = 0; j <= t; j++) {
          const cont = (q * V[t + 1][j] + (1 - q) * V[t + 1][j + 1]) * D;
          let intr = am ? fT(Sx(t, j)) : 0; if (am && t === 1) intr = Math.max(intr, cumF(cum1(j)));
          V[t][j] = Math.max(cont, intr); ex[t][j] = am && intr > cont + 1e-9;
        }
        return { V, ex };
      };
      const cf = s => Math.max(s - p.K, 0), pf = s => Math.max(p.K - s, 0);
      const ce = roll(cf, false), ca = roll(cf, true, cf), pe = roll(pf, false), pa = roll(pf, true, pf);
      const exNodes = r => { const out = []; for (let t = 0; t <= 2; t++) for (let j = 0; j <= t; j++) if (r.ex[t][j]) out.push(t + '-' + j); return out; };
      const cEx = exNodes(ca), pEx = exNodes(pa);
      const callEx = cEx.length === 1 && cEx[0] === '1-0' ? 0 : cEx.length === 1 && cEx[0] === '1-1' ? 1 : cEx.length ? -1 : 3;
      // 미국형 풋이 처음으로 조기행사되는 노드: t=1 하락 / t=2 하락·하락 / t=2 상승·하락 / 없음 (같은 시점에 둘 이상이면 출제 제외)
      const firstT = pEx.length ? Math.min(...pEx.map(s => +s[0])) : null, atFirst = pEx.filter(s => +s[0] === firstT);
      const putFirst = firstT === null ? 3 : atFirst.length > 1 || firstT === 0 ? -1 : atFirst[0] === '1-1' ? 0 : atFirst[0] === '2-2' ? 1 : atFirst[0] === '2-1' ? 2 : -1;
      const ch1 = j => Math.max(ce.V[1][j], pe.V[1][j]), chooser = (q * ch1(0) + (1 - q) * ch1(1)) * D;
      const parity = ce.V[0][0] - pe.V[0][0], parityR = p.S0 * (1 - p.dv) - p.K * D ** 3;
      const chCheck = ce.V[0][0] + (q * Math.max(0, p.K * D * D - Sx(1, 0)) + (1 - q) * Math.max(0, p.K * D * D - Sx(1, 1))) * D;
      return { q, D, Sx, cum1, ce, ca, pe, pa, Ceu: ce.V[0][0], Cam: ca.V[0][0], Peu: pe.V[0][0], Pam: pa.V[0][0], callEx, putFirst, cEx, pEx, chooser, parity, parityR, chCheck };
    },
    body: (p, c) => `<p>주식 B의 현재 주가는 ${fmt(p.S0)}원이며, 매 기간(1년) ${p.u}배로 오르거나 ${p.d}배로 내린다. 무위험이자율은 기간당 ${pc(p.rf)}이다.</p>` + ul([
      `주식 B는 1년 후(t=1)에 한 번만, 그 시점 주가의 ${pc(p.dv)}를 현금배당으로 지급한다. 배당락 후 주가는 배당 직전 주가의 ${pc(1 - p.dv)}가 되며, 그 뒤로는 같은 배수로 움직인다.`,
      `아래 옵션은 모두 주식 B를 기초자산으로 하고 행사가격 ${fmt(p.K)}원, 만기 3년(t=3)이다.`,
      `미국형 옵션은 t=0, 1, 2, 3 각 시점에 행사할 수 있으며, t=1에는 배당 직전 또는 직후 중 유리한 때를 고를 수 있다.`,
    ]),
    qs: [
      { lab: '물음 1', type: 'num', text: '위험중립확률(주가 상승)을 구하시오.', unit: '', dp: 4, ans: c => c.q, sol: (p, c) => `q = (1 + ${p.rf} − ${p.d}) ÷ (${p.u} − ${p.d}) = <b>${c.q.toFixed(4)}</b> (배당 직전 주가 기준 수익률로 정의)` },
      { lab: '물음 2 ①', type: 'num', text: '유럽형 콜옵션의 가격을 구하시오.', unit: '원', dp: 0, ans: c => c.Ceu,
        sol: (p, c) => `만기 주가 ${[0, 1, 2, 3].map(j => fmt(c.Sx(3, j), 0)).join(' / ')} → 콜 ${[0, 1, 2, 3].map(j => fmt(Math.max(c.Sx(3, j) - p.K, 0), 0)).join(' / ')}<br>한 단계씩 할인: t=1 [${fmt(c.ce.V[1][0], 2)}, ${fmt(c.ce.V[1][1], 2)}] → <b>${fmt(c.Ceu, 2)}원</b>` },
      { lab: '물음 2 ②', type: 'num', text: '미국형 콜옵션의 가격을 구하시오.', unit: '원', dp: 0, ans: c => c.Cam,
        sol: (p, c) => `t=1 상승 노드: 배당 직전 행사가치 ${fmt(c.cum1(0) - p.K, 0)} vs 보유가치 ${fmt(c.ce.V[1][0], 2)} → ${c.ca.ex[1][0] ? '행사' : '보유'}<br>t=1 하락 노드: 행사가치 ${fmt(Math.max(c.cum1(1) - p.K, 0), 0)} vs 보유가치 ${fmt(c.ca.V[1][1], 2)} → ${c.ca.ex[1][1] ? '행사' : '보유'}<br>(${c.q.toFixed(4)}×${fmt(c.ca.V[1][0], 2)} + ${(1 - c.q).toFixed(4)}×${fmt(c.ca.V[1][1], 2)}) ÷ ${1 + p.rf} = <b>${fmt(c.Cam, 2)}원</b> (조기행사 프리미엄 ${fmt(c.Cam - c.Ceu, 2)})` },
      { lab: '물음 3', type: 'choice', text: '미국형 콜옵션의 조기행사가 최적인 노드는?', opts: ['t=1 상승 노드(배당 직전)', 't=1 하락 노드(배당 직전)', 't=2 이후', '조기행사하지 않음'], ans: c => c.callEx,
        sol: (p, c) => `배당으로 주가가 떨어지기 직전에 행사해 배당 효과를 피한다. t=2 이후에는 배당이 없어 무배당 콜처럼 조기행사하지 않는다 → <b>t=1 상승 노드(배당 직전)</b>` },
      { lab: '물음 4 ①', type: 'num', text: '미국형 풋옵션의 가격을 구하시오.', unit: '원', dp: 0, ans: c => c.Pam,
        sol: (p, c) => `t=2 노드: ${[0, 1, 2].map(j => `${fmt(c.Sx(2, j), 0)} → ${fmt(c.pa.V[2][j], 2)}${c.pa.ex[2][j] ? '(행사)' : ''}`).join(', ')}<br>t=1 노드(배당 직후 주가로 행사 판단): ${[0, 1].map(j => `${fmt(c.Sx(1, j), 0)} → ${fmt(c.pa.V[1][j], 2)}${c.pa.ex[1][j] ? '(행사)' : ''}`).join(', ')}<br>→ <b>${fmt(c.Pam, 2)}원</b> (유럽형 ${fmt(c.Peu, 2)}원)` },
      { lab: '물음 4 ②', type: 'choice', text: '미국형 풋옵션의 조기행사가 처음으로 최적이 되는 노드는?', opts: ['t=1 하락 노드(배당 직후)', 't=2 하락·하락 노드', 't=2 상승·하락 노드', '조기행사하지 않음'], ans: c => c.putFirst,
        sol: (p, c) => `각 노드에서 즉시 행사가치와 보유가치를 비교: 조기행사 노드 ${c.pEx.length ? c.pEx.map(s => `t=${s[0]}(하락 ${s[2]}번)`).join(', ') : '없음'} → <b>${['t=1 하락 노드(배당 직후)', 't=2 하락·하락 노드', 't=2 상승·하락 노드', '조기행사하지 않음'][c.putFirst]}</b>` },
      { lab: '물음 5', type: 'num', text: 't=1(배당 직후)에 이 옵션을 유럽형 콜로 할지 유럽형 풋으로 할지 보유자가 고를 수 있는 선택옵션(행사가격·만기 동일)의 현재가격을 구하시오.', unit: '원', dp: 0, ans: c => c.chooser,
        sol: (p, c) => `t=1 상승: max(콜 ${fmt(c.ce.V[1][0], 2)}, 풋 ${fmt(c.pe.V[1][0], 2)}), 하락: max(콜 ${fmt(c.ce.V[1][1], 2)}, 풋 ${fmt(c.pe.V[1][1], 2)})<br>(${c.q.toFixed(4)}×${fmt(Math.max(c.ce.V[1][0], c.pe.V[1][0]), 2)} + ${(1 - c.q).toFixed(4)}×${fmt(Math.max(c.ce.V[1][1], c.pe.V[1][1]), 2)}) ÷ ${1 + p.rf} = <b>${fmt(c.chooser, 2)}원</b>` },
      { lab: '물음 6', type: 'essay', text: '무배당 주식의 미국형 콜은 조기행사하지 않는데, 이 문제에서는 조기행사가 일어난 이유와 그 시점을 두 줄 이내로 설명하시오.',
        model: '무배당이면 콜의 가치가 항상 S − PV(K) 이상이라 즉시 행사가치 S − K보다 커서 조기행사할 이유가 없다. 배당이 있으면 배당락으로 주가가 떨어져 콜 가치가 줄어드므로, 배당 직전에 행사해 배당을 받는 것이 시간가치·이자를 포기하는 손실보다 클 때 조기행사한다.',
        kw: ['무배당', '배당락', '배당 직전', '시간가치', 'PV(K)'] },
    ],
  }));

  X_('ai-dv-statepx').explain = (p, c) => {
    const x0 = p.L * 0.85, x1 = p.H * 1.08, ymax = Math.max(...c.pays, p.H - p.K1, p.K2 - p.L) * 1.1, pay = x => Math.max(x - p.a, p.b - p.cc * x);
    const lhs = c.call2 - c.put2, rhs = p.S0 - p.K2 * c.D, esq = c.q.reduce((s, q, i) => s + q * c.S[i], 0);
    return chart({ xs: [x0, x1], ys: [Math.min(0, pay(c.Ks)) - ymax * 0.08, ymax], xl: '1년 후 주가 S_T', yl: '만기 지급(원)', xt: [[p.L, '불황'], [p.M, '보통'], [p.H, '호황']], yt: [[0, '0']],
        vl: [[p.L, '', 0], [p.M, '', 0], [p.H, '', 0]],
        series: [{ pts: [[x0, 0], [p.K1, 0], [x1, x1 - p.K1]], cls: 's2' }, { pts: [[x0, p.K2 - x0], [p.K2, 0], [x1, 0]], cls: 's3' }, { pts: [[x0, pay(x0)], [c.Ks, pay(c.Ks)], [x1, pay(x1)]], cls: 's1' }],
        pt: c.S.map((s, i) => [s, c.pays[i], fmt(c.pays[i]), i === 0 ? 'end' : 'start']),
        cap: `<b class="c2">파랑</b> = 콜(K ${fmt(p.K1)}), <b class="c3">초록</b> = 풋(K ${fmt(p.K2)}), <b class="c1">주황</b> = 물음 3의 상품(꺾이는 점 ${fmt(c.Ks, 0)}). 주가가 세 값 중 하나만 되므로, 어떤 상품이든 세 점의 지급 × 상태가격의 합이 가격이다.` })
      + tbl(['', '호황', '보통', '불황'], [['ψ', ...c.psi.map(x => x.toFixed(4))], ['q', ...c.q.map(x => x.toFixed(4))], ['실제', pc(p.pH), pc(p.pM), pc(p.pL)]]) + `<p class="xs-note">ψ = 상태가격, q = 위험중립확률 = ψ×(1+r), 실제 = 실제 확률. 주가: 호황 ${fmt(p.H)} · 보통 ${fmt(p.M)} · 불황 ${fmt(p.L)}</p>`
      + basis([
        ['이론', '상태가격(애로-드브뢰 증권): 세 상황 각각에서만 1원을 주는 증권의 가격 ψ를 알면 모든 지급구조의 가격 = Σ ψ×지급이다. 2026 문7 물음 2와 같이 한 상황에서만 지급하는 콜로 그 상황의 ψ를 먼저 구하고, 무위험채권·주식 가격으로 나머지 두 ψ를 푼다.'],
        ['지급구조 분해', `2026 문7 물음 3과 같은 방식: max(S − ${fmt(p.a)}, ${fmt(p.b)} − ${p.cc}S) = (S − ${fmt(p.a)}) + ${1 + p.cc}×max(${fmt(c.Ks, 0)} − S, 0) 이므로 주식 1주 − 채권 + 풋 ${1 + p.cc}개와 같다.`],
        ['차익거래', '가격이 상태가격과 다른 증권은 같은 지급을 상태가격 증권(주식·채권·콜 조합)으로 복제해 반대로 거래하면 지금 차익을 얻고 만기 지급은 상쇄된다.'],
        ['검산 ① 풋-콜 패리티', `행사가격 ${fmt(p.K2)}: C − P = ${fmt(lhs, 2)}, S₀ − K/(1+r) = ${fmt(rhs, 2)} ${ok(lhs, rhs)}`],
        ['검산 ② 분해 가격', `상태가격 직접 계산 ${fmt(c.st, 2)}원 = 분해 계산 ${fmt(c.stDec, 2)}원 ${ok(c.st, c.stDec)}`],
        ['검산 ③ 위험중립', `Σq×S = ${fmt(esq, 2)} = S₀(1+r) = ${fmt(p.S0 * (1 + p.rf), 2)} ${ok(esq, p.S0 * (1 + p.rf))}`],
      ]);
  };

  X_('ai-dv-amdiv').explain = (p, c) => {
    const lbl = (t, j) => ['t=0', 't=1', 't=2', 't=3'][t];
    const nodes = [], idx = {};
    for (let t = 0; t <= 3; t++) for (let j = 0; j <= t; j++) {
      idx[t + '-' + j] = nodes.length;
      const s = t === 1 ? [`S ${fmt(c.cum1(j), 0)}`, `배당 후 ${fmt(c.Sx(1, j), 0)}`] : [`S ${fmt(c.Sx(t, j), 0)}`];
      nodes.push({ c: t, r: (j - t / 2) * (t === 3 ? 1 : 1.15), t: [...s, `콜 ${fmt(c.ca.V[t][j], 0)}${c.ca.ex[t] && c.ca.ex[t][j] ? '★' : ''}`, `풋 ${fmt(c.pa.V[t][j], 0)}${c.pa.ex[t] && c.pa.ex[t][j] ? '★' : ''}`], hi: (c.ca.ex[t] && c.ca.ex[t][j]) || (c.pa.ex[t] && c.pa.ex[t][j]) });
    }
    const edges = []; for (let t = 0; t < 3; t++) for (let j = 0; j <= t; j++) { edges.push([idx[t + '-' + j], idx[(t + 1) + '-' + j], t === 0 ? 'q' : '']); edges.push([idx[t + '-' + j], idx[(t + 1) + '-' + (j + 1)], t === 0 ? '1−q' : '']); }
    void lbl;
    return tree({ cols: ['t=0', 't=1(배당)', 't=2', 't=3'], h: 300, gap: 56, nw: 76, nodes, edges,
        cap: `3기간 이항 트리(노드마다 주가, 미국형 콜·풋 가치). t=1은 배당 직전 주가와 배당 후 주가를 함께 적었다. ★ = 그 노드에서 즉시 행사하는 것이 최적. q = ${c.q.toFixed(4)}` })
      + basis([
        ['이론', 'Cox-Ross-Rubinstein 이항모형에서 미국형 옵션은 만기부터 한 단계씩 거슬러 올라가며 각 노드에서 max(즉시 행사가치, 보유가치)를 취한다(2026 문7 물음 4: 다음 시점 노드의 옵션 가치로 한 기간 할인한 것과 같은 논리).'],
        ['배당과 조기행사', '비례배당이면 트리가 재결합한다. 무배당 미국형 콜은 조기행사하지 않지만(머튼), 배당이 있으면 배당락 직전 행사가 유리할 수 있다. 풋은 반대로 배당락 뒤 주가가 낮을 때 행사하는 것이 유리하므로 t=1에는 직전·직후 중 유리한 쪽을 비교했다.'],
        ['선택옵션', 't=1에 콜·풋 중 가치가 큰 쪽을 고르므로 t=1 가치 = max(C₁, P₁). 배당이 끝난 뒤라 t=1의 풋-콜 패리티로 C₁ + max(0, K/(1+r)² − S₁)로도 쓸 수 있다.'],
        ['검산 ① 배당 반영 패리티', `유럽형 C − P = ${fmt(c.parity, 2)}, S₀(1 − 배당률) − K/(1+r)³ = ${fmt(c.parityR, 2)} ${ok(c.parity, c.parityR)} (배당의 현재가치 = 배당률 × S₀)`],
        ['검산 ② 선택옵션 분해', `C + [행사가격 K/(1+r)², 만기 t=1 풋] = ${fmt(c.chCheck, 2)} ${ok(c.chCheck, c.chooser)} (물음 5)`],
        ['검산 ③ 미국형 ≥ 유럽형', `콜 ${fmt(c.Cam, 2)} ≥ ${fmt(c.Ceu, 2)}, 풋 ${fmt(c.Pam, 2)} ≥ ${fmt(c.Peu, 2)} ${c.Cam >= c.Ceu - 1e-9 && c.Pam >= c.Peu - 1e-9 ? '<span class="xok">✓ 일치</span>' : '<span class="xno">✗ 불일치</span>'}`],
      ]);
  };

  /* ───────── 파생상품 ⑤ 문제 12의 확장: 매 기간 12% 배당이 있는 3기간 이항 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-dv-amdiv2', unit: 'dv', topic: 'bin', lv: '상', pts: 20,
    title: '[심화] 매 기간 12% 배당이 있는 3기간 이항모형: 선도가격, 미국형 콜·풋의 조기행사 노드',
    trend: 'AI 출제 · 2026 문7(다기간 이항·미국형) 응용 심화 · 문제 12의 확장',
    p: { S0: 10000, u: 1.2, d: 0.9, rf: 0.05, dv: 0.12, K: 9500 },
    vary(R) {
      for (;;) {
        const p = { S0: R.pick([10000, 20000, 50000]), u: R.pick([1.2, 1.25, 1.3]), d: R.pick([0.85, 0.9]), rf: R.pick([0.04, 0.05]), dv: 0.12, K: 0 };
        p.K = Math.round(p.S0 * R.f(0.85, 1.0, 0.05) / 100) * 100;
        const c = this.calc(p);
        if (c.callCat >= 0 && c.callCat < 3 && c.putCat >= 0 && c.Cam - c.Ceu > 3) return p;
      }
    },
    calc(p) {
      const q = (1 + p.rf - p.d) / (p.u - p.d), D = 1 / (1 + p.rf), nd = t => Math.min(t, 2);   // 배당은 t=1, t=2 (만기 전 매 기간 말)
      const Sx = (t, j) => p.S0 * (1 - p.dv) ** nd(t) * p.u ** (t - j) * p.d ** j;              // 배당락 후 주가 (t=0, t=3은 배당 없음)
      const Sc = (t, j) => (t === 1 || t === 2 ? Sx(t, j) / (1 - p.dv) : Sx(t, j));               // 배당 직전 주가
      const roll = (f, am) => {
        const V = [[], [], [], []], ex = [[], [], [], []];
        for (let j = 0; j <= 3; j++) V[3][j] = f(Sx(3, j));
        for (let t = 2; t >= 0; t--) for (let j = 0; j <= t; j++) {
          const cont = (q * V[t + 1][j] + (1 - q) * V[t + 1][j + 1]) * D, intr = am ? Math.max(f(Sx(t, j)), f(Sc(t, j))) : 0;
          V[t][j] = Math.max(cont, intr); ex[t][j] = am && intr > cont + 1e-9;
        }
        return { V, ex };
      };
      const cf = s => Math.max(s - p.K, 0), pf = s => Math.max(p.K - s, 0);
      const ce = roll(cf, false), ca = roll(cf, true), pe = roll(pf, false), pa = roll(pf, true);
      const nodes = r => { const o = []; for (let t = 0; t <= 2; t++) for (let j = 0; j <= t; j++) if (r.ex[t][j]) o.push(t + '-' + j); return o.join(','); };
      const cN = nodes(ca), pN = nodes(pa);
      const cMap = { '1-0': 0, '2-0': 1, '1-0,2-0': 2, '': 3 }, pMap = { '2-2': 0, '2-1,2-2': 1, '': 3 };
      const callCat = cN in cMap ? cMap[cN] : -1;
      const putCat = pN in pMap ? pMap[pN] : (pN.includes('1-1') && !pN.includes('0-0') ? 2 : -1);
      const F = p.S0 * (1 - p.dv) ** 2 * (1 + p.rf) ** 3;
      let EF = 0; for (let j = 0; j <= 3; j++) EF += [1, 3, 3, 1][j] * q ** (3 - j) * (1 - q) ** j * Sx(3, j);
      const pvDiv = p.S0 * (1 - (1 - p.dv) ** 2), parity = ce.V[0][0] - pe.V[0][0], parityR = p.S0 - pvDiv - p.K * D ** 3;
      return { q, D, Sx, Sc, ce, ca, pe, pa, Ceu: ce.V[0][0], Cam: ca.V[0][0], Peu: pe.V[0][0], Pam: pa.V[0][0], cN, pN, callCat, putCat, F, EF, pvDiv, parity, parityR };
    },
    body: (p, c) => `<p>주식 C의 현재 주가는 ${fmt(p.S0)}원이며, 매 기간(1년) ${p.u}배로 오르거나 ${p.d}배로 내린다. 무위험이자율은 기간당 ${pc(p.rf)}이다.</p>` + ul([
      `주식 C는 만기 전 매 기간 말(t=1, t=2)마다 그 시점 주가의 ${pc(p.dv)}를 현금배당으로 지급한다. 배당락 후 주가는 배당 직전 주가의 ${pc(1 - p.dv)}가 되고, 다음 기간에는 배당락 후 주가에서 같은 배수로 움직인다.`,
      `아래 옵션은 모두 주식 C를 기초자산으로 하고 행사가격 ${fmt(p.K)}원, 만기 3년(t=3)이다. 만기 시점에는 배당이 없다.`,
      `미국형 옵션은 각 시점에 행사할 수 있으며, 배당이 있는 시점에는 배당 직전 또는 직후 중 유리한 때를 고를 수 있다.`,
    ]),
    qs: [
      { lab: '물음 1', type: 'num', text: '주식 C를 3년 후에 인도하는 선도계약의 무차익 선도가격을 구하시오.', unit: '원', dp: 0, ans: c => c.F,
        sol: (p, c) => `배당으로 빠져나가는 가치를 뺀 현재가치 = ${fmt(p.S0)}×${pc(1 - p.dv)}² = ${fmt(p.S0 * (1 - p.dv) ** 2, 2)}<br>F = ${fmt(p.S0 * (1 - p.dv) ** 2, 2)}×${(1 + p.rf).toFixed(2)}³ = <b>${fmt(c.F, 2)}원</b>` },
      { lab: '물음 2', type: 'num', text: '유럽형 콜옵션의 가격을 구하시오.', unit: '원', dp: 0, ans: c => c.Ceu,
        sol: (p, c) => `q = (1 + ${p.rf} − ${p.d}) ÷ (${p.u} − ${p.d}) = ${c.q.toFixed(4)}<br>만기 주가 ${[0, 1, 2, 3].map(j => fmt(c.Sx(3, j), 0)).join(' / ')} → 콜 ${[0, 1, 2, 3].map(j => fmt(Math.max(c.Sx(3, j) - p.K, 0), 0)).join(' / ')}<br>t=2 [${[0, 1, 2].map(j => fmt(c.ce.V[2][j], 2)).join(', ')}] → t=1 [${fmt(c.ce.V[1][0], 2)}, ${fmt(c.ce.V[1][1], 2)}] → <b>${fmt(c.Ceu, 2)}원</b>` },
      { lab: '물음 3 ①', type: 'num', text: '미국형 콜옵션의 가격을 구하시오.', unit: '원', dp: 0, ans: c => c.Cam,
        sol: (p, c) => `t=2 노드(배당 직전 행사가치 vs 보유가치): ${[0, 1, 2].map(j => `${fmt(Math.max(c.Sc(2, j) - p.K, 0), 0)} vs ${fmt((c.q * c.ca.V[3][j] + (1 - c.q) * c.ca.V[3][j + 1]) * c.D, 2)}${c.ca.ex[2][j] ? '(행사)' : ''}`).join(', ')}<br>t=1 노드: ${[0, 1].map(j => `${fmt(Math.max(c.Sc(1, j) - p.K, 0), 0)} vs ${fmt((c.q * c.ca.V[2][j] + (1 - c.q) * c.ca.V[2][j + 1]) * c.D, 2)}${c.ca.ex[1][j] ? '(행사)' : ''}`).join(', ')}<br>→ <b>${fmt(c.Cam, 2)}원</b> (유럽형보다 ${fmt(c.Cam - c.Ceu, 2)}원 비쌈)` },
      { lab: '물음 3 ②', type: 'choice', text: '미국형 콜옵션의 즉시 행사가 최적인 노드를 모두 고르면? (도달 여부와 관계없이 각 노드에서 판단)', opts: ['t=1 상승 노드만', 't=2 상승·상승 노드만', 't=1 상승과 t=2 상승·상승 노드', '조기행사하지 않음'], ans: c => c.callCat,
        sol: (p, c) => `조기행사 노드: ${c.cN ? c.cN.split(',').map(s => `t=${s[0]}(하락 ${s[2]}번)`).join(', ') : '없음'} — 배당 직전 주가가 행사가격보다 충분히 높은 노드에서, 배당으로 잃을 가치가 행사로 포기하는 시간가치·이자보다 크다.` },
      { lab: '물음 4 ①', type: 'num', text: '미국형 풋옵션의 가격을 구하시오.', unit: '원', dp: 0, ans: c => c.Pam,
        sol: (p, c) => `t=2 노드(배당 직후 행사가치 vs 보유가치): ${[0, 1, 2].map(j => `${fmt(Math.max(p.K - c.Sx(2, j), 0), 0)} vs ${fmt((c.q * c.pa.V[3][j] + (1 - c.q) * c.pa.V[3][j + 1]) * c.D, 2)}${c.pa.ex[2][j] ? '(행사)' : ''}`).join(', ')}<br>t=1 노드: ${[0, 1].map(j => `${fmt(Math.max(p.K - c.Sx(1, j), 0), 0)} vs ${fmt((c.q * c.pa.V[2][j] + (1 - c.q) * c.pa.V[2][j + 1]) * c.D, 2)}${c.pa.ex[1][j] ? '(행사)' : ''}`).join(', ')}<br>→ <b>${fmt(c.Pam, 2)}원</b> (유럽형 ${fmt(c.Peu, 2)}원)` },
      { lab: '물음 4 ②', type: 'choice', text: '미국형 풋옵션의 즉시 행사가 최적인 노드를 모두 고르면?', opts: ['t=2 하락·하락 노드만', 't=2 상승·하락과 하락·하락 노드', 't=1 하락 노드 포함', '조기행사하지 않음'], ans: c => c.putCat,
        sol: (p, c) => `조기행사 노드: ${c.pN ? c.pN.split(',').map(s => `t=${s[0]}(하락 ${s[2]}번)`).join(', ') : '없음'} — 풋은 배당락으로 주가가 내려간 직후에 행사가치가 크다. 앞으로 배당이 남아 있으면 주가가 더 떨어질 것이 예상되어 보유가치가 커지므로, 마지막 배당 뒤(t=2)에 조기행사가 몰리기 쉽다.` },
      { lab: '물음 5', type: 'essay', text: '배당이 매 기간 지급될 때 미국형 콜의 조기행사가 일어나는 시점의 특징과, 유럽형 콜과의 가격 차이가 커지는 이유를 두 줄 이내로 설명하시오.',
        model: '미국형 콜의 조기행사는 항상 배당 직전에만 일어나며, 주가가 높아 배당액이 큰 노드일수록 행사가 유리하다. 배당이 여러 번이면 배당을 피할 기회가 여러 번 생기고 유럽형은 모든 배당만큼 기초자산 가치를 잃으므로 조기행사 가치(가격 차이)가 커진다.',
        kw: ['배당 직전', '여러 번', '조기행사', '유럽형', '배당락'] },
    ],
  }));

  X_('ai-dv-amdiv2').explain = (p, c) => {
    const nodes = [], idx = {};
    for (let t = 0; t <= 3; t++) for (let j = 0; j <= t; j++) {
      idx[t + '-' + j] = nodes.length;
      const s = t === 1 || t === 2 ? [`S ${fmt(c.Sc(t, j), 0)}`, `배당 후 ${fmt(c.Sx(t, j), 0)}`] : [`S ${fmt(c.Sx(t, j), 0)}`];
      const ec = c.ca.ex[t] && c.ca.ex[t][j], ep = c.pa.ex[t] && c.pa.ex[t][j];
      nodes.push({ c: t, r: (j - t / 2) * (t === 3 ? 1 : 1.2), t: [...s, `콜 ${fmt(c.ca.V[t][j], 0)}${ec ? '★' : ''}`, `풋 ${fmt(c.pa.V[t][j], 0)}${ep ? '★' : ''}`], hi: ec || ep });
    }
    const edges = []; for (let t = 0; t < 3; t++) for (let j = 0; j <= t; j++) { edges.push([idx[t + '-' + j], idx[(t + 1) + '-' + j], t === 0 ? 'q' : '']); edges.push([idx[t + '-' + j], idx[(t + 1) + '-' + (j + 1)], t === 0 ? '1−q' : '']); }
    return tree({ cols: ['t=0', 't=1(배당)', 't=2(배당)', 't=3'], h: 330, gap: 58, nw: 76, nodes, edges,
        cap: `매 기간 배당이 있는 3기간 트리(노드마다 주가, 미국형 콜·풋 가치). t=1·t=2는 배당 직전 주가와 배당 후 주가를 함께 적었다. ★ = 그 노드에서 즉시 행사하는 것이 최적. q = ${c.q.toFixed(4)}` })
      + basis([
        ['이론', 'Cox-Ross-Rubinstein 이항모형에 비례배당을 넣으면 매 배당 시점에 주가가 (1 − 배당률)배로 떨어진 뒤 다시 같은 배수로 움직여 트리가 재결합한다. 미국형 옵션은 만기부터 거슬러 올라가며 max(즉시 행사가치, 보유가치)를 취한다(2026 문7 물음 4의 한 단계 할인 논리).'],
        ['배당 직전·직후', '콜은 배당 직전 주가로, 풋은 배당 직후 주가로 행사가치를 계산했다. 배당이 남아 있는 동안 콜은 배당 직전에만 조기행사가 의미가 있다.'],
        ['선도가격', '비례배당이면 배당으로 빠져나가는 가치의 현재가치 = S₀[1 − (1 − δ)²]이므로 F = S₀(1 − δ)²(1 + r)³.'],
        ['검산 ① 선도가격', `위험중립확률로 구한 만기 주가 기대값 E_q[S₃] = ${fmt(c.EF, 2)} ${ok(c.EF, c.F)} (물음 1)`],
        ['검산 ② 배당 반영 패리티', `유럽형 C − P = ${fmt(c.parity, 2)}, S₀ − PV(배당) − K/(1+r)³ = ${fmt(p.S0)} − ${fmt(c.pvDiv, 2)} − ${fmt(p.K * c.D ** 3, 2)} = ${fmt(c.parityR, 2)} ${ok(c.parity, c.parityR)}`],
        ['검산 ③ 미국형 ≥ 유럽형', `콜 ${fmt(c.Cam, 2)} ≥ ${fmt(c.Ceu, 2)}, 풋 ${fmt(c.Pam, 2)} ≥ ${fmt(c.Peu, 2)} ${c.Cam >= c.Ceu - 1e-9 && c.Pam >= c.Peu - 1e-9 ? '<span class="xok">✓ 일치</span>' : '<span class="xno">✗ 불일치</span>'}`],
      ]);
  };

  /* ───────── 파생상품 ⑥ 2026 문7 발상 응용(신규): 옵션 가격표의 '비례성'과 한 단계 되돌리기 ───────── */
  const binom = (S, u, d, r, n, K, am, put) => {   // n기간 이항: 유럽형·미국형 풋/콜
    const q = (1 + r - d) / (u - d), pay = s => Math.max(put ? K - s : s - K, 0);
    let V = []; for (let j = 0; j <= n; j++) V.push(pay(S * u ** (n - j) * d ** j));
    for (let t = n - 1; t >= 0; t--) { const W = []; for (let j = 0; j <= t; j++) { let v = (q * V[j] + (1 - q) * V[j + 1]) / (1 + r); if (am) v = Math.max(v, pay(S * u ** (t - j) * d ** j)); W.push(v); } V = W; }
    return V[0];
  };
  P.push(Object.assign({}, AI, {
    id: 'ai-dv-pxtable', unit: 'dv', topic: 'opt', lv: '상', pts: 20,
    title: '[신규·심화] 옵션 가격표 하나로 다른 주식·다른 만기 옵션 평가: 비례성과 한 분기 되돌리기',
    trend: 'AI 출제 · 2026 문7 발상(가격표 활용) 응용 신규',
    p: { u: 1.25, r: 0.02, n: 20 },
    vary(R) { return { u: R.pick([1.25, 1.28]), r: R.pick([0.01, 0.015, 0.02]), n: R.pick([16, 20, 24]) }; },
    calc(p) {
      const S = 100000, u = p.u, d = 1 / u, r = p.r, n = p.n, q = (1 + r - d) / (u - d), Kl = S * d, Kh = S * u;
      const Pe = {}, Pa = {}; [Kl, S, Kh].forEach(K => { Pe[K] = Math.round(binom(S, u, d, r, n, K, false, true)); Pa[K] = Math.round(binom(S, u, d, r, n, K, true, true)); });
      const DF = Math.round(Math.pow(1 + r, -n) * 1e5) / 1e5;
      const W = u * Pe[Kl], W2 = d * Pa[Kh];
      const Cl = Pe[Kl] + S - Kl * DF, Ch = Pe[Kh] + S - Kh * DF, spread = Cl - Ch;
      const Ze = (q * u * Pe[Kl] + (1 - q) * d * Pe[Kh]) / (1 + r);
      const up = Math.max(0, u * Pa[Kl]), dnC = d * Pa[Kh], dnI = S - S * d, dn = Math.max(dnI, dnC), Za = Math.max(0, (q * up + (1 - q) * dn) / (1 + r));
      return { S, u, d, q, Kl, Kh, Pe, Pa, DF, W, W2, Cl, Ch, spread, Ze, up, dnC, dnI, dn, Za, exDn: dnI > dnC ? 0 : 1,
        ZeD: binom(S, u, d, r, n + 1, S, false, true), ZaD: binom(S, u, d, r, n + 1, S, true, true) };
    },
    body: (p, c) => `<p>세 무배당 주식 A, W, Z는 모두 분기마다 주가가 ${p.u}배로 오르거나 1/${p.u}(= ${c.d.toFixed(5).replace(/0+$/, '')})배로 내리는 이항과정을 따른다. 무위험자산의 가치는 분기마다 ${pc(p.r)}씩 늘어나며, 1/(1 + ${p.r})<sup>${p.n}</sup> = ${c.DF.toFixed(5)}이다. 모든 옵션은 무차익 균형가격에 거래된다.</p>`
      + `<p>주식 A의 현재 주가는 100,000원이고, A를 기초자산으로 하는 잔존만기 ${p.n}분기 풋옵션의 가격은 다음과 같다.</p>`
      + tbl(['행사가격', `${fmt(c.Kl)}원`, '100,000원', `${fmt(c.Kh)}원`], [['유럽형 풋', ...[c.Kl, c.S, c.Kh].map(K => fmt(c.Pe[K]) + '원')], ['미국형 풋', ...[c.Kl, c.S, c.Kh].map(K => fmt(c.Pa[K]) + '원')]])
      + ul([`주식 W의 현재 주가는 ${fmt(c.S * c.u)}원이다.`, `주식 Z의 현재 주가는 100,000원이다. Z의 다음 분기 주가는 ${fmt(c.S * c.u)}원 또는 ${fmt(c.S * c.d)}원이며, 그 뒤로도 같은 이항과정을 따른다.`, '트리 전체를 그리지 않고 위 가격표를 활용해 답하시오.']),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '분기당 위험중립확률(주가 상승)을 구하시오.', unit: '', dp: 4, ans: c => c.q, sol: (p, c) => `q = (1 + ${p.r} − ${c.d.toFixed(5)}) ÷ (${p.u} − ${c.d.toFixed(5)}) = <b>${c.q.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', textf: p => `주식 W를 기초자산으로 하는 행사가격 100,000원, 잔존만기 ${p.n}분기 유럽형 풋옵션의 가격을 구하시오.`, unit: '원', dp: 0, ans: c => c.W,
        sol: (p, c) => `W = ${p.u} × A이고 행사가격 100,000 = ${p.u} × ${fmt(c.Kl)} → 지급액이 모든 상황에서 A의 행사가격 ${fmt(c.Kl)} 풋의 ${p.u}배<br>${p.u} × ${fmt(c.Pe[c.Kl])} = <b>${fmt(c.W, 1)}원</b>` },
      { lab: '물음 2', type: 'num', textf: p => `주식 A를 기초자산으로 하는 행사가격 ${fmt(100000 * p.u)}원, 잔존만기 ${p.n}분기 유럽형 콜옵션의 가격을 구하시오.`, unit: '원', dp: 0, ans: c => c.Ch,
        sol: (p, c) => `풋-콜 패리티: C = P + S − K × PV계수 = ${fmt(c.Pe[c.Kh])} + 100,000 − ${fmt(c.Kh)} × ${c.DF.toFixed(5)} = <b>${fmt(c.Ch, 1)}원</b>` },
      { lab: '물음 3', type: 'num', textf: p => `${p.n}분기 후 A의 주가를 S라 할 때 min(max(S − ${fmt(100000 / p.u)}, 0), ${fmt(100000 * p.u - 100000 / p.u)})원을 지급하는 상품의 현재가격을 구하시오.`, unit: '원', dp: 0, ans: c => c.spread,
        sol: (p, c) => `지급 = 행사가격 ${fmt(c.Kl)} 콜 매입 + 행사가격 ${fmt(c.Kh)} 콜 매도(강세 스프레드)<br>C(${fmt(c.Kl)}) = ${fmt(c.Pe[c.Kl])} + 100,000 − ${fmt(c.Kl)} × ${c.DF.toFixed(5)} = ${fmt(c.Cl, 1)}<br>${fmt(c.Cl, 1)} − ${fmt(c.Ch, 1)} = <b>${fmt(c.spread, 1)}원</b>` },
      { lab: '물음 4 ①', type: 'num', textf: p => `주식 Z를 기초자산으로 하는 행사가격 100,000원, 잔존만기 ${p.n + 1}분기 유럽형 풋옵션의 가격을 구하시오.`, unit: '원', dp: 0, ans: c => c.Ze,
        sol: (p, c) => `한 분기 뒤 Z는 ${fmt(c.S * c.u)}원(= W와 같은 상황) 또는 ${fmt(c.S * c.d)}원이 되고, 그때 잔존만기는 ${p.n}분기<br>상승: 비례성으로 ${p.u} × P(${fmt(c.Kl)}) = ${fmt(c.u * c.Pe[c.Kl], 1)} · 하락: ${c.d.toFixed(5).replace(/0+$/, '')} × P(${fmt(c.Kh)}) = ${fmt(c.d * c.Pe[c.Kh], 1)}<br>(${c.q.toFixed(4)} × ${fmt(c.u * c.Pe[c.Kl], 1)} + ${(1 - c.q).toFixed(4)} × ${fmt(c.d * c.Pe[c.Kh], 1)}) ÷ ${1 + p.r} = <b>${fmt(c.Ze, 1)}원</b>` },
      { lab: '물음 4 ②', type: 'num', textf: p => `같은 조건의 미국형 풋옵션(잔존만기 ${p.n + 1}분기) 가격을 구하시오.`, unit: '원', dp: 0, ans: c => c.Za,
        sol: (p, c) => `상승 노드: ${p.u} × ${fmt(c.Pa[c.Kl])} = ${fmt(c.up, 1)} (즉시 행사가치 0)<br>하락 노드: 보유가치 ${c.d.toFixed(5).replace(/0+$/, '')} × ${fmt(c.Pa[c.Kh])} = ${fmt(c.dnC, 1)} vs 즉시 행사 ${fmt(c.dnI)} → ${fmt(c.dn, 1)}<br>(${c.q.toFixed(4)} × ${fmt(c.up, 1)} + ${(1 - c.q).toFixed(4)} × ${fmt(c.dn, 1)}) ÷ ${1 + p.r} = <b>${fmt(c.Za, 1)}원</b> (지금 행사가치 0보다 큼)` },
      { lab: '물음 4 ③', type: 'choice', text: '(물음 4 ②)에서 한 분기 뒤 주가가 하락한 노드에서 미국형 풋을 즉시 행사하는 것이 최적인가?', opts: ['즉시 행사한다', '행사하지 않고 보유한다'], ans: c => c.exDn,
        sol: (p, c) => `보유가치 ${fmt(c.dnC, 1)} ${c.dnC > c.dnI ? '>' : '<'} 즉시 행사 ${fmt(c.dnI)} → <b>${c.exDn ? '보유' : '즉시 행사'}</b>. 표의 미국형 가격에 이미 이후의 조기행사 가치가 들어 있어 비례만 하면 된다.` },
      { lab: '물음 5', type: 'essay', text: '(물음 1 ②)에서 주가와 행사가격을 같은 배율로 바꾸면 옵션 가격도 같은 배율로 바뀌는 이유를 두 줄 이내로 설명하시오. 이 성질이 성립하지 않게 되는 조건도 한 가지 쓰시오.',
        model: '이항과정이 비율(곱셈)로 움직이므로 주가를 λ배 하면 모든 미래 노드의 주가가 λ배가 되고, 행사가격도 λ배이면 모든 지급액이 λ배가 되어 무차익 가격도 λ배다. 주가 변동이 절대 금액(덧셈)으로 정해지거나 고정 금액 배당·거래비용처럼 규모와 무관한 요소가 있으면 성립하지 않는다.',
        kw: ['비율', '곱셈', 'λ배', '지급액', '배당'] },
    ],
  }));

  /* ───────── 파생상품 ⑦ 2026 문7 발상 응용(신규): 콜 두 개 가격으로 트리 역산 → 2년 미국형·디지털 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'ai-dv-implied', unit: 'dv', topic: 'bin', lv: '상', pts: 20,
    title: '[신규·심화] 콜옵션 두 개의 가격으로 이항 트리 역산: 숨은 주가 경로, 2년 미국형 풋, 디지털 상품',
    trend: 'AI 출제 · 2026 문7 발상(가격에서 정보 추출) 응용 신규',
    p: { S: 50000, u: 1.3, d: 0.8, r: 0.05, f: 0.6 },
    vary(R) {
      for (;;) {
        const p = { S: R.pick([40000, 50000, 60000]), u: R.pick([1.2, 1.25, 1.3, 1.35]), d: R.pick([0.8, 0.85, 0.9]), r: R.pick([0.03, 0.04, 0.05]), f: R.pick([0.4, 0.5, 0.6]) };
        const c = this.calc(p); if (c.K2 > c.K1 && c.K2 < c.Su0 && c.C2 > 0 && c.Sd > 0) return p;
      }
    },
    calc(p) {
      const S = p.S, q0 = (1 + p.r - p.d) / (p.u - p.d), pu0 = q0 / (1 + p.r), Su0 = S * p.u;
      const K1 = S, K2 = Math.round((S + (Su0 - S) * p.f) / 1000) * 1000, C1 = Math.round(pu0 * (Su0 - K1)), C2 = Math.round(pu0 * (Su0 - K2));
      const psu = (C1 - C2) / (K2 - K1), Su = K1 + C1 / psu, psd = 1 / (1 + p.r) - psu, Sd = (S - Su * psu) / psd;
      const u = Su / S, d = Sd / S, q = psu * (1 + p.r), D = 1 / (1 + p.r);
      const S2 = [S * u * u, S * u * d, S * d * d], P2 = S2.map(x => Math.max(S - x, 0));
      const P1 = [Math.max((q * P2[0] + (1 - q) * P2[1]) * D, S - S * u), Math.max((q * P2[1] + (1 - q) * P2[2]) * D, S - S * d)];
      const ex1 = [S - S * u > (q * P2[0] + (1 - q) * P2[1]) * D, S - S * d > (q * P2[1] + (1 - q) * P2[2]) * D];
      const Pam = Math.max((q * P1[0] + (1 - q) * P1[1]) * D, 0);
      const Peu = (q * q * P2[0] + 2 * q * (1 - q) * P2[1] + (1 - q) ** 2 * P2[2]) * D * D;
      const midUp = S2[1] > S, dig = (q * q + (midUp ? 2 * q * (1 - q) : 0)) * 10000 * D * D;
      return { K1, K2, C1, C2, Su0, psu, Su, psd, Sd, u, d, q, S2, P2, P1, ex1, Pam, Peu, midUp, dig };
    },
    body: (p, c) => `<p>무배당 주식 C의 현재 주가는 ${fmt(p.S)}원이며, 1년 후 주가는 두 가지 값 중 하나가 되지만 그 값은 알려져 있지 않다. 무위험이자율은 연 ${pc(p.r)}이다.</p>`
      + tbl(['주식 C를 기초자산으로 하는 만기 1년 유럽형 콜', '행사가격', '가격'], [['콜 ①', `${fmt(c.K1)}원`, `${fmt(c.C1)}원`], ['콜 ②', `${fmt(c.K2)}원`, `${fmt(c.C2)}원`]])
      + ul(['두 행사가격은 모두 1년 후 주가가 하락했을 때의 주가보다 높고, 상승했을 때의 주가보다 낮다.', '주식 C의 주가는 2년째에도 1년째와 같은 배율로 오르거나 내린다(무위험이자율도 같음).', '모든 증권은 무차익 균형가격에 거래된다.']),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '1년 후 주가가 상승하는 상태에서만 1원을 주는 증권의 현재가격(상태가격)을 구하시오.', unit: '', dp: 4, ans: c => c.psu,
        sol: (p, c) => `두 콜은 상승 상태에서만 지급(S<sub>u</sub> − K) → C① − C② = ψ<sub>u</sub> × (K② − K①)<br>ψ<sub>u</sub> = (${fmt(c.C1)} − ${fmt(c.C2)}) ÷ ${fmt(c.K2 - c.K1)} = <b>${c.psu.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '1년 후 주가가 상승했을 때의 주가를 구하시오.', unit: '원', dp: 0, ans: c => c.Su, sol: (p, c) => `${fmt(c.C1)} = ψ<sub>u</sub>(S<sub>u</sub> − ${fmt(c.K1)}) → S<sub>u</sub> = ${fmt(c.K1)} + ${fmt(c.C1)} ÷ ${c.psu.toFixed(6)} = <b>${fmt(c.Su, 1)}원</b>` },
      { lab: '물음 1 ③', type: 'num', text: '1년 후 주가가 하락했을 때의 주가를 구하시오.', unit: '원', dp: 0, ans: c => c.Sd,
        sol: (p, c) => `채권: ψ<sub>u</sub> + ψ<sub>d</sub> = 1/${1 + p.r} → ψ<sub>d</sub> = ${c.psd.toFixed(6)}<br>주식: ${fmt(c.Su, 1)} × ψ<sub>u</sub> + S<sub>d</sub> × ψ<sub>d</sub> = ${fmt(p.S)} → S<sub>d</sub> = <b>${fmt(c.Sd, 1)}원</b>` },
      { lab: '물음 2', type: 'num', text: '주가 상승의 위험중립확률을 구하시오.', unit: '', dp: 4, ans: c => c.q, sol: (p, c) => `q = ψ<sub>u</sub> × (1 + r) = ${c.psu.toFixed(6)} × ${1 + p.r} = <b>${c.q.toFixed(4)}</b> (= (1 + r − d)/(u − d), u = ${c.u.toFixed(4)}, d = ${c.d.toFixed(4)})` },
      { lab: '물음 3', type: 'num', textf: p => `행사가격 ${fmt(p.S)}원, 만기 2년인 미국형 풋옵션의 가격을 구하시오.`, unit: '원', dp: 0, ans: c => c.Pam,
        sol: (p, c) => `2년 후 주가 ${c.S2.map(x => fmt(x, 0)).join(' / ')} → 풋 ${c.P2.map(x => fmt(x, 1)).join(' / ')}<br>1년 후: 상승 ${fmt(c.P1[0], 1)}${c.ex1[0] ? '(즉시 행사)' : ''}, 하락 ${fmt(c.P1[1], 1)}${c.ex1[1] ? '(즉시 행사)' : ' (보유가 유리)'}<br>현재 = <b>${fmt(c.Pam, 1)}원</b> (유럽형 ${fmt(c.Peu, 1)}원)` },
      { lab: '물음 4', type: 'num', text: '2년 후 주가가 현재 주가보다 높으면 10,000원, 아니면 0원을 지급하는 상품의 현재가격을 구하시오.', unit: '원', dp: 0, ans: c => c.dig,
        sol: (p, c) => `상승·하락을 한 번씩 겪은 주가 = ${fmt(p.S)} × ${c.u.toFixed(4)} × ${c.d.toFixed(4)} = ${fmt(c.S2[1], 0)}원 ${c.midUp ? '> 현재 → 이 경로도 지급' : '≤ 현재 → 지급 없음'}<br>(${c.midUp ? `q² + 2q(1−q)` : 'q²'}) × 10,000 ÷ ${(1 + p.r).toFixed(2)}² = <b>${fmt(c.dig, 1)}원</b>` },
      { lab: '물음 5', type: 'essay', text: '콜옵션 두 개의 가격만으로 1년 후 주가와 위험중립확률이 하나로 정해지는 이유를 두 줄 이내로 설명하시오.',
        model: '두 상태(상승·하락) 시장에서 두 콜은 모두 상승 상태에서만 지급하므로 가격 차이가 상승 상태가격과 행사가격 차이의 곱이 되어 상태가격이 정해지고, 그 값으로 상승 주가가 정해진다. 나머지 하락 상태가격과 하락 주가는 무위험채권과 주식의 가격 조건으로 풀리므로 트리 전체가 유일하게 결정된다.',
        kw: ['두 상태', '상태가격', '상승 상태', '채권', '유일'] },
    ],
  }));

  X_('ai-dv-pxtable').explain = (p, c) => tree({ cols: ['지금(Z)', `1분기 후 (잔존 ${p.n}분기)`], nodes: [
        { c: 0, r: 0, t: ['Z 100,000', `유럽형 ${fmt(c.Ze, 0)}`, `미국형 ${fmt(c.Za, 0)}`] },
        { c: 1, r: -1, t: [`${fmt(c.S * c.u)} = ${p.u}×A`, `유럽 ${p.u}×${fmt(c.Pe[c.Kl])}`, `미국 ${fmt(c.up, 0)}`], hi: 1 },
        { c: 1, r: 1, t: [`${fmt(c.S * c.d)} = ${c.d.toFixed(3)}×A`, `유럽 ${c.d.toFixed(3)}×${fmt(c.Pe[c.Kh])}`, `미국 ${fmt(c.dn, 0)}${c.exDn ? '' : '★'}`], hi: 1 }],
      edges: [[0, 1, `q ${c.q.toFixed(4)}`], [0, 2, `1−q`]],
      cap: `한 분기 뒤 Z는 A의 ${p.u}배 또는 ${c.d.toFixed(3)}배가 된다. 행사가격 100,000도 같은 배율로 A의 표 행사가격(${fmt(c.Kh)}·${fmt(c.Kl)})에 맞춰지므로, 표의 가격에 배율만 곱하면 그 노드의 옵션 가치가 된다.` })
    + basis([
      ['핵심 발상', '이항과정이 곱셈으로 움직이면 옵션 가격은 (주가, 행사가격)에 대해 1차 동차: P(λS, λK) = λP(S, K). 2026 문7 물음 4가 "한 분기 뒤 Z = X 또는 Y"로 표를 재활용했다면, 이 문제는 "한 분기 뒤 Z = A의 배수"로 같은 표를 재활용한다.'],
      ['이론', 'CRR 이항모형의 위험중립 평가, 유럽형 풋-콜 패리티 C − P = S − K/(1+r)ⁿ, 강세 콜 스프레드, 미국형은 각 노드에서 max(즉시 행사, 보유).'],
      ['검산 ① 유럽형', `${p.n + 1}분기 트리를 처음부터 계산한 값 ${fmt(c.ZeD, 1)}원 vs 지름길 ${fmt(c.Ze, 1)}원 ${ok(c.Ze, c.ZeD, 2e-3)} (차이는 표의 원 단위 반올림)`],
      ['검산 ② 미국형', `처음부터 계산 ${fmt(c.ZaD, 1)}원 vs 지름길 ${fmt(c.Za, 1)}원 ${ok(c.Za, c.ZaD, 2e-3)}`],
    ]);

  X_('ai-dv-implied').explain = (p, c) => tree({ cols: ['지금', '1년 후', '2년 후'], h: 280, gap: 58, nw: 82, nodes: [
        { c: 0, r: 0, t: [`S ${fmt(p.S)}`, `풋 ${fmt(c.Pam, 0)}`] },
        { c: 1, r: -1, t: [`S ${fmt(c.Su, 0)}`, `풋 ${fmt(c.P1[0], 0)}${c.ex1[0] ? '★' : ''}`] }, { c: 1, r: 1, t: [`S ${fmt(c.Sd, 0)}`, `풋 ${fmt(c.P1[1], 0)}${c.ex1[1] ? '★' : ''}`] },
        { c: 2, r: -1.6, t: [`S ${fmt(c.S2[0], 0)}`, `풋 0 · 디지털 1만`] }, { c: 2, r: 0, t: [`S ${fmt(c.S2[1], 0)}`, `풋 ${fmt(c.P2[1], 0)} · ${c.midUp ? '1만' : '0'}`], hi: 1 }, { c: 2, r: 1.6, t: [`S ${fmt(c.S2[2], 0)}`, `풋 ${fmt(c.P2[2], 0)} · 0`] }],
      edges: [[0, 1, `ψu ${c.psu.toFixed(4)}`], [0, 2, `ψd ${c.psd.toFixed(4)}`], [1, 3, ''], [1, 4, ''], [2, 4, ''], [2, 5, '']],
      cap: `콜 두 개 → 상승 상태가격 → 상승 주가 → (채권·주식 조건) 하락 주가 순서로 트리를 복원했다. 가운데 노드(상승·하락 한 번씩)가 현재 주가보다 ${c.midUp ? '높아' : '낮아'} 디지털 지급 여부가 갈린다.` })
    + basis([
      ['핵심 발상', '트리를 주고 가격을 묻는 대신, 가격에서 트리를 거꾸로 읽어 낸다(시장 가격에 들어 있는 정보 추출). 2026 문7 물음 2(콜 가격 → 상태가격)를 두 콜·두 상태로 넓히고 다기간까지 이었다.'],
      ['이론', '상태가격(애로-드브뢰): 증권 가격 = Σ 상태가격 × 지급. 두 상태 시장은 주식·채권·콜로 완비. 위험중립확률 = 상태가격 × (1 + r). 다기간은 같은 배율 반복(재결합 트리).'],
      ['검산 ① 원래 가격 재현', `복원한 트리로 콜①·콜②·주식을 다시 계산: ${fmt(c.psu * (c.Su - c.K1), 1)} / ${fmt(c.psu * (c.Su - c.K2), 1)} / ${fmt(c.psu * c.Su + c.psd * c.Sd, 1)} — 문제의 ${fmt(c.C1)} / ${fmt(c.C2)} / ${fmt(p.S)} ${ok(c.psu * c.Su + c.psd * c.Sd, p.S, 1e-6)}`],
      ['검산 ② 미국형 ≥ 유럽형', `미국형 ${fmt(c.Pam, 1)} ≥ 유럽형 ${fmt(c.Peu, 1)} ${c.Pam >= c.Peu - 1e-9 ? '<span class="xok">✓ 일치</span>' : '<span class="xno">✗ 불일치</span>'}`],
    ]);

  window.FM_AI = { topics: TOPICS, freq: FREQ, topicOf: TOPIC_OF, probs: P, years: [2017, 2026], fx: { chart, tree, tl, basis, ok } };   // fx: problems4.js의 해설 그림에도 사용
})();
