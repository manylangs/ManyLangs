import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ManyLangs",
  description: "ManyLangs Viewer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="kr">
      <body>{children}</body>
    </html>
  );
}
