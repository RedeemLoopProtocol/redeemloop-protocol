import { createHmac, timingSafeEqual } from "node:crypto";
import type { Address, Hex } from "viem";

export type CommerceProvider = "shopify" | "woocommerce" | "custom";

export interface CommerceAdapterConfig {
  dryRun: boolean;
  shopifyShopDomain?: string;
  shopifyAdminAccessToken?: string;
  shopifyApiVersion: string;
  shopifyWebhookSecret?: string;
  woocommerceStoreUrl?: string;
  woocommerceConsumerKey?: string;
  woocommerceConsumerSecret?: string;
  woocommerceWebhookSecret?: string;
}

export interface CommerceMarkAsPaidInput {
  provider: CommerceProvider;
  orderId: string;
  paymentId: string;
  merchantId: Hex;
  chainId: number;
  voucherToken: Address;
  amount: string;
  receiver: Address;
  txHash?: Hex;
  redemptionId?: string;
}

export interface CommerceMarkAsPaidResult {
  provider: CommerceProvider;
  orderId: string;
  markedPaid: boolean;
  dryRun: boolean;
  request: {
    method: "POST" | "PUT";
    url: string;
    headers: string[];
    body: unknown;
  };
  response?: unknown;
}

export function normalizeProvider(value: unknown): CommerceProvider {
  if (value === "shopify" || value === "woocommerce" || value === "custom") return value;
  throw new Error("provider must be shopify, woocommerce, or custom");
}

export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  return value.trim();
}

export function hmacSha256Base64(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
}

export function verifyBase64HmacSha256(secret: string, rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const provided = Buffer.from(signature, "base64");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(expected, provided);
}

export async function markCommerceOrderAsPaid(
  input: CommerceMarkAsPaidInput,
  config: CommerceAdapterConfig,
): Promise<CommerceMarkAsPaidResult> {
  if (input.provider === "shopify") {
    return markShopifyOrderAsPaid(input, config);
  }
  if (input.provider === "woocommerce") {
    return markWooCommerceOrderAsPaid(input, config);
  }
  return customMarkAsPaid(input, config);
}

export function extractShopifyOrderId(payload: unknown): string {
  const body = payload as Record<string, unknown>;
  const orderGid = optionalString(body.admin_graphql_api_id, "admin_graphql_api_id");
  if (orderGid) return orderGid;
  return requireString(body.id, "orderId");
}

export function extractWooCommerceOrderId(payload: unknown): string {
  const body = payload as Record<string, unknown>;
  const nestedOrder = body.order as Record<string, unknown> | undefined;
  if (nestedOrder?.id !== undefined) return requireString(String(nestedOrder.id), "order.id");
  return requireString(String(body.id ?? ""), "orderId");
}

function markShopifyOrderAsPaid(
  input: CommerceMarkAsPaidInput,
  config: CommerceAdapterConfig,
): Promise<CommerceMarkAsPaidResult> {
  const shopDomain = config.shopifyShopDomain ?? "example.myshopify.com";
  const url = `https://${shopDomain}/admin/api/${config.shopifyApiVersion}/graphql.json`;
  const body = {
    query: `
      mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
        orderMarkAsPaid(input: $input) {
          userErrors {
            field
            message
          }
          order {
            id
            name
            displayFinancialStatus
          }
        }
      }
    `,
    variables: {
      input: {
        id: toShopifyOrderGid(input.orderId),
      },
    },
  };
  const request = {
    method: "POST" as const,
    url,
    headers: ["Content-Type: application/json", "X-Shopify-Access-Token: <redacted>"],
    body,
  };

  if (config.dryRun || !config.shopifyShopDomain || !config.shopifyAdminAccessToken) {
    return Promise.resolve({
      provider: "shopify",
      orderId: input.orderId,
      markedPaid: false,
      dryRun: true,
      request,
    });
  }

  return postJson(url, body, {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": config.shopifyAdminAccessToken,
  }).then((response) => ({
    provider: "shopify" as const,
    orderId: input.orderId,
    markedPaid: true,
    dryRun: false,
    request,
    response,
  }));
}

function markWooCommerceOrderAsPaid(
  input: CommerceMarkAsPaidInput,
  config: CommerceAdapterConfig,
): Promise<CommerceMarkAsPaidResult> {
  const storeUrl = normalizeStoreUrl(config.woocommerceStoreUrl ?? "https://example.com");
  const url = `${storeUrl}/wp-json/wc/v3/orders/${encodeURIComponent(input.orderId)}`;
  const body = {
    set_paid: true,
    status: "processing",
    meta_data: [
      { key: "_redeemloop_payment_id", value: input.paymentId },
      { key: "_redeemloop_merchant_id", value: input.merchantId },
      { key: "_redeemloop_chain_id", value: String(input.chainId) },
      { key: "_redeemloop_voucher_token", value: input.voucherToken },
      { key: "_redeemloop_receiver", value: input.receiver },
      { key: "_redeemloop_amount", value: input.amount },
      { key: "_redeemloop_tx_hash", value: input.txHash ?? "" },
      { key: "_redeemloop_redemption_id", value: input.redemptionId ?? "" },
    ],
  };
  const request = {
    method: "PUT" as const,
    url,
    headers: ["Content-Type: application/json", "Authorization: Basic <redacted>"],
    body,
  };

  if (config.dryRun || !config.woocommerceStoreUrl || !config.woocommerceConsumerKey || !config.woocommerceConsumerSecret) {
    return Promise.resolve({
      provider: "woocommerce",
      orderId: input.orderId,
      markedPaid: false,
      dryRun: true,
      request,
    });
  }

  const credentials = Buffer.from(`${config.woocommerceConsumerKey}:${config.woocommerceConsumerSecret}`).toString("base64");
  return postJson(url, body, {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  }, "PUT").then((response) => ({
    provider: "woocommerce" as const,
    orderId: input.orderId,
    markedPaid: true,
    dryRun: false,
    request,
    response,
  }));
}

function customMarkAsPaid(input: CommerceMarkAsPaidInput, config: CommerceAdapterConfig): CommerceMarkAsPaidResult {
  return {
    provider: "custom",
    orderId: input.orderId,
    markedPaid: !config.dryRun,
    dryRun: config.dryRun,
    request: {
      method: "POST",
      url: "redeemloop://custom-commerce/mark-as-paid",
      headers: ["Content-Type: application/json"],
      body: {
        paymentId: input.paymentId,
        orderId: input.orderId,
        merchantId: input.merchantId,
        chainId: input.chainId,
        voucherToken: input.voucherToken,
        amount: input.amount,
        receiver: input.receiver,
        txHash: input.txHash ?? null,
        redemptionId: input.redemptionId ?? null,
      },
    },
  };
}

async function postJson(url: string, body: unknown, headers: Record<string, string>, method: "POST" | "PUT" = "POST") {
  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Commerce adapter request failed with ${response.status}`);
  }
  return payload;
}

function toShopifyOrderGid(orderId: string): string {
  if (orderId.startsWith("gid://shopify/Order/")) return orderId;
  return `gid://shopify/Order/${orderId}`;
}

function normalizeStoreUrl(url: string): string {
  return url.replace(/\/+$/, "");
}
