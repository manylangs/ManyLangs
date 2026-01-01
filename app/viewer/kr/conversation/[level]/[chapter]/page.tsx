import { readFile } from "fs/promises";
import { join } from "path";
import ConversationViewer from "@/app/viewer/renderers/ConversationViewer";

type PageProps = {
  params: Promise<{
    level: string;
    chapter: string;
  }>;
};

type IndexJson = {
  levels: {
    [level: string]: {
      chapters: string[];
    };
  };
};

type RuntimeConversation = {
  meta: {
    series: "conversation";
    level: string;
    id: string;
  };
  title: {
    target: string;
    en: string;
    es: string;
    fr: string;
    pt: string;
  };
  blocks: Array<{
    type?: "dialogue_set";
    set_id: string;
    lines: Array<{
      speaker: "A" | "B";
      sentences: {
        target: string;
        en: string;
        es: string;
        fr: string;
        pt: string;
      };
    }>;
  }>;
};

const to3 = (v: string) => String(Number(v)).padStart(3, "0");

async function loadJSON<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw);
}

export default async function Page({ params }: PageProps) {
  const { level, chapter } = await params;
  const chapterId = to3(chapter);

  // ✅ target 고정
  const target = "kr";

  const base = join(process.cwd(), "public", "books", target, "conversation");

  // ✅ index.json으로 chapters 로드
  const index = await loadJSON<IndexJson>(join(base, "index.json"));
  const chapters = index.levels[level]?.chapters ?? [];

  // ✅ runtime-only 로드 (여기가 핵심)
  const data = await loadJSON<RuntimeConversation>(
    join(base, level, `conversation_${chapterId}.runtime.json`)
  );

  return (
    <ConversationViewer
      target={target}
      level={level}
      chapter={chapterId}
      chapters={chapters}
      data={data}
    />
  );
}
