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
});
