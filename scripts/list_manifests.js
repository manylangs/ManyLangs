/**
 * list_manifests.js
 *
 * 목적:
 *   Firestore contentManifests 컬렉션 전체를 읽어서
 *   series → lang → level 기준으로 몇 개의 챕터 문서가 있는지,
 *   그중 active(판매 가능) 상태인 게 몇 개인지 표로 보여준다.
 *   아무것도 쓰거나 지우지 않는 조회 전용 스크립트.
 *
 * 사용법:
 *   node scripts/list_manifests.js
 */

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
  console.log("Firestore contentManifests 조회 중...\n");

  const snap = await db.collection("contentManifests").get();

  if (snap.empty) {
    console.log("contentManifests 컬렉션이 비어 있습니다.");
    return;
  }

  // series -> lang -> level -> { total, active, chapters: [] }
  const tree = {};

  snap.forEach((doc) => {
    const d = doc.data();
    const { series, lang, level, active, chapter } = d;
    if (!series || !lang || !level) return;

    tree[series] ??= {};
    tree[series][lang] ??= {};
    tree[series][lang][level] ??= { total: 0, active: 0, chapters: [] };

    tree[series][lang][level].total++;
    if (active) tree[series][lang][level].active++;
    tree[series][lang][level].chapters.push(chapter);
  });

  console.log("============================================================");
  console.log(`전체 manifest 문서: ${snap.size}개`);
  console.log("============================================================\n");

  const seriesKeys = Object.keys(tree).sort();

  for (const series of seriesKeys) {
    console.log(`■ ${series}`);
    const langKeys = Object.keys(tree[series]).sort();

    for (const lang of langKeys) {
      const levelKeys = Object.keys(tree[series][lang]).sort();

      for (const level of levelKeys) {
        const info = tree[series][lang][level];
        const chapters = info.chapters.slice().sort();
        const firstChapter = chapters[0];
        const lastChapter = chapters[chapters.length - 1];
        const activeTag = info.active === info.total ? "전체 active" : `${info.active}/${info.total} active`;

        console.log(
          `    ${lang} / ${level}  →  챕터 ${info.total}개 (${firstChapter}~${lastChapter})  [${activeTag}]`
        );
      }
    }
    console.log("");
  }

  console.log("============================================================");
  console.log("완료 — 위 목록에 없는 language/series/level은 manifest가 존재하지 않는 것입니다.");
  console.log("============================================================");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
