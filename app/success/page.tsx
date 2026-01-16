export default function SuccessPage() {
  return (
    <main style={{ padding: 40, textAlign: "center" }}>
      <h1>Payment Successful ✅</h1>

      <p style={{ marginTop: 16, lineHeight: 1.6 }}>
        <strong>Your payment was successful.</strong><br />
        Your coupon(s) are now available in <strong>My Coupons</strong>.<br />
        Enter a coupon code when selecting a textbook to activate your access.
      </p>

      <div style={{ marginTop: 24 }}>
        <a href="/account/coupons">
          👉 Go to My Coupons
        </a>
      </div>
    </main>
  );
}