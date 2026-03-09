const fs = require("fs");
const path = require("path");

const ROOT = "./content/conversation";

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      walk(full);
      continue;
    }

    if (e.name !== "manifest.json") continue;

    const manifestPath = full;
    const folder = path.dirname(manifestPath);

    const parts = folder.split(path.sep);
    const chapterId = parts.pop();
    const level = parts.pop();
    const lang = parts.pop();
    const series = "conversation";

    const old = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const assets = [];

    if (old.audio) {
      old.audio.forEach((a) => {
        assets.push({ kind: "audio", path: a });
      });
    }

    if (old.data) {
      old.data.forEach((d) => {
        assets.push({ kind: "data", path: d });
      });
    }

    if (old.images) {
      old.images.forEach((img) => {
        assets.push({ kind: "image", path: img });
      });
    }

    const newManifest = {
      series,
      lang,
      level,
      chapterId,
      version: "2026-03",
      assets
    };

    fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2));
    console.log("converted:", manifestPath);
  }
}

walk(ROOT);
