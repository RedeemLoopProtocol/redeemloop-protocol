import type { Metadata, Viewport } from "next";

import "../globals.css";

export const metadata: Metadata = {
  title: "RedeemLoop Protocol | 兑环协议",
  description: "RedeemLoop 官方网站，面向商户自有数字提货资产的开源提货券支付基础设施。",
  openGraph: {
    title: "RedeemLoop Protocol | 兑环协议",
    description: "让商户自有数字提货券可以收款、确认收券，并自动标记电商订单已支付。",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f3f6f9",
};

export default function ChineseRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
