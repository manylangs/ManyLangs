"use client";

import { playTTS } from "@/lib/playTTS";

export default function VocaRenderer({ data }) {
  // 안전 처리
  const words = Array.isArray(data.words) ? data.words : [];

  return (
    <main className="p-6">
      {/* 제목 */}
      <h1 className="text-3xl font-bold mb-8">{data.title || "Vocabulary"}</h1>

      <ul className="space-y-6">
        {words.map((word, idx) => {
          const examples = Array.isArray(word.examples) ? word.examples : [];

          return (
            <li key={idx} className="border p-5 rounded bg-gray-50">
              {/* 단어 */}
              <div className="text-xl font-bold">{word.target}</div>
              <div className="text-gray-600">{word.learning}</div>

              {/* 단어 TTS */}
              {word.tts && (
                <button
                  onClick={() => playTTS(word.tts)}
                  className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded"
                >
                  🔊 듣기
                </button>
              )}

              {/* 예문 */}
              <ul className="mt-4 space-y-3">
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
