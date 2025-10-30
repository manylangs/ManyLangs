// auto_email_scheduler.js
import { exec } from "child_process";

// 매일 오전 9시(한국시간)에 자동 리포트 발송
function scheduleDailyReport() {
  const now = new Date();
  const next = new Date();
  next.setMinutes(now.getMinutes() + 1);// 오전 9시
  if (now > next) next.setDate(next.getDate() + 1);

  const delay = next.getTime() - now.getTime();

  console.log(`⏰ 다음 리포트 발송 예정: ${next}`);

  setTimeout(() => {
    console.log("📤 자동 리포트 전송 실행 중...");
    exec("node D:/ManyLangs/auto_email_report.js", (err, stdout, stderr) => {
      if (err) console.error("❌ 자동 리포트 오류:", err);
      else console.log("✅ 자동 리포트 완료\n", stdout);
    });

    // 다음 날 다시 예약
    scheduleDailyReport();
  }, delay);
}

scheduleDailyReport();
