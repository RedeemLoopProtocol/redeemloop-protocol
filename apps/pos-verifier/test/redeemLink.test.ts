import { describe, expect, it } from "vitest";

import { createRedeemLink, shortenHash } from "../src/redeemLink";

describe("redeemLink", () => {
  it("creates a deep link without private customer data", () => {
    const link = createRedeemLink(
      {
        user: "0x0000000000000000000000000000000000000abc",
        voucherToken: "0x0000000000000000000000000000000000000def",
        tokenId: "0",
        amount: "1",
        merchantId: "0x3d8c86f0107a3f98de7cf6665ed67a78535161b3f4c5d5c68b6a917c98f7202a",
        storeId: "0x2d8c86f0107a3f98de7cf6665ed67a78535161b3f4c5d5c68b6a917c98f7202a",
        terminalId: "0x1d8c86f0107a3f98de7cf6665ed67a78535161b3f4c5d5c68b6a917c98f7202a",
        termsHash: "0x4d8c86f0107a3f98de7cf6665ed67a78535161b3f4c5d5c68b6a917c98f7202a",
        redemptionMode: 1,
        nonce: "42",
        deadline: "1893456000",
      },
      31337,
    );

    expect(link).toContain("redeemloop://redeem?");
    expect(link).toContain("chainId=31337");
    expect(link).toContain("amount=1");
    expect(link).toContain("nonce=42");
    expect(link).not.toContain("user=");
  });

  it("shortens hashes for fixed-width UI", () => {
    expect(shortenHash("0x1234567890abcdef", 4)).toBe("0x1234...cdef");
  });
});
