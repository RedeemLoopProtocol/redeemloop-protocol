import { describe, expect, it } from "vitest";

import { assertTransition, canTransition, isTerminalPaymentIntentStatus, transitionPaymentIntent } from "../src/index.js";
import type { RedeemLoopPaymentIntent } from "../src/types.js";

const baseIntent: RedeemLoopPaymentIntent = {
  intentId: "pi_test",
  bindingId: "bind_test",
  merchantId: "merchant_test",
  channel: "checkout",
  orderId: "order_1",
  skuLines: [{ sku: "coffee", quantity: 1 }],
  acceptedAssets: [
    {
      chainNamespace: "eip155",
      chainId: 8453,
      assetType: "erc20",
      assetId: "eip155:8453/erc20:0x0000000000000000000000000000000000000001",
      contract: "0x0000000000000000000000000000000000000001",
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

describe("PaymentIntent state machine", () => {
  it("allows the v0.2 voucher tender happy path", () => {
    expect(canTransition("created", "wallet_connected")).toBe(true);
    expect(canTransition("wallet_connected", "asset_selected")).toBe(true);
    expect(canTransition("asset_selected", "transfer_requested")).toBe(true);
    expect(canTransition("transfer_requested", "broadcasted")).toBe(true);
    expect(canTransition("broadcasted", "seen")).toBe(true);
    expect(canTransition("seen", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "paid")).toBe(true);
  });

  it("keeps paid intents terminal", () => {
    expect(isTerminalPaymentIntentStatus("paid")).toBe(true);
    expect(() => assertTransition("paid", "manual_review")).toThrow("paid -> manual_review");
  });

  it("returns an updated immutable intent", () => {
    const next = transitionPaymentIntent(baseIntent, "wallet_connected", new Date("2026-06-17T01:00:00.000Z"));
    expect(next.status).toBe("wallet_connected");
    expect(next.updatedAt).toBe("2026-06-17T01:00:00.000Z");
    expect(baseIntent.status).toBe("created");
  });
});
