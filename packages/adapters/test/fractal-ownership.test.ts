import { describe, expect, it } from "vitest";
import type { VoucherAssetDescriptor } from "@redeemloop/core";

import {
  MockVoucherOwnershipAdapter,
  createMockFractalInscriptionAdapter,
  createMockFractalRuneIndexerAdapter,
  ownershipAssetKey,
  type RuneUtxo,
} from "../src/index.js";

const fractalRuneAsset: VoucherAssetDescriptor = {
  chainNamespace: "fractal",
  assetType: "rune",
  assetId: "fractal/rune:840000:9",
  runeId: "840000:9",
  requiredAmount: "3",
  termsHash: "fractal-rune-terms",
};

const fractalInscriptionAsset: VoucherAssetDescriptor = {
  chainNamespace: "fractal",
  assetType: "inscription",
  assetId: "fractal/inscription:abc123",
  inscriptionId: "abc123",
  requiredAmount: "1",
  termsHash: "fractal-inscription-terms",
};

const nftAsset: VoucherAssetDescriptor = {
  chainNamespace: "eip155",
  chainId: 1,
  assetType: "erc721",
  assetId: "eip155:1/erc721:0x0000000000000000000000000000000000000abc/42",
  contract: "0x0000000000000000000000000000000000000abc",
  tokenId: "42",
  requiredAmount: "1",
  termsHash: "nft-terms",
};

const fractalUtxos: RuneUtxo[] = [
  {
    txid: "fractal_tx_1",
    vout: 0,
    value: 546,
    address: "fb1payer",
    runeId: "840000:9",
    amount: "3",
  },
];

describe("Fractal and ownership adapter alpha boundaries", () => {
  it("builds mocked Fractal Rune transfer proofs behind the Rune indexer interface", async () => {
    const indexer = createMockFractalRuneIndexerAdapter({
      network: "fractal-testnet",
      balances: [{ address: "fb1payer", runeId: "840000:9", amount: "3" }],
      utxos: fractalUtxos,
    });

    await expect(indexer.getRuneBalance("fb1payer", "840000:9")).resolves.toMatchObject({ amount: "3" });
    await expect(
      indexer.getRuneTransferProof({
        intentId: "pi_fractal_rune",
        txid: "fractal_txid",
        asset: fractalRuneAsset,
        from: "fb1payer",
        to: "fb1merchant",
        confirmations: 1,
      }),
    ).resolves.toMatchObject({
      chainNamespace: "fractal",
      assetType: "rune",
      status: "confirmed",
      rawProof: {
        alpha: true,
        indexer: "mock-fractal-rune",
        network: "fractal-testnet",
      },
    });
  });

  it("checks mocked Fractal inscription ownership and transfer proof boundaries", async () => {
    const adapter = createMockFractalInscriptionAdapter({
      owners: {
        [ownershipAssetKey(fractalInscriptionAsset)]: "fb1owner",
      },
    });

    await expect(adapter.getOwnershipProof({ owner: "fb1owner", asset: fractalInscriptionAsset })).resolves.toMatchObject({
      status: "owned",
      alpha: true,
      rawProof: {
        indexer: "mock-fractal-inscription",
      },
    });
    await expect(
      adapter.getTransferProof({
        intentId: "pi_inscription",
        txid: "fractal_inscription_txid",
        asset: fractalInscriptionAsset,
        from: "fb1owner",
        to: "fb1merchant",
      }),
    ).resolves.toMatchObject({
      chainNamespace: "fractal",
      assetType: "inscription",
      status: "confirmed",
      rawProof: {
        indexer: "mock-fractal-inscription",
      },
    });
  });

  it("supports generic NFT ownership proof and transfer proof boundaries", async () => {
    const adapter = new MockVoucherOwnershipAdapter({
      owners: {
        [ownershipAssetKey(nftAsset)]: "0x0000000000000000000000000000000000000def",
      },
    });

    await expect(
      adapter.getOwnershipProof({
        owner: "0x0000000000000000000000000000000000000def",
        asset: nftAsset,
      }),
    ).resolves.toMatchObject({ status: "owned", alpha: true });
    await expect(
      adapter.getTransferProof({
        intentId: "pi_nft",
        txid: "0xabc",
        asset: nftAsset,
        from: "0x0000000000000000000000000000000000000def",
        to: "0x0000000000000000000000000000000000000abc",
        confirmations: 0,
      }),
    ).resolves.toMatchObject({
      assetType: "erc721",
      tokenId: "42",
      status: "seen",
    });
  });
});
