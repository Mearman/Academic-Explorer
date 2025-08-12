import type { Metadata } from "next";
import "./globals.css.ts";

export const metadata: Metadata = {
  title: "Academic Explorer",
  description: "Explore academic research and literature",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
