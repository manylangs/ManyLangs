
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ViewerTargetProvider } from "@/app/viewer/context/ViewerTargetContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ManyLangs",
  applicationName: "ManyLangs",
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    title: "ManyLangs",
    statusBarStyle: "default",
  },

  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },

  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          {/* 🔥 GLOBAL STATE (REQUIRED) */}
          <ViewerTargetProvider>
            {children}
          </ViewerTargetProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}