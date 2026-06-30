import { describe, expect, it } from "vitest";

import { readWidgetOptions } from "../src/index.js";

describe("readWidgetOptions", () => {
  it("reads script-tag widget options from data attributes", () => {
    const element = {
      dataset: {
        apiBaseUrl: "http://localhost:3002",
        bindingId: "bind_test",
        orderId: "order_1",
        sku: "sku_1",
        quantity: "2",
        payerAddress: "0x0000000000000000000000000000000000000123",
        balance: "2",
        txid: "0x1234",
        autoSubmitProof: "true",
        autoSendEvmTransaction: "true",
        autoRecheckEvmSettlement: "true",
        switchEvmChain: "false",
      },
    } as unknown as HTMLElement;

    expect(readWidgetOptions(element)).toEqual({
      apiBaseUrl: "http://localhost:3002",
      apiKey: undefined,
      intentId: undefined,
      bindingId: "bind_test",
      orderId: "order_1",
      sku: "sku_1",
      quantity: 2,
      payerAddress: "0x0000000000000000000000000000000000000123",
      balance: "2",
      txid: "0x1234",
      autoSubmitProof: true,
      autoSendEvmTransaction: true,
      autoRecheckEvmSettlement: true,
      switchEvmChain: false,
      label: undefined,
      workingLabel: undefined,
      transferReadyLabel: undefined,
      paidLabel: undefined,
      errorLabel: undefined,
    });
  });

  it("accepts an existing PaymentIntent for checkout-return pages", () => {
    const element = {
      dataset: {
        apiBaseUrl: "http://localhost:3002",
        intentId: "pi_existing",
      },
    } as unknown as HTMLElement;

    expect(readWidgetOptions(element)).toMatchObject({
      apiBaseUrl: "http://localhost:3002",
      intentId: "pi_existing",
      autoSendEvmTransaction: false,
      autoRecheckEvmSettlement: false,
    });
  });
});
