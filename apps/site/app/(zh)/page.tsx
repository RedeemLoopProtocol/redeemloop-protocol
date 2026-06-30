import type { Metadata } from "next";

import { OfficialSite } from "../../src/OfficialSite";

export const metadata: Metadata = {
  title: "RedeemLoop Protocol | 兑环协议",
  description: "RedeemLoop 官方网站，面向商户自有数字提货资产的开源提货券支付基础设施。",
};

export default function Home() {
  return <OfficialSite locale="zh" />;
}
