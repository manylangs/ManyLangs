import { readFile } from "fs/promises";
import { join } from "path";
import ConversationViewer from "@/app/viewer/renderers/ConversationViewer";
import ViewerGuard from "@/app/viewer/ViewerGuard";

const to3 = (v: string) => String(Number(v)).padStart(3, "0");

async function loadJSON<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw);
}

export default async function Page({ params }: any) {
  const { level, chapter } = await params;
  const chapterId = to3(chapter);

  const base = join(
    process.cwd(),
    "public",
    "books",
    "kr",
    "conversation"
  );

  const index = await loadJSON<any>(join(base, "index.json"));
  const chapters = index.levels?.[level]?.chapters ?? [];

  const data = await loadJSON<any>(
    join(base, level, `conversation_${chapterId}.runtime.json`)
  );

  return (
    <ViewerGuard>
      <ConversationViewer
        level={level}
        chapter={chapterId}
        chapters={chapters}
        data={data}
      />
    </ViewerGuard>
  );
}
