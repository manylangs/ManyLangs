import "./globals.css";
import { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ViewerTargetProvider } from "@/app/viewer/context/ViewerTargetContext";

export const viewport: Viewport = {
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
            {children}
          </ViewerTargetProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}