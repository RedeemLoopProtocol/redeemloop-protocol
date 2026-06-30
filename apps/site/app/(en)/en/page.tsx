import type { Metadata } from "next";

import { OfficialSite } from "../../../src/OfficialSite";

export const metadata: Metadata = {
  title: "RedeemLoop Protocol",
  description:
    "Official website for RedeemLoop, the open-source voucher payment infrastructure for merchant-owned digital assets.",
};

export default function EnglishHome() {
  return <OfficialSite locale="en" />;
}
