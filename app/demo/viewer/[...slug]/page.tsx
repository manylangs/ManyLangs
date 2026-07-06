import DemoConversationViewer from "@/app/demo/viewer/renderers/DemoConversationViewer";
import DemoGrammarViewer from "@/app/demo/viewer/renderers/DemoGrammarViewer";
import DemoIdiomViewer from "@/app/demo/viewer/renderers/DemoIdiomViewer";
import DemoRealViewer from "@/app/demo/viewer/renderers/DemoRealViewer";
import DemoVocaViewer from "@/app/demo/viewer/renderers/DemoVocaViewer";

export default async function Page({ params }) {
  const { slug = [] } = await params;

  const [lang, series, level, chapter] = slug;

  if (!lang || !series || !level || !chapter) {
    return <div>Invalid route</div>;
  }

  // ✅ conversation
  if (series === "conversation") {
    return (
      <DemoConversationViewer
        targetLang={lang}
        level={level}
        chapter={chapter}
      />
    );
  }

  // ✅ grammar
  if (series === "grammar") {
    return (
      <DemoGrammarViewer
        targetLang={lang}
        level={level}
        chapter={chapter}
      />
    );
  }

  // ✅ idiom
  if (series === "idiom") {
    return (
      <DemoIdiomViewer
        targetLang={lang}
        level={level}
        chapter={chapter}
      />
    );
  }

  // ✅ real
  if (series === "real") {
    return (
      <DemoRealViewer
        targetLang={lang}
        level={level}
        chapter={chapter}
      />
    );
  }

  // ✅ voca
  if (series === "voca") {
    return (
      <DemoVocaViewer
        targetLang={lang}
        level={level}
        chapter={chapter}
      />
    );
  }

  return <div>404 Not Found</div>;
}