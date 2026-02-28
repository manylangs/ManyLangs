const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(__dirname, "../content/grammar/kr");

function generateManifest(chapterPath) {
  const dataDir = path.join(chapterPath, "data");
  const audioDir = path.join(chapterPath, "audio");
  const imagesDir = path.join(chapterPath, "images");

  if (!fs.existsSync(dataDir)) return;

  const dataFiles = fs.readdirSync(dataDir)
    .filter(f => f.endsWith(".runtime.json"))
    .map(f => `data/${f}`);

  const audioFiles = fs.existsSync(audioDir)
    ? fs.readdirSync(audioDir).map(f => `audio/${f}`)
    : [];

  const imageFiles = fs.existsSync(imagesDir)
    ? fs.readdirSync(imagesDir).map(f => `images/${f}`)
    : [];

  const manifest = {
    data: dataFiles,
    audio: audioFiles,
    images: imageFiles
  };

  fs.writeFileSync(
    path.join(chapterPath, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  console.log(`✅ manifest 생성: ${chapterPath}`);
}

function traverse() {
  const levels = fs.readdirSync(BASE_PATH);

  levels.forEach(level => {
    const levelPath = path.join(BASE_PATH, level);
    if (!fs.statSync(levelPath).isDirectory()) return;

    const chapters = fs.readdirSync(levelPath);

    chapters.forEach(chapter => {
      const chapterPath = path.join(levelPath, chapter);
      if (!fs.statSync(chapterPath).isDirectory()) return;

      generateManifest(chapterPath);
    });
  });

  console.log("🎯 Grammar manifest 전체 생성 완료");
}

traverse();
