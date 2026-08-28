/**
 * delete_manifest_entry.js
 *
 * 목적:
 *   add_manifest_entry.js의 역방향.
 *   Firestore contentManifests에 실제로 존재하는 series → lang → level만
 *   번호로 골라서, 그 조합에 해당하는 문서들만 삭제한다.
 *   Storage의 실제 파일은 지우지 않는다 (Firestore manifest만 삭제).
 *   다른 조합의 문서는 조회도, 삭제도 하지 않는다.
 *
 * 사용법:
 *   node scripts/delete_manifest_entry.js
 */

require("dotenv").config({ path: ".env.local" });

const readline = require("readline");
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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
}

// autoSelect=true면 항목이 1개일 때 묻지 않고 바로 선택 (시리즈/언어에 사용)
// autoSelect=false면 항목이 1개여도 반드시 목록을 보여주고 직접 고르게 함 (레벨에 사용 —
// 삭제 대상이므로 실수 방지를 위해 항상 명시적으로 확인시킨다)
async function pickFromList(label, items, autoSelect = true) {
  if (items.length === 0) {
    console.log(`\n⚠️  ${label} 항목이 없습니다. (해당 범위에 manifest가 존재하지 않음)`);
    process.exit(1);
  }
  if (autoSelect && items.length === 1) {
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

async function main() {
  console.log("============================================================");
  console.log("ManyLangs — 선택 삭제 방식 manifest 삭제");
  console.log("(선택한 언어/시리즈/레벨의 Firestore manifest만 삭제, Storage 파일은 그대로 유지)");
  console.log("============================================================");

  console.log("\nFirestore contentManifests 조회 중...");
  const snap = await db.collection("contentManifests").get();

  if (snap.empty) {
    console.log("contentManifests 컬렉션이 비어 있습니다. 삭제할 것이 없습니다.");
    return;
  }

  // 실제 존재하는 series/lang/level만 트리로 수집
  const tree = {};
  snap.forEach((doc) => {
    const d = doc.data();
    const { series, lang, level } = d;
    if (!series || !lang || !level) return;
    tree[series] ??= {};
    tree[series][lang] ??= new Set();
    tree[series][lang].add(level);
  });

  const seriesList = Object.keys(tree).sort();
  const series = await pickFromList("시리즈", seriesList);

  const langList = Object.keys(tree[series]).sort();
  const lang = await pickFromList("언어", langList);

  const levelList = Array.from(tree[series][lang]).sort();
  const level = await pickFromList("레벨 (삭제할 레벨을 정확히 고르세요)", levelList, false);

  console.log(`\n선택된 조합: series=${series}, lang=${lang}, level=${level}`);

  // 실제 삭제 대상 문서 조회
  const targetSnap = await db
    .collection("contentManifests")
    .where("series", "==", series)
    .where("lang", "==", lang)
    .where("level", "==", level)
    .get();

  if (targetSnap.empty) {
    console.log("삭제 대상 문서가 없습니다.");
    return;
  }

  console.log(`\n삭제 대상 문서 ${targetSnap.size}개:`);
  targetSnap.forEach((doc) => console.log(`  - ${doc.id}`));

  const confirm = await ask(
    `\n⚠️  위 ${targetSnap.size}개 문서를 정말 삭제할까요? Storage 파일은 지워지지 않습니다. (y/n): `
  );
  if (confirm.toLowerCase() !== "y") {
    console.log("취소되었습니다.");
    process.exit(0);
  }

  let deleted = 0;
  let errors = 0;

  // Firestore batch는 500개 제한이 있으므로 청크로 나눠 처리
  const docs = targetSnap.docs;
  const chunkSize = 400;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    try {
      await batch.commit();
      chunk.forEach((doc) => console.log(`  🗑️  ${doc.id}`));
      deleted += chunk.length;
    } catch (e) {
      console.error(`  ❌ 배치 삭제 오류: ${e.message}`);
      errors += chunk.length;
    }
  }

  console.log(`\n완료! 삭제: ${deleted}개 / 오류: ${errors}개`);
  console.log("(다른 언어·시리즈·레벨의 manifest와 Storage 파일은 전혀 건드리지 않았습니다)");

  rl.close();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
