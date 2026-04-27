require("dotenv").config({ path: ".env.local" });

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore();
const bucket = getStorage().bucket();

function getAudioPath(series, lang, level, chapter) {
  switch (series) {
    case "conversation":
    case "idiom":
    case "voca":
      return `content/${series}/${lang}/${level}/${chapter}/audio/${series}_${level}_${chapter}.wav`;
    case "grammar":
      return null;
    default:
      return null;
  }
}

function getDataPath(series, lang, level, chapter) {
  switch (series) {
    case "conversation":
    case "grammar":
      return `content/${series}/${lang}/${level}/${chapter}/data/${series}_${chapter}.runtime.json`;
    case "idiom":
    case "voca":
      return `content/${series}/${lang}/${level}/${chapter}/data/data.json`;
    default:
      return null;
  }
}

async function getRealAssets(lang, level, chapter) {
  const prefix = `content/real/${lang}/${level}/${chapter}/`;
  const [files] = await bucket.getFiles({ prefix });
  const assets = [];
  let dataPath = null;
  for (const file of files) {
    const p = file.name;
    const name = p.split("/").pop();
    if (!name || name === "" || name.startsWith(".")) continue;
    if (p.includes("/audio/")) assets.push({ kind: "audio", path: p });
    else if (p.includes("/images/")) assets.push({ kind: "image", path: p });
    else if (p.includes("/data/")) dataPath = p;
  }
  return { assets, dataPath };
}

async function getChapters(series, lang, level) {
  const prefix = `content/${series}/${lang}/${level}/`;
  const [, , apiResponse] = await bucket.getFiles({
    prefix,
    delimiter: "/",
    autoPaginate: false,
  });
  const prefixes = apiResponse?.prefixes || [];
  return prefixes
    .map((p) => p.replace(prefix, "").replace("/", ""))
    .filter((c) => c && /^\d+$/.test(c))
    .sort();
}

async function getSeriesLangLevels() {
  const series = ["conversation", "idiom", "voca", "grammar", "real"];
  const result = [];
  for (const s of series) {
    const prefix = `content/${s}/`;
    const [, , langsRes] = await bucket.getFiles({ prefix, delimiter: "/", autoPaginate: false });
    for (const langPrefix of langsRes?.prefixes || []) {
      const lang = langPrefix.replace(prefix, "").replace("/", "");
      const [, , levelsRes] = await bucket.getFiles({ prefix: langPrefix, delimiter: "/", autoPaginate: false });
      for (const levelPrefix of levelsRes?.prefixes || []) {
        const level = levelPrefix.replace(langPrefix, "").replace("/", "");
        result.push({ series: s, lang, level });
      }
    }
  }
  return result;
}

async function main() {
  console.log("🔍 Storage 스캔 시작...\n");
  const combos = await getSeriesLangLevels();
  console.log(`📦 발견된 series/lang/level 조합: ${combos.length}개\n`);
  let total = 0;
  let errors = 0;
  for (const { series, lang, level } of combos) {
    const chapters = await getChapters(series, lang, level);
    console.log(`  [${series}/${lang}/${level}] 챕터 ${chapters.length}개`);
    for (const chapter of chapters) {
      const docId = `${series}_${lang}_${level}_${chapter}`;
      try {
        let assets = [];
        let dataPath = null;
        if (series === "real") {
          const r = await getRealAssets(lang, level, chapter);
          assets = r.assets;
          dataPath = r.dataPath;
        } else {
          const audioPath = getAudioPath(series, lang, level, chapter);
          if (audioPath) assets.push({ kind: "audio", path: audioPath });
          dataPath = getDataPath(series, lang, level, chapter);
        }
        const doc = { active: true, series, lang, level, chapter, assets, ...(dataPath ? { dataPath } : {}) };
        await db.collection("contentManifests").doc(docId).set(doc);
        console.log(`    ✅ ${docId}`);
        total++;
      } catch (e) {
        console.error(`    ❌ ${docId}: ${e.message}`);
        errors++;
      }
    }
  }
  console.log(`\n🎉 완료! 생성: ${total}개 / 오류: ${errors}개`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
