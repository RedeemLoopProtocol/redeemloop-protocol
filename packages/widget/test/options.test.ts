import { describe, expect, it } from "vitest";

import { readWidgetOptions } from "../src/index.js";

describe("readWidgetOptions", () => {
  it("reads script-tag widget options from data attributes", () => {
    const element = {
      dataset: {
        apiBaseUrl: "http://localhost:8787",
        bindingId: "bind_test",
        orderId: "order_1",
        sku: "sku_1",
        quantity: "2",
        payerAddress: "0x0000000000000000000000000000000000000123",
        balance: "2",
        txid: "0x1234",
        autoSubmitProof: "true",
      },
    } as unknown as HTMLElement;

    expect(readWidgetOptions(element)).toEqual({
      apiBaseUrl: "http://localhost:8787",
      apiKey: undefined,
      bindingId: "bind_test",
      orderId: "order_1",
      sku: "sku_1",
      quantity: 2,
      payerAddress: "0x0000000000000000000000000000000000000123",
      balance: "2",
      txid: "0x1234",
      autoSubmitProof: true,
      label: undefined,
      workingLabel: undefined,
      transferReadyLabel: undefined,
      paidLabel: undefined,
      errorLabel: undefined,
    });
  });
});
