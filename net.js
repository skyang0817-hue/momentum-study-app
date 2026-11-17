/* 네트워크관리사 2급 필기 대비 문제
 * - 과목별 출제 범위(TCP/IP · 네트워크 일반 · NOS · 네트워크 운용기기)에서 반복 출제되는 주제를 바탕으로 새로 만든 문제이며,
 *   시판 문제집이나 협회 기출의 문장을 옮기지 않았다.
 * - 실제 필기처럼 〈보기〉 설명형·명령어 출력 해석형·상황형 문항을 포함한다.
 * - 2017~2026년 기출 20회분(CBT 공개 자료)의 과목 배분과 빈출 주제를 분석해 부족한 주제를 보강했다. 기출 문장은 옮기지 않고 새로 썼다.
 * - 객관식(4지선다, 회독마다 보기 순서 섞임) · 서브넷 계산(회독마다 IP가 바뀜) · O/X · 암기 카드로 구성.
 */
(function () {
  'use strict';
  const M = window.SWM_MCQ;
  const PTS = 2;
  const UNITS = [
    { k: 'tc', name: 'TCP/IP', desc: 'OSI·IP 주소·서브넷·프로토콜·포트' },
    { k: 'ng', name: '네트워크 일반', desc: '토폴로지·전송매체·다중화·오류제어' },
    { k: 'os', name: 'NOS', desc: 'Windows Server·Linux' },
    { k: 'eq', name: '네트워크 운용기기', desc: '허브·스위치·라우터·VLAN·보안장비' },
  ];
  const P = [];
  const mc = (id, unit, title, stem, opts, sol, ans = 0) => P.push(M.fixed({ id: 'nw-' + id, unit, pts: PTS, title, trend: '빈출: ' + title, stem: /^</.test(stem) ? stem : `<p>${stem}</p>`, opts, ans, sol }));
  const ox = (id, unit, title, stmt, ok, sol) => P.push(M.ox({ id: 'nw-ox-' + id, unit, pts: PTS, title, stmt, ok, sol }));
  const cards = [];
  const cd = (unit, q, a, kw) => cards.push({ unit, q, a, kw });

  /* ───────── 서브넷 계산 (회독마다 IP·프리픽스가 바뀜) ───────── */
  const ip2n = s => s.split('.').reduce((a, x) => a * 256 + +x, 0);
  const n2ip = n => [24, 16, 8, 0].map(s => Math.floor(n / 2 ** s) % 256).join('.');
  const maskN = p => 2 ** 32 - 2 ** (32 - p);
  const netOf = (ip, p) => Math.floor(ip / 2 ** (32 - p)) * 2 ** (32 - p);
  const NO = ['①', '②', '③', '④'];
  // 문자열 보기 4개 (정답 + 오답 후보, 중복 제거, 정렬 규칙 key)
  function strMcq(s) {
    return {
      id: 'nw-' + s.id, unit: 'tc', pts: PTS, title: s.title, trend: '빈출: 서브넷 계산', mcq: true,
      p: s.p, vary: s.vary,
      calc(p) {
        const c = s.calc(p), out = [c.ans];
        s.wrong(p, c).forEach(w => { if (!out.includes(w)) out.push(w); });
        // 오답 후보를 앞에서부터 3개 쓰되, 정답이 몇 번째에 올지는 문제·숫자마다 고정 난수로 정한 뒤 크기순으로 맞춘다
        const pos = Math.floor(M.h01(s.id + JSON.stringify(p)) * 4), ws = out.slice(1).sort((a, b) => s.key(a) - s.key(b));
        const below = ws.filter(w => s.key(w) < s.key(c.ans)), above = ws.filter(w => s.key(w) > s.key(c.ans));
        const lo = pos ? below.slice(-Math.min(pos, below.length)) : [], hi = above.slice(0, 3 - lo.length);
        const vals = [...(lo.length + hi.length < 3 ? below.slice(-(3 - hi.length)) : lo), c.ans, ...hi].sort((a, b) => s.key(a) - s.key(b));
        c._ch = { vals, ans: vals.indexOf(c.ans) };
        return c;
      },
      body: s.stem,
      qs: [{ type: 'choice', mc: true, nolab: true, text: '', optsf: (p, c) => c._ch.vals.map((v, i) => `${NO[i]} ${v}`), ans: c => c._ch.ans, sol: s.sol }],
    };
  }
  const ipVary = R => {
    const a = R.pick([10, 172, 192]), p = a === 192 ? R.int(25, 30) : R.int(20, 28);
    const ip = a === 10 ? `10.${R.int(0, 255)}.${R.int(0, 255)}.${R.int(1, 254)}` : a === 172 ? `172.${R.int(16, 31)}.${R.int(0, 255)}.${R.int(1, 254)}` : `192.168.${R.int(0, 255)}.${R.int(1, 254)}`;
    return { ip, p };
  };
  const ipKey = s => ip2n(s);
  P.push(strMcq({ id: 'sn-net', title: '서브넷의 네트워크 주소', p: { ip: '192.168.10.77', p: 27 }, vary: ipVary, key: ipKey,
    calc: p => { const n = netOf(ip2n(p.ip), p.p); return { n, ans: n2ip(n) }; },
    wrong: (p, c) => { const ip = ip2n(p.ip), size = 2 ** (32 - p.p); return [n2ip(c.n + size - 1), n2ip(c.n + 1), n2ip(netOf(ip, p.p + 1)), n2ip(netOf(ip, p.p - 1)), n2ip(netOf(ip, 24)), n2ip(c.n + size)]; },
    stem: p => `<p>호스트 IP 주소가 ${p.ip}/${p.p}일 때 이 호스트가 속한 서브넷의 네트워크 주소는?</p>`,
    sol: (p, c) => `/${p.p} → 서브넷 크기 2^${32 - p.p} = ${2 ** (32 - p.p)}개 주소. IP를 서브넷 마스크 ${n2ip(maskN(p.p))}와 AND 연산 → <b>${c.ans}</b>` }));
  P.push(strMcq({ id: 'sn-bc', title: '서브넷의 브로드캐스트 주소', p: { ip: '172.20.45.130', p: 26 }, vary: ipVary, key: ipKey,
    calc: p => { const n = netOf(ip2n(p.ip), p.p), b = n + 2 ** (32 - p.p) - 1; return { n, b, ans: n2ip(b) }; },
    wrong: (p, c) => [n2ip(c.n), n2ip(c.b - 1), n2ip(c.b + 1), n2ip(netOf(ip2n(p.ip), p.p + 1) + 2 ** (31 - p.p) - 1), n2ip(netOf(ip2n(p.ip), p.p - 1) + 2 ** (33 - p.p) - 1)],
    stem: p => `<p>IP 주소 ${p.ip}/${p.p}이 속한 서브넷의 브로드캐스트 주소는?</p>`,
    sol: (p, c) => `네트워크 주소 ${n2ip(c.n)} + 서브넷 크기 ${2 ** (32 - p.p)} − 1 → <b>${c.ans}</b> (호스트 부분 비트를 모두 1로)` }));
  P.push(strMcq({ id: 'sn-host', title: '서브넷당 사용 가능한 호스트 수', p: { p: 27 }, vary: R => ({ p: R.int(20, 30) }), key: s => parseInt(s.replace(/,/g, ''), 10),
    calc: p => ({ ans: (2 ** (32 - p.p) - 2).toLocaleString('ko-KR') + '개' }),
    wrong: p => [2 ** (32 - p.p), 2 ** (32 - p.p) - 1, 2 ** (31 - p.p) - 2, 2 ** (33 - p.p) - 2].map(x => x.toLocaleString('ko-KR') + '개'),
    stem: p => `<p>서브넷 마스크가 ${n2ip(maskN(p.p))}(/${p.p})인 서브넷에서 호스트에 할당할 수 있는 IP 주소의 개수는?</p>`,
    sol: p => `호스트 비트 ${32 - p.p}개 → 2^${32 - p.p} − 2(네트워크·브로드캐스트 주소 제외) = <b>${(2 ** (32 - p.p) - 2).toLocaleString('ko-KR')}개</b>` }));
  P.push(strMcq({ id: 'sn-split', title: 'C 클래스 서브네팅: 서브넷 수와 호스트 수', p: { p: 27, need: 6 },
    vary: R => { const p = R.int(25, 30); return { p, need: R.int(2 ** (p - 25) + 1, 2 ** (p - 24)) }; },
    key: s => parseInt(s, 10) * 1000 + parseInt(s.split('/ ')[1], 10),
    calc: p => ({ ans: `${2 ** (p.p - 24)}개 / ${2 ** (32 - p.p) - 2}개` }),
    wrong: p => [`${2 ** (p.p - 24)}개 / ${2 ** (32 - p.p)}개`, `${2 ** (p.p - 25)}개 / ${2 ** (33 - p.p) - 2}개`, `${2 ** (p.p - 23)}개 / ${2 ** (31 - p.p) - 2}개`, `${2 ** (32 - p.p) - 2}개 / ${2 ** (p.p - 24)}개`],
    stem: p => `<p>192.168.1.0/24 네트워크를 서브넷 ${p.need}개 이상으로 나누려 한다. 필요한 최소 비트만 빌려 서브넷 마스크를 정했을 때 (만들어지는 서브넷 수 / 서브넷당 사용 가능한 호스트 수)는? (서브넷 제로 사용 가능)</p>`,
    sol: p => `서브넷 ${p.need}개 이상 → 2^${p.p - 24} = ${2 ** (p.p - 24)} ≥ ${p.need}이므로 ${p.p - 24}비트를 빌려 /${p.p}<br>호스트 = 2^${32 - p.p} − 2 = <b>${2 ** (32 - p.p) - 2}개</b>` }));
  P.push(strMcq({ id: 'sn-mask', title: '프리픽스와 서브넷 마스크', p: { p: 22 }, vary: R => ({ p: R.int(17, 30) }), key: ipKey,
    calc: p => ({ ans: n2ip(maskN(p.p)) }),
    wrong: p => [p.p - 1, p.p + 1, p.p - 2, p.p + 2].filter(x => x >= 8 && x <= 31).map(x => n2ip(maskN(x))),
    stem: p => `<p>CIDR 표기 /${p.p}에 해당하는 서브넷 마스크는?</p>`,
    sol: p => `앞에서부터 ${p.p}비트가 1 → <b>${n2ip(maskN(p.p))}</b>` }));

  /* ───────── TCP/IP ───────── */
  mc('osi-pdu', 'tc', 'OSI 계층별 데이터 단위', 'OSI 계층과 데이터 단위(PDU)의 연결이 옳은 것은?', ['데이터링크 계층 – 프레임(Frame)', '네트워크 계층 – 세그먼트(Segment)', '전송 계층 – 비트(Bit)', '물리 계층 – 패킷(Packet)'], '물리 – 비트, 데이터링크 – 프레임, 네트워크 – 패킷, 전송 – 세그먼트(UDP는 데이터그램)이다.');
  mc('icmp', 'tc', 'ICMP와 ping', 'ping 명령이 사용하는 프로토콜과 메시지로 옳은 것은?', ['ICMP Echo Request / Echo Reply', 'TCP SYN / ACK', 'UDP 53번 질의 / 응답', 'ARP Request / Reply'], 'ping은 ICMP Echo Request를 보내고 Echo Reply를 받아 도달 여부와 왕복 시간을 확인한다.');
  mc('port2', 'tc', '포트 번호 (보안 프로토콜)', '원격 접속을 암호화해 제공하는 SSH의 기본 포트 번호는?', ['22', '23', '443', '3389'], 'SSH 22, Telnet 23(암호화 없음), HTTPS 443, Windows 원격 데스크톱(RDP) 3389.');
  mc('classc', 'tc', 'IPv4 클래스', 'IPv4 주소 200.10.5.1이 속한 클래스와 기본 서브넷 마스크로 옳은 것은?', ['C 클래스 – 255.255.255.0', 'B 클래스 – 255.255.0.0', 'A 클래스 – 255.0.0.0', 'D 클래스 – 255.255.255.0'], '첫 옥텟 기준 A 1~126, B 128~191, C 192~223, D 224~239(멀티캐스트), E 240~255(실험용). 200은 C 클래스이다.');
  mc('ipv6', 'tc', 'IPv6의 특징', 'IPv6에 관한 설명으로 옳지 않은 것은?', ['브로드캐스트 주소를 사용해 같은 네트워크 전체에 전송한다.', '주소 길이는 128비트이다.', '기본 헤더 길이가 40바이트로 고정되어 있다.', '주소 자동 설정(Stateless Auto-configuration)을 지원한다.'], 'IPv6에는 브로드캐스트가 없고 유니캐스트·멀티캐스트·애니캐스트를 쓴다.');
  mc('tcphdr', 'tc', 'TCP 헤더', 'TCP 헤더에 포함되지 않는 필드는?', ['TTL(Time To Live)', '순서 번호(Sequence Number)', '윈도우 크기(Window Size)', '확인 응답 번호(Acknowledgment Number)'], 'TTL은 IP 헤더의 필드로, 패킷이 라우터를 지날 때마다 1씩 줄어 0이 되면 버려져 무한 순환을 막는다.');
  mc('rip', 'tc', 'RIP', 'RIP에 관한 설명으로 옳은 것은?', ['홉 수를 기준으로 경로를 정하며 최대 홉 수는 15이다.', '대역폭과 지연을 함께 고려하는 링크 상태 프로토콜이다.', '자율 시스템 사이의 경로 정보를 교환한다.', '경로 정보를 변경이 있을 때만 전송한다.'], 'RIP는 거리 벡터 방식으로 홉 수만 보며 16홉은 도달 불가로 처리한다. 기본 30초마다 전체 라우팅 테이블을 이웃에게 보낸다.');
  mc('mail', 'tc', '전자우편 프로토콜', '메일 서버에서 메일을 받아오는(수신) 프로토콜이 아닌 것은?', ['SMTP', 'POP3', 'IMAP', 'POP3S'], 'SMTP(25)는 메일 송신·서버 간 전달용이다. POP3(110)와 IMAP(143)은 수신용이며(POP3S는 SSL로 암호화한 POP3, 995번), IMAP은 서버에 메일을 남겨 두고 여러 기기에서 동기화한다.');

  /* ───────── 네트워크 일반 ───────── */
  mc('topo-mesh', 'ng', '망형 토폴로지 회선 수', '노드 10개를 완전 망형(Full Mesh)으로 연결할 때 필요한 회선 수는?', ['45개', '90개', '10개', '20개'], '회선 수 = n(n−1)/2 = 10×9/2 = 45개.');
  mc('ieee', 'ng', 'IEEE 802 표준', 'IEEE 802 표준과 기술의 연결이 옳은 것은?', ['802.11 – 무선 LAN', '802.3 – 토큰 링', '802.5 – 이더넷', '802.15.1 – 무선 MAN(WiMAX)'], '802.3 이더넷, 802.5 토큰 링, 802.11 무선 LAN, 802.15.1 블루투스, 802.16 WiMAX.');
  mc('fiber', 'ng', '광섬유 케이블', '광섬유 케이블에 관한 설명으로 옳지 않은 것은?', ['전자기 간섭(EMI)의 영향을 많이 받는다.', '빛 신호로 데이터를 전송한다.', '감쇠가 적어 장거리 전송에 유리하다.', '단일 모드는 다중 모드보다 장거리 전송에 적합하다.'], '광섬유는 전기가 아닌 빛을 쓰므로 전자기 간섭을 받지 않고 도청이 어렵다.');
  mc('utp', 'ng', 'UTP 케이블', '이더넷에서 UTP 케이블 한 구간의 최대 권장 길이는?', ['100m', '185m', '500m', '2km'], '10/100/1000BASE-T의 UTP 한 구간은 100m이다. 185m는 10BASE2(얇은 동축), 500m는 10BASE5(굵은 동축) 기준이다.');
  mc('wdm', 'ng', '다중화 방식', '광섬유 한 가닥에서 서로 다른 파장의 빛에 여러 신호를 실어 보내는 다중화 방식은?', ['WDM(파장 분할 다중화)', 'TDM(시분할 다중화)', 'CDM(코드 분할 다중화)', 'STDM(통계적 시분할 다중화)'], 'FDM은 주파수, TDM은 시간, CDM은 코드, WDM은 빛의 파장으로 채널을 나눈다.');
  mc('duplex', 'ng', '통신 방식', '양쪽이 서로 데이터를 보낼 수 있지만 동시에는 한쪽만 보낼 수 있는 방식과 그 예로 옳은 것은?', ['반이중(Half Duplex) – 무전기', '전이중(Full Duplex) – 무전기', '단방향(Simplex) – 전화', '반이중(Half Duplex) – 라디오 방송'], '단방향은 라디오·TV 방송, 반이중은 무전기, 전이중은 전화처럼 동시에 양방향 통신한다.');
  mc('hamming', 'ng', '오류 제어', '수신 측에서 오류를 검출할 뿐 아니라 스스로 정정까지 할 수 있는 코드는?', ['해밍 코드(Hamming Code)', '패리티 비트', 'CRC', '체크섬(Checksum)'], '패리티·CRC·체크섬은 오류 검출용이다. 해밍 코드는 전진 오류 수정(FEC) 방식으로 1비트 오류를 정정할 수 있다.');
  mc('pcm', 'ng', 'PCM', '아날로그 신호를 디지털로 바꾸는 PCM 과정의 순서로 옳은 것은?', ['표본화 → 양자화 → 부호화', '양자화 → 표본화 → 부호화', '부호화 → 양자화 → 표본화', '표본화 → 부호화 → 양자화'], '일정 간격으로 값을 뽑고(표본화), 단계 값으로 근사하고(양자화), 2진 부호로 바꾼다(부호화). 표본화 주파수는 최고 주파수의 2배 이상이어야 한다(나이퀴스트).');
  mc('async', 'ng', '비동기식 전송', '문자마다 시작 비트(Start bit)와 정지 비트(Stop bit)를 붙여 전송하는 방식은?', ['비동기식 전송', '동기식 전송', '블록 전송', '병렬 전송'], '비동기식은 문자 단위로 동기를 맞추고, 동기식은 블록 단위로 송수신 측이 같은 클록을 맞춘다.');
  mc('lanwan', 'ng', 'LAN·MAN·WAN', '네트워크 규모에 관한 설명으로 옳은 것은?', ['LAN은 건물·캠퍼스처럼 좁은 지역을 연결하며 전송 속도가 빠르고 오류율이 낮다.', 'WAN은 LAN보다 좁은 지역을 고속으로 연결한다.', 'MAN은 한 건물 안의 컴퓨터만 연결한다.', 'LAN은 국가 사이를 연결하는 공중망이다.'], 'LAN < MAN(도시) < WAN(국가·대륙) 순으로 범위가 넓다.');

  /* ───────── NOS (Windows Server · Linux) ───────── */
  mc('ad', 'os', 'Active Directory', 'Windows Server의 Active Directory 도메인 서비스(AD DS)에 관한 설명으로 옳은 것은?', ['사용자·컴퓨터·그룹 같은 개체를 중앙에서 관리하고 인증하는 디렉터리 서비스이다.', '웹 페이지를 제공하는 웹 서버 역할이다.', '하드 디스크를 미러링하는 기능이다.', 'IP 주소를 자동으로 할당하는 서비스이다.'], 'AD DS를 설치한 서버가 도메인 컨트롤러이며, 그룹 정책(GPO)으로 도메인의 사용자·컴퓨터 설정을 한꺼번에 관리한다.');
  mc('ntfs', 'os', 'NTFS', 'FAT32와 비교한 NTFS의 특징으로 옳지 않은 것은?', ['파일·폴더 단위 접근 권한을 설정할 수 없다.', '파일 단위 암호화(EFS)와 압축을 지원한다.', '디스크 할당량(Quota)을 설정할 수 있다.', '4GB보다 큰 파일을 저장할 수 있다.'], 'NTFS는 파일·폴더 권한(ACL), 암호화, 압축, 할당량, 저널링을 지원한다. FAT32는 파일 하나가 4GB를 넘을 수 없다.');
  mc('nslookup', 'os', 'nslookup', 'DNS 서버에 질의해 도메인 이름에 해당하는 IP 주소를 확인하는 명령어는?', ['nslookup', 'tracert', 'netstat', 'arp -a'], 'tracert는 목적지까지의 경로(라우터), netstat은 연결·포트 상태, arp -a는 ARP 캐시(IP-MAC 대응)를 보여 준다.');
  mc('tracert', 'os', 'tracert', 'Windows에서 목적지까지 패킷이 거치는 라우터 경로를 확인하는 명령어는?', ['tracert', 'traceroute', 'ping', 'route print'], 'Windows는 tracert, Linux는 traceroute를 쓴다. 둘 다 TTL을 1씩 늘리며 각 홉의 응답을 받는다.');
  mc('netstat', 'os', 'netstat', '현재 열려 있는 포트와 TCP 연결 상태(LISTENING, ESTABLISHED 등)를 확인하는 명령어는?', ['netstat', 'ipconfig', 'nslookup', 'hostname'], 'netstat -an은 모든 연결과 포트를 숫자로 보여 준다. ipconfig는 IP 설정을 확인하는 명령이다.');
  mc('ipconfig', 'os', 'ipconfig', 'DHCP로 받은 IP 주소를 반납하고 새로 받는 Windows 명령어의 조합은?', ['ipconfig /release 후 ipconfig /renew', 'ipconfig /all 후 ipconfig /flushdns', 'ipconfig /displaydns 후 ipconfig /all', 'netstat -r 후 route add'], '/all은 상세 설정 확인, /flushdns는 DNS 캐시 삭제, /displaydns는 DNS 캐시 보기이다.');
  mc('raid5', 'os', 'RAID 5', '패리티 정보를 여러 디스크에 분산 저장하며 최소 3개의 디스크가 필요한 RAID 수준은?', ['RAID 5', 'RAID 0', 'RAID 1', 'RAID 6'], 'RAID 0은 스트라이핑(내결함성 없음, 최소 2개), RAID 1은 미러링(최소 2개), RAID 5는 분산 패리티(최소 3개, 디스크 1개 고장 허용), RAID 6은 이중 패리티(최소 4개, 2개 고장 허용).');
  mc('dns-ptr', 'os', '역방향 조회', 'IP 주소로 도메인 이름을 찾는 역방향 조회 영역에 쓰이는 레코드는?', ['PTR', 'MX', 'AAAA', 'SOA'], 'PTR 레코드는 역방향 조회 영역(in-addr.arpa)에서 IP → 이름을 알려 준다.');
  mc('rdp', 'os', '원격 데스크톱', 'Windows 원격 데스크톱(RDP)이 기본으로 사용하는 포트는?', ['TCP 3389', 'TCP 22', 'TCP 23', 'TCP 5900'], 'RDP 3389, SSH 22, Telnet 23, VNC 5900.');
  mc('hyperv', 'os', 'Hyper-V', 'Windows Server에서 하나의 물리 서버에 여러 가상 머신을 실행하게 해 주는 역할은?', ['Hyper-V', 'IIS', 'WSUS', 'BitLocker'], 'IIS는 웹 서버, WSUS는 Windows 업데이트 배포, BitLocker는 드라이브 암호화 기능이다.');
  mc('chown', 'os', 'Linux 소유자 변경', 'Linux에서 파일의 소유자를 바꾸는 명령어는?', ['chown', 'chmod', 'chgrp', 'umask'], 'chmod는 권한, chgrp는 소유 그룹, umask는 새 파일의 기본 권한을 정한다.');
  mc('etc', 'os', 'Linux 디렉터리 구조', 'Linux에서 시스템 설정 파일이 주로 저장되는 디렉터리는?', ['/etc', '/var', '/home', '/dev'], '/var는 로그 등 자주 바뀌는 파일, /home은 사용자 홈, /dev는 장치 파일, /bin은 기본 명령어가 있다.');
  mc('shadow', 'os', 'Linux 계정 파일', 'Linux에서 사용자의 암호화된 비밀번호가 저장되는 파일은?', ['/etc/shadow', '/etc/passwd', '/etc/group', '/etc/hosts'], '/etc/passwd에는 계정 정보(UID·홈·셸)가 있고, 비밀번호 해시는 root만 읽을 수 있는 /etc/shadow에 둔다.');
  mc('df', 'os', 'Linux 디스크 사용량', 'Linux에서 파일 시스템(파티션)별 디스크 사용량과 남은 용량을 보여 주는 명령어는?', ['df', 'du', 'free', 'top'], 'du는 디렉터리·파일별 사용량, free는 메모리, top은 프로세스·CPU 사용 현황을 보여 준다.');
  mc('ps', 'os', 'Linux 프로세스', 'Linux에서 실행 중인 프로세스 목록을 확인하는 명령어는?', ['ps', 'kill', 'pwd', 'cat'], 'kill은 프로세스에 신호를 보내 종료하고, pwd는 현재 디렉터리, cat은 파일 내용을 출력한다.');
  mc('vi', 'os', 'vi 편집기', 'vi 편집기 명령 모드에서 변경 내용을 저장하고 종료하는 명령은?', [':wq', ':q!', ':w', 'dd'], ':q!는 저장하지 않고 강제 종료, :w는 저장만, dd는 현재 줄 삭제이다.');
  mc('redir', 'os', 'Linux 리디렉션', 'Linux 셸에서 명령의 출력 결과를 파일 끝에 덧붙이는 기호는?', ['>>', '>', '|', '<'], '>는 파일을 덮어쓰고, >>는 뒤에 추가한다. |(파이프)는 앞 명령의 출력을 뒤 명령의 입력으로 넘긴다.');
  mc('umask', 'os', 'umask', 'Linux에서 umask가 022일 때 새로 만든 일반 파일의 기본 권한은?', ['644 (rw-r--r--)', '755 (rwxr-xr-x)', '666 (rw-rw-rw-)', '600 (rw-------)'], '일반 파일의 기본값 666에서 022를 빼면 644, 디렉터리는 777에서 빼서 755가 된다.');
  mc('samba', 'os', 'Samba', 'Linux와 Windows 사이에서 파일·프린터를 공유할 수 있게 해 주는 서비스는?', ['Samba', 'NFS', 'Apache', 'Sendmail'], 'Samba는 Windows의 SMB/CIFS 프로토콜을 구현한다. NFS는 주로 유닉스·Linux 사이의 파일 공유, Apache는 웹 서버, Sendmail은 메일 서버이다.');
  mc('pkg', 'os', 'Linux 패키지 관리', 'Red Hat 계열(CentOS·Rocky 등) Linux에서 의존성을 자동으로 해결하며 패키지를 설치하는 명령어는?', ['yum(dnf) install', 'apt install', 'rpm -qa', 'tar -xvf'], 'apt는 Debian·Ubuntu 계열, rpm -qa는 설치된 패키지 목록 확인, tar -xvf는 압축 해제이다.');

  /* ───────── 네트워크 운용기기 ───────── */
  mc('hub', 'eq', '허브', '허브(Hub)에 관한 설명으로 옳은 것은?', ['받은 신호를 다른 모든 포트로 내보내며, 연결된 장치들은 하나의 충돌 도메인에 속한다.', 'MAC 주소 테이블을 보고 목적지 포트로만 프레임을 보낸다.', 'IP 주소를 보고 경로를 결정한다.', '서로 다른 프로토콜을 변환한다.'], '허브는 물리 계층 장비로 충돌 도메인을 나누지 못한다. MAC 주소로 포트를 고르는 것은 스위치, IP로 경로를 정하는 것은 라우터이다.');
  mc('router', 'eq', '라우터', 'OSI 3계층에서 동작하며 서로 다른 네트워크를 연결하고 최적 경로를 결정하는 장비는?', ['라우터', '리피터', '브리지', '허브'], '리피터·허브는 1계층, 브리지·스위치는 2계층, 라우터는 3계층 장비이다.');
  mc('repeater', 'eq', '리피터', '감쇠된 신호를 증폭·재생해 전송 거리를 늘리는 1계층 장비는?', ['리피터', '라우터', '게이트웨이', 'L4 스위치'], '리피터는 신호만 재생할 뿐 주소를 해석하지 않는다.');
  mc('gateway', 'eq', '게이트웨이', '프로토콜 구조가 서로 다른 네트워크를 연결하기 위해 상위 계층까지 프로토콜을 변환하는 장비는?', ['게이트웨이', '브리지', '허브', '리피터'], '게이트웨이는 전송 계층 이상에서 서로 다른 프로토콜을 변환한다. PC 설정의 \'기본 게이트웨이\'는 다른 네트워크로 나가는 라우터 주소를 뜻한다.');
  mc('stp', 'eq', 'STP', '스위치를 이중으로 연결했을 때 생기는 루프(브로드캐스트 스톰)를 막기 위한 프로토콜은?', ['STP(Spanning Tree Protocol)', 'VTP', 'HSRP', 'ARP'], 'STP(IEEE 802.1D)는 루트 브리지를 정하고 일부 포트를 차단해 루프 없는 트리 구조를 만든다.');
  mc('saf', 'eq', '스위칭 방식', '프레임 전체를 받아 저장한 뒤 CRC 오류를 검사하고 전달하는 스위칭 방식은?', ['Store-and-Forward', 'Cut-Through', 'Fragment-Free', 'Port Mirroring'], 'Cut-Through는 목적지 MAC 주소만 읽고 바로 전달(빠르지만 오류 검사 없음), Fragment-Free는 앞 64바이트만 확인한다.');
  mc('ips', 'eq', 'IDS와 IPS', '네트워크 트래픽을 분석해 공격을 탐지하고 실시간으로 차단까지 하는 보안 장비는?', ['IPS', 'IDS', 'NAT', 'DHCP 서버'], 'IDS는 침입을 탐지해 알리는 데 그치고, IPS는 트래픽 경로에 위치해 탐지한 공격을 차단한다.');
  mc('runcfg', 'eq', '라우터 설정 확인', 'Cisco 라우터에서 현재 RAM에서 동작 중인 설정을 확인하는 명령은?', ['show running-config', 'show startup-config', 'copy running-config startup-config', 'show version'], 'startup-config는 NVRAM에 저장된 부팅 설정, copy run start는 현재 설정을 저장하는 명령, show version은 IOS 버전·하드웨어 정보.');
  mc('l4', 'eq', 'L4 스위치', 'TCP/UDP 포트 정보를 보고 여러 서버에 트래픽을 나눠 주는(부하 분산) 장비는?', ['L4 스위치', 'L2 스위치', '리피터 허브', '브리지'], 'L4 스위치는 IP와 포트 번호를 기준으로 서버 부하 분산을 한다. L7 스위치는 URL·쿠키 같은 응용 계층 정보까지 본다.');
  mc('poe', 'eq', 'PoE', '이더넷 케이블로 데이터와 함께 전력을 공급해 AP·IP 카메라를 따로 전원 없이 쓰게 하는 기술은?', ['PoE(Power over Ethernet)', 'PPPoE', 'VoIP', 'QoS'], 'PPPoE는 이더넷 위에서 PPP 접속(인증)을 하는 방식, QoS는 트래픽 우선순위를 관리하는 기술이다.');

  /* ───────── 실제 필기처럼: 〈보기〉 설명형 · 명령어 출력 해석형 · 상황형 ───────── */
  const li = a => '<ul class="facts">' + a.map(x => `<li>${x}</li>`).join('') + '</ul>';
  const bogi = a => `<div class="bogi"><b>〈보기〉</b>${li(a)}</div>`;
  const cli = t => `<pre class="cli">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`;
  const q = t => `<p>${t}</p>`;
  // TCP/IP
  mc('osi-l4', 'tc', 'OSI 전송 계층', q('다음 〈보기〉에서 설명하는 OSI 7계층의 계층은?') + bogi(['송신 호스트와 수신 호스트 사이의 종단 간(end-to-end) 데이터 전송을 책임진다.', '상위 계층의 데이터를 세그먼트로 나누고, 흐름 제어·오류 제어·혼잡 제어를 수행한다.', '포트 번호로 같은 호스트 안의 여러 응용 프로그램을 구분한다.', '대표 프로토콜로 TCP와 UDP가 있다.']), ['전송 계층(Transport Layer)', '네트워크 계층(Network Layer)', '세션 계층(Session Layer)', '데이터링크 계층(Data Link Layer)'], '포트 번호·세그먼트·TCP/UDP는 전송 계층(4계층)의 특징이다. 경로 선택은 네트워크 계층, 대화 관리는 세션 계층, 프레임·MAC 주소는 데이터링크 계층이다.');
  mc('arp', 'tc', 'ARP 동작', q('호스트 A(192.168.1.10/24)가 같은 네트워크에 있는 호스트 B(192.168.1.20)에게 처음으로 IP 패킷을 보내려 한다. A의 ARP 캐시에는 B에 대한 정보가 없다. A가 패킷을 보내기 전에 먼저 수행하는 동작으로 옳은 것은?'), ['B의 MAC 주소를 묻는 ARP 요청을 브로드캐스트로 보낸다.', 'DNS 서버에 B의 IP 주소를 질의한다.', '기본 게이트웨이에 ICMP Redirect 메시지를 보낸다.', 'RARP 요청을 보내 자신의 IP 주소를 받는다.'], '같은 네트워크로 프레임을 보내려면 목적지 MAC 주소가 필요하다. ARP 요청은 브로드캐스트(FF:FF:FF:FF:FF:FF)로 보내고, B가 자신의 MAC 주소를 유니캐스트로 응답한다.');
  mc('dhcp', 'tc', 'DHCP 주소 할당 과정', q('사내 PC가 부팅되면서 DHCP 서버로부터 IP 주소를 받는다. 이때 PC와 DHCP 서버가 주고받는 메시지의 순서로 옳은 것은?') + bogi(['PC는 아직 IP 주소가 없으므로 첫 메시지를 브로드캐스트로 보낸다.', '서버는 임대할 수 있는 주소를 제안하고, PC는 그중 하나를 골라 요청한다.', '서버가 최종 확인 메시지를 보내면 PC는 주소를 사용하기 시작한다.']), ['Discover → Offer → Request → Ack', 'Request → Offer → Discover → Ack', 'Discover → Request → Offer → Ack', 'Offer → Discover → Ack → Request'], 'DORA(Discover-Offer-Request-Ack) 순서이다. DHCP는 UDP 67(서버)·68(클라이언트) 포트를 사용한다.');
  mc('udp', 'tc', 'UDP를 쓰는 프로토콜', q('다음 중 전송 계층 프로토콜로 UDP를 사용하는 응용 프로토콜로만 묶인 것은?'), ['DNS 질의, DHCP, SNMP, TFTP', 'HTTP, FTP, SMTP, Telnet', 'SSH, DNS 질의, POP3, SNMP', 'DHCP, HTTPS, IMAP, TFTP'], 'DNS 일반 질의(53), DHCP(67/68), SNMP(161), TFTP(69)는 UDP를 쓴다. HTTP·FTP·SMTP·Telnet·SSH·POP3·HTTPS·IMAP은 TCP를 쓴다.');
  mc('tcp-3way', 'tc', 'TCP 3-way handshake 순서 번호', q('클라이언트(10.1.1.5)가 웹 서버(10.1.1.100:80)에 접속하는 과정에서 캡처한 TCP 세그먼트이다. ②의 확인 응답 번호(Ack)와 ③의 확인 응답 번호(Ack)로 옳은 것은?') + cli('① 10.1.1.5:52100 → 10.1.1.100:80   [SYN]       Seq=1000\n② 10.1.1.100:80  → 10.1.1.5:52100 [SYN, ACK]  Seq=5000  Ack=( 가 )\n③ 10.1.1.5:52100 → 10.1.1.100:80   [ACK]       Seq=1001  Ack=( 나 )'), ['(가) 1001, (나) 5001', '(가) 1000, (나) 5000', '(가) 1001, (나) 5000', '(가) 5001, (나) 1001'], 'SYN은 순서 번호 1개를 소비하므로 상대는 받은 Seq + 1을 Ack로 보낸다. ② Ack = 1000 + 1 = 1001, ③ Ack = 5000 + 1 = 5001.');
  mc('ipv6-abbr', 'tc', 'IPv6 주소 축약', q('IPv6 주소 2001:0db8:0000:0000:0000:ff00:0042:8329를 표기 규칙에 맞게 가장 짧게 줄인 것은?'), ['2001:db8::ff00:42:8329', '2001:db8::ff:42:8329', '2001::db8::ff00:42:8329', '2001:db8:0::ff00:0042:8329'], '각 블록 앞의 0은 생략할 수 있고(0db8 → db8, 0042 → 42), 연속된 0 블록은 :: 로 한 번만 줄일 수 있다. 뒤쪽 0(ff00)은 생략할 수 없고 ::를 두 번 쓸 수 없다.');
  mc('port', 'tc', '방화벽에서 열어야 할 포트', q('보안 담당자가 외부에서 사내 서버로 들어오는 트래픽 중 다음 서비스만 허용하려 한다. 방화벽에서 허용해야 하는 TCP 포트 번호의 조합으로 옳은 것은?') + bogi(['웹 서비스(HTTP, HTTPS)', '관리자용 암호화 원격 접속(SSH)', '외부 메일 서버로부터의 메일 수신(SMTP)']), ['22, 25, 80, 443', '21, 25, 80, 443', '22, 110, 80, 443', '23, 25, 80, 8080'], 'HTTP 80, HTTPS 443, SSH 22, SMTP 25. 21은 FTP 제어, 23은 Telnet, 110은 POP3이다.');
  mc('nat', 'tc', 'NAT·PAT', q('사내망 192.168.10.0/24에 있는 PC 200대가 인터넷 공유기에 할당된 공인 IP 주소 1개만으로 동시에 인터넷을 사용하고 있다. 공유기가 출발지 IP 주소와 함께 포트 번호까지 바꿔 각 연결을 구분하는 이 기술은?'), ['PAT(NAPT, 포트 주소 변환)', '정적 NAT(1:1 주소 변환)', 'DHCP 릴레이', 'VLAN 트렁킹'], 'PAT(NAPT)는 공인 IP 하나를 여러 내부 호스트가 공유하도록 포트 번호로 연결을 구분한다. 정적 NAT는 내부 주소 하나를 공인 주소 하나에 고정 대응시킨다.');
  mc('ospf', 'tc', 'OSPF', q('다음 〈보기〉의 특징을 모두 가진 라우팅 프로토콜은?') + bogi(['링크 상태(Link State) 방식의 내부 라우팅 프로토콜(IGP)이다.', '다익스트라(SPF) 알고리즘으로 목적지까지의 최단 경로를 계산한다.', '네트워크를 영역(Area)으로 나누어 계층적으로 관리하며, 백본 영역은 Area 0이다.', '전체 라우팅 테이블을 주기적으로 보내지 않고 변화가 있을 때 LSA를 전파한다.']), ['OSPF', 'RIP', 'BGP', 'IGRP'], 'RIP·IGRP는 거리 벡터 방식이고, BGP는 자율 시스템(AS) 사이에서 쓰는 경로 벡터 방식의 외부 라우팅 프로토콜이다.');
  mc('private', 'tc', '사설 IP 대역', q('네트워크 관리자가 아래 네 IP 주소를 각각 서버에 설정하였다. 별도의 NAT 없이 인터넷에서 직접 접근할 수 있는(사설 대역이 아닌) 주소는?'), ['172.32.10.1', '10.200.1.1', '172.20.5.5', '192.168.100.10'], '사설 대역은 10.0.0.0/8, 172.16.0.0/12(172.16.0.0~172.31.255.255), 192.168.0.0/16이다. 172.32.10.1은 사설 대역 밖이다.');
  // 네트워크 일반
  mc('topo-star', 'ng', '네트워크 토폴로지', q('다음 〈보기〉에서 설명하는 네트워크 토폴로지는?') + bogi(['모든 단말이 중앙의 허브나 스위치에 일대일로 연결된다.', '단말 하나의 고장이나 케이블 단선은 다른 단말에 영향을 주지 않는다.', '관리와 확장이 쉽지만 중앙 장비가 고장 나면 전체 통신이 멈춘다.']), ['성형(Star)', '버스형(Bus)', '링형(Ring)', '망형(Mesh)'], '중앙 장비가 단일 장애점(SPOF)인 것은 성형의 대표적인 단점이다. 망형은 모든 노드를 연결해 신뢰성이 가장 높지만 회선 비용이 크다.');
  mc('csmacd', 'ng', 'CSMA/CD 충돌 처리', q('공유 매체를 쓰는 이더넷(IEEE 802.3)에서 두 호스트가 동시에 프레임을 보내 충돌이 발생하였다. 이 매체 접근 방식에서 충돌을 감지한 뒤의 처리로 옳은 것은?'), ['잼(Jam) 신호를 보내 충돌을 알리고, 임의의 시간(백오프)만큼 기다린 뒤 다시 전송한다.', '토큰을 받을 때까지 기다렸다가 다시 전송한다.', 'RTS/CTS 프레임으로 채널을 예약한 뒤 다시 전송한다.', '충돌한 프레임은 버리고 다시 전송하지 않는다.'], 'CSMA/CD는 충돌 감지 → 잼 신호 → 이진 지수 백오프 후 재전송한다. 토큰은 토큰 링, RTS/CTS는 무선 LAN(CSMA/CA)의 방식이다.');
  mc('arq', 'ng', 'Go-Back-N ARQ', q('송신 측이 슬라이딩 윈도우로 프레임 0번부터 6번까지 연속으로 보냈는데, 수신 측이 3번 프레임에서 오류를 발견하였다. Go-Back-N ARQ를 사용할 때 송신 측이 다시 보내야 하는 프레임은?'), ['3, 4, 5, 6번', '3번만', '0번부터 6번까지 전부', '4, 5, 6번'], 'Go-Back-N은 오류 난 프레임부터 그 뒤에 보낸 프레임을 모두 재전송한다. 오류 난 프레임만 다시 보내는 방식은 Selective Repeat ARQ이다.');
  mc('vpn', 'ng', 'VPN', q('재택근무자가 집의 인터넷 회선을 통해 회사 내부망의 업무 서버에 접속하려 한다. 공중망(인터넷) 위에 IPSec이나 SSL로 암호화된 터널을 만들어 전용선처럼 안전하게 쓰게 해 주는 기술은?'), ['VPN', 'VLAN', 'NAT', 'DMZ'], 'VPN은 공중망 위에 암호화된 가상 사설망을 만든다. VLAN은 스위치에서 논리적으로 망을 나누는 기술, DMZ는 외부에 공개하는 서버를 두는 완충 구역이다.');
  // NOS
  mc('chmod', 'os', 'ls -l 권한 해석', q('Linux에서 ls -l 명령을 실행한 결과의 일부이다. dev 그룹에 속한 사용자 lee(파일 소유자 아님)가 run.sh 파일에 대해 할 수 있는 작업으로 옳은 것은?') + cli('-rwxr-x---  1 kim  dev  2048 Oct 30 10:00 run.sh'), ['파일 내용을 읽고 실행할 수 있다.', '파일 내용을 읽고, 수정하고, 실행할 수 있다.', '파일 내용을 읽을 수만 있다.', '아무 작업도 할 수 없다.'], '권한 rwx r-x --- 는 소유자(kim) rwx, 그룹(dev) r-x, 기타 --- 이다. 숫자로는 750이다.');
  mc('apipa', 'os', 'APIPA 주소', q('사용자가 인터넷이 안 된다고 하여 Windows PC에서 ipconfig /all을 실행한 결과의 일부이다. 가장 가능성이 높은 원인은?') + cli('DHCP 사용 . . . . . . . . . . : 예\n자동 구성 사용 . . . . . . . . : 예\n자동 구성 IPv4 주소 . . . . . : 169.254.37.112\n서브넷 마스크 . . . . . . . . . : 255.255.0.0\n기본 게이트웨이 . . . . . . . . :'), ['DHCP 서버로부터 주소를 받지 못해 APIPA 주소가 자동으로 할당되었다.', '관리자가 고정 IP 주소를 정상적으로 설정하였다.', 'DNS 서버 주소만 잘못 입력되었다.', 'IPv6만 사용하도록 설정되어 IPv4 주소가 없다.'], '169.254.0.0/16은 DHCP 서버를 찾지 못했을 때 Windows가 스스로 붙이는 APIPA(자동 사설 IP) 주소이다. 게이트웨이가 없어 외부와 통신할 수 없으므로 DHCP 서버·케이블·스위치 포트를 점검한다.');
  mc('netstat2', 'os', 'netstat 결과 해석', q('Windows 서버에서 netstat -an 명령을 실행한 결과의 일부이다. 이 서버에서 외부의 접속을 기다리고 있는 서비스의 조합으로 가장 알맞은 것은?') + cli('  프로토콜  로컬 주소           외부 주소            상태\n  TCP      0.0.0.0:80          0.0.0.0:0           LISTENING\n  TCP      0.0.0.0:3389        0.0.0.0:0           LISTENING\n  TCP      10.0.0.5:3389       203.0.113.7:51522   ESTABLISHED\n  TCP      10.0.0.5:52011      10.0.0.2:53         TIME_WAIT'), ['웹(HTTP)과 원격 데스크톱(RDP)', 'DNS 서버와 SSH 서버', 'HTTPS와 Telnet', 'FTP와 SMTP'], 'LISTENING 상태인 80(HTTP)과 3389(RDP)가 접속을 기다리는 포트이다. 3389번에는 외부 203.0.113.7이 이미 접속해 있고(ESTABLISHED), 53번 줄은 이 서버가 DNS 서버(10.0.0.2)에 질의했던 연결이다.');
  mc('tracert2', 'os', 'tracert 결과 해석', q('Windows에서 tracert 명령을 실행한 결과이다. 결과에 대한 해석으로 가장 알맞은 것은?') + cli('  1    <1 ms    <1 ms    <1 ms  192.168.0.1\n  2     3 ms     2 ms     3 ms  10.20.0.1\n  3     *        *        *     요청 시간이 만료되었습니다.\n  4    12 ms    11 ms    12 ms  203.0.113.10\n\n추적을 완료했습니다.'), ['3번째 라우터가 ICMP 응답을 보내지 않도록 설정되어 있을 뿐, 목적지까지는 정상적으로 도달하였다.', '3번째 구간에서 회선이 끊어져 목적지에 도달하지 못하였다.', '목적지 서버의 DNS 이름을 찾지 못하였다.', '첫 번째 홉(192.168.0.1)에서 패킷이 모두 폐기되었다.'], '4번째 홉에서 목적지가 응답하고 "추적을 완료했습니다"가 나왔으므로 경로는 정상이다. 중간 라우터는 보안 정책으로 ICMP Time Exceeded를 보내지 않을 수 있어 * 로 표시된다.');
  mc('dfout', 'os', 'df 결과 해석', q('Linux 서버에서 디스크 공간 부족 경고가 발생하여 df -h 명령을 실행하였다. 가장 먼저 정리해야 할 파일 시스템이 연결된(마운트된) 디렉터리는?') + cli('Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   21G   27G  44% /\n/dev/sda2       100G   97G  3.0G  98% /var\n/dev/sdb1       500G  210G  290G  43% /home\ntmpfs           3.9G     0  3.9G   0% /dev/shm'), ['/var', '/', '/home', '/dev/shm'], '/var의 사용률이 98%로 가장 높다. /var에는 로그(/var/log)·메일 스풀·패키지 캐시처럼 계속 쌓이는 파일이 있어 자주 가득 찬다. 디렉터리별 사용량은 du -sh로 확인한다.');
  mc('passwd2', 'os', '/etc/passwd 해석', q('Linux의 /etc/passwd 파일에 다음 줄이 있다. 이에 대한 설명으로 옳지 않은 것은?') + cli('kim:x:1001:1001:Kim Minsu:/home/kim:/bin/bash'), ['두 번째 필드의 x는 이 계정에 비밀번호가 없다는 뜻이다.', '사용자의 UID는 1001이다.', '사용자의 홈 디렉터리는 /home/kim이다.', '로그인하면 bash 셸이 실행된다.'], 'x는 암호화된 비밀번호가 /etc/shadow 파일에 따로 저장되어 있다는 뜻이다. 필드 순서는 사용자명:비밀번호:UID:GID:설명:홈 디렉터리:로그인 셸.');
  mc('raid1', 'os', 'RAID 5 용량과 장애 허용', q('파일 서버에 2TB 디스크 4개를 장착하고 RAID 5로 구성하려 한다. 구성 후 사용할 수 있는 용량과, 데이터 손실 없이 동시에 고장 나도 되는 디스크 수로 옳은 것은?'), ['6TB, 1개', '8TB, 0개', '4TB, 2개', '6TB, 2개'], 'RAID 5는 디스크 1개 분량을 패리티로 쓰므로 (4 − 1) × 2TB = 6TB이고, 디스크 1개 고장까지 복구할 수 있다. 2개 고장을 견디려면 RAID 6(용량 4TB)을 쓴다.');
  mc('dns-mx', 'os', 'DNS 레코드', q('회사 도메인 swm.co.kr 앞으로 오는 전자우편을 mail.swm.co.kr 서버가 받도록 DNS 서버에 등록하려 한다. 이때 추가해야 하는 리소스 레코드는?'), ['MX', 'A', 'CNAME', 'PTR'], 'MX 레코드는 도메인의 메일 서버를 지정한다(우선순위 값 포함). 메일 서버 이름 자체의 IP는 A 레코드로 등록한다. CNAME은 별칭, PTR은 역방향 조회용이다.');
  mc('perm', 'os', '공유 권한과 NTFS 권한', q('Windows 파일 서버의 Sales 폴더에 다음과 같이 권한을 설정하였다. 영업팀 사용자가 다른 PC에서 네트워크로 이 공유 폴더에 접근할 때 실제로 적용되는 권한은?') + bogi(['공유 권한: 영업팀 – 변경', 'NTFS 권한: 영업팀 – 읽기 및 실행']), ['읽기 및 실행', '변경', '모든 권한', '접근 불가'], '네트워크로 접근하면 공유 권한과 NTFS 권한 중 더 제한적인 쪽이 적용된다. 로컬에서 직접 접근하면 NTFS 권한만 적용된다.');
  // 네트워크 운용기기
  mc('switch', 'eq', '스위치의 프레임 처리', q('2계층 스위치가 프레임을 받았는데, 목적지 MAC 주소가 MAC 주소 테이블에 아직 등록되어 있지 않다. 스위치의 처리로 옳은 것은?'), ['프레임이 들어온 포트를 제외한 모든 포트로 내보낸다(플러딩).', '목적지를 알 수 없으므로 프레임을 폐기한다.', '프레임을 기본 게이트웨이(라우터)로만 전달한다.', '목적지 MAC 주소를 알아내기 위해 ARP 요청을 직접 보낸다.'], '스위치는 출발지 MAC으로 테이블을 학습하고, 목적지를 모르면 플러딩한다. 이후 응답 프레임의 출발지 MAC을 학습해 다음부터는 해당 포트로만 보낸다.');
  mc('vlan', 'eq', 'VLAN 간 통신', q('스위치 한 대에 영업팀(VLAN 10)과 개발팀(VLAN 20)을 나누어 구성하였다. 영업팀 PC가 개발팀 서버와 통신하려면 어떻게 해야 하는가?'), ['라우터나 L3 스위치로 VLAN 간 라우팅을 설정한다.', '두 VLAN의 포트를 허브로 묶어 연결한다.', '스위치의 STP 기능을 끈다.', '두 팀 PC의 MAC 주소를 같게 설정한다.'], 'VLAN은 서로 다른 브로드캐스트 도메인이므로 3계층 장비가 라우팅해야 통신할 수 있다(라우터 온 어 스틱, L3 스위치의 SVI 등).');
  mc('cisco-mode', 'eq', 'Cisco 라우터 모드', q('Cisco 라우터에 콘솔로 접속하여 다음과 같이 명령을 입력하였다. 마지막 프롬프트 Router(config)#가 뜻하는 모드는?') + cli('Router> enable\nRouter# configure terminal\nRouter(config)#'), ['전역 설정 모드', '사용자 모드', '특권(관리자) 모드', '인터페이스 설정 모드'], 'Router>는 사용자 모드, Router#는 특권 모드, Router(config)#는 전역 설정 모드, Router(config-if)#는 인터페이스 설정 모드이다.');
  mc('collide', 'eq', '충돌·브로드캐스트 도메인 세기', q('라우터의 한 인터페이스에는 허브(PC 4대 연결)를, 다른 인터페이스에는 2계층 스위치(PC 4대 연결)를 연결하였다. 이 네트워크의 충돌 도메인 수와 브로드캐스트 도메인 수로 옳은 것은?'), ['충돌 도메인 6개, 브로드캐스트 도메인 2개', '충돌 도메인 2개, 브로드캐스트 도메인 2개', '충돌 도메인 9개, 브로드캐스트 도메인 1개', '충돌 도메인 5개, 브로드캐스트 도메인 2개'], '허브 쪽은 허브에 연결된 PC 4대와 라우터 포트가 충돌 도메인 1개를 이룬다. 스위치는 포트마다 충돌 도메인이 나뉘므로 PC 4대 + 라우터 연결 포트 = 5개. 합계 6개. 라우터가 두 망을 나누므로 브로드캐스트 도메인은 2개.');

  /* ───────── 기출 10개년(2017~2026, 20회분) 빈출 주제 보강 — 출제 경향만 참고해 새로 쓴 문항 ───────── */
  // TCP/IP
  mc('k-igmp', 'tc', 'IGMP', q('다음 〈보기〉에서 설명하는 프로토콜은?') + bogi(['호스트가 어떤 멀티캐스트 그룹에 가입하거나 탈퇴하는지를 같은 네트워크의 라우터에 알린다.', '라우터는 이 정보로 멀티캐스트 트래픽을 보낼 인터페이스를 정한다.', 'IP 패킷 안에 담겨 전달되며, IPv4에서 사용한다.']), ['IGMP', 'ICMP', 'ARP', 'SNMP'], 'IGMP(Internet Group Management Protocol)는 IPv4 멀티캐스트 그룹 관리 프로토콜이다. ICMP는 오류·진단 메시지, ARP는 IP → MAC 변환, SNMP는 네트워크 장비 관리용이다.');
  mc('k-tcpflag', 'tc', 'TCP 제어 플래그', q('TCP 헤더의 제어 플래그와 그 의미의 연결로 옳지 않은 것은?'), ['RST – 데이터 전송을 모두 마친 뒤 연결을 정상적으로 종료한다.', 'SYN – 연결을 시작하면서 순서 번호를 동기화한다.', 'URG – 긴급 포인터(Urgent Pointer) 필드가 유효함을 나타낸다.', 'PSH – 받은 데이터를 버퍼에 모으지 말고 바로 응용 계층으로 넘기도록 요청한다.'], '정상 종료는 FIN 플래그로 한다. RST는 비정상 상황에서 연결을 즉시 강제로 끊을 때 쓴다(예: 열려 있지 않은 포트로 연결 요청이 온 경우).');
  mc('k-bootp', 'tc', 'BOOTP', q('디스크가 없는 단말이 부팅할 때 자신의 IP 주소와 부팅 파일 위치를 서버로부터 받기 위해 사용했으며, DHCP의 기반이 된 프로토콜은?'), ['BOOTP', 'RARP', 'NTP', 'IGMP'], 'BOOTP는 UDP 67/68번을 사용하며 관리자가 미리 등록한 표에 따라 주소를 준다. DHCP는 BOOTP를 확장해 주소를 자동으로 임대·회수할 수 있게 했다. RARP도 MAC으로 IP를 얻지만 부팅 파일 정보는 주지 못한다.');
  mc('k-egp', 'tc', 'IGP와 EGP', q('라우팅 프로토콜 중 서로 다른 자율 시스템(AS) 사이에서 경로 정보를 교환하는 EGP에 해당하는 것은?'), ['BGP', 'RIP', 'OSPF', 'EIGRP'], 'RIP·OSPF·EIGRP·IS-IS는 하나의 AS 안에서 쓰는 IGP이고, BGP는 AS 사이(인터넷 사업자 사이)에서 쓰는 EGP이다.');
  mc('k-eigrp', 'tc', 'EIGRP', q('다음 〈보기〉에서 설명하는 라우팅 프로토콜은?') + bogi(['Cisco가 만든 프로토콜로 거리 벡터와 링크 상태의 장점을 결합한 하이브리드(향상된 거리 벡터) 방식이다.', '기본 메트릭으로 대역폭과 지연을 함께 사용한다.', 'DUAL 알고리즘으로 루프 없는 경로와 예비 경로를 빠르게 계산한다.']), ['EIGRP', 'RIP', 'OSPF', 'BGP'], 'RIP는 홉 수만 보는 거리 벡터, OSPF는 링크 상태(다익스트라), BGP는 AS 사이의 경로 벡터 프로토콜이다.');
  mc('k-frag', 'tc', 'IP 단편화', q('IP 패킷이 MTU보다 커서 여러 조각으로 나뉘어 전달될 때, 수신 측이 조각을 원래 패킷으로 다시 조립하는 데 사용하는 IPv4 헤더 필드가 아닌 것은?'), ['TTL(Time To Live)', 'Identification', 'Flags(MF 비트)', 'Fragment Offset'], '같은 패킷의 조각은 Identification 값이 같고, Fragment Offset으로 위치를, MF(More Fragments) 플래그로 마지막 조각 여부를 알린다. TTL은 패킷 수명(홉 제한) 필드이다.');
  mc('k-mtu', 'tc', 'MTU', q('네트워크 종류마다 한 번에 전송할 수 있는 데이터 크기가 달라 IP 패킷을 나눌지 판단할 때 기준이 되는 값은? (이더넷은 보통 1,500바이트)'), ['MTU(Maximum Transmission Unit)', 'MSS(Maximum Segment Size)', 'TTL(Time To Live)', 'RTT(Round Trip Time)'], 'MTU는 데이터링크 계층이 한 프레임에 실을 수 있는 최대 크기이다. MSS는 TCP 세그먼트의 데이터 부분 최대 크기(이더넷에서 보통 1,460바이트)이다.');
  mc('k-wins', 'tc', 'WINS', q('Windows 네트워크에서 NetBIOS 이름을 IP 주소로 바꿔 주는 서비스는?'), ['WINS', 'DNS', 'DHCP', 'LDAP'], 'WINS(Windows Internet Name Service)는 NetBIOS 이름 ↔ IP 주소 변환을 맡는다. DNS는 도메인 이름(FQDN)을 IP로 바꾸고, LDAP은 디렉터리 정보 조회 프로토콜이다.');
  mc('k-netbeui', 'tc', 'NetBEUI', q('NetBEUI 프로토콜에 대한 설명으로 옳은 것은?'), ['라우팅 기능이 없어 하나의 소규모 LAN 안에서만 사용할 수 있다.', '인터넷에서 사용하는 표준 라우팅 프로토콜이다.', 'IP 주소를 기반으로 서로 다른 네트워크를 연결한다.', '전자우편을 송신하는 응용 계층 프로토콜이다.'], 'NetBEUI는 설정이 간단하고 빠르지만 라우팅이 되지 않아(non-routable) 소규모 LAN에서만 쓰였다.');
  mc('k-ports2', 'tc', '포트 번호 (NNTP·NTP 등)', q('서비스와 기본 포트 번호의 연결이 옳지 않은 것은?'), ['NTP – TCP 25', 'NNTP – TCP 119', 'Kerberos – 88', 'LDAP – TCP 389'], 'NTP(시간 동기화)는 UDP 123번을 쓴다. TCP 25번은 SMTP이다.');
  mc('k-cmip', 'tc', '네트워크 관리 프로토콜', q('OSI 모델을 기반으로 한 네트워크 관리 프로토콜로, TCP/IP 환경의 SNMP에 대응되는 것은?'), ['CMIP', 'SMTP', 'RMON', 'ICMP'], 'CMIP(Common Management Information Protocol)는 OSI 기반 관리 프로토콜이다. RMON은 SNMP를 확장해 원격 네트워크를 감시하는 MIB 규격이다.');
  mc('k-super', 'tc', '슈퍼네팅(경로 요약)', q('라우터에서 네 개의 네트워크 192.168.0.0/24, 192.168.1.0/24, 192.168.2.0/24, 192.168.3.0/24를 하나의 경로로 요약할 때 알맞은 것은?'), ['192.168.0.0/22', '192.168.0.0/23', '192.168.0.0/16', '192.168.3.0/22'], '세 번째 옥텟 0~3은 2진수로 000000|00 ~ 000000|11이므로 앞 22비트가 같다. 따라서 192.168.0.0/22로 요약한다(CIDR 슈퍼네팅).');
  mc('k-icmptype', 'tc', 'ICMP 메시지', q('ICMP 메시지 유형과 쓰임의 연결로 옳지 않은 것은?'), ['Echo Reply – 패킷이 TTL을 다 써서 버려졌음을 알린다.', 'Echo Request – ping이 상대에게 응답을 요청한다.', 'Destination Unreachable – 목적지나 포트에 도달할 수 없음을 알린다.', 'Redirect – 더 나은 경로(게이트웨이)가 있음을 알려 준다.'], 'TTL이 0이 되어 버려졌음을 알리는 것은 Time Exceeded(유형 11)이다. tracert·traceroute가 이 메시지로 경로를 알아낸다. Echo Reply(유형 0)는 ping에 대한 응답이다.');
  mc('k-ipv6tr', 'tc', 'IPv4/IPv6 전환 기술', q('IPv4와 IPv6가 함께 쓰이는 환경에서 사용하는 전환 기술이 아닌 것은?'), ['VLSM(가변 길이 서브넷 마스크)', '듀얼 스택(Dual Stack)', '터널링(6to4, ISATAP 등)', '주소·프로토콜 변환(NAT64 등)'], '듀얼 스택은 두 프로토콜을 함께 운용하고, 터널링은 IPv6 패킷을 IPv4에 담아 보내며, 변환은 두 형식을 서로 바꾼다. VLSM은 IPv4 서브네팅 기법이다.');
  mc('k-tls', 'tc', 'SSL/TLS', q('웹 브라우저와 서버 사이의 통신을 암호화해 HTTPS(443번 포트)에 쓰이는 보안 프로토콜로, SSL을 계승한 것은?'), ['TLS', 'SSH', 'IPSec', 'PGP'], 'TLS는 SSL의 후속 표준으로 전송 계층 위에서 동작한다. SSH는 원격 접속 암호화, IPSec은 네트워크 계층 암호화, PGP는 전자우편 암호화에 주로 쓴다.');
  mc('k-kerb', 'tc', 'Kerberos', q('Kerberos 인증에 대한 설명으로 옳지 않은 것은?'), ['사용자의 비밀번호를 매번 네트워크로 그대로 보내 서버가 직접 확인한다.', '키 배포 센터(KDC)가 발급하는 티켓(Ticket)을 이용해 인증한다.', 'Windows Active Directory 도메인의 기본 인증 방식이다.', '한 번 인증받은 티켓으로 여러 서비스를 이용하는 SSO를 지원한다.'], 'Kerberos는 비밀번호를 네트워크로 보내지 않고, KDC(인증 서버 AS + 티켓 발급 서버 TGS)가 발급한 티켓으로 인증한다. 포트는 88번이다.');
  // 네트워크 일반
  mc('k-xon', 'ng', '흐름 제어 XON/XOFF', q('수신 측이 특수 문자를 보내 송신 측의 전송을 멈추거나 다시 시작하게 하는 소프트웨어 방식의 흐름 제어는?'), ['XON/XOFF', 'RTS/CTS', '슬라이딩 윈도우', 'CSMA/CD'], 'XON/XOFF는 제어 문자(DC1/DC3)로 흐름을 제어하는 소프트웨어 방식이다. RTS/CTS는 별도 신호선을 쓰는 하드웨어 방식이다.');
  mc('k-shannon', 'ng', '샤논의 채널 용량', q('대역폭이 3,000Hz이고 신호 대 잡음비(S/N)가 1,023인 채널에서 샤논(Shannon) 공식으로 구한 최대 전송 용량은?'), ['30,000bps', '6,000bps', '3,069,000bps', '10,230bps'], 'C = B × log₂(1 + S/N) = 3,000 × log₂(1,024) = 3,000 × 10 = 30,000bps. 대역폭이 넓을수록, 신호 대 잡음비가 클수록 용량이 커진다.');
  mc('k-qam', 'ng', '디지털 변조', q('반송파의 진폭과 위상을 함께 바꿔 한 번에 여러 비트를 실어 보내는 변조 방식은?'), ['QAM', 'ASK', 'FSK', 'PSK'], 'ASK는 진폭, FSK는 주파수, PSK는 위상만 바꾼다. QAM(직교 진폭 변조)은 진폭과 위상을 함께 써서 전송 효율이 높다.');
  mc('k-zigbee', 'ng', '근거리 무선 기술', q('IEEE 802.15.4를 기반으로 하며 전력 소모가 매우 적고, 많은 센서를 메시(Mesh) 형태로 연결하는 IoT용 근거리 무선 기술은?'), ['지그비(Zigbee)', '블루투스(IEEE 802.15.1)', '와이파이(IEEE 802.11)', 'RFID'], '지그비는 저전력·저속·메시 네트워크에 적합하다. RFID는 전파로 태그를 인식하는 기술이고, 블루투스는 근거리 1:1·소규모 연결에 많이 쓴다.');
  mc('k-sdn', 'ng', 'SDN과 NFV', q('다음 〈보기〉의 ㉠, ㉡에 들어갈 용어로 옳은 것은?') + bogi(['(㉠): 네트워크 장비의 제어 기능(Control Plane)과 전달 기능(Data Plane)을 분리하고, 중앙의 소프트웨어 컨트롤러로 네트워크를 관리한다.', '(㉡): 방화벽·라우터 같은 네트워크 기능을 전용 장비 대신 범용 서버의 가상 머신(VNF)으로 구현한다.']), ['㉠ SDN, ㉡ NFV', '㉠ NFV, ㉡ SDN', '㉠ VPN, ㉡ VLAN', '㉠ NAT, ㉡ NAC'], 'SDN(Software Defined Networking)은 제어·전달 기능 분리와 중앙 제어(예: OpenFlow), NFV(Network Functions Virtualization)는 네트워크 기능의 가상화이다.');
  mc('k-dos', 'ng', '서비스 거부 공격', q('공격 기법과 설명의 연결로 옳지 않은 것은?'), ['스니핑(Sniffing) – 대량의 패킷을 보내 서버의 자원을 고갈시킨다.', 'SYN Flooding – 연결 요청(SYN)만 대량으로 보내고 3-way handshake를 끝내지 않는다.', 'Smurf – 출발지를 피해자 주소로 속인 ICMP Echo 요청을 브로드캐스트 주소로 보낸다.', 'Ping of Death – 허용 크기를 넘는 ICMP 패킷을 보내 시스템을 오작동시킨다.'], '스니핑은 네트워크를 지나는 패킷을 몰래 엿보는 도청 공격이다. 자원을 고갈시키는 것은 DoS/DDoS 계열(SYN Flooding, Smurf 등)이다.');
  mc('k-vpnproto', 'ng', 'VPN 프로토콜', q('VPN 터널링 프로토콜에 대한 설명으로 옳지 않은 것은?'), ['IPSec은 데이터링크 계층(2계층)에서 동작하는 터널링 프로토콜이다.', 'PPTP는 2계층 터널링 프로토콜로 TCP 1723번 포트를 사용한다.', 'L2TP는 2계층 터널링 프로토콜이며 암호화를 위해 보통 IPSec과 함께 쓴다.', 'SSTP는 SSL/TLS를 이용해 HTTPS 포트(443)로 터널을 만든다.'], 'IPSec은 네트워크 계층(3계층)에서 IP 패킷을 인증·암호화한다(AH, ESP). PPTP·L2TP가 2계층 터널링 프로토콜이다.');
  mc('k-nac', 'ng', 'NAC', q('네트워크에 접속하려는 단말이 백신 설치·보안 패치 등 보안 정책을 지켰는지 확인한 뒤에만 접속을 허용하는 보안 솔루션은?'), ['NAC(Network Access Control)', 'DLP(Data Loss Prevention)', 'DRM(Digital Rights Management)', 'SIEM'], 'NAC는 접속 전 단말의 보안 상태를 검사하고 미준수 단말을 격리한다. DLP는 내부 정보 유출 방지, DRM은 콘텐츠 저작권 보호이다.');
  mc('k-radius', 'ng', 'RADIUS', q('원격 접속 사용자의 인증(Authentication)·권한 부여(Authorization)·계정 관리(Accounting)를 중앙에서 처리하며 UDP 1812/1813번 포트를 쓰는 프로토콜은?'), ['RADIUS', 'Kerberos', 'LDAP', 'SNMP'], 'RADIUS는 AAA 서버 프로토콜로 무선 LAN(802.1X)·VPN 인증에 많이 쓴다. Cisco의 TACACS+는 TCP 49번을 쓴다.');
  mc('k-dsu', 'ng', 'DSU와 모뎀', q('전용 디지털 회선에 컴퓨터나 라우터(DTE)를 연결할 때 디지털 신호를 회선에 맞는 형태로 바꿔 주는 장비는?'), ['DSU', '모뎀(MODEM)', '리피터', '허브'], 'DSU(Digital Service Unit)는 디지털 회선용 회선 종단 장치이다. 모뎀은 디지털 신호를 아날로그 회선에 맞게 변조·복조한다.');
  // NOS - Windows Server
  mc('k-ps', 'os', 'PowerShell', q('Windows PowerShell에서 서버에 설치된 서비스 목록과 실행 상태를 확인하는 명령(cmdlet)은?'), ['Get-Service', 'Get-Process', 'Get-ChildItem', 'Get-NetIPAddress'], 'Get-Process는 실행 중인 프로세스, Get-ChildItem은 폴더 내용(dir), Get-NetIPAddress는 IP 주소 설정을 보여 준다. 서비스는 Start-Service·Stop-Service로 시작·중지한다.');
  mc('k-evt', 'os', '이벤트 뷰어', q('Windows Server에서 사용자의 로그온 성공·실패 같은 감사(Audit) 기록을 확인하려면 이벤트 뷰어의 어느 로그를 봐야 하는가?'), ['보안(Security) 로그', '시스템(System) 로그', '응용 프로그램(Application) 로그', '설치(Setup) 로그'], '시스템 로그에는 드라이버·서비스 같은 운영체제 구성 요소의 이벤트가, 응용 프로그램 로그에는 프로그램이 남긴 이벤트가 기록된다. 로그온 감사는 보안 로그에 남는다.');
  mc('k-core', 'os', 'Server Core', q('Windows Server의 Server Core 설치 옵션에 대한 설명으로 옳지 않은 것은?'), ['일반 데스크톱 환경과 같은 GUI를 기본으로 제공해 관리가 쉽다.', '구성 요소가 적어 디스크·메모리 사용량이 줄어든다.', '설치된 구성 요소가 적어 보안 업데이트 대상과 공격 면이 줄어든다.', 'PowerShell이나 원격 관리 도구로 관리한다.'], 'Server Core는 데스크톱 GUI 없이 최소 구성으로 설치된다. 명령 줄(sconfig·PowerShell)이나 원격 서버 관리 도구로 관리한다.');
  mc('k-fsrm', 'os', 'FSRM', q('Windows Server에서 폴더 단위로 저장 용량을 제한하고, 특정 확장자(예: .mp3) 파일의 저장을 막는 파일 차단 기능을 제공하는 역할 서비스는?'), ['파일 서버 리소스 관리자(FSRM)', 'BitLocker', 'WSUS', 'DFS 복제'], 'FSRM은 폴더 할당량, 파일 차단(File Screening), 저장소 보고서를 제공한다. NTFS 디스크 할당량은 볼륨 단위·사용자 단위로 동작한다.');
  mc('k-ntlm', 'os', 'NTLM과 Kerberos', q('Windows 인증에 대한 설명으로 옳은 것은?'), ['Active Directory 도메인 환경에서는 기본적으로 Kerberos를 사용하고, NTLM은 하위 호환이나 작업 그룹 환경에서 사용한다.', 'NTLM은 티켓을 발급받아 여러 서버에 한 번에 로그인하는 방식이다.', 'Kerberos는 도메인 컨트롤러 없이 작업 그룹에서만 동작한다.', 'NTLM은 비밀번호를 평문으로 전송한다.'], 'NTLM은 챌린지-응답 방식으로 비밀번호 해시를 이용해 인증하며, 평문을 보내지 않는다. 티켓 기반 SSO는 Kerberos의 특징이다.');
  mc('k-hvsw', 'os', 'Hyper-V 가상 스위치', q('Hyper-V 가상 스위치 중 가상 머신이 호스트의 물리 네트워크 어댑터를 통해 외부 네트워크와 통신할 수 있게 하는 유형은?'), ['외부(External)', '내부(Internal)', '개인(Private)', '격리(Isolated)'], '내부 스위치는 가상 머신과 호스트 사이만, 개인 스위치는 가상 머신끼리만 통신한다. 외부 스위치가 물리 네트워크와 연결된다.');
  mc('k-iis', 'os', 'IIS', q('Windows Server의 웹 서버 역할(IIS)을 설치했을 때 기본 웹 사이트의 문서가 저장되는 기본 경로는?'), ['C:\\inetpub\\wwwroot', 'C:\\Windows\\System32', 'C:\\Program Files\\IIS', '/var/www/html'], 'IIS 기본 웹 사이트의 실제 경로는 C:\\inetpub\\wwwroot이다. /var/www/html은 Linux Apache의 일반적인 기본 경로이다.');
  mc('k-dep', 'os', 'DEP', q('메모리의 데이터 영역에서 코드가 실행되지 못하게 막아 버퍼 오버플로 공격을 방어하는 Windows의 보안 기능은?'), ['DEP(데이터 실행 방지)', 'UAC(사용자 계정 컨트롤)', 'EFS(파일 시스템 암호화)', 'BitLocker'], 'DEP는 실행 권한이 없는 메모리 영역의 코드 실행을 차단한다. UAC는 관리자 권한이 필요한 작업 전에 확인을 요청하고, EFS는 파일 암호화, BitLocker는 드라이브 전체 암호화 기능이다.');
  // NOS - Linux
  mc('k-cron', 'os', 'crontab', q('Linux의 crontab에 다음 줄을 등록했을 때 /root/backup.sh가 실행되는 시점은?') + cli('30 2 * * 1 /root/backup.sh'), ['매주 월요일 오전 2시 30분', '매일 오전 2시 30분', '매월 1일 오전 2시 30분', '매주 월요일 오전 2시마다 30분 간격'], 'crontab 필드는 분 · 시 · 일 · 월 · 요일 순이다. 30분, 2시, 매일(*), 매월(*), 요일 1(월요일) → 매주 월요일 02:30.');
  mc('k-disk', 'os', '새 디스크 추가 절차', q('Linux 서버에 새 하드디스크를 추가해 사용하려 한다. 작업 순서로 옳은 것은?'), ['fdisk로 파티션 생성 → mkfs로 파일 시스템 생성 → mount로 연결 → /etc/fstab에 등록', 'mount로 연결 → fdisk로 파티션 생성 → mkfs로 파일 시스템 생성 → /etc/fstab에 등록', 'mkfs로 파일 시스템 생성 → fdisk로 파티션 생성 → /etc/fstab에 등록 → mount로 연결', '/etc/fstab에 등록 → mount로 연결 → mkfs로 파일 시스템 생성 → fdisk로 파티션 생성'], '파티션을 만들고(fdisk/parted), 포맷하고(mkfs), 디렉터리에 연결(mount)한 뒤, 부팅 때 자동으로 연결되도록 /etc/fstab에 등록한다.');
  mc('k-grub', 'os', '부트 로더와 MBR', q('Linux 부팅에 대한 설명으로 옳지 않은 것은?'), ['MBR은 디스크의 마지막 섹터에 있으며 크기는 4KB이다.', 'GRUB은 커널을 메모리에 올리는 부트 로더이다.', 'MBR 방식 디스크는 주 파티션을 최대 4개까지 만들 수 있다.', 'swap 영역은 메모리가 부족할 때 디스크 일부를 가상 메모리로 쓴다.'], 'MBR(Master Boot Record)은 디스크의 첫 번째 섹터(512바이트)에 있으며 부트 코드와 파티션 테이블을 담는다.');
  mc('k-visub', 'os', 'vi 문자열 바꾸기', q('vi 편집기 명령 모드에서 파일 전체의 문자열 old를 모두 new로 바꾸는 명령은?'), [':%s/old/new/g', ':s/old/new/', ':%s/new/old/g', ':g/old/d'], ':%s는 파일 전체 범위, 끝의 g는 한 줄 안의 모든 일치 항목을 뜻한다. :s/old/new/는 현재 줄의 첫 번째 것만 바꾸고, :g/old/d는 old가 있는 줄을 지운다.');
  mc('k-httpd', 'os', 'Apache httpd.conf', q('Linux Apache 웹 서버의 설정 파일(httpd.conf)에서 웹 문서가 들어 있는 최상위 디렉터리를 지정하는 항목은?'), ['DocumentRoot', 'ServerRoot', 'Listen', 'ServerName'], 'ServerRoot는 Apache 설치(설정) 기준 디렉터리, Listen은 서비스 포트(기본 80), ServerName은 서버의 도메인 이름이다.');
  mc('k-bind', 'os', 'BIND(named.conf)', q('Linux DNS 서버(BIND)의 설정 파일 named.conf에서 이 DNS 서버에 질의할 수 있는 클라이언트를 제한하는 옵션은?'), ['allow-query', 'allow-transfer', 'directory', 'forwarders'], 'allow-transfer는 영역 전송을 허용할 보조 DNS를, directory는 영역 파일 위치를, forwarders는 질의를 대신 넘길 상위 DNS를 지정한다.');
  mc('k-wrapper', 'os', 'TCP Wrapper', q('Linux TCP Wrapper의 접근 제어 파일에 대한 설명으로 옳은 것은?'), ['/etc/hosts.allow를 먼저 확인하고, 일치하지 않으면 /etc/hosts.deny를 확인한다.', '/etc/hosts.deny를 먼저 확인하고, 일치하지 않으면 /etc/hosts.allow를 확인한다.', '두 파일 모두에 일치하는 규칙이 없으면 접속을 거부한다.', '두 파일은 방화벽 규칙을 저장하는 iptables의 설정 파일이다.'], 'hosts.allow에 일치하면 허용, 아니면 hosts.deny에 일치할 때 거부한다. 둘 다 일치하지 않으면 허용된다. 그래서 hosts.deny에 ALL:ALL을 두고 필요한 것만 hosts.allow에 허용하는 방식을 많이 쓴다.');
  mc('k-useradd', 'os', 'useradd 옵션', q('Linux에서 useradd 명령의 옵션과 의미의 연결로 옳지 않은 것은?'), ['-s : 사용자의 비밀번호를 지정한다.', '-d : 홈 디렉터리 경로를 지정한다.', '-u : UID를 지정한다.', '-g : 기본 그룹을 지정한다.'], '-s는 로그인 셸(예: /bin/bash)을 지정한다. 비밀번호는 보통 passwd 명령으로 정한다. 계정을 지울 때 userdel -r을 쓰면 홈 디렉터리도 함께 지운다.');
  mc('k-tar', 'os', 'tar 옵션', q('Linux에서 /home 디렉터리를 gzip으로 압축한 하나의 파일 home.tar.gz로 묶는 명령으로 옳은 것은?'), ['tar -czvf home.tar.gz /home', 'tar -xzvf home.tar.gz /home', 'tar -tvf home.tar.gz /home', 'tar -cvf /home home.tar.gz'], '-c 묶기, -x 풀기, -t 목록 보기, -z gzip 압축, -v 진행 표시, -f 뒤에 파일 이름을 쓴다.');
  mc('k-kill', 'os', 'kill 신호', q('Linux에서 응답하지 않는 프로세스(PID 2345)를 강제로 즉시 종료하는 명령은?'), ['kill -9 2345', 'kill -15 2345', 'kill -1 2345', 'kill -0 2345'], '-9(SIGKILL)는 강제 종료, -15(SIGTERM)는 기본값인 정상 종료 요청, -1(SIGHUP)은 설정 다시 읽기 등에 쓴다.');
  mc('k-services', 'os', '/etc/services', q('Linux에서 서비스 이름과 포트 번호·프로토콜의 대응 관계(예: ssh 22/tcp)를 정의한 파일은?'), ['/etc/services', '/etc/hosts', '/etc/resolv.conf', '/etc/fstab'], '/etc/hosts는 호스트 이름 ↔ IP, /etc/resolv.conf는 사용할 DNS 서버, /etc/fstab은 부팅 때 연결할 파일 시스템을 정의한다.');
  mc('k-raid234', 'os', 'RAID 2·3·4', q('RAID 레벨에 대한 설명으로 옳지 않은 것은?'), ['RAID 4는 패리티 정보를 모든 디스크에 분산해 저장한다.', 'RAID 2는 해밍 코드로 오류를 검출·정정한다.', 'RAID 3은 바이트 단위로 스트라이핑하고 패리티를 전용 디스크 하나에 저장한다.', 'RAID 5는 블록 단위로 스트라이핑하고 패리티를 여러 디스크에 분산 저장한다.'], 'RAID 4는 블록 단위 스트라이핑에 전용 패리티 디스크를 쓴다. 그래서 쓰기 때마다 패리티 디스크에 병목이 생기며, 이를 분산 패리티로 해결한 것이 RAID 5이다.');
  mc('k-tpm', 'os', 'BitLocker와 TPM', q('Windows의 BitLocker 드라이브 암호화를 사용할 때, 암호화 키를 안전하게 보관하고 부팅 과정의 변조 여부를 확인하기 위해 메인보드에서 지원해야 하는 보안 칩은?'), ['TPM(Trusted Platform Module)', 'BIOS 암호', 'RAID 컨트롤러', 'NIC'], 'BitLocker는 TPM에 키를 보관해 운영체제 드라이브를 보호한다. TPM이 없으면 USB 시작 키나 암호로 대신할 수 있다. 개별 파일 암호화는 EFS이다.');
  mc('k-redir', 'os', '폴더 리디렉션', q('도메인 사용자가 어느 컴퓨터에 로그온하든 자신의 문서·바탕 화면 폴더가 그대로 보이도록, 이 폴더들을 서버의 공유 폴더로 옮겨 두는 그룹 정책 기능은?'), ['폴더 리디렉션(Folder Redirection)', 'NTFS 디스크 할당량', '볼륨 섀도 복사본', 'BitLocker To Go'], '폴더 리디렉션은 사용자 폴더의 실제 위치를 네트워크 공유로 바꾼다. 볼륨 섀도 복사본은 이전 버전 파일 복원용 스냅숏이다.');
  // 네트워크 운용기기
  mc('k-defroute', 'eq', '라우터 기본 경로', q('Cisco 라우터에서 목적지를 모르는 모든 패킷을 다음 홉 203.0.113.1로 보내는 기본 경로(Default Route)를 설정하는 명령은?'), ['ip route 0.0.0.0 0.0.0.0 203.0.113.1', 'ip route 203.0.113.1 255.255.255.255 0.0.0.0', 'ip default 203.0.113.1', 'show ip route 0.0.0.0'], '정적 경로는 ip route [목적 네트워크] [마스크] [다음 홉]으로 쓰고, 0.0.0.0 0.0.0.0은 모든 목적지를 뜻한다. 설정된 경로는 show ip route로 확인한다.');
  mc('k-utm', 'eq', 'UTM', q('방화벽, 침입 방지(IPS), 바이러스 차단, VPN, 콘텐츠 필터링 등 여러 보안 기능을 장비 하나에 통합한 보안 장비는?'), ['UTM', 'NAC', 'DLP', 'L4 스위치'], 'UTM(Unified Threat Management)은 통합 보안 장비로 관리가 쉽지만, 기능을 많이 켜면 성능이 떨어질 수 있다.');
  mc('k-wpa', 'eq', '무선 보안 방식', q('무선 AP의 보안 설정에 대한 설명으로 옳지 않은 것은?'), ['WEP는 RC4 기반의 강력한 암호화를 사용하므로 현재도 권장된다.', 'WPA2는 AES 기반의 CCMP 암호화를 사용한다.', 'WPA3는 WPA2보다 강화된 인증(SAE)을 사용한다.', 'SSID 숨기기만으로는 충분한 보안이 되지 않는다.'], 'WEP는 키 관리와 RC4 사용 방식의 결함으로 쉽게 해독되어 사용하지 않는다. WPA2(AES-CCMP) 이상을 사용한다.');
  // O/X
  ox('k-igmp', 'tc', 'IGMP', 'IGMP는 호스트가 멀티캐스트 그룹에 가입·탈퇴했음을 라우터에 알리는 데 사용한다.', true, 'IPv4 멀티캐스트 그룹 관리 프로토콜이다. IPv6에서는 MLD가 이 역할을 한다.');
  ox('k-rst', 'tc', 'TCP RST', 'TCP 연결을 정상적으로 종료할 때는 RST 플래그를 사용한다.', false, '정상 종료는 FIN(4-way handshake), RST는 비정상 상황에서 연결을 즉시 끊을 때 쓴다.');
  ox('k-bgp', 'tc', 'BGP', 'BGP는 하나의 자율 시스템(AS) 안에서 쓰는 IGP이다.', false, 'BGP는 AS 사이에서 쓰는 EGP이다. RIP·OSPF·EIGRP가 IGP이다.');
  ox('k-xon', 'ng', 'XON/XOFF', 'XON/XOFF는 별도의 신호선을 이용하는 하드웨어 흐름 제어 방식이다.', false, 'XON/XOFF는 제어 문자로 흐름을 제어하는 소프트웨어 방식이다. 신호선을 쓰는 것은 RTS/CTS이다.');
  ox('k-sdn', 'ng', 'SDN', 'SDN은 네트워크의 제어 기능과 데이터 전달 기능을 분리해 소프트웨어 컨트롤러로 관리한다.', true, 'OpenFlow 같은 프로토콜로 컨트롤러가 스위치의 전달 규칙을 정한다.');
  ox('k-shannon', 'ng', '샤논 용량', '샤논의 채널 용량은 대역폭이 같다면 신호 대 잡음비(S/N)가 클수록 커진다.', true, 'C = B log₂(1 + S/N).');
  ox('k-core', 'os', 'Server Core', 'Windows Server Core 설치 옵션은 데스크톱 GUI를 제공하지 않는다.', true, '명령 줄, PowerShell, 원격 관리 도구로 관리한다.');
  ox('k-wrap', 'os', 'TCP Wrapper', 'TCP Wrapper는 /etc/hosts.deny를 /etc/hosts.allow보다 먼저 확인한다.', false, 'hosts.allow를 먼저 확인하고, 일치하지 않을 때 hosts.deny를 확인한다.');
  ox('k-cron', 'os', 'crontab 순서', 'crontab의 시간 필드는 분, 시, 일, 월, 요일 순서로 적는다.', true, '예: 0 3 * * * 는 매일 03:00.');
  ox('k-raid4', 'os', 'RAID 4', 'RAID 4는 패리티를 모든 디스크에 분산 저장한다.', false, 'RAID 4는 전용 패리티 디스크를 쓰고, 분산 패리티는 RAID 5이다.');
  ox('k-fstab', 'os', '/etc/fstab', '/etc/fstab에 등록한 파일 시스템은 부팅할 때 자동으로 마운트된다.', true, '장치, 마운트 위치, 파일 시스템 종류, 옵션 등을 한 줄씩 적는다.');
  ox('k-wep', 'eq', 'WEP', 'WEP는 취약점이 알려져 있어 무선 LAN 보안 방식으로 권장되지 않는다.', true, 'WPA2(AES) 또는 WPA3를 사용한다.');
  // 암기 카드
  cd('tc', 'TCP 제어 플래그 6가지(URG·ACK·PSH·RST·SYN·FIN)의 뜻을 쓰시오.', 'URG: 긴급 포인터 유효, ACK: 확인 응답 번호 유효, PSH: 버퍼링 없이 바로 전달, RST: 연결 강제 재설정(비정상 종료), SYN: 연결 시작·순서 번호 동기화, FIN: 정상 연결 종료.', ['URG', 'ACK', 'PSH', 'RST', 'SYN', 'FIN']);
  cd('ng', 'VPN 프로토콜 PPTP·L2TP·IPSec·SSTP를 계층과 특징으로 구분하시오.', 'PPTP: 2계층, TCP 1723 + GRE. L2TP: 2계층, 보통 IPSec과 함께(UDP 1701). IPSec: 3계층, AH(인증)·ESP(암호화), 전송·터널 모드. SSTP: SSL/TLS 기반, TCP 443.', ['PPTP', 'L2TP', 'IPSec', 'SSTP', '2계층', '3계층']);
  cd('os', 'Linux에 새 디스크를 추가해 쓰는 순서와 각 명령을 쓰시오.', 'fdisk(또는 parted)로 파티션 생성 → mkfs(예: mkfs.ext4)로 파일 시스템 생성 → mkdir로 마운트 위치 생성 → mount로 연결 → /etc/fstab에 등록(부팅 때 자동 마운트). 확인은 df -h.', ['fdisk', 'mkfs', 'mount', '/etc/fstab']);
  cd('os', 'Windows 이벤트 뷰어의 주요 로그 3가지(응용 프로그램·보안·시스템)에 기록되는 내용을 쓰시오.', '응용 프로그램: 프로그램이 남긴 이벤트. 보안: 로그온 성공·실패, 개체 접근 등 감사(Audit) 기록. 시스템: 드라이버·서비스 등 운영체제 구성 요소의 이벤트.', ['응용 프로그램', '보안', '시스템', '감사']);
  cd('os', 'Apache httpd.conf와 BIND named.conf의 주요 설정 항목을 쓰시오.', 'httpd.conf: ServerRoot(설치 기준 경로), Listen(포트), ServerName, DocumentRoot(웹 문서 경로), DirectoryIndex(기본 문서). named.conf: directory(영역 파일 위치), allow-query(질의 허용), allow-transfer(영역 전송 허용), forwarders, zone(영역 정의).', ['DocumentRoot', 'Listen', 'allow-query', 'allow-transfer', 'zone']);

  /* ───────── O/X ───────── */
  ox('tcp-rel', 'tc', 'TCP의 신뢰성', 'TCP는 순서 번호와 확인 응답(ACK)을 이용해 손실된 세그먼트를 재전송한다.', true, 'TCP는 순서 번호·ACK·재전송·흐름 제어(슬라이딩 윈도우)·혼잡 제어로 신뢰성을 보장한다.');
  ox('udp-hdr', 'tc', 'UDP 헤더', 'UDP 헤더의 길이는 20바이트이다.', false, 'UDP 헤더는 8바이트(출발 포트·목적 포트·길이·체크섬)이다. 20바이트는 옵션 없는 TCP·IPv4 헤더의 길이이다.');
  ox('ipv4-len', 'tc', 'IPv4 주소 길이', 'IPv4 주소는 32비트이고 IPv6 주소는 128비트이다.', true, 'IPv4 32비트(점으로 구분한 10진수 4개), IPv6 128비트(콜론으로 구분한 16진수 8묶음).');
  ox('loop', 'tc', '루프백 주소', '127.0.0.1은 자기 자신을 가리키는 루프백 주소이다.', true, '127.0.0.0/8 대역은 루프백용이다. IPv6의 루프백 주소는 ::1.');
  ox('ttl', 'tc', 'TTL', 'IP 패킷의 TTL 값은 라우터를 하나 지날 때마다 1씩 늘어난다.', false, 'TTL은 라우터를 지날 때마다 1씩 줄고, 0이 되면 패킷을 버리고 ICMP Time Exceeded를 보낸다.');
  ox('dns-port', 'tc', 'DNS 포트', 'DNS는 일반 질의에 UDP 53번을 사용하고, 영역 전송 등에는 TCP 53번을 사용한다.', true, '응답이 크거나 영역 전송(Zone Transfer)을 할 때는 TCP를 쓴다.');
  ox('ftp', 'tc', 'FTP 포트', 'FTP는 제어 연결에 21번, 능동 모드 데이터 전송에 20번 포트를 사용한다.', true, '수동(Passive) 모드에서는 서버가 알려 주는 임의의 높은 포트로 데이터 연결을 맺는다.');
  ox('arp-l', 'tc', 'ARP 브로드캐스트', 'ARP 요청은 같은 네트워크 전체에 브로드캐스트로 보내고, 응답은 요청한 호스트에게 유니캐스트로 보낸다.', true, '목적지 MAC을 모르므로 요청은 FF:FF:FF:FF:FF:FF로 보내고, 해당 IP의 주인이 유니캐스트로 응답한다.');
  ox('classb', 'tc', 'B 클래스 범위', 'B 클래스 IP 주소의 첫 옥텟 범위는 128~191이다.', true, 'A 1~126(127은 루프백), B 128~191, C 192~223.');
  ox('mac', 'ng', 'MAC 주소 길이', 'MAC 주소는 48비트이며 앞 24비트는 제조사 식별 번호(OUI)이다.', true, '16진수 12자리로 표기하며 앞 24비트는 OUI, 뒤 24비트는 제조사가 붙이는 일련번호이다.');
  ox('bus', 'ng', '버스형', '버스형 토폴로지는 케이블 양 끝에 터미네이터를 달아 신호 반사를 막는다.', true, '버스형은 하나의 공유 케이블에 노드가 연결되며, 터미네이터가 없으면 신호가 반사되어 충돌을 일으킨다.');
  ox('ring', 'ng', '링형', '링형 토폴로지는 노드 하나가 고장 나도 이중 링이 아니라면 전체 통신에 영향을 줄 수 있다.', true, '단일 링은 한 노드·구간의 장애가 전체 링을 끊는다. FDDI 등은 이중 링으로 이를 보완한다.');
  ox('stp-cable', 'ng', 'STP 케이블', 'STP 케이블은 UTP보다 외부 전자기 간섭에 약하다.', false, 'STP(Shielded Twisted Pair)는 차폐막이 있어 UTP보다 간섭에 강하다. 다만 비싸고 다루기 어렵다.');
  ox('cat-ab', 'ng', '케이블 배선', '같은 종류의 장비(PC-PC, 스위치-스위치)를 Auto-MDIX 기능 없이 직접 연결할 때는 크로스오버 케이블을 사용한다.', true, '서로 다른 장비(PC-스위치)는 다이렉트(T568B-T568B), 같은 장비는 크로스오버(T568A-T568B)를 쓴다. 최신 장비는 Auto-MDIX로 자동 전환한다.');
  ox('nyq', 'ng', '나이퀴스트', '최고 주파수가 4kHz인 음성 신호를 복원하려면 초당 8,000번 이상 표본화해야 한다.', true, '나이퀴스트 표본화 정리: 표본화 주파수 ≥ 2 × 최고 주파수 = 8kHz.');
  ox('wifi', 'ng', '무선 LAN 방식', '무선 LAN은 충돌을 감지하는 CSMA/CD 방식을 사용한다.', false, '무선은 송신 중 충돌 감지가 어려워 충돌을 회피하는 CSMA/CA를 쓴다.');
  ox('crc', 'ng', 'CRC', 'CRC는 다항식 나눗셈을 이용한 오류 검출 방식으로, 이더넷 프레임의 FCS에 사용된다.', true, '이더넷 프레임 끝의 FCS(Frame Check Sequence)가 CRC-32 값이다.');
  ox('bw', 'ng', '전송 속도 단위', '1Gbps는 초당 1기가바이트(GB)를 전송하는 속도이다.', false, 'bps는 비트 단위이다. 1Gbps는 초당 약 1기가비트 = 약 125MB/s.');
  ox('ntfs-q', 'os', 'NTFS 할당량', 'NTFS 디스크 할당량은 사용자별로 볼륨 사용 공간을 제한할 수 있다.', true, '볼륨 속성의 할당량(Quota) 탭에서 사용자별 한도와 경고 수준을 정할 수 있다.');
  ox('gpo', 'os', '그룹 정책', '그룹 정책(GPO)은 도메인의 사용자와 컴퓨터 설정을 중앙에서 일괄 적용하는 기능이다.', true, '사이트·도메인·OU에 연결해 적용하며, 적용 순서는 로컬 → 사이트 → 도메인 → OU(LSDOU).');
  ox('raid0', 'os', 'RAID 0', 'RAID 0은 디스크 하나가 고장 나도 데이터를 복구할 수 있다.', false, 'RAID 0은 스트라이핑만 하므로 내결함성이 없다. 디스크 하나만 고장 나도 전체 데이터를 잃는다.');
  ox('passwd', 'os', 'passwd 명령', 'Linux의 passwd 명령으로 사용자의 비밀번호를 바꿀 수 있다.', true, '일반 사용자는 자신의 비밀번호만, root는 passwd 사용자명으로 다른 사용자의 비밀번호도 바꿀 수 있다.');
  ox('rmr', 'os', 'rm -r', 'Linux에서 rm -r 디렉터리명은 디렉터리와 그 안의 모든 파일을 삭제한다.', true, '-r은 하위까지 재귀적으로 삭제, -f는 확인 없이 강제 삭제한다. rmdir은 빈 디렉터리만 지운다.');
  ox('root', 'os', 'root UID', 'Linux에서 root 사용자의 UID는 0이다.', true, 'UID 0은 관리자(root)이며 모든 권한을 가진다.');
  ox('grep', 'os', 'grep', 'grep은 파일에서 특정 문자열이 들어 있는 줄을 찾아 출력하는 명령어이다.', true, '예: grep "error" /var/log/messages. 디렉터리에서 파일 이름으로 찾는 명령은 find.');
  ox('dhcp-srv', 'os', 'DHCP 서버', 'Windows Server의 DHCP 서버에서 특정 장치에 항상 같은 IP를 주려면 예약(Reservation)을 설정한다.', true, 'MAC 주소를 기준으로 예약하면 그 장치는 늘 같은 주소를 받는다. 범위(Scope)에서 빼려는 주소는 제외(Exclusion)로 설정한다.');
  ox('cname', 'os', 'CNAME', 'CNAME 레코드는 도메인 이름을 IPv6 주소에 직접 대응시킨다.', false, 'CNAME은 별칭(다른 도메인 이름)을 가리킨다. 이름 → IPv6 주소는 AAAA 레코드이다.');
  ox('ifconfig', 'os', 'Linux 네트워크 확인', 'Linux에서 ip addr 명령으로 네트워크 인터페이스의 IP 주소를 확인할 수 있다.', true, '예전에는 ifconfig를 많이 썼고, 최신 배포판은 ip 명령(iproute2)을 기본으로 쓴다.');
  ox('bridge', 'eq', '브리지', '브리지는 MAC 주소를 보고 프레임을 전달하는 2계층 장비이다.', true, '브리지와 스위치는 데이터링크 계층에서 MAC 주소로 프레임을 거른다.');
  ox('router-bc', 'eq', '라우터와 브로드캐스트', '라우터는 기본적으로 브로드캐스트 패킷을 다른 네트워크로 전달하지 않는다.', true, '그래서 라우터가 브로드캐스트 도메인을 나눈다. 다른 망의 DHCP 서버를 쓰려면 DHCP 릴레이를 설정한다.');
  ox('trunk', 'eq', '트렁크 포트', '트렁크 포트는 하나의 VLAN 트래픽만 전달할 수 있다.', false, '트렁크 포트는 802.1Q 태그를 붙여 여러 VLAN의 트래픽을 한 링크로 전달한다. 한 VLAN만 쓰는 포트는 액세스 포트.');
  ox('fw', 'eq', '방화벽', '패킷 필터링 방화벽은 IP 주소와 포트 번호 등을 기준으로 통과·차단을 결정한다.', true, '상태 기반(Stateful) 방화벽은 연결 상태까지 추적하고, 애플리케이션 방화벽(프록시)은 응용 계층 내용까지 검사한다.');
  ox('ap', 'eq', '무선 AP', '무선 AP(Access Point)는 무선 단말을 유선 네트워크에 연결해 주는 장비이다.', true, '무선 구간의 보안은 WPA2·WPA3 같은 암호화 방식을 쓰며, WEP는 취약해 쓰지 않는다.');
  ox('mirror', 'eq', '포트 미러링', '포트 미러링은 특정 포트의 트래픽을 복사해 분석 장비가 연결된 포트로 보내는 기능이다.', true, 'IDS나 패킷 분석기로 트래픽을 감시할 때 쓴다.');
  ox('l3', 'eq', 'L3 스위치', 'L3 스위치는 라우팅 기능이 있어 서로 다른 VLAN 사이 통신을 처리할 수 있다.', true, 'L3 스위치는 하드웨어 기반으로 빠르게 3계층 라우팅을 수행한다.');

  /* ───────── 암기 카드 ───────── */
  cd('tc', 'OSI 7계층을 아래(1계층)부터 순서대로 쓰고, 각 계층의 대표 프로토콜·장비를 하나씩 말하시오.', '물리(허브·리피터) – 데이터링크(스위치·브리지, 이더넷) – 네트워크(라우터, IP·ICMP·ARP) – 전송(TCP·UDP) – 세션(NetBIOS) – 표현(JPEG·암호화) – 응용(HTTP·FTP·SMTP·DNS).', ['물리', '데이터링크', '네트워크', '전송', '세션', '표현', '응용']);
  cd('tc', 'TCP/IP 4계층 모델의 계층 이름과 OSI 7계층과의 대응을 쓰시오.', '네트워크 접근(물리·데이터링크) – 인터넷(네트워크) – 전송(전송) – 응용(세션·표현·응용).', ['네트워크 접근', '인터넷', '전송', '응용']);
  cd('tc', '자주 나오는 포트 번호 10가지를 쓰시오.', 'FTP 20/21, SSH 22, Telnet 23, SMTP 25, DNS 53, DHCP 67/68, HTTP 80, POP3 110, IMAP 143, SNMP 161/162, HTTPS 443, RDP 3389.', ['21', '22', '23', '25', '53', '80', '110', '443']);
  cd('tc', 'IPv4 사설 IP 주소 대역 세 가지를 CIDR로 쓰시오.', '10.0.0.0/8, 172.16.0.0/12(172.16.0.0~172.31.255.255), 192.168.0.0/16.', ['10.0.0.0', '172.16', '192.168']);
  cd('tc', 'IPv6 주소의 종류 세 가지와 IPv4에 없는 특징을 쓰시오.', '유니캐스트·멀티캐스트·애니캐스트. 브로드캐스트가 없고, 128비트 주소, 40바이트 고정 기본 헤더(확장 헤더), 주소 자동 설정, IPSec 기본 지원.', ['유니캐스트', '멀티캐스트', '애니캐스트', '브로드캐스트']);
  cd('tc', 'DHCP 주소 할당 4단계를 순서대로 쓰시오.', 'Discover(클라이언트 브로드캐스트) → Offer(서버 제안) → Request(클라이언트 요청) → Ack(서버 확인). 앞 글자를 따 DORA.', ['Discover', 'Offer', 'Request', 'Ack']);
  cd('ng', '네트워크 토폴로지 다섯 가지의 장단점을 한 줄씩 쓰시오.', '성형: 관리 쉬움, 중앙 장애 시 전체 중단. 버스형: 설치 쉬움, 케이블 장애에 취약·충돌 많음. 링형: 토큰으로 충돌 없음, 한 노드 장애가 전체에 영향. 망형: 신뢰성 최고, 회선 n(n−1)/2로 비용 큼. 트리형: 계층 확장 쉬움, 상위 노드 장애 영향 큼.', ['성형', '버스', '링', '망형', '트리']);
  cd('ng', '다중화 방식 네 가지를 쓰고 무엇으로 채널을 나누는지 쓰시오.', 'FDM(주파수), TDM(시간 슬롯), CDM(코드), WDM(빛의 파장).', ['FDM', 'TDM', 'CDM', 'WDM']);
  cd('ng', '오류 검출 방식과 오류 정정 방식을 구분해 쓰시오.', '검출: 패리티 비트, 블록 합(2차원 패리티), CRC, 체크섬. 정정: 해밍 코드 등 FEC(전진 오류 수정). 재전송 방식은 ARQ(Stop-and-Wait, Go-Back-N, Selective Repeat).', ['패리티', 'CRC', '해밍', 'ARQ']);
  cd('ng', '전송 매체 세 가지(UTP·동축·광섬유)의 특징을 쓰시오.', 'UTP: 싸고 설치 쉬움, 간섭에 약함, 100m. 동축: 간섭에 비교적 강함, CATV 등. 광섬유: 빛 전송, 대역폭 크고 감쇠 적어 장거리, 전자기 간섭 없음, 비싸고 접속 어려움.', ['UTP', '동축', '광섬유', '간섭']);
  cd('ng', 'IEEE 802 주요 표준 번호와 기술을 쓰시오.', '802.1(브리지·VLAN 802.1Q, STP 802.1D), 802.3 이더넷, 802.5 토큰 링, 802.11 무선 LAN, 802.15 WPAN(블루투스 802.15.1), 802.16 WiMAX.', ['802.3', '802.11', '802.5', '802.1Q']);
  cd('ng', '통신 방식(단방향·반이중·전이중)의 정의와 예를 쓰시오.', '단방향: 한쪽으로만(라디오·TV). 반이중: 양방향이지만 동시에는 한쪽만(무전기). 전이중: 동시에 양방향(전화).', ['단방향', '반이중', '전이중']);
  cd('os', 'RAID 0·1·5·6의 방식, 최소 디스크 수, 내결함성을 쓰시오.', 'RAID 0: 스트라이핑, 2개, 없음. RAID 1: 미러링, 2개, 디스크 1개 고장 허용(용량 50%). RAID 5: 분산 패리티, 3개, 1개 고장 허용(용량 n−1). RAID 6: 이중 분산 패리티, 4개, 2개 고장 허용(용량 n−2).', ['스트라이핑', '미러링', '패리티', '최소']);
  cd('os', 'DNS 리소스 레코드 A·AAAA·CNAME·MX·PTR·NS·SOA의 뜻을 쓰시오.', 'A: 이름→IPv4, AAAA: 이름→IPv6, CNAME: 별칭, MX: 메일 서버, PTR: IP→이름(역방향), NS: 영역의 네임서버, SOA: 영역의 시작·기본 정보.', ['A', 'AAAA', 'CNAME', 'MX', 'PTR']);
  cd('os', 'Windows 네트워크 진단 명령어 ipconfig·ping·tracert·nslookup·netstat·arp의 용도를 쓰시오.', 'ipconfig: IP 설정 확인(/all, /release, /renew, /flushdns). ping: 도달 확인(ICMP). tracert: 경로 확인. nslookup: DNS 질의. netstat: 연결·포트 상태. arp -a: ARP 캐시 확인.', ['ipconfig', 'ping', 'tracert', 'nslookup', 'netstat']);
  cd('os', 'Linux 주요 디렉터리 /etc, /var, /home, /bin, /dev, /tmp의 용도를 쓰시오.', '/etc 설정 파일, /var 로그·스풀 등 가변 데이터, /home 사용자 홈, /bin 기본 명령어, /dev 장치 파일, /tmp 임시 파일, /root root의 홈, /boot 부팅 파일.', ['/etc', '/var', '/home', '/dev']);
  cd('os', 'Linux 권한 숫자 표기(chmod)의 계산 방법과 755·644의 의미를 쓰시오.', 'r=4, w=2, x=1을 더해 소유자·그룹·기타 순으로 쓴다. 755 = rwxr-xr-x(디렉터리·실행 파일), 644 = rw-r--r--(일반 파일).', ['r=4', 'w=2', 'x=1', '755', '644']);
  cd('os', 'Linux 파일·프로세스 관리 명령 ls·cp·mv·rm·ps·kill·df·du·grep·find의 용도를 쓰시오.', 'ls 목록, cp 복사, mv 이동·이름 변경, rm 삭제, ps 프로세스 목록, kill 프로세스 종료 신호, df 파일 시스템 사용량, du 디렉터리 사용량, grep 문자열 검색, find 파일 찾기.', ['ps', 'kill', 'df', 'du', 'grep']);
  cd('eq', '네트워크 장비를 OSI 계층별로 분류하고 충돌·브로드캐스트 도메인을 나누는지 쓰시오.', '1계층 리피터·허브(둘 다 못 나눔), 2계층 브리지·스위치(충돌 도메인만 나눔), 3계층 라우터·L3 스위치(둘 다 나눔), 상위 계층 게이트웨이(프로토콜 변환), L4~L7 스위치(부하 분산).', ['허브', '스위치', '라우터', '충돌', '브로드캐스트']);
  cd('eq', '스위칭 방식 세 가지의 차이를 쓰시오.', 'Store-and-Forward: 프레임 전체 저장 후 CRC 검사(안정적, 지연 큼). Cut-Through: 목적지 MAC만 보고 바로 전달(빠름, 오류 전달 가능). Fragment-Free: 앞 64바이트만 확인(충돌 조각 걸러냄).', ['Store-and-Forward', 'Cut-Through', 'Fragment-Free']);
  cd('eq', 'VLAN의 목적과 액세스 포트·트렁크 포트의 차이를 쓰시오.', '물리 위치와 관계없이 논리적으로 브로드캐스트 도메인을 나눠 보안과 성능을 높인다. 액세스 포트는 VLAN 하나에 속하고, 트렁크 포트는 802.1Q 태그로 여러 VLAN을 한 링크로 전달한다. VLAN 간 통신은 라우터·L3 스위치가 필요.', ['브로드캐스트', '액세스', '트렁크', '802.1Q']);
  cd('eq', '방화벽·IDS·IPS의 차이를 쓰시오.', '방화벽: 정책(IP·포트 등)에 따라 허용·차단. IDS: 트래픽을 감시해 침입을 탐지하고 경보(차단하지 않음). IPS: 트래픽 경로에 위치해 탐지한 공격을 실시간 차단.', ['방화벽', 'IDS', 'IPS', '차단', '탐지']);
  cd('eq', 'Cisco 라우터의 모드 전환과 설정 저장 명령을 쓰시오.', '사용자 모드(>) → enable → 관리자 모드(#) → configure terminal → 전역 설정 모드. 현재 설정 보기 show running-config, 저장 copy running-config startup-config(write memory).', ['enable', 'configure terminal', 'running-config', 'startup-config']);
  cards.forEach((c, i) => P.push(M.card({ id: `nw-cd-${String(i + 1).padStart(2, '0')}`, unit: c.unit, pts: PTS, src: '암기 카드', q: c.q, a: c.a, kw: c.kw })));

  const SUMMARY = [
    { unit: 'tc', rows: [['OSI 7계층', '물리 – 데이터링크 – 네트워크 – 전송 – 세션 – 표현 – 응용'], ['PDU', '비트 – 프레임 – 패킷 – 세그먼트(데이터그램) – 메시지'], ['포트', 'FTP 20/21 · SSH 22 · Telnet 23 · SMTP 25 · DNS 53 · DHCP 67/68 · HTTP 80 · POP3 110 · IMAP 143 · SNMP 161 · HTTPS 443 · RDP 3389'], ['클래스', 'A 1~126 · B 128~191 · C 192~223 · D 224~239(멀티캐스트)'], ['사설 IP', '10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16'], ['서브넷', '호스트 수 = 2^(32 − 프리픽스) − 2, 블록 크기 = 256 − 마스크 마지막 값'], ['라우팅', 'RIP(거리 벡터, 최대 15홉) · OSPF(링크 상태) · BGP(AS 간 경로 벡터)']] },
    { unit: 'ng', rows: [['토폴로지', '성형(중앙 장애) · 버스(터미네이터) · 링(토큰) · 망형 n(n−1)/2'], ['매체 접근', '유선 이더넷 CSMA/CD · 무선 LAN CSMA/CA'], ['다중화', 'FDM 주파수 · TDM 시간 · CDM 코드 · WDM 파장'], ['오류 제어', '검출: 패리티·CRC·체크섬 / 정정: 해밍 / 재전송: ARQ'], ['IEEE', '802.3 이더넷 · 802.5 토큰 링 · 802.11 무선 LAN · 802.15.1 블루투스'], ['PCM', '표본화 → 양자화 → 부호화, 표본화 주파수 ≥ 2 × 최고 주파수']] },
    { unit: 'os', rows: [['RAID', '0 스트라이핑 · 1 미러링 · 5 분산 패리티(최소 3) · 6 이중 패리티(최소 4)'], ['DNS 레코드', 'A · AAAA · CNAME 별칭 · MX 메일 · PTR 역방향 · NS · SOA'], ['Windows 명령', 'ipconfig · ping · tracert · nslookup · netstat · arp -a'], ['권한', '공유 + NTFS → 더 제한적인 권한 / chmod r=4 w=2 x=1'], ['Linux 디렉터리', '/etc 설정 · /var 로그 · /home 사용자 · /dev 장치 · /bin 명령'], ['Linux 명령', 'ps · kill · df · du · grep · find · chown · chmod · umask']] },
    { unit: 'eq', rows: [['계층', '1계층 허브·리피터 · 2계층 스위치·브리지 · 3계층 라우터 · 상위 게이트웨이'], ['도메인', '스위치: 충돌 도메인 분리 / 라우터: 충돌 + 브로드캐스트 도메인 분리'], ['스위칭', 'Store-and-Forward · Cut-Through · Fragment-Free(64바이트)'], ['VLAN·STP', 'VLAN 논리 분할(802.1Q 트렁크) · STP 루프 방지(802.1D)'], ['보안', '방화벽 정책 차단 · IDS 탐지 · IPS 탐지 + 차단']] },
  ];

  const C = (unit, name, alias, desc) => ({ unit, name, alias: alias.split(','), desc });
  const CONCEPTS = [
    C('tc', 'OSI 7계층', 'OSI,7계층,계층,PDU', '네트워크 기능을 7단계로 나눈 참조 모델. 물리 – 데이터링크 – 네트워크 – 전송 – 세션 – 표현 – 응용.'),
    C('tc', 'TCP와 UDP', 'TCP,UDP,3-way,handshake,연결형,비연결형', 'TCP는 연결 지향·신뢰성(순서 번호·ACK·재전송), UDP는 비연결형으로 빠르고 헤더가 8바이트.'),
    C('tc', '서브넷 마스크와 서브네팅', '서브넷,서브네팅,서브넷 마스크,CIDR,프리픽스,브로드캐스트 주소,네트워크 주소,호스트 수', '프리픽스 길이만큼 1인 마스크로 네트워크 부분을 가른다. 호스트 수 = 2^(호스트 비트) − 2.'),
    C('tc', 'IPv6', 'IPv6,128비트,애니캐스트', '128비트 주소, 브로드캐스트 없음(유니·멀티·애니캐스트), 40바이트 고정 헤더, 자동 설정.'),
    C('tc', 'ARP와 ICMP', 'ARP,RARP,ICMP,ping', 'ARP는 IP로 MAC을 찾고, ICMP는 오류·진단 메시지(ping, Time Exceeded)를 전한다.'),
    C('tc', '포트 번호', '포트,포트 번호,well-known', '0~1023은 잘 알려진 포트. FTP 21, SSH 22, Telnet 23, SMTP 25, DNS 53, HTTP 80, HTTPS 443.'),
    C('tc', '라우팅 프로토콜', 'RIP,OSPF,BGP,라우팅,거리 벡터,링크 상태', 'RIP는 홉 수 기반 거리 벡터, OSPF는 링크 상태(다익스트라), BGP는 AS 사이 경로 벡터.'),
    C('tc', 'DHCP·DNS·NAT', 'DHCP,DNS,NAT,PAT', 'DHCP는 IP 자동 할당(DORA), DNS는 이름 ↔ IP 변환, NAT는 사설 ↔ 공인 IP 변환.'),
    C('ng', '토폴로지', '토폴로지,성형,버스형,링형,망형,스타', '장치를 연결하는 형태. 성형은 중앙 장애에 약하고, 망형은 신뢰성이 높지만 회선이 많다.'),
    C('ng', 'CSMA/CD와 CSMA/CA', 'CSMA,CSMA/CD,CSMA/CA,충돌', '유선 이더넷은 충돌을 감지(CD), 무선 LAN은 충돌을 회피(CA)한다.'),
    C('ng', '다중화', '다중화,FDM,TDM,WDM,CDM', '하나의 회선을 여러 채널로 나눠 쓰는 기술. 주파수·시간·코드·파장으로 나눈다.'),
    C('ng', '오류 제어', '오류,오류 제어,CRC,패리티,해밍,ARQ', '검출(패리티·CRC·체크섬), 정정(해밍), 재전송(ARQ) 방식이 있다.'),
    C('ng', '전송 매체', 'UTP,STP,동축,광섬유,케이블', 'UTP는 싸고 100m, 광섬유는 빛으로 장거리·간섭 없음.'),
    C('os', 'RAID', 'RAID,스트라이핑,미러링,패리티', '여러 디스크를 묶어 성능·안정성을 높인다. 0 스트라이핑, 1 미러링, 5 분산 패리티.'),
    C('os', 'Active Directory', 'Active Directory,AD,도메인 컨트롤러,GPO,그룹 정책', '도메인의 사용자·컴퓨터를 중앙에서 관리·인증하는 Windows 디렉터리 서비스.'),
    C('os', 'NTFS 권한', 'NTFS,공유 권한,권한,EFS', 'NTFS는 파일·폴더 권한, 암호화, 할당량을 지원. 공유 권한과 함께면 더 제한적인 쪽이 적용.'),
    C('os', 'DNS 레코드', 'MX,PTR,CNAME,AAAA,레코드,SOA', 'A·AAAA 주소, CNAME 별칭, MX 메일 서버, PTR 역방향, NS 네임서버, SOA 영역 정보.'),
    C('os', 'Linux 권한과 명령어', 'chmod,chown,umask,리눅스,linux,권한', 'chmod로 권한(r4 w2 x1), chown으로 소유자, umask로 기본 권한을 정한다.'),
    C('eq', '스위치와 라우터', '스위치,라우터,허브,브리지,충돌 도메인,브로드캐스트 도메인', '스위치는 MAC으로 전달하며 충돌 도메인을, 라우터는 IP로 경로를 정하며 브로드캐스트 도메인까지 나눈다.'),
    C('eq', 'VLAN과 STP', 'VLAN,트렁크,STP,스패닝 트리,루프', 'VLAN은 스위치에서 논리적으로 망을 나누고, STP는 이중 연결의 루프를 막는다.'),
    C('eq', '보안 장비', '방화벽,IDS,IPS,침입', '방화벽은 정책 차단, IDS는 탐지·경보, IPS는 탐지 후 차단.'),
    C('tc', 'IGMP와 멀티캐스트', 'IGMP,멀티캐스트,multicast', '호스트가 멀티캐스트 그룹 가입·탈퇴를 라우터에 알리는 IPv4 프로토콜. IPv6에서는 MLD.'),
    C('tc', 'TCP 제어 플래그', 'URG,RST,PSH,FIN,SYN,플래그', 'SYN 연결 시작, ACK 확인 응답, FIN 정상 종료, RST 강제 재설정, PSH 즉시 전달, URG 긴급 데이터.'),
    C('ng', 'VPN 프로토콜', 'PPTP,L2TP,SSTP,IPSec,VPN 프로토콜', 'PPTP·L2TP는 2계층, IPSec은 3계층(AH·ESP), SSTP는 SSL/TLS(443) 기반 터널링.'),
    C('ng', '서비스 거부 공격', 'DoS,DDoS,SYN Flooding,Smurf,Ping of Death,스니핑', 'SYN Flooding은 반쯤 열린 연결로, Smurf는 ICMP 브로드캐스트 증폭으로 자원을 고갈시킨다. 스니핑은 도청.'),
    C('os', 'crontab과 Linux 디스크 관리', 'crontab,fdisk,mkfs,mount,fstab,GRUB,MBR', 'crontab은 분·시·일·월·요일 순. 새 디스크는 fdisk → mkfs → mount → /etc/fstab 등록.'),
    C('os', 'Linux 서버 설정 파일', 'httpd.conf,DocumentRoot,named.conf,allow-query,hosts.allow,hosts.deny,TCP Wrapper', 'Apache는 DocumentRoot·Listen, BIND는 allow-query·allow-transfer, TCP Wrapper는 hosts.allow를 먼저 확인.'),
  ];

  window.SWM_PACKS = window.SWM_PACKS || {};
  window.SWM_PACKS.net = {
    key: 'net', name: '네트워크관리사 2급 필기', units: UNITS, probs: P, summary: SUMMARY, concepts: CONCEPTS,
    // 실제 2급 필기 배분(기출 20회분 확인): 1~17 TCP/IP, 18~27 네트워크 일반, 28~45 NOS, 46~50 운용기기
    mockMix: { tc: 17, ng: 10, os: 18, eq: 5 }, mockMin: 60, mockN: 50, mockPool: d => !d.ox && !d.essay,
    daily: [10, 20, 30, 50], dailyDef: 20,
    kinds: [['객관식', d => !d.ox && !d.essay], ['O/X', d => !!d.ox], ['암기 카드', d => !!d.essay]],
    cxUnit: [['tc', /tcp|ip|프로토콜|서브넷/i], ['ng', /네트워크\s*일반|전송|토폴로지/], ['os', /nos|윈도우|windows|리눅스|linux|서버/i], ['eq', /장비|운용기기|스위치|라우터/]],
    text: {
      sub: '네트워크관리사 2급 필기 · 객관식·O/X·암기 카드',
      today: '서브넷 계산은 회독마다 IP가 바뀌고, 객관식은 보기 순서가 섞임 · 다 맞히면 복습 간격 1→3→7→14→30일, 틀리면 다음 날 다시',
      bank: '출제 범위의 빈출 주제로 새로 만든 문제 · 객관식·O/X 자동 채점 · 암기 카드는 직접 채점',
      mockNav: '50문제', mockSub: '50문제 · 60분 · 과목 비중 반영', mockNotice: '50문제 · 60분 · 객관식만 출제 · 문제당 2점 · 60점 이상 합격선',
      sumNav: '핵심 정리', sumSub: '과목별 꼭 외울 내용', sumNote: '네트워크관리사 2급 필기 출제 범위 기준 요약',
      essayTag: '암기 카드', memoNav: '암기 카드', memoSub: '자주 나오는 내용을 카드로 외우기', memoNotice: '답을 먼저 떠올려 적고 → 답 보기 → 외움/다시 표시 · 적은 핵심어는 초록색',
      cxPh: '예: 서브넷 마스크 계산을 모르겠어',
    },
  };
})();
