// ? CommonJS ���� (Node 22 ȣȯ �Ϻ�)
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";

dotenv.config();

// ?? serviceAccountKey.json ���� �ε�
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "manylangs-7299b",
});

async function runIntegrationTest() {
  console.log("?? ManyLangs ���� �׽�Ʈ ����...");

  // 1?? Firestore ���� Ȯ��
  try {
    const db = admin.firestore();
    await db.collection("test_connection").doc("ping").set({ ok: true, time: new Date().toISOString() });
    console.log("? Firestore ���� ����");
  } catch (err) {
    console.error("? Firestore ���� ����:", err.message);
  }

  // 2?? Stripe API Ű �׽�Ʈ
  try {
    const res = await fetch("https://api.stripe.com/v1/charges", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    console.log(res.ok ? "? Stripe API Ű ����" : "?? Stripe ���� ������");
  } catch (err) {
    console.error("? Stripe ���� ����:", err.message);
  }

  // 3?? Firebase Hosting �׽�Ʈ
  try {
    const hostRes = await fetch("https://manylangs.web.app");
    console.log(hostRes.ok ? "? Hosting ���� ����" : "?? Hosting ���� ����");
  } catch {
    console.error("? Firebase Hosting ���� ����");
  }

  console.log("?? ���� �׽�Ʈ �Ϸ�");
}

runIntegrationTest();
