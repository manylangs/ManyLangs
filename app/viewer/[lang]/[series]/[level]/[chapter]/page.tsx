import { readFile } from "fs/promises";
import { join } from "path";
import IdiomViewer from "@/app/viewer/renderers/IdiomViewer";
import RealViewer from "@/app/viewer/renderers/RealViewer";
import GrammarViewer from "@/app/viewer/renderers/GrammarViewer";
import ViewerGuard from "@/app/viewer/ViewerGuard";
import VocabularyViewer from "@/app/viewer/renderers/VocabularyViewer";
import ConversationViewer from "@/app/viewer/renderers/ConversationViewer";

const to3 = (v: string) => String(Number(v)).padStart(3, "0");

export default async function Page({
  params,
}: {
  params: Promise<{
    lang: string;
    series: string;
    level: string;
    chapter: string;
  }>;
}) {
  const { lang, series, level, chapter } = await params;

  const chapterId = to3(chapter);

  const base = join(process.cwd(), "public", "books", lang, series);

  // index 안전 로딩
  let index: any = {};
  try {
    index = JSON.parse(
      await readFile(join(base, "index.json"), "utf-8")
    );
  } catch {
    index = {};
  }

  const chapters = index.levels?.[level]?.chapters ?? [];

  // data 안전 로딩
  let data: any = {};
  try {
    data = JSON.parse(
      await readFile(join(base, level, `${series}_${chapterId}.json`), "utf-8")
    );
  } catch {
    data = {};
  }

  return (
    <ViewerGuard>
      {/* VOCABULARY */}
      {series === "voca" && (
        <VocabularyViewer
          lang={lang}
          level={level}
          chapter={chapterId}
          chapters={chapters}
          data={data}
        />
      )}

      {/* CONVERSATION (구조 변환 포함) */}
      {series === "conversation" && (
        <ConversationViewer
          lang={lang}
          level={level}
          chapter={chapterId}
        />
      )}

      {/* REAL (manifest 기반 독립 구조) */}
      {/* REAL (manifest 기반 독립 구조) */}
      {series === "real" && (
        <RealViewer
          lang={lang}
          level={level}
          chapter={chapterId}
        />
      )}
      {/* GRAMMAR */}
      {series === "grammar" && (
        <GrammarViewer
          lang={lang}
          level={level}
          chapter={chapterId}
        />
      )}
      {series === "idiom" && (
        <IdiomViewer
          lang={lang}
          level={level}
          chapter={chapterId}
          chapters={chapters}
          data={data}
        />
      )}
    </ViewerGuard>
  );
}