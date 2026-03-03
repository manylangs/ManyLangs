"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActivatePage() {
  const router = useRouter();

  const [lang, setLang] = useState("kr");
  const [book, setBook] = useState("grammar");
  const [level, setLevel] = useState("a1");

  function activate() {
    localStorage.setItem("licensed", "true");
    localStorage.setItem(
      "expiresAt",
      (Date.now() + 1000 * 60 * 60 * 24 * 180).toString()
    );

    router.replace(`/viewer/${lang}/${book}/${level}/001`);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Activate Coupon</h1>

      {/* Language */}
      <div style={{ marginTop: 20 }}>
        <label>Language</label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="kr">Korean</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>

      {/* Textbook */}
      <div style={{ marginTop: 20 }}>
        <label>Textbook</label>
        <select
          value={book}
          onChange={(e) => setBook(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="grammar">Grammar</option>
          <option value="conversation">Conversation</option>
          <option value="real">Real</option>
          <option value="voca">Vocabulary</option>
          <option value="idiom">Idiom</option>
        </select>
      </div>

      {/* Level */}
      <div style={{ marginTop: 20 }}>
        <label>Level</label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="a1">A1</option>
          <option value="a2">A2</option>
          <option value="b1">B1</option>
          <option value="b2">B2</option>
          <option value="c1">C1</option>
          <option value="c2">C2</option>
        </select>
      </div>

      <button
        style={{ marginTop: 30, padding: "10px 20px" }}
        onClick={activate}
      >
        Activate
      </button>
    </main>
  );
}