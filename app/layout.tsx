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
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider
      publishableKey={clerkKey!}
      signInForceRedirectUrl="/select-books"
      signUpForceRedirectUrl="/select-books"
    >
      <html lang="en">
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