const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(__dirname, "../content/voca");

function generateManifestForChapter(chapterPath) {
  const dataPath = path.join(chapterPath, "data", "data.json");
  const audioDir = path.join(chapterPath, "audio");
  const imagesDir = path.join(chapterPath, "images");

  if (!fs.existsSync(dataPath)) {
    console.warn(`⚠ data/data.json 없음: ${chapterPath}`);
    return;
  }

  let audioFiles = [];
  if (fs.existsSync(audioDir)) {
    audioFiles = fs.readdirSync(audioDir)
      .filter((f) => f.toLowerCase().endsWith(".wav"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => `audio/${f}`);
  }

  let imageFiles = [];
  if (fs.existsSync(imagesDir)) {
    imageFiles = fs.readdirSync(imagesDir)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => `images/${f}`);
  }

  const manifest = {
    data: "data/data.json",
    audio: audioFiles,
    images: imageFiles
  };

  const manifestPath = path.join(chapterPath, "manifest.json");

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  console.log(`✅ manifest 생성: ${manifestPath}`);
}

function traverse() {
  const langs = fs.readdirSync(BASE_PATH);

  langs.forEach((lang) => {
    const langPath = path.join(BASE_PATH, lang);
    if (!fs.statSync(langPath).isDirectory()) return;

    const levels = fs.readdirSync(langPath);

    levels.forEach((level) => {
      const levelPath = path.join(langPath, level);
      if (!fs.statSync(levelPath).isDirectory()) return;

      const chapters = fs.readdirSync(levelPath);

      chapters.forEach((chapter) => {
        const chapterPath = path.join(levelPath, chapter);
        if (!fs.statSync(chapterPath).isDirectory()) return;

        generateManifestForChapter(chapterPath);
      });
    });
  });
}

traverse();
console.log("🎯 Voca manifest v2 전체 생성 완료");
