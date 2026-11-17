/* 실전형 변형 문제 (2) — 금감원 공개 기출 10개년(2017~2026)의 출제 경향을 참고해 새로 만든 문제.
 * 기출 원문을 옮기지 않았고, 상황·숫자·물음 조합을 새로 구성했다. 형식은 problems.js와 같다.
 */
(function () {
  'use strict';
  const { fmt, pc, pvif, pvifa, r4, tbl, ul, root, s2 } = window.FM_UTIL;
  const P = window.FM_PROBLEMS;
  const pct2 = x => (x * 100).toFixed(2) + '%';
  // 표준정규 누적분포 (Abramowitz-Stegun 7.1.26)
  const ncdf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? (1 + y) / 2 : (1 - y) / 2; };

  /* ───────── 자본예산 ───────── */
  P.push({
    id: 'cb-apv', unit: 'cb', pts: 15, real: true, title: '조정현재가치(APV)와 정책자금 대출의 가치',
    trend: '2018 문1 (WACC·APV, 이자 절세효과) · 2024 문1 (정책자금 대출)',
    p: { I: 1000, n: 4, C: 340, t: 0.25, rho: 0.12, L: 500, rs: 0.02, rd: 0.06 },
    vary(R) {
      for (;;) {
        const I = R.int(600, 2000, 100), n = R.pick([3, 4, 5]), t = R.pick([0.2, 0.22, 0.25]), rho = R.f(0.1, 0.15, 0.01), rd = R.f(0.04, 0.08, 0.005);
        const A = r4(pvifa(rho, n)), target = -I * R.f(0.01, 0.08, 0.01);
        const C = Math.round(((I + target) / A - t * I / n) / (1 - t));
        const p = { I, n, C, t, rho, L: R.int(Math.round(I * 0.2 / 50) * 50, Math.round(I * 0.8 / 50) * 50, 50), rs: R.f(0, rd - 0.02, 0.005), rd };
        const c = this.calc(p);
        if (c.npv0 < 0 && c.apv > 0 && c.Lmin < p.L) return p;
      }
    },
    calc(p) {
      const dep = p.I / p.n, ocf = p.C * (1 - p.t) + p.t * dep;
      const A = r4(pvifa(p.rho, p.n)), Ad = r4(pvifa(p.rd, p.n)), Fd = r4(pvif(p.rd, p.n));
      const npv0 = -p.I + ocf * A, per = 1 - p.rs * (1 - p.t) * Ad - Fd;
      return { dep, ocf, A, Ad, Fd, npv0, per, npvf: p.L * per, apv: npv0 + p.L * per, Lmin: -npv0 / per };
    },
    body: (p, c) => `<p>무부채기업 ㈜하늘에너지는 친환경 설비 투자를 검토하고 있다. 금액 단위는 억원이다.</p>` + ul([
      `설비 구입비 ${fmt(p.I)}억원은 현재(t=0) 지출하며, 내용연수 ${p.n}년·잔존가치 0으로 정액상각한다.`,
      `설비로 인해 매년 말 ${p.n}년 동안 세전 영업현금흐름(매출 − 현금비용) ${fmt(p.C)}억원이 발생한다.`,
      `법인세율은 ${pc(p.t)}, 무부채 상태의 자본비용은 ${pc(p.rho)}이며, 절세효과는 항상 누릴 수 있다.`,
      `정부는 이 설비 투자에 대해 연 ${pc(p.rs)}의 정책자금 대출(현재 차입, 매년 말 이자 지급, ${p.n}년 후 원금 일시상환)을 제공한다. 같은 위험의 시장 차입이자율은 ${pc(p.rd)}이다.`,
      `대출과 관련된 현금흐름(이자 절세효과 포함)은 시장 차입이자율로 할인한다.`,
    ]) + tbl(['구분', `n=${p.n}`], [[`PVIFA(${pc(p.rho)}, n)`, c.A.toFixed(4)], [`PVIFA(${pc(p.rd)}, n)`, c.Ad.toFixed(4)], [`PVIF(${pc(p.rd)}, n)`, c.Fd.toFixed(4)]]),
    qs: [
      { lab: '물음 1', type: 'num', text: '무부채를 가정한 기본 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.npv0,
        sol: (p, c) => `OCF = ${fmt(p.C)}×(1−${p.t}) + ${p.t}×${fmt(c.dep, 2)} = ${fmt(c.ocf, 2)}<br>기본 NPV = −${fmt(p.I)} + ${fmt(c.ocf, 2)}×${c.A} = <b>${c.npv0.toFixed(4)}</b>` },
      { lab: '물음 2 ①', type: 'num', textf: p => `정책자금 ${fmt(p.L)}억원을 차입할 때 자금조달의 순현가(NPVF)를 구하시오.`, unit: '억원', dp: 2, ans: c => c.npvf,
        sol: (p, c) => `NPVF = ${fmt(p.L)} − ${fmt(p.L)}×${p.rs}×(1−${p.t})×${c.Ad} − ${fmt(p.L)}×${c.Fd} = <b>${c.npvf.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '이 경우 투자안의 조정현재가치(APV)를 구하시오.', unit: '억원', dp: 2, ans: c => c.apv,
        sol: (p, c) => `APV = ${c.npv0.toFixed(2)} + ${c.npvf.toFixed(2)} = <b>${c.apv.toFixed(4)}</b>` },
      { lab: '물음 3', type: 'num', text: 'APV가 0 이상이 되기 위해 필요한 정책자금 대출의 최소 금액을 구하시오.', unit: '억원', dp: 2, ans: c => c.Lmin,
        sol: (p, c) => `대출 1억원당 NPVF = 1 − ${p.rs}×(1−${p.t})×${c.Ad} − ${c.Fd} = ${c.per.toFixed(6)}<br>L = ${(-c.npv0).toFixed(4)} / ${c.per.toFixed(6)} = <b>${c.Lmin.toFixed(4)}</b>` },
      { lab: '물음 4', type: 'essay', text: '이 투자안처럼 차입 금액과 조건이 미리 정해진 경우, WACC법보다 APV법이 적합한 이유를 세 줄 이내로 설명하시오.',
        model: 'WACC법은 목표 부채비율이 일정하게 유지된다고 가정해 자금조달 효과를 할인율에 섞는다. 차입 금액이 고정되거나 정책자금처럼 보조금 성격의 조달이 있으면 부채비율이 변하므로, 사업가치와 자금조달 효과를 분리해 각각 적절한 할인율로 평가하는 APV법이 정확하다.',
        kw: ['부채비율', '고정', '분리', '보조금', '할인율'] },
    ],
  });

  P.push({
    id: 'cb-ceq', unit: 'cb', pts: 15, real: true, title: '확실성등가법과 위험조정할인율법의 일치',
    trend: '2020 문1·2024 문3 (확실성등가, 현금흐름 베타)',
    p: { rf: 0.05, Em: 0.12, vM: 0.04, A: { I: 1000, E: 1300, cov: 40 }, B: { I: 1100, E: 1350, cov: 20 } },
    vary(R) {
      for (;;) {
        const rf = R.f(0.02, 0.06, 0.005), mk = () => { const I = R.int(800, 1500, 100); return { I, E: Math.round(I * R.f(1.15, 1.4, 0.01) / 10) * 10, cov: R.int(10, 80, 5) }; };
        const p = { rf, Em: rf + R.f(0.04, 0.09, 0.005), vM: R.f(0.02, 0.06, 0.005), A: mk(), B: mk() }, c = this.calc(p);
        if (c.A.npv > 0 && c.B.npv > 0 && Math.abs(c.A.npv - c.B.npv) > 2) return p;
      }
    },
    calc(p) {
      const lam = (p.Em - p.rf) / p.vM;
      const one = o => { const ceq = o.E - lam * o.cov, pv = ceq / (1 + p.rf), beta = o.cov / (pv * p.vM), k = p.rf + beta * (p.Em - p.rf); return { ceq, pv, beta, k, npv: pv - o.I }; };
      return { lam, A: one(p.A), B: one(p.B) };
    },
    body: p => `<p>CAPM이 성립하는 시장에서 ㈜서진은 투자기간 1년인 상호배타적 투자안 A와 B를 검토하고 있다. 초기투자액은 기초에 지출되고 현금흐름은 기말에 한 번 발생한다. 시장포트폴리오의 기대수익률은 <b>${pc(p.Em)}</b>, 수익률 분산은 <b>${p.vM.toFixed(3)}</b>, 무위험이자율은 <b>${pc(p.rf)}</b>이다.</p>`
      + tbl(['투자안', '초기투자액', '기대현금흐름 E(CF)', 'Cov(CF, R<sub>M</sub>)'], [['A', fmt(p.A.I), fmt(p.A.E), fmt(p.A.cov)], ['B', fmt(p.B.I), fmt(p.B.E), fmt(p.B.cov)]])
      + `<p>금액 단위는 만원이다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '시장위험(분산) 1단위에 대한 위험프리미엄 λ를 구하시오.', unit: '', dp: 4, ans: c => c.lam,
        sol: (p, c) => `(${pc(p.Em)} − ${pc(p.rf)}) / ${p.vM} = <b>${c.lam.toFixed(6)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '투자안 A의 확실성등가액(CEQ)을 구하시오.', unit: '만원', dp: 2, ans: c => c.A.ceq,
        sol: (p, c) => `${fmt(p.A.E)} − ${c.lam.toFixed(4)}×${p.A.cov} = <b>${c.A.ceq.toFixed(4)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '확실성등가법으로 투자안 A의 NPV를 구하시오.', unit: '만원', dp: 2, ans: c => c.A.npv,
        sol: (p, c) => `${c.A.ceq.toFixed(4)}/${(1 + p.rf).toFixed(3)} − ${fmt(p.A.I)} = <b>${c.A.npv.toFixed(4)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '투자안 A의 (수익률) 베타를 구하시오.', unit: '', dp: 4, ans: c => c.A.beta,
        sol: (p, c) => `PV = ${c.A.pv.toFixed(4)}, β = ${p.A.cov}/(${c.A.pv.toFixed(4)}×${p.vM}) = <b>${c.A.beta.toFixed(6)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '투자안 A의 위험조정할인율을 구하시오.', unit: '%', dp: 2, ans: c => c.A.k * 100,
        sol: (p, c) => `${pc(p.rf)} + ${c.A.beta.toFixed(4)}×${pc(p.Em - p.rf)} = <b>${(c.A.k * 100).toFixed(4)}%</b> → ${fmt(p.A.E)}/(1+k) − ${fmt(p.A.I)} = ${c.A.npv.toFixed(2)}로 확실성등가법과 같다` },
      { lab: '물음 3', type: 'choice', text: 'NPV 기준으로 선택해야 하는 투자안은?', opts: ['투자안 A', '투자안 B'], ans: c => (c.A.npv >= c.B.npv ? 0 : 1),
        sol: (p, c) => `NPV_A = ${c.A.npv.toFixed(2)}, NPV_B = ${c.B.ceq.toFixed(2)}/${(1 + p.rf).toFixed(3)} − ${fmt(p.B.I)} = ${c.B.npv.toFixed(2)}` },
      { lab: '물음 4', type: 'essay', text: '불확실성 하의 자본예산에서 확실성등가법과 위험조정할인율법의 공통점과 차이점을 세 줄 이내로 설명하시오.',
        model: '두 방법 모두 위험을 반영해 현재가치를 구하며 같은 가정에서 결과가 일치한다. 확실성등가법은 위험을 현금흐름(분자)에서 차감하고 무위험이자율로 할인하는 반면, 위험조정할인율법은 위험을 할인율(분모)에 가산한다. 위험조정할인율을 여러 기간에 일정하게 쓰면 먼 미래일수록 위험이 기하급수적으로 커진다는 가정이 숨어 있다.',
        kw: ['분자', '분모', '무위험이자율', '할인율', '일치'] },
    ],
  });

  P.push({
    id: 'cb-realopt', unit: 'cb', pts: 10, real: true, title: '투자 연기 옵션의 가치와 즉시 투자 조건',
    trend: '2018 문2·2022 문3 (실물옵션, 연기)',
    p: { I0: 250, I1: 300, q: 0.6, CH: 40, CL: 5, k: 0.1 },
    vary(R) {
      for (;;) {
        const k = R.f(0.08, 0.15, 0.01), CH = R.int(20, 60, 2), CL = R.int(0, Math.floor(CH * 0.4), 1), q = R.f(0.4, 0.75, 0.05);
        const I1 = Math.round(CH / k * R.f(0.6, 0.9, 0.05) / 10) * 10, I0 = Math.round((q * CH + (1 - q) * CL) / k * R.f(0.85, 1.0, 0.01) / 10) * 10;
        const p = { I0, I1, q, CH, CL, k }, c = this.calc(p);
        if (CL / k < I1 && c.opt > 0.5 && c.pStar > q + 0.02 && c.pStar < 0.98 && c.now > -I0) return p;
      }
    },
    calc(p) {
      const now = -p.I0 + (p.q * p.CH + (1 - p.q) * p.CL) / p.k;
      const vH = p.CH / p.k - p.I1, vL = p.CL / p.k - p.I1;
      const wait = (p.q * Math.max(vH, 0) + (1 - p.q) * Math.max(vL, 0)) / (1 + p.k);
      const pStar = (p.I0 - p.CL / p.k) / ((p.CH - p.CL) / p.k - vH / (1 + p.k));
      return { now, vH, vL, wait, opt: Math.max(wait - now, 0), pStar };
    },
    body: p => `<p>㈜온누리는 신제품 생산공장 건설을 검토하고 있다. 1년 후(t=1)에 시장 수요가 <b>호황</b>(확률 ${pc(p.q)}) 또는 <b>불황</b>(확률 ${pc(1 - p.q)}) 중 하나로 확정된다. 금액 단위는 억원이고, 자본비용은 ${pc(p.k)}이다.</p>` + ul([
      `지금(t=0) 공장을 지으면 ${fmt(p.I0)}억원이 들고, t=1부터 매년 말 호황이면 ${fmt(p.CH)}억원, 불황이면 ${fmt(p.CL)}억원의 현금흐름이 영구히 발생한다.`,
      `1년 기다렸다가 수요를 확인한 뒤 짓기로 하면 t=1에 ${fmt(p.I1)}억원이 들고, 현금흐름은 t=2부터 같은 금액으로 영구히 발생한다. 지어도 손해인 상황에서는 짓지 않는다.`,
    ]),
    qs: [
      { lab: '물음 1', type: 'num', text: '지금 공장을 짓는 경우의 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.now,
        sol: (p, c) => `(${p.q}×${p.CH} + ${(1 - p.q).toFixed(2)}×${p.CL})/${p.k} − ${fmt(p.I0)} = <b>${c.now.toFixed(4)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '1년 연기 전략의 현재 시점 NPV를 구하시오.', unit: '억원', dp: 2, ans: c => c.wait,
        sol: (p, c) => `t=1 호황: ${p.CH}/${p.k} − ${fmt(p.I1)} = ${c.vH.toFixed(2)}, 불황: ${c.vL.toFixed(2)} → ${c.vL > 0 ? '투자' : '투자 안 함(0)'}<br>(${p.q}×${Math.max(c.vH, 0).toFixed(2)} + ${(1 - p.q).toFixed(2)}×${Math.max(c.vL, 0).toFixed(2)})/${(1 + p.k).toFixed(2)} = <b>${c.wait.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '투자를 연기할 수 있는 권리의 가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.opt,
        sol: (p, c) => `max(${c.wait.toFixed(2)} − ${c.now.toFixed(2)}, 0) = <b>${c.opt.toFixed(4)}</b>` },
      { lab: '물음 3', type: 'num', text: '다른 조건이 같을 때, 지금 짓는 것이 연기보다 유리해지는 호황 확률의 최솟값을 구하시오.', unit: '%', dp: 2, ans: c => c.pStar * 100,
        sol: (p, c) => `−${fmt(p.I0)} + [q·${p.CH} + (1−q)·${p.CL}]/${p.k} = q·${c.vH.toFixed(2)}/${(1 + p.k).toFixed(2)} → q = <b>${(c.pStar * 100).toFixed(4)}%</b>` },
    ],
  });

  P.push({
    id: 'cb-valuation', unit: 'cb', pts: 15, real: true, title: 'FCFF·FCFE 추정과 2단계 배당할인모형',
    trend: '2020 문2·2022 문1 (WACC, FCFF·FCFE, DDM)',
    p: { NI: [800, 900], int: 30, dep: 60, capex: 90, dNWC: 40, D: 1500, E: 6000, beta: 1.2, rf: 0.03, Em: 0.08, t: 0.22, sh: 1e7, pay: [0.3, 0.35, 0.4], g: 0.04 },
    vary(R) {
      for (;;) {
        const NI1 = R.int(400, 1500, 50), D = R.int(500, 3000, 100);
        const p = { NI: [NI1, Math.round(NI1 * R.f(1.03, 1.15, 0.01) / 10) * 10], int: Math.round(D * R.f(0.02, 0.06, 0.005)), dep: R.int(30, 150, 10), capex: R.int(50, 250, 10), dNWC: R.int(10, 80, 5),
          D, E: R.int(3000, 12000, 500), beta: R.f(0.7, 1.6, 0.1), rf: R.f(0.02, 0.04, 0.005), Em: 0, t: R.pick([0.2, 0.22, 0.25]), sh: R.pick([5e6, 1e7, 2e7]),
          pay: [R.f(0.2, 0.35, 0.05), R.f(0.25, 0.4, 0.05), R.f(0.35, 0.5, 0.05)], g: R.f(0.02, 0.05, 0.005) };
        p.Em = p.rf + R.f(0.04, 0.07, 0.005);
        const c = this.calc(p);
        if (c.ke - p.g > 0.025 && c.fcfe > 0) return p;
      }
    },
    calc(p) {
      const ke = p.rf + p.beta * (p.Em - p.rf), rd = p.int / p.D, V = p.D + p.E;
      const wacc = p.E / V * ke + p.D / V * rd * (1 - p.t);
      const fcff = p.NI[0] + p.int * (1 - p.t) + p.dep - p.capex - p.dNWC, fcfe = fcff - p.int * (1 - p.t);
      const d1 = p.NI[0] * p.pay[0] * 1e8 / p.sh, d2 = p.NI[1] * p.pay[1] * 1e8 / p.sh, d3 = p.NI[1] * (1 + p.g) * p.pay[2] * 1e8 / p.sh;
      const P2 = d3 / (ke - p.g), P0 = d1 / (1 + ke) + (d2 + P2) / (1 + ke) ** 2;
      return { ke, rd, wacc, fcff, fcfe, d1, d2, d3, P2, P0 };
    },
    body: (p, c) => `<p>㈜한결의 1년차(t=1) 추정 재무자료와 기타 정보는 다음과 같다. 금액 단위는 억원이다.</p>`
      + tbl(['구분', '1년차', '2년차'], [['당기순이익', fmt(p.NI[0]), fmt(p.NI[1])], ['지급이자', fmt(p.int), fmt(p.int)], ['감가상각비', fmt(p.dep), '–'], ['자본적지출', fmt(p.capex), '–'], ['순운전자본 증가액', fmt(p.dNWC), '–']])
      + ul([`부채(전액 이자부)는 ${fmt(p.D)}억원, 자기자본은 ${fmt(p.E)}억원이며 장부가치와 시장가치가 같고 차입·상환은 없다.`,
        `주식 베타 ${p.beta.toFixed(1)}, 무위험이자율 ${pc(p.rf)}, 시장포트폴리오 기대수익률 ${pc(p.Em)}, 법인세율 ${pc(p.t)}, 발행주식수 ${fmt(p.sh)}주이다. CAPM이 성립한다.`,
        `배당성향은 1년차 ${pc(p.pay[0])}, 2년차 ${pc(p.pay[1])}, 3년차부터 ${pc(p.pay[2])}이며, 3년차 순이익은 2년차보다 ${pc(p.g)} 많고 이후 배당은 매년 ${pc(p.g)}씩 영구히 성장한다.`]),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '자기자본비용을 구하시오.', unit: '%', dp: 2, ans: c => c.ke * 100, sol: (p, c) => `${pc(p.rf)} + ${p.beta.toFixed(1)}×${pc(p.Em - p.rf)} = <b>${(c.ke * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ②', type: 'num', text: '가중평균자본비용(WACC)을 구하시오.', unit: '%', dp: 2, ans: c => c.wacc * 100,
        sol: (p, c) => `kd = ${p.int}/${fmt(p.D)} = ${pc(c.rd)} → ${fmt(p.E)}/${fmt(p.D + p.E)}×${(c.ke * 100).toFixed(2)}% + ${fmt(p.D)}/${fmt(p.D + p.E)}×${(c.rd * 100).toFixed(2)}%×(1−${p.t}) = <b>${(c.wacc * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ①', type: 'num', text: '1년차 기업잉여현금흐름(FCFF)을 구하시오.', unit: '억원', dp: 2, ans: c => c.fcff,
        sol: (p, c) => `${fmt(p.NI[0])} + ${p.int}×(1−${p.t}) + ${p.dep} − ${p.capex} − ${p.dNWC} = <b>${c.fcff.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '1년차 주주잉여현금흐름(FCFE)을 구하시오.', unit: '억원', dp: 2, ans: c => c.fcfe,
        sol: (p, c) => `FCFF − 세후이자 + 순차입(0) = ${c.fcff.toFixed(2)} − ${(p.int * (1 - p.t)).toFixed(2)} = <b>${c.fcfe.toFixed(4)}</b>` },
      { lab: '물음 3', type: 'num', text: '배당할인모형으로 1주당 내재가치를 구하시오.', unit: '원', dp: 0, ans: c => c.P0,
        sol: (p, c) => `D₁ = ${fmt(c.d1, 2)}, D₂ = ${fmt(c.d2, 2)}, D₃ = ${fmt(c.d3, 2)}원, P₂ = D₃/(${(c.ke * 100).toFixed(2)}% − ${pc(p.g)}) = ${fmt(c.P2, 2)}<br>P₀ = ${fmt(c.d1, 2)}/${(1 + c.ke).toFixed(4)} + (${fmt(c.d2, 2)} + ${fmt(c.P2, 2)})/${(1 + c.ke).toFixed(4)}² = <b>${fmt(c.P0, 2)}</b>` },
      { lab: '물음 4', type: 'essay', text: 'FCFF와 FCFE로 가치를 평가할 때 각각 사용하는 할인율과 그 결과로 얻는 가치가 무엇인지 두 줄 이내로 설명하시오.',
        model: 'FCFF는 채권자와 주주 모두에게 귀속되는 현금흐름이므로 WACC로 할인해 기업가치를 구하고, 부채가치를 빼서 주주가치를 얻는다. FCFE는 주주에게만 귀속되는 현금흐름이므로 자기자본비용으로 할인해 주주가치를 직접 구한다.',
        kw: ['WACC', '자기자본비용', '기업가치', '주주가치', '부채'] },
    ],
  });

  /* ───────── 포트폴리오 성과평가 ───────── */
  P.push({
    id: 'pf-perf', unit: 'pf', pts: 15, real: true, title: '펀드 성과평가와 자산배분·종목선정 기여도',
    trend: '2017 문3·2020 문4·2019 문5 (샤프·트레이너·젠센·정보비율, 성과 분해)',
    p: { rf: 0.03, Rm: 0.1, sm: 0.18, P: { R: 0.14, s: 0.25, b: 1.2 }, Q: { R: 0.11, s: 0.14, b: 0.7 }, wb: [0.6, 0.3, 0.1], rb: [0.12, 0.05, 0.03], wp: [0.7, 0.2, 0.1], rp: [0.14, 0.06, 0.03] },
    vary(R) {
      for (;;) {
        const rf = R.f(0.01, 0.04, 0.005), sm = R.f(0.14, 0.24, 0.01);
        const f = () => ({ R: R.f(rf + 0.03, rf + 0.15, 0.005), s: R.f(0.1, 0.35, 0.01), b: R.f(0.5, 1.5, 0.1) });
        const wb0 = R.f(0.4, 0.7, 0.1), wb1 = R.f(0.1, Math.min(0.4, 0.9 - wb0), 0.1), wp0 = R.f(0.3, 0.8, 0.1), wp1 = R.f(0.1, Math.min(0.4, 0.95 - wp0), 0.05);
        const rb = [R.f(0.05, 0.15, 0.01), R.f(0.02, 0.07, 0.005), rf];
        const p = { rf, Rm: rf + R.f(0.04, 0.09, 0.005), sm, P: f(), Q: f(), wb: [wb0, wb1, +(1 - wb0 - wb1).toFixed(2)], rb, wp: [wp0, wp1, +(1 - wp0 - wp1).toFixed(2)], rp: [rb[0] + R.f(-0.02, 0.04, 0.005), rb[1] + R.f(-0.01, 0.02, 0.005), rf] };
        const c = this.calc(p);
        if (c.P.e2 > 0.0004 && c.Q.e2 > 0.0004) return p;
      }
    },
    calc(p) {
      const one = o => { const sh = (o.R - p.rf) / o.s, tr = (o.R - p.rf) / o.b, al = o.R - (p.rf + o.b * (p.Rm - p.rf)), e2 = o.s ** 2 - o.b ** 2 * p.sm ** 2; return { sh, tr, al, e2, ir: al / Math.sqrt(Math.max(e2, 1e-12)) }; };
      const alloc = p.wp.reduce((s, w, i) => s + (w - p.wb[i]) * p.rb[i], 0), sel = p.wp.reduce((s, w, i) => s + w * (p.rp[i] - p.rb[i]), 0);
      return { P: one(p.P), Q: one(p.Q), alloc, sel, Rp: p.wp.reduce((s, w, i) => s + w * p.rp[i], 0), Rb: p.wb.reduce((s, w, i) => s + w * p.rb[i], 0) };
    },
    body: p => `<p>투자자 갑은 위탁 운용 중인 펀드 P와 Q의 지난 1년 성과를 평가하려 한다. 시장포트폴리오 수익률은 <b>${pc(p.Rm)}</b>, 표준편차는 <b>${pc(p.sm)}</b>, 무위험이자율은 <b>${pc(p.rf)}</b>이다. 단일지수모형이 성립한다.</p>`
      + tbl(['펀드', '수익률', '표준편차', '베타'], [['P', pc(p.P.R), pc(p.P.s), p.P.b.toFixed(1)], ['Q', pc(p.Q.R), pc(p.Q.s), p.Q.b.toFixed(1)]])
      + `<p>펀드 P의 자산군별 투자비중·수익률과 벤치마크는 다음과 같다.</p>`
      + tbl(['자산군', '펀드 P 비중', '펀드 P 수익률', '벤치마크 비중', '벤치마크 수익률'], ['주식', '채권', '현금성자산'].map((n, i) => [n, pc(p.wp[i]), pc(p.rp[i]), pc(p.wb[i]), pc(p.rb[i])])),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '펀드 P의 샤프지수를 구하시오.', unit: '', dp: 4, ans: c => c.P.sh, sol: (p, c) => `(${pc(p.P.R)} − ${pc(p.rf)})/${pc(p.P.s)} = <b>${c.P.sh.toFixed(6)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '펀드 P의 트레이너지수를 구하시오.', unit: '', dp: 4, ans: c => c.P.tr, sol: (p, c) => `(${pc(p.P.R)} − ${pc(p.rf)})/${p.P.b.toFixed(1)} = <b>${c.P.tr.toFixed(6)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '펀드 P의 젠센 알파를 구하시오.', unit: '%', dp: 2, ans: c => c.P.al * 100, sol: (p, c) => `${pc(p.P.R)} − [${pc(p.rf)} + ${p.P.b.toFixed(1)}×${pc(p.Rm - p.rf)}] = <b>${(c.P.al * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ④', type: 'num', text: '펀드 P의 정보비율(젠센 알파 ÷ 잔차 표준편차)을 구하시오.', unit: '', dp: 4, ans: c => c.P.ir,
        sol: (p, c) => `σ(e) = √(${pc(p.P.s)}² − ${p.P.b.toFixed(1)}²×${pc(p.sm)}²) = ${(Math.sqrt(c.P.e2) * 100).toFixed(4)}% → ${(c.P.al * 100).toFixed(4)}%/${(Math.sqrt(c.P.e2) * 100).toFixed(4)}% = <b>${c.P.ir.toFixed(6)}</b>` },
      { lab: '물음 2', type: 'choice', text: '갑의 전 재산을 한 펀드에만 맡긴다면 어느 펀드를 선택해야 하는가? (적절한 지표로 판단)', opts: ['펀드 P', '펀드 Q'], ans: c => (c.P.sh >= c.Q.sh ? 0 : 1),
        sol: (p, c) => `전 재산을 맡기면 총위험이 중요 → 샤프지수 비교: P ${c.P.sh.toFixed(4)}, Q ${c.Q.sh.toFixed(4)}` },
      { lab: '물음 3 ①', type: 'num', text: '펀드 P의 초과성과 중 자산배분 능력에 의한 기여도를 구하시오.', unit: '%', dp: 2, ans: c => c.alloc * 100,
        sol: (p, c) => `Σ(w_P − w_B)·R_B = ${p.wp.map((w, i) => `(${pc(w)}−${pc(p.wb[i])})×${pc(p.rb[i])}`).join(' + ')} = <b>${(c.alloc * 100).toFixed(4)}%p</b>` },
      { lab: '물음 3 ②', type: 'num', text: '펀드 P의 초과성과 중 종목선정 능력에 의한 기여도를 구하시오.', unit: '%', dp: 2, ans: c => c.sel * 100,
        sol: (p, c) => `Σ w_P·(R_P − R_B) = <b>${(c.sel * 100).toFixed(4)}%p</b> (합계 ${((c.alloc + c.sel) * 100).toFixed(2)}%p = 펀드 ${(c.Rp * 100).toFixed(2)}% − 벤치마크 ${(c.Rb * 100).toFixed(2)}%)` },
      { lab: '물음 4', type: 'essay', text: '샤프지수와 트레이너지수를 각각 어떤 상황에서 사용하는 것이 적절한지 두 줄 이내로 설명하시오.',
        model: '샤프지수는 총위험(표준편차) 대비 초과수익이므로 평가 대상이 투자자의 전체 자산일 때 적절하다. 트레이너지수는 체계적위험(베타) 대비 초과수익이므로 평가 대상이 잘 분산된 포트폴리오의 일부일 때 적절하다.',
        kw: ['총위험', '체계적위험', '전체', '일부', '분산'] },
    ],
  });

  /* ───────── 채권 ───────── */
  P.push({
    id: 'bd-replicate-arb', unit: 'bd', pts: 15, real: true, title: '이표채로 현물이자율 추출과 채권 복제 차익거래',
    trend: '2019 문7·2020 문5·2024 문5 (부트스트래핑, 복제, 차익거래)',
    p: { s: [0.04, 0.05, 0.06], c: [0.05, 0.06, 0.07], cD: 0.08, mis: 60 },
    vary(R) {
      const s1 = R.f(0.02, 0.05, 0.005), s2 = s1 + R.f(0, 0.015, 0.005), s3 = s2 + R.f(0, 0.015, 0.005);
      return { s: [s1, s2, s3], c: [R.f(0.03, 0.08, 0.01), R.f(0.03, 0.08, 0.01), R.f(0.03, 0.08, 0.01)], cD: R.f(0.04, 0.1, 0.01), mis: R.pick([-1, 1]) * R.int(30, 150, 10) };
    },
    calc(p) {
      const F = 10000, price = (c, n) => Math.round([...Array(n)].reduce((s, _, i) => s + c * F * pvif(p.s[i], i + 1), 0) + F * pvif(p.s[n - 1], n));
      const PA = price(p.c[0], 1), PB = price(p.c[1], 2), PC = price(p.c[2], 3);
      const d1 = PA / (F * (1 + p.c[0])), d2 = (PB - p.c[1] * F * d1) / (F * (1 + p.c[1])), d3 = (PC - p.c[2] * F * (d1 + d2)) / (F * (1 + p.c[2]));
      const sp = [d1 ** -1 - 1, d2 ** -0.5 - 1, d3 ** (-1 / 3) - 1];
      const eq = p.cD * F * (d1 + d2) + F * (1 + p.cD) * d3, mkt = Math.round(eq) + p.mis;
      const xC = (1 + p.cD) / (1 + p.c[2]), xB = (p.cD - xC * p.c[2]) / (1 + p.c[1]), xA = (p.cD - xC * p.c[2] - xB * p.c[1]) / (1 + p.c[0]);
      return { PA, PB, PC, d: [d1, d2, d3], sp, eq, mkt, xA, xB, xC, profit: Math.abs(mkt - eq) };
    },
    body: (p, c) => `<p>채무불이행위험이 없고 액면가가 10,000원인 이표채들이 시장에서 거래되고 있다. 이자는 매년 말 1회 지급하며, 채권 A, B, C는 균형가격에 거래된다. 모든 채권은 공매가 가능하고 1단위 이하로 분할하여 거래할 수 있으며 거래비용은 없다.</p>`
      + tbl(['채권', '만기', '액면이자율', '시장가격'], [['A', '1년', pc(p.c[0]), fmt(c.PA) + '원'], ['B', '2년', pc(p.c[1]), fmt(c.PB) + '원'], ['C', '3년', pc(p.c[2]), fmt(c.PC) + '원'], ['D', '3년', pc(p.cD), fmt(c.mkt) + '원']])
      + `<p>계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '1년 만기 현물이자율을 구하시오.', unit: '%', dp: 2, ans: c => c.sp[0] * 100, sol: (p, c) => `d₁ = ${fmt(c.PA)}/${fmt(10000 * (1 + p.c[0]))} = ${c.d[0].toFixed(6)} → <b>${(c.sp[0] * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ②', type: 'num', text: '2년 만기 현물이자율을 구하시오.', unit: '%', dp: 2, ans: c => c.sp[1] * 100, sol: (p, c) => `d₂ = (${fmt(c.PB)} − ${fmt(p.c[1] * 10000)}×${c.d[0].toFixed(6)})/${fmt(10000 * (1 + p.c[1]))} = ${c.d[1].toFixed(6)} → <b>${(c.sp[1] * 100).toFixed(4)}%</b>` },
      { lab: '물음 1 ③', type: 'num', text: '3년 만기 현물이자율을 구하시오.', unit: '%', dp: 2, ans: c => c.sp[2] * 100, sol: (p, c) => `d₃ = (${fmt(c.PC)} − ${fmt(p.c[2] * 10000)}×(d₁+d₂))/${fmt(10000 * (1 + p.c[2]))} = ${c.d[2].toFixed(6)} → <b>${(c.sp[2] * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ①', type: 'num', text: '채권 D의 균형가격을 구하시오.', unit: '원', dp: 2, ans: c => c.eq, sol: (p, c) => `${fmt(p.cD * 10000)}×(d₁+d₂) + ${fmt(10000 * (1 + p.cD))}×d₃ = <b>${c.eq.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'choice', text: '채권 D 1개를 기준으로 한 차익거래 전략은? (t=1, 2, 3의 순현금흐름은 0)', opts: ['D 매도 + A·B·C로 만든 복제포트폴리오 매수', 'D 매수 + 복제포트폴리오 매도'], ans: c => (c.mkt > c.eq ? 0 : 1),
        sol: (p, c) => `시장가격 ${fmt(c.mkt)} ${c.mkt > c.eq ? '>' : '<'} 균형가격 ${c.eq.toFixed(2)} → D ${c.mkt > c.eq ? '과대평가: 매도' : '과소평가: 매수'}` },
      { lab: '물음 2 ③', type: 'num', text: '복제포트폴리오에 필요한 채권 C의 수량을 구하시오.', unit: '개', dp: 4, ans: c => c.xC,
        sol: (p, c) => `3년차: x_C × ${fmt(10000 * (1 + p.c[2]))} = ${fmt(10000 * (1 + p.cD))} → <b>${c.xC.toFixed(6)}</b> (B ${c.xB.toFixed(4)}개, A ${c.xA.toFixed(4)}개)` },
      { lab: '물음 2 ④', type: 'num', text: '현재 시점의 차익거래이익을 구하시오.', unit: '원', dp: 2, ans: c => c.profit, sol: (p, c) => `|${fmt(c.mkt)} − ${c.eq.toFixed(4)}| = <b>${c.profit.toFixed(4)}</b>` },
    ],
  });

  P.push({
    id: 'bd-credit', unit: 'bd', pts: 15, real: true, title: '부도위험 채권의 약속수익률·기대수익률·위험프리미엄',
    trend: '2017 문4 (신용위험) · 2022 문6 (신용스프레드)',
    p: { c: 0.03, cy: 0.032, rf: 0.02, pa: 0.0, pb: 0.01, pc: 0.02, rec: 0.7 },
    vary(R) {
      for (;;) {
        const c = R.f(0.02, 0.06, 0.005);
        const p = { c, cy: +(c * R.f(1.02, 1.12, 0.01)).toFixed(4), rf: R.f(0.01, 0.03, 0.005), pa: R.f(0, 0.01, 0.005), pb: R.f(0.005, 0.02, 0.005), pc: R.f(0.01, 0.05, 0.005), rec: R.f(0.3, 0.8, 0.1) };
        const k = this.calc(p);
        if (k.ER > p.rf + 0.001 && k.ytm - p.rf > 0.003) return p;
      }
    },
    calc(p) {
      const F = 100000, cpn = p.c * F, P0 = cpn / p.cy, irr = cfs => root(y => cfs.reduce((s, x, i) => s + x / (1 + y) ** (i + 1), 0) - P0, -0.99, 5);
      const ytm = irr([cpn, cpn + F]), rb = cpn / P0 - 1, rc = irr([cpn, cpn + p.rec * F]), pd = 1 - p.pa - p.pb - p.pc;
      const ER = p.pa * -1 + p.pb * rb + p.pc * rc + pd * ytm;
      return { P0, ytm, rb, rc, pd, ER, spread: ytm - p.rf, dprem: ytm - ER };
    },
    body: p => `<p>㈜동방건설이 발행한 무보증사채(만기 2년, 액면 100,000원, 액면이자율 ${pc(p.c)}, 연 1회 후급)의 현행수익률(current yield)은 <b>${pc(p.cy)}</b>이고, 무위험이자율은 <b>${pc(p.rf)}</b>이다. 원리금 회수 가능성은 다음과 같이 예상된다.</p>`
      + tbl(['상황', '확률'], [['ⓐ 이자와 원금 전액 회수 불능', pc(p.pa)], ['ⓑ 1년차 이자만 회수', pc(p.pb)], [`ⓒ 이자 2회 모두 회수, 원금은 ${pc(p.rec)}만 회수`, pc(p.pc)], ['ⓓ 이자와 원금 전액 회수', pc(+(1 - p.pa - p.pb - p.pc).toFixed(4))]]),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '채권의 현재 가격을 구하시오.', unit: '원', dp: 0, ans: c => c.P0, sol: (p, c) => `${fmt(p.c * 100000)}/${p.cy} = <b>${fmt(c.P0, 2)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '채권의 만기수익률(약속수익률)을 구하시오.', unit: '%', dp: 2, ans: c => c.ytm * 100, sol: (p, c) => `${fmt(c.P0, 2)} = ${fmt(p.c * 100000)}/(1+y) + ${fmt(p.c * 100000 + 100000)}/(1+y)² → <b>${(c.ytm * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ①', type: 'num', text: '상황 ⓒ의 실현수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.rc * 100, sol: (p, c) => `${fmt(c.P0, 2)} = ${fmt(p.c * 100000)}/(1+y) + ${fmt(p.c * 100000 + p.rec * 100000)}/(1+y)² → <b>${(c.rc * 100).toFixed(4)}%</b>` },
      { lab: '물음 2 ②', type: 'num', text: '채권의 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.ER * 100,
        sol: (p, c) => `${pc(p.pa)}×(−100%) + ${pc(p.pb)}×${(c.rb * 100).toFixed(2)}% + ${pc(p.pc)}×${(c.rc * 100).toFixed(2)}% + ${pc(+c.pd.toFixed(4))}×${(c.ytm * 100).toFixed(2)}% = <b>${(c.ER * 100).toFixed(4)}%</b>` },
      { lab: '물음 3 ①', type: 'num', text: '수익률 스프레드를 구하시오.', unit: '%', dp: 2, ans: c => c.spread * 100, sol: (p, c) => `${(c.ytm * 100).toFixed(4)}% − ${pc(p.rf)} = <b>${(c.spread * 100).toFixed(4)}%p</b>` },
      { lab: '물음 3 ②', type: 'num', text: '채무불이행위험 프리미엄을 구하시오.', unit: '%', dp: 2, ans: c => c.dprem * 100, sol: (p, c) => `${(c.ytm * 100).toFixed(4)}% − ${(c.ER * 100).toFixed(4)}% = <b>${(c.dprem * 100).toFixed(4)}%p</b>` },
      { lab: '물음 4', type: 'essay', text: '수익률 스프레드가 채무불이행위험 프리미엄보다 큰 이유를 두 줄 이내로 설명하시오.',
        model: '수익률 스프레드(약속수익률 − 무위험이자율)는 부도로 인한 기대손실 보상인 채무불이행위험 프리미엄과, 부도위험이 체계적 위험과 관련된 데 대한 위험프리미엄(기대수익률 − 무위험이자율)의 합이기 때문이다.',
        kw: ['기대손실', '위험프리미엄', '체계적', '합', '기대수익률'] },
    ],
  });

  P.push({
    id: 'bd-immun-convex', unit: 'bd', pts: 10, real: true, title: '부채의 듀레이션·볼록성과 바벨형 면역전략',
    trend: '2019 문6 (부채 면역, 볼록성 비교)',
    p: { L: [1000, 1000, 1000], y: 0.05 },
    vary(R) { return { L: [R.int(500, 2000, 100), R.int(500, 2000, 100), R.int(500, 2000, 100)], y: R.f(0.03, 0.08, 0.005) }; },
    calc(p) {
      const pv = p.L.map((x, i) => x * pvif(p.y, i + 1)), PV = pv.reduce((a, b) => a + b, 0);
      const D = pv.reduce((s, x, i) => s + (i + 1) * x, 0) / PV, CL = pv.reduce((s, x, i) => s + (i + 1) * (i + 2) * x, 0) / PV / (1 + p.y) ** 2;
      const w3 = (D - 1) / 2, amt3 = w3 * PV, CA = ((1 - w3) * 2 + w3 * 12) / (1 + p.y) ** 2;
      return { pv, PV, D, CL, w3, amt3, CA };
    },
    body: p => `<p>㈜한빛생명은 1년, 2년, 3년 후에 각각 <b>${fmt(p.L[0])}억원, ${fmt(p.L[1])}억원, ${fmt(p.L[2])}억원</b>을 지급할 부채를 가지고 있다. 수익률곡선은 <b>${pc(p.y)}</b>에서 수평이며 평행이동한다. ㈜한빛생명은 <b>1년 만기 무이표채와 3년 만기 무이표채</b>만으로 자산과 부채의 현재가치와 듀레이션을 일치시키는 면역전략을 수행한다.</p><p>볼록성은 C = Σ t(t+1)·PV(CF<sub>t</sub>) ÷ [P·(1+y)²]로 정의한다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '부채의 현재가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.PV, sol: (p, c) => `${c.pv.map(x => x.toFixed(2)).join(' + ')} = <b>${c.PV.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '부채의 듀레이션을 구하시오.', unit: '년', dp: 4, ans: c => c.D, sol: (p, c) => `Σ t·PV_t / PV = <b>${c.D.toFixed(6)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '부채의 볼록성을 구하시오.', unit: '', dp: 4, ans: c => c.CL, sol: (p, c) => `Σ t(t+1)PV_t / [PV(1+y)²] = <b>${c.CL.toFixed(6)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '3년 만기 무이표채에 투자할 금액을 구하시오.', unit: '억원', dp: 2, ans: c => c.amt3, sol: (p, c) => `w = (${c.D.toFixed(4)} − 1)/2 = ${c.w3.toFixed(6)} → ${c.PV.toFixed(2)}×w = <b>${c.amt3.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '자산 포트폴리오의 볼록성을 구하시오.', unit: '', dp: 4, ans: c => c.CA, sol: (p, c) => `[(1−w)×2 + w×12]/(1+y)² = <b>${c.CA.toFixed(6)}</b>` },
      { lab: '물음 3', type: 'choice', text: '이자율이 크게 변할 때 이 면역전략의 결과로 옳은 것은?', opts: ['자산 볼록성이 부채보다 커서 이자율이 오르든 내리든 순자산이 줄지 않는다', '자산 볼록성이 부채보다 작아 이자율이 크게 변하면 순자산이 줄어든다'], ans: c => (c.CA >= c.CL ? 0 : 1),
        sol: (p, c) => `자산 ${c.CA.toFixed(4)} vs 부채 ${c.CL.toFixed(4)} — 바벨형(1년·3년) 자산은 현금흐름이 더 넓게 퍼져 볼록성이 크다` },
    ],
  });

  /* ───────── 파생상품 ───────── */
  P.push({
    id: 'dv-swap', unit: 'dv', pts: 15, real: true, title: '금리스왑의 가치평가: 채권 방식과 FRA 방식',
    trend: '2017 문6 (금리스왑·FRA) · 2020 문7 (스왑)',
    p: { N: 100, s: [0.05, 0.06, 0.07], c: 0.06 },
    vary(R) { const s1 = R.f(0.02, 0.05, 0.005), s2 = s1 + R.f(0, 0.015, 0.005), s3 = s2 + R.f(0, 0.015, 0.005); return { N: R.pick([50, 100, 200, 300]), s: [s1, s2, s3], c: R.f(0.02, 0.08, 0.005) }; },
    calc(p) {
      const d = p.s.map((s, i) => pvif(s, i + 1)), sumd = d[0] + d[1] + d[2];
      const Bfix = p.c * p.N * sumd + p.N * d[2], Bfl = p.N, V = Bfl - Bfix, swr = (1 - d[2]) / sumd;
      const f = [p.s[0], d[0] / d[1] - 1, d[1] / d[2] - 1];
      const fra = f.map((x, i) => p.N * (x - p.c) * d[i]);
      return { d, Bfix, Bfl, V, swr, f, fra };
    },
    body: p => `<p>A기업은 B기업과 <b>고정금리를 지급하고 변동금리(1년 현물이자율)를 수취하는</b> 금리스왑 계약을 맺고 있다. 오늘은 변동금리가 재설정되는 이자 교환일 직후이다.</p>` + ul([
      `명목원금 ${fmt(p.N)}억원, 잔존만기 3년, 연 1회 이자 교환`, `지급 고정금리 ${pc(p.c)}, 수취 변동금리는 매년 초의 1년 현물이자율`,
    ]) + tbl(['만기', '1년', '2년', '3년'], [['현물이자율', ...p.s.map(pc)]]) + `<p>금액은 억원 단위로 소수점 아래 셋째 자리에서 반올림하여 둘째 자리까지, 금리는 % 단위로 소수점 아래 셋째 자리에서 반올림하여 둘째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '스왑의 고정금리 쪽 현금흐름을 채권으로 볼 때 그 가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.Bfix,
        sol: (p, c) => `${fmt(p.c * p.N, 2)}×(${c.d.map(x => x.toFixed(4)).join(' + ')}) + ${fmt(p.N)}×${c.d[2].toFixed(4)} = <b>${c.Bfix.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '채권 방식으로 A기업 입장의 스왑 가치를 구하시오. (손실은 음수)', unit: '억원', dp: 2, ans: c => c.V,
        sol: (p, c) => `변동금리채 ${fmt(p.N)} (교환일 직후 = 액면) − 고정금리채 ${c.Bfix.toFixed(4)} = <b>${c.V.toFixed(4)}</b>` },
      { lab: '물음 2', type: 'num', text: 'FRA 방식으로 볼 때, 2년 후(t=2) 교환분의 현재가치를 A기업 입장에서 구하시오.', unit: '억원', dp: 2, ans: c => c.fra[1],
        sol: (p, c) => `f(1,2) = ${c.d[0].toFixed(6)}/${c.d[1].toFixed(6)} − 1 = ${(c.f[1] * 100).toFixed(4)}% → ${fmt(p.N)}×(${(c.f[1] * 100).toFixed(4)}% − ${pc(p.c)})×${c.d[1].toFixed(4)} = <b>${c.fra[1].toFixed(4)}</b><br>세 교환분 합계 ${c.fra.reduce((a, b) => a + b, 0).toFixed(4)} = 채권 방식 가치와 같다` },
      { lab: '물음 3', type: 'num', text: '현재 시점에 스왑 가치를 0으로 만드는 고정금리(스왑금리)를 구하시오.', unit: '%', dp: 2, ans: c => c.swr * 100,
        sol: (p, c) => `(1 − ${c.d[2].toFixed(6)})/(${c.d.map(x => x.toFixed(6)).join(' + ')}) = <b>${(c.swr * 100).toFixed(4)}%</b>` },
      { lab: '물음 4', type: 'essay', text: '변동금리채의 가치가 이자 교환일 직후 액면가와 같아지는 이유를 두 줄 이내로 설명하시오.',
        model: '변동금리채는 매 기간 초에 그 기간의 시장이자율로 이자가 재설정되므로, 다음 교환일에 받을 원리금(액면 + 시장이자)을 같은 시장이자율로 할인하면 항상 액면가가 된다. 따라서 재설정 직후의 가치는 액면가와 같다.',
        kw: ['재설정', '시장이자율', '할인', '액면'] },
    ],
  });

  P.push({
    id: 'dv-parity-strategy', unit: 'dv', pts: 15, real: true, title: '풋-콜 패리티 차익거래와 강세 스프레드',
    trend: '2018 문6·7 (패리티, 스프레드) · 2020 문6 · 2023 문3',
    p: { S: 10000, r: 0.05, K1: 9500, K2: 10500, sig: 0.3, mis: 120 },
    vary(R) { const S = R.int(8000, 15000, 500); return { S, r: R.f(0.02, 0.08, 0.005), K1: Math.round(S * R.f(0.85, 0.97, 0.01) / 100) * 100, K2: Math.round(S * R.f(1.03, 1.15, 0.01) / 100) * 100, sig: R.f(0.2, 0.45, 0.05), mis: R.pick([-1, 1]) * R.int(50, 300, 10) }; },
    calc(p) {
      const bs = K => { const r = Math.log(1 + p.r), d1 = (Math.log(p.S / K) + r + p.sig ** 2 / 2) / p.sig, d2 = d1 - p.sig; return p.S * ncdf(d1) - K * Math.exp(-r) * ncdf(d2); };
      const C1 = Math.round(bs(p.K1)), C2 = Math.round(bs(p.K2)), PV = K => K / (1 + p.r);
      const P2fair = C2 - p.S + PV(p.K2), P2 = Math.round(P2fair) + p.mis;
      const P1 = C1 - p.S + PV(p.K1), cost = C1 - C2;
      return { C1, C2, P2, P2fair, P1, cost, profit: Math.abs(P2 - P2fair), maxp: (p.K2 - p.K1) - cost * (1 + p.r), be: p.K1 + cost * (1 + p.r) };
    },
    body: (p, c) => `<p>현재 주가가 <b>${fmt(p.S)}원</b>인 무배당 주식 ㈜새봄을 기초자산으로 하는 만기 1년 유럽형 옵션이 다음과 같이 거래되고 있다. 무위험이자율은 연 <b>${pc(p.r)}</b>이며 이 이자율로 차입과 대출이 가능하다. 공매에 제약이 없고 거래비용은 없다.</p>`
      + tbl(['옵션', '행사가격', '프리미엄'], [['콜옵션 ①', fmt(p.K1) + '원', fmt(c.C1) + '원'], ['콜옵션 ②', fmt(p.K2) + '원', fmt(c.C2) + '원'], ['풋옵션 ③', fmt(p.K2) + '원', fmt(c.P2) + '원']])
      + `<p>금액은 원 단위로 소수점 아래 셋째 자리에서 반올림하여 둘째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1', type: 'num', textf: p => `행사가격 ${fmt(p.K1)}원인 유럽형 풋옵션의 무차익 가격을 구하시오.`, unit: '원', dp: 2, ans: c => c.P1,
        sol: (p, c) => `P = C − S + K/(1+r) = ${fmt(c.C1)} − ${fmt(p.S)} + ${fmt(p.K1)}/${(1 + p.r).toFixed(3)} = <b>${c.P1.toFixed(4)}</b>` },
      { lab: '물음 2 ①', type: 'choice', textf: p => `행사가격 ${fmt(p.K2)}원 옵션들의 가격으로 가능한 차익거래 전략은?`, opts: ['콜 매수 · 풋 매도 · 주식 공매 · 대출', '콜 매도 · 풋 매수 · 주식 매수 · 차입'], ans: c => (c.P2 > c.P2fair ? 0 : 1),
        sol: (p, c) => `패리티 풋 가격 ${c.P2fair.toFixed(2)} vs 시장 ${fmt(c.P2)} → 풋이 ${c.P2 > c.P2fair ? '비쌈: 풋 매도 쪽' : '쌈: 풋 매수 쪽'}` },
      { lab: '물음 2 ②', type: 'num', text: '옵션 1계약(주식 1주) 기준으로 현재 시점의 차익거래이익을 구하시오.', unit: '원', dp: 2, ans: c => c.profit,
        sol: (p, c) => `|${fmt(c.C2)} − ${fmt(c.P2)} − ${fmt(p.S)} + ${fmt(p.K2)}/${(1 + p.r).toFixed(3)}| = <b>${c.profit.toFixed(4)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '콜옵션 ①과 ②로 강세 스프레드(bull spread) 매수 포지션을 구성하는 데 드는 현재 비용을 구하시오.', unit: '원', dp: 2, ans: c => c.cost,
        sol: (p, c) => `콜① 매수 − 콜② 매도 = ${fmt(c.C1)} − ${fmt(c.C2)} = <b>${c.cost.toFixed(2)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '이 강세 스프레드의 만기 최대 순이익(비용의 미래가치 차감)을 구하시오.', unit: '원', dp: 2, ans: c => c.maxp,
        sol: (p, c) => `(${fmt(p.K2)} − ${fmt(p.K1)}) − ${c.cost}×${(1 + p.r).toFixed(3)} = <b>${c.maxp.toFixed(4)}</b>` },
      { lab: '물음 3 ③', type: 'num', text: '이 강세 스프레드의 만기 손익분기 주가를 구하시오.', unit: '원', dp: 2, ans: c => c.be,
        sol: (p, c) => `${fmt(p.K1)} + ${c.cost}×${(1 + p.r).toFixed(3)} = <b>${c.be.toFixed(4)}</b>` },
    ],
  });

  /* ───────── 기업재무 ───────── */
  P.push({
    id: 'cf-rights', unit: 'cf', pts: 10, real: true, title: '주주배정 유상증자와 신주인수권의 가치',
    trend: '2026 문4 (주주배정 유상증자) · 2024 문2 (유상증자)',
    p: { N: 5e6, P: 10000, X: 8000, ratio: 0.2, own: 100, X2: 9000 },
    vary(R) {
      for (;;) {
        const P = R.int(5000, 50000, 1000), X = Math.round(P * R.f(0.6, 0.9, 0.05) / 100) * 100, X2 = Math.round(P * R.f(0.6, 0.9, 0.05) / 100) * 100;
        if (X2 !== X) return { N: R.pick([2e6, 5e6, 1e7]), P, X, ratio: R.f(0.1, 0.5, 0.05), own: R.pick([100, 200, 500, 1000]), X2 };
      }
    },
    calc(p) {
      const raise = p.N * p.ratio * p.X / 1e8, Pex = (p.P + p.ratio * p.X) / (1 + p.ratio), right = p.P - Pex;
      const Pex2 = (p.P + p.ratio * p.X2) / (1 + p.ratio);
      return { raise, newSh: p.N * p.ratio, Pex, right, loss: p.own * right, Pex2, wealth: p.own * p.P };
    },
    body: p => `<p>㈜솔빛바이오는 임상시험 자금을 조달하기 위해 주주배정 유상증자를 검토하고 있다. 현재 권리부 주가는 <b>${fmt(p.P)}원</b>, 발행주식수는 <b>${fmt(p.N)}주</b>이고, 신주 발행가는 <b>${fmt(p.X)}원</b>, 배정비율은 <b>구주 1주당 신주 ${p.ratio}주</b>이다. 청약은 발표 즉시 완료되고 완전자본시장을 가정한다.</p>`,
    qs: [
      { lab: '물음 1', type: 'num', text: '이번 유상증자로 조달하는 총 금액을 구하시오.', unit: '억원', dp: 2, ans: c => c.raise, sol: (p, c) => `${fmt(p.N)}×${p.ratio}×${fmt(p.X)} = <b>${c.raise.toFixed(2)}억원</b> (신주 ${fmt(c.newSh)}주)` },
      { lab: '물음 2 ①', type: 'num', text: '권리락 후 이론 주가를 구하시오.', unit: '원', dp: 2, ans: c => c.Pex, sol: (p, c) => `(${fmt(p.P)} + ${p.ratio}×${fmt(p.X)})/${(1 + p.ratio).toFixed(2)} = <b>${c.Pex.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '구주 1주당 신주인수권의 이론가치를 구하시오.', unit: '원', dp: 2, ans: c => c.right, sol: (p, c) => `${fmt(p.P)} − ${c.Pex.toFixed(4)} = <b>${c.right.toFixed(4)}</b>` },
      { lab: '물음 3', type: 'num', textf: p => `${fmt(p.own)}주를 가진 주주가 청약도 권리 매각도 하지 않을 때 부의 감소액을 구하시오.`, unit: '원', dp: 0, ans: c => c.loss, sol: (p, c) => `${fmt(p.own)}주 × ${c.right.toFixed(4)} = <b>${fmt(c.loss, 2)}</b>` },
      { lab: '물음 4', type: 'num', textf: p => `발행가를 ${fmt(p.X2)}원으로 바꾸면 권리락 후 이론 주가는 얼마인가?`, unit: '원', dp: 2, ans: c => c.Pex2, sol: (p, c) => `(${fmt(p.P)} + ${p.ratio}×${fmt(p.X2)})/${(1 + p.ratio).toFixed(2)} = <b>${c.Pex2.toFixed(4)}</b>` },
      { lab: '물음 5', type: 'essay', text: '완전자본시장에서 주주배정 유상증자의 발행가를 바꾸어도 청약하는 기존 주주의 부가 변하지 않는 이유를 두 줄 이내로 설명하시오.',
        model: '발행가가 낮으면 권리락 주가도 낮아지지만 그만큼 신주인수권의 가치가 커지고, 기존 주주가 신주를 모두 배정받으므로 가치 이전이 기존 주주 자신에게 돌아온다. 따라서 주식가치와 권리가치(또는 추가 납입액)의 합인 주주의 부는 같다.',
        kw: ['권리락', '신주인수권', '가치 이전', '배정', '합'] },
    ],
  });

  P.push({
    id: 'cf-agency', unit: 'cf', pts: 10, real: true, title: '주주-채권자 대리문제: 위험이 큰 투자안으로의 부의 이전',
    trend: '2018 문3·2025 문3 (위험이전, 대리비용)',
    p: { F: 4000, A: [5500, 7500], B: [1500, 11000] },
    vary(R) {
      for (;;) {
        const F = R.int(2000, 6000, 500);
        const p = { F, A: [R.int(F, F + 3000, 500), R.int(F + 1000, F + 5000, 500)], B: [R.int(0, F - 500, 500), R.int(F + 4000, F + 10000, 500)] };
        const c = this.calc(p);
        if (c.EA > c.EB && c.eqB > c.eqA && c.dA > c.dB) return p;
      }
    },
    calc(p) {
      const v = a => ({ E: (a[0] + a[1]) / 2, eq: (Math.max(a[0] - p.F, 0) + Math.max(a[1] - p.F, 0)) / 2, d: (Math.min(a[0], p.F) + Math.min(a[1], p.F)) / 2 });
      const A = v(p.A), B = v(p.B);
      return { EA: A.E, EB: B.E, eqA: A.eq, dA: A.d, eqB: B.eq, dB: B.d, transfer: A.d - B.d };
    },
    body: p => `<p>㈜마루는 1년 후 만기에 원리금 <b>${fmt(p.F)}만원</b>을 갚아야 하는 부채가 있으며, 같은 금액이 드는 상호배타적 투자안 A와 B 중 하나에 회사 자산 전부를 투자하려 한다. 1년 후 경기에 따른 투자안의 가치는 다음과 같고, 이자율은 0%, 투자자는 위험중립적이라고 가정한다.</p>`
      + tbl(['경기', '확률', '투자안 A', '투자안 B'], [['불황', '50%', fmt(p.A[0]) + '만원', fmt(p.B[0]) + '만원'], ['호황', '50%', fmt(p.A[1]) + '만원', fmt(p.B[1]) + '만원']]),
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '투자안 A를 선택할 때 주주 부의 기댓값을 구하시오.', unit: '만원', dp: 0, ans: c => c.eqA, sol: (p, c) => `(max(${fmt(p.A[0])}−${fmt(p.F)},0) + max(${fmt(p.A[1])}−${fmt(p.F)},0))/2 = <b>${fmt(c.eqA)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '투자안 A를 선택할 때 채권자 부의 기댓값을 구하시오.', unit: '만원', dp: 0, ans: c => c.dA, sol: (p, c) => `(min(${fmt(p.A[0])},${fmt(p.F)}) + min(${fmt(p.A[1])},${fmt(p.F)}))/2 = <b>${fmt(c.dA)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '투자안 B를 선택할 때 주주 부의 기댓값을 구하시오.', unit: '만원', dp: 0, ans: c => c.eqB, sol: (p, c) => `<b>${fmt(c.eqB)}</b>` },
      { lab: '물음 1 ④', type: 'num', text: '투자안 B를 선택할 때 채권자 부의 기댓값을 구하시오.', unit: '만원', dp: 0, ans: c => c.dB, sol: (p, c) => `<b>${fmt(c.dB)}</b>` },
      { lab: '물음 2 ①', type: 'choice', text: '주주 부를 극대화하는 경영자가 선택하는 투자안은?', opts: ['투자안 A', '투자안 B'], ans: c => (c.eqA >= c.eqB ? 0 : 1), sol: (p, c) => `주주 부 A ${fmt(c.eqA)} vs B ${fmt(c.eqB)} (기업가치는 A ${fmt(c.EA)} > B ${fmt(c.EB)})` },
      { lab: '물음 2 ②', type: 'num', text: '이 선택으로 채권자에게서 주주에게 이전되는 부의 크기를 구하시오.', unit: '만원', dp: 0, ans: c => c.transfer, sol: (p, c) => `채권자 부 감소 ${fmt(c.dA)} − ${fmt(c.dB)} = <b>${fmt(c.transfer)}</b>` },
      { lab: '물음 3', type: 'essay', text: '채권자가 이러한 위험이전 문제에 대비할 수 있는 방법을 두 가지 제시하시오.',
        model: '① 사채 계약에 투자·배당·추가 차입을 제한하는 보호약관(covenant)을 둔다. ② 전환사채·신주인수권부사채처럼 주가 상승 이익을 함께 누릴 수 있는 증권으로 투자하거나, 위험을 반영해 더 높은 이자율을 요구한다.',
        kw: ['약관', '전환사채', '이자율', '제한', '신주인수권'] },
    ],
  });
})();
