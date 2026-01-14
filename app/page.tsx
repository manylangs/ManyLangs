import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>ManyLangs</h1>

      <ul style={{ marginTop: 20 }}>
        <li>
          <Link href="/login">로그인</Link>
        </li>
        <li>
          <Link href="/signup">회원가입</Link>
        </li>
      </ul>
    </main>
  );
}
