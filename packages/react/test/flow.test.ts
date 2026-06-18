import { describe, expect, it, vi } from "vitest";
import type { RedeemLoopClient } from "@redeemloop/sdk";

import { runRedeemLoopPayFlow } from "../src/flow.js";

describe("runRedeemLoopPayFlow", () => {
  it("creates an intent, checks balance, requests transfer, and submits optional proof", async () => {
    const client = {
      createPaymentIntent: vi.fn(async () => ({
        intentId: "pi_test",
        bindingId: "bind_test",
        merchantId: "merchant_test",
        orderId: "order_1",
        channel: "checkout",
        skuLines: [{ sku: "sku_1", quantity: 1 }],
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: "asset_1",
            contract: "0x0000000000000000000000000000000000000def",
            requiredAmount: "1",
            termsHash: "terms",
          },
        ],
        merchantVault: "0x0000000000000000000000000000000000000abc",
        settlementPolicy: "collect",
        status: "created",
        expiresAt: "2026-06-18T00:00:00.000Z",
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z",
      })),
      checkBalance: vi.fn(async () => ({
        intentId: "pi_test",
        bindingId: "bind_test",
        merchantId: "merchant_test",
        orderId: "order_1",
        channel: "checkout",
        skuLines: [{ sku: "sku_1", quantity: 1 }],
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: "asset_1",
            contract: "0x0000000000000000000000000000000000000def",
            requiredAmount: "1",
            termsHash: "terms",
          },
        ],
        merchantVault: "0x0000000000000000000000000000000000000abc",
        settlementPolicy: "collect",
        status: "asset_selected",
        expiresAt: "2026-06-18T00:00:00.000Z",
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z",
        balanceCheck: {
          chainNamespace: "eip155",
          chainId: 31337,
          assetType: "erc20",
          account: "0x0000000000000000000000000000000000000123",
          contract: "0x0000000000000000000000000000000000000def",
          requiredAmount: "1",
          call: {
            chainId: 31337,
            to: "0x0000000000000000000000000000000000000def",
            data: "0x70a08231",
            functionName: "balanceOf",
            args: ["0x0000000000000000000000000000000000000123"],
          },
          providedBalance: "1",
          hasSufficientBalance: true,
          shortfall: "0",
        },
      })),
      requestTransfer: vi.fn(async () => ({
        intentId: "pi_test",
        bindingId: "bind_test",
        merchantId: "merchant_test",
        orderId: "order_1",
        channel: "checkout",
        skuLines: [{ sku: "sku_1", quantity: 1 }],
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: "asset_1",
            contract: "0x0000000000000000000000000000000000000def",
            requiredAmount: "1",
            termsHash: "terms",
          },
        ],
        selectedAsset: {
          chainNamespace: "eip155",
          chainId: 31337,
          assetType: "erc20",
          assetId: "asset_1",
          contract: "0x0000000000000000000000000000000000000def",
          requiredAmount: "1",
          termsHash: "terms",
        },
        merchantVault: "0x0000000000000000000000000000000000000abc",
        settlementPolicy: "collect",
        status: "transfer_requested",
        expiresAt: "2026-06-18T00:00:00.000Z",
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z",
        transfer: {
          to: "0x0000000000000000000000000000000000000abc",
          asset: {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: "asset_1",
            contract: "0x0000000000000000000000000000000000000def",
            requiredAmount: "1",
            termsHash: "terms",
          },
          amount: "1",
          settlementPolicy: "collect",
        },
      })),
      markBroadcasted: vi.fn(async () => ({
        intentId: "pi_test",
        bindingId: "bind_test",
        merchantId: "merchant_test",
        orderId: "order_1",
        channel: "checkout",
        skuLines: [{ sku: "sku_1", quantity: 1 }],
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: "asset_1",
            contract: "0x0000000000000000000000000000000000000def",
            requiredAmount: "1",
            termsHash: "terms",
          },
        ],
        selectedAsset: {
          chainNamespace: "eip155",
          chainId: 31337,
          assetType: "erc20",
          assetId: "asset_1",
          contract: "0x0000000000000000000000000000000000000def",
          requiredAmount: "1",
          termsHash: "terms",
        },
        merchantVault: "0x0000000000000000000000000000000000000abc",
        settlementPolicy: "collect",
        status: "broadcasted",
        expiresAt: "2026-06-18T00:00:00.000Z",
        createdAt: "2026-06-18T00:00:00.000Z",
        updatedAt: "2026-06-18T00:00:00.000Z",
        txid: "0x1234",
      })),
      submitSettlementProof: vi.fn(async () => ({
        proofId: "proof_test",
        intentId: "pi_test",
        chainNamespace: "eip155",
        chainId: 31337,
        txid: "0x1234",
        confirmations: 1,
        from: "0x0000000000000000000000000000000000000123",
        to: "0x0000000000000000000000000000000000000abc",
        assetType: "erc20",
        assetId: "asset_1",
        amount: "1",
        status: "confirmed",
        paymentIntent: {
          intentId: "pi_test",
          bindingId: "bind_test",
          merchantId: "merchant_test",
          orderId: "order_1",
          channel: "checkout",
          skuLines: [{ sku: "sku_1", quantity: 1 }],
          acceptedAssets: [],
          merchantVault: "0x0000000000000000000000000000000000000abc",
          settlementPolicy: "collect",
          status: "paid",
          expiresAt: "2026-06-18T00:00:00.000Z",
          createdAt: "2026-06-18T00:00:00.000Z",
          updatedAt: "2026-06-18T00:00:00.000Z",
        },
      })),
    } as unknown as RedeemLoopClient;

    const steps: string[] = [];
    const result = await runRedeemLoopPayFlow(
      client,
      {
        bindingId: "bind_test",
        orderId: "order_1",
        channel: "checkout",
        skuLines: [{ sku: "sku_1", quantity: 1 }],
        payerAddress: "0x0000000000000000000000000000000000000123",
        balance: "1",
        txid: "0x1234",
        autoSubmitProof: true,
      },
      { onStep: (step) => steps.push(step) },
    );

    expect(result.intent.status).toBe("paid");
    expect(result.transfer?.amount).toBe("1");
    expect(result.proof?.status).toBe("confirmed");
    expect(steps).toEqual(["creating_intent", "checking_balance", "requesting_transfer", "broadcasting", "submitting_proof", "complete"]);
  });

  it("can send an EVM ERC-20 transfer through an injected wallet and trusted-recheck settlement", async () => {
    const calls: Array<{ method: string; params?: unknown }> = [];
    let chainId = "0x38";
    const evmProvider = {
      async request<T = unknown>(args: { method: string; params?: readonly unknown[] | Record<string, unknown> }): Promise<T> {
        calls.push({ method: args.method, params: args.params });
        if (args.method === "eth_chainId") return chainId as T;
        if (args.method === "eth_requestAccounts") return ["0x0000000000000000000000000000000000000123"] as T;
        if (args.method === "wallet_switchEthereumChain") {
          const [{ chainId: nextChainId }] = args.params as Array<{ chainId: string }>;
          chainId = nextChainId;
          return null as T;
        }
        if (args.method === "eth_sendTransaction") return "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as T;
        throw new Error(`Unexpected method ${args.method}`);
      },
    };
    const client = {
      createPaymentIntent: vi.fn(async () => ({
        intentId: "pi_evm",
        acceptedAssets: [],
        merchantVault: "0x0000000000000000000000000000000000000abc",
        status: "created",
      })),
      checkBalance: vi.fn(async () => ({
        intentId: "pi_evm",
        acceptedAssets: [],
        merchantVault: "0x0000000000000000000000000000000000000abc",
        status: "asset_selected",
        balanceCheck: { hasSufficientBalance: true },
      })),
      requestTransfer: vi.fn(async () => ({
        intentId: "pi_evm",
        acceptedAssets: [],
        selectedAsset: {
          chainNamespace: "eip155",
          chainId: 56,
          assetType: "erc20",
          assetId: "eip155:56/erc20:0x0000000000000000000000000000000000000def",
          contract: "0x0000000000000000000000000000000000000def",
          requiredAmount: "1",
          termsHash: "terms",
        },
        merchantVault: "0x0000000000000000000000000000000000000abc",
        status: "transfer_requested",
        transfer: {
          to: "0x0000000000000000000000000000000000000abc",
          amount: "1",
          settlementPolicy: "collect",
          evm: {
            chainNamespace: "eip155",
            chainId: 56,
            assetType: "erc20",
            from: "0x0000000000000000000000000000000000000123",
            to: "0x0000000000000000000000000000000000000abc",
            contract: "0x0000000000000000000000000000000000000def",
            amount: "1",
            transaction: {
              chainId: 56,
              from: "0x0000000000000000000000000000000000000123",
              to: "0x0000000000000000000000000000000000000def",
              data: "0xa9059cbb",
              value: "0x0",
              functionName: "transfer",
              args: ["0x0000000000000000000000000000000000000abc", "1"],
            },
          },
        },
      })),
      markBroadcasted: vi.fn(async (_intentId: string, input: { txid: string }) => ({
        intentId: "pi_evm",
        acceptedAssets: [],
        merchantVault: "0x0000000000000000000000000000000000000abc",
        status: "broadcasted",
        txid: input.txid,
      })),
      recheckEvmSettlement: vi.fn(async (_intentId: string, input: { txid: string }) => ({
        proofId: "proof_evm",
        intentId: "pi_evm",
        chainNamespace: "eip155",
        chainId: 56,
        txid: input.txid,
        confirmations: 1,
        from: "0x0000000000000000000000000000000000000123",
        to: "0x0000000000000000000000000000000000000abc",
        assetType: "erc20",
        assetId: "eip155:56/erc20:0x0000000000000000000000000000000000000def",
        amount: "1",
        status: "confirmed",
        trusted: true,
        paymentIntent: { intentId: "pi_evm", status: "paid" },
      })),
    } as unknown as RedeemLoopClient;

    const steps: string[] = [];
    const events: string[] = [];
    const result = await runRedeemLoopPayFlow(
      client,
      {
        bindingId: "bind_evm",
        orderId: "order_evm",
        channel: "checkout",
        payerAddress: "0x0000000000000000000000000000000000000123",
        autoSendEvmTransaction: true,
        autoRecheckEvmSettlement: true,
        evmProvider,
      },
      {
        onStep: (step) => steps.push(step),
        onEvent: (event) => events.push(event.type),
      },
    );

    expect(result.intent.status).toBe("paid");
    expect(result.broadcastedTxid).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(client.markBroadcasted).toHaveBeenCalledWith("pi_evm", {
      txid: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(client.recheckEvmSettlement).toHaveBeenCalledWith("pi_evm", {
      txid: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      from: "0x0000000000000000000000000000000000000123",
    });
    expect(calls.map((call) => call.method)).toContain("eth_sendTransaction");
    expect(steps).toEqual([
      "creating_intent",
      "checking_balance",
      "requesting_transfer",
      "sending_wallet_transaction",
      "broadcasting",
      "rechecking_settlement",
      "complete",
    ]);
    expect(events).toEqual([
      "intent_created",
      "balance_checked",
      "transfer_requested",
      "wallet_connected",
      "wallet_transaction_submitted",
      "transaction_broadcasted",
      "settlement_rechecked",
      "payment_complete",
    ]);
  });
});
