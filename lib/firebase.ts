// lib/firebase.ts

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 너가 Firebase Console에서 복사한 설정 값을 그대로 사용
const firebaseConfig = {
  apiKey: "AIzaSyBrj-BEHthzb1wN5oGTl6x1GsaQ7FRdV9k",
  authDomain: "manylangs-55fd3.firebaseapp.com",
  projectId: "manylangs-55fd3",
  storageBucket: "manylangs-55fd3.firebasestorage.app",
  messagingSenderId: "985145415448",
  appId: "1:985145415448:web:b50019b04828cb51e0706d"
};

// Firebase 앱 중복 초기화를 방지
export const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Firestore 인스턴스 export
export const db = getFirestore(app);
