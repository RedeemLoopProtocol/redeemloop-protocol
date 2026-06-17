import { describe, expect, it } from "vitest";

import {
  MockRuneIndexerAdapter,
  buildRuneTransferPsbtRequest,
  type BitcoinRuneWalletAdapter,
  type RuneUtxo,
} from "../src/index.js";
import type { VoucherAssetDescriptor } from "@redeemloop/core";

const runeAsset: VoucherAssetDescriptor = {
  chainNamespace: "bitcoin",
  assetType: "rune",
  assetId: "bitcoin/rune:840000:3",
  runeId: "840000:3",
  requiredAmount: "10",
  divisibility: 0,
  termsHash: "terms",
};

const utxos: RuneUtxo[] = [
  {
    txid: "tx_rune_1",
    vout: 0,
    value: 10_000,
    address: "bc1payer",
    runeId: "840000:3",
    amount: "7",
  },
  {
    txid: "tx_rune_2",
    vout: 1,
    value: 8_000,
    address: "bc1payer",
    runeId: "840000:3",
    amount: "5",
  },
];

describe("Bitcoin Rune adapter alpha", () => {
  it("builds a wallet-facing Rune PSBT request fixture without etching or inscribing", () => {
    const request = buildRuneTransferPsbtRequest({
      network: "testnet",
      from: "bc1payer",
      to: "bc1merchant",
      changeAddress: "bc1change",
      asset: runeAsset,
      feeRate: 8,
      utxos,
    });

    expect(request).toMatchObject({
      chainNamespace: "bitcoin",
      network: "testnet",
      assetType: "rune",
      runeId: "840000:3",
      amount: "10",
      estimatedFee: "1088",
      alpha: true,
      outputs: [
        { address: "bc1merchant", runeAmount: "10", role: "merchant" },
        { address: "bc1change", runeAmount: "2", role: "change" },
      ],
    });
    const decoded = JSON.parse(Buffer.from(request.psbtBase64, "base64").toString("utf8"));
    expect(decoded).toMatchObject({
      kind: "redeemloop.rune-transfer-alpha",
      inputs: [
        { txid: "tx_rune_1", vout: 0, runeAmount: "7" },
        { txid: "tx_rune_2", vout: 1, runeAmount: "5" },
      ],
    });
  });

  it("keeps UniSat and Xverse behind a stable wallet adapter interface", async () => {
    const wallet: BitcoinRuneWalletAdapter = {
      provider: "unisat",
      async connect() {
        return {
          provider: "unisat",
          network: "testnet",
          address: "bc1payer",
          publicKey: "02abcdef",
        };
      },
      async signPsbt(input) {
        return {
          psbtBase64: `${input.psbtBase64}.signed`,
        };
      },
      async broadcast() {
        return { txid: "btc_txid" };
      },
    };

    await expect(wallet.connect({ network: "testnet" })).resolves.toMatchObject({
      provider: "unisat",
      address: "bc1payer",
    });
    await expect(wallet.signPsbt({ psbtBase64: "cHNidA==" })).resolves.toMatchObject({
      psbtBase64: "cHNidA==.signed",
    });
  });

  it("reads Rune balances, UTXOs, and proof from a mocked indexer adapter", async () => {
    const indexer = new MockRuneIndexerAdapter({
      balances: [{ address: "bc1payer", runeId: "840000:3", amount: "12" }],
      utxos,
    });

    await expect(indexer.getRuneBalance("bc1payer", "840000:3")).resolves.toMatchObject({ amount: "12" });
    await expect(indexer.listRuneUtxos("bc1payer", "840000:3")).resolves.toHaveLength(2);
    await expect(
      indexer.getRuneTransferProof({
        intentId: "pi_rune",
        txid: "btc_txid",
        asset: runeAsset,
        from: "bc1payer",
        to: "bc1merchant",
        confirmations: 2,
      }),
    ).resolves.toMatchObject({
      intentId: "pi_rune",
      assetType: "rune",
      assetId: "bitcoin/rune:840000:3",
      status: "confirmed",
    });
  });
});
