import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Stirling Lead Finder",
  description: "Lead discovery and outreach workflow for Stirling QR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
