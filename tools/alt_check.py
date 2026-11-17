"""정답을 '다른 방법'으로 다시 구해 대조한다 (변형 숫자 61세트 × 문제 전체).
앱의 공식을 그대로 옮기지 않고 격자 탐색, 수치 미분, 행렬 연산, 현금흐름 직접 계산, 항등식으로 확인한다.
사용: python alt_check.py <test.html 출력 JSON>"""
import json, math, sys
import numpy as np

def pvif(r, n): return (1 + r) ** -n
def r4(x): return round(x * 1e4) / 1e4
def close(a, b, rel=1e-6, abs_=1e-6): return abs(a - b) <= max(abs_, rel * abs(b))
def brentq(f, a, b):
    fa = f(a)
    for _ in range(300):
        m = (a + b) / 2; fm = f(m)
        if (fa < 0) == (fm < 0): a, fa = m, fm
        else: b = m
    return (a + b) / 2

checks = {}
def chk(fn):
    checks[fn.__name__.replace('_', '-', 1).replace('_', '-')] = fn
    return fn

def cb_replace(p, a):
    # 연도별 현금흐름표를 만들고 정확한 할인계수로 NPV (앱은 표의 반올림 계수) → 0.1% 이내 일치
    t, r, n = p['tax'] if 'tax' in p else p['t'], p['r'], p['oldLife'] - p['oldAge']
    base = p['price'] + p['inst']; bv = p['oldCost'] * n / p['oldLife']
    dep_new, dep_old = (base - p['salv']) / n, p['oldCost'] / p['oldLife']
    rows = []
    for k in range(n + 1):
        cf = 0
        if k == 0: cf += -base + p['sell0'] - t * (p['sell0'] - bv) - p['nwcR'] * p['dRev']
        else:
            ebit = p['dRev'] + p['dCost'] - (dep_new - dep_old)
            cf += ebit * (1 - t) + (dep_new - dep_old)
        if k == n: cf += p['sellNew'] - t * (p['sellNew'] - p['salv']) - (p['sellN'] - t * p['sellN']) + p['nwcR'] * p['dRev']
        rows.append(cf)
    npv = sum(cf / (1 + r) ** k for k, cf in enumerate(rows))
    def npv_at(X):
        b2 = X + p['inst']; dn = (b2 - p['salv']) / n
        rr = [-b2 + p['sell0'] - t * (p['sell0'] - bv) - p['nwcR'] * p['dRev']] + [(p['dRev'] + p['dCost'] - (dn - dep_old)) * (1 - t) + (dn - dep_old)] * n
        rr[-1] += p['sellNew'] - t * (p['sellNew'] - p['salv']) - (p['sellN'] - t * p['sellN']) + p['nwcR'] * p['dRev']
        return sum(cf / (1 + r) ** k for k, cf in enumerate(rr))
    xm = brentq(npv_at, -1e6, 1e6)
    tol = 0.002 * base
    return [close(rows[0], a[0]), close(rows[1], a[1]), close(rows[-1] - rows[1], a[2]), abs(npv - a[3]) < tol, a[4] == (0 if a[3] > 0 else 1), abs(xm - a[5]) < 0.003 * base]
checks['cb-replace'] = cb_replace

def cb_payback(p, a):
    k = p['k']; d = [r4((1 + k) ** -t) for t in (1, 2, 3, 4)]
    def payback(I, flows):
        cum = 0
        for i, f in enumerate(flows):
            if cum + f >= I: return i + (I - cum) / f
            cum += f
    I, cf = p['P']; IQ, cq = p['Q']; IR, cr = p['R']
    pvq = [x * y for x, y in zip(cq, d)]
    npv = {'P': sum(x * y for x, y in zip(cf, d)) - I, 'Q': sum(pvq) - IQ, 'R': sum(x * y for x, y in zip(cr, d)) - IR}
    cost = {'P': I, 'Q': IQ, 'R': IR}
    import itertools
    feas = [c for n_ in (1, 2, 3) for c in itertools.combinations('PQR', n_) if sum(cost[x] for x in c) <= p['B']]
    best = max(feas, key=lambda c: sum(npv[x] for x in c))   # 모든 조합을 직접 열거
    fv = sum(x * r4((1 + k) ** (3 - i)) for i, x in enumerate(cf))
    return [close(payback(I, cf), a[0]), close(payback(IQ, pvq), a[1]), close((sum(pvq)) / IQ, a[2]), close(fv, I * (1 + a[3] / 100) ** 4),
            len(best) == 2 and a[4] == ['PQ', 'PR', 'QR'].index(''.join(best)), close(sum(npv[x] for x in best), a[5])]
checks['cb-payback'] = cb_payback

def cb_mirr(p, a):
    k = p['k']; d = lambda t: r4((1 + k) ** -t)
    npv = lambda I, cf: sum(x * d(i + 1) for i, x in enumerate(cf)) - I
    nA, nB, nC = npv(*p['A']), npv(*p['B']), npv(*p['C'])
    irr_ok = abs(sum(x / (1 + a[2] / 100) ** (i + 1) for i, x in enumerate(p['A'][1])) - p['A'][0]) < 1e-6 * p['A'][0]
    f = a[3] / 100; ex = lambda cf: sum(x / (1 + f) ** (i + 1) for i, x in enumerate(cf))
    # 연간균등가치 ↔ 무한 반복투자 NPV: NPV∞ = EAA / k (같은 순위)
    inf = lambda n_, life: n_ / (1 - (1 + k) ** -life)
    return [close(nA, a[0]), close(nB, a[1]), irr_ok, abs(ex(p['A'][1]) - ex(p['B'][1])) < 1e-6, a[4] == (1 if nB > nA else 0), close(nC / r4((1 - (1 + k) ** -2) / k), a[5]), a[6] == (0 if inf(nA, 3) >= inf(nC, 2) else 1)]
checks['cb-mirr'] = cb_mirr

def pf_capm_states(p, a):
    w = np.array(p['pr']); M = np.array(p['rm']); K = np.array(p['rk']); L = np.array(p['rl'])
    C = np.cov(np.vstack([M, K, L]), aweights=w, bias=True)          # 확률가중 공분산 행렬
    bK, bL = C[0, 1] / C[0, 0], C[0, 2] / C[0, 0]; Em, Ek, El = w @ M, w @ K, w @ L
    req = p['rf'] + bK * (Em - p['rf'])
    port = p['w'] * K + (1 - p['w']) * L                                 # 상황별 포트폴리오 수익률을 직접 만들어 회귀 베타
    bP = np.cov(np.vstack([M, port]), aweights=w, bias=True)[0, 1] / C[0, 0]
    alP = w @ port - (p['rf'] + bP * (Em - p['rf']))
    return [close(Ek * 100, a[0]), close(math.sqrt(C[1, 1]) * 100, a[1]), close(bK, a[2]), close(bL, a[3]), close(req * 100, a[4]),
            a[5] == (0 if Ek > req else 1), close(alP * 100, a[6], 1e-6, 1e-8), close(bK ** 2 * C[0, 0] / C[1, 1] * 100, a[7])]
checks['pf-capm-states'] = pf_capm_states

def pf_cml_utility(p, a):
    E, s, rf, rb = p['E'], p['s'], p['rf'], p['rb']; ys = np.linspace(0, 6, 600001)
    def best(g, kinked):
        rate = np.where(ys <= 1, rf, rb) if kinked else rf
        U = rate + ys * (E - rate) - 0.5 * g * ys ** 2 * s ** 2
        i = np.argmax(U); return ys[i], U[i]
    y1, u1 = best(p['g1'], False); y2, u2 = best(p['g2'], True)
    lo, hi = a[6], a[7]
    edge = best(lo * 0.98, True)[0] > 1.0005 and abs(best(lo * 1.02, True)[0] - 1) < 1e-4 and abs(best(hi * 0.98, True)[0] - 1) < 1e-4 and best(hi * 1.02, True)[0] < 0.9995
    return [abs(y1 * 100 - a[0]) < 0.002, close(rf + y1 * (E - rf), a[1] / 100, 1e-4), close(y1 * s, a[2] / 100, 1e-4), abs(u1 * 100 - a[3]) < 1e-6,
            abs(y2 * 100 - a[4]) < 0.002, abs(u2 * 100 - a[5]) < 1e-6, edge, edge]
checks['pf-cml-utility'] = pf_cml_utility

def pf_two_asset(p, a):
    cov = p['rho'] * p['sA'] * p['sB']; S = np.array([[p['sA'] ** 2, cov], [cov, p['sB'] ** 2]]); mu = np.array([p['EA'], p['EB']])
    wm = np.linalg.solve(S, np.ones(2)); wm /= wm.sum()
    wt = np.linalg.solve(S, mu - p['rf']); wt /= wt.sum()
    ET, sT = wt @ mu, math.sqrt(wt @ S @ wt)
    ys = np.linspace(0, 5, 500001); y = ys[np.argmax(p['rf'] + ys * (ET - p['rf']) - 0.5 * p['g'] * ys ** 2 * sT ** 2)]
    S2 = np.array([[p['sA'] ** 2, -p['sA'] * p['sB']], [-p['sA'] * p['sB'], p['sB'] ** 2]]); w0 = np.array([a[8] / 100, 1 - a[8] / 100])
    return [close(wm[0] * 100, a[0]), close(wm @ mu * 100, a[1]), close(math.sqrt(wm @ S @ wm) * 100, a[2]), close(wt[0] * 100, a[3]), close(sT * 100, a[4]),
            close((ET - p['rf']) / sT, a[5]), abs(y * 100 - a[6]) < 0.002, abs(y * wt[0] * 100 - a[7]) < 0.002, abs(w0 @ S2 @ w0) < 1e-12, close(w0 @ mu * 100, a[9])]
checks['pf-two-asset'] = pf_two_asset

def pf_apt(p, a):
    E = lambda b: p['l0'] + b * p['l1']
    lam = np.linalg.solve(np.array([[1, p['bX']], [1, p['bY']]]), np.array([E(p['bX']), E(p['bY'])]))
    w = np.linalg.solve(np.array([[1, 1], [p['bX'], p['bY']]]), np.array([1, p['bZ']]))
    w0 = np.linalg.solve(np.array([[1, 1], [p['bX'], p['bY']]]), np.array([1, 0]))
    rep = w @ [E(p['bX']), E(p['bY'])]; EZ = E(p['bZ']) + p['aZ']
    return [close(lam[0] * 100, a[0]), close(lam[1] * 100, a[1]), close(rep * 100, a[2]), a[3] == (0 if EZ > rep else 1), close(w[0] * 100, a[4]),
            close(w[0] * p['px'], a[5]), close(abs(EZ - rep) * p['px'], a[6]), close((w0 @ [E(p['bX']), E(p['bY'])] - p['rf']) * p['px'], a[7])]
checks['pf-apt'] = pf_apt

def bd_spot_duration(p, a):
    Pz = [math.floor(10000 * (1 + s) ** -(i + 1) + .5) for i, s in enumerate(p['s'])]
    sp = [(10000 / x) ** (1 / (i + 1)) - 1 for i, x in enumerate(Pz)]
    f = lambda i, j: (1 + sp[j - 1]) ** j / (1 + sp[i - 1]) ** i - 1
    cf = [p['cpn'] * 1e4] * 2 + [1e4 * (1 + p['cpn'])]
    price = sum(x / (1 + sp[i]) ** (i + 1) for i, x in enumerate(cf))
    y = a[4] / 100; P = lambda yy: sum(x / (1 + yy) ** (i + 1) for i, x in enumerate(cf)); h = 1e-4
    md = -(P(y + h) - P(y - h)) / (2 * h) / P(y); cv = (P(y + h) - 2 * P(y) + P(y - h)) / h ** 2 / P(y)   # 수치 미분
    return [close(sp[1] * 100, a[0]), close(f(1, 2) * 100, a[1]), close(f(2, 3) * 100, a[2]), close(price, a[3]), abs(P(y) - price) < 1e-6,
            close(md * (1 + y), a[5], 1e-6), close(cv, a[6], 1e-5), close((-md * .01 + .5 * cv * 1e-4) * 100, a[7], 1e-5)]
checks['bd-spot-duration'] = bd_spot_duration

def bd_immunization(p, a):
    y = p['y']; h = 1e-6
    bond = lambda n, yy: sum((1e4 * p['c'] + (1e4 if t == n else 0)) / (1 + yy) ** t for t in range(1, n + 1))
    dur = lambda n: -(bond(n, y + h) - bond(n, y - h)) / (2 * h) / bond(n, y) * (1 + y)
    pvL = lambda yy, H: p['L'] / (1 + yy) ** H
    w = a[3] / 100; amtZ = a[4]; units = a[5]
    # 자산 = 무이표채(만기 z, 현재가치 amtZ) + 이표채 units개 → 금리 변화에 대한 1차 민감도가 부채와 같아야 함
    asset = lambda yy: amtZ * (1 + y) ** p['z'] / (1 + yy) ** p['z'] + units * bond(p['n'], yy) / 1e4
    dmatch = abs((asset(y + h) - asset(y - h)) - (pvL(y + h, p['H']) - pvL(y - h, p['H']))) < 1e-6 * pvL(y, p['H'])
    D1 = dur(p['n'] - 1)
    return [close(pvL(y, p['H']), a[0]), close(bond(p['n'], y), a[1]), close(dur(p['n']), a[2], 1e-6), dmatch, close(asset(y), pvL(y, p['H'])), dmatch,
            close(D1, a[6], 1e-6), close(a[7] / 100 * (p['z'] - 1) + (1 - a[7] / 100) * D1, p['H'] - 1, 1e-6)]
checks['bd-immunization'] = bd_immunization

def dv_binomial(p, a):
    S, u, d, r = p['S'], p['u'], p['d'], p['r']; q = (1 + r - d) / (u - d)
    def val(s, step, pay, amer):
        if step == 2: return pay(s)
        cont = (q * val(s * u, step + 1, pay, amer) + (1 - q) * val(s * d, step + 1, pay, amer)) / (1 + r)
        return max(cont, pay(s)) if amer else cont
    call = lambda s: max(s - p['K'], 0); put = lambda s: max(p['Kp'] - s, 0)
    Cu, Cd = val(S * u, 1, call, False), val(S * d, 1, call, False)
    rep_ok = close(a[2] * S * u - a[3] * (1 + r), Cu) and close(a[2] * S * d - a[3] * (1 + r), Cd)     # 복제 확인
    Du = (call(S * u * u) - call(S * u * d)) / (S * u * (u - d))
    ex = [put(S * u) > (q * put(S * u * u) + (1 - q) * put(S * u * d)) / (1 + r) + 1e-9, put(S * d) > (q * put(S * u * d) + (1 - q) * put(S * d * d)) / (1 + r) + 1e-9]
    return [close(q, a[0]), close(val(S, 0, call, False), a[1]), rep_ok, rep_ok, close(Du, a[4]), close(val(S, 0, put, True), a[5]), close(val(S, 0, put, False), a[6]),
            a[7] == (0 if ex[0] else 1 if ex[1] else 2)]
checks['dv-binomial'] = dv_binomial

def dv_futures(p, a):
    F = p['S'] * (1 + (p['r'] - p['dy']) * p['T']); Fm = math.floor((F + p['gap']) * 100 + .5) / 100; M = 250000; V = p['V'] * 1e8
    beta_after = lambda n: (p['beta'] * V - n * Fm * M) / V                # 선물 매도 후 포트폴리오 베타
    port = V * p['beta'] * (p['ST'] - p['S']) / p['S'] / 1e8; fut = a[3] * (Fm - p['ST']) * M / 1e8
    return [close(F, a[0]), a[1] == (0 if Fm > F else 1), close(abs(Fm - F) * M, a[2]), abs(beta_after(a[3])) < 1e-9, abs(beta_after(a[4]) - p['tb']) < 1e-9,
            close(port, a[5]), close(fut, a[6]), close(port + fut, a[7])]
checks['dv-futures'] = dv_futures

def cf_mm(p, a):
    t, D = p['t'], p['D']; VU = p['ebit'] * (1 - t) / p['rho']; E = VU + t * D - D
    rE = (p['ebit'] - p['rd'] * D) * (1 - t) / E                           # 주주 몫 현금흐름 ÷ 자기자본
    wacc = (E * rE + D * p['rd'] * (1 - t)) / (E + D)
    al = p['a']; cash_now = al * p['EL'] + al * (1 - t) * D - al * VU        # L 매도 + 개인차입 + U 매수
    inc_L = al * (p['ebit'] - p['rd'] * D) * (1 - t); inc_rep = al * p['ebit'] * (1 - t) - al * (1 - t) * D * p['rd']
    Pn, buy = a[6], a[7]
    eq_after = (VU + t * p['Dn'] - p['Dn']) * 1e8                            # 자본재구성 후 자기자본 / 남은 주식
    return [close(VU, a[0]), close(VU + t * D, a[1]), close(rE * 100, a[2]), close(wacc * 100, a[3]), a[4] == (0 if p['EL'] > E else 1),
            close(cash_now, a[5]) and close(inc_L, inc_rep), close(eq_after / (p['N'] - buy), Pn), close(buy * Pn, p['Dn'] * 1e8)]
checks['cf-mm'] = cf_mm

def cf_merger_eps(p, a):
    epsA = p['niA'] * 1e8 / p['shA']; epsT = p['niT'] * 1e8 / p['shT']
    pA = math.floor(p['perA'] * epsA / 100 + .5) * 100; pT = math.floor(p['perT'] * epsT / 100 + .5) * 100
    VA, VAB = pA * p['shA'] / 1e8, p['perN'] * (p['niA'] + p['niT'] + p['syn'])
    new = a[1]; own = p['shA'] / (p['shA'] + new)
    return [close(a[0] * p['shT'], new), close(new * pA, pT * (1 + p['prem']) * p['shT']), close(a[2] * (p['shA'] + new), (p['niA'] + p['niT']) * 1e8), a[3] == (0 if a[2] > epsA else 1),
            close(a[4] * (p['shA'] + new), VAB * 1e8), close(own * VAB - VA, a[5]), close(VAB - VA - p['cashP'] * p['shT'] / 1e8, a[6]), close(VAB * p['shA'] / (p['shA'] + a[7]), VA)]
checks['cf-merger-eps'] = cf_merger_eps

def cf_payout(p, a):
    P0 = p['val'] * 1e8 / p['sh']; dps = p['cash'] * 1e8 / p['sh']
    return [close(a[0] + dps, P0), close((p['own'] + a[1]) * a[0], p['own'] * P0), close(a[2] * P0, p['cash'] * 1e8), close(a[3] * (p['sh'] - a[2]), p['ni'] * 1e8),
            close(a[4] * a[3], P0), close((p['own'] - a[5]) * P0 + p['want'], p['own'] * P0), close(a[6] * p['sh'] * (1 + p['sdiv']), P0 * p['sh'])]
checks['cf-payout'] = cf_payout


def pf_capm_alpha_arb(p, a):
    rf, Em, sm = p['rf'], p['Em'], p['sm']
    b = {k: p[k]['r'] * p[k]['s'] / sm for k in 'XYZ'}
    E = {k: round((rf + b[k] * (Em - rf) + (p[k].get('a', 0))) * 1e4) / 1e4 for k in 'XYZ'}
    aY, aZ = E['Y'] - (rf + b['Y'] * (Em - rf)), E['Z'] - (rf + b['Z'] * (Em - rf))
    side = 1 if aY > 0 else -1
    WY = a[2]; rfp = a[3]
    pos = np.array([side * WY, -side * p['M'], rfp])                # Y, 시장, 무위험
    zero_cost = abs(pos.sum()) < 1e-6
    zero_beta = abs(pos[0] * b['Y'] + pos[1]) < 1e-6
    exp_profit = pos @ np.array([E['Y'], Em, rf])
    choice = (0 if aZ < 0 else 2) if aY > 0 else (1 if aZ > 0 else 3)
    # 단일지수모형 공분산 행렬로 포트폴리오 분산 직접 계산
    bb = np.array([b['X'], b['Z']]); res = np.array([p['X']['s'] ** 2, p['Z']['s'] ** 2]) - bb ** 2 * sm ** 2
    Sig = np.outer(bb, bb) * sm ** 2 + np.diag(res); w = np.array([p['w'], 1 - p['w']])
    non = w @ np.diag(res) @ w
    return [close(b['Z'], a[0]), a[1] == choice, zero_beta, zero_cost, close(exp_profit, a[4]), close(non / (w @ Sig @ w) * 100, a[5])]
checks['pf-capm-alpha-arb'] = pf_capm_alpha_arb

def pf_cml_sml_eff(p, a):
    rf, Em, sm = p['rf'], p['Em'], p['sm']
    wM = p['sA'] / sm
    covMB = p['rB'] * sm * p['sB']
    rhoAB = (wM * covMB) / (p['sA'] * p['sB'])                     # A = wM·M + (1−wM)·무위험
    ys = np.linspace(0, 5, 500001); U = rf + ys * (Em - rf) - 0.5 * p['g'] * ys ** 2 * sm ** 2
    sOpt = ys[np.argmax(U)] * sm
    bB = covMB / sm ** 2
    return [close(wM * Em + (1 - wM) * rf, a[0] / 100), close((1 - wM) * 100, a[1]), close((rf + bB * (Em - rf)) * 100, a[2]),
            close(bB ** 2 * sm ** 2 / p['sB'] ** 2 * 100, a[3]), close(rhoAB, a[4]), abs(sOpt * 100 - a[5]) < 0.001]
checks['pf-cml-sml-eff'] = pf_cml_sml_eff

def pf_apt_three(p, a):
    l = p['l']; Ef = lambda b: l[0] + b[0] * l[1] + b[1] * l[2]
    X = np.array([[1, *p['A']], [1, *p['B']], [1, *p['C']]])
    lam = np.linalg.lstsq(X, np.array([Ef(p['A']), Ef(p['B']), Ef(p['C'])]), rcond=None)[0]
    w = np.linalg.lstsq(np.vstack([np.ones(3), X[:, 1], X[:, 2]]), np.array([1, *p['D']]), rcond=None)[0]
    rep_E = w @ [Ef(p['A']), Ef(p['B']), Ef(p['C'])]
    ED = Ef(p['D']) + p['alpha']
    return [close(lam[0] * 100, a[0]), close(lam[1] * 100, a[1]), close(lam[2] * 100, a[2]), close(rep_E * 100, a[3]),
            close(w[0] * 100, a[4]), a[5] == (0 if ED > rep_E else 1), close(abs(ED - rep_E) * 10000, a[6])]
checks['pf-apt-three'] = pf_apt_three

def pf_factor_cov(p, a):
    B = np.array([p['X'][:2], p['Y'][:2]]); F = np.diag([p['f1'] ** 2, p['f2'] ** 2]); D = np.diag([p['X'][2] ** 2, p['Y'][2] ** 2])
    Sig = B @ F @ B.T + D                                           # 요인모형 공분산 행렬
    w = np.array([a[3] / 100, 1 - a[3] / 100])
    return [close(math.sqrt(Sig[0, 0]) * 100, a[0]), close((Sig[0, 0] - D[0, 0]) / Sig[0, 0] * 100, a[1]),
            close(Sig[0, 1] / math.sqrt(Sig[0, 0] * Sig[1, 1]), a[2]), abs(w @ B[:, 0]) < 1e-9, close(w @ B[:, 1], a[4]), close(math.sqrt(w @ D @ w) * 100, a[5])]
checks['pf-factor-cov'] = pf_factor_cov

# ── problems2.js (10개년 실전형) ──
def cb_apv(p, a):
    n, t, I, L = p['n'], p['t'], p['I'], p['L']
    A = r4((1 - (1 + p['rho']) ** -n) / p['rho'])
    ocf = (p['C'] - I / n) * (1 - t) + I / n                     # 세후이익 + 감가상각 형태
    loan_cf = [-L * p['rs'] * (1 - t)] * n; loan_cf[-1] -= L       # 대출 현금흐름을 하나씩 할인 (정확한 계수)
    npvf_exact = L + sum(x / (1 + p['rd']) ** (i + 1) for i, x in enumerate(loan_cf))
    return [close(-I + ocf * A, a[0]), abs(npvf_exact - a[1]) < 0.001 * L + 0.01, close(a[0] + a[1], a[2]), abs(a[0] + a[3] * a[1] / L) < 1e-6 * I]
checks['cb-apv'] = cb_apv

def cb_ceq(p, a):
    lam = a[0]; ok_l = close(lam * p['vM'], p['Em'] - p['rf'])
    k = a[4] / 100
    radr = p['A']['E'] / (1 + k) - p['A']['I']                      # 위험조정할인율법 NPV = 확실성등가법 NPV
    npv = lambda o: (o['E'] - lam * o['cov']) / (1 + p['rf']) - o['I']
    return [ok_l, close(a[1], p['A']['E'] - lam * p['A']['cov']), close(radr, a[2], 1e-6, 1e-6), close(a[3], (k - p['rf']) / (p['Em'] - p['rf'])), True, a[5] == (0 if npv(p['A']) >= npv(p['B']) else 1)]
checks['cb-ceq'] = cb_ceq

def cb_realopt(p, a):
    k = p['k']
    def tree(q):   # 의사결정나무를 직접 펼침: 지금 투자 vs 1년 후 상황별 최적 선택
        now = -p['I0'] + sum(pr * cf / k for pr, cf in [(q, p['CH']), (1 - q, p['CL'])])
        wait = sum(pr * max(cf / k - p['I1'], 0) for pr, cf in [(q, p['CH']), (1 - q, p['CL'])]) / (1 + k)
        return now, wait
    now, wait = tree(p['q']); n2, w2 = tree(a[3] / 100)
    return [close(now, a[0]), close(wait, a[1]), close(max(wait - now, 0), a[2]), abs(n2 - w2) < 1e-6 * p['I0']]
checks['cb-realopt'] = cb_realopt

def cb_valuation(p, a):
    ke = a[0] / 100; t = p['t']
    fcfe = p['NI'][0] + p['dep'] - p['capex'] - p['dNWC']            # 순이익 기준으로 직접
    divs = [p['NI'][0] * p['pay'][0], p['NI'][1] * p['pay'][1]]
    d3 = p['NI'][1] * (1 + p['g']) * p['pay'][2]
    cf = np.array([divs[0], divs[1] + d3 / (ke - p['g'])]) * 1e8 / p['sh']
    P0 = sum(x / (1 + ke) ** (i + 1) for i, x in enumerate(cf))
    rd = p['int'] / p['D']; V = p['D'] + p['E']
    return [close(ke, p['rf'] + p['beta'] * (p['Em'] - p['rf'])), close(a[1] / 100, (p['E'] * ke + p['D'] * rd * (1 - t)) / V), close(a[2], fcfe + p['int'] * (1 - t)), close(a[3], fcfe), close(P0, a[4])]
checks['cb-valuation'] = cb_valuation

def pf_perf(p, a):
    P, Q = p['P'], p['Q']
    e = math.sqrt(P['s'] ** 2 - P['b'] ** 2 * p['sm'] ** 2)
    jen = P['R'] - p['rf'] - P['b'] * (p['Rm'] - p['rf'])
    Rp = np.dot(p['wp'], p['rp']); Rb = np.dot(p['wb'], p['rb'])
    shQ = (Q['R'] - p['rf']) / Q['s']
    return [close(a[0], (P['R'] - p['rf']) / P['s']), close(a[1], (P['R'] - p['rf']) / P['b']), close(a[2] / 100, jen), close(a[3], jen / e),
            a[4] == (0 if a[0] >= shQ else 1), close((a[5] + a[6]) / 100, Rp - Rb), close(a[6] / 100, np.dot(p['wp'], np.array(p['rp']) - np.array(p['rb'])))]
checks['pf-perf'] = pf_perf

def bd_replicate_arb(p, a):
    F = 10000; c = p['c']
    price = lambda cp, n: math.floor(sum(cp * F / (1 + p['s'][i]) ** (i + 1) for i in range(n)) + F / (1 + p['s'][n - 1]) ** n + .5)
    Pm = np.array([price(c[0], 1), price(c[1], 2), price(c[2], 3)])
    CF = np.array([[F * (1 + c[0]), 0, 0], [c[1] * F, F * (1 + c[1]), 0], [c[2] * F, c[2] * F, F * (1 + c[2])]])
    d = np.linalg.solve(CF, Pm)                                    # 할인계수를 연립방정식으로
    cfD = np.array([p['cD'] * F, p['cD'] * F, F * (1 + p['cD'])])
    eq = cfD @ d
    x = np.linalg.solve(CF.T, cfD)                                 # 복제 수량 (A, B, C)
    mkt = math.floor(eq + .5) + p['mis']
    return [close(a[0] / 100, 1 / d[0] - 1), close(a[1] / 100, d[1] ** -.5 - 1), close(a[2] / 100, d[2] ** (-1 / 3) - 1), close(eq, a[3]), a[4] == (0 if mkt > eq else 1), close(x[2], a[5]), close(abs(mkt - eq), a[6])]
checks['bd-replicate-arb'] = bd_replicate_arb

def bd_credit(p, a):
    F = 100000; cp = p['c'] * F; P0 = cp / p['cy']
    irr = cfs = None
    def irr(cfs): return brentq(lambda y: sum(x / (1 + y) ** (i + 1) for i, x in enumerate(cfs)) - P0, -0.99, 5)
    ytm = irr([cp, cp + F]); rc = irr([cp, cp + p['rec'] * F]); rb = irr([cp])
    pd = 1 - p['pa'] - p['pb'] - p['pc']
    ER = -p['pa'] + p['pb'] * rb + p['pc'] * rc + pd * ytm
    return [close(P0, a[0]), close(ytm * 100, a[1]), close(rc * 100, a[2]), close(ER * 100, a[3]), close((ytm - p['rf']) * 100, a[4]), close((ytm - ER) * 100, a[5])]
checks['bd-credit'] = bd_credit

def bd_immun_convex(p, a):
    y = p['y']; L = p['L']
    pv = lambda yy: sum(x / (1 + yy) ** (i + 1) for i, x in enumerate(L))
    h = 1e-4
    conv = (pv(y + h) - 2 * pv(y) + pv(y - h)) / h ** 2 / pv(y)      # 수치 2차 미분 볼록성
    dur = -(pv(y + 1e-6) - pv(y - 1e-6)) / 2e-6 / pv(y) * (1 + y)
    z3 = a[3]; z1 = pv(y) - z3
    asset = lambda yy: z1 * (1 + y) / (1 + yy) + z3 * (1 + y) ** 3 / (1 + yy) ** 3
    convA = (asset(y + h) - 2 * asset(y) + asset(y - h)) / h ** 2 / asset(y)
    dmatch = abs((asset(y + 1e-6) - asset(y - 1e-6)) - (pv(y + 1e-6) - pv(y - 1e-6))) < 1e-6 * pv(y)
    return [close(pv(y), a[0]), close(dur, a[1], 1e-6), close(conv, a[2], 1e-5), dmatch, close(convA, a[4], 1e-5), a[5] == (0 if convA >= conv else 1)]
checks['bd-immun-convex'] = bd_immun_convex

def dv_swap(p, a):
    N = p['N']; d = [(1 + s) ** -(i + 1) for i, s in enumerate(p['s'])]
    fwd = [p['s'][0], d[0] / d[1] - 1, d[1] / d[2] - 1]
    fra_sum = sum(N * (f - p['c']) * d[i] for i, f in enumerate(fwd))   # FRA 방식 합계 = 채권 방식
    swr = a[3] / 100
    par_ok = abs(swr * N * sum(d) + N * d[2] - N) < 1e-6 * N          # 스왑금리로 만든 고정채 = 액면
    return [close(a[0], p['c'] * N * sum(d) + N * d[2]), close(fra_sum, a[1]), close(a[2], N * (fwd[1] - p['c']) * d[1]), par_ok]
checks['dv-swap'] = dv_swap

def dv_parity_strategy(p, a):
    S, r = p['S'], p['r']; rc = math.log(1 + r); N = lambda x: 0.5 * (1 + math.erf(x / math.sqrt(2)))
    bs = lambda K: S * N((math.log(S / K) + rc + p['sig'] ** 2 / 2) / p['sig']) - K * math.exp(-rc) * N((math.log(S / K) + rc - p['sig'] ** 2 / 2) / p['sig'])
    C1, C2 = math.floor(bs(p['K1']) + .5), math.floor(bs(p['K2']) + .5)
    P2fair = C2 - S + p['K2'] / (1 + r); P2 = math.floor(P2fair + .5) + p['mis']
    # 강세 스프레드 만기 손익을 주가 격자에서 직접 계산해 최대값·손익분기점 확인
    ST = np.linspace(0, 3 * S, 300001); pay = np.maximum(ST - p['K1'], 0) - np.maximum(ST - p['K2'], 0) - (C1 - C2) * (1 + r)
    be = ST[np.argmin(np.abs(pay))]
    return [close(a[0], C1 - S + p['K1'] / (1 + r)), a[1] == (0 if P2 > P2fair else 1), close(a[2], abs(P2 - P2fair)), close(a[3], C1 - C2), close(a[4], pay.max(), 1e-6), abs(be - a[5]) <= ST[1] / 2 + 1e-9]   # 격자 간격 절반 이내
checks['dv-parity-strategy'] = dv_parity_strategy

def cf_rights(p, a):
    own, r = p['own'], p['ratio']
    sub_ok = close(own * p['P'] + own * r * p['X'], own * (1 + r) * a[1])   # 청약 주주의 부 보존
    sell_ok = close(own * a[1] + own * a[2], own * p['P'])                 # 권리 매각 주주의 부 보존
    return [close(a[0], p['N'] * r * p['X'] / 1e8), sub_ok, sell_ok, close(a[3], own * (p['P'] - a[1])), close(a[4] * (1 + r), p['P'] + r * p['X2'])]
checks['cf-rights'] = cf_rights

def cf_agency(p, a):
    st = lambda v: (max(v - p['F'], 0), min(v, p['F']))
    eA = sum(st(v)[0] for v in p['A']) / 2; dA = sum(st(v)[1] for v in p['A']) / 2
    eB = sum(st(v)[0] for v in p['B']) / 2; dB = sum(st(v)[1] for v in p['B']) / 2
    return [close(eA, a[0]), close(dA, a[1]), close(eB, a[2]), close(dB, a[3]), a[4] == (0 if eA >= eB else 1), close(dA - dB, a[5]),
            close(eA + dA, sum(p['A']) / 2)]
checks['cf-agency'] = cf_agency

data = json.load(open(sys.argv[1], encoding='utf-8-sig'))['variants']
total = bad = 0
for pid, rows in data.items():
    fn = checks.get(pid)
    if not fn: print('검사 없음', pid); continue
    fails = []
    for i, row in enumerate(rows):
        res = fn(row['p'], row['a'])
        total += len(res)
        for j, ok in enumerate(res):
            if not ok: fails.append((i, j + 1)); bad += 1
    print(f"{'OK ' if not fails else 'BAD'} {pid:20s} {len(rows)}세트" + (f"  실패 {fails[:6]}" if fails else ''))
print(f'확인 {total}건 · 불일치 {bad}건')
