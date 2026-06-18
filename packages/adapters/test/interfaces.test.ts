import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, type Hex } from "viem";

import {
  buildErc20BalanceCheckRequest,
  buildErc20TransferRequest,
  createEip1193EvmWalletAdapter,
  createErc20PaymentProof,
  erc20TransferEvent,
  formatEvmWalletErrorForMerchant,
  getRedeemLoopEvmChainConfig,
  normalizeEvmWalletError,
  supportedRedeemLoopEvmChainIds,
  type EvmAdapter,
  type Eip1193Provider,
  type IndexerAdapter,
  type PsbtBuilderAdapter,
  verifyErc20TransferReceipt,
} from "../src/index.js";
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
  it("builds ERC-20 transfer calldata for wallet tender requests", () => {
    const asset: VoucherAssetDescriptor = {
      chainNamespace: "eip155",
      chainId: 8453,
      assetType: "erc20",
      assetId: "eip155:8453/erc20:0x0000000000000000000000000000000000000def",
      contract: "0x0000000000000000000000000000000000000def",
      requiredAmount: "1",
      termsHash: "terms",
    };

    const request = buildErc20TransferRequest({
      from: "0x0000000000000000000000000000000000000123",
      to: "0x0000000000000000000000000000000000000abc",
      asset,
    });

    expect(request).toMatchObject({
      chainNamespace: "eip155",
      chainId: 8453,
      assetType: "erc20",
      amount: "1",
      transaction: {
        value: "0x0",
        functionName: "transfer",
      },
    });
    expect(request.contract.toLowerCase()).toBe(asset.contract);
    expect(request.transaction.to.toLowerCase()).toBe(asset.contract);
    expect(request.transaction.args[0].toLowerCase()).toBe("0x0000000000000000000000000000000000000abc");
    expect(request.transaction.args[1]).toBe("1");
    expect(request.transaction.data.startsWith("0xa9059cbb")).toBe(true);

    expect(
      createErc20PaymentProof({
        proofId: "proof_1",
        intentId: "pi_1",
        asset,
        txid: "0x1234",
        from: "0x0000000000000000000000000000000000000123",
        to: "0x0000000000000000000000000000000000000abc",
        confirmations: 1,
      }),
    ).toMatchObject({
      chainNamespace: "eip155",
      assetType: "erc20",
      amount: "1",
    });
  });

  it("builds ERC-20 balanceOf calldata and evaluates required voucher amount", () => {
    const asset: VoucherAssetDescriptor = {
      chainNamespace: "eip155",
      chainId: 8453,
      assetType: "erc20",
      assetId: "eip155:8453/erc20:0x0000000000000000000000000000000000000def",
      contract: "0x0000000000000000000000000000000000000def",
      requiredAmount: "2",
      termsHash: "terms",
    };

    const enough = buildErc20BalanceCheckRequest({
      account: "0x0000000000000000000000000000000000000123",
      asset,
      balance: "3",
    });
    expect(enough.call.data.startsWith("0x70a08231")).toBe(true);
    expect(enough.call.to.toLowerCase()).toBe(asset.contract);
    expect(enough.hasSufficientBalance).toBe(true);
    expect(enough.shortfall).toBe("0");

    const short = buildErc20BalanceCheckRequest({
      account: "0x0000000000000000000000000000000000000123",
      asset,
      balance: "1",
    });
    expect(short.hasSufficientBalance).toBe(false);
    expect(short.shortfall).toBe("1");
  });

  it("publishes EVM chain configs for ETH, BSC, Polygon, and Arbitrum", () => {
    expect(supportedRedeemLoopEvmChainIds).toEqual([1, 56, 137, 42161]);
    expect(getRedeemLoopEvmChainConfig("eth")).toMatchObject({ chainId: 1, chainIdHex: "0x1" });
    expect(getRedeemLoopEvmChainConfig("bsc")).toMatchObject({ chainId: 56, chainIdHex: "0x38" });
    expect(getRedeemLoopEvmChainConfig("pol")).toMatchObject({ chainId: 137, chainIdHex: "0x89" });
    expect(getRedeemLoopEvmChainConfig("arb")).toMatchObject({ chainId: 42161, chainIdHex: "0xa4b1" });
  });

  it("switches or adds EVM chains and sends ERC-20 transfers through EIP-1193 wallets", async () => {
    const calls: Array<{ method: string; params?: unknown }> = [];
    let chainId = "0x1";
    const provider: Eip1193Provider = {
      async request<T = unknown>(args: { method: string; params?: readonly unknown[] | Record<string, unknown> }): Promise<T> {
        calls.push({ method: args.method, params: args.params });
        if (args.method === "eth_requestAccounts") return ["0x0000000000000000000000000000000000000123"] as T;
        if (args.method === "eth_chainId") return chainId as T;
        if (args.method === "wallet_switchEthereumChain") {
          const [{ chainId: nextChainId }] = args.params as Array<{ chainId: string }>;
          if (nextChainId === "0x89" && !calls.some((call) => call.method === "wallet_addEthereumChain")) {
            const error = new Error("Unrecognized chain") as Error & { code: number };
            error.code = 4902;
            throw error;
          }
          chainId = nextChainId;
          return null as T;
        }
        if (args.method === "wallet_addEthereumChain") return null as T;
        if (args.method === "eth_sendTransaction") return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as T;
        throw new Error(`Unexpected method ${args.method}`);
      },
    };
    const wallet = createEip1193EvmWalletAdapter(provider);
    const asset: VoucherAssetDescriptor = {
      chainNamespace: "eip155",
      chainId: 137,
      assetType: "erc20",
      assetId: "eip155:137/erc20:0x0000000000000000000000000000000000000def",
      contract: "0x0000000000000000000000000000000000000def",
      requiredAmount: "1",
      termsHash: "terms",
    };
    const transfer = buildErc20TransferRequest({
      from: "0x0000000000000000000000000000000000000123",
      to: "0x0000000000000000000000000000000000000abc",
      asset,
    });

    await expect(wallet.connect({ chainId: 137 })).resolves.toMatchObject({
      address: "0x0000000000000000000000000000000000000123",
      chainId: 137,
      chainIdHex: "0x89",
    });
    await expect(wallet.sendErc20Transfer(transfer)).resolves.toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(calls).toContainEqual({
      method: "wallet_addEthereumChain",
      params: [
        expect.objectContaining({
          chainId: "0x89",
          chainName: "Polygon PoS",
        }),
      ],
    });
    const sendCall = calls.find((call) => call.method === "eth_sendTransaction");
    expect(sendCall?.params).toEqual([
      expect.objectContaining({
        from: "0x0000000000000000000000000000000000000123",
        value: "0x0",
      }),
    ]);
    const [txParams] = sendCall?.params as Array<{ to: string }>;
    expect(txParams.to.toLowerCase()).toBe("0x0000000000000000000000000000000000000def");
  });

  it("normalizes common EIP-1193 wallet errors for merchant-facing UX", () => {
    expect(normalizeEvmWalletError({ code: 4001, message: "User rejected the request" }, "wallet_unknown_error", "eth_requestAccounts")).toMatchObject({
      code: "wallet_request_rejected",
      retryable: true,
      providerCode: 4001,
    });
    expect(normalizeEvmWalletError({ code: -32002, message: "Request already pending" })).toMatchObject({
      code: "wallet_request_pending",
      retryable: true,
    });
    expect(normalizeEvmWalletError({ message: "insufficient funds for gas * price + value" }, "wallet_transaction_failed")).toMatchObject({
      code: "wallet_insufficient_funds",
    });
    expect(formatEvmWalletErrorForMerchant({ code: 4100, message: "Unauthorized" })).toContain("wallet_unauthorized:");
  });

  it("verifies ERC-20 Transfer logs from an EVM receipt", () => {
    const asset: VoucherAssetDescriptor = {
      chainNamespace: "eip155",
      chainId: 8453,
      assetType: "erc20",
      assetId: "eip155:8453/erc20:0x0000000000000000000000000000000000000def",
      contract: "0x0000000000000000000000000000000000000def",
      requiredAmount: "1",
      termsHash: "terms",
    };
    const from = "0x0000000000000000000000000000000000000123";
    const to = "0x0000000000000000000000000000000000000abc";
    const receipt = {
      transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
      blockNumber: 10n,
      blockHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const,
      status: "success",
      logs: [
        {
          address: asset.contract!,
          topics: encodeEventTopics({
            abi: [erc20TransferEvent],
            eventName: "Transfer",
            args: {
              from,
              to,
            },
          }) as Hex[],
          data: encodeAbiParameters([{ type: "uint256" }], [1n]),
          logIndex: 2,
        },
      ],
    };

    expect(
      verifyErc20TransferReceipt({
        intentId: "pi_1",
        txid: receipt.transactionHash,
        receipt,
        asset,
        from,
        to,
        currentBlockNumber: 12n,
        minConfirmations: 2,
      }),
    ).toMatchObject({
      intentId: "pi_1",
      status: "confirmed",
      confirmations: 3,
      logIndex: 2,
      amount: "1",
    });

    expect(() =>
      verifyErc20TransferReceipt({
        intentId: "pi_1",
        txid: receipt.transactionHash,
        receipt,
        asset,
        from,
        to: "0x0000000000000000000000000000000000000bad",
      }),
    ).toThrow("No matching ERC-20 Transfer log");
  });

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
