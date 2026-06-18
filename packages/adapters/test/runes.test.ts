import { describe, expect, it } from "vitest";

import {
  MockRuneIndexerAdapter,
  buildRuneTransferPsbtRequest,
  createUniSatRuneWalletAdapter,
  createXverseRuneIndexerAdapter,
  createXverseRuneWalletAdapter,
  type BitcoinRuneWalletAdapter,
  type RuneUtxo,
  type XverseRuneRequest,
  type XverseRuneRequestResult,
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

  it("uses UniSat native sendRunes and hex PSBT semantics", async () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const wallet = createUniSatRuneWalletAdapter({
      async requestAccounts() {
        calls.push({ method: "requestAccounts", args: [] });
        return ["bc1payer"];
      },
      async getPublicKey() {
        return "02abcdef";
      },
      async getChain() {
        return { enum: "BITCOIN_TESTNET", name: "Bitcoin Testnet", network: "testnet" };
      },
      async signPsbt(psbtHex, options) {
        calls.push({ method: "signPsbt", args: [psbtHex, options] });
        return "70736274ff01";
      },
      async pushPsbt(psbtHex) {
        calls.push({ method: "pushPsbt", args: [psbtHex] });
        return "btc_txid";
      },
      async sendRunes(address, runeid, amount, options) {
        calls.push({ method: "sendRunes", args: [address, runeid, amount, options] });
        return { txid: "rune_txid" };
      },
    });

    await expect(wallet.connect()).resolves.toMatchObject({
      provider: "unisat",
      address: "bc1payer",
      publicKey: "02abcdef",
      network: "testnet",
    });
    await expect(
      wallet.signPsbt({
        psbtHex: "70736274ff00",
        finalize: false,
        providerOptions: { toSignInputs: [{ index: 0, address: "bc1payer" }] },
      }),
    ).resolves.toMatchObject({
      psbtHex: "70736274ff01",
      psbtBase64: Buffer.from("70736274ff01", "hex").toString("base64"),
    });
    await expect(wallet.broadcast?.("70736274ff01")).resolves.toEqual({ txid: "btc_txid" });
    await expect(
      wallet.requestRuneTransfer?.({
        to: "bc1merchant",
        runeId: "840000:3",
        amount: "10",
        feeRate: 15,
      }),
    ).resolves.toMatchObject({ provider: "unisat", txid: "rune_txid" });
    expect(calls).toContainEqual({
      method: "sendRunes",
      args: ["bc1merchant", "840000:3", "10", { feeRate: 15 }],
    });
  });

  it("uses Xverse Sats Connect runes_transfer and base64 PSBT semantics", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const request: XverseRuneRequest = async <T>(method: string, params?: unknown): Promise<XverseRuneRequestResult<T>> => {
      calls.push({ method, params });
      if (method === "getAddresses") {
        return {
          status: "success",
          result: { addresses: [{ address: "bc1payer", publicKey: "02abcdef", purpose: "ordinals" }] } as T,
        };
      }
      if (method === "signPsbt") {
        return { status: "success", result: { psbt: "cHNidC1zaWduZWQ=", txid: "btc_txid" } as T };
      }
      if (method === "runes_transfer") {
        return { status: "success", result: { txid: "rune_txid" } as T };
      }
      return { status: "error", error: { message: `Unexpected method ${method}` } };
    };
    const wallet = createXverseRuneWalletAdapter(request);

    await expect(wallet.connect({ network: "mainnet" })).resolves.toMatchObject({
      provider: "xverse",
      address: "bc1payer",
      network: "mainnet",
    });
    await expect(
      wallet.signPsbt({
        psbtBase64: "cHNidA==",
        signInputs: { bc1payer: [0] },
        broadcast: true,
      }),
    ).resolves.toMatchObject({ psbtBase64: "cHNidC1zaWduZWQ=", txid: "btc_txid" });
    await expect(
      wallet.requestRuneTransfer?.({
        to: "bc1merchant",
        runeName: "UNCOMMON•GOODS",
        amount: "10",
      }),
    ).resolves.toMatchObject({ provider: "xverse", txid: "rune_txid" });
    expect(calls).toContainEqual({
      method: "runes_transfer",
      params: {
        recipients: [{ runeName: "UNCOMMON•GOODS", amount: 10, address: "bc1merchant" }],
      },
    });
  });

  it("maps Xverse API-backed Rune indexer responses into RedeemLoop proof boundaries", async () => {
    const requestedUrls: string[] = [];
    const fetchFn: typeof fetch = async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes("/balance")) {
        return jsonResponse({
          balances: [{ runeId: "840000:3", confirmedBalance: "12", availableBalance: "12", divisibility: 0 }],
          indexerHeight: 842000,
        });
      }
      if (String(url).includes("/utxo")) {
        return jsonResponse({
          items: [
            {
              txid: "tx_rune_1",
              vout: 0,
              amount: 546,
              runes: [{ runeId: "840000:3", runeName: "UNCOMMON•GOODS", amount: "12", divisibility: 0 }],
            },
          ],
        });
      }
      if (String(url).includes("/activity")) {
        return jsonResponse({
          items: [
            {
              blockHeight: 842001,
              txid: "btc_txid",
              index: 1,
              type: "receive",
              amount: "10",
              address: "bc1merchant",
            },
          ],
        });
      }
      return new Response("not found", { status: 404, statusText: "Not Found" });
    };
    const indexer = createXverseRuneIndexerAdapter({
      apiKey: "test-key",
      network: "signet",
      fetchFn,
    });

    await expect(indexer.getRuneBalance("bc1payer", "840000:3")).resolves.toMatchObject({
      runeId: "840000:3",
      amount: "12",
      divisibility: 0,
    });
    await expect(indexer.listRuneUtxos("bc1payer", "840000:3")).resolves.toEqual([
      expect.objectContaining({ txid: "tx_rune_1", vout: 0, value: 546, runeId: "840000:3", amount: "12" }),
    ]);
    await expect(
      indexer.getRuneTransferProof({
        intentId: "pi_rune",
        txid: "btc_txid",
        asset: runeAsset,
        from: "bc1payer",
        to: "bc1merchant",
      }),
    ).resolves.toMatchObject({
      intentId: "pi_rune",
      txid: "btc_txid",
      to: "bc1merchant",
      assetType: "rune",
      amount: "10",
      status: "confirmed",
    });
    expect(requestedUrls.some((url) => url.startsWith("https://api-signet.secretkeylabs.io/"))).toBe(true);
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
