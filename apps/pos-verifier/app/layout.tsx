import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "RedeemLoop Phase 0 Console",
  description: "Local Phase 0 console for Asset Binding, Voucher Tender, PaymentIntent, receipt confirmation, and mark-as-paid adapters.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
