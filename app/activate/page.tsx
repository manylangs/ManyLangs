"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActivatePage() {
  const router = useRouter();

  const [book, setBook] = useState("grammar");
  const [level, setLevel] = useState("a1");

  function activate() {
    // ❌ legacy localStorage licensed/expiresAt 제거 (권한은 Firestore licenses만)
    // ✅ 활성화(쿠폰/라이선스)는 /select-books에서 처리되므로 그쪽으로 이동
    router.replace("/select-books");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Activate Coupon</h1>

      <div style={{ marginTop: 20 }}>
        <label>Textbook</label>
        <select value={book} onChange={(e) => setBook(e.target.value)}>
          <option value="grammar">Grammar</option>
          <option value="conversation">Conversation</option>
        </select>
      </div>

      <div style={{ marginTop: 20 }}>
        <label>Level</label>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="a1">A1</option>
          <option value="a2">A2</option>
          <option value="b1">B1</option>
        </select>
      </div>

      <button style={{ marginTop: 30, padding: "10px 20px" }} onClick={activate}>
        Activate
      </button>
    </main>
  );
}
