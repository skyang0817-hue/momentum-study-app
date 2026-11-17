/* 과목 팩 등록: 기존 CPA 2차 재무관리 파일들(problems*.js · essays.js · concepts.js)을 'fm2' 팩으로 묶는다.
 * 다른 과목은 각자 파일(fm1.js, net.js …)에서 window.SWM_PACKS에 직접 등록한다.
 */
(function () {
  'use strict';
  window.SWM_PACKS = window.SWM_PACKS || {};
  window.SWM_PACKS.fm2 = {
    labels: {"cb-replace":"설비 교체, 증분현금흐름","cb-payback":"투자안 평가 지표, 자본할당","cb-mirr":"피셔의 수익률, 수명이 다른 투자안","pf-capm-alpha-arb":"SML 가격오류, 차익거래","pf-cml-sml-eff":"CML, SML","pf-apt-three":"2요인 APT, 복제 차익거래","pf-factor-cov":"2요인 모형, 요인 중립 포트폴리오","pf-capm-states":"베타 추정, SML","pf-cml-utility":"효용함수, 최적 투자","pf-two-asset":"최소분산, 접점 포트폴리오","pf-apt":"단일요인 APT, 차익거래","bd-spot-duration":"기간구조, 듀레이션","bd-immunization":"면역전략, 재조정","dv-binomial":"이항모형, 조기행사","dv-futures":"주가지수선물, 헤지","cf-mm":"MM(1963), 자본재구성","cf-merger-eps":"합병, 교환비율","cf-payout":"배당정책, 자가배당","cb-apv":"APV, 정책자금 대출","cb-ceq":"확실성등가법, 위험조정할인율법","cb-realopt":"실물옵션, 투자 연기","cb-valuation":"FCFF·FCFE, 배당할인모형","pf-perf":"성과평가, 자산배분","bd-replicate-arb":"현물이자율, 복제 차익거래","bd-credit":"부도위험, 약속수익률","bd-immun-convex":"볼록성, 바벨형 면역","dv-swap":"금리스왑, FRA","dv-parity-strategy":"풋-콜 패리티, 강세 스프레드","cf-rights":"유상증자, 신주인수권","cf-agency":"대리문제, 부의 이전","es-01":"IRR법, 독립적 투자안","es-02":"상호배타적 투자안, IRR","es-03":"IRR과 NPV 비교","es-04":"부채비율 유지, 증분 자기자본","es-05":"위험조정할인율법, 먼 미래 현금흐름","es-06":"실물옵션, 전통적 NPV","es-07":"CAPM, APT 균형 회복","es-08":"CAPM과 APT 비교","es-09":"2단계 회귀분석, CAPM 검증","es-10":"베타 추정, 베타 변화","es-11":"CAPM 균형가격, 가격 조정","es-12":"단일지수모형, 공분산모형","es-13":"샤프지수, 트레이너지수","es-14":"시장타이밍, 젠센 알파","es-15":"Fama-French, 성과 회귀모형","es-16":"시간가중수익률, 금액가중수익률","es-17":"ETF, 효율적 시장가설","es-18":"듀레이션, 채권가격 변화","es-19":"부채 면역, 면역의 한계","es-20":"금리선물, 이자율 헤지","es-21":"수익률 스프레드, 채무불이행위험","es-22":"스트랭글 구성","es-23":"주가지수선물, 배당수익률","es-24":"변동성, 옵션가격","es-25":"미국형 콜, 조기행사","es-26":"CDS, TRS","es-27":"자본구조 이론, 상충이론","es-28":"MM(1963), 부채비율","es-29":"인수대가, 현금·주식","es-30":"적대적 인수, 방어수단","es-31":"정보비대칭, 유상증자 신호","es-32":"정보비대칭, 재무적 행동","es-33":"자사주 매입, 현금배당","es-34":"기업분할, 물적분할","es-35":"주주 부 극대화, 변동계수","es-36":"합병, 채권자와 주주","y26-1":"IRR·MIRR, EAC","y26-2":"베타 추정, 제로베타 차익거래","y26-3":"위험회피계수, 샤프비율","y26-4":"유상증자, 신주인수권","y26-5":"LBO, 조건부 인수대가","y26-6":"선도이자율, 변동금리채","y26-7":"상태가격, 미국형 풋","ai-cb-breakeven":"재무적 손익분기점, 가격 민감도","ai-cb-realopt":"확장옵션, 포기옵션","ai-pf-addasset":"위험회피계수, 샤프비율","ai-pf-treynorblack":"트레이너-블랙, 정보비율","ai-bd-ride":"수익률곡선 타기, 선도이자율","ai-bd-cds":"위험중립 부도확률, CDS","ai-dv-els":"ELS, 참여율","ai-dv-ccs":"통화스왑, 비교우위","ai-cf-tradeoff":"상충이론, 자사주 매입","ai-cf-paytax":"개인세, 배당락","ai-dv-statepx":"상태가격, 디지털옵션","ai-dv-amdiv":"배당 이항모형, 선택옵션","ai-dv-amdiv2":"배당 이항모형, 선도가격","ai-dv-pxtable":"옵션 가격표, 비례성","ai-dv-implied":"이항 트리 역산, 미국형 풋","cb-x-wacc":"대용 베타, 확장옵션","cb-x-infl":"인플레이션, 실질 연간균등가치","pf-x-tb":"트레이너-블랙, 능동적 포트폴리오","pf-x-apt":"2요인 APT, 차익거래","cf-x-miller":"개인세(Miller), 재무적 곤경비용","cf-x-agency":"위험 전이, 과소투자"},   // 문제 목록 한 줄 표시용 핵심 개념
    key: 'fm2', name: 'CPA 2차 재무관리', units: window.FM_UNITS, probs: window.FM_PROBLEMS, summary: window.FM_SUMMARY, concepts: window.FM_CONCEPTS || [], ai: window.FM_AI,   // ai_fm2.js: AI 출제(약점 맞춤·기출 빈도)
    mockMix: { cb: 1, pf: 2, bd: 1, dv: 1, cf: 2 }, mockMin: 120, mockN: 7,
    daily: [2, 3, 4, 5, 7], dailyDef: 4,
    qTimer: true,   // 문제은행·AI 출제 문제별 제한 시간(하 10분 · 중 15분 · 상 20분)
    dailyMock: true,   // 일일 모의고사: 하루에 단원마다 1문제(5단원 = 5문제), 문제은행 전체에서 사용자별 무작위
    kinds: [['계산형', d => !d.essay], ['약술형', d => !!d.essay]],
    cxUnit: [['cb', /자본예산|투자안\s*평가/], ['pf', /포트폴리오|투자론/], ['bd', /채권/], ['dv', /파생/], ['cf', /기업재무|자본구조|재무구조/]],
    text: {},   // 비워 두면 index.html에 적힌 기존 문구 그대로
  };
  window.SWM_ORDER = ['fm2', 'fm1', 'net', 'ipe'];   // 과목 선택 목록 순서
})();
