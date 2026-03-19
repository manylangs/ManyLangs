import DemoConversationViewer from "@/app/demo/viewer/renderers/DemoConversationViewer";

export default async function Page({ params }) {
  const { slug = [] } = await params;

  const [lang, series, level, chapter] = slug;

  if (!lang || !series || !level || !chapter) {
    return <div>Invalid route</div>;
  }

  // ✅ conversation만 허용
  if (series !== "conversation") {
    return <div>404 Not Found</div>;
  }

  return (
    <DemoConversationViewer
      level={level}
      chapter={chapter}
    />
  );
}