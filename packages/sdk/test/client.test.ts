import { afterEach, describe, expect, it, vi } from "vitest";

import { RedeemLoopClient } from "../src/index.js";

describe("RedeemLoopClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates PaymentIntents through the v0.2 API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ intentId: "pi_test", status: "created" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = new RedeemLoopClient("https://api.example.test/", "secret");
    await expect(client.createPaymentIntent({ bindingId: "bind_test", orderId: "order_1" })).resolves.toMatchObject({
      intentId: "pi_test",
      status: "created",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/payment-intents",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("covers the merchant embed payment flow endpoints", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true, intentId: "pi_test", status: "transfer_requested" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const client = new RedeemLoopClient("https://api.example.test", "secret");
    await client.createMerchant({ merchantId: "merchant_cafe", name: "Merchant Cafe" });
    await client.createMerchantVault({
      merchantId: "merchant_cafe",
      chainNamespace: "eip155",
      chainId: 31337,
      address: "0x0000000000000000000000000000000000000abc",
    });
    await client.listMerchantVaults({ merchantId: "merchant_cafe" });
    await client.connectWallet("pi_test", { payerAddress: "0x0000000000000000000000000000000000000123" });
    await client.checkBalance("pi_test", {
      payerAddress: "0x0000000000000000000000000000000000000123",
      balance: "1",
    });
    await client.requestTransfer("pi_test", {
      payerAddress: "0x0000000000000000000000000000000000000123",
    });
    await client.markBroadcasted("pi_test", { txid: "0x1234" });
    await client.submitSettlementProof({
      intentId: "pi_test",
      txid: "0x1234",
      from: "0x0000000000000000000000000000000000000123",
      status: "confirmed",
    });
    await client.createWebhookEndpoint({
      merchantId: "merchant_cafe",
      url: "https://merchant.example/redeemloop",
    });

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.example.test/v1/merchants",
      "https://api.example.test/v1/merchant-vaults",
      "https://api.example.test/v1/merchant-vaults?merchantId=merchant_cafe",
      "https://api.example.test/v1/payment-intents/pi_test/connect-wallet",
      "https://api.example.test/v1/payment-intents/pi_test/check-balance",
      "https://api.example.test/v1/payment-intents/pi_test/transfer-requested",
      "https://api.example.test/v1/payment-intents/pi_test/broadcasted",
      "https://api.example.test/v1/settlement/proofs",
      "https://api.example.test/v1/webhook-endpoints",
    ]);
    expect(calls[0]?.init?.headers).toBeInstanceOf(Headers);
    expect((calls[0]?.init?.headers as Headers).get("authorization")).toBe("Bearer secret");
  });
});
