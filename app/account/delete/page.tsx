"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function DeleteAccountPage() {
  const { user } = useUser();
  const router = useRouter();

  async function handleDelete() {
    if (!user) return;

    const ok = confirm(
      "Are you sure?\nThis action is permanent and cannot be undone."
    );
    if (!ok) return;

    await user.delete();
    router.replace("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <section
        style={{
          maxWidth: 420,
          width: "100%",
          padding: 24,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>
          Delete Account
        </h1>

        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
          This action is permanent and cannot be undone.
          <br />
          All your access to textbooks and licenses will be removed.
        </p>

        <p
          style={{
            fontSize: 13,
            color: "#c00",
            marginBottom: 20,
          }}
        >
          ⚠️ Please be careful
        </p>

        <button
          onClick={handleDelete}
          style={{
            width: "100%",
            padding: "10px 16px",
            fontSize: 14,
            borderRadius: 6,
            border: "1px solid #f00",
            background: "#fff",
            color: "#f00",
            cursor: "pointer",
          }}
        >
          Delete my account
        </button>
      </section>
    </main>
  );
}
