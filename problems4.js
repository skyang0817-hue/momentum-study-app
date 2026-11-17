/* AI 출제 심화 문제 — 자본예산·포트폴리오·기업재무. 실제 시험지 기준 한 쪽 안팎의 긴 지문.
 * 기출 변형이 아니라 공개된 재무관리 이론으로 상황·숫자·물음을 새로 구성한 문제라 문제은행이 아니라 AI 출제에 둔다.
 * ai_fm2.js 다음에 불러와 FM_AI.probs에 추가한다. 형식은 ai_fm2.js와 같다.
 */
(function () {
  'use strict';
  const { fmt, pc, pvif, pvifa, tbl, ul } = window.FM_UTIL;
  const P = window.FM_AI.probs, AI = { ai: true, real: true };
  const { chart, tree, tl, basis, ok } = window.FM_AI.fx;
  const f1 = x => fmt(x, 1);
  const p2 = x => (x * 100).toFixed(2) + '%';
  const r2pct = x => Math.round(+(x * 1e4).toPrecision(12)) / 1e4;   // % 단위 둘째 자리까지 반올림
  const f4 = x => x.toFixed(4);

  /* ───────── 자본예산 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'cb-x-wacc', unit: 'cb', topic: 'wacc', lv: '상', pts: 20,
    title: '신규 사업 평가: 대용기업 베타·증분현금흐름·확장옵션',
    trend: 'AI 출제 · 심화 (대용 베타, WACC, 토지 기회비용, 잠식효과, 확장옵션)',
    p: { bE: 1.5, de0: 0.8, t: 0.25, rf: 0.04, mrp: 0.06, w: 0.4, rd: 0.06, I: 600, n: 5, Q: 10, px: 50, v: 28, F: 60, X: 15, k: 0.1, B: 80, L0: 100, Ln: 130, S: 12, q: 0.55, VH: 640, VL: 200, I2: 350 },
    vary(R) {
      for (;;) {
        const p = { bE: R.f(1.2, 1.8, 0.05), de0: R.f(0.5, 1.0, 0.1), t: R.pick([0.2, 0.25]), rf: R.f(0.03, 0.05, 0.005), mrp: R.f(0.05, 0.07, 0.005), w: R.pick([0.3, 0.4, 0.5]), rd: R.f(0.05, 0.08, 0.005),
          I: R.int(500, 800, 50), n: R.pick([4, 5, 6]), Q: R.int(8, 14), px: R.int(40, 60, 5), v: 0, F: R.int(40, 80, 10), X: R.int(10, 25, 5), k: R.pick([0.08, 0.1, 0.12]), B: R.int(60, 100, 10), L0: 0, Ln: 0, S: R.int(8, 20, 2), q: R.f(0.45, 0.65, 0.05), VH: R.int(550, 800, 10), VL: R.int(150, 260, 10), I2: R.int(300, 420, 10) };
        p.v = Math.round(p.px * R.f(0.5, 0.62, 0.02)); p.L0 = p.B + R.int(10, 40, 10); p.Ln = p.L0 + R.int(10, 40, 10);
        p.bE = +p.bE.toFixed(2);
        const c = this.calc(p);
        if (c.rd >= p.rd && c.npv < -20 && c.xnpv > 5 && c.I2max > p.VL + 20 && c.I2max < p.VH - 20 && p.VH > p.I2 && p.VL < p.I2) return p;
      }
    },
    calc(p) {
      const bU = p.bE / (1 + (1 - p.t) * p.de0), de = p.w / (1 - p.w), bL = bU * (1 + (1 - p.t) * de), ke = p.rf + bL * p.mrp;
      const wacc = r2pct((1 - p.w) * ke + p.w * p.rd * (1 - p.t));
      const sales = p.Q * p.px, dep = p.I / p.n, nwc = p.k * sales, L0n = p.L0 - p.t * (p.L0 - p.B), Lnn = p.Ln - p.t * (p.Ln - p.B);
      const out = p.I + nwc + L0n, ebitda = p.Q * (p.px - p.v) - p.F - p.X, ocf = ebitda * (1 - p.t) + p.t * dep, term = nwc + Lnn;
      const npv = -out + ocf * pvifa(wacc, p.n) + term * pvif(wacc, p.n);
      const opt = p.q * Math.max(p.VH - p.I2, 0) / (1 + p.rf) ** 2 + (1 - p.q) * Math.max(p.VL - p.I2, 0) / (1 + p.rf) ** 2;
      return { bU, de, bL, ke, wacc, rd: ke, sales, dep, nwc, L0n, Lnn, out, ebitda, ocf, term, npv, opt, xnpv: npv + opt, I2max: p.VH + npv * (1 + p.rf) ** 2 / p.q };
    },
    body: (p) => `<p>통신장비 부품을 생산하는 ㈜청운테크는 지금까지 유선 장비용 부품에만 집중해 왔으나, 최근 위성통신 단말기 부품 시장이 커지자 신규 사업 진출 여부를 검토하고 있다. 신규 사업은 기존 사업과 영업위험이 크게 다르므로 회사의 현재 자본비용을 그대로 쓸 수 없다고 판단한 재무팀은, 위성통신 부품만을 생산하는 상장기업 ㈜오성을 대용기업으로 삼아 할인율을 추정하려고 한다. 금액 단위는 억원이며, 현금흐름은 별도의 언급이 없으면 매년 말에 발생한다.</p>`
      + `<p><b>[자료 1] 자본비용 관련</b></p>` + ul([
        `㈜오성의 주식 베타는 ${p.bE}이고 부채비율(부채/자기자본, 시장가치)은 ${pc(p.de0)}이다. 부채 베타는 0으로 가정하고, 베타의 조정에는 하마다(Hamada) 모형을 사용한다.`,
        `무위험이자율은 ${pc(p.rf)}, 시장위험프리미엄은 ${pc(p.mrp)}, 법인세율은 양사 모두 ${pc(p.t)}이다.`,
        `㈜청운테크는 신규 사업에 대해 목표 자본구조로 부채/총자본 ${pc(p.w)}를 계속 유지할 계획이며, 세전 타인자본비용은 ${pc(p.rd)}이다.`,
        `가중평균자본비용(WACC)은 % 단위로 소수점 아래 둘째 자리까지 반올림한 값을 이후 계산에 사용한다.`,
      ])
      + `<p><b>[자료 2] 신규 사업의 현금흐름</b></p>` + ul([
        `전용 설비 구입비 ${fmt(p.I)}억원을 현재 지출하며, 내용연수 ${p.n}년·잔존가치 0으로 정액상각한다. 사업 종료 시점의 설비 처분가치는 0이다.`,
        `연간 판매량은 ${p.Q}만 개, 개당 판매가격은 ${p.px}만원, 개당 변동비는 ${p.v}만원이며 사업 기간 동안 일정하다. 감가상각비를 제외한 연간 고정 현금비용은 ${p.F}억원이다.`,
        `신규 제품이 일부 기존 제품을 대체하여, 기존 사업의 세전 영업현금흐름이 사업 기간 동안 매년 ${p.X}억원 감소한다.`,
        `순운전자본은 연간 매출액의 ${pc(p.k)}에 해당하는 금액을 현재 투입하여 사업 기간 동안 유지하고, 사업 종료 시점에 전액 회수한다.`,
        `공장 부지로는 회사가 보유한 유휴 토지(장부가액 ${p.B}억원)를 사용한다. 이 토지를 지금 팔면 ${p.L0}억원을 받을 수 있고, 사업 종료 시점에는 ${p.Ln}억원에 팔 수 있다고 예상한다. 토지 처분손익에는 법인세가 부과된다.`,
        `시장 조사비 ${p.S}억원은 이미 지출하였으며 사업 진행 여부와 관계없이 회수할 수 없다.`,
      ])
      + `<p><b>[자료 3] 확장 기회</b></p><p>2년 후 위성통신 시장의 성장이 확인되면 회사는 ${fmt(p.I2)}억원을 추가 투자하여 생산 능력을 늘릴 수 있다. 확장 사업의 2년 후 시점 가치(추가 투자비 차감 전)는 시장이 호황이면 ${fmt(p.VH)}억원, 불황이면 ${fmt(p.VL)}억원이다. 이 기회의 평가에는 위험중립확률을 사용하며, 호황의 위험중립확률은 ${pc(p.q)}이고 무위험이자율로 할인한다. 회사는 2년 후 상황을 보고 확장 여부를 결정할 수 있다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '대용기업 자료를 이용하여 무부채 베타를 구하시오.', unit: '', dp: 4, ans: c => c.bU, sol: (p, c) => `βU = ${p.bE} / [1 + (1−${p.t})×${p.de0}] = <b>${f4(c.bU)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '목표 자본구조를 반영한 신규 사업의 자기자본비용을 구하시오.', unit: '%', dp: 2, ans: c => c.ke * 100, sol: (p, c) => `D/E = ${pc(p.w)}/${pc(1 - p.w)} = ${f4(c.de)}, βL = ${f4(c.bU)}×[1 + (1−${p.t})×${f4(c.de)}] = ${f4(c.bL)}<br>Ke = ${pc(p.rf)} + ${f4(c.bL)}×${pc(p.mrp)} = <b>${p2(c.ke)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '신규 사업의 WACC를 구하시오.', unit: '%', dp: 2, ans: c => c.wacc * 100, sol: (p, c) => `WACC = ${pc(1 - p.w)}×${p2(c.ke)} + ${pc(p.w)}×${pc(p.rd)}×(1−${p.t}) = <b>${p2(c.wacc)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '현재 시점의 증분 현금유출액(토지의 기회비용 포함)을 구하시오.', unit: '억원', dp: 2, ans: c => c.out, sol: (p, c) => `설비 ${fmt(p.I)} + 순운전자본 ${fmt(c.nwc, 2)} + 토지 세후 처분가치 ${p.L0} − ${p.t}×(${p.L0}−${p.B}) = ${fmt(c.L0n, 2)} → <b>${fmt(c.out, 2)}</b>. 시장 조사비는 매몰원가라 제외한다.` },
      { lab: '물음 2 ②', type: 'num', text: '사업 기간 중 매년의 증분 영업현금흐름(세후)을 구하시오.', unit: '억원', dp: 2, ans: c => c.ocf, sol: (p, c) => `세전 영업현금흐름 = ${p.Q}×(${p.px}−${p.v}) − ${p.F} − ${p.X} = ${fmt(c.ebitda, 2)}<br>OCF = ${fmt(c.ebitda, 2)}×(1−${p.t}) + ${p.t}×${fmt(c.dep, 2)} = <b>${fmt(c.ocf, 2)}</b>` },
      { lab: '물음 2 ③', type: 'num', text: '확장 기회를 고려하지 않은 신규 사업의 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.npv, sol: (p, c) => `종료 시점 회수액 = 순운전자본 ${fmt(c.nwc, 2)} + 토지 ${p.Ln} − ${p.t}×(${p.Ln}−${p.B}) = ${fmt(c.term, 2)}<br>NPV = −${fmt(c.out, 2)} + ${fmt(c.ocf, 2)}×PVIFA(${p2(c.wacc)}, ${p.n}) + ${fmt(c.term, 2)}×PVIF(${p2(c.wacc)}, ${p.n}) = <b>${fmt(c.npv, 2)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '확장옵션의 현재 가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.opt, sol: (p, c) => `호황 ${fmt(p.VH)}−${fmt(p.I2)} = ${fmt(p.VH - p.I2)}만 행사, 불황은 포기<br>옵션 가치 = ${pc(p.q)}×${fmt(p.VH - p.I2)} / (1+${pc(p.rf)})² = <b>${fmt(c.opt, 2)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '확장옵션을 포함하여 신규 사업이 채택될 수 있는 최대 추가 투자비를 구하시오.', unit: '억원', dp: 2, ans: c => c.I2max, sol: (p, c) => `불황에는 행사하지 않으므로 NPV + ${pc(p.q)}×(${fmt(p.VH)}−I₂)/(1+${pc(p.rf)})² = 0<br>I₂ = ${fmt(p.VH)} + (${fmt(c.npv, 2)})×(1+${pc(p.rf)})²/${pc(p.q)} = <b>${fmt(c.I2max, 2)}</b>` },
      { lab: '물음 4', type: 'essay', text: '회사 전체의 WACC 대신 대용기업 베타로 구한 할인율을 사용한 이유를 설명하고, 부채 베타를 0으로 가정한 점이 이 추정에 주는 영향을 세 줄 이내로 서술하시오.',
        model: '할인율은 자금을 대는 기업이 아니라 투자안의 영업위험을 반영해야 하므로, 사업위험이 같은 대용기업의 베타에서 재무위험을 제거해 사용한다. 실제 부채 베타가 양수이면 부채 베타를 0으로 둔 언레버링은 무부채 베타를 과소평가하고, 재레버링 과정에서도 오차가 생기므로 부채비율이 높을수록 추정 오차가 커진다.',
        kw: ['영업위험', '대용기업', '재무위험', '언레버링', '부채 베타', '과소평가'] },
    ],
  }));

  P.push(Object.assign({}, AI, {
    id: 'cb-x-infl', unit: 'cb', topic: 'npv', lv: '상', pts: 20,
    title: '수명이 다른 설비 선택: 인플레이션과 실질 연간균등가치',
    trend: 'AI 출제 · 심화 (명목·실질 현금흐름, 감가상각 절세효과, 수명이 다른 투자안)',
    p: { kn: 0.12, i: 0.03, t: 0.25, Ia: 400, na: 4, sa: 190, Sa: 30, Ib: 620, nb: 6, sb: 205, Sb: 40 },
    vary(R) {
      for (;;) {
        const p = { kn: R.f(0.1, 0.14, 0.01), i: R.f(0.02, 0.04, 0.005), t: R.pick([0.2, 0.25]), Ia: R.int(320, 460, 20), na: 4, sa: R.int(150, 220, 5), Sa: R.int(20, 50, 5), Ib: R.int(540, 720, 20), nb: 6, sb: R.int(165, 240, 5), Sb: R.int(30, 70, 5) };
        const c = this.calc(p);
        if (c.npva > 30 && c.npvb > c.npva + 5 && c.eaaa > c.eaab + 1 && c.Imax > p.Ia + 5) return p;
      }
    },
    calc(p) {
      const r = (1 + p.kn) / (1 + p.i) - 1;
      const one = (I, n, s, S) => {
        const A = pvifa(r, n), Kn = pvifa(p.kn, n), cash = s * (1 - p.t) * A, shield = p.t * (I / n) * Kn, salv = (1 - p.t) * S / (1 + r) ** n;
        return { A, Kn, cash, shield, salv, npv: -I + cash + shield + salv, eaa: (-I + cash + shield + salv) / A };
      };
      const a = one(p.Ia, p.na, p.sa, p.Sa), b = one(p.Ib, p.nb, p.sb, p.Sb);
      const per = 1 - p.t / p.na * a.Kn, Imax = (a.cash + a.salv - b.eaa * a.A) / per;
      const nomA = a.npv / a.Kn, nomB = b.npv / b.Kn;
      return { r, a, b, npva: a.npv, npvb: b.npv, eaaa: a.eaa, eaab: b.eaa, Imax, per, nomA, nomB };
    },
    body: (p) => `<p>㈜대현정밀은 낡은 가공 라인을 자동화 설비로 바꾸기로 결정하였으며, 공급 업체 두 곳이 제시한 설비 A와 설비 B 가운데 하나를 선택하려고 한다. 어느 설비든 수명이 끝나면 그 시점의 가격으로 같은 성능의 설비를 다시 구입하여 가공 라인을 계속 운영할 계획이며, 기술 변화는 없다고 가정한다. 금액 단위는 억원이다.</p>`
      + `<p>재무팀장은 물가 상승이 빠른 환경에서 현금흐름 항목마다 물가 영향이 다르다는 점을 지적하였다. 원가 절감액과 처분가치는 물가와 함께 오르지만, 세법상 감가상각비는 취득원가로 고정되어 물가와 함께 오르지 않는다. 설비의 취득원가도 이후 재구입 시점에는 물가만큼 상승한다.</p>`
      + `<p><b>[공통 자료]</b></p>` + ul([
        `명목 자본비용은 연 ${pc(p.kn)}, 연간 물가상승률은 ${pc(p.i)}로 사업 기간 내내 일정하다. 법인세율은 ${pc(p.t)}이고, 회사는 다른 사업에서 충분한 이익을 내고 있어 절세효과를 바로 누릴 수 있다.`,
        `두 설비 모두 내용연수 동안 잔존가치 0으로 정액상각한다. 처분가치는 장부가액이 0이므로 전액 과세된다.`,
        `아래 표의 연간 원가 절감액(세전)과 처분가치는 모두 <b>현재 물가 기준의 실질 금액</b>이다. 각 연도 말의 실제 금액은 물가상승률만큼 커진다.`,
        `실질 할인율은 피셔 방정식(1 + 명목 = (1 + 실질)(1 + 물가상승률))으로 구하며, 계산 중간에 반올림하지 않는다.`,
      ])
      + tbl(['구분', '설비 A', '설비 B'], [['취득원가(현재 지출)', `${fmt(p.Ia)}억원`, `${fmt(p.Ib)}억원`], ['내용연수', `${p.na}년`, `${p.nb}년`], ['연간 원가 절감액(세전, 실질)', `${fmt(p.sa)}억원`, `${fmt(p.sb)}억원`], ['내용연수 종료 시 처분가치(세전, 실질)', `${fmt(p.Sa)}억원`, `${fmt(p.Sb)}억원`]])
      + `<p>담당 대리는 설비 B의 NPV가 더 크므로 설비 B를 선택해야 한다고 보고하였다. 재무팀장은 수명 차이와 재구입 비용의 상승을 반영해 다시 비교하라고 지시하였다.</p>`,
    qs: [
      { lab: '물음 1', type: 'num', text: '실질 할인율을 구하시오.', unit: '%', dp: 2, ans: c => c.r * 100, sol: (p, c) => `r = (1+${pc(p.kn)})/(1+${pc(p.i)}) − 1 = <b>${p2(c.r)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '설비 A의 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.npva, sol: (p, c) => `실질 절감액 현가 ${p.sa}×(1−${p.t})×PVIFA(r, ${p.na}) = ${fmt(c.a.cash, 2)}<br>상각 절세효과는 명목으로 고정: ${p.t}×${fmt(p.Ia / p.na, 2)}×PVIFA(${pc(p.kn)}, ${p.na}) = ${fmt(c.a.shield, 2)}<br>처분가치 현가 = ${p.Sa}×(1−${p.t})/(1+r)^${p.na} = ${fmt(c.a.salv, 2)}<br>NPV = −${p.Ia} + ${fmt(c.a.cash, 2)} + ${fmt(c.a.shield, 2)} + ${fmt(c.a.salv, 2)} = <b>${fmt(c.npva, 2)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '설비 B의 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.npvb, sol: (p, c) => `절감액 현가 ${fmt(c.b.cash, 2)} + 상각 절세효과 ${fmt(c.b.shield, 2)} + 처분가치 현가 ${fmt(c.b.salv, 2)} − ${p.Ib} = <b>${fmt(c.npvb, 2)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '재구입 비용의 상승을 반영한 설비 A의 실질 연간균등가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.eaaa, sol: (p, c) => `재구입 원가가 물가만큼 오르므로 실질 연금으로 환산: ${fmt(c.npva, 2)} / PVIFA(r, ${p.na}) = <b>${fmt(c.eaaa, 2)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '설비 B의 실질 연간균등가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.eaab, sol: (p, c) => `${fmt(c.npvb, 2)} / PVIFA(r, ${p.nb}) = <b>${fmt(c.eaab, 2)}</b>` },
      { lab: '물음 3 ③', type: 'choice', text: '어느 설비를 선택해야 하는가?', opts: ['설비 A', '설비 B'], ans: () => 0, sol: (p, c) => `실질 연간균등가치 A ${fmt(c.eaaa, 2)} > B ${fmt(c.eaab, 2)}이므로 <b>설비&nbsp;A</b>. NPV는 B가 더 크지만 수명이 달라 그대로 비교할 수 없다.` },
      { lab: '물음 4', type: 'num', text: '설비 B의 실질 연간균등가치와 같아지는 설비 A의 취득원가(다른 조건은 동일)를 구하시오.', unit: '억원', dp: 2, ans: c => c.Imax, sol: (p, c) => `취득원가 1억원당 순부담 = 1 − ${p.t}/${p.na}×PVIFA(${pc(p.kn)}, ${p.na}) = ${c.per.toFixed(6)}<br>I = (${fmt(c.a.cash, 2)} + ${fmt(c.a.salv, 2)} − ${fmt(c.eaab, 2)}×PVIFA(r, ${p.na})) / ${c.per.toFixed(6)} = <b>${fmt(c.Imax, 2)}</b>` },
      { lab: '물음 5', type: 'essay', text: '실질 현금흐름을 명목 할인율로 할인하거나 감가상각 절세효과를 실질 할인율로 할인하면 NPV가 각각 어떻게 왜곡되는지, 또한 연간균등가치를 명목 연금으로 비교하면 왜 문제가 되는지 네 줄 이내로 서술하시오.',
        model: '실질 현금흐름을 명목 할인율로 할인하면 분모만 물가를 반영해 NPV가 과소평가된다. 감가상각 절세효과는 명목 금액으로 고정되어 있어 실질 할인율로 할인하면 과대평가된다. 명목 연금 비교는 금액이 매년 일정하다고 보지만 실제 재구입 원가와 현금흐름은 물가와 함께 오르므로, 재투자의 수명 차이를 왜곡한다. 그래서 실질 연금으로 비교해야 한다.',
        kw: ['과소평가', '과대평가', '명목', '실질', '재구입', '물가'] },
    ],
  }));

  /* ───────── 포트폴리오·CAPM·APT ───────── */
  P.push(Object.assign({}, AI, {
    id: 'pf-x-tb', unit: 'pf', topic: 'apt', lv: '상', pts: 15,
    title: '단일지수모형과 능동적 포트폴리오: 트레이너-블랙 모형',
    trend: 'AI 출제 · 심화 (시장모형, 알파·잔차위험, 트레이너-블랙, 샤프비율 개선, 최적 자본배분)',
    p: { rf: 0.03, mrp: 0.08, sm: 0.2, ax: 0.03, bx: 1.2, sx: 0.3, ay: -0.005, by: 0.8, sy: 0.25, A: 4 },
    vary(R) {
      for (;;) {
        const p = { rf: R.f(0.02, 0.04, 0.005), mrp: R.f(0.06, 0.09, 0.005), sm: R.f(0.16, 0.24, 0.01), ax: R.f(0.02, 0.05, 0.005), bx: R.f(1.0, 1.5, 0.1), sx: R.f(0.25, 0.4, 0.05), ay: -R.f(0.005, 0.015, 0.0025), by: R.f(0.6, 1.1, 0.1), sy: R.f(0.2, 0.35, 0.05), A: R.pick([3, 4, 5]) };
        const c = this.calc(p);
        if (c.wx > 1 && c.wx < 2.2 && c.ws > 0.03 && c.ws < 0.6 && c.y > 0.3 && c.y < 2) return p;
      }
    },
    calc(p) {
      const qx = p.ax / p.sx ** 2, qy = p.ay / p.sy ** 2, sum = qx + qy, wx = qx / sum, wy = qy / sum;
      const aA = wx * p.ax + wy * p.ay, bA = wx * p.bx + wy * p.by, vA = wx ** 2 * p.sx ** 2 + wy ** 2 * p.sy ** 2;
      const w0 = (aA / vA) / (p.mrp / p.sm ** 2), ws = w0 / (1 + (1 - bA) * w0);
      const er = ws * (aA + bA * p.mrp) + (1 - ws) * p.mrp, bP = ws * bA + 1 - ws, vP = bP ** 2 * p.sm ** 2 + ws ** 2 * vA;
      const shM = p.mrp / p.sm, sh = er / Math.sqrt(vP), IR2 = aA ** 2 / vA, y = er / (p.A * vP);
      return { qx, qy, wx, wy, aA, bA, vA, w0, ws, er, bP, vP, sP: Math.sqrt(vP), shM, sh, IR2, y, finalX: y * ws * wx, finalM: y * (1 - ws) };
    },
    body: (p) => `<p>연기금의 위탁 운용사인 ㈜한빛자산운용은 시장지수를 복제하는 소극적 포트폴리오에 일부 종목의 분석 결과를 더해 운용 성과를 높이려고 한다. 리서치 부서는 두 종목 X와 Y를 분석하였고, 종목 X는 저평가, 종목 Y는 고평가되었다고 판단하였다. 운용 부서는 분석 종목으로 능동적 포트폴리오(active portfolio)를 구성하고 이를 시장지수 포트폴리오와 결합한 뒤, 그 결과로 얻은 최적 위험 포트폴리오를 무위험자산과 나누어 투자하려고 한다.</p>`
      + `<p>모든 수익률은 연 기준이며, 각 종목의 초과수익률은 단일지수모형 R<sub>i</sub> − R<sub>f</sub> = α<sub>i</sub> + β<sub>i</sub>(R<sub>M</sub> − R<sub>f</sub>) + e<sub>i</sub>를 따른다. 잔차 e<sub>i</sub>는 시장 수익률과 무관하고 서로 독립이다. 공매도에는 제약이 없고 거래비용은 무시한다. 시장지수는 분석 대상 종목을 제외해도 성격이 같다고 가정한다.</p>`
      + tbl(['구분', '알파(α)', '베타(β)', '잔차 표준편차 σ(e)'], [['종목 X', pc(p.ax), p.bx, pc(p.sx)], ['종목 Y', pc(p.ay), p.by, pc(p.sy)]])
      + ul([
        `무위험이자율은 ${pc(p.rf)}이고, 시장지수의 기대초과수익률은 ${pc(p.mrp)}, 수익률 표준편차는 ${pc(p.sm)}이다.`,
        `최적 위험 포트폴리오를 정할 때에는 트레이너-블랙(Treynor-Black) 모형을 사용한다. 능동적 포트폴리오의 종목별 비중은 α<sub>i</sub>/σ²(e<sub>i</sub>)에 비례하게 정한다.`,
        `능동적 포트폴리오의 최초 비중은 w₀ = [α<sub>A</sub>/σ²(e<sub>A</sub>)] / [E(R<sub>M</sub> − R<sub>f</sub>)/σ²<sub>M</sub>]이며, 베타를 조정한 최종 비중은 w* = w₀ / [1 + (1 − β<sub>A</sub>)w₀]이다.`,
        `이 연기금의 효용함수는 U = E(R) − ½·A·σ²이며, 위험회피계수 A는 ${p.A}이다.`,
      ])
      + `<p>운용 위원회는 다음 사항을 보고해 달라고 요청하였다. 계산은 중간에 반올림하지 않으며, 비중은 음수일 수 있다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '능동적 포트폴리오에서 종목 X의 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.wx * 100, sol: (p, c) => `X: ${pc(p.ax)}/${pc(p.sx)}² = ${f4(c.qx)}, Y: ${pc(p.ay)}/${pc(p.sy)}² = ${f4(c.qy)}<br>w<sub>X</sub> = ${f4(c.qx)}/(${f4(c.qx)}${c.qy < 0 ? '−' : '+'}${f4(Math.abs(c.qy))}) = <b>${p2(c.wx)}</b>, w<sub>Y</sub> = ${p2(c.wy)}` },
      { lab: '물음 1 ②', type: 'num', text: '능동적 포트폴리오의 알파를 구하시오.', unit: '%', dp: 2, ans: c => c.aA * 100, sol: (p, c) => `α<sub>A</sub> = ${f4(c.wx)}×${pc(p.ax)} + (${f4(c.wy)})×(${pc(p.ay)}) = <b>${p2(c.aA)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '능동적 포트폴리오의 베타를 구하시오.', unit: '', dp: 4, ans: c => c.bA, sol: (p, c) => `β<sub>A</sub> = ${f4(c.wx)}×${p.bx} + (${f4(c.wy)})×${p.by} = <b>${f4(c.bA)}</b>` },
      { lab: '물음 1 ④', type: 'num', text: '능동적 포트폴리오의 잔차 분산을 구하시오.', unit: '', dp: 4, ans: c => c.vA, sol: (p, c) => `σ²(e<sub>A</sub>) = ${f4(c.wx)}²×${pc(p.sx)}² + (${f4(c.wy)})²×${pc(p.sy)}² = <b>${f4(c.vA)}</b> (잔차가 서로 독립)` },
      { lab: '물음 2', type: 'num', text: '최적 위험 포트폴리오에서 능동적 포트폴리오의 최종 비중 w*를 구하시오.', unit: '%', dp: 2, ans: c => c.ws * 100, sol: (p, c) => `w₀ = (${f4(c.aA)}/${f4(c.vA)}) / (${pc(p.mrp)}/${pc(p.sm)}²) = ${f4(c.w0)}<br>w* = ${f4(c.w0)}/[1 + (1−${f4(c.bA)})×${f4(c.w0)}] = <b>${p2(c.ws)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '최적 위험 포트폴리오의 기대초과수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.er * 100, sol: (p, c) => `w*×(α<sub>A</sub> + β<sub>A</sub>×${pc(p.mrp)}) + (1−w*)×${pc(p.mrp)} = <b>${p2(c.er)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '최적 위험 포트폴리오의 샤프비율을 구하시오.', unit: '', dp: 4, ans: c => c.sh, sol: (p, c) => `β<sub>P</sub> = ${f4(c.bP)}, σ²<sub>P</sub> = β<sub>P</sub>²×${pc(p.sm)}² + w*²×${f4(c.vA)} = ${f4(c.vP)}<br>샤프 = ${f4(c.er)}/√${f4(c.vP)} = <b>${f4(c.sh)}</b><br>검산: S²<sub>P</sub> = S²<sub>M</sub> + α²<sub>A</sub>/σ²(e<sub>A</sub>) = ${f4(c.shM ** 2)} + ${f4(c.IR2)} (시장 샤프 ${f4(c.shM)})` },
      { lab: '물음 4 ①', type: 'num', text: '연기금 자금 중 최적 위험 포트폴리오에 투자할 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.y * 100, sol: (p, c) => `y* = ${f4(c.er)} / (${p.A}×${f4(c.vP)}) = <b>${p2(c.y)}</b>` },
      { lab: '물음 4 ②', type: 'num', text: '연기금 전체 자금 대비 종목 X의 최종 투자 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.finalX * 100, sol: (p, c) => `y*×w*×w<sub>X</sub> = ${f4(c.y)}×${f4(c.ws)}×${f4(c.wx)} = <b>${p2(c.finalX)}</b>` },
      { lab: '물음 5', type: 'essay', text: '샤프비율의 개선 폭이 정보비율에 따라 결정되는 이유를 설명하고, 리서치의 알파 추정치를 그대로 쓰면 실무에서 어떤 문제가 생기는지 세 줄 이내로 서술하시오.',
        model: '능동적 포트폴리오를 최적으로 결합하면 샤프비율의 제곱은 시장 샤프비율의 제곱에 정보비율(알파/잔차 표준편차)의 제곱을 더한 값이 된다. 다만 알파 추정치에는 오차가 커서 그대로 쓰면 극단적인 비중과 공매도가 나타나므로, 과거 예측력에 따라 알파를 축소 조정하고 비중 한도를 두어야 한다.',
        kw: ['정보비율', '잔차', '제곱', '추정 오차', '극단적', '축소'] },
    ],
  }));

  P.push(Object.assign({}, AI, {
    id: 'pf-x-apt', unit: 'pf', topic: 'apt', lv: '상', pts: 15,
    title: '2요인 APT: 요인 프리미엄 추정과 차익거래 포트폴리오 구성',
    trend: 'AI 출제 · 심화 (2요인 APT, 복제 포트폴리오, 무위험 차익, 분산 효과, CAPM과의 관계)',
    p: { l0: 0.03, l1: 0.05, l2: 0.04, ba1: 1.0, ba2: 0.5, bb1: 0.6, bb2: 1.2, bc1: 1.5, bc2: 0.2, bd1: 1.0, bd2: 1.0, ed: 0.135, amt: 100, f1: 0.01, f2: -0.02, se: 0.3, tau: 0.03, bm1: 1.2, bm2: 0.4 },
    vary(R) {
      for (;;) {
        const p = { l0: R.f(0.02, 0.04, 0.005), l1: R.f(0.04, 0.07, 0.005), l2: R.f(0.02, 0.05, 0.005), ba1: R.f(0.8, 1.2, 0.1), ba2: R.f(0.3, 0.6, 0.1), bb1: R.f(0.4, 0.8, 0.1), bb2: R.f(1.0, 1.4, 0.1), bc1: R.f(1.3, 1.7, 0.1), bc2: R.f(0.1, 0.3, 0.1), bd1: R.f(0.8, 1.2, 0.1), bd2: R.f(0.7, 1.1, 0.1), ed: 0, amt: R.int(50, 200, 50), f1: R.pick([-0.01, 0.01, 0.02]), f2: R.pick([-0.02, -0.01, 0.01]), se: R.f(0.25, 0.4, 0.05), tau: R.pick([0.02, 0.025, 0.03, 0.04]), bm1: R.f(1.0, 1.4, 0.1), bm2: R.f(0.2, 0.6, 0.1) };
        p.ed = +(p.l0 + p.l1 * p.bd1 + p.l2 * p.bd2 + R.pick([-0.012, -0.008, 0.008, 0.012, 0.015])).toFixed(4);
        const c = this.calc(p);
        if (Math.abs(c.det) > 0.2 && Math.abs(c.wa) < 3 && Math.abs(c.wb) < 3 && Math.abs(c.wc) < 3 && Math.abs(c.gap) > 0.005) return p;
      }
    },
    calc(p) {
      const e = (b1, b2) => p.l0 + p.l1 * b1 + p.l2 * b2;
      const ea = +e(p.ba1, p.ba2).toFixed(6), eb = +e(p.bb1, p.bb2).toFixed(6), ec = +e(p.bc1, p.bc2).toFixed(6);
      const det3 = (a, b, c, d, e2, f, g, h, i) => a * (e2 * i - f * h) - b * (d * i - f * g) + c * (d * h - e2 * g);
      const det = det3(1, 1, 1, p.ba1, p.bb1, p.bc1, p.ba2, p.bb2, p.bc2);
      const wa = det3(1, 1, 1, p.bd1, p.bb1, p.bc1, p.bd2, p.bb2, p.bc2) / det, wb = det3(1, 1, 1, p.ba1, p.bd1, p.bc1, p.ba2, p.bd2, p.bc2) / det, wc = 1 - wa - wb;
      const eq = e(p.bd1, p.bd2), gap = p.ed - eq, profit = Math.abs(gap) * p.amt;
      const realD = p.ed + p.bd1 * p.f1 + p.bd2 * p.f2, N = Math.ceil((p.se / p.tau) ** 2 - 1e-9), rm = e(p.bm1, p.bm2);
      return { ea, eb, ec, det, wa, wb, wc, eq, gap, profit, under: gap > 0, realD, N, rm };
    },
    body: (p, c) => `<p>주식 운용사 ㈜미래인베스트의 퀀트팀은 국내 주식의 수익률이 경기 요인(F₁)과 금리 요인(F₂)의 두 요인으로 설명된다고 보고, 2요인 재정가격결정모형(APT)을 운용에 활용하려고 한다. 팀은 시장에서 거래되는 잘 분산된 포트폴리오 A, B, C의 요인 민감도와 기대수익률을 추정하였고, 이 세 포트폴리오는 균형 상태에 있다고 판단하였다. 새로 추정한 잘 분산된 포트폴리오 D는 기대수익률이 APT 균형값과 달라 보인다.</p>`
      + `<p>각 포트폴리오의 수익률은 R = E(R) + b₁F₁ + b₂F₂로 표현되며, F₁과 F₂는 기댓값이 0인 요인의 예상치 못한 변화이다. 잘 분산된 포트폴리오의 잔차 위험은 0으로 본다. 공매도 자금을 전액 사용할 수 있고 거래비용은 없으며, 무위험자산의 존재 여부는 포트폴리오 자료로부터 판단한다.</p>`
      + tbl(['포트폴리오', '요인 민감도 b₁', '요인 민감도 b₂', '기대수익률'], [['A', p.ba1, p.ba2, p2(c.ea)], ['B', p.bb1, p.bb2, p2(c.eb)], ['C', p.bc1, p.bc2, p2(c.ec)], ['D', p.bd1, p.bd2, p2(p.ed)]])
      + ul([
        `차익거래는 D와, A·B·C로 만든 복제 포트폴리오(요인 민감도와 투자 금액이 D와 같은 포트폴리오) 사이에서 실행한다. 투자 규모는 D 기준 ${fmt(p.amt)}억원이다.`,
        `시장 포트폴리오의 요인 민감도는 (${p.bm1}, ${p.bm2})로 추정된다.`,
        `차익 기회를 확인한 뒤, 팀은 잘 분산되지 않은 개별 주식에도 같은 전략을 적용할 수 있는지 검토한다. 개별 주식의 잔차 표준편차는 모두 ${pc(p.se)}이고 잔차는 서로 독립이다.`,
        `요인 프리미엄과 비중은 계산 중간에 반올림하지 않는다.`,
      ]),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '요인 1의 위험 프리미엄 λ₁을 구하시오.', unit: '%', dp: 2, ans: (c, p) => p.l1 * 100, sol: (p, c) => `E = λ₀ + λ₁b₁ + λ₂b₂에 A, B, C를 대입한 연립방정식을 풀면 λ₀ = ${p2(p.l0)}, <b>λ₁ = ${p2(p.l1)}</b>, λ₂ = ${p2(p.l2)}` },
      { lab: '물음 1 ②', type: 'num', text: '요인 2의 위험 프리미엄 λ₂를 구하시오.', unit: '%', dp: 2, ans: (c, p) => p.l2 * 100, sol: (p, c) => `같은 연립방정식에서 <b>λ₂ = ${p2(p.l2)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '자료에 내재된 무위험이자율 λ₀를 구하시오.', unit: '%', dp: 2, ans: (c, p) => p.l0 * 100, sol: (p, c) => `요인 민감도가 모두 0인 포트폴리오의 수익률: <b>λ₀ = ${p2(p.l0)}</b>` },
      { lab: '물음 2', type: 'num', text: '포트폴리오 D의 APT 균형 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.eq * 100, sol: (p, c) => `${p2(p.l0)} + ${p2(p.l1)}×${p.bd1} + ${p2(p.l2)}×${p.bd2} = <b>${p2(c.eq)}</b>. 실제 ${p2(p.ed)}이므로 ${c.under ? '저평가' : '고평가'}` },
      { lab: '물음 3 ①', type: 'num', text: '복제 포트폴리오에서 A의 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.wa * 100, sol: (p, c) => `w<sub>A</sub> + w<sub>B</sub> + w<sub>C</sub> = 1, ${p.ba1}w<sub>A</sub> + ${p.bb1}w<sub>B</sub> + ${p.bc1}w<sub>C</sub> = ${p.bd1}, ${p.ba2}w<sub>A</sub> + ${p.bb2}w<sub>B</sub> + ${p.bc2}w<sub>C</sub> = ${p.bd2}<br><b>w<sub>A</sub> = ${p2(c.wa)}</b>, w<sub>B</sub> = ${p2(c.wb)}, w<sub>C</sub> = ${p2(c.wc)}` },
      { lab: '물음 3 ②', type: 'num', text: '복제 포트폴리오에서 B의 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.wb * 100, sol: (p, c) => `<b>w<sub>B</sub> = ${p2(c.wb)}</b>` },
      { lab: '물음 3 ③', type: 'choice', text: '차익거래 포지션으로 옳은 것을 고르시오.', opts: ['D 매수, 복제 포트폴리오 공매도', 'D 공매도, 복제 포트폴리오 매수'], ans: c => (c.under ? 0 : 1), sol: (p, c) => `D의 기대수익률이 균형보다 ${c.under ? '높아 저평가: <b>D 매수, 복제 공매도</b>' : '낮아 고평가: <b>D 공매도, 복제 매수</b>'}` },
      { lab: '물음 4 ①', type: 'num', text: '이 차익거래의 기대 무위험 이익을 구하시오.', unit: '억원', dp: 2, ans: c => c.profit, sol: (p, c) => `|${p2(p.ed)} − ${p2(c.eq)}| × ${fmt(p.amt)} = <b>${fmt(c.profit, 2)}</b>` },
      { lab: '물음 4 ②', type: 'num', textf: p => `요인 충격이 F₁ = ${pc(p.f1)}, F₂ = ${pc(p.f2)}로 실현될 때 포트폴리오 D의 실현수익률을 구하시오.`, unit: '%', dp: 2, ans: c => c.realD * 100, sol: (p, c) => `${p2(p.ed)} + ${p.bd1}×(${pc(p.f1)}) + ${p.bd2}×(${pc(p.f2)}) = <b>${p2(c.realD)}</b>. 복제 포트폴리오도 같은 충격을 받으므로 차익은 변하지 않는다.` },
      { lab: '물음 5 ①', type: 'num', textf: p => `개별 주식을 동일 비중으로 담아 잔차 표준편차를 ${pc(p.tau)} 이하로 줄이려면 최소 몇 종목이 필요한지 구하시오.`, unit: '종목', dp: 0, tol: 0, ans: c => c.N, sol: (p, c) => `${pc(p.se)}/√N ≤ ${pc(p.tau)} → N ≥ (${p.se}/${p.tau})² → <b>${c.N}종목</b>` },
      { lab: '물음 5 ②', type: 'num', text: 'APT가 성립할 때 시장 포트폴리오의 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.rm * 100, sol: (p, c) => `${p2(p.l0)} + ${p2(p.l1)}×${p.bm1} + ${p2(p.l2)}×${p.bm2} = <b>${p2(c.rm)}</b>` },
      { lab: '물음 6', type: 'essay', text: 'APT와 CAPM의 가정 차이를 설명하고, 개별 주식 한 종목으로 같은 거래를 하면 무위험 차익이 되지 않는 이유를 세 줄 이내로 서술하시오.',
        model: 'CAPM은 평균-분산 효용과 동질적 기대 등 균형 가정이 필요하고 시장 포트폴리오를 알아야 하지만, APT는 요인모형과 차익 기회가 없다는 조건만 필요하고 여러 요인을 허용한다. 개별 주식에는 분산되지 않은 잔차 위험이 남아 있어 요인 위험을 없애도 손익이 잔차에 따라 달라지므로 무위험 차익이 되지 않는다.',
        kw: ['차익', '요인', '시장 포트폴리오', '잔차', '분산', '균형'] },
    ],
  }));

  /* ───────── 기업재무 ───────── */
  P.push(Object.assign({}, AI, {
    id: 'cf-x-miller', unit: 'cf', topic: 'mm', lv: '상', pts: 15,
    title: '자본구조 재조정: 자사주 매입, 개인세(Miller), 재무적 곤경비용',
    trend: 'AI 출제 · 심화 (MM 1963, 자사주 재조정, Miller 1977, 상충이론)',
    p: { E: 180, t: 0.25, rho: 0.15, N: 1000, D: 300, rd: 0.06, te: 0.1, td: 0.2, Ds: [200, 400, 600, 800], bc: [2, 12, 35, 80] },
    vary(R) {
      for (;;) {
        const p = { E: R.int(150, 240, 10), t: R.pick([0.2, 0.25]), rho: R.f(0.12, 0.16, 0.01), N: R.pick([500, 1000, 2000]), D: 0, rd: R.f(0.05, 0.07, 0.005), te: R.f(0.05, 0.15, 0.05), td: R.f(0.15, 0.25, 0.05), Ds: [200, 400, 600, 800], bc: [R.int(1, 4), R.int(8, 16, 2), R.int(28, 42, 2), R.int(70, 95, 5)] };
        p.D = R.int(200, 400, 50);
        const c = this.calc(p);
        if (c.gain > 0.05 && c.tdStar > p.td && c.Vu > p.D * 1.5 && c.rd0 < p.rho) return p;
      }
    },
    calc(p) {
      const Vu = p.E * (1 - p.t) / p.rho, VL = Vu + p.t * p.D, px0 = Vu / p.N * 1e8 / 1e4, px = VL / p.N * 1e8 / 1e4, EqAfter = VL - p.D, buy = p.D * 1e8 / px, left = p.N * 1e4 - buy;
      const ke = p.rho + (p.rho - p.rd) * (1 - p.t) * p.D / EqAfter, wacc = ke * EqAfter / VL + p.rd * (1 - p.t) * p.D / VL;
      const gain = 1 - (1 - p.t) * (1 - p.te) / (1 - p.td), tdStar = 1 - (1 - p.t) * (1 - p.te);
      const nets = p.Ds.map((d, i) => gain * d - p.bc[i]), best = nets.indexOf(Math.max(...nets));
      return { Vu, VL, px0, px, EqAfter, buy, left, ke, wacc, gain, tdStar, nets, best, Dbest: p.Ds[best], Vbest: Vu + nets[best], rd0: p.rd };
    },
    body: (p, c) => `<p>안정적인 현금흐름을 내는 ㈜세림물류는 창업 이후 부채를 전혀 쓰지 않았다. 신임 재무담당 임원은 자본구조를 재조정하여 기업가치를 높일 수 있는지 검토하고 있다. 회사는 영구적으로 매년 말 영업이익(EBIT) ${fmt(p.E)}억원을 올릴 것으로 예상되며, 성장 기회는 없고 이익은 전액 배당한다. 감가상각비는 신규 투자액과 같다고 가정한다. 현재 발행 주식 수는 ${fmt(p.N)}만 주이며, 금액 단위는 별도 언급이 없으면 억원이다.</p>`
      + `<p><b>[자료 1] 기본 조건</b></p>` + ul([
        `무부채 상태의 자기자본비용은 ${pc(p.rho)}이고, 법인세율은 ${pc(p.t)}이다.`,
        `회사는 ${fmt(p.D)}억원의 영구채를 연 ${pc(p.rd)}로 발행하여 조달 자금 전액으로 자기 주식을 공정한 가격에 매입할 계획이다. 부채의 시장가치는 액면과 같다.`,
        `자본시장은 효율적이어서 재조정 계획을 공시하는 시점에 부채의 절세효과가 주가에 바로 반영된다. 자사주는 공시 후 주가로 매입한다.`,
        `자료 1에 대한 물음에서는 개인소득세와 재무적 곤경비용이 없다고 가정한다(MM 1963).`,
      ])
      + `<p><b>[자료 2] 개인소득세와 재무적 곤경비용</b></p><p>임원은 현실의 투자자가 내는 개인소득세와 부채가 지나치게 많아질 때 생기는 재무적 곤경비용을 함께 고려하려고 한다. 이자소득에 대한 개인소득세율은 ${pc(p.td)}, 주식소득에 대한 개인소득세율은 ${pc(p.te)}이다. 부채 사용의 이득은 Miller(1977) 모형을 사용하여 계산한다. 부채 수준별 재무적 곤경비용의 현재가치는 아래 표와 같이 추정된다. 무부채 기업가치는 자료 1의 값을 사용하고, 부채는 표의 수준 중에서만 선택할 수 있다.</p>`
      + tbl(['부채 수준(억원)', ...p.Ds.map(d => fmt(d))], [['재무적 곤경비용 현가(억원)', ...p.bc.map(b => fmt(b))]])
      + `<p>임원은 이 결과를 근거로 이사회에 목표 부채 수준을 제안하고, 절세효과만으로 판단할 때와 어떤 차이가 생기는지도 함께 설명할 계획이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '현재 무부채 상태의 기업가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.Vu, sol: (p, c) => `${fmt(p.E)}×(1−${p.t}) / ${pc(p.rho)} = <b>${fmt(c.Vu, 2)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '재조정 계획 공시 후의 주가를 구하시오.', unit: '원', dp: 0, ans: c => c.px, sol: (p, c) => `V<sub>L</sub> = ${fmt(c.Vu, 2)} + ${p.t}×${fmt(p.D)} = ${fmt(c.VL, 2)}. 자사주 매입 전 주주의 부는 V<sub>L</sub>이므로 주가 = ${fmt(c.VL, 2)}억원 / ${fmt(p.N)}만 주 = <b>${fmt(c.px)}원</b>` },
      { lab: '물음 1 ③', type: 'num', text: '재조정 후 남는 발행 주식 수를 구하시오.', unit: '만 주', dp: 2, ans: c => c.left / 1e4, sol: (p, c) => `매입 주식 수 = ${fmt(p.D)}억원 / ${fmt(c.px)}원 = ${fmt(c.buy / 1e4, 2)}만 주 → 잔여 <b>${fmt(c.left / 1e4, 2)}만 주</b>` },
      { lab: '물음 1 ④', type: 'num', text: '재조정 후의 자기자본비용을 구하시오.', unit: '%', dp: 2, ans: c => c.ke * 100, sol: (p, c) => `S = ${fmt(c.VL, 2)} − ${fmt(p.D)} = ${fmt(c.EqAfter, 2)}<br>Ke = ${pc(p.rho)} + (${pc(p.rho)}−${pc(p.rd)})×(1−${p.t})×${fmt(p.D)}/${fmt(c.EqAfter, 2)} = <b>${p2(c.ke)}</b>` },
      { lab: '물음 1 ⑤', type: 'num', text: '재조정 후의 WACC를 구하시오.', unit: '%', dp: 2, ans: c => c.wacc * 100, sol: (p, c) => `${p2(c.ke)}×S/V + ${pc(p.rd)}×(1−${p.t})×D/V = <b>${p2(c.wacc)}</b>. 검산: ${pc(p.rho)}×(1 − ${p.t}×D/V) = ${p2(p.rho * (1 - p.t * p.D / c.VL))}` },
      { lab: '물음 2 ①', type: 'num', text: 'Miller 모형에 따른 부채 1원당 기업가치 증가액을 구하시오.', unit: '원', dp: 4, ans: c => c.gain, sol: (p, c) => `1 − (1−${p.t})(1−${p.te})/(1−${p.td}) = <b>${f4(c.gain)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '부채 사용 이득이 0이 되는 이자소득세율을 구하시오.', unit: '%', dp: 2, ans: c => c.tdStar * 100, sol: (p, c) => `(1−${p.t})(1−${p.te}) = 1−T<sub>d</sub> → <b>T<sub>d</sub> = ${p2(c.tdStar)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '기업가치를 최대로 하는 부채 수준을 표에서 고르시오.', unit: '억원', dp: 0, tol: 0, ans: c => c.Dbest, sol: (p, c) => `순이득 = 부채×${f4(c.gain)} − 곤경비용: ${p.Ds.map((d, i) => `${fmt(d)}→${fmt(c.nets[i], 2)}`).join(', ')} → <b>${fmt(c.Dbest)}억원</b>` },
      { lab: '물음 3 ②', type: 'num', text: '그 부채 수준에서의 기업가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.Vbest, sol: (p, c) => `${fmt(c.Vu, 2)} + ${fmt(c.nets[c.best], 2)} = <b>${fmt(c.Vbest, 2)}</b>` },
      { lab: '물음 4', type: 'essay', text: 'Miller(1977) 모형에서 개별 기업의 최적 자본구조가 정해지지 않는 이유와 상충이론의 결론이 다른 이유를 세 줄 이내로 서술하시오.',
        model: 'Miller 균형에서는 경제 전체의 부채 공급이 늘면서 한계 투자자의 세율이 법인세 효과를 상쇄해 개별 기업이 부채로 얻는 순이득이 0이 되고, 경제 전체의 부채 총량만 정해진다. 상충이론은 절세효과와 재무적 곤경비용이 한계에서 같아지는 지점을 개별 기업의 최적 부채 수준으로 본다.',
        kw: ['한계 투자자', '균형', '순이득', '경제 전체', '곤경비용', '절세'] },
    ],
  }));

  P.push(Object.assign({}, AI, {
    id: 'cf-x-agency', unit: 'cf', topic: 'agency', lv: '상', pts: 15,
    title: '부채의 대리비용: 위험 전이와 과소투자',
    trend: 'AI 출제 · 심화 (위험 전이, 합리적 채권자의 이자 요구, 부채 한도, 과소투자)',
    p: { q: 0.5, r: 0.05, Ag: 1400, Ab: 1000, Bg: 2000, Bb: 200, F: 1000, R: 700, F2: 1300, K: 100, Yg: 120, Yb: 180 },
    vary(R) {
      for (;;) {
        const p = { q: R.pick([0.4, 0.5, 0.6]), r: R.f(0.03, 0.06, 0.01), Ag: R.int(1300, 1500, 50), Ab: R.int(900, 1100, 50), Bg: R.int(1800, 2300, 50), Bb: R.int(100, 300, 50), F: R.int(800, 1000, 50), R: R.int(600, 750, 25), F2: 0, K: R.int(80, 120, 10), Yg: R.int(100, 160, 10), Yb: R.int(140, 220, 10) };
        p.F2 = R.int(p.Ab + p.Yb + 20, p.Ag - 20, 10);
        const c = this.calc(p);
        if (c.EA > c.EB + 20 && c.eqB > c.eqA + 20 && p.F <= p.Ab && p.F > p.Bb && c.F3 > p.Bb && c.F3 < p.Ag && c.eqA3 < c.eqB3 && c.Fmax > p.Bb && c.Fmax < p.F - 50 && c.npv > 5 && c.dEq < 0 && p.F2 < p.Ag && p.F2 >= p.Ab + p.Yb) return p;
      }
    },
    calc(p) {
      const g = p.q, b = 1 - p.q, dv = 1 + p.r;
      const EA = g * p.Ag + b * p.Ab, EB = g * p.Bg + b * p.Bb;
      const debt = (Vg, Vb, F) => (g * Math.min(F, Vg) + b * Math.min(F, Vb)) / dv, eq = (Vg, Vb, F) => (g * Math.max(Vg - F, 0) + b * Math.max(Vb - F, 0)) / dv;
      const dA = debt(p.Ag, p.Ab, p.F), eqA = eq(p.Ag, p.Ab, p.F), dB = debt(p.Bg, p.Bb, p.F), eqB = eq(p.Bg, p.Bb, p.F);
      const agency = EA / dv - EB / dv, F3 = (p.R * dv - b * p.Bb) / g, eqA3 = eq(p.Ag, p.Ab, F3), eqB3 = eq(p.Bg, p.Bb, F3), yld = F3 / p.R - 1;
      const Fmax = (EA - g * p.Bg) / b;
      const npv = (g * p.Yg + b * p.Yb) / dv - p.K, dEq = g * p.Yg / dv - p.K, dDebt = b * p.Yb / dv;
      return { EA, EB, dA, eqA, dB, eqB, agency, F3, eqA3, eqB3, yld, Fmax, npv, dEq, dDebt };
    },
    body: (p) => `<p>제조업체 ㈜태광소재는 1년 후 만기가 돌아오는 무이표 부채가 있으며, 경영진은 주주의 이익을 대변한다. 회사는 이번 달에 신규 공장의 설계를 확정해야 하는데, 설계에 따라 사업의 위험이 크게 달라진다. 설계안 A는 검증된 공법을 쓰는 안이고, 설계안 B는 신기술을 쓰는 안으로 성공하면 수익이 크지만 실패하면 자산가치 대부분이 사라진다. 채권자는 공시된 재무제표만으로는 경영진이 어느 안을 택했는지 알 수 없고, 계약서에도 관련 제한 조항이 없다.</p>`
      + `<p>모든 투자자는 위험중립적이고 무위험이자율은 연 ${pc(p.r)}이다. 1년 후 경기는 호황 또는 불황 중 하나이며, 호황의 확률은 ${pc(p.q)}이다. 설계안에 따른 1년 후 기업 자산가치는 다음과 같다(금액 단위 억원). 법인세와 파산비용은 없다.</p>`
      + tbl(['구분', '호황', '불황'], [['설계안 A', fmt(p.Ag), fmt(p.Ab)], ['설계안 B', fmt(p.Bg), fmt(p.Bb)]])
      + `<p><b>[상황 1] 기존 부채</b></p><p>이미 발행된 부채의 만기 상환액(액면)은 ${fmt(p.F)}억원이다. 주주는 설계안을 결정한 뒤 현재 가치가 더 큰 쪽을 택한다.</p>`
      + `<p><b>[상황 2] 부채를 새로 조달하는 경우</b></p><p>상황 1과 별개로, 기존 부채가 없는 상태에서 회사가 설계안 결정 전에 신규 무이표 부채로 ${fmt(p.R)}억원을 조달한다고 하자. 채권자는 합리적이어서 주주가 택할 설계안을 예상해 액면을 요구한다. 또한 회사는 설계안 선택을 왜곡하지 않는 부채 한도도 함께 검토하고 있다.</p>`
      + `<p><b>[상황 3] 과소투자</b></p><p>상황 1, 2와 별개로, 회사가 설계안 A를 이미 실행하였고 기존 부채의 액면이 ${fmt(p.F2)}억원인 경우를 생각하자. 회사는 현재 ${fmt(p.K)}억원을 투자하면 1년 후 자산가치가 호황에 ${fmt(p.Yg)}억원, 불황에 ${fmt(p.Yb)}억원 더 커지는 기회를 얻었다. 이 투자금은 기존 주주가 전액 부담해야 한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '[상황 1] 설계안 A를 택할 때 자기자본의 현재 가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.eqA, sol: (p, c) => `[${pc(p.q)}×(${fmt(p.Ag)}−${fmt(p.F)}) + ${pc(1 - p.q)}×max(${fmt(p.Ab)}−${fmt(p.F)}, 0)] / (1+${pc(p.r)}) = <b>${fmt(c.eqA, 2)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '[상황 1] 설계안 B를 택할 때 자기자본의 현재 가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.eqB, sol: (p, c) => `[${pc(p.q)}×(${fmt(p.Bg)}−${fmt(p.F)}) + ${pc(1 - p.q)}×0] / (1+${pc(p.r)}) = <b>${fmt(c.eqB, 2)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '[상황 1] 설계안 B를 택할 때 채권의 현재 가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.dB, sol: (p, c) => `[${pc(p.q)}×${fmt(p.F)} + ${pc(1 - p.q)}×${fmt(p.Bb)}] / (1+${pc(p.r)}) = <b>${fmt(c.dB, 2)}</b> (A를 택할 때 ${fmt(c.dA, 2)})` },
      { lab: '물음 1 ④', type: 'num', text: '[상황 1] 주주가 설계안 B를 택해 생기는 기업가치 감소분(위험 전이의 대리비용)을 구하시오.', unit: '억원', dp: 2, ans: c => c.agency, sol: (p, c) => `(${fmt(c.EA, 2)} − ${fmt(c.EB, 2)}) / (1+${pc(p.r)}) = <b>${fmt(c.agency, 2)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '[상황 2] 합리적 채권자가 요구하는 만기 상환액을 구하시오.', unit: '억원', dp: 2, ans: c => c.F3, sol: (p, c) => `채권자는 주주가 B를 택할 것으로 예상: ${pc(p.q)}F + ${pc(1 - p.q)}×${fmt(p.Bb)} = ${fmt(p.R)}×(1+${pc(p.r)})<br>F = <b>${fmt(c.F3, 2)}</b> (이때 주주 가치 A ${fmt(c.eqA3, 2)} &lt; B ${fmt(c.eqB3, 2)}이므로 예상이 맞음)` },
      { lab: '물음 2 ②', type: 'num', text: '[상황 2] 이 부채의 약정 이자율을 구하시오.', unit: '%', dp: 2, ans: c => c.yld * 100, sol: (p, c) => `${fmt(c.F3, 2)}/${fmt(p.R)} − 1 = <b>${p2(c.yld)}</b>` },
      { lab: '물음 2 ③', type: 'num', text: '주주가 설계안 A를 스스로 선택하도록 하는 최대 액면을 구하시오. (단, 답은 설계안 B의 불황 자산가치와 설계안 A의 불황 자산가치 사이에 있다.)', unit: '억원', dp: 2, ans: c => c.Fmax, sol: (p, c) => `A: E(A)−F ≥ B: ${pc(p.q)}×(${fmt(p.Bg)}−F)<br>F ≤ (${fmt(c.EA, 2)} − ${pc(p.q)}×${fmt(p.Bg)}) / ${pc(1 - p.q)} = <b>${fmt(c.Fmax, 2)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '[상황 3] 이 투자 기회의 순현재가치(기업 전체)를 구하시오.', unit: '억원', dp: 2, ans: c => c.npv, sol: (p, c) => `[${pc(p.q)}×${fmt(p.Yg)} + ${pc(1 - p.q)}×${fmt(p.Yb)}]/(1+${pc(p.r)}) − ${fmt(p.K)} = <b>${fmt(c.npv, 2)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '[상황 3] 투자를 실행할 때 기존 주주의 부의 변화를 구하시오. (손실이면 음수)', unit: '억원', dp: 2, ans: c => c.dEq, sol: (p, c) => `불황에는 증가분이 모두 채권자에게 가므로 ${pc(p.q)}×${fmt(p.Yg)}/(1+${pc(p.r)}) − ${fmt(p.K)} = <b>${fmt(c.dEq, 2)}</b> → 주주는 거부` },
      { lab: '물음 3 ③', type: 'num', text: '[상황 3] 투자를 실행할 때 채권자의 부의 변화를 구하시오.', unit: '억원', dp: 2, ans: c => c.dDebt, sol: (p, c) => `${pc(1 - p.q)}×${fmt(p.Yb)}/(1+${pc(p.r)}) = <b>${fmt(c.dDebt, 2)}</b>. 주주와 채권자 변화의 합은 NPV ${fmt(c.npv, 2)}와 같다.` },
      { lab: '물음 4', type: 'essay', text: '두 대리비용이 기업가치를 낮추는 경로를 구분하고, 이러한 비용을 줄이는 방법을 두 가지 제시하여 세 줄 이내로 서술하시오.',
        model: '위험 전이는 주주가 기업가치가 줄어도 위험한 사업을 택해 채권자의 부를 빼앗는 경우이고, 과소투자는 NPV가 양수여도 이득이 채권자에게 가므로 주주가 투자를 거부하는 경우이다. 재무제한조항, 전환사채, 만기 단축, 담보 설정, 부채 축소 등으로 이 비용을 줄일 수 있다.',
        kw: ['위험 전이', '과소투자', '재무제한조항', '전환사채', '만기', '담보'] },
    ],
  }));

  /* ───────── 그림·풀이 근거 (해설을 펼칠 때 표시) ───────── */
  const X_ = id => P.find(d => d.id === id);

  X_('cb-x-wacc').explain = (p, c) => {
    const direct = -c.out + Array.from({ length: p.n }, (_, i) => (c.ocf + (i === p.n - 1 ? c.term : 0)) / (1 + c.wacc) ** (i + 1)).reduce((a, b) => a + b, 0);
    return tl({ n: p.n, flows: [[0, `−${f1(c.out)}`, -1], ...Array.from({ length: p.n - 1 }, (_, i) => [i + 1, f1(c.ocf), 1]), [p.n, f1(c.ocf + c.term), 1]], cap: `증분 현금흐름(억원): 현재 유출 ${fmt(c.out, 2)}, 매년 영업현금흐름 ${fmt(c.ocf, 2)}, 마지막 해에 회수액 ${fmt(c.term, 2)} 추가` })
      + tree({ cols: ['t=0', 't=2'], nodes: [
          { c: 0, r: 0, t: [`옵션 ${f1(c.opt)}`, `NPV ${f1(c.npv)}`] },
          { c: 1, r: -1, t: [`호황 ${fmt(p.VH)}`, `행사 +${fmt(p.VH - p.I2)}`], hi: 1 },
          { c: 1, r: 1, t: [`불황 ${fmt(p.VL)}`, '포기 0'] }],
        edges: [[0, 1, `q ${p.q}`], [0, 2, `1−q ${(1 - p.q).toFixed(2)}`]],
        cap: '확장옵션: 2년 후 호황에서만 행사한다. 위험중립확률로 기댓값을 구해 무위험이자율로 할인한다.' })
      + basis([
        ['할인율', '자금 조달 주체가 아니라 투자안의 영업위험이 할인율을 정한다. 대용기업 베타에서 재무위험을 빼고(언레버), 목표 자본구조로 다시 반영한다(리레버).'],
        ['현금흐름', '매몰원가는 제외하고, 토지의 세후 처분가치와 기존 사업 잠식액은 기회비용으로 포함한다.'],
        ['실물옵션', '확장 여부를 정보가 나온 뒤 결정할 수 있어 하방이 0으로 제한된다. 옵션 가치 때문에 음(−)의 기본 NPV 사업도 채택될 수 있다.'],
        ['검산', `연도별 직접 합산 NPV ${fmt(direct, 2)} = 답 ${fmt(c.npv, 2)} ${ok(direct, c.npv)}`],
      ]);
  };

  X_('cb-x-infl').explain = (p, c) => {
    const yr = (I, n, s, S) => -I + Array.from({ length: n }, (_, k) => { const t = k + 1; return (s * (1 + p.i) ** t * (1 - p.t) + p.t * I / n + (t === n ? S * (1 + p.i) ** n * (1 - p.t) : 0)) / (1 + p.kn) ** t; }).reduce((a, b) => a + b, 0);
    const da = yr(p.Ia, p.na, p.sa, p.Sa), db = yr(p.Ib, p.nb, p.sb, p.Sb);
    const eaaOf = I => (yr(I, p.na, p.sa, p.Sa)) / c.a.A, I0 = p.Ia * 0.8, I1 = Math.max(c.Imax, p.Ia) * 1.15, y0 = Math.min(eaaOf(I1), c.eaab) * 0.8, y1 = eaaOf(I0) * 1.05;
    return chart({ xs: [I0, I1], ys: [y0, y1], xl: '설비 A의 취득원가(억원)', yl: '실질 연간균등가치(억원)', yt: [[c.eaab, f1(c.eaab)], [c.eaaa, f1(c.eaaa)]],
        vl: [[p.Ia, `현재 ${fmt(p.Ia)}`, 0], [c.Imax, `무차별 ${fmt(c.Imax, 1)}`, 1]],
        series: [{ pts: [[I0, eaaOf(I0)], [I1, eaaOf(I1)]], cls: 's1' }, { pts: [[I0, c.eaab], [I1, c.eaab]], cls: 's2 sd' }],
        pt: [[p.Ia, c.eaaa, 'A', 'start'], [c.Imax, c.eaab, '', 'start']],
        cap: '설비 A의 연간균등가치는 취득원가가 오를수록 줄어든다. 설비 B의 값(점선)과 만나는 지점이 무차별 취득원가이다.' })
      + tl({ n: p.na, flows: [[0, `−${fmt(p.Ia)}`, -1], ...Array.from({ length: p.na }, (_, k) => [k + 1, f1(p.sa * (1 + p.i) ** (k + 1) * (1 - p.t) + p.t * p.Ia / p.na + (k + 1 === p.na ? p.Sa * (1 + p.i) ** p.na * (1 - p.t) : 0)), 1])], cap: '설비 A의 세후 명목 현금흐름(억원): 절감액은 물가만큼 커지고, 감가상각 절세액은 고정된다.' })
      + basis([
        ['일관성', '명목 현금흐름은 명목 할인율로, 실질 현금흐름은 실질 할인율로 할인한다. 물가와 함께 오르는 절감액·처분가치는 실질로, 고정된 감가상각 절세액은 명목으로 계산할 수 있다.'],
        ['수명 비교', '재구입 원가가 물가만큼 오르면 동일 설비 반복의 가치는 실질 연금으로 비교해야 한다.'],
        ['검산', `명목 현금흐름 직접 할인: A ${fmt(da, 2)} ${ok(da, c.npva)}, B ${fmt(db, 2)} ${ok(db, c.npvb)}`],
      ]);
  };

  X_('pf-x-tb').explain = (p, c) => {
    const xM = p.sm, xP = c.sP, x1 = Math.max(xM, xP) * 1.25, y1 = c.sh * x1;
    return chart({ xs: [0, x1], ys: [0, y1], xl: '표준편차', yl: '기대초과수익률', yt: [[p.mrp, p2(p.mrp)], [c.er, p2(c.er)]], xt: [[xM, p2(xM)], [xP, p2(xP)]],
        series: [{ pts: [[0, 0], [x1, c.shM * x1]], cls: 's2 sd', lab: [x1 * 0.62, c.shM * x1 * 0.5, `시장 샤프 ${f4(c.shM)}`, 'start'] }, { pts: [[0, 0], [x1, y1]], cls: 's1', lab: [x1 * 0.42, y1 * 0.82, `최적 샤프 ${f4(c.sh)}`, 'end'] }],
        pt: [[xM, p.mrp, 'M', 'start'], [xP, c.er, 'P', 'end']],
        cap: '능동적 포트폴리오를 섞으면 자본배분선의 기울기가 시장보다 커진다. 개선 폭은 정보비율이 결정한다.' })
      + basis([
        ['종목 비중', '단일지수모형에서 잔차가 독립이면 비중은 α<sub>i</sub>/σ²(e<sub>i</sub>)에 비례한다. 음의 알파 종목은 공매도하므로 양의 알파 종목 비중이 100%를 넘을 수 있다.'],
        ['베타 조정', '능동적 포트폴리오의 베타가 1이 아니면 시장 위험을 함께 바꾸므로 w₀를 w*로 조정한다.'],
        ['자본배분', '최적 위험 포트폴리오를 정한 뒤 효용을 최대로 하는 위험자산 비중은 y* = E(초과수익률)/(A·σ²)이다.'],
        ['검산', `S²(P) = S²(M) + IR²: ${f4(c.sh ** 2)} = ${f4(c.shM ** 2)} + ${f4(c.IR2)} ${ok(c.sh ** 2, c.shM ** 2 + c.IR2, 1e-6)}`],
      ]);
  };

  X_('pf-x-apt').explain = (p, c) => {
    const f0 = -0.05, f1x = 0.05, D = f => p.ed + p.bd1 * f, Rp = f => c.eq + p.bd1 * f, y0 = Math.min(D(f0), Rp(f0)), y1 = Math.max(D(f1x), Rp(f1x));
    const repB1 = c.wa * p.ba1 + c.wb * p.bb1 + c.wc * p.bc1, repB2 = c.wa * p.ba2 + c.wb * p.bb2 + c.wc * p.bc2, repE = c.wa * c.ea + c.wb * c.eb + c.wc * c.ec;
    return chart({ xs: [f0, f1x], ys: [y0, y1], xl: '요인 1 충격 F₁ (F₂ = 0)', yl: '실현수익률', yt: [[y0, p2(y0)], [y1, p2(y1)]], xt: [[f0, '−5%'], [0, '0'], [f1x, '+5%']],
        series: [{ pts: [[f0, D(f0)], [f1x, D(f1x)]], cls: 's1', lab: [0.012, D(0.012) + (c.under ? (y1 - y0) * 0.07 : -(y1 - y0) * 0.07), 'D', 'start'] }, { pts: [[f0, Rp(f0)], [f1x, Rp(f1x)]], cls: 's2 sd', lab: [0.012, Rp(0.012) + (c.under ? -(y1 - y0) * 0.09 : (y1 - y0) * 0.09), '복제', 'start'] }],
        cap: `D와 복제 포트폴리오는 요인 민감도가 같아 충격이 어떻든 평행하게 움직인다. 두 선의 간격 ${p2(Math.abs(c.gap))}가 무위험 차익이다.` })
      + basis([
        ['APT 조건', '잘 분산된 포트폴리오는 잔차 위험이 없으므로 민감도가 같으면 기대수익률도 같아야 한다. 다르면 무위험 차익이 생긴다.'],
        ['복제', '비중 합이 1이고 두 요인 민감도가 D와 같아지도록 연립방정식을 푼다. 음수 비중은 공매도를 뜻한다.'],
        ['개별 주식', '잔차 위험이 남아 무위험이 아니다. 잔차가 독립이면 동일 비중 N종목의 잔차 표준편차는 σ/√N으로 줄어든다.'],
        ['검산', `복제 민감도 (${f4(repB1)}, ${f4(repB2)}) = D ${ok(repB1, p.bd1)}${ok(repB2, p.bd2)}, 복제 기대수익률 ${p2(repE)} = 균형값 ${ok(repE, c.eq)}`],
      ]);
  };

  X_('cf-x-miller').explain = (p, c) => {
    const dm = p.Ds[p.Ds.length - 1], top = c.Vu + p.t * dm, vals = p.Ds.map((d, i) => [d, c.Vu + c.nets[i]]), lo = Math.min(c.Vu, ...vals.map(v => v[1]));
    const niKe = (p.E - p.rd * p.D) * (1 - p.t) / c.EqAfter, ident = p.rho * (1 - p.t * p.D / c.VL);
    return chart({ xs: [0, dm], ys: [lo * 0.98, top * 1.01], xl: '부채(억원)', yl: '기업가치(억원)', yt: [[c.Vu, f1(c.Vu)], [top, f1(top)]], xt: p.Ds.map(d => [d, fmt(d)]),
        series: [{ pts: [[0, c.Vu], [dm, top]], cls: 's2 sd', lab: [dm * 0.45, c.Vu + p.t * dm * 0.62, 'MM(1963)', 'end'] }, { pts: [[0, c.Vu], [dm, c.Vu + c.gain * dm]], cls: 's3 sd', lab: [dm * 0.86, c.Vu + c.gain * dm * 0.98, 'Miller', 'end'] }, { pts: [[0, c.Vu], ...vals], cls: 's1' }],
        pt: [[c.Dbest, c.Vbest, `최적 ${fmt(c.Dbest)}`, 'end']],
        cap: '법인세만 보면(MM 1963) 부채가 많을수록 좋지만, 개인세를 넣으면 기울기가 작아지고(Miller), 곤경비용까지 빼면 내부에 최적 부채가 생긴다(실선).' })
      + basis([
        ['MM(1963)', 'V<sub>L</sub> = V<sub>U</sub> + t·D. 공시 즉시 절세효과가 주가에 반영되므로 공시 후 주가로 자사주를 사면 남은 주주의 주가도 그대로 유지된다.'],
        ['Miller(1977)', '부채 1원의 이득은 1 − (1−t<sub>c</sub>)(1−t<sub>e</sub>)/(1−t<sub>d</sub>)이다. 이자소득세가 높으면 투자자가 세전 수익을 더 요구해 법인세 효과가 줄어든다.'],
        ['상충이론', '한계 절세 이득과 한계 곤경비용이 같아지는 곳에서 기업가치가 최대가 된다.'],
        ['검산', `자기자본비용(순이익/S) ${p2(niKe)} ${ok(niKe, c.ke)}, WACC = ρ(1−t·D/V) ${p2(ident)} ${ok(ident, c.wacc)}, 잔여 주식×주가 = 자기자본 ${ok(c.left * c.px / 1e8, c.EqAfter)}`],
      ]);
  };

  X_('cf-x-agency').explain = (p, c) => {
    const g = p.q, b = 1 - p.q, dv = 1 + p.r, eq = (Vg, Vb, F) => (g * Math.max(Vg - F, 0) + b * Math.max(Vb - F, 0)) / dv;
    const F0 = p.Bb, F1 = p.Ab, ptsA = [F0, c.Fmax, F1].map(F => [F, eq(p.Ag, p.Ab, F)]), ptsB = [F0, c.Fmax, F1].map(F => [F, eq(p.Bg, p.Bb, F)]);
    const hi = Math.max(ptsA[0][1], ptsB[0][1]) * 1.05, lo = Math.min(ptsA[2][1], ptsB[2][1]) * 0.9, sumA = c.dA + c.eqA;
    return chart({ xs: [F0, F1], ys: [lo, hi], xl: '부채 액면(억원)', yl: '자기자본 가치(억원)', yt: [[lo, f1(lo)], [hi, f1(hi)]], xt: [[F0, fmt(F0)], [F1, fmt(F1)]],
        vl: [[c.Fmax, `한도 ${fmt(c.Fmax, 1)}`, 0]],
        series: [{ pts: ptsA, cls: 's1', lab: [F0 + (F1 - F0) * 0.62, eq(p.Ag, p.Ab, F0 + (F1 - F0) * 0.62) - (hi - lo) * 0.1, '설계안 A', 'end'] }, { pts: ptsB, cls: 's2', lab: [F0 + (F1 - F0) * 0.72, ptsB[2][1] + (hi - lo) * 0.08, '설계안 B', 'start'] }],
        pt: [[c.Fmax, eq(p.Ag, p.Ab, c.Fmax), '', 'start']],
        cap: '액면이 커질수록 설계안 A의 자기자본 가치가 더 빨리 줄어든다. 한도를 넘으면 주주는 기업가치가 낮은 설계안 B를 택한다.' })
      + tree({ cols: ['t=0', 't=1'], nodes: [
          { c: 0, r: 0, t: ['상황 3', `투자 ${fmt(p.K)}`] },
          { c: 1, r: -1, t: [`호황 +${fmt(p.Yg)}`, '전액 주주 귀속'], hi: 1 },
          { c: 1, r: 1, t: [`불황 +${fmt(p.Yb)}`, '전액 채권자 귀속'] }],
        edges: [[0, 1, `${p.q}`], [0, 2, `${(1 - p.q).toFixed(1)}`]],
        cap: `과소투자: 주주가 ${fmt(p.K)}억원을 모두 내지만 불황의 증가분은 채권자에게 간다. 주주 부의 변화가 음수이면 NPV가 양수여도 거부한다.` })
      + basis([
        ['위험 전이', '주주의 지분은 기업가치에 대한 콜옵션과 같아 변동성이 커질수록 유리하다. 기업가치가 낮아져도 채권자에게 손실을 넘길 수 있다.'],
        ['합리적 채권자', '채권자는 주주의 선택을 예상해 액면을 높이므로, 대리비용은 결국 사전에 주주가 부담한다.'],
        ['과소투자', '기존 부채가 많으면 투자 이득의 일부가 채권자에게 돌아가 주주는 NPV가 양수인 투자도 거부한다(Myers, 1977).'],
        ['검산', `A의 채권 + 자기자본 ${fmt(sumA, 2)} = 기업가치 ${fmt(c.EA / dv, 2)} ${ok(sumA, c.EA / dv)}, 주주 변화 + 채권자 변화 = NPV ${ok(c.dEq + c.dDebt, c.npv)}`],
      ]);
  };
})();
