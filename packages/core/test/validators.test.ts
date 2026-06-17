import { describe, expect, it } from "vitest";

import {
  assertValidRedemptionBinding,
  assertValidVoucherAssetDescriptor,
  proofIdempotencyKey,
} from "../src/index.js";
import type { RedemptionBinding, VoucherPaymentProof } from "../src/types.js";

const erc20Asset = {
  chainNamespace: "eip155",
  chainId: 8453,
  assetType: "erc20",
  assetId: "eip155:8453/erc20:0x0000000000000000000000000000000000000001",
  contract: "0x0000000000000000000000000000000000000001",
  requiredAmount: "1",
  termsHash: "terms",
} as const;

describe("v0.2 validators", () => {
  it("accepts an existing ERC-20 voucher asset descriptor", () => {
    expect(() => assertValidVoucherAssetDescriptor(erc20Asset)).not.toThrow();
  });

  it("rejects EVM assets without an existing contract address", () => {
    expect(() =>
      assertValidVoucherAssetDescriptor({
        ...erc20Asset,
        contract: undefined,
      }),
    ).toThrow("asset.contract");
  });

  it("requires an Asset Binding to include assets, vaults, and commerce targets", () => {
    const binding: RedemptionBinding = {
      bindingId: "bind_test",
      merchantId: "merchant_test",
      entitlementId: "entitlement_test",
      acceptedAssets: [erc20Asset],
      merchantVaults: {
        "eip155:8453": "0x0000000000000000000000000000000000000abc",
      },
      settlementPolicy: "collect",
      commerceTargets: [{ platform: "woocommerce", storeId: "store_1", sku: "coffee" }],
      status: "active",
      termsHash: "terms",
      createdAt: "2026-06-17T00:00:00.000Z",
      updatedAt: "2026-06-17T00:00:00.000Z",
    };

    expect(() => assertValidRedemptionBinding(binding)).not.toThrow();
  });

  it("builds stable proof idempotency keys", () => {
    const proof: VoucherPaymentProof = {
      proofId: "proof_1",
      intentId: "pi_1",
      chainNamespace: "eip155",
      chainId: 8453,
      txid: "0xaaa",
      confirmations: 1,
      from: "0x0000000000000000000000000000000000000123",
      to: "0x0000000000000000000000000000000000000ABC",
      assetType: "erc20",
      assetId: erc20Asset.assetId,
      contract: erc20Asset.contract,
      amount: "1",
      logIndex: 0,
      status: "confirmed",
    };

    expect(proofIdempotencyKey(proof)).toBe(
      "proof:eip155:0xaaa:eip155:8453/erc20:0x0000000000000000000000000000000000000001:0x0000000000000000000000000000000000000abc:1",
    );
  });
});
