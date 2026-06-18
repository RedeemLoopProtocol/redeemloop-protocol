import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeAbiParameters, encodeEventTopics, getAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc20TransferEvent } from "@redeemloop/adapters";

import { createApp } from "../src/app.js";
import { hmacSha256Base64, verifyRedeemLoopWebhookSignature } from "../src/commerce.js";
import { buildTypedData, type RedeemAuthorizationJson } from "../src/typedData.js";

const userPrivateKey = "0x59c6995e998f97a5a0044966f0945386d2e50e6a741bbd4f1550302b1435f7a5";
const user = privateKeyToAccount(userPrivateKey);
const attacker = privateKeyToAccount("0x8b3a350cf5c34c9194ca3a545d121d6d7c91f113f8cb6f7e4e44bb9f33d763fd");
const operator = getAddress("0x0000000000000000000000000000000000000abc");
const token = getAddress("0x0000000000000000000000000000000000000def");

describe("RedeemLoop API relayer prototype", () => {
  it("runs the v0.2 Asset Binding, PaymentIntent, receipt confirmation, and mark-as-paid flow", async () => {
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      woocommerceStoreUrl: "https://merchant.example",
    });

    const merchantResponse = await app.inject({
      method: "POST",
      url: "/v1/merchants",
      payload: {
        merchantId: "merchant_cafe",
        name: "Merchant Cafe",
      },
    });
    expect(merchantResponse.statusCode).toBe(201);

    const vaultResponse = await app.inject({
      method: "POST",
      url: "/v1/merchant-vaults",
      payload: {
        vaultId: "vault_base",
        merchantId: "merchant_cafe",
        chainNamespace: "eip155",
        chainId: 31337,
        address: operator,
      },
    });
    expect(vaultResponse.statusCode).toBe(201);

    const entitlementResponse = await app.inject({
      method: "POST",
      url: "/v1/entitlements",
      payload: {
        entitlementId: "ent_coffee",
        merchantId: "merchant_cafe",
        name: "Coffee pickup",
        quantity: 1,
        termsHash: "coffee-terms",
      },
    });
    expect(entitlementResponse.statusCode).toBe(201);

    const bindingResponse = await app.inject({
      method: "POST",
      url: "/v1/bindings",
      payload: {
        bindingId: "bind_coffee",
        merchantId: "merchant_cafe",
        entitlementId: "ent_coffee",
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: `eip155:31337/erc20:${token}`,
            contract: token,
            requiredAmount: "1",
            termsHash: "coffee-terms",
          },
        ],
        merchantVaults: {
          "eip155:31337": operator,
        },
        settlementPolicy: "collect",
        commerceTargets: [
          {
            platform: "woocommerce",
            storeId: "woo-store",
            sku: "coffee-cup",
          },
        ],
        status: "active",
        termsHash: "coffee-terms",
      },
    });
    expect(bindingResponse.statusCode).toBe(201);

    const intentResponse = await app.inject({
      method: "POST",
      url: "/v1/payment-intents",
      payload: {
        bindingId: "bind_coffee",
        orderId: "42",
        channel: "checkout",
        skuLines: [{ sku: "coffee-cup", quantity: 1 }],
      },
    });
    expect(intentResponse.statusCode).toBe(201);
    expect(intentResponse.json()).toMatchObject({
      intentId: expect.stringMatching(/^pi_/),
      bindingId: "bind_coffee",
      merchantId: "merchant_cafe",
      status: "created",
      merchantVault: operator,
      settlementPolicy: "collect",
    });
    const intentId = intentResponse.json().intentId as string;

    const balanceResponse = await app.inject({
      method: "POST",
      url: `/v1/payment-intents/${intentId}/check-balance`,
      payload: {
        payerAddress: user.address,
        balance: "1",
      },
    });
    expect(balanceResponse.statusCode).toBe(200);
    expect(balanceResponse.json()).toMatchObject({
      status: "asset_selected",
      payerAddress: user.address,
      balanceCheck: {
        chainNamespace: "eip155",
        assetType: "erc20",
        contract: token,
        requiredAmount: "1",
        providedBalance: "1",
        hasSufficientBalance: true,
        shortfall: "0",
        call: {
          to: token,
          functionName: "balanceOf",
          args: [user.address],
        },
      },
    });
    expect(balanceResponse.json().balanceCheck.call.data).toMatch(/^0x70a08231/);

    const transferResponse = await app.inject({
      method: "POST",
      url: `/v1/payment-intents/${intentId}/transfer-requested`,
      payload: {
        payerAddress: user.address,
      },
    });
    expect(transferResponse.statusCode).toBe(200);
    expect(transferResponse.json()).toMatchObject({
      status: "transfer_requested",
      transfer: {
        to: operator,
        amount: "1",
        evm: {
          chainNamespace: "eip155",
          chainId: 31337,
          assetType: "erc20",
          contract: token,
          transaction: {
            to: token,
            value: "0x0",
            functionName: "transfer",
            args: [operator, "1"],
          },
        },
      },
    });
    expect(transferResponse.json().transfer.evm.transaction.data).toMatch(/^0xa9059cbb/);

    const shortIntentResponse = await app.inject({
      method: "POST",
      url: "/v1/payment-intents",
      payload: {
        bindingId: "bind_coffee",
        orderId: "43",
        channel: "checkout",
        skuLines: [{ sku: "coffee-cup", quantity: 1 }],
      },
    });
    const shortIntentId = shortIntentResponse.json().intentId as string;
    const shortBalanceResponse = await app.inject({
      method: "POST",
      url: `/v1/payment-intents/${shortIntentId}/check-balance`,
      payload: {
        payerAddress: user.address,
        balance: "0",
      },
    });
    expect(shortBalanceResponse.statusCode).toBe(200);
    expect(shortBalanceResponse.json()).toMatchObject({
      status: "wallet_connected",
      balanceCheck: {
        hasSufficientBalance: false,
        shortfall: "1",
      },
    });

    const proofResponse = await app.inject({
      method: "POST",
      url: "/v1/settlement/proofs",
      payload: {
        intentId,
        txid: "0x1234",
        blockNumber: 12,
        confirmations: 3,
        from: user.address,
        to: operator,
        status: "confirmed",
      },
    });
    expect(proofResponse.statusCode).toBe(201);
    expect(proofResponse.json()).toMatchObject({
      status: "confirmed",
      paymentIntent: {
        status: "paid",
      },
      commerce: {
        provider: "woocommerce",
        dryRun: true,
        markedPaid: false,
      },
    });
    expect(proofResponse.json().commerce.request.url).toBe("https://merchant.example/wp-json/wc/v3/orders/42");

    const duplicateProofResponse = await app.inject({
      method: "POST",
      url: "/v1/settlement/proofs",
      payload: {
        intentId,
        txid: "0x1234",
        confirmations: 3,
        from: user.address,
        to: operator,
        status: "confirmed",
      },
    });
    expect(duplicateProofResponse.statusCode).toBe(200);
    expect(duplicateProofResponse.json()).toMatchObject({
      duplicate: true,
    });

    await app.close();
  });

  it("creates signed v0.2 webhook endpoint test requests", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/webhook-endpoints",
      payload: {
        id: "wh_test",
        merchantId: "merchant_cafe",
        url: "https://merchant.example/redeemloop",
        secret: "webhook-secret",
      },
    });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      id: "wh_test",
      secret: "<redacted>",
    });

    const testResponse = await app.inject({
      method: "POST",
      url: "/v1/webhook-endpoints/wh_test/test",
    });
    expect(testResponse.statusCode).toBe(200);
    expect(testResponse.json().request.headers).toEqual(
      expect.objectContaining({
        "X-RedeemLoop-Timestamp": expect.any(String),
        "X-RedeemLoop-Nonce": expect.any(String),
        "X-RedeemLoop-Signature": expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );

    await app.close();
  });

  it("enqueues, signs, delivers, and replays webhook delivery records", async () => {
    const sentRequests: Array<{ rawBody: string; headers: Record<string, string>; body: unknown }> = [];
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      webhookDeliverySender: async (request) => {
        sentRequests.push({
          rawBody: request.rawBody,
          headers: request.headers,
          body: request.body,
        });
        expect(request.headers["X-RedeemLoop-Event-Id"]).toMatch(/^evt_pi_/);
        expect(request.headers["X-RedeemLoop-Delivery-Id"]).toMatch(/^whd_/);
        expect(
          verifyRedeemLoopWebhookSignature(
            "webhook-secret",
            request.headers["X-RedeemLoop-Timestamp"],
            request.headers["X-RedeemLoop-Nonce"],
            request.rawBody,
            request.headers["X-RedeemLoop-Signature"],
          ),
        ).toBe(true);
        return { statusCode: 204, body: "ok" };
      },
      woocommerceStoreUrl: "https://merchant.example",
    });

    await app.inject({
      method: "POST",
      url: "/v1/merchants",
      payload: {
        merchantId: "merchant_webhook",
        name: "Webhook Merchant",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/merchant-vaults",
      payload: {
        vaultId: "vault_webhook",
        merchantId: "merchant_webhook",
        chainNamespace: "eip155",
        chainId: 31337,
        address: operator,
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/entitlements",
      payload: {
        entitlementId: "ent_webhook",
        merchantId: "merchant_webhook",
        name: "Webhook pickup",
        quantity: 1,
        termsHash: "webhook-terms",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/bindings",
      payload: {
        bindingId: "bind_webhook",
        merchantId: "merchant_webhook",
        entitlementId: "ent_webhook",
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: `eip155:31337/erc20:${token}`,
            contract: token,
            requiredAmount: "1",
            termsHash: "webhook-terms",
          },
        ],
        merchantVaults: {
          "eip155:31337": operator,
        },
        settlementPolicy: "collect",
        commerceTargets: [
          {
            platform: "woocommerce",
            storeId: "woo-store",
            sku: "webhook-cup",
          },
        ],
        status: "active",
        termsHash: "webhook-terms",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/webhook-endpoints",
      payload: {
        id: "wh_outbox",
        merchantId: "merchant_webhook",
        url: "https://merchant.example/redeemloop/webhook",
        secret: "webhook-secret",
        events: ["payment_intent.paid"],
      },
    });
    const intentResponse = await app.inject({
      method: "POST",
      url: "/v1/payment-intents",
      payload: {
        bindingId: "bind_webhook",
        orderId: "webhook-42",
        channel: "checkout",
        skuLines: [{ sku: "webhook-cup", quantity: 1 }],
        payerAddress: user.address,
      },
    });
    const intentId = intentResponse.json().intentId as string;
    const proofResponse = await app.inject({
      method: "POST",
      url: "/v1/settlement/proofs",
      payload: {
        intentId,
        txid: "0xwebhook",
        confirmations: 3,
        from: user.address,
        to: operator,
        status: "confirmed",
      },
    });
    expect(proofResponse.statusCode).toBe(201);
    expect(proofResponse.json().webhookEvent).toMatchObject({
      type: "payment_intent.paid",
      merchantId: "merchant_webhook",
      deliveryIds: [expect.stringMatching(/^whd_/)],
    });

    const deliveryId = proofResponse.json().webhookEvent.deliveryIds[0] as string;
    const deliveriesResponse = await app.inject({
      method: "GET",
      url: "/v1/webhook-deliveries?merchantId=merchant_webhook",
    });
    expect(deliveriesResponse.statusCode).toBe(200);
    expect(deliveriesResponse.json()).toHaveLength(1);
    expect(deliveriesResponse.json()[0]).toMatchObject({
      deliveryId,
      status: "pending",
      attempts: 0,
      eventType: "payment_intent.paid",
    });

    const attemptResponse = await app.inject({
      method: "POST",
      url: `/v1/webhook-deliveries/${deliveryId}/attempt`,
    });
    expect(attemptResponse.statusCode).toBe(200);
    expect(attemptResponse.json()).toMatchObject({
      deliveryId,
      status: "delivered",
      attempts: 1,
      responseStatus: 204,
      request: {
        method: "POST",
        url: "https://merchant.example/redeemloop/webhook",
      },
    });
    expect(sentRequests).toHaveLength(1);
    expect(JSON.parse(sentRequests[0].rawBody)).toMatchObject({
      type: "payment_intent.paid",
      merchantId: "merchant_webhook",
      intentId,
      orderId: "webhook-42",
      txHash: "0xwebhook",
    });

    const replayResponse = await app.inject({
      method: "POST",
      url: `/v1/webhook-deliveries/${deliveryId}/replay`,
      payload: {
        attemptNow: true,
      },
    });
    expect(replayResponse.statusCode).toBe(201);
    expect(replayResponse.json()).toMatchObject({
      status: "delivered",
      attempts: 1,
    });
    expect(sentRequests).toHaveLength(2);

    await app.close();
  });

  it("enforces configured and merchant-verified embed origins", async () => {
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      embedAllowedOrigins: ["https://allowed.example"],
    });

    const allowedResponse = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        origin: "https://allowed.example",
      },
    });
    expect(allowedResponse.headers["access-control-allow-origin"]).toBe("https://allowed.example");

    const deniedResponse = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        origin: "https://denied.example",
      },
    });
    expect(deniedResponse.headers["access-control-allow-origin"]).toBeUndefined();

    await app.inject({
      method: "POST",
      url: "/v1/merchants",
      payload: {
        merchantId: "merchant_cafe",
        name: "Merchant Cafe",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/merchants/merchant_cafe/domains/verify",
      payload: {
        domain: "merchant.example",
      },
    });
    const merchantDomainResponse = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        origin: "https://merchant.example",
      },
    });
    expect(merchantDomainResponse.headers["access-control-allow-origin"]).toBe("https://merchant.example");

    await app.close();
  });

  it("reports chain-specific EVM RPC diagnostics without exposing full RPC secrets", async () => {
    const checked: Array<{ chainId: number; rpcUrl?: string }> = [];
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      evmRpcUrls: {
        1: "https://eth.example/rpc/private-key",
        56: "https://bsc.example/rpc",
      },
      evmRpcHealthProvider: async (input) => {
        checked.push(input);
        return { latestBlockNumber: BigInt(input.chainId * 1000) };
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/diagnostics/evm-rpc",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      checkedAt: expect.any(String),
      chains: [
        {
          chainId: 1,
          name: "Ethereum Mainnet",
          status: "ok",
          rpcConfigured: true,
          rpcSource: "EVM_RPC_URLS",
          rpcOrigin: "https://eth.example",
          latestBlockNumber: "1000",
          latencyMs: expect.any(Number),
        },
        {
          chainId: 56,
          status: "ok",
          rpcOrigin: "https://bsc.example",
          latestBlockNumber: "56000",
        },
        {
          chainId: 137,
          status: "missing",
          rpcConfigured: false,
        },
        {
          chainId: 42161,
          status: "missing",
          rpcConfigured: false,
        },
      ],
    });
    expect(JSON.stringify(response.json())).not.toContain("private-key");
    expect(checked.map((item) => item.chainId)).toEqual([1, 56]);

    await app.close();
  });

  it("persists v0.2 merchant, PaymentIntent, proof, and idempotency state across restarts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "redeemloop-api-"));
    const storageFile = join(directory, "state.json");

    try {
      const app = await createApp({
        chainId: 31337,
        dryRun: true,
        storageFile,
        woocommerceStoreUrl: "https://merchant.example",
      });

      await app.inject({
        method: "POST",
        url: "/v1/merchants",
        payload: {
          merchantId: "merchant_persist",
          name: "Persistent Merchant",
        },
      });
      await app.inject({
        method: "POST",
        url: "/v1/merchant-vaults",
        payload: {
          vaultId: "vault_persist",
          merchantId: "merchant_persist",
          chainNamespace: "eip155",
          chainId: 31337,
          address: operator,
        },
      });
      await app.inject({
        method: "POST",
        url: "/v1/entitlements",
        payload: {
          entitlementId: "ent_persist",
          merchantId: "merchant_persist",
          name: "Persistent pickup",
          quantity: 1,
          termsHash: "persist-terms",
        },
      });
      await app.inject({
        method: "POST",
        url: "/v1/bindings",
        payload: {
          bindingId: "bind_persist",
          merchantId: "merchant_persist",
          entitlementId: "ent_persist",
          acceptedAssets: [
            {
              chainNamespace: "eip155",
              chainId: 31337,
              assetType: "erc20",
              assetId: `eip155:31337/erc20:${token}`,
              contract: token,
              requiredAmount: "1",
              termsHash: "persist-terms",
            },
          ],
          merchantVaults: {
            "eip155:31337": operator,
          },
          settlementPolicy: "collect",
          commerceTargets: [
            {
              platform: "woocommerce",
              storeId: "woo-store",
              sku: "persist-cup",
            },
          ],
          status: "active",
          termsHash: "persist-terms",
        },
      });
      const intentResponse = await app.inject({
        method: "POST",
        url: "/v1/payment-intents",
        payload: {
          bindingId: "bind_persist",
          orderId: "persist-42",
          channel: "checkout",
          skuLines: [{ sku: "persist-cup", quantity: 1 }],
          payerAddress: user.address,
        },
      });
      const intentId = intentResponse.json().intentId as string;
      const proofPayload = {
        intentId,
        txid: "0xpersist",
        confirmations: 3,
        from: user.address,
        to: operator,
        status: "confirmed",
      };
      const proofResponse = await app.inject({
        method: "POST",
        url: "/v1/settlement/proofs",
        payload: proofPayload,
      });
      expect(proofResponse.statusCode).toBe(201);
      await app.close();

      const restored = await createApp({
        chainId: 31337,
        dryRun: true,
        storageFile,
        woocommerceStoreUrl: "https://merchant.example",
      });
      const restoredIntent = await restored.inject({
        method: "GET",
        url: `/v1/payment-intents/${intentId}`,
      });
      expect(restoredIntent.statusCode).toBe(200);
      expect(restoredIntent.json()).toMatchObject({
        intentId,
        status: "paid",
      });

      const duplicateProofResponse = await restored.inject({
        method: "POST",
        url: "/v1/settlement/proofs",
        payload: proofPayload,
      });
      expect(duplicateProofResponse.statusCode).toBe(200);
      expect(duplicateProofResponse.json()).toMatchObject({
        duplicate: true,
      });

      await restored.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("enforces merchant-scoped API keys when configured", async () => {
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      apiKeys: {
        merchant_cafe: "secret",
      },
    });

    const missingKeyResponse = await app.inject({
      method: "POST",
      url: "/v1/merchants",
      payload: {
        merchantId: "merchant_cafe",
        name: "Merchant Cafe",
      },
    });
    expect(missingKeyResponse.statusCode).toBe(401);

    const wrongKeyResponse = await app.inject({
      method: "POST",
      url: "/v1/merchants",
      headers: {
        authorization: "Bearer wrong",
      },
      payload: {
        merchantId: "merchant_cafe",
        name: "Merchant Cafe",
      },
    });
    expect(wrongKeyResponse.statusCode).toBe(403);

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/merchants",
      headers: {
        authorization: "Bearer secret",
      },
      payload: {
        merchantId: "merchant_cafe",
        name: "Merchant Cafe",
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const readResponse = await app.inject({
      method: "GET",
      url: "/v1/merchants/merchant_cafe",
      headers: {
        authorization: "Bearer secret",
      },
    });
    expect(readResponse.statusCode).toBe(200);
    expect(readResponse.json()).toMatchObject({
      merchantId: "merchant_cafe",
    });

    await app.close();
  });

  it("rechecks EVM ERC-20 settlement from a trusted receipt provider", async () => {
    const txid = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      evmMinConfirmations: 2,
      evmReceiptProvider: async () => ({
        currentBlockNumber: 15n,
        receipt: {
          transactionHash: txid,
          blockNumber: 14n,
          blockHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          status: "success",
          logs: [
            {
              address: token,
              topics: encodeEventTopics({
                abi: [erc20TransferEvent],
                eventName: "Transfer",
                args: {
                  from: user.address,
                  to: operator,
                },
              }) as Hex[],
              data: encodeAbiParameters([{ type: "uint256" }], [1n]),
              logIndex: 1,
            },
          ],
        },
      }),
      woocommerceStoreUrl: "https://merchant.example",
    });

    await app.inject({
      method: "POST",
      url: "/v1/merchants",
      payload: {
        merchantId: "merchant_evm",
        name: "Trusted EVM Merchant",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/merchant-vaults",
      payload: {
        vaultId: "vault_evm",
        merchantId: "merchant_evm",
        chainNamespace: "eip155",
        chainId: 31337,
        address: operator,
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/entitlements",
      payload: {
        entitlementId: "ent_evm",
        merchantId: "merchant_evm",
        name: "Trusted pickup",
        quantity: 1,
        termsHash: "evm-terms",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/bindings",
      payload: {
        bindingId: "bind_evm",
        merchantId: "merchant_evm",
        entitlementId: "ent_evm",
        acceptedAssets: [
          {
            chainNamespace: "eip155",
            chainId: 31337,
            assetType: "erc20",
            assetId: `eip155:31337/erc20:${token}`,
            contract: token,
            requiredAmount: "1",
            termsHash: "evm-terms",
          },
        ],
        merchantVaults: {
          "eip155:31337": operator,
        },
        settlementPolicy: "collect",
        commerceTargets: [
          {
            platform: "woocommerce",
            storeId: "woo-store",
            sku: "trusted-cup",
          },
        ],
        status: "active",
        termsHash: "evm-terms",
      },
    });
    const intentResponse = await app.inject({
      method: "POST",
      url: "/v1/payment-intents",
      payload: {
        bindingId: "bind_evm",
        orderId: "trusted-42",
        channel: "checkout",
        skuLines: [{ sku: "trusted-cup", quantity: 1 }],
        payerAddress: user.address,
      },
    });
    const intentId = intentResponse.json().intentId as string;
    const transferResponse = await app.inject({
      method: "POST",
      url: `/v1/payment-intents/${intentId}/transfer-requested`,
      payload: {
        payerAddress: user.address,
      },
    });
    expect(transferResponse.statusCode).toBe(200);

    const broadcastResponse = await app.inject({
      method: "POST",
      url: `/v1/payment-intents/${intentId}/broadcasted`,
      payload: {
        txid,
      },
    });
    expect(broadcastResponse.statusCode).toBe(200);
    expect(broadcastResponse.json()).toMatchObject({
      status: "broadcasted",
      broadcastTxid: txid,
    });

    const recheckResponse = await app.inject({
      method: "POST",
      url: `/v1/settlement/evm/recheck/${intentId}`,
    });
    expect(recheckResponse.statusCode).toBe(201);
    expect(recheckResponse.json()).toMatchObject({
      trusted: true,
      txid,
      confirmations: 2,
      status: "confirmed",
      paymentIntent: {
        status: "paid",
      },
      commerce: {
        provider: "woocommerce",
        dryRun: true,
      },
    });

    await app.close();
  });

  it("creates a Bitcoin Rune PaymentIntent and returns an alpha PSBT request", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });

    await app.inject({
      method: "POST",
      url: "/v1/merchants",
      payload: {
        merchantId: "merchant_rune",
        name: "Rune Merchant",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/entitlements",
      payload: {
        entitlementId: "ent_rune",
        merchantId: "merchant_rune",
        name: "Rune pickup",
        quantity: 1,
        termsHash: "rune-terms",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/bindings",
      payload: {
        bindingId: "bind_rune",
        merchantId: "merchant_rune",
        entitlementId: "ent_rune",
        acceptedAssets: [
          {
            chainNamespace: "bitcoin",
            assetType: "rune",
            assetId: "bitcoin/rune:840000:3",
            runeId: "840000:3",
            requiredAmount: "10",
            termsHash: "rune-terms",
          },
        ],
        merchantVaults: {
          bitcoin: "bc1merchant",
        },
        settlementPolicy: "collect",
        commerceTargets: [
          {
            platform: "custom",
            storeId: "rune-store",
            sku: "rune-cup",
          },
        ],
        status: "active",
        termsHash: "rune-terms",
      },
    });
    const intentResponse = await app.inject({
      method: "POST",
      url: "/v1/payment-intents",
      payload: {
        bindingId: "bind_rune",
        orderId: "rune-42",
        channel: "checkout",
        payerAddress: "bc1payer",
      },
    });
    expect(intentResponse.statusCode).toBe(201);
    const intentId = intentResponse.json().intentId as string;

    const transferResponse = await app.inject({
      method: "POST",
      url: `/v1/payment-intents/${intentId}/transfer-requested`,
      payload: {
        payerAddress: "bc1payer",
        network: "testnet",
        feeRate: 8,
        changeAddress: "bc1change",
        runeUtxos: [
          {
            txid: "tx_rune_1",
            vout: 0,
            value: 10_000,
            address: "bc1payer",
            runeId: "840000:3",
            amount: "12",
          },
        ],
      },
    });
    expect(transferResponse.statusCode).toBe(200);
    expect(transferResponse.json()).toMatchObject({
      status: "transfer_requested",
      transfer: {
        to: "bc1merchant",
        amount: "10",
        bitcoin: {
          network: "testnet",
          assetType: "rune",
          runeId: "840000:3",
          amount: "10",
          alpha: true,
          outputs: [
            { address: "bc1merchant", runeAmount: "10", role: "merchant" },
            { address: "bc1change", runeAmount: "2", role: "change" },
          ],
        },
      },
    });
    const decoded = JSON.parse(Buffer.from(transferResponse.json().transfer.bitcoin.psbtBase64, "base64").toString("utf8"));
    expect(decoded).toMatchObject({
      kind: "redeemloop.rune-transfer-alpha",
      network: "testnet",
      runeId: "840000:3",
    });

    await app.close();
  });

  it("trusted-rechecks a Bitcoin Rune txid through the configured Rune indexer", async () => {
    const indexerInputs: unknown[] = [];
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      runeIndexer: {
        async getRuneBalance(address, runeId) {
          return { address, runeId, amount: "10" };
        },
        async listRuneUtxos() {
          return [];
        },
        async getRuneTransferProof(input) {
          indexerInputs.push(input);
          return {
            proofId: `proof_${input.txid}`,
            intentId: input.intentId,
            chainNamespace: input.asset.chainNamespace,
            chainId: input.asset.chainId,
            txid: input.txid,
            confirmations: input.confirmations ?? 1,
            from: input.from,
            to: input.to,
            assetType: "rune",
            assetId: input.asset.assetId,
            amount: input.asset.requiredAmount,
            status: "confirmed",
            rawProof: { indexer: "test" },
          };
        },
      },
    });
    const intentId = await createRunePaymentIntent(app, "recheck");

    const recheckResponse = await app.inject({
      method: "POST",
      url: `/v1/settlement/rune/recheck/${intentId}`,
      payload: { txid: "btc_txid", confirmations: 2 },
    });
    expect(recheckResponse.statusCode).toBe(201);
    expect(recheckResponse.json()).toMatchObject({
      trusted: true,
      txid: "btc_txid",
      confirmations: 2,
      status: "confirmed",
      assetType: "rune",
      paymentIntent: {
        status: "paid",
      },
      commerce: {
        provider: "custom",
        dryRun: true,
      },
    });
    expect(indexerInputs[0]).toMatchObject({
      txid: "btc_txid",
      from: "bc1payer",
      to: "bc1merchant",
      confirmations: 2,
    });

    await app.close();
  });

  it("returns a clear error when Rune settlement recheck has no configured indexer credentials", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });
    const intentId = await createRunePaymentIntent(app, "missing_config");

    const response = await app.inject({
      method: "POST",
      url: `/v1/settlement/rune/recheck/${intentId}`,
      payload: {
        txid: "btc_txid",
        from: "bc1payer",
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("XVERSE_API_KEY");

    await app.close();
  });

  it("creates an intent, verifies the EIP-712 signature, and dry-runs submission", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });

    await registerTerminal(app);
    const intent = await createIntent(app);
    const signature = await user.signTypedData(buildTypedData(intent.authorization, 31337));

    const submitResponse = await app.inject({
      method: "POST",
      url: "/v1/redemptions/submit",
      payload: {
        chainId: 31337,
        authorization: intent.authorization,
        signature,
      },
    });

    expect(submitResponse.statusCode).toBe(200);
    expect(submitResponse.json()).toMatchObject({
      status: "verified",
      dryRun: true,
      txHash: null,
    });

    await app.close();
  });

  it("rejects intents for terminals that are not registered with the relayer", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });

    const response = await app.inject({
      method: "POST",
      url: "/v1/redemptions/intents",
      payload: intentPayload(),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: "Terminal is not registered with this relayer",
    });

    await app.close();
  });

  it("rejects invalid signatures before accepting a redemption submission", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });
    await registerTerminal(app);
    const intent = await createIntent(app);
    const signature = await attacker.signTypedData(buildTypedData(intent.authorization, 31337));

    const response = await app.inject({
      method: "POST",
      url: "/v1/redemptions/submit",
      payload: {
        chainId: 31337,
        authorization: intent.authorization,
        signature,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: "Invalid redemption signature",
    });

    await app.close();
  });

  it("rejects duplicate redemption submissions for the same user token and nonce", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });
    await registerTerminal(app);
    const intent = await createIntent(app);
    const signature = await user.signTypedData(buildTypedData(intent.authorization, 31337));

    const payload = {
      chainId: 31337,
      authorization: intent.authorization,
      signature,
    };

    const firstResponse = await app.inject({
      method: "POST",
      url: "/v1/redemptions/submit",
      payload,
    });
    expect(firstResponse.statusCode).toBe(200);

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/v1/redemptions/submit",
      payload,
    });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({
      error: "Redemption nonce already submitted",
    });

    await app.close();
  });

  it("rejects invalid chain IDs", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });
    await registerTerminal(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/redemptions/intents",
      payload: intentPayload({ chainId: 0 }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("chainId");

    await app.close();
  });

  it("stores and reads the merchant EVM receiving address", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });

    const saveResponse = await saveReceiver(app);
    expect(saveResponse.statusCode).toBe(201);
    expect(saveResponse.json()).toMatchObject({
      chainId: 31337,
      receivingAddress: operator,
    });

    const getResponse = await app.inject({
      method: "GET",
      url: "/v1/merchants/coca-cola-japan/receiving-address?chainId=31337",
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      receivingAddress: operator,
    });

    await app.close();
  });

  it("creates a commerce payment intent with the configured merchant receiver", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });
    await saveReceiver(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/commerce/payment-intents",
      payload: commercePayload({ provider: "shopify", orderId: "148977776" }),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      provider: "shopify",
      chainId: 31337,
      orderId: "148977776",
      merchantReceiver: operator,
      status: "intent_created",
      dryRun: true,
    });

    await app.close();
  });

  it("dry-runs Shopify and WooCommerce mark-as-paid adapters", async () => {
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      shopifyShopDomain: "redeemloop-test.myshopify.com",
      woocommerceStoreUrl: "https://merchant.example",
    });
    await saveReceiver(app);

    const shopifyResponse = await app.inject({
      method: "POST",
      url: "/v1/commerce/confirm",
      payload: commercePayload({ provider: "shopify", orderId: "148977776" }),
    });
    expect(shopifyResponse.statusCode).toBe(200);
    expect(shopifyResponse.json()).toMatchObject({
      provider: "shopify",
      status: "verified",
      commerce: {
        provider: "shopify",
        dryRun: true,
        markedPaid: false,
      },
    });
    expect(shopifyResponse.json().commerce.request.url).toContain("redeemloop-test.myshopify.com/admin/api/2026-04/graphql.json");

    const wooResponse = await app.inject({
      method: "POST",
      url: "/v1/commerce/confirm",
      payload: commercePayload({ provider: "woocommerce", orderId: "42" }),
    });
    expect(wooResponse.statusCode).toBe(200);
    expect(wooResponse.json()).toMatchObject({
      provider: "woocommerce",
      status: "verified",
      commerce: {
        provider: "woocommerce",
        dryRun: true,
        markedPaid: false,
      },
    });
    expect(wooResponse.json().commerce.request).toMatchObject({
      method: "PUT",
      url: "https://merchant.example/wp-json/wc/v3/orders/42",
    });

    await app.close();
  });

  it("rejects commerce payments that do not match the configured merchant receiver", async () => {
    const app = await createApp({ chainId: 31337, dryRun: true });
    await saveReceiver(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/commerce/confirm",
      payload: commercePayload({
        receiver: "0x0000000000000000000000000000000000000bad",
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("configured merchant receiving address");

    await app.close();
  });

  it("verifies Shopify and WooCommerce mark-as-paid webhook signatures", async () => {
    const app = await createApp({
      chainId: 31337,
      dryRun: true,
      shopifyWebhookSecret: "shopify-secret",
      woocommerceWebhookSecret: "woocommerce-secret",
    });

    const shopifyPayload = JSON.stringify({
      id: 148977776,
      admin_graphql_api_id: "gid://shopify/Order/148977776",
      merchantId: "shopify-webhook",
      receiver: operator,
      voucherToken: token,
      amount: "1",
    });
    const shopifyResponse = await app.inject({
      method: "POST",
      url: "/v1/webhooks/shopify/mark-as-paid",
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": hmacSha256Base64("shopify-secret", shopifyPayload),
      },
      payload: shopifyPayload,
    });
    expect(shopifyResponse.statusCode).toBe(200);
    expect(shopifyResponse.json()).toMatchObject({
      provider: "shopify",
      orderId: "gid://shopify/Order/148977776",
      status: "verified",
    });

    const wooPayload = JSON.stringify({
      id: 42,
      merchantId: "woocommerce-webhook",
      receiver: operator,
      voucherToken: token,
      amount: "1",
    });
    const wooResponse = await app.inject({
      method: "POST",
      url: "/v1/webhooks/woocommerce/mark-as-paid",
      headers: {
        "content-type": "application/json",
        "x-wc-webhook-signature": hmacSha256Base64("woocommerce-secret", wooPayload),
      },
      payload: wooPayload,
    });
    expect(wooResponse.statusCode).toBe(200);
    expect(wooResponse.json()).toMatchObject({
      provider: "woocommerce",
      orderId: "42",
      status: "verified",
    });

    const badResponse = await app.inject({
      method: "POST",
      url: "/v1/webhooks/shopify/mark-as-paid",
      headers: {
        "content-type": "application/json",
        "x-shopify-hmac-sha256": "bad-signature",
      },
      payload: shopifyPayload,
    });
    expect(badResponse.statusCode).toBe(401);

    await app.close();
  });
});

async function registerTerminal(app: Awaited<ReturnType<typeof createApp>>) {
  const terminalResponse = await app.inject({
    method: "POST",
    url: "/v1/terminals/register",
    payload: {
      merchantId: "coca-cola-japan",
      storeId: "tokyo-store-001",
      terminalId: "pos-07",
      operatorWallet: operator,
    },
  });
  expect(terminalResponse.statusCode).toBe(201);
}

async function saveReceiver(app: Awaited<ReturnType<typeof createApp>>) {
  return app.inject({
    method: "POST",
    url: "/v1/merchants/coca-cola-japan/receiving-address",
    payload: {
      chainId: 31337,
      receivingAddress: operator,
    },
  });
}

async function createIntent(app: Awaited<ReturnType<typeof createApp>>) {
  const intentResponse = await app.inject({
    method: "POST",
    url: "/v1/redemptions/intents",
    payload: intentPayload(),
  });
  expect(intentResponse.statusCode).toBe(201);
  return intentResponse.json() as { authorization: RedeemAuthorizationJson };
}

async function createRunePaymentIntent(app: Awaited<ReturnType<typeof createApp>>, suffix: string): Promise<string> {
  const merchantId = `merchant_rune_${suffix}`;
  const entitlementId = `ent_rune_${suffix}`;
  const bindingId = `bind_rune_${suffix}`;
  await app.inject({
    method: "POST",
    url: "/v1/merchants",
    payload: {
      merchantId,
      name: "Rune Merchant",
    },
  });
  await app.inject({
    method: "POST",
    url: "/v1/entitlements",
    payload: {
      entitlementId,
      merchantId,
      name: "Rune pickup",
      quantity: 1,
      termsHash: "rune-terms",
    },
  });
  await app.inject({
    method: "POST",
    url: "/v1/bindings",
    payload: {
      bindingId,
      merchantId,
      entitlementId,
      acceptedAssets: [
        {
          chainNamespace: "bitcoin",
          assetType: "rune",
          assetId: "bitcoin/rune:840000:3",
          runeId: "840000:3",
          runeName: "UNCOMMON•GOODS",
          requiredAmount: "10",
          termsHash: "rune-terms",
        },
      ],
      merchantVaults: {
        bitcoin: "bc1merchant",
      },
      settlementPolicy: "collect",
      commerceTargets: [
        {
          platform: "custom",
          storeId: `rune-store-${suffix}`,
          sku: "rune-cup",
        },
      ],
      status: "active",
      termsHash: "rune-terms",
    },
  });
  const intentResponse = await app.inject({
    method: "POST",
    url: "/v1/payment-intents",
    payload: {
      bindingId,
      orderId: `rune-${suffix}`,
      channel: "checkout",
      payerAddress: "bc1payer",
    },
  });
  expect(intentResponse.statusCode).toBe(201);
  return intentResponse.json().intentId as string;
}

function commercePayload(overrides: Record<string, unknown> = {}) {
  return {
    provider: "shopify",
    chainId: 31337,
    merchantId: "coca-cola-japan",
    orderId: "148977776",
    voucherToken: token,
    amount: "1",
    receiver: operator,
    ...overrides,
  };
}

function intentPayload(overrides: Record<string, unknown> = {}) {
  return {
    chainId: 31337,
    user: user.address,
    token,
    amount: "1",
    merchantId: "coca-cola-japan",
    storeId: "tokyo-store-001",
    terminalId: "pos-07",
    termsHash: "coke-bottle-2026",
    redemptionMode: "COLLECT",
    ...overrides,
  };
}
