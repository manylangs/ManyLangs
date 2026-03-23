require("dotenv").config();
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const storage = new Storage({
  credentials: serviceAccount,
});

const bucket = storage.bucket("manylangs-55fd3.firebasestorage.app");

async function run() {
  const [files] = await bucket.getFiles({ prefix: "content/" });

  const chapterMap = {};

  for (const file of files) {
    const parts = file.name.split("/");
    // content/series/lang/level/chapter/...

    if (parts.length < 6) continue;

    const [, series, lang, level, chapter, folder] = parts;

    const key = `${series}_${lang}_${level}_${chapter}`;

    if (!chapterMap[key]) {
      chapterMap[key] = {
        series,
        lang,
        level,
        chapter,
        audio: null,
        data: null,
        image: null,
      };
    }

    if (folder === "audio") {
      chapterMap[key].audio = file.name;
    }

    if (folder === "data" && file.name.endsWith(".json")) {
      chapterMap[key].data = file.name;
    }

    if (folder === "images" && file.name.endsWith(".png")) {
      chapterMap[key].image = file.name;
    }
  }

  for (const key of Object.keys(chapterMap)) {
    const item = chapterMap[key];

    if (!item.data) {
      console.log("⚠ data.json 없음:", key);
      continue;
    }
    const docRef = db.collection("contentManifests").doc(key);

    try {
      await docRef.create({
        series: item.series,
        lang: item.lang,
        level: item.level,
        chapter: item.chapter,
        active: true,
        dataPath: item.data,
        assets: [
          item.audio ? { kind: "audio", path: item.audio } : null,
          item.image ? { kind: "image", path: item.image } : null,
        ].filter(Boolean),
      });

      console.log("✅ created:", key);
    } catch (e) {
      if (e.code === 6 || e.code === "already-exists") {
        console.log("⏭ already exists:", key);
      } else {
        throw e;
      }
    }
  }

  console.log("🔥 ALL SERIES MANIFEST SYNC COMPLETE");
  process.exit();
}

run();