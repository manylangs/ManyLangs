import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

// 🔥 최종 metadata (이름 + 아이콘 + fullscreen + viewport)
export const metadata = {
  title: "ManyLangs",
  applicationName: "ManyLangs",
  manifest: "/manifest.json",

  // ✅ iOS 홈화면 앱 모드
  appleWebApp: {
    capable: true,
    title: "ManyLangs",
    statusBarStyle: "default",
  },

  // ✅ 아이콘
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },

  // ✅ viewport (앱처럼 보이게)
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
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}