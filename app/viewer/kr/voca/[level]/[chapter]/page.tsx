import { readFile } from "fs/promises";
import { join } from "path";
import VocabularyViewer from "@/app/viewer/renderers/VocabularyViewer";

type Props = {
  params: Promise<{
    level: string;
    chapter: string;
  }>;
};

const to3 = (v: string) => String(Number(v)).padStart(3, "0");

export default async function Page({ params }: Props) {
  const { level, chapter } = await params;
  const chapterId = to3(chapter);
  const target = "kr";

  const base = join(
    process.cwd(),
    "public",
    "books",
    target,
    "voca"
  );

  const index = JSON.parse(
    await readFile(join(base, "index.json"), "utf-8")
  );

  const chapters: string[] =
    Array.isArray(index?.levels?.[level]?.chapters)
      ? index.levels[level].chapters
      : [];

  const data = JSON.parse(
    await readFile(
      join(base, level, `voca_${chapterId}.json`),
      "utf-8"
    )
  );

  return (
    <VocabularyViewer
      level={level}
      chapter={chapterId}
      chapters={chapters}
      data={data}
    />
  );
}
