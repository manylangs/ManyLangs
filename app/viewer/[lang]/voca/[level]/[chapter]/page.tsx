import { readFile } from "fs/promises";
import { join } from "path";
import VocabularyViewer from "@/app/viewer/renderers/VocabularyViewer";
import ViewerGuard from "@/app/viewer/ViewerGuard";

const to3 = (v: string) => String(Number(v)).padStart(3, "0");

export default async function Page({ params }: any) {
  const { level, chapter } = await params;
  const chapterId = to3(chapter);

  const base = join(process.cwd(), "public", "books", "kr", "voca");
  const index = JSON.parse(await readFile(join(base, "index.json"), "utf-8"));
  const chapters = index.levels?.[level]?.chapters ?? [];

  const data = JSON.parse(
    await readFile(join(base, level, `voca_${chapterId}.json`), "utf-8")
  );

  return (
    <ViewerGuard>
      <VocabularyViewer
        level={level}
        chapter={chapterId}
        chapters={chapters}
        data={data}
      />
    </ViewerGuard>
  );
}
