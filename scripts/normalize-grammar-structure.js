const fs = require("fs");
const path = require("path");

const SOURCE_BASE = path.join(__dirname, "../public/books/kr/grammar");
const TARGET_BASE = path.join(__dirname, "../content/grammar/kr");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function processLevel(level) {
  const levelPath = path.join(SOURCE_BASE, level);
  if (!fs.existsSync(levelPath)) return;
  if (!fs.statSync(levelPath).isDirectory()) return;

  const files = fs.readdirSync(levelPath)
    .filter(f => f.endsWith(".runtime.json") && f.startsWith("grammar_"));

  files.forEach(file => {
    const match = file.match(/grammar_(\d+)\.runtime\.json/);
    if (!match) return;

    const chapter = match[1].padStart(3, "0");

    const sourceFile = path.join(levelPath, file);
    const targetChapterPath = path.join(TARGET_BASE, level, chapter);

    const dataDir = path.join(targetChapterPath, "data");
    const audioDir = path.join(targetChapterPath, "audio");
    const imagesDir = path.join(targetChapterPath, "images");

    ensureDir(dataDir);
    ensureDir(audioDir);
    ensureDir(imagesDir);

    fs.copyFileSync(
      sourceFile,
      path.join(dataDir, `grammar_${chapter}.runtime.json`)
    );

    console.log(`✅ 변환 완료: ${level}/${chapter}`);
  });
}

function run() {
  ensureDir(TARGET_BASE);

  const levels = fs.readdirSync(SOURCE_BASE);
  levels.forEach(level => processLevel(level));

  console.log("🚀 Grammar runtime-only Real 구조 변환 완료");
}

run();
