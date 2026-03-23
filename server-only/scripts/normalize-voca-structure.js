const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(__dirname, "../content/voca");

function normalizeChapter(chapterPath) {
  const files = fs.readdirSync(chapterPath);

  const audioDir = path.join(chapterPath, "audio");
  const dataDir = path.join(chapterPath, "data");
  const imagesDir = path.join(chapterPath, "images");

  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

  files.forEach((file) => {
    const filePath = path.join(chapterPath, file);

    if (file.endsWith(".wav")) {
      fs.renameSync(filePath, path.join(audioDir, file));
      console.log(`🎵 이동: ${file}`);
    }

    if (file === "data.json") {
      fs.renameSync(filePath, path.join(dataDir, file));
      console.log(`📄 이동: data.json`);
    }

    if (file === "manifest.json") {
      fs.unlinkSync(filePath);
      console.log(`🗑 기존 manifest 삭제`);
    }
  });
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

        normalizeChapter(chapterPath);
      });
    });
  });
}

traverse();
console.log("🚀 Voca 구조 Real 표준화 완료");
