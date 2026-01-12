import { readFile } from "fs/promises";
import { join } from "path";
import IdiomViewer from "@/app/viewer/renderers/IdiomViewer";

export default async function Page({ params }: any) {
  const { level, chapter } = await params;

  const basePath = join(
    process.cwd(),
    "public",
    "books",
    "kr",
    "idiom"
  );

  const dataPath = join(
    basePath,
    level,
    `idiom_${chapter}.json`
  );

  const indexPath = join(basePath, "index.json");

  let data = null;
  let chapters: string[] = [];

  try {
    data = JSON.parse(await readFile(dataPath, "utf-8"));
    const index = JSON.parse(await readFile(indexPath, "utf-8"));
    chapters = index.levels?.[level]?.chapters ?? [];
  } catch (e) {
    // 파일 없거나 파싱 실패 시
    return null;
  }

  // 🔒 여기서 data.blocks 보장
  if (!data || !Array.isArray(data.blocks)) {
    return null;
  }

  return (
    <IdiomViewer
      data={data}
      level={level}
      chapter={chapter}
      chapters={chapters}
    />
  );
}
