import "./globals.css";
import { Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ViewerTargetProvider } from "@/app/viewer/context/ViewerTargetContext";
import IOSAuthBridge from "@/components/IOSAuthBridge";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider
      publishableKey={clerkKey!}
      signInForceRedirectUrl="/select-books"
      signUpForceRedirectUrl="/select-books"
    >
      <html lang="en">

        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
window.onNativeMessage = async function (data) {

  console.log("🔥 FROM IOS:", data);

  try {

    if (data?.type === "IAP_SUCCESS") {

      console.log("💰 PURCHASE RECEIVED");

      console.log(
        "🔥 VERIFY PAYLOAD:",
        data
      );

      const res = await fetch(
        "/api/iap/apple/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productId:
              data.payload.productId,
            transactionId:
              data.payload.transactionId
          })
        }
      );

      const result = await res.json();

      console.log(
        "🍎 VERIFY RESULT:",
        result
      );
    }

  } catch (error) {

    console.error(
      "❌ PURCHASE VERIFY ERROR",
      error
    );
  }
}
  `
            }}
          />
        </head>

        <body>
          <ViewerTargetProvider>
            <IOSAuthBridge />
            {children}
          </ViewerTargetProvider>
        </body>

      </html>
    </ClerkProvider>
  );
}