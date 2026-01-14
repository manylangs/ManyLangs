import { readFile } from "fs/promises";
import { join } from "path";
import GrammarViewer from "../../../../renderers/GrammarViewer";
import ViewerGuard from "@/app/viewer/ViewerGuard";

export default async function Page({ params }: any) {
  const { level, chapter } = await params;

  const grammarPath = join(
    process.cwd(),
    "public",
    "books",
    "kr",
    "grammar",
    level,
    `grammar_${chapter}.runtime.json`
  );

  const indexPath = join(
    process.cwd(),
    "public",
    "books",
    "kr",
    "grammar",
    "index.json"
  );

  const grammarData = JSON.parse(await readFile(grammarPath, "utf-8"));
  const indexData = JSON.parse(await readFile(indexPath, "utf-8"));
  const chapters = indexData.levels?.[level]?.chapters ?? [];

  return (
    <ViewerGuard>
      <GrammarViewer
        grammarData={grammarData}
        level={level}
        chapter={chapter}
        chapters={chapters}
      />
    </ViewerGuard>
  );
}
