// electron_feedback_view.js
// 실행: node electron_feedback_view.js

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    },
    title: "Day 9 — Pronunciation Feedback Viewer"
  });

  const feedbackPath = path.join(__dirname, 'feedback.json');
  const data = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));

  const { accuracy, tone, color, level } = data;

  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Day 9 — Pronunciation Feedback Viewer</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #fafafa;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          h1 { margin-bottom: 30px; }
          .bar-container {
            width: 80%;
            background: #e0e0e0;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
          }
          .bar {
            height: 30px;
            border-radius: 8px;
            text-align: center;
            color: white;
            line-height: 30px;
            font-weight: bold;
          }
          .label {
            margin-top: 8px;
            font-size: 18px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>Day 9 — Pronunciation Feedback Viewer</h1>

        <div class="label">Accuracy: ${(accuracy * 100).toFixed(0)}%</div>
        <div class="bar-container">
          <div class="bar" style="width:${accuracy * 100}%; background:${color.accuracy};">
            ${(accuracy * 100).toFixed(0)}%
          </div>
        </div>

        <div class="label">Tone: ${(tone * 100).toFixed(0)}%</div>
        <div class="bar-container">
          <div class="bar" style="width:${tone * 100}%; background:${color.tone};">
            ${(tone * 100).toFixed(0)}%
          </div>
        </div>

        <h2 style="color:${color.level}; margin-top:40px;">${level}</h2>
      </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

app.whenReady().then(createWindow);
