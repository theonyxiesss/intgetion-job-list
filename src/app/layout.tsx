import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/config/product";
import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_NAME,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
