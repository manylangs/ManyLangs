"use client";

import { playTTS } from "@/lib/playTTS";

export default function IdiomRenderer({ data }) {
  // 안전 처리
  const idioms = Array.isArray(data.idioms) ? data.idioms : [];

  return (
    <main className="p-6">
      {/* 제목 */}
      <h1 className="text-3xl font-bold mb-8">{data.title || "Idioms"}</h1>

      {/* 각 idiom 출력 */}
      <ul className="space-y-8">
        {idioms.map((idiom, idx) => {
          const examples = Array.isArray(idiom.examples) ? idiom.examples : [];

          return (
            <li key={idx} className="border p-5 rounded bg-gray-50">
              {/* Idiom 제목 */}
              <h2 className="text-xl font-bold mb-2">{idiom.target}</h2>

              {/* Idiom 설명 */}
              <div className="text-gray-700 mb-4">{idiom.learning}</div>

              {/* 예문 5개 */}
              <ul className="space-y-3">
                {examples.map((ex, i) => (
                  <li key={i} className="border p-3 rounded bg-white">
                    <div className="font-semibold">{ex.target}</div>
                    <div className="text-gray-500 text-sm">{ex.learning}</div>

                    {ex.tts && (
                      <button
                        onClick={() => playTTS(ex.tts)}
                        className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        🔊 듣기
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
