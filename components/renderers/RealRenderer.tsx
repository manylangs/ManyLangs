"use client";

import { playTTS } from "@/lib/playTTS";

export default function RealRenderer({ data }) {
  // ⚠️ 목표언어/학습언어는 Web/App 전역 설정에서 가져옴
  // 여기서는 테스트용 기본값만 넣어둠
  const targetLang = "kr";      // 사용자가 설정한 목표언어
  const learningLang = "en";    // 사용자가 설정한 학습언어

  // content 배열에서 필요한 블록 추출
  const content = Array.isArray(data.content) ? data.content : [];
  
  // 이미지 블록 찾기
  const imageBlock = content.find(block => block.type === "image");
  
  // 목표언어와 학습언어의 description 블록 찾기
  const targetBlock = content.find(
    block => block.type === "description" && block.lang === targetLang
  );
  const learningBlock = content.find(
    block => block.type === "description" && block.lang === learningLang
  );

  // TTS 가져오기
  const targetTTS = data.tts?.[targetLang];

  return (
    <main className="p-6">
      {/* 제목 */}
      {data.topic && (
        <h1 className="text-3xl font-bold mb-6">{data.topic}</h1>
      )}

      {/* 이미지 블록 */}
      {imageBlock && (
        <div className="mb-6">
          <img
            src={`/books/real/${data.level}/${imageBlock.src}`}
            alt={data.topic || "REAL Scene"}
            className="rounded max-w-full"
          />
        </div>
      )}

      {/* 목표언어 문장 + TTS */}
      {targetBlock && (
        <div className="mb-6 p-4 rounded bg-gray-100 border">
          <div className="text-sm text-gray-600 mb-2 font-semibold">
            목표언어 ({targetLang.toUpperCase()})
          </div>
          <div className="space-y-2">
            {targetBlock.sentences.map((sentence, idx) => (
              <div key={idx} className="text-lg">
                {sentence}
              </div>
            ))}
          </div>

          {/* 🔊 목표언어만 재생 버튼 표시 */}
          {targetTTS && Array.isArray(targetTTS) && targetTTS.length > 0 && (
            <button
              onClick={() => playTTS(targetTTS)}
              className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              🔊 듣기
            </button>
          )}
        </div>
      )}

      {/* 학습언어 문장 */}
      {learningBlock && (
        <div className="p-4 rounded bg-gray-50 border">
          <div className="text-sm text-gray-600 mb-2 font-semibold">
            학습언어 ({learningLang.toUpperCase()})
          </div>
          <div className="space-y-2">
            {learningBlock.sentences.map((sentence, idx) => (
              <div key={idx} className="text-gray-700">
                {sentence}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 키워드 */}
      {data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm text-gray-600 mb-2 font-semibold">Keywords</div>
          <div className="flex flex-wrap gap-2">
            {data.keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
