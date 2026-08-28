/**
 * add_manifest_entry.js
 *
 * 목적:
 *   generate-manifests-from-storage.js는 Storage 전체를 스캔해서
 *   contentManifests 컬렉션 전체를 다시 쓰는 "전체 재생성" 스크립트다.
 *   반면 이 스크립트는 사용자가 언어 → 시리즈 → 레벨을 하나씩 골라서
 *   "그 조합에 해당하는 챕터들"만 골라 Firestore에 upsert한다.
 *   다른 언어/시리즈/레벨의 기존 manifest 문서는 절대 건드리지 않는다
 *   (읽지도, 삭제하지도 않음 — 오직 선택된 docId만 set).
 *
 * 사용법:
 *   node scripts/add_manifest_entry.js
 *   프롬프트에 따라 번호만 입력하면 됨.
 */

require("dotenv").config({ path: ".env.local" });

const readline = require("readline");
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

// demo 계열은 이 스크립트 대상에서 제외 (판매용 콘텐츠만 다룸)
const SERIES_LIST = ["grammar", "conversation", "real", "voca", "idiom"];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
}

async function listSubPrefixes(prefix) {
  const [, , res] = await bucket.getFiles({ prefix, delimiter: "/", autoPaginate: false });
  const prefixes = res?.prefixes || [];
  return prefixes.map((p) => p.replace(prefix, "").replace(/\/$/, "")).filter(Boolean);
}

async function pickFromList(label, items) {
  if (items.length === 0) {
    console.log(`\n⚠️  ${label} 항목을 Storage에서 찾지 못했습니다. 먼저 콘텐츠를 업로드했는지 확인하세요.`);
    process.exit(1);
  }
  if (items.length === 1) {
    console.log(`\n${label}: "${items[0]}" 하나만 존재해서 자동 선택합니다.`);
    return items[0];
  }
  console.log(`\n${label}을(를) 선택하세요:`);
  items.forEach((it, i) => console.log(`  ${i + 1}. ${it}`));
  const ans = await ask("번호 입력: ");
  const idx = parseInt(ans, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= items.length) {
    console.log("잘못된 입력입니다.");
    process.exit(1);
  }
  return items[idx];
}

// ── manifest 문서 생성 로직 (generate-manifests-from-storage.js와 동일한 규칙) ──

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
  const [, , apiResponse] = await bucket.getFiles({ prefix, delimiter: "/", autoPaginate: false });
  const prefixes = apiResponse?.prefixes || [];
  return prefixes
    .map((p) => p.replace(prefix, "").replace("/", ""))
    .filter((c) => c && /^\d+$/.test(c))
    .sort();
}

async function main() {
  console.log("============================================================");
  console.log("ManyLangs — 선택 추가 방식 manifest 생성");
  console.log("(선택한 언어/시리즈/레벨만 Firestore에 반영, 다른 항목은 전혀 건드리지 않음)");
  console.log("============================================================");

  // 1) 시리즈 선택 (5종 고정 목록)
  console.log("\n시리즈를 선택하세요:");
  SERIES_LIST.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  const seriesAns = await ask("번호 입력: ");
  const seriesIdx = parseInt(seriesAns, 10) - 1;
  if (Number.isNaN(seriesIdx) || seriesIdx < 0 || seriesIdx >= SERIES_LIST.length) {
    console.log("잘못된 입력입니다.");
    process.exit(1);
  }
  const series = SERIES_LIST[seriesIdx];

  // 2) 언어 선택 — 실제 Storage에 있는 언어 폴더만 표시
  const langs = await listSubPrefixes(`content/${series}/`);
  const lang = await pickFromList("언어", langs);

  // 3) 레벨 선택 — 실제 Storage에 있는 레벨 폴더만 표시
  //    idiom처럼 폴더가 하나뿐이면 pickFromList가 자동 선택함(질문 없이 진행)
  const levels = await listSubPrefixes(`content/${series}/${lang}/`);
  const level = await pickFromList("레벨", levels);

  // 4) 최종 확인
  console.log(`\n선택된 조합: series=${series}, lang=${lang}, level=${level}`);
  const confirm = await ask("이 조합의 챕터들을 Firestore contentManifests에 추가할까요? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("취소되었습니다.");
    process.exit(0);
  }

  const chapters = await getChapters(series, lang, level);
  console.log(`\n[${series}/${lang}/${level}] 챕터 ${chapters.length}개 발견`);

  let total = 0;
  let errors = 0;

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

      const doc = {
        active: true,
        series,
        lang,
        level,
        chapter,
        assets,
        ...(dataPath ? { dataPath } : {}),
      };

      // ⚠️ 오직 이 docId만 set — 다른 문서는 절대 조회/수정하지 않음
      await db.collection("contentManifests").doc(docId).set(doc);
      console.log(`  ✅ ${docId}`);
      total++;
    } catch (e) {
      console.error(`  ❌ ${docId}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n완료! 생성/갱신: ${total}개 / 오류: ${errors}개`);
  console.log(`(다른 언어·시리즈·레벨의 기존 manifest는 전혀 건드리지 않았습니다)`);

  rl.close();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
