"use client";

import { playTTS } from "@/lib/playTTS";

export default function GrammarRenderer({ data }) {
  // 안전 처리 (배열이 아닐 때 대비)
  const explanations = Array.isArray(data.explanations) ? data.explanations : [];
  const examples = Array.isArray(data.examples) ? data.examples : [];
  const quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];

  return (
    <main className="p-6">
      {/* 제목 */}
      <h1 className="text-3xl font-bold mb-6">{data.title || "Untitled Chapter"}</h1>

      {/* 설명 10개 */}
      <h2 className="text-xl font-semibold mb-3">설명</h2>
      <ul className="space-y-2 mb-8">
        {explanations.map((e: string, idx: number) => (
          <li key={idx} className="border p-3 rounded bg-gray-100">
            {e}
          </li>
        ))}
      </ul>

      {/* 예문 */}
      <h2 className="text-xl font-semibold mb-3">예문</h2>
      <ul className="space-y-3 mb-8">
        {examples.map((ex, idx) => (
          <li key={idx} className="border p-4 rounded">
            <div className="font-bold">{ex.target}</div>
            <div className="text-gray-600">{ex.learning}</div>

            {ex.tts && (
              <button
                onClick={() => playTTS(ex.tts)}
                className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded"
              >
                🔊 듣기
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* 퀴즈 */}
      <h2 className="text-xl font-semibold mb-3">퀴즈</h2>
      <ul className="space-y-2">
        {quizzes.map((q: string, idx: number) => (
          <li key={idx} className="border p-3 rounded bg-gray-50">
            {q}
          </li>
        ))}
      </ul>
    </main>
  );
}
