// auto_email_report.js
import nodemailer from "nodemailer";
import fs from "fs";

// 테스트용 Firestore 데이터 읽기
const data = JSON.parse(fs.readFileSync("D:/ManyLangs/subscription_test.json", "utf8"));

// 이메일 송신 설정 (ManyLangs 관리용 계정)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rayforchatgpt1985@gmail.com",
    pass: "nhdgpeifebbvlshf"
 // Gmail 앱 비밀번호
  },
});

// 이메일 내용 구성
const mailOptions = {
  from: '"ManyLangs Admin" <manylangs.admin@manylangs.studio>',
  to: "manylangs.admin@manylangs.studio",
  subject: "✅ 구독 상태 자동 리포트",
  text: `새 구독 데이터가 Firestore에 업로드되었습니다.\n\nUser ID: ${data.user_id}\nPlan: ${data.plan}\nStatus: ${data.status}\nStarted At: ${data.started_at}`
};

// 전송
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("❌ 이메일 전송 실패:", error);
  } else {
    console.log("📧 이메일 전송 성공:", info.response);
  }
});
