"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function DeleteAccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!user) return;

    const ok = confirm(
      "Are you sure you want to delete your account?\nThis action cannot be undone."
    );

    if (!ok) return;

    setLoading(true);

    try {
      await user.delete();
      await signOut();
      router.replace("/login");
    } catch {
      alert("Failed to delete account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>
        Delete Account
      </h1>

      <p style={{ marginTop: 12, fontSize: 14 }}>
        Deleting your account will permanently remove your access
        to all textbooks and coupons.
        <br />
        <strong>This action cannot be undone.</strong>
      </p>

      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          marginTop: 24,
          padding: "10px 16px",
          background: "#dc2626",
          color: "#fff",
          borderRadius: 6,
        }}
      >
        {loading ? "Deleting..." : "Delete my account"}
      </button>
    </main>
  );
}
