import { readFile } from "fs/promises";
import { join } from "path";
import RealViewer from "@/app/viewer/renderers/RealViewer";
import ViewerGuard from "@/app/viewer/ViewerGuard";

const to3 = (v: string) => String(Number(v)).padStart(3, "0");

export default async function Page({ params }: any) {
  const { level, chapter } = await params; // ⭐ 반드시 await

  if (!level || !chapter) {
    throw new Error("Missing level or chapter");
  }

  const chapterId = to3(chapter);

  const dataPath = join(
    process.cwd(),
    "public",
    "books",
    "kr",
    "real",
    level,
    `real_${chapterId}.json`
  );

  const data = JSON.parse(await readFile(dataPath, "utf-8"));

  return (
    <ViewerGuard>
      <RealViewer
        level={level}
        chapter={chapterId}
        data={data}
      />
    </ViewerGuard>
  );
}
