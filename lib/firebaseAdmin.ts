// lib/firebaseAdmin.ts
import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const projectId = requireEnv("FIREBASE_PROJECT_ID").trim();
const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL").trim();

function normalizePrivateKey(raw: string) {
  let k = raw.trim();

  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }

  k = k.replace(/\\n/g, "\n");
  k = k.replace(/\r/g, "");
  return k;
}

const privateKey = normalizePrivateKey(requireEnv("FIREBASE_PRIVATE_KEY"));

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        storageBucket: "manylangs-55fd3.firebasestorage.app",
      })
    : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);