import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { createApp } from "../src/app.js";
import { hmacSha256Base64 } from "../src/commerce.js";
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
