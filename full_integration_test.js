// ? CommonJS 버전 (Node 22 호환 완벽)
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";

dotenv.config();

// ?? serviceAccountKey.json 직접 로드
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "manylangs-7299b",
});

async function runIntegrationTest() {
  console.log("?? ManyLangs 통합 테스트 시작...");

  // 1?? Firestore 연결 확인
  try {
    const db = admin.firestore();
    await db.collection("test_connection").doc("ping").set({ ok: true, time: new Date().toISOString() });
    console.log("? Firestore 연결 성공");
  } catch (err) {
    console.error("? Firestore 연결 실패:", err.message);
  }

  // 2?? Stripe API 키 테스트
  try {
    const res = await fetch("https://api.stripe.com/v1/charges", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    console.log(res.ok ? "? Stripe API 키 정상" : "?? Stripe 응답 비정상");
  } catch (err) {
    console.error("? Stripe 연결 실패:", err.message);
  }

  // 3?? Firebase Hosting 테스트
  try {
    const hostRes = await fetch("https://manylangs.web.app");
    console.log(hostRes.ok ? "? Hosting 정상 동작" : "?? Hosting 오류 감지");
  } catch {
    console.error("? Firebase Hosting 접근 실패");
  }

  console.log("?? 통합 테스트 완료");
}

runIntegrationTest();
