"use client";

export default function CheckoutPage() {
  const startCheckout = async () => {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <main style={{ padding: 24 }}>
      <h2>결제 페이지</h2>
      <button onClick={startCheckout}>
        Stripe 결제하기
      </button>
    </main>
  );
}
