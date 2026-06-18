import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "RedeemLoop Protocol",
  description:
    "Open-source, non-issuing voucher payment protocol for Asset Binding, PaymentIntent, receipt confirmation, and commerce mark-as-paid.",
  openGraph: {
    title: "RedeemLoop Protocol",
    description:
      "A non-issuing voucher payment gateway for merchant-owned FT, NFT, Rune, and Inscription assets.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f4f2eb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
