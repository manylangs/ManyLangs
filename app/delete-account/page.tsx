"use client";

import { useState } from "react";
import { useUser, useClerk, useReverification } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function DeleteAccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const performDelete = useReverification(async () => {
    if (!user) throw new Error("No user");

    await user.delete();
    await signOut();
    router.replace("/");
  });

  async function handleDelete() {
    if (!user) return;

    const ok = confirm(
      "Are you sure you want to delete your account?\nThis action cannot be undone."
    );

    if (!ok) return;

    setLoading(true);

    try {
      await performDelete();
    } catch (err) {
      console.error(err);
      alert("Failed to delete account.");
      setLoading(false);
    }
  }

  function goHome() {
    router.push("/select-books");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 32,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Delete Account
        </h1>

        <p
          style={{
            marginTop: 16,
            fontSize: 14,
            color: "#555",
            lineHeight: 1.6,
          }}
        >
          Deleting your account will permanently remove your access
          to all textbooks and coupons.
          <br />
          <strong style={{ color: "#111" }}>
            This action cannot be undone.
          </strong>
        </p>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "#dc2626",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {loading ? "Deleting..." : "Delete my account"}
          </button>

          <button
            onClick={goHome}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Back to My Library
          </button>
        </div>
      </div>
    </main>
  );
}