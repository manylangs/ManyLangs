// lib/firebaseAdmin.ts
import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const projectId = requireEnv("FIREBASE_PROJECT_ID").trim();
const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL").trim();

function normalizePrivateKey(raw: string) {
  let k = raw.trim();

  // env에 따옴표가 실제 포함된 경우 제거
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }

  // \\n → \n 복원
  k = k.replace(/\\n/g, "\n");

  // CR 제거
  k = k.replace(/\r/g, "");

  return k;
}

const privateKey = normalizePrivateKey(requireEnv("FIREBASE_PRIVATE_KEY"));

const APP_NAME = "admin";
const app =
  getApps().find((a) => a.name === APP_NAME) ||
  initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    APP_NAME
  );

export const db = getFirestore(app);
