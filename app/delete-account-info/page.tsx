export default function DeleteAccountInfoPage() {
  return (
    <main style={{ padding: 40, maxWidth: 600, margin: "0 auto" }}>
      <h1>Delete your account</h1>

      <p style={{ marginTop: 16 }}>
        You can delete your account at any time using the app.
      </p>

      <ol style={{ marginTop: 16 }}>
        <li>Log in to your account</li>
        <li>Go to Settings</li>
        <li>Select "Delete account"</li>
      </ol>

      <p style={{ marginTop: 16 }}>
        If you cannot access your account, please contact:
      </p>

      <p>
        📧 manylangs.help@gmail.com
      </p>

      <p style={{ marginTop: 24, color: "#666", fontSize: 14 }}>
        All data will be permanently deleted and cannot be recovered.
      </p>
    </main>
  );
}
