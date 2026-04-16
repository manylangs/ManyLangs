import type { VerifyPaymentPayload } from "./types";

export async function verifyPayment(payload: VerifyPaymentPayload) {
  const res = await fetch("/api/payment/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Payment verification failed");
  }

  return res.json();
}
