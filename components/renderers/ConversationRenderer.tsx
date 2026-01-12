"use client";

import { playTTS } from "@/lib/playTTS";

type Props = {
  data: any;            // ✅ 필수
  lang?: string;
  level?: string;
  chapter?: string;
};

export default function ConversationRenderer({
  data,
  lang,
  level,
  chapter,
}: Props) {
  const dialogue = Array.isArray(data.dialogue) ? data.dialogue : [];
  const keyExpressions = Array.isArray(data.key_expressions)
    ? data.key_expressions
    : [];

  const audioSrc =
    lang && level && chapter
      ? `/audio/conversation/${lang}/${level}/conversation_${level}_${chapter}.wav`
      : null;

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        {data.title || "Conversation"}
      </h1>

      {audioSrc && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-2">전체 대화 듣기</h2>
          <audio
            controls
            preload="metadata"
            src={audioSrc}
            onError={() =>
              console.error("Conversation audio load failed:", audioSrc)
            }
          />
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">대화</h2>
        <ul className="space-y-4">
          {dialogue.map((line: any, idx: number) => (
            <li key={idx} className="border p-4 rounded bg-gray-100">
              <div className="font-bold mb-1">
                {line.role}: {line.target}
              </div>
              <div className="text-gray-600">{line.learning}</div>

              {line.tts && (
                <button
                  onClick={() => playTTS(line.tts)}
                  className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded"
                >
                  🔊 문장 듣기
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Key Expressions</h2>
        <ul className="space-y-3">
          {keyExpressions.map((exp: any, idx: number) => (
            <li key={idx} className="border p-3 rounded bg-gray-50">
              <div className="font-bold">{exp.target}</div>
              <div className="text-gray-600">{exp.learning}</div>

              {exp.tts && (
                <button
                  onClick={() => playTTS(exp.tts)}
                  className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded"
                >
                  🔊 듣기
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
