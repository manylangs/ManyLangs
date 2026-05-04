require("dotenv").config({ path: ".env.local" });

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();

async function main() {
  console.log("🗑️  contentManifests 전체 삭제 시작...\n");
  let total = 0;
  let snap;
  do {
    snap = await db.collection("contentManifests").limit(500).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.docs.length;
    console.log(`  삭제 완료: ${total}개`);
  } while (snap.docs.length === 500);
  console.log(`\n✅ 총 ${total}개 삭제 완료`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
