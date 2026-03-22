const fs = require('fs');
const path = require('path');

const C2_DIR = __dirname;

// 파일 번호를 3자리 문자열로 변환
function padNumber(num) {
  return num.toString().padStart(3, '0');
}

// 대화를 lines 형식으로 변환
function convertDialogueToLines(targetDialogue, enDialogue, esDialogue, frDialogue, ptDialogue) {
  const lines = [];
  const maxLength = Math.max(
    targetDialogue.A.length,
    targetDialogue.B.length,
    enDialogue.A.length,
    enDialogue.B.length,
    esDialogue.A.length,
    esDialogue.B.length,
    frDialogue.A.length,
    frDialogue.B.length,
    ptDialogue.A.length,
    ptDialogue.B.length
  );

  // A와 B의 대화를 번갈아가며 lines에 추가
  for (let i = 0; i < maxLength; i++) {
    // A의 대화 추가
    if (i < targetDialogue.A.length) {
      lines.push({
        speaker: 'A',
        sentences: {
          target: targetDialogue.A[i],
          en: i < enDialogue.A.length ? enDialogue.A[i] : '',
          es: i < esDialogue.A.length ? esDialogue.A[i] : '',
          fr: i < frDialogue.A.length ? frDialogue.A[i] : '',
          pt: i < ptDialogue.A.length ? ptDialogue.A[i] : ''
        }
      });
    }

    // B의 대화 추가
    if (i < targetDialogue.B.length) {
      lines.push({
        speaker: 'B',
        sentences: {
          target: targetDialogue.B[i],
          en: i < enDialogue.B.length ? enDialogue.B[i] : '',
          es: i < esDialogue.B.length ? esDialogue.B[i] : '',
          fr: i < frDialogue.B.length ? frDialogue.B[i] : '',
          pt: i < ptDialogue.B.length ? ptDialogue.B[i] : ''
        }
      });
    }
  }

  return lines;
}

// 단일 챕터의 runtime JSON 생성
function generateRuntimeJSON(chapterNum) {
  const chapterId = padNumber(chapterNum);
  
  // 파일 경로
  const targetFile = path.join(C2_DIR, `conversation_${chapterId}.json`);
  const enFile = path.join(C2_DIR, `kr_en_${chapterId}.json`);
  const esFile = path.join(C2_DIR, `kr_es_${chapterId}.json`);
  const frFile = path.join(C2_DIR, `kr_fr_${chapterId}.json`);
  const ptFile = path.join(C2_DIR, `kr_pt_${chapterId}.json`);

  // 파일 존재 확인
  if (!fs.existsSync(targetFile)) {
    console.log(`Skipping ${chapterId}: conversation_${chapterId}.json not found`);
    return;
  }

  // JSON 파일 읽기 (BOM 제거)
  const readJSON = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content.replace(/^\uFEFF/, ''));
  };

  const targetData = readJSON(targetFile);
  const enData = readJSON(enFile);
  const esData = readJSON(esFile);
  const frData = readJSON(frFile);
  const ptData = readJSON(ptFile);

  // Runtime JSON 구조 생성
  const runtimeJSON = {
    meta: {
      series: 'conversation',
      level: 'c2',
      id: chapterId
    },
    title: {
      target: targetData.title_kr || '',
      en: enData.title_en || '',
      es: esData.title_es || '',
      fr: frData.title_fr || '',
      pt: ptData.title_pt || ''
    },
    blocks: []
  };

  // 각 set을 block으로 변환
  const numSets = targetData.sets.length;
  for (let i = 0; i < numSets; i++) {
    const targetSet = targetData.sets[i];
    const enSet = enData.sets[i];
    const esSet = esData.sets[i];
    const frSet = frData.sets[i];
    const ptSet = ptData.sets[i];

    const block = {
      set_id: padNumber(targetSet.set_id),
      lines: convertDialogueToLines(
        targetSet.dialogue_layer,
        enSet.dialogue_layer,
        esSet.dialogue_layer,
        frSet.dialogue_layer,
        ptSet.dialogue_layer
      )
    };

    runtimeJSON.blocks.push(block);
  }

  // Runtime JSON 파일 저장
  const outputFile = path.join(C2_DIR, `conversation_${chapterId}.runtime.json`);
  fs.writeFileSync(outputFile, JSON.stringify(runtimeJSON, null, 2), 'utf8');
  console.log(`Generated: conversation_${chapterId}.runtime.json`);
}

// 메인 실행
function main() {
  // c2 폴더의 모든 conversation_*.json 파일 찾기
  const files = fs.readdirSync(C2_DIR);
  const conversationFiles = files.filter(f => f.startsWith('conversation_') && f.endsWith('.json') && !f.includes('.runtime.'));

  if (conversationFiles.length === 0) {
    console.log('No conversation files found');
    return;
  }

  // 각 파일에 대해 runtime JSON 생성
  conversationFiles.forEach(file => {
    const match = file.match(/conversation_(\d+)\.json/);
    if (match) {
      const chapterNum = parseInt(match[1], 10);
      generateRuntimeJSON(chapterNum);
    }
  });

  console.log(`\nCompleted! Generated ${conversationFiles.length} runtime JSON files.`);
}

main();

