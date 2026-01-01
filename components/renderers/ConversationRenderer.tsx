"use client";

import { playTTS } from "@/lib/playTTS";

export default function ConversationRenderer({ data }) {
  // 안전 처리
  const dialogue = Array.isArray(data.dialogue) ? data.dialogue : [];
  const keyExpressions = Array.isArray(data.key_expressions) ? data.key_expressions : [];

  return (
    <main className="p-6">
      {/* 제목 */}
      <h1 className="text-3xl font-bold mb-8">{data.title || "Conversation"}</h1>

      {/* 대화 */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">대화</h2>

        <ul className="space-y-4">
          {dialogue.map((line, idx) => (
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
                  🔊 듣기
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Key Expressions */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Key Expressions</h2>

        <ul className="space-y-3">
          {keyExpressions.map((exp, idx) => (
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
