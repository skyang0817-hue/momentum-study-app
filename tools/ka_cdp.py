"""keepalive.js 워커를 실제 시간으로 점검 (가상 시간 헤드리스에서는 워커 타이머가 돌지 않음)
사용: python -m http.server 8765 --bind 127.0.0.1 (cpa-fm-app 폴더) 실행 후  python -I tools/ka_cdp.py
"""
import json, subprocess, tempfile, time, urllib.request, websocket
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
prof = tempfile.mkdtemp()
p = subprocess.Popen([EDGE, '--headless=new', '--disable-gpu', '--remote-debugging-port=9333', f'--user-data-dir={prof}', 'about:blank'])
try:
    for _ in range(50):
        try: tabs = json.load(urllib.request.urlopen('http://127.0.0.1:9333/json')); break
        except Exception: time.sleep(0.2)
    ws = websocket.create_connection([t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl'])
    ws.send(json.dumps({'id': 1, 'method': 'Page.navigate', 'params': {'url': 'http://127.0.0.1:8765/tools/ka_check.html'}})); ws.recv()
    time.sleep(2.5)
    ws.send(json.dumps({'id': 2, 'method': 'Runtime.evaluate', 'params': {'expression': "document.getElementById('o').textContent"}}))
    while True:
        m = json.loads(ws.recv())
        if m.get('id') == 2: print(m['result']['result']['value']); break
finally:
    p.kill()
