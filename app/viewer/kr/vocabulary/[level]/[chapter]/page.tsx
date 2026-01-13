import { readFile } from "fs/promises";
import { join } from "path";
import VocabularyViewer from "@/app/viewer/renderers/VocabularyViewer";

export default async function Page({ params }: any) {
  const { level, chapter } = await params;

  const basePath = join(
    process.cwd(),
    "public",
    "books",
    "kr",
    "voca"
  );

  const dataPath = join(basePath, level, `voca_${chapter}.json`);
  const indexPath = join(basePath, "index.json");

  const data = JSON.parse(await readFile(dataPath, "utf-8"));
  const index = JSON.parse(await readFile(indexPath, "utf-8"));
  const chapters = index.levels?.[level]?.chapters ?? [];

  return (
    <VocabularyViewer
      data={data}
      level={level}
      chapter={chapter}
      chapters={chapters}
    />
  );
}
