const { exec } = require('child_process');

// 통합 테스트 자동 실행
app.whenReady().then(() => {
  console.log("🚀 Starting Full Integration Test...");
  exec("node ai_feedback_test.js && node writing_feedback_test.js && node stripe_dashboard_test.js", (err, stdout) => {
    if (err) console.error(err);
    console.log(stdout);
  });
});
