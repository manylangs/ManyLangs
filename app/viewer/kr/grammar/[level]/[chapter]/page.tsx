import { readFile } from "fs/promises";
import { join } from "path";
import GrammarViewer from "../../../../renderers/GrammarViewer";

type Props = {
  params: Promise<{
    level: string;
    chapter: string;
  }>;
};

export default async function Page({ params }: Props) {
  // ✅ Next 16: params는 Promise
  const { level, chapter } = await params;

  if (!level || !chapter) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Invalid route</h2>
        <p>level or chapter is missing</p>
      </div>
    );
  }

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

  const grammarData = JSON.parse(
    await readFile(grammarPath, "utf-8")
  );

  const indexData = JSON.parse(
    await readFile(indexPath, "utf-8")
  );

  const chapters: string[] =
    indexData.levels?.[level]?.chapters ?? [];

  return (
    <GrammarViewer
      grammarData={grammarData}
      level={level}
      chapter={chapter}
      chapters={chapters}
    />
  );
}
