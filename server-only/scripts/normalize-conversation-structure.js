const fs = require("fs");
const path = require("path");

const BOOK_BASE = path.join(__dirname, "../public/books/kr/conversation");
const AUDIO_BASE = path.join(__dirname, "../public/audio/kr/conversation");
const TARGET_BASE = path.join(__dirname, "../content/conversation/kr");

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
    if (!file.endsWith(".runtime.json")) return;

    const match = file.match(/conversation_(\d+)\.runtime\.json/);
    if (!match) return;

    const chapterNum = match[1].padStart(3, "0");
    const chapterPath = path.join(levelTargetPath, chapterNum);

    const dataDir = path.join(chapterPath, "data");
    const audioDir = path.join(chapterPath, "audio");
    const imagesDir = path.join(chapterPath, "images");

    ensureDir(dataDir);
    ensureDir(audioDir);
    ensureDir(imagesDir);

    // runtime 복사
    fs.copyFileSync(
      path.join(levelBookPath, file),
      path.join(dataDir, file)
    );

    // 오디오 복사
    if (fs.existsSync(levelAudioPath)) {
      const wavName = `conversation_${level}_${chapterNum}.wav`;
      const cuesName = `conversation_${level}_${chapterNum}.cues.json`;

      const wavPath = path.join(levelAudioPath, wavName);
      const cuesPath = path.join(levelAudioPath, cuesName);

      if (fs.existsSync(wavPath)) {
        fs.copyFileSync(wavPath, path.join(audioDir, wavName));
      }

      if (fs.existsSync(cuesPath)) {
        fs.copyFileSync(cuesPath, path.join(audioDir, cuesName));
      }
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

  console.log("🚀 Conversation runtime-only 변환 완료");
}

run();
