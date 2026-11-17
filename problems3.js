/* 실전 분량으로 다시 쓴 기본 문제 (포트폴리오·채권·파생·기업재무 11개)
 * 자본예산 개편과 같은 기준: 조건 7~10개 + 표, 쓰지 않는 정보, 여러 단계 계산, 독립 물음으로 상황 전환, 물음 7~10개.
 * 기출 경향만 참고해 새로 만든 문제이며 기출 원문·숫자를 옮기지 않았다.
 */
(function () {
  'use strict';
  const { fmt, pc, pvif, r4, tbl, ul, root } = window.FM_UTIL;
  const P = window.FM_PROBLEMS;
  const pct4 = x => (x * 100).toFixed(4) + '%';
  const f2 = x => (+x).toFixed(2), f4 = x => (+x).toFixed(4);

  /* ───────── 포트폴리오 · CAPM · APT ───────── */
  P.push({
    id: 'pf-capm-states', unit: 'pf', pts: 15, real: true, title: '상황별 수익률 분포로 베타 추정, SML 가격 판단, 포트폴리오 알파',
    trend: '2026 문2 (확률분포 → 베타, 과대/과소평가) · 2021 문4',
    p: { pr: [0.3, 0.4, 0.3], rm: [-0.05, 0.1, 0.25], rk: [0.02, 0.08, 0.2], rl: [0.12, 0.07, 0.04], rf: 0.04, w: 0.4, pxK: 23000, pxL: 16500, perK: 14, perL: 9 },
    vary(R) {
      for (;;) {
        const p = { pr: R.pick([[0.3, 0.4, 0.3], [0.2, 0.5, 0.3], [0.25, 0.5, 0.25], [0.3, 0.5, 0.2]]),
          rm: [R.f(-0.15, -0.01, 0.01), R.f(0.05, 0.12, 0.01), R.f(0.16, 0.3, 0.01)], rk: [R.f(-0.12, 0.04, 0.01), R.f(0.04, 0.12, 0.01), R.f(0.12, 0.32, 0.01)],
          rl: [R.f(0.08, 0.16, 0.01), R.f(0.05, 0.09, 0.01), R.f(0, 0.05, 0.01)], rf: R.f(0.02, 0.045, 0.005), w: R.f(0.2, 0.8, 0.1),
          pxK: R.int(10000, 50000, 500), pxL: R.int(10000, 50000, 500), perK: R.int(8, 20, 1), perL: R.int(6, 15, 1) };
        const c = this.calc(p);
        if (Math.abs(c.alK) > 0.004 && c.bK > 0.2 && c.bL < -0.05 && c.Em > p.rf + 0.02) return p;
      }
    },
    calc(p) {
      const E = a => a.reduce((s, x, i) => s + p.pr[i] * x, 0), Em = E(p.rm), Ek = E(p.rk), El = E(p.rl);
      const cv = (a, ea, b, eb) => p.pr.reduce((s, q, i) => s + q * (a[i] - ea) * (b[i] - eb), 0);
      const vM = cv(p.rm, Em, p.rm, Em), vK = cv(p.rk, Ek, p.rk, Ek), bK = cv(p.rm, Em, p.rk, Ek) / vM, bL = cv(p.rm, Em, p.rl, El) / vM;
      const reqK = p.rf + bK * (Em - p.rf), bP = p.w * bK + (1 - p.w) * bL, EP = p.w * Ek + (1 - p.w) * El;
      return { Em, Ek, El, vM, vK, sK: Math.sqrt(vK), bK, bL, reqK, alK: Ek - reqK, bP, EP, alP: EP - (p.rf + bP * (Em - p.rf)), sysK: bK * bK * vM / vK };
    },
    body: p => `<p>CAPM이 성립하는 시장에서 투자자 갑은 경기 상황별 수익률 예측을 바탕으로 주식 K와 L을 분석하고 있다. 무위험이자율은 <b>${pc(p.rf)}</b>이다.</p>`
      + tbl(['경기', '확률', '시장포트폴리오', '주식 K', '주식 L'], p.pr.map((q, i) => [['불황', '보통', '호황'][i], pc(q), pc(p.rm[i]), pc(p.rk[i]), pc(p.rl[i])]))
      + ul([`주식 K와 L의 현재 주가는 각각 ${fmt(p.pxK)}원, ${fmt(p.pxL)}원이고, 주가수익비율(PER)은 각각 ${p.perK}배, ${p.perL}배이다.`,
        '모든 주식은 공매가 가능하고 거래비용은 없다.'])
      + `<p>※ (물음 4)와 (물음 5)는 서로 독립적이다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '주식 K의 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.Ek * 100, sol: (p, c) => `${p.pr.map((q, i) => `${q}×${pc(p.rk[i])}`).join(' + ')} = <b>${pct4(c.Ek)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '주식 K 수익률의 표준편차를 구하시오.', unit: '%', dp: 2, ans: c => c.sK * 100, sol: (p, c) => `분산 = Σp(R − E)² = ${c.vK.toFixed(6)} → <b>${pct4(c.sK)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '주식 K의 베타를 구하시오.', unit: '', dp: 2, ans: c => c.bK, sol: (p, c) => `E(Rm) = ${pct4(c.Em)}, Var(Rm) = ${c.vM.toFixed(6)} → β_K = Cov(K,M)/Var(M) = <b>${c.bK.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '주식 L의 베타를 구하시오. (음수 가능)', unit: '', dp: 2, ans: c => c.bL, sol: (p, c) => `β_L = Cov(L,M)/Var(M) = <b>${c.bL.toFixed(4)}</b> (경기와 반대로 움직이는 방어주)` },
      { lab: '물음 3 ①', type: 'num', text: 'CAPM에 따른 주식 K의 요구수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.reqK * 100, sol: (p, c) => `${pc(p.rf)} + ${c.bK.toFixed(4)}×(${pct4(c.Em)} − ${pc(p.rf)}) = <b>${pct4(c.reqK)}</b>` },
      { lab: '물음 3 ②', type: 'choice', text: '주식 K는 현재 어떻게 평가되어 있는가?', opts: ['과소평가 (매수)', '과대평가 (매도)'], ans: c => (c.alK > 0 ? 0 : 1),
        sol: (p, c) => `알파 = ${pct4(c.Ek)} − ${pct4(c.reqK)} = ${(c.alK * 100).toFixed(2)}%p → ${c.alK > 0 ? '과소평가' : '과대평가'} (주가·PER은 판단과 무관한 정보)` },
      { lab: '물음 4', type: 'num', textf: p => `주식 K에 ${pc(p.w)}, 주식 L에 ${pc(1 - p.w)}를 투자한 포트폴리오의 알파(기대수익률 − CAPM 요구수익률)를 구하시오.`, unit: '%', dp: 2, ans: c => c.alP * 100,
        sol: (p, c) => `β_P = ${p.w}×${c.bK.toFixed(4)} + ${(1 - p.w).toFixed(1)}×${c.bL.toFixed(4)} = ${c.bP.toFixed(4)}, E(R_P) = ${pct4(c.EP)}<br>알파 = ${pct4(c.EP)} − [${pc(p.rf)} + ${c.bP.toFixed(4)}×${pct4(c.Em - p.rf)}] = <b>${(c.alP * 100).toFixed(4)}%</b>` },
      { lab: '물음 5', type: 'num', text: '주식 K의 총위험(분산) 중 체계적위험이 차지하는 비율을 구하시오.', unit: '%', dp: 2, ans: c => c.sysK * 100, sol: (p, c) => `β²σm²/σ² = ${c.bK.toFixed(4)}² × ${c.vM.toFixed(6)} / ${c.vK.toFixed(6)} = <b>${pct4(c.sysK)}</b>` },
      { lab: '물음 6', type: 'essay', text: '주식 L의 균형 기대수익률이 무위험이자율보다 낮은 이유를 두 줄 이내로 설명하시오.',
        model: '주식 L은 베타가 음수여서 시장이 나쁠 때 오히려 수익이 높아 포트폴리오의 체계적위험을 줄여 주는 보험 역할을 한다. 투자자는 이런 위험 분산 혜택에 대가를 치르므로 위험프리미엄이 음수가 되어 요구수익률이 무위험이자율보다 낮다.',
        kw: ['음수', '베타', '보험', '체계적위험', '위험프리미엄'] },
    ],
  });

  P.push({
    id: 'pf-cml-utility', unit: 'pf', pts: 15, real: true, title: '효용함수와 최적 투자: 차입이자율이 대출이자율보다 높은 경우',
    trend: '2018 문4·2025 문4·2026 문3 (효용, 최적 비중, 차입이자율)',
    p: { E: 0.12, s: 0.2, rf: 0.04, rb: 0.06, g1: 4, g2: 1.8, fee: 0.005, mkt: 0.1 },
    vary(R) {
      for (;;) {
        const E = R.f(0.09, 0.15, 0.01), rf = R.f(0.02, 0.05, 0.005);
        const p = { E, s: R.f(0.15, 0.3, 0.01), rf, rb: rf + R.f(0.01, 0.03, 0.005), g1: R.int(3, 8, 1), g2: 0, fee: R.f(0.002, 0.01, 0.001), mkt: R.f(0.08, 0.12, 0.01) };
        if (p.rb >= E - 0.02) continue;
        const v = p.s ** 2, lo = (E - p.rb) / v, hi = (E - rf) / v;
        p.g2 = +((lo + hi) / 2 + R.f(-0.4, 0.4, 0.1) * (hi - lo)).toFixed(1);
        const c = this.calc(p);
        if (c.y1 < 1 && p.g2 > 0.3) return p;
      }
    },
    calc(p) {
      const v = p.s ** 2, y1 = (p.E - p.rf) / (p.g1 * v), E1 = p.rf + y1 * (p.E - p.rf), sd1 = y1 * p.s;
      const ce = (g, y, r) => r + y * (p.E - r) - 0.5 * g * y * y * v;
      const yl = (p.E - p.rf) / (p.g2 * v), yb = (p.E - p.rb) / (p.g2 * v), y2 = yl <= 1 ? yl : (yb >= 1 ? yb : 1);
      const r2 = y2 > 1 ? p.rb : p.rf;
      return { v, y1, E1, sd1, ce1: ce(p.g1, y1, p.rf), yl, yb, y2, ce2: ce(p.g2, y2, r2), lo: (p.E - p.rb) / v, hi: (p.E - p.rf) / v };
    },
    body: p => `<p>위험자산은 시장지수를 추종하는 펀드 F 하나뿐이다. 펀드 F의 기대수익률은 <b>${pc(p.E)}</b>, 표준편차는 <b>${pc(p.s)}</b>이며, 운용보수 연 ${pc(p.fee)}는 이미 기대수익률에 반영되어 있다. 시장포트폴리오의 과거 10년 평균 수익률은 ${pc(p.mkt)}였다.</p>`
      + `<p>투자자의 효용함수는 U = E(R<sub>P</sub>) − 0.5 × γ × σ<sub>P</sub>² 이고, γ는 위험회피계수이다.</p>`
      + ul([`(물음 1)에서는 무위험이자율 ${pc(p.rf)}로 차입과 대출이 모두 가능하다.`, `(물음 2)와 (물음 3)에서는 대출은 ${pc(p.rf)}로 가능하지만, 차입은 연 ${pc(p.rb)}로만 가능하다.`]),
    qs: [
      { lab: '물음 1 ①', type: 'num', textf: p => `위험회피계수가 ${p.g1}인 투자자 갑의 펀드 F 투자 비중을 구하시오.`, unit: '%', dp: 2, ans: c => c.y1 * 100, sol: (p, c) => `y* = (${pc(p.E)} − ${pc(p.rf)})/(${p.g1}×${pc(p.s)}²) = <b>${pct4(c.y1)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '갑의 최적 포트폴리오의 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.E1 * 100, sol: (p, c) => `${pc(p.rf)} + ${c.y1.toFixed(4)}×${pc(p.E - p.rf)} = <b>${pct4(c.E1)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '갑의 최적 포트폴리오의 표준편차를 구하시오.', unit: '%', dp: 2, ans: c => c.sd1 * 100, sol: (p, c) => `${c.y1.toFixed(4)}×${pc(p.s)} = <b>${pct4(c.sd1)}</b>` },
      { lab: '물음 1 ④', type: 'num', text: '갑의 최적 포트폴리오의 확실성등가 수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.ce1 * 100, sol: (p, c) => `${pct4(c.E1)} − 0.5×${p.g1}×${pct4(c.sd1)}² = <b>${pct4(c.ce1)}</b> (과거 평균수익률·운용보수는 쓰지 않음)` },
      { lab: '물음 2 ①', type: 'num', textf: p => `위험회피계수가 ${p.g2}인 투자자 을의 펀드 F 투자 비중을 구하시오.`, unit: '%', dp: 2, ans: c => c.y2 * 100,
        sol: (p, c) => `대출 기준 y = ${pct4(c.yl)}, 차입 기준 y = ${pct4(c.yb)} → ${c.yl <= 1 ? '대출 구간' : c.yb >= 1 ? '차입 구간' : '두 기준이 100%를 사이에 둠 → 꺾인 점'} → <b>${pct4(c.y2)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '을의 최적 포트폴리오의 확실성등가 수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.ce2 * 100, sol: (p, c) => `<b>${pct4(c.ce2)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '전 재산을 펀드 F에만 투자하는 것(무위험자산 0%)이 최적이 되는 위험회피계수의 최솟값을 구하시오.', unit: '', dp: 2, ans: c => c.lo,
        sol: (p, c) => `차입 기준 비중 ≤ 100%: (${pc(p.E)} − ${pc(p.rb)})/(γ×${pc(p.s)}²) ≤ 1 → γ ≥ <b>${c.lo.toFixed(4)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '같은 조건에서 위험회피계수의 최댓값을 구하시오.', unit: '', dp: 2, ans: c => c.hi,
        sol: (p, c) => `대출 기준 비중 ≥ 100%: (${pc(p.E)} − ${pc(p.rf)})/(γ×${pc(p.s)}²) ≥ 1 → γ ≤ <b>${c.hi.toFixed(4)}</b>` },
      { lab: '물음 4', type: 'essay', text: '차입이자율이 대출이자율보다 높으면 토빈의 분리정리가 성립하지 않는 이유를 두 줄 이내로 설명하시오.',
        model: '차입이자율이 더 높으면 자본배분선이 펀드 F 지점에서 꺾여, 위험회피 정도가 중간인 투자자들은 무위험자산 없이 위험자산만 보유한다. 이때 최적 위험자산 포트폴리오 선택이 투자자의 위험선호와 분리되지 않으므로 분리정리가 성립하지 않는다.',
        kw: ['꺾', '자본배분선', '위험선호', '분리', '차입'] },
    ],
  });

  P.push({
    id: 'pf-two-asset', unit: 'pf', pts: 15, real: true, title: '두 위험자산: 최소분산·접점 포트폴리오와 최적 완전포트폴리오',
    trend: '2022 문4 (MVP·접점) · 2023 문6 (상관계수, 위험회피계수)',
    p: { EA: 0.08, sA: 0.15, EB: 0.14, sB: 0.25, rho: 0.3, rf: 0.04, g: 3, capA: 3000, capB: 7000 },
    vary(R) {
      for (;;) {
        const p = { EA: R.f(0.06, 0.1, 0.01), sA: R.f(0.1, 0.2, 0.01), EB: R.f(0.12, 0.18, 0.01), sB: R.f(0.2, 0.35, 0.01), rho: R.f(-0.3, 0.5, 0.1), rf: R.f(0.02, 0.05, 0.01), g: R.int(2, 6, 1), capA: R.int(1000, 9000, 500), capB: R.int(1000, 9000, 500) };
        const c = this.calc(p);
        if (p.rf < p.EA && c.wT > 0 && c.wT < 1 && c.wM > 0 && c.wM < 1 && c.r0 > p.rf) return p;
      }
    },
    calc(p) {
      const cov = p.rho * p.sA * p.sB, a = p.sA ** 2, b = p.sB ** 2;
      const port = w => ({ E: w * p.EA + (1 - w) * p.EB, s: Math.sqrt(w * w * a + (1 - w) ** 2 * b + 2 * w * (1 - w) * cov) });
      const wM = (b - cov) / (a + b - 2 * cov), M = port(wM);
      const xa = p.EA - p.rf, xb = p.EB - p.rf, wT = (xa * b - xb * cov) / (xa * b + xb * a - (xa + xb) * cov), T = port(wT);
      const sh = (T.E - p.rf) / T.s, y = (T.E - p.rf) / (p.g * T.s ** 2);
      const w0 = p.sB / (p.sA + p.sB), r0 = w0 * p.EA + (1 - w0) * p.EB;
      return { cov, wM, EM: M.E, sM: M.s, wT, ET: T.E, sT: T.s, sh, y, totA: y * wT, w0, r0 };
    },
    body: p => `<p>시장에는 위험자산 A, B와 무위험자산(수익률 <b>${pc(p.rf)}</b>)만 있다. 공매도는 가능하다.</p>`
      + tbl(['자산', '기대수익률', '표준편차', '시가총액'], [['A', pc(p.EA), pc(p.sA), fmt(p.capA) + '억원'], ['B', pc(p.EB), pc(p.sB), fmt(p.capB) + '억원']])
      + `<p>두 자산 수익률의 상관계수는 <b>${p.rho.toFixed(1)}</b>이다. 투자자 갑의 효용함수는 U = E(R<sub>P</sub>) − 0.5 × ${p.g} × σ<sub>P</sub>²이다. ※ (물음 4)는 다른 물음과 독립적이다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '최소분산 포트폴리오에서 자산 A의 투자 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.wM * 100, sol: (p, c) => `σAB = ${c.cov.toFixed(4)} → (σB² − σAB)/(σA² + σB² − 2σAB) = <b>${pct4(c.wM)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '최소분산 포트폴리오의 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.EM * 100, sol: (p, c) => `<b>${pct4(c.EM)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '최소분산 포트폴리오의 표준편차를 구하시오.', unit: '%', dp: 2, ans: c => c.sM * 100, sol: (p, c) => `<b>${pct4(c.sM)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '접점(최적위험) 포트폴리오에서 자산 A의 투자 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.wT * 100, sol: (p, c) => `[(EA−Rf)σB² − (EB−Rf)σAB] / [(EA−Rf)σB² + (EB−Rf)σA² − (EA−Rf+EB−Rf)σAB] = <b>${pct4(c.wT)}</b> (시가총액 비중과는 무관)` },
      { lab: '물음 2 ②', type: 'num', text: '접점 포트폴리오의 표준편차를 구하시오.', unit: '%', dp: 2, ans: c => c.sT * 100, sol: (p, c) => `E(R_T) = ${pct4(c.ET)}, σ_T = <b>${pct4(c.sT)}</b>` },
      { lab: '물음 2 ③', type: 'num', text: '접점 포트폴리오의 샤프비율을 구하시오.', unit: '', dp: 4, ans: c => c.sh, sol: (p, c) => `(${pct4(c.ET)} − ${pc(p.rf)})/${pct4(c.sT)} = <b>${c.sh.toFixed(6)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '투자자 갑이 접점 포트폴리오에 투자하는 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.y * 100, sol: (p, c) => `(${pct4(c.ET)} − ${pc(p.rf)})/(${p.g}×${pct4(c.sT)}²) = <b>${pct4(c.y)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '갑의 전체 재산 중 자산 A에 투자되는 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.totA * 100, sol: (p, c) => `${pct4(c.y)} × ${pct4(c.wT)} = <b>${pct4(c.totA)}</b>` },
      { lab: '물음 4 ①', type: 'num', text: '두 자산의 상관계수가 −1이라면, 무위험 포트폴리오를 만들기 위한 자산 A의 투자 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.w0 * 100, sol: (p, c) => `σB/(σA + σB) = <b>${pct4(c.w0)}</b>` },
      { lab: '물음 4 ②', type: 'num', text: '이 무위험 포트폴리오의 수익률을 구하시오. (차익거래가 없다면 무위험이자율이 되어야 하는 값)', unit: '%', dp: 2, ans: c => c.r0 * 100, sol: (p, c) => `${pct4(c.w0)}×${pc(p.EA)} + ${pct4(1 - c.w0)}×${pc(p.EB)} = <b>${pct4(c.r0)}</b>` },
    ],
  });

  P.push({
    id: 'pf-apt', unit: 'pf', pts: 15, real: true, title: '단일요인 APT: 균형식 추정, 차익거래 포트폴리오, 제로베타 차익',
    trend: '2025 문5 (단일요인 APT 차익거래) · 2019 문3 (APT 균형회복)',
    p: { l0: 0.05, l1: 0.09, bX: 1.5, bY: 0.5, bZ: 1.1, aZ: -0.014, rf: 0.035, px: 10000 },
    vary(R) {
      for (;;) {
        const l0 = R.f(0.03, 0.06, 0.005), p = { l0, l1: R.f(0.04, 0.1, 0.005), bX: R.f(1.2, 1.8, 0.1), bY: R.f(0.3, 0.8, 0.1), bZ: R.f(0.6, 1.4, 0.1), aZ: R.pick([-1, 1]) * R.f(0.008, 0.03, 0.002), rf: l0 - R.f(0.005, 0.02, 0.005), px: R.pick([10000, 20000, 50000]) };
        if (Math.abs(p.bZ - p.bX) > 0.05 && Math.abs(p.bZ - p.bY) > 0.05) return p;
      }
    },
    calc(p) {
      const E = b => p.l0 + b * p.l1, EX = E(p.bX), EY = E(p.bY), Zeq = E(p.bZ), EZ = Zeq + p.aZ;
      const w = (p.bZ - p.bY) / (p.bX - p.bY), w0 = -p.bY / (p.bX - p.bY);
      return { EX, EY, Zeq, EZ, w, amtX: w * p.px, profit: Math.abs(p.aZ) * p.px, w0, zb: (p.l0 - p.rf) * p.px };
    },
    body: (p, c) => `<p>단일요인 APT가 성립하는 경제에서 잘 분산된 포트폴리오 X, Y, Z가 거래되고 있다. 세 포트폴리오의 현재 가격은 모두 ${fmt(p.px)}원이며, 공매와 분할 거래가 가능하고 거래비용은 없다.</p>`
      + tbl(['포트폴리오', '요인 민감도(β)', '기대수익률'], [['X', p.bX.toFixed(1), pc(c.EX)], ['Y', p.bY.toFixed(1), pc(c.EY)], ['Z', p.bZ.toFixed(1), pc(c.EZ)]])
      + `<p>포트폴리오 X와 Y는 균형 상태에 있다. 차익거래는 Z 1개를 거래 단위로 하고, 이익은 1년 후에만 발생하도록 구성한다. ※ (물음 3)은 (물음 2)와 독립적이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '균형식 E(R) = λ₀ + βλ₁에서 λ₀를 구하시오.', unit: '%', dp: 2, ans: (c, p) => p.l0 * 100, sol: (p, c) => `λ₁ = (${pc(c.EX)} − ${pc(c.EY)})/(${p.bX.toFixed(1)} − ${p.bY.toFixed(1)}) = ${pc(p.l1)} → λ₀ = ${pc(c.EY)} − ${p.bY.toFixed(1)}×${pc(p.l1)} = <b>${pc(p.l0)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '요인 위험프리미엄 λ₁을 구하시오.', unit: '%', dp: 2, ans: (c, p) => p.l1 * 100, sol: (p, c) => `<b>${pc(p.l1)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '포트폴리오 Z의 균형 기대수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.Zeq * 100, sol: (p, c) => `${pc(p.l0)} + ${p.bZ.toFixed(1)}×${pc(p.l1)} = <b>${pct4(c.Zeq)}</b>` },
      { lab: '물음 2 ②', type: 'choice', text: '차익거래를 위해 포트폴리오 Z를 어떻게 거래해야 하는가?', opts: ['Z 매수 + X·Y 복제포트폴리오 매도', 'Z 매도 + X·Y 복제포트폴리오 매수'], ans: (c, p) => (p.aZ > 0 ? 0 : 1),
        sol: (p, c) => `Z의 기대수익률 ${pc(c.EZ)} ${p.aZ > 0 ? '>' : '<'} 균형 ${pct4(c.Zeq)} → ${p.aZ > 0 ? '과소평가: 매수' : '과대평가: 매도'}` },
      { lab: '물음 2 ③', type: 'num', text: 'Z와 같은 β를 갖는 복제포트폴리오에서 X의 투자 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.w * 100, sol: (p, c) => `w×${p.bX.toFixed(1)} + (1−w)×${p.bY.toFixed(1)} = ${p.bZ.toFixed(1)} → w = <b>${pct4(c.w)}</b>` },
      { lab: '물음 2 ④', type: 'num', text: '복제포트폴리오 구성 시 X의 거래금액을 구하시오.', unit: '원', dp: 0, ans: c => c.amtX, sol: (p, c) => `${pct4(c.w)} × ${fmt(p.px)} = <b>${fmt(c.amtX, 2)}</b>` },
      { lab: '물음 2 ⑤', type: 'num', text: '1년 후 차익거래이익을 구하시오.', unit: '원', dp: 0, ans: c => c.profit, sol: (p, c) => `|${pc(c.EZ)} − ${pct4(c.Zeq)}| × ${fmt(p.px)} = <b>${fmt(c.profit, 2)}</b>` },
      { lab: '물음 3', type: 'num', textf: p => `무위험이자율 ${pc(p.rf)}로 차입과 대출이 가능하다고 하자. X와 Y로 β가 0인 포트폴리오를 ${fmt(p.px)}원 만들고 무위험자산과 반대 포지션을 취할 때 1년 후 차익거래이익을 구하시오.`, unit: '원', dp: 0, ans: c => c.zb,
        sol: (p, c) => `제로베타 비중 w_X = −${p.bY.toFixed(1)}/(${p.bX.toFixed(1)} − ${p.bY.toFixed(1)}) = ${c.w0.toFixed(4)} → 기대수익률 = λ₀ = ${pc(p.l0)}<br>(${pc(p.l0)} − ${pc(p.rf)}) × ${fmt(p.px)} = <b>${fmt(c.zb, 2)}</b> (제로베타 매수, 무위험 차입)` },
      { lab: '물음 4', type: 'essay', text: '같은 차익거래를 잘 분산되지 않은 개별 주식으로 하면 무위험 차익이 되지 않는 이유를 두 줄 이내로 설명하시오.',
        model: '개별 주식에는 요인으로 설명되지 않는 고유위험(잔차)이 남아 있어, 요인 민감도를 맞춰도 실제 수익률이 기대와 달라질 수 있다. APT의 차익거래는 고유위험이 분산되어 사라진 잘 분산된 포트폴리오에서만 무위험이 된다.',
        kw: ['고유위험', '잔차', '분산', '잘 분산된', '무위험'] },
    ],
  });

  /* ───────── 채권 ───────── */
  P.push({
    id: 'bd-spot-duration', unit: 'bd', pts: 15, real: true, title: '기간구조와 이표채: 현물·선도이자율, 가격, 듀레이션·볼록성',
    trend: '2021 문5·2024 문5·2025 문6 (기간구조, 듀레이션·볼록성)',
    p: { s: [0.05, 0.06, 0.07], cpn: 0.06, corp: 0.08, spread: 0.012 },
    vary(R) {
      const s1 = R.f(0.02, 0.05, 0.005), s2 = s1 + R.f(0, 0.015, 0.005), s3 = s2 + R.f(0, 0.015, 0.005);
      return { s: [s1, s2, s3], cpn: R.f(0.03, 0.09, 0.01), corp: R.f(0.05, 0.1, 0.01), spread: R.f(0.005, 0.025, 0.001) };
    },
    calc(p) {
      const Pz = p.s.map((s, i) => Math.round(10000 * pvif(s, i + 1))), d = Pz.map(x => x / 10000);
      const s2 = Math.sqrt(1 / d[1]) - 1, f12 = d[0] / d[1] - 1, f23 = d[1] / d[2] - 1;
      const cf = [p.cpn * 10000, p.cpn * 10000, 10000 * (1 + p.cpn)], price = cf.reduce((s, x, i) => s + x * d[i], 0);
      const ytm = root(y => cf.reduce((s, x, i) => s + x / (1 + y) ** (i + 1), 0) - price, -0.5, 1);
      const pv = cf.map((x, i) => x / (1 + ytm) ** (i + 1));
      const D = pv.reduce((s, x, i) => s + (i + 1) * x, 0) / price, C = pv.reduce((s, x, i) => s + (i + 1) * (i + 2) * x, 0) / price / (1 + ytm) ** 2;
      const chg = -D / (1 + ytm) * 0.01 + 0.5 * C * 0.0001;
      return { Pz, d, s2, f12, f23, cf, price, ytm, D, C, chg };
    },
    body: (p, c) => `<p>채무불이행위험이 없고 액면가가 10,000원인 무이표 국채들의 현재 가격은 다음과 같다. 이자는 연 1회 지급한다.</p>`
      + tbl(['만기', '1년', '2년', '3년'], [['무이표채 가격', ...c.Pz.map(x => fmt(x) + '원')]])
      + ul([`같은 위험의 3년 만기 이표채 D(액면 10,000원, 액면이자율 ${pc(p.cpn)}, 연 1회 후급)가 균형가격에 거래된다.`,
        `시장에는 만기 3년, 액면이자율 ${pc(p.corp)}인 A등급 회사채도 거래되며, 국채 대비 신용스프레드는 ${(p.spread * 100).toFixed(1)}%p이다.`,
        '볼록성은 C = Σ t(t+1)·PV(CF<sub>t</sub>) ÷ [P·(1+y)²]로 정의한다.'])
      + `<p>계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '2년 만기 현물이자율을 구하시오.', unit: '%', dp: 2, ans: c => c.s2 * 100, sol: (p, c) => `(10,000/${fmt(c.Pz[1])})^(1/2) − 1 = <b>${pct4(c.s2)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '1년 후부터 1년간의 선도이자율 f(1,2)를 구하시오.', unit: '%', dp: 2, ans: c => c.f12 * 100, sol: (p, c) => `${fmt(c.Pz[0])}/${fmt(c.Pz[1])} − 1 = <b>${pct4(c.f12)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '2년 후부터 1년간의 선도이자율 f(2,3)을 구하시오.', unit: '%', dp: 2, ans: c => c.f23 * 100, sol: (p, c) => `${fmt(c.Pz[1])}/${fmt(c.Pz[2])} − 1 = <b>${pct4(c.f23)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '이표채 D의 균형가격을 구하시오.', unit: '원', dp: 2, ans: c => c.price, sol: (p, c) => `${c.cf.map((x, i) => `${fmt(x)}×${c.d[i].toFixed(4)}`).join(' + ')} = <b>${fmt(c.price, 4)}</b> (회사채 정보는 쓰지 않음)` },
      { lab: '물음 2 ②', type: 'num', text: '이표채 D의 만기수익률을 구하시오.', unit: '%', dp: 2, ans: c => c.ytm * 100, sol: (p, c) => `가격 = Σ CF/(1+y)ᵗ → <b>${pct4(c.ytm)}</b>` },
      { lab: '물음 2 ③', type: 'num', text: '만기수익률 기준 이표채 D의 맥컬리 듀레이션을 구하시오.', unit: '년', dp: 4, ans: c => c.D, sol: (p, c) => `Σ t·PV(CFt)/P = <b>${c.D.toFixed(6)}</b>` },
      { lab: '물음 2 ④', type: 'num', text: '이표채 D의 볼록성을 구하시오.', unit: '', dp: 4, ans: c => c.C, sol: (p, c) => `Σ t(t+1)·PV/[P(1+y)²] = <b>${c.C.toFixed(6)}</b>` },
      { lab: '물음 3', type: 'num', text: '만기수익률이 1%p 상승할 때 듀레이션과 볼록성을 함께 이용해 추정한 이표채 D의 가격변화율을 구하시오. (하락은 음수)', unit: '%', dp: 2, ans: c => c.chg * 100,
        sol: (p, c) => `−D/(1+y)×Δy + ½×C×Δy² = −${(c.D / (1 + c.ytm)).toFixed(4)}×0.01 + 0.5×${c.C.toFixed(4)}×0.0001 = <b>${pct4(c.chg)}</b>` },
      { lab: '물음 4', type: 'essay', text: '유동성프리미엄가설이 성립할 때, 물음 1에서 구한 선도이자율이 미래의 기대 현물이자율과 어떤 관계인지 두 줄 이내로 설명하시오.',
        model: '유동성프리미엄가설에서는 투자자가 장기채의 가격위험에 대한 보상을 요구하므로, 선도이자율은 기대 현물이자율에 유동성프리미엄을 더한 값이다. 따라서 선도이자율은 미래 기대 현물이자율보다 높게(상향 편의) 형성된다.',
        kw: ['유동성프리미엄', '기대 현물이자율', '더한', '높', '편의'] },
    ],
  });

  P.push({
    id: 'bd-immunization', unit: 'bd', pts: 15, real: true, title: '이표채와 무이표채로 목표시기 면역전략과 1년 후 재조정',
    trend: '2019 문6·2026 문6 (면역전략, 재조정)',
    p: { y: 0.08, H: 4, L: 20000, z: 2, n: 6, c: 0.1, oldY: 0.065 },
    vary(R) {
      for (;;) {
        const p = { y: R.f(0.04, 0.1, 0.005), H: R.int(3, 6, 1), L: R.int(5000, 30000, 1000), z: R.int(1, 2, 1), n: R.int(6, 10, 1), c: R.f(0.03, 0.12, 0.01), oldY: R.f(0.03, 0.09, 0.005) };
        const k = this.calc(p);
        if (k.D > p.H + 0.3 && k.D1 > p.H - 1 + 0.3 && p.z < p.H - 1) return p;
      }
    },
    calc(p) {
      const bond = n => { const cf = [...Array(n)].map((_, i) => 10000 * p.c + (i === n - 1 ? 10000 : 0)), pv = cf.map((x, i) => x / (1 + p.y) ** (i + 1)), P = pv.reduce((a, b) => a + b, 0); return { P, D: pv.reduce((s, x, i) => s + (i + 1) * x, 0) / P }; };
      const pvL = p.L / (1 + p.y) ** p.H, B = bond(p.n), w = (B.D - p.H) / (B.D - p.z), amtZ = w * pvL, units = (1 - w) * pvL * 1e4 / B.P;
      const B1 = bond(p.n - 1), w1 = (B1.D - (p.H - 1)) / (B1.D - (p.z - 1 || 0));
      return { pvL, price: B.P, D: B.D, w, amtZ, units, D1: B1.D, w1 };
    },
    body: p => `<p>보험사 ㈜한결생명은 <b>${p.H}년 후</b>에 <b>${fmt(p.L)}만원</b>을 지급해야 하는 부채가 있다. 수익률곡선은 <b>${pc(p.y)}</b>에서 수평이며 평행이동한다.</p>`
      + ul([`투자 가능한 자산은 ${p.z}년 만기 무이표채와, 만기 ${p.n}년·액면 10,000원·액면이자율 ${pc(p.c)}(연 1회 후급)인 이표채이다.`,
        `이 부채는 계약 당시 연 ${pc(p.oldY)}의 예정이율로 책정되었다.`,
        '자산과 부채의 현재가치와 듀레이션을 일치시키는 방식으로 면역한다.'])
      + `<p>※ (물음 3)은 1년이 지나 이표채 이자를 받은 직후이며, 그동안 수익률곡선은 변하지 않았다고 가정한다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '부채의 현재가치를 구하시오.', unit: '만원', dp: 2, ans: c => c.pvL, sol: (p, c) => `${fmt(p.L)}/(1+${p.y})^${p.H} = <b>${c.pvL.toFixed(4)}</b> (예정이율은 쓰지 않음)` },
      { lab: '물음 1 ②', type: 'num', text: '이표채의 현재 가격을 구하시오.', unit: '원', dp: 2, ans: c => c.price, sol: (p, c) => `Σ ${fmt(10000 * p.c)}/(1+y)ᵗ + 10,000/(1+y)^${p.n} = <b>${c.price.toFixed(4)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '이표채의 듀레이션을 구하시오.', unit: '년', dp: 4, ans: c => c.D, sol: (p, c) => `<b>${c.D.toFixed(6)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '면역을 위해 무이표채에 투자해야 하는 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.w * 100, sol: (p, c) => `w×${p.z} + (1−w)×${c.D.toFixed(4)} = ${p.H} → w = <b>${pct4(c.w)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '무이표채 투자금액을 구하시오.', unit: '만원', dp: 2, ans: c => c.amtZ, sol: (p, c) => `${c.pvL.toFixed(4)} × ${pct4(c.w)} = <b>${c.amtZ.toFixed(4)}</b>` },
      { lab: '물음 2 ③', type: 'num', text: '매입해야 하는 이표채의 수량을 구하시오.', unit: '개', dp: 2, ans: c => c.units, sol: (p, c) => `(1 − w)×${c.pvL.toFixed(2)}만원 ÷ ${c.price.toFixed(2)}원 = <b>${c.units.toFixed(4)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '1년 후 이표채(잔존만기 1년 단축)의 듀레이션을 구하시오.', unit: '년', dp: 4, ans: c => c.D1, sol: (p, c) => `잔존 ${p.n - 1}년 이표채 → <b>${c.D1.toFixed(6)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '1년 후 면역을 유지하기 위한 무이표채의 새 투자 비중을 구하시오.', unit: '%', dp: 2, ans: c => c.w1 * 100,
        sol: (p, c) => `부채 듀레이션 ${p.H - 1}년, 무이표채 듀레이션 ${p.z - 1}년 → w×${p.z - 1} + (1−w)×${c.D1.toFixed(4)} = ${p.H - 1} → <b>${pct4(c.w1)}</b>` },
      { lab: '물음 4', type: 'essay', text: '수익률곡선이 변하지 않았는데도 1년 후 포트폴리오를 재조정해야 하는 이유를 두 줄 이내로 설명하시오.',
        model: '시간이 1년 지나면 부채의 듀레이션은 정확히 1년 줄지만, 이표채의 듀레이션은 이자 지급 구조 때문에 1년보다 적게 줄어든다. 자산과 부채의 듀레이션이 다시 어긋나므로 비중을 재조정해야 면역이 유지된다.',
        kw: ['듀레이션', '1년', '적게', '어긋', '재조정'] },
    ],
  });

  /* ───────── 파생상품 ───────── */
  P.push({
    id: 'dv-binomial', unit: 'dv', pts: 15, real: true, title: '2기간 이항모형: 유럽형 콜의 복제·델타 조정과 미국형 풋의 조기행사',
    trend: '2017 문7·2021 문7·2026 문7 (다기간 이항, 미국형)',
    p: { S: 10000, u: 1.2, d: 0.9, r: 0.05, K: 10000, Kp: 10500, pu: 0.6 },
    vary(R) {
      for (;;) {
        const S = R.int(8000, 20000, 1000), u = R.f(1.1, 1.3, 0.05), d = R.f(0.8, 0.95, 0.05), r = R.f(0.02, 0.08, 0.01);
        if (!(d < 1 + r && 1 + r < u)) continue;
        const p = { S, u, d, r, K: Math.round(S * R.f(0.9, 1.1, 0.05) / 100) * 100, Kp: Math.round(S * R.f(1.0, 1.15, 0.05) / 100) * 100, pu: R.f(0.4, 0.7, 0.05) };
        const c = this.calc(p);
        if (c.C0 > 0 && c.Cd > 0 && c.ex.filter(Boolean).length <= 1 && c.am - c.eu > 0.5) return p;
        if (c.C0 > 0 && c.Cd > 0 && c.ex.every(x => !x)) return p;
      }
    },
    calc(p) {
      const q = (1 + p.r - p.d) / (p.u - p.d), R1 = 1 + p.r, S = p.S;
      const Suu = S * p.u * p.u, Sud = S * p.u * p.d, Sdd = S * p.d * p.d;
      const c = [Suu, Sud, Sdd].map(s => Math.max(s - p.K, 0)), Cu = (q * c[0] + (1 - q) * c[1]) / R1, Cd = (q * c[1] + (1 - q) * c[2]) / R1, C0 = (q * Cu + (1 - q) * Cd) / R1;
      const D0 = (Cu - Cd) / (S * (p.u - p.d)), B0 = D0 * S - C0, Du = (c[0] - c[1]) / (S * p.u * (p.u - p.d));
      const pl = [Suu, Sud, Sdd].map(s => Math.max(p.Kp - s, 0));
      const eu = (q * q * pl[0] + 2 * q * (1 - q) * pl[1] + (1 - q) ** 2 * pl[2]) / R1 ** 2;
      const node = (s, a, b) => { const cont = (q * a + (1 - q) * b) / R1, x = Math.max(p.Kp - s, 0); return { v: Math.max(cont, x), early: x > cont + 1e-9 }; };
      const nu = node(S * p.u, pl[0], pl[1]), nd = node(S * p.d, pl[1], pl[2]), n0 = node(S, nu.v, nd.v);
      return { q, Suu, Sud, Sdd, c, Cu, Cd, C0, D0, B0, Du, pl, eu, nu, nd, am: n0.v, ex: [nu.early, nd.early] };
    },
    body: p => `<p>무배당 주식 ㈜새온의 현재 주가는 <b>${fmt(p.S)}원</b>이다. 1기간은 1년이며, 매 기간 주가는 <b>${p.u}배</b>로 오르거나 <b>${p.d}배</b>로 내린다. 투자자들이 예상하는 주가 상승 확률은 ${pc(p.pu)}이고, 무위험이자율은 기간당 <b>${pc(p.r)}</b>이다. 공매와 분할 거래가 가능하고 거래비용은 없다.</p>`
      + `<p>잔존만기 2기간인 유럽형 콜옵션(행사가격 ${fmt(p.K)}원)과 미국형 풋옵션(행사가격 ${fmt(p.Kp)}원)이 거래되고 있다. 계산과정에서는 소수점 아래 다섯째 자리에서 반올림하여 넷째 자리까지 표시한다.</p>`,
    qs: [
      { lab: '물음 1', type: 'num', text: '위험중립 상승확률을 구하시오.', unit: '', dp: 4, ans: c => c.q, sol: (p, c) => `(1 + ${p.r} − ${p.d})/(${p.u} − ${p.d}) = <b>${c.q.toFixed(6)}</b> (투자자 예상 확률 ${pc(p.pu)}는 쓰지 않음)` },
      { lab: '물음 2 ①', type: 'num', text: '유럽형 콜옵션의 현재 가격을 구하시오.', unit: '원', dp: 2, ans: c => c.C0,
        sol: (p, c) => `만기 가치(uu, ud, dd) = ${c.c.map(x => fmt(x, 2)).join(', ')}<br>Cu = ${c.Cu.toFixed(4)}, Cd = ${c.Cd.toFixed(4)} → C₀ = <b>${c.C0.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '현재 콜옵션 1개를 복제하기 위해 보유해야 하는 주식 수(델타)를 구하시오.', unit: '주', dp: 4, ans: c => c.D0, sol: (p, c) => `(Cu − Cd)/(Su − Sd) = <b>${c.D0.toFixed(6)}</b>` },
      { lab: '물음 2 ③', type: 'num', text: '현재 복제포트폴리오의 무위험 차입액을 구하시오.', unit: '원', dp: 2, ans: c => c.B0, sol: (p, c) => `ΔS − C₀ = ${c.D0.toFixed(4)}×${fmt(p.S)} − ${c.C0.toFixed(4)} = <b>${c.B0.toFixed(4)}</b>` },
      { lab: '물음 2 ④', type: 'num', text: '1년 후 주가가 상승했을 때 복제를 유지하기 위한 새 델타를 구하시오.', unit: '주', dp: 4, ans: c => c.Du, sol: (p, c) => `(Cuu − Cud)/(Suu − Sud) = <b>${c.Du.toFixed(6)}</b>` },
      { lab: '물음 3 ①', type: 'num', text: '미국형 풋옵션의 현재 가격을 구하시오.', unit: '원', dp: 2, ans: c => c.am,
        sol: (p, c) => `만기 가치 = ${c.pl.map(x => fmt(x, 2)).join(', ')}<br>상승 노드 ${c.nu.v.toFixed(4)}${c.nu.early ? ' (조기행사)' : ''}, 하락 노드 ${c.nd.v.toFixed(4)}${c.nd.early ? ' (조기행사)' : ''} → <b>${c.am.toFixed(4)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '조건이 같은 유럽형 풋옵션의 가격을 구하시오.', unit: '원', dp: 2, ans: c => c.eu, sol: (p, c) => `[q²×${fmt(c.pl[0], 2)} + 2q(1−q)×${fmt(c.pl[1], 2)} + (1−q)²×${fmt(c.pl[2], 2)}]/${(1 + p.r).toFixed(2)}² = <b>${c.eu.toFixed(4)}</b>` },
      { lab: '물음 3 ③', type: 'choice', text: '1년 후 미국형 풋옵션을 조기행사하는 것이 최적인 경우는?', opts: ['주가가 상승한 노드', '주가가 하락한 노드', '조기행사가 최적인 노드 없음'], ans: c => (c.ex[0] ? 0 : c.ex[1] ? 1 : 2),
        sol: (p, c) => `상승 노드: 즉시행사 ${fmt(Math.max(p.Kp - p.S * p.u, 0), 2)} vs 보유 → ${c.nu.early ? '행사' : '보유'}, 하락 노드: 즉시행사 ${fmt(Math.max(p.Kp - p.S * p.d, 0), 2)} → ${c.nd.early ? '행사' : '보유'}` },
      { lab: '물음 4', type: 'essay', text: '이 주식에 대한 미국형 콜옵션은 유럽형 콜옵션과 가치가 같은데, 미국형 풋옵션은 유럽형 풋옵션보다 비쌀 수 있는 이유를 두 줄 이내로 설명하시오.',
        model: '무배당 주식의 콜은 일찍 행사하면 시간가치와 행사가격에 대한 이자를 잃으므로 조기행사하지 않아 미국형과 유럽형의 가치가 같다. 풋은 주가가 충분히 낮으면 행사가격을 일찍 받아 이자를 얻는 이득이 커서 조기행사가 합리적일 수 있으므로 미국형이 더 비싸다.',
        kw: ['조기행사', '시간가치', '이자', '행사가격', '무배당'] },
    ],
  });

  P.push({
    id: 'dv-futures', unit: 'dv', pts: 15, real: true, title: '주가지수선물: 이론가격·차익거래·베타 조정과 헤지 성과',
    trend: '2023 문7·2025 문7 (지수선물 헤지, 차익거래)',
    p: { S: 350, r: 0.05, dy: 0.02, T: 0.5, gap: 0.75, V: 50, beta: 1.2, tb: 0.5, ST: 315, vol: 0.18 },
    vary(R) {
      const S = R.int(250, 450, 5);
      return { S, r: R.f(0.02, 0.06, 0.005), dy: R.f(0.005, 0.03, 0.005), T: R.pick([0.25, 0.5, 0.75, 1]), gap: R.pick([-1, 1]) * R.f(0.5, 3, 0.25),
        V: R.int(20, 100, 10), beta: R.f(0.8, 1.5, 0.1), tb: R.f(0.1, 0.7, 0.1), ST: Math.round(S * R.f(0.85, 1.15, 0.01)), vol: R.f(0.12, 0.3, 0.01) };
    },
    calc(p) {
      const F = p.S * (1 + (p.r - p.dy) * p.T), Fm = Math.round((F + p.gap) * 100) / 100, M = 250000;
      const n0 = p.beta * p.V * 1e8 / (Fm * M), nt = (p.beta - p.tb) * p.V * 1e8 / (Fm * M);
      const dPort = p.V * p.beta * (p.ST - p.S) / p.S, dFut = n0 * (Fm - p.ST) * M / 1e8;
      return { F, Fm, profit: Math.abs(Fm - F) * M, n0, nt, dPort, dFut, total: dPort + dFut };
    },
    body: (p, c) => `<p>현재 K지수는 <b>${p.S.toFixed(2)}</b>이고, 무위험이자율은 연 <b>${pc(p.r)}</b>, 지수의 연간 배당수익률은 <b>${pc(p.dy)}</b>이다. 잔존만기 <b>${p.T * 12}개월</b>인 K지수선물이 시장에서 <b>${c.Fm.toFixed(2)}</b>에 거래되고 있다.</p>`
      + ul(['선물 1계약의 승수는 250,000원이며, 선물은 만기에 현금으로 정산된다.', '이론가격은 F = S × [1 + (r − d) × T]로 계산한다.',
        `K지수 수익률의 연간 변동성은 ${pc(p.vol)}로 추정된다.`, `펀드 갑은 베타 ${p.beta.toFixed(1)}인 잘 분산된 주식 포트폴리오 ${p.V}억원을 보유하고 있다.`,
        '선물 계약은 소수점 이하로도 거래할 수 있다고 가정한다.'])
      + `<p>※ (물음 3)은 (물음 1)·(물음 2)와 독립적이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: 'K지수선물의 이론가격을 구하시오.', unit: 'pt', dp: 2, ans: c => c.F, sol: (p, c) => `${p.S}×[1 + (${p.r} − ${p.dy})×${p.T}] = <b>${c.F.toFixed(4)}</b> (변동성은 쓰지 않음)` },
      { lab: '물음 1 ②', type: 'choice', text: '가능한 차익거래 전략은?', opts: ['선물 매도 + 현물(지수) 매수', '선물 매수 + 현물(지수) 공매도'], ans: c => (c.Fm > c.F ? 0 : 1), sol: (p, c) => `시장 ${c.Fm.toFixed(2)} ${c.Fm > c.F ? '>' : '<'} 이론 ${c.F.toFixed(2)}` },
      { lab: '물음 1 ③', type: 'num', text: '선물 1계약 기준 만기 차익거래이익을 구하시오.', unit: '원', dp: 0, ans: c => c.profit, sol: (p, c) => `|${c.Fm.toFixed(2)} − ${c.F.toFixed(4)}| × 250,000 = <b>${fmt(c.profit, 2)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '펀드 갑이 시장가격의 선물로 포트폴리오의 체계적위험을 완전히 없애려면 몇 계약을 매도해야 하는가?', unit: '계약', dp: 2, ans: c => c.n0, sol: (p, c) => `${p.beta.toFixed(1)}×${p.V}억 ÷ (${c.Fm.toFixed(2)}×250,000) = <b>${c.n0.toFixed(4)}</b>` },
      { lab: '물음 2 ②', type: 'num', textf: p => `베타를 ${p.tb.toFixed(1)}로 낮추려면 몇 계약을 매도해야 하는가?`, unit: '계약', dp: 2, ans: c => c.nt, sol: (p, c) => `(${p.beta.toFixed(1)} − ${p.tb.toFixed(1)})×${p.V}억 ÷ (${c.Fm.toFixed(2)}×250,000) = <b>${c.nt.toFixed(4)}</b>` },
      { lab: '물음 3 ①', type: 'num', textf: p => `물음 2 ①의 완전 헤지를 실행한 뒤 만기에 K지수가 ${p.ST.toFixed(2)}가 되었다. 포트폴리오 가치는 베타만큼 지수 변화율을 따른다고 할 때, 포트폴리오의 가치 변화를 구하시오. (감소는 음수)`, unit: '억원', dp: 2, ans: c => c.dPort,
        sol: (p, c) => `${p.V} × ${p.beta.toFixed(1)} × (${p.ST} − ${p.S})/${p.S} = <b>${c.dPort.toFixed(4)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '같은 기간 선물 매도 포지션의 손익을 구하시오.', unit: '억원', dp: 2, ans: c => c.dFut, sol: (p, c) => `${c.n0.toFixed(4)} × (${c.Fm.toFixed(2)} − ${p.ST}) × 250,000 = <b>${c.dFut.toFixed(4)}</b>` },
      { lab: '물음 3 ③', type: 'num', text: '헤지 후 전체 손익(포트폴리오 + 선물)을 구하시오.', unit: '억원', dp: 2, ans: c => c.total, sol: (p, c) => `${c.dPort.toFixed(4)} + ${c.dFut.toFixed(4)} = <b>${c.total.toFixed(4)}</b>` },
      { lab: '물음 4', type: 'essay', text: '베타로 계약 수를 정해 헤지해도 손익이 정확히 0이 되지 않는 이유를 두 줄 이내로 설명하시오.',
        model: '선물가격에는 이자와 배당을 반영한 보유비용(베이시스)이 포함되어 현물과 다르게 움직이고, 포트폴리오에는 지수로 설명되지 않는 비체계적위험과 베타 추정오차가 있다. 따라서 베이시스 위험과 잔차위험이 남아 손익이 정확히 상쇄되지 않는다.',
        kw: ['베이시스', '보유비용', '비체계적', '베타', '추정'] },
    ],
  });

  /* ───────── 기업재무 ───────── */
  P.push({
    id: 'cf-mm', unit: 'cf', pts: 15, real: true, title: 'MM(1963): 기업가치·자본비용, 개인 차입을 이용한 차익거래, 자본재구성',
    trend: '2017 문1·2023 문4 (MM 1963, 차익거래)',
    p: { ebit: 100, t: 0.25, rho: 0.12, D: 300, rd: 0.08, EL: 450, a: 0.1, N: 1e7, Dn: 200, pt: 0.154 },
    vary(R) {
      for (;;) {
        const ebit = R.int(50, 200, 10), t = R.pick([0.2, 0.22, 0.25, 0.3]), rho = R.f(0.1, 0.16, 0.01), VU = ebit * (1 - t) / rho;
        const D = Math.round(VU * R.f(0.2, 0.6, 0.05) / 10) * 10, Eeq = VU + t * D - D;
        const p = { ebit, t, rho, D, rd: R.f(0.04, rho - 0.02, 0.005), EL: Math.round(Eeq * R.f(1.03, 1.15, 0.01) / 5) * 5, /* 보유 투자자가 차익거래할 수 있도록 고평가 상황 */ a: R.pick([0.05, 0.1, 0.2]), N: R.pick([5e6, 1e7, 2e7]), Dn: Math.round(VU * R.f(0.1, 0.4, 0.05) / 10) * 10, pt: R.pick([0.154, 0.22]) };
        if (Math.abs(p.EL - Eeq) > 2) return p;
      }
    },
    calc(p) {
      const VU = p.ebit * (1 - p.t) / p.rho, VL = VU + p.t * p.D, E = VL - p.D;
      const rE = p.rho + (p.rho - p.rd) * (1 - p.t) * p.D / E, wacc = p.rho * (1 - p.t * p.D / VL);
      const profit = Math.abs(p.a * (p.EL - E)), over = p.EL > E;
      const Pn = (VU + p.t * p.Dn) * 1e8 / p.N, buy = p.Dn * 1e8 / Pn;
      return { VU, VL, E, rE, wacc, profit, over, Pn, buy };
    },
    body: p => `<p>영업위험이 같은 두 기업 ㈜한강(무부채)과 ㈜낙동(부채 사용)은 매년 영업이익(EBIT) <b>${fmt(p.ebit)}억원</b>이 영구히 발생한다. MM(1963)이 성립한다.</p>`
      + ul([`법인세율은 ${pc(p.t)}, 무부채기업의 자기자본비용은 ${pc(p.rho)}이다.`, `㈜낙동은 이자율 ${pc(p.rd)}의 영구부채 ${fmt(p.D)}억원을 사용하고 있으며, 개인도 같은 이자율로 차입·대출할 수 있다.`,
        `현재 시장에서 ㈜낙동 자기자본의 시장가치는 ${fmt(p.EL)}억원이다.`, `㈜한강의 발행주식수는 ${fmt(p.N)}주이다.`, `이자·배당소득에 대한 개인소득세율은 ${pc(p.pt)}이지만, MM(1963)의 가정대로 개인소득세는 없는 것으로 본다.`])
      + `<p>※ (물음 1)에서는 두 기업이 균형가격에 있다고 가정하고, (물음 2)와 (물음 3)은 서로 독립적이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '㈜한강의 기업가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.VU, sol: (p, c) => `${fmt(p.ebit)}×(1−${p.t})/${p.rho} = <b>${c.VU.toFixed(4)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '㈜낙동의 균형 기업가치를 구하시오.', unit: '억원', dp: 2, ans: c => c.VL, sol: (p, c) => `${c.VU.toFixed(4)} + ${p.t}×${fmt(p.D)} = <b>${c.VL.toFixed(4)}</b>` },
      { lab: '물음 1 ③', type: 'num', text: '㈜낙동의 균형 자기자본비용을 구하시오.', unit: '%', dp: 2, ans: c => c.rE * 100, sol: (p, c) => `E = ${c.E.toFixed(4)} → ${pc(p.rho)} + (${pc(p.rho)} − ${pc(p.rd)})×(1−${p.t})×${fmt(p.D)}/${c.E.toFixed(4)} = <b>${pct4(c.rE)}</b>` },
      { lab: '물음 1 ④', type: 'num', text: '㈜낙동의 가중평균자본비용을 구하시오.', unit: '%', dp: 2, ans: c => c.wacc * 100, sol: (p, c) => `${pc(p.rho)}×(1 − ${p.t}×${fmt(p.D)}/${c.VL.toFixed(4)}) = <b>${pct4(c.wacc)}</b>` },
      { lab: '물음 2 ①', type: 'choice', textf: p => `㈜낙동 주식의 ${pc(p.a)}를 보유한 투자자의 차익거래 전략은?`, opts: ['㈜낙동 주식 매도 + 개인 차입 + ㈜한강 주식 매수', '㈜한강 주식 매도 + 개인 대출 + ㈜낙동 주식 매수'], ans: c => (c.over ? 0 : 1),
        sol: (p, c) => `시장 ${fmt(p.EL)} ${c.over ? '>' : '<'} 균형 ${c.E.toFixed(2)} → ㈜낙동 ${c.over ? '고평가: 팔고, 지분율만큼 (1−t)D를 차입해 ㈜한강을 산다' : '저평가'}` },
      { lab: '물음 2 ②', type: 'num', text: '이 투자자의 현재 시점 차익거래이익을 구하시오.', unit: '억원', dp: 2, ans: c => c.profit,
        sol: (p, c) => `${pc(p.a)} × [${fmt(p.EL)} + (1−${p.t})×${fmt(p.D)} − ${c.VU.toFixed(4)}] = <b>${c.profit.toFixed(4)}</b> (= 지분율 × 시장가치와 균형가치의 차이)` },
      { lab: '물음 3 ①', textf: p => `㈜한강이 영구부채 ${fmt(p.Dn)}억원을 조달해 자기주식을 매입한다고 발표했다. 발표 직후의 주가를 구하시오.`, type: 'num', unit: '원', dp: 0, ans: c => c.Pn,
        sol: (p, c) => `(${c.VU.toFixed(4)} + ${p.t}×${fmt(p.Dn)})억 ÷ ${fmt(p.N)}주 = <b>${fmt(c.Pn, 2)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '매입하는 자기주식 수를 구하시오.', unit: '주', dp: 0, ans: c => c.buy, sol: (p, c) => `${fmt(p.Dn)}억 ÷ ${fmt(c.Pn, 2)} = <b>${fmt(c.buy, 2)}</b>` },
      { lab: '물음 4', type: 'essay', text: '현실에서 기업이 MM(1963)의 결론처럼 부채를 극단적으로 늘리지 않는 이유를 두 가지 제시하시오.',
        model: '① 부채가 늘면 재무적 곤경비용(파산비용)이 커져 이자 절세효과를 상쇄한다(상충이론). ② 주주-채권자 사이의 대리비용(위험이전·과소투자)이 커지며, 개인소득세까지 고려하면 부채의 세금 이점도 줄어든다(Miller).',
        kw: ['파산비용', '재무적 곤경', '대리비용', '개인소득세', '상충'] },
    ],
  });

  P.push({
    id: 'cf-merger-eps', unit: 'cf', pts: 15, real: true, title: '합병: 교환비율과 EPS 효과, 주식교환·현금인수의 NPV',
    trend: '2017 문2·2019 문2·2025 문2 (교환비율, 합병 NPV)',
    p: { niA: 300, shA: 1e7, perA: 15, niT: 60, shT: 4e6, perT: 10, prem: 0.2, syn: 24, perN: 14, cashP: 18500, adv: 3 },
    vary(R) {
      for (;;) {
        const p = { niA: R.int(200, 500, 20), shA: R.pick([1e7, 2e7]), perA: R.int(12, 20, 1), niT: R.int(30, 100, 5), shT: R.int(2e6, 6e6, 1e6), perT: R.int(8, 14, 1),
          prem: R.pick([0.1, 0.2, 0.3]), syn: R.int(10, 40, 2), perN: R.f(12, 18, 0.5), cashP: 0, adv: R.int(1, 5, 1) };
        const c0 = this.calc(Object.assign({}, p, { cashP: 1 }));
        p.cashP = Math.round(c0.pT * R.f(1.1, 1.35, 0.05) / 100) * 100;
        const c = this.calc(p);
        if (c.newMax > c.newSh && c.npvCash > -50) return p;
      }
    },
    calc(p) {
      const epsA = p.niA * 1e8 / p.shA, epsT = p.niT * 1e8 / p.shT;
      const pA = Math.round(p.perA * epsA / 100) * 100, pT = Math.round(p.perT * epsT / 100) * 100;
      const VA = pA * p.shA / 1e8, er = pT * (1 + p.prem) / pA, newSh = er * p.shT;
      const epsN = (p.niA + p.niT) * 1e8 / (p.shA + newSh);
      const VAB = p.perN * (p.niA + p.niT + p.syn);           // 합병 후 시장가치(억원)
      const priceN = VAB * 1e8 / (p.shA + newSh), npvStock = (priceN - pA) * p.shA / 1e8;
      const npvCash = VAB - VA - p.cashP * p.shT / 1e8, newMax = p.shA * (VAB / VA - 1);
      return { epsA, epsT, pA, pT, VA, er, newSh, epsN, VAB, priceN, npvStock, npvCash, newMax };
    },
    body: (p, c) => `<p>㈜서해는 ㈜남해를 흡수합병하려 한다. 두 기업은 무부채기업이며 금액 단위는 억원이다.</p>`
      + tbl(['구분', '㈜서해', '㈜남해'], [['당기순이익', `${fmt(p.niA)}억원`, `${fmt(p.niT)}억원`], ['발행주식수', `${fmt(p.shA)}주`, `${fmt(p.shT)}주`], ['주가', `${fmt(c.pA)}원`, `${fmt(c.pT)}원`]])
      + ul([`주식교환 방식이라면 ㈜남해 주가에 ${pc(p.prem)}의 프리미엄을 붙인 금액을 ㈜서해 주식으로 지급한다.`,
        `합병 후에는 매년 순이익이 ${fmt(p.syn)}억원 추가로 늘고, 시장은 합병기업에 PER ${p.perN}배를 적용할 것으로 예상된다.`,
        `합병 자문 수수료 ${p.adv}억원은 이미 지급하였고 합병 여부와 관계없이 돌려받을 수 없다.`])
      + `<p>※ (물음 2)는 시너지가 없다고 가정하고, (물음 4)는 (물음 3)과 독립적이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '주식교환비율(㈜남해 1주당 ㈜서해 주식 수)을 구하시오.', unit: '주', dp: 4, ans: c => c.er, sol: (p, c) => `${fmt(c.pT)}×(1+${p.prem})/${fmt(c.pA)} = <b>${c.er.toFixed(6)}</b>` },
      { lab: '물음 1 ②', type: 'num', text: '합병 시 발행하는 신주 수를 구하시오.', unit: '주', dp: 0, ans: c => c.newSh, sol: (p, c) => `${c.er.toFixed(6)}×${fmt(p.shT)} = <b>${fmt(c.newSh, 2)}</b>` },
      { lab: '물음 2 ①', type: 'num', text: '시너지가 없을 때 합병 후 EPS를 구하시오.', unit: '원', dp: 2, ans: c => c.epsN, sol: (p, c) => `(${fmt(p.niA)}+${fmt(p.niT)})억 ÷ (${fmt(p.shA)} + ${fmt(c.newSh, 0)}) = <b>${c.epsN.toFixed(4)}</b> (합병 전 ${c.epsA.toFixed(2)})` },
      { lab: '물음 2 ②', type: 'choice', text: '기존 ㈜서해 주주의 EPS는 어떻게 변하는가?', opts: ['증가', '감소'], ans: c => (c.epsN > c.epsA ? 0 : 1), sol: (p, c) => `${c.epsA.toFixed(2)} → ${c.epsN.toFixed(2)}: 피합병기업의 PER(지불 기준)이 합병기업보다 ${c.epsN > c.epsA ? '낮아 증가' : '높아 감소'}` },
      { lab: '물음 3 ①', type: 'num', text: '시너지와 합병 후 PER을 반영한 합병 후 ㈜서해의 주가를 구하시오.', unit: '원', dp: 2, ans: c => c.priceN, sol: (p, c) => `${p.perN}×(${fmt(p.niA)}+${fmt(p.niT)}+${fmt(p.syn)})억 = ${c.VAB.toFixed(2)}억 → ÷ ${fmt(p.shA + c.newSh, 0)}주 = <b>${c.priceN.toFixed(4)}</b>` },
      { lab: '물음 3 ②', type: 'num', text: '주식교환 합병의 NPV(기존 ㈜서해 주주의 부의 변화)를 구하시오.', unit: '억원', dp: 2, ans: c => c.npvStock, sol: (p, c) => `(${c.priceN.toFixed(2)} − ${fmt(c.pA)}) × ${fmt(p.shA)} = <b>${c.npvStock.toFixed(4)}</b> (자문 수수료는 매몰원가)` },
      { lab: '물음 4 ①', type: 'num', textf: p => `주식교환 대신 ㈜남해 주식을 주당 ${fmt(p.cashP)}원에 현금으로 인수한다면 합병의 NPV는?`, unit: '억원', dp: 2, ans: c => c.npvCash,
        sol: (p, c) => `${c.VAB.toFixed(4)} − ${c.VA.toFixed(2)} − ${fmt(p.cashP)}×${fmt(p.shT)}/1억 = <b>${c.npvCash.toFixed(4)}</b>` },
      { lab: '물음 4 ②', type: 'num', text: '주식교환 방식에서 ㈜서해 주주가 손해를 보지 않고 교부할 수 있는 최대 신주 수를 구하시오.', unit: '주', dp: 0, ans: c => c.newMax,
        sol: (p, c) => `${fmt(p.shA)} × (${c.VAB.toFixed(4)}/${c.VA.toFixed(2)} − 1) = <b>${fmt(c.newMax, 2)}</b>` },
      { lab: '물음 5', type: 'essay', text: '합병 후 EPS가 늘어난다는 사실만으로 합병이 기존 주주에게 유리하다고 판단할 수 없는 이유를 두 줄 이내로 설명하시오.',
        model: 'PER이 낮은 기업을 주식으로 인수하면 시너지가 없어도 EPS가 기계적으로 늘어나지만(부트스트래핑), 시장은 결합기업의 위험과 성장성을 반영해 PER을 낮춰 평가하므로 주가는 오르지 않을 수 있다. 주주의 부는 EPS가 아니라 시너지와 지불 대가로 결정되는 합병 NPV로 판단해야 한다.',
        kw: ['부트스트래핑', 'PER', '시너지', 'NPV', '주가'] },
    ],
  });

  P.push({
    id: 'cf-payout', unit: 'cf', pts: 15, real: true, title: '배당정책: 현금배당·자사주 매입·주식배당과 자가배당',
    trend: '2020 문3·2024 문2 (자사주 매입, 주주 부)',
    p: { val: 1200, cash: 100, sh: 1e7, ni: 90, sdiv: 0.1, own: 1000, want: 500000, tax: 0.154 },
    vary(R) {
      const sh = R.pick([5e6, 1e7, 2e7]);
      return { val: R.int(600, 3000, 100), cash: R.int(50, 300, 10), sh, ni: R.int(40, 200, 5), sdiv: R.pick([0.05, 0.1, 0.2]), own: R.int(500, 5000, 500), want: R.int(100000, 2000000, 100000), tax: R.pick([0.154, 0.22]) };
    },
    calc(p) {
      const P0 = p.val * 1e8 / p.sh, Pex = (p.val - p.cash) * 1e8 / p.sh, dps = p.cash * 1e8 / p.sh;
      const buy = p.cash * 1e8 / P0, sh2 = p.sh - buy, eps2 = p.ni * 1e8 / sh2;
      return { P0, Pex, dps, buy, sh2, eps0: p.ni * 1e8 / p.sh, eps2, per2: P0 / eps2, Psd: P0 / (1 + p.sdiv), reinv: p.own * dps / Pex, sell: p.want / P0 };
    },
    body: p => `<p>무부채기업 ㈜백두의 자기자본 시장가치는 보유 현금 <b>${fmt(p.cash)}억원</b>을 포함해 <b>${fmt(p.val)}억원</b>이고, 발행주식수는 <b>${fmt(p.sh)}주</b>, 당기순이익은 <b>${fmt(p.ni)}억원</b>이다.</p>`
      + ul(['㈜백두는 보유 현금 전액을 주주에게 돌려주려 하며, 현금 지급 후에도 순이익은 변하지 않는다고 가정한다.', '자사주는 현재 시가로 매입한다.',
        `배당소득세율은 ${pc(p.tax)}이지만, 세금과 거래비용이 없는 MM의 배당무관련이론이 성립한다고 본다.`, `투자자 갑은 ㈜백두 주식 ${fmt(p.own)}주를 보유하고 있다.`])
      + `<p>※ (물음 3)은 (물음 1)·(물음 2)와 독립적이다.</p>`,
    qs: [
      { lab: '물음 1 ①', type: 'num', text: '현금 전액을 배당할 때 배당락 후 주가를 구하시오.', unit: '원', dp: 0, ans: c => c.Pex, sol: (p, c) => `(${fmt(p.val)} − ${fmt(p.cash)})억 ÷ ${fmt(p.sh)} = <b>${fmt(c.Pex, 2)}</b> (주당배당 ${fmt(c.dps, 2)}원)` },
      { lab: '물음 1 ②', type: 'num', text: '배당을 원하지 않는 투자자 갑이 받은 배당금으로 배당락 주가에 다시 사야 하는 주식 수를 구하시오.', unit: '주', dp: 2, ans: c => c.reinv,
        sol: (p, c) => `${fmt(p.own)}주 × ${fmt(c.dps, 2)} ÷ ${fmt(c.Pex, 2)} = <b>${c.reinv.toFixed(4)}</b> (배당 전과 같은 지분가치 유지)` },
      { lab: '물음 2 ①', type: 'num', text: '현금 전액으로 자사주를 매입할 때 매입하는 주식 수를 구하시오.', unit: '주', dp: 0, ans: c => c.buy, sol: (p, c) => `${fmt(p.cash)}억 ÷ ${fmt(c.P0, 2)} = <b>${fmt(c.buy, 2)}</b>` },
      { lab: '물음 2 ②', type: 'num', text: '자사주 매입 후 EPS를 구하시오.', unit: '원', dp: 2, ans: c => c.eps2, sol: (p, c) => `${fmt(p.ni)}억 ÷ ${fmt(c.sh2, 2)} = <b>${c.eps2.toFixed(4)}</b> (매입 전 ${c.eps0.toFixed(2)})` },
      { lab: '물음 2 ③', type: 'num', text: '자사주 매입 후 PER을 구하시오.', unit: '배', dp: 2, ans: c => c.per2, sol: (p, c) => `주가는 ${fmt(c.P0, 2)}로 불변 → ${fmt(c.P0, 2)} ÷ ${c.eps2.toFixed(4)} = <b>${c.per2.toFixed(4)}</b>` },
      { lab: '물음 2 ④', type: 'num', textf: p => `자사주를 매입하는 경우, 현금 ${fmt(p.want)}원이 필요한 투자자 갑이 팔아야 하는 주식 수를 구하시오.`, unit: '주', dp: 2, ans: c => c.sell, sol: (p, c) => `${fmt(p.want)} ÷ ${fmt(c.P0, 2)} = <b>${c.sell.toFixed(4)}</b> (자가배당)` },
      { lab: '물음 3', type: 'num', textf: p => `현금을 지급하지 않고 ${pc(p.sdiv)}의 주식배당을 한다면 주식배당 후 주가는?`, unit: '원', dp: 2, ans: c => c.Psd, sol: (p, c) => `${fmt(c.P0, 2)} ÷ (1 + ${p.sdiv}) = <b>${c.Psd.toFixed(4)}</b> (기업가치 불변, 주식수만 증가)` },
      { lab: '물음 4', type: 'essay', text: '현실에서 배당정책이 기업가치에 영향을 줄 수 있는 이유를 두 가지 제시하시오.',
        model: '① 배당소득과 자본이득의 세율·과세시점이 달라, 세후 기준으로는 지급 방식에 따라 주주의 부가 달라진다. ② 정보비대칭 하에서 배당 증가는 경영자가 미래 현금흐름을 낙관한다는 신호가 되고, 잉여현금을 줄여 경영자의 대리비용을 낮춘다.',
        kw: ['세금', '신호', '정보비대칭', '대리비용', '잉여현금'] },
    ],
  });
})();
