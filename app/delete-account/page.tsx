"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

export default function DeleteAccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut, redirectToSignIn } = useClerk();
  const router = useRouter();
  const params = useSearchParams();

  const [loading, setLoading] = useState(false);

  const confirmDelete = params.get("confirm");

  async function deleteAccount() {
    if (!user) return;

    try {
      await user.delete();
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error(err);
      alert("Failed to delete account.");
      setLoading(false);
    }
  }

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
      router.replace("/");
    } catch (err: any) {

      const code = err?.errors?.[0]?.code;

      if (code === "session_reverification_required") {
        redirectToSignIn({
          afterSignInUrl: "/delete-account?confirm=true",
        });
        return;
      }

      console.error(err);
      alert("Failed to delete account.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) return;

    if (confirmDelete === "true") {
      deleteAccount();
    }
  }, [isLoaded, user, confirmDelete]);

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