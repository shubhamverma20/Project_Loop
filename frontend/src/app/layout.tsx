import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project LOOP - Customer Feedback & AI Analytics Platform",
  description: "Real-time customer feedback ingestion, AI classification, and analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
