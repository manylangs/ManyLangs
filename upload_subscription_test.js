// upload_subscription_test.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "manylangs-7299b.firebaseapp.com",
  projectId: "manylangs-7299b",
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

import fs from "fs";
const data = JSON.parse(fs.readFileSync("D:/ManyLangs/subscription_test.json", "utf8"));

await setDoc(doc(db, "subscriptions", data.user_id), data);
console.log("✅ Firestore 업로드 완료:", data.user_id);
