"use client";

import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function TestPage() {
  const addTestData = async () => {
    try {
      await addDoc(collection(db, "test"), {
        message: "Hello Firebase!",
        createdAt: new Date(),
      });
      alert("성공적으로 Firestore에 저장되었습니다!");
    } catch (error) {
      console.error(error);
      alert("저장 실패! 콘솔을 확인하세요.");
    }
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Firebase 연결 테스트</h1>
      <button
        onClick={addTestData}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        테스트 데이터 저장하기
      </button>
    </main>
  );
}
