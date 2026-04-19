import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP",
  description: "ERP on Vercel + Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
