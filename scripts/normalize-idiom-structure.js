const fs = require("fs");
const path = require("path");

const BOOK_BASE = path.join(__dirname, "../public/books/kr/idiom");
const AUDIO_BASE = path.join(__dirname, "../public/audio/kr/idiom");
const TARGET_BASE = path.join(__dirname, "../content/idiom/kr");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeLevel(level) {
  const levelBookPath = path.join(BOOK_BASE, level);
  const levelAudioPath = path.join(AUDIO_BASE, level);
  const levelTargetPath = path.join(TARGET_BASE, level);

  if (!fs.existsSync(levelBookPath)) return;

  ensureDir(levelTargetPath);

  const files = fs.readdirSync(levelBookPath);

  files.forEach((file) => {
    if (!file.endsWith(".json")) return;

    const match = file.match(/idiom_(\d+)\.json/);
    if (!match) return;

    const chapterNum = match[1].padStart(3, "0");
    const chapterPath = path.join(levelTargetPath, chapterNum);

    const dataDir = path.join(chapterPath, "data");
    const audioDir = path.join(chapterPath, "audio");
    const imagesDir = path.join(chapterPath, "images");

    ensureDir(dataDir);
    ensureDir(audioDir);
    ensureDir(imagesDir);

    // 데이터 이동
    const srcData = path.join(levelBookPath, file);
    const destData = path.join(dataDir, "data.json");
    fs.copyFileSync(srcData, destData);

    // 오디오 이동 (파일명 동일 기준)
    if (fs.existsSync(levelAudioPath)) {
      const audioFiles = fs.readdirSync(levelAudioPath)
        .filter(f => f.includes(match[1]) && f.endsWith(".wav"));

      audioFiles.forEach(f => {
        fs.copyFileSync(
          path.join(levelAudioPath, f),
          path.join(audioDir, f)
        );
      });
    }

    console.log(`✅ 변환 완료: ${level}/${chapterNum}`);
  });
}

function run() {
  ensureDir(TARGET_BASE);

  const levels = fs.readdirSync(BOOK_BASE);

  levels.forEach(level => {
    if (level === "index.json") return;
    normalizeLevel(level);
  });

  console.log("🚀 Idiom 구조 Real 표준 변환 완료");
}

run();
