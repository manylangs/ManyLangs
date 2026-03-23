const fs = require("fs");
const path = require("path");

const BASE_PATH = path.join(__dirname, "../content/voca");

function generateManifestForChapter(chapterPath) {
  const files = fs.readdirSync(chapterPath);

  const wavFiles = files
    .filter((file) => file.toLowerCase().endsWith(".wav"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!files.includes("data.json")) {
    console.warn(`⚠ data.json 없음: ${chapterPath}`);
    return;
  }

  const manifest = {
    data: "data.json",
    audio: wavFiles,
  };

  const manifestPath = path.join(chapterPath, "manifest.json");

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  console.log(`✅ manifest 생성: ${manifestPath}`);
}

function traverseLevels() {
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

traverseLevels();

console.log("🎯 Voca manifest 전체 생성 완료");
