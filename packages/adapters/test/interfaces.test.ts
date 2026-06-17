import { describe, expect, it } from "vitest";

import type { EvmAdapter, IndexerAdapter, PsbtBuilderAdapter } from "../src/index.js";
import type { VoucherAssetDescriptor } from "@redeemloop/core";

const runeAsset: VoucherAssetDescriptor = {
  chainNamespace: "bitcoin",
  assetType: "rune",
  assetId: "bitcoin/rune:840000:3",
  runeId: "840000:3",
  requiredAmount: "1",
  termsHash: "terms",
};

describe("adapter contracts", () => {
  it("keeps Bitcoin and Fractal transfer support behind PSBT/indexer interfaces", async () => {
    const psbtBuilder: PsbtBuilderAdapter = {
      async buildTransferPsbt(input) {
        return {
          psbtBase64: Buffer.from(`${input.from}:${input.to}:${input.asset.assetId}:${input.amount}`).toString("base64"),
          estimatedFee: "1200",
        };
      },
    };
    const indexer: IndexerAdapter = {
      async getBalance(address, asset) {
        return { address, asset, amount: "2" };
      },
      async getTransferProof(txid, asset) {
        return {
          proofId: "proof_1",
          intentId: "pi_1",
          chainNamespace: asset.chainNamespace,
          txid,
          confirmations: 1,
          from: "bc1payer",
          to: "bc1merchant",
          assetType: asset.assetType,
          assetId: asset.assetId,
          amount: asset.requiredAmount,
          status: "seen",
        };
      },
    };

    await expect(psbtBuilder.buildTransferPsbt({ from: "bc1payer", to: "bc1merchant", asset: runeAsset, amount: "1" })).resolves.toMatchObject({
      estimatedFee: "1200",
    });
    await expect(indexer.getBalance("bc1payer", runeAsset)).resolves.toMatchObject({ amount: "2" });
  });

  it("defines EVM transfer without requiring RedeemLoop-issued tokens", async () => {
    const adapter: EvmAdapter = {
      async getBalance(address, asset) {
        return { address, asset, amount: "1" };
      },
      async requestTransfer() {
        return { txid: "0xabc" };
      },
      async getTransferProof(txid, asset) {
        return {
          proofId: "proof_1",
          intentId: "pi_1",
          chainNamespace: "eip155",
          chainId: asset.chainId,
          txid,
          confirmations: 1,
          from: "0x0000000000000000000000000000000000000123",
          to: "0x0000000000000000000000000000000000000abc",
          assetType: asset.assetType,
          assetId: asset.assetId,
          contract: asset.contract,
          amount: asset.requiredAmount,
          status: "confirmed",
        };
      },
    };

    await expect(adapter.requestTransfer({ from: "0x1", to: "0x2", asset: { ...runeAsset, chainNamespace: "eip155", chainId: 8453 }, amount: "1" })).resolves.toMatchObject({
      txid: "0xabc",
    });
  });
});
