const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function run() {
  const snap = await db.collection("contentManifests").get();

  let count = 0;

  for (const doc of snap.docs) {
    await doc.ref.delete();
    console.log("🗑 deleted:", doc.id);
    count++;
  }

  console.log("🔥 ALL MANIFESTS DELETED:", count);
  process.exit();
}

run();