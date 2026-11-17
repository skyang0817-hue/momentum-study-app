/* 접속 유지용 웹 워커
 * PC에서 앱 창이 다른 창에 가려지거나 최소화되면 브라우저는 그 창의 타이머를 1분에 한 번 수준으로 늦춘다.
 * 그러면 실시간 연결의 하트비트(30초)가 밀려 서버가 연결을 끊고 접속 현황에서 빠진다.
 * 워커의 타이머는 늦춰지지 않으므로, 여기서 하트비트 보낼 때를 앱에 알려 준다(app.js keepAlive).
 */
const ms = +new URLSearchParams(self.location.search).get('ms') || 25000;
setInterval(() => postMessage('beat'), ms);
