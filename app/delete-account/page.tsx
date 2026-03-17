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
    router.push("/");
  }

  return (
    <main style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>
        Delete Account
      </h1>

      <p style={{ marginTop: 12, fontSize: 14 }}>
        Deleting your account will permanently remove your access
        to all textbooks and coupons.
        <br />
        <strong>This action cannot be undone.</strong>
      </p>

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>

        <button
          onClick={handleDelete}
          disabled={loading}
          style={{
            padding: "10px 16px",
            background: "#dc2626",
            color: "#fff",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Deleting..." : "Delete my account"}
        </button>

        <button
          onClick={goHome}
          style={{
            padding: "10px 16px",
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}