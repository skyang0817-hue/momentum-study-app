/* Supabase 연결 설정
 * 비워 두면 '로컬 모드'로 동작한다 (기록이 이 브라우저에만 저장됨).
 * Supabase 프로젝트 → Project Settings → API Keys 에서 Project URL과 Publishable(anon) 키를 넣는다.
 * 이 키는 공개돼도 되는 키다. 데이터 보호는 supabase/schema.sql의 행 수준 보안(RLS)이 맡는다.
 */
window.FM_CONFIG = {
  supabaseUrl: '',      // 예: 'https://xxxx.supabase.co' (비우면 로컬 모드)
  supabaseAnonKey: '',  // Publishable 키
  startDay: '2026-10-29',  // 서비스 시작일: 출석 기록표·학습일지는 이 날짜부터
  showOfficial2026: false,
  pushKey: '',          // 메신저 알림(웹 푸시) 공개키, 짝이 되는 비밀키는 Supabase push_config 표에만 둔다
};
