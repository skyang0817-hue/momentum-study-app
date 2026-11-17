"""problems.js의 기본 숫자 정답을 JS와 독립적으로 다시 계산한다 (외부 모듈 없이).
사용: python verify_defaults.py <js_dump.json>
js_dump.json은 tools/test.html을 브라우저로 열어 얻은 {문제id: [정답...]} 이다."""
import json, math, sys

def pvif(r, n): return (1 + r) ** -n
def pvifa(r, n): return (1 - (1 + r) ** -n) / r
def r4(x): return round(x * 1e4) / 1e4
def bisect(f, a, b):
    for _ in range(200):
        m = (a + b) / 2
        if (f(a) < 0) == (f(m) < 0): a = m
        else: b = m
    return (a + b) / 2

E = {}
# 자본예산: 교체 (기본 숫자, 현금흐름을 항목별로 직접 구성)
t, r = .25, .1
base = 12000 + 600; old_bv = 9000 * 3 / 6
cf0 = -base + (4200 + t * (old_bv - 4200)) - .2 * 2500
ocf = (2500 + 800) - t * ((2500 + 800) - ((base - 1200) / 3 - 1500))   # 세후 = 세전 − 세금(과세소득 기준)
term = (2000 - t * (2000 - 1200)) - 600 * (1 - t) + .2 * 2500
A, F = r4(pvifa(r, 3)), r4(pvif(r, 3))
npv = cf0 + ocf * A + term * F
dnpv_dX = -1 + A * t / 3
E['cb-replace'] = [cf0, ocf, term, npv, 0 if npv > 0 else 1, 12000 - npv / dnpv_dX]
# 투자안 평가 지표·자본할당
d = [r4(pvif(.1, k)) for k in (1, 2, 3, 4)]
Pf, Qf, Rf = [500, 400, 300, 200], [200, 400, 700, 900], [300] * 4
npvs = {'P': sum(x * y for x, y in zip(Pf, d)) - 1000, 'Q': sum(x * y for x, y in zip(Qf, d)) - 1500, 'R': sum(x * y for x, y in zip(Rf, d)) - 800}
qpv = [x * y for x, y in zip(Qf, d)]
dpb = 3 + (1500 - sum(qpv[:3])) / qpv[3]
fvP = sum(x * r4(1.1 ** (3 - i)) for i, x in enumerate(Pf))
costs = {'P': 1000, 'Q': 1500, 'R': 800}
combos = [c for c in (('P', 'Q'), ('P', 'R'), ('Q', 'R')) if sum(costs[k] for k in c) <= 2300]
best = max(combos, key=lambda c: sum(npvs[k] for k in c))
E['cb-payback'] = [2 + 100 / 300, dpb, (npvs['Q'] + 1500) / 1500, ((fvP / 1000) ** .25 - 1) * 100,
                   [('P', 'Q'), ('P', 'R'), ('Q', 'R')].index(best), sum(npvs[k] for k in best)]
# 상호배타적 투자안
d3 = d[:3]
A_, B_, C_ = [1200, 1000, 400], [300, 800, 1800], [800, 700]
nA = sum(x * y for x, y in zip(A_, d3)) - 2000; nB = sum(x * y for x, y in zip(B_, d3)) - 2000; nC = sum(x * y for x, y in zip(C_, d3)) - 1200
irrA = bisect(lambda y: sum(x / (1 + y) ** (i + 1) for i, x in enumerate(A_)) - 2000, -0.5, 3)
fis = bisect(lambda y: sum((a_ - b_) / (1 + y) ** (i + 1) for i, (a_, b_) in enumerate(zip(A_, B_))), 1e-4, 3)
eA, eC = nA / r4(pvifa(.1, 3)), nC / r4(pvifa(.1, 2))
E['cb-mirr'] = [nA, nB, irrA * 100, fis * 100, 1, eC, 0 if eA >= eC else 1]
# (포트폴리오·채권·파생·기업재무 기본 11문제는 problems3.js로 개편 — alt_check.py에서 기본 숫자 포함 검증)
# ── 실전형 CAPM·APT ──
def gauss(m, v):   # 가우스 소거 (크라머와 다른 방법으로 대조)
    a = [row[:] + [x] for row, x in zip(m, v)]; n = len(a)
    for i in range(n):
        piv = max(range(i, n), key=lambda r: abs(a[r][i])); a[i], a[piv] = a[piv], a[i]
        for r in range(n):
            if r != i:
                f = a[r][i] / a[i][i]; a[r] = [x - f * y for x, y in zip(a[r], a[i])]
    return [a[i][n] / a[i][i] for i in range(n)]
rf, Em, sm = .03, .11, .2
bY, bZ, bX = .6 * .25 / sm, .7 * .4 / sm, .8 * .3 / sm
reqY, reqZ = rf + bY * (Em - rf), rf + bZ * (Em - rf)
EY, EZ = round((reqY + .01) * 1e4) / 1e4, round((reqZ - .012) * 1e4) / 1e4
WY = 900 / bY
evX, evZ = .3 ** 2 - bX ** 2 * sm ** 2, .4 ** 2 - bZ ** 2 * sm ** 2
bP = .4 * bX + .6 * bZ; non = .16 * evX + .36 * evZ; sysP = bP ** 2 * sm ** 2
E['pf-capm-alpha-arb'] = [bZ, 0, WY, -(WY - 900), (EY - reqY) * WY, non / (non + sysP) * 100]
sh = (.12 - .04) / .2
E['pf-cml-sml-eff'] = [(.04 + sh * .3) * 100, (1 - .3 / .2) * 100, (.04 + .5 * .35 / .2 * .08) * 100, 25.0, .5, .08 / (3 * .2) * 100]
lam = [.04, .06, .05]; Ebet = lambda b: lam[0] + b[0] * lam[1] + b[1] * lam[2]
A_, B_, C_, D_ = [1.0, .6], [.5, 1.2], [.8, .2], [1.2, .8]
l_est = gauss([[1] + A_, [1] + B_, [1] + C_], [Ebet(A_), Ebet(B_), Ebet(C_)])
w_rep = gauss([[1, 1, 1], [A_[0], B_[0], C_[0]], [A_[1], B_[1], C_[1]]], [1, D_[0], D_[1]])
E['pf-apt-three'] = [l_est[0] * 100, l_est[1] * 100, l_est[2] * 100, Ebet(D_) * 100, w_rep[0] * 100, 0, .018 * 10000]
v1, v2 = .04, .01
vX = 1.44 * v1 + .25 * v2 + .0225; vY = .64 * v1 + 2.25 * v2 + .04
covXY = 1.2 * .8 * v1 + .5 * 1.5 * v2; wX = -.8 / (1.2 - .8)
E['pf-factor-cov'] = [math.sqrt(vX) * 100, (vX - .0225) / vX * 100, covXY / math.sqrt(vX * vY), wX * 100,
                      wX * .5 + (1 - wX) * 1.5, math.sqrt(wX ** 2 * .0225 + (1 - wX) ** 2 * .04) * 100]

js = json.load(open(sys.argv[1], encoding='utf-8-sig'))
bad = 0
for pid, exp in E.items():
    got = js[pid]
    for i, (e, g) in enumerate(zip(exp, got)):
        if e is None: continue
        ok = abs(e - g) <= 1e-6 * max(1, abs(e))
        bad += not ok
        print(f"{'OK ' if ok else 'BAD'} {pid} 물음{i + 1}: py={e:.6f} js={g:.6f}")
print('불일치', bad, '건')
