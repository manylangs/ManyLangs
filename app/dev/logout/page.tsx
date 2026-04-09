import { SignOutButton } from "@clerk/nextjs";

export default function DevLogoutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <SignOutButton redirectUrl="/">
        <button style={{ padding: 16, fontSize: 16 }}>
          Log out (dev)
        </button>
      </SignOutButton>
    </main>
  );
}
