import { describe, expect, it } from "vitest";

import { createPaymentLink, shortenHash } from "../src/redeemLink";
import type { PaymentIntentResponse } from "../src/types";

describe("paymentLink", () => {
  it("creates a PaymentIntent deep link without private customer data", () => {
    const intent: PaymentIntentResponse = {
      intentId: "pi_123",
      bindingId: "bind_123",
      merchantId: "merchant_123",
      storeId: "store_1",
      channel: "checkout",
      orderId: "order_42",
      skuLines: [{ sku: "coffee", quantity: 1 }],
      acceptedAssets: [
        {
          chainNamespace: "eip155",
          chainId: 31337,
          assetType: "erc20",
          assetId: "eip155:31337/erc20:0x0000000000000000000000000000000000000def",
          contract: "0x0000000000000000000000000000000000000def",
          requiredAmount: "1",
          termsHash: "terms",
        },
      ],
      merchantVault: "0x0000000000000000000000000000000000000abc",
      settlementPolicy: "collect",
      status: "created",
      expiresAt: "2027-01-01T00:00:00.000Z",
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:00:00.000Z",
    };

    const link = createPaymentLink(intent);

    expect(link).toContain("redeemloop://pay?");
    expect(link).toContain("intentId=pi_123");
    expect(link).toContain("bindingId=bind_123");
    expect(link).toContain("orderId=order_42");
    expect(link).not.toContain("payer");
  });

  it("shortens hashes for fixed-width UI", () => {
    expect(shortenHash("0x1234567890abcdef", 4)).toBe("0x1234...cdef");
  });
});
