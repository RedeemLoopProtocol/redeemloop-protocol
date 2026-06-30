import type { Metadata, Viewport } from "next";

import "../globals.css";

export const metadata: Metadata = {
  title: "RedeemLoop Protocol",
  description:
    "Official website for RedeemLoop, the open-source voucher payment infrastructure for merchant-owned digital assets.",
  openGraph: {
    title: "RedeemLoop Protocol",
    description:
      "Accept merchant-owned digital vouchers as payment, confirm receipt, and mark commerce orders paid.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f3f6f9",
};

export default function EnglishRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
