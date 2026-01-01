import { readFile } from "fs/promises";
import { join } from "path";
import RealViewer from "@/app/viewer/renderers/RealViewer";

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

  const dataPath = join(
    process.cwd(),
    "public",
    "books",
    "real",
    level,
    `real_${chapterId}.json`
  );

  const data = JSON.parse(await readFile(dataPath, "utf-8"));

  return (
    <RealViewer
      level={level}
      chapter={chapterId}
      data={data}
    />
  );
}
