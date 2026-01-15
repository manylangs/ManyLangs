"use client";

type Props = {
  expiresAt?: number;
};

export default function LicenseHeader({ expiresAt }: Props) {
  if (!expiresAt) return null;

  const now = Date.now();
  const diffMs = expiresAt - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return (
    <div
      style={{
        padding: "8px 16px",
        background: "#111",
        color: "#fff",
        fontSize: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>
        License valid until{" "}
        <strong>{new Date(expiresAt).toLocaleDateString()}</strong>
      </span>
      <span>
        {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
      </span>
    </div>
  );
}
