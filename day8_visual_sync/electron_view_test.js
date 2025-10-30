/**
 * Day 8 — Electron 로컬 시각화 테스트 (최소 버전)
 * 사용법 (Windows PowerShell 예시)
 * 1) (중요) 파이썬 인터프리터 종료 확인 후
 * 2) 프로젝트 폴더에서:  npm init -y
 * 3) npm i electron --save-dev
 * 4) npx electron electron_view_test.js
 *
 * 현재 버전은 파일 읽기 + 콘솔 출력만 합니다.
 * 이후 Day 9에서 HTML 창 + Canvas 그래프까지 확장합니다.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // 로컬 JSON 로드
  const base = __dirname;
  const jsonPath = path.join(base, 'synced_progress.json');
  let payload = null;
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    payload = JSON.parse(raw);
    console.log('✅ synced_progress.json loaded:');
    console.log(payload);
  } catch (e) {
    console.error('⚠️ synced_progress.json not found. 먼저 visual_sync_test.py를 실행하세요.');
  }

  // 임시 HTML (콘솔 확인용)
  const html = `
  <html>
    <head><meta charset="utf-8"><title>Day 8 Viewer</title></head>
    <body>
      <h1>Day 8 — Electron Test</h1>
      <p>콘솔에서 synced_progress.json 데이터를 확인하세요.</p>
      ${payload ? `<pre>${JSON.stringify(payload, null, 2)}</pre>` : '<p style="color:red">synced_progress.json을 찾을 수 없습니다.</p>'}
    </body>
  </html>`;

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
