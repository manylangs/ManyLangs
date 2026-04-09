import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <section style={{ maxWidth: 480, width: "100%", padding: 24 }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>ManyLangs</h1>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 24,
            whiteSpace: "nowrap",
          }}
        >
          Learn languages through structured textbooks.
          <br />
          Grammar · Conversation · Vocabulary · Pronunciation · Idioms
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login">
            <button type="button" style={btnPrimary}>
              Log in
            </button>
          </Link>

          <Link href="/signup">
            <button type="button" style={btnSecondary}>
              Sign up
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}

const btnPrimary = {
  padding: "10px 16px",
  fontSize: 14,
  borderRadius: 6,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const btnSecondary = {
  padding: "10px 16px",
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};
