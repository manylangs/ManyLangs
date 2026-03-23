const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(__dirname, "../content/idiom/kr");

function generateManifest(chapterPath) {
  const dataPath = path.join(chapterPath, "data", "data.json");
  const audioDir = path.join(chapterPath, "audio");
  const imagesDir = path.join(chapterPath, "images");

  if (!fs.existsSync(dataPath)) {
    console.warn(`⚠ data 없음: ${chapterPath}`);
    return;
  }

  let audioFiles = [];
  if (fs.existsSync(audioDir)) {
    audioFiles = fs.readdirSync(audioDir)
      .filter(f => f.endsWith(".wav"))
      .sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}))
      .map(f => `audio/${f}`);
  }

  let imageFiles = [];
  if (fs.existsSync(imagesDir)) {
    imageFiles = fs.readdirSync(imagesDir)
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .map(f => `images/${f}`);
  }

  const manifest = {
    data: "data/data.json",
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

  console.log("🎯 Idiom manifest 전체 생성 완료");
}

traverse();
