import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import {
  type Address,
  type Hex,
  createWalletClient,
  http,
  parseAbi,
  isHex,
  size,
  verifyTypedData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  type CommerceAdapterConfig,
  type CommerceMarkAsPaidInput,
  type CommerceProvider,
  extractShopifyOrderId,
  extractWooCommerceOrderId,
  markCommerceOrderAsPaid,
  normalizeProvider,
  optionalString,
  requireString,
  verifyBase64HmacSha256,
} from "./commerce.js";
import {
  type RedemptionIntentInput,
  type RedeemAuthorizationJson,
  buildTypedData,
  buildTypedDataJson,
  normalizeAddress,
  normalizeAmount,
  normalizeBytes32,
  normalizeChainId,
  normalizeDeadlineSeconds,
  normalizeMode,
  normalizeUintString,
  toContractAuthorization,
} from "./typedData.js";

interface ApiConfig {
  chainId: number;
  rpcUrl?: string;
  relayerPrivateKey?: Hex;
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

interface SubmitBody {
  chainId?: number;
  authorization: RedeemAuthorizationJson;
  signature: Hex;
}

interface MerchantReceiverRecord {
  merchantId: Hex;
  chainId: number;
  receivingAddress: Address;
  updatedAt: string;
}

interface CommercePaymentRecord {
  paymentId: string;
  provider: CommerceProvider;
  merchantId: Hex;
  chainId: number;
  orderId: string;
  voucherToken: Address;
  amount: string;
  receiver: Address;
  status: "intent_created" | "verified" | "paid";
  dryRun: boolean;
  txHash?: Hex;
  redemptionId?: string;
  createdAt: string;
  updatedAt: string;
}

const voucherAbi = parseAbi([
  "function collectWithAuthorization((address user,address voucherToken,uint256 tokenId,uint256 amount,bytes32 merchantId,bytes32 storeId,bytes32 terminalId,bytes32 termsHash,uint8 redemptionMode,uint256 nonce,uint256 deadline) authorization, bytes signature) returns (bytes32)",
  "function burnWithAuthorization((address user,address voucherToken,uint256 tokenId,uint256 amount,bytes32 merchantId,bytes32 storeId,bytes32 terminalId,bytes32 termsHash,uint8 redemptionMode,uint256 nonce,uint256 deadline) authorization, bytes signature) returns (bytes32)",
]);

export async function createApp(config: Partial<ApiConfig> = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const registeredTerminals = new Set<string>();
  const redemptionSubmissions = new Set<string>();
  const merchantReceivers = new Map<string, MerchantReceiverRecord>();
  const commercePayments = new Map<string, CommercePaymentRecord>();
  const resolvedConfig: ApiConfig = {
    chainId: normalizeChainId(config.chainId ?? process.env.CHAIN_ID ?? 31337),
    rpcUrl: config.rpcUrl ?? process.env.RPC_URL,
    relayerPrivateKey: config.relayerPrivateKey ?? (process.env.RELAYER_PRIVATE_KEY as Hex | undefined),
    dryRun: config.dryRun ?? process.env.RELAYER_DRY_RUN !== "false",
    shopifyShopDomain: config.shopifyShopDomain ?? process.env.SHOPIFY_SHOP_DOMAIN,
    shopifyAdminAccessToken: config.shopifyAdminAccessToken ?? process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    shopifyApiVersion: config.shopifyApiVersion ?? process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-04",
    shopifyWebhookSecret: config.shopifyWebhookSecret ?? process.env.SHOPIFY_WEBHOOK_SECRET,
    woocommerceStoreUrl: config.woocommerceStoreUrl ?? process.env.WOOCOMMERCE_STORE_URL,
    woocommerceConsumerKey: config.woocommerceConsumerKey ?? process.env.WOOCOMMERCE_CONSUMER_KEY,
    woocommerceConsumerSecret: config.woocommerceConsumerSecret ?? process.env.WOOCOMMERCE_CONSUMER_SECRET,
    woocommerceWebhookSecret: config.woocommerceWebhookSecret ?? process.env.WOOCOMMERCE_WEBHOOK_SECRET,
  };

  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    try {
      const rawBody = typeof body === "string" ? body : String(body ?? "");
      const parsed = rawBody ? JSON.parse(rawBody) : {};
      if (parsed && typeof parsed === "object") {
        Object.defineProperty(parsed, "__rawBody", { value: rawBody, enumerable: false });
      }
      done(null, parsed);
    } catch (error) {
      done(error as Error);
    }
  });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    ok: true,
    service: "redeemloop-api",
    chainId: resolvedConfig.chainId,
    dryRun: resolvedConfig.dryRun,
  }));

  app.get("/v1/config", async () => ({
    chainId: resolvedConfig.chainId,
    dryRun: resolvedConfig.dryRun,
  }));

  app.post("/v1/merchants/:merchantId/receiving-address", async (request, reply) => {
    try {
      const params = request.params as { merchantId: string };
      const body = request.body as { chainId?: number; receivingAddress?: string };
      const merchantId = normalizeBytes32(params.merchantId, "merchantId");
      const chainId = normalizeChainId(body.chainId ?? resolvedConfig.chainId);
      const receivingAddress = normalizeAddress(requireString(body.receivingAddress, "receivingAddress"), "receivingAddress");
      const record: MerchantReceiverRecord = {
        merchantId,
        chainId,
        receivingAddress,
        updatedAt: new Date().toISOString(),
      };

      merchantReceivers.set(receiverKey(merchantId, chainId), record);
      return reply.code(201).send(record);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/merchants/:merchantId/receiving-address", async (request, reply) => {
    try {
      const params = request.params as { merchantId: string };
      const query = request.query as { chainId?: string };
      const merchantId = normalizeBytes32(params.merchantId, "merchantId");
      const chainId = normalizeChainId(query.chainId ?? resolvedConfig.chainId);
      const record = merchantReceivers.get(receiverKey(merchantId, chainId));
      if (!record) {
        return reply.code(404).send({ error: "Merchant receiving address is not configured" });
      }
      return record;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/terminals/register", async (request, reply) => {
    try {
      const body = request.body as {
        merchantId: string;
        storeId: string;
        terminalId: string;
        operatorWallet: string;
      };
      const merchantId = normalizeBytes32(body.merchantId, "merchantId");
      const storeId = normalizeBytes32(body.storeId, "storeId");
      const terminalId = normalizeBytes32(body.terminalId, "terminalId");
      const operatorWallet = normalizeAddress(body.operatorWallet, "operatorWallet");

      registeredTerminals.add(terminalKey(merchantId, storeId, terminalId));

      return reply.code(201).send({
        merchantId,
        storeId,
        terminalId,
        operatorWallet,
        status: "registered",
      });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/commerce/payment-intents", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const payment = createCommercePayment(body, resolvedConfig, merchantReceivers);
      commercePayments.set(payment.paymentId, payment);

      return reply.code(201).send({
        ...payment,
        merchantReceiver: payment.receiver,
      });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/commerce/confirm", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const payment = createCommercePayment(body, resolvedConfig, merchantReceivers);
      const adapterConfig = commerceAdapterConfig(resolvedConfig, body.dryRun === true);
      const markAsPaidInput = toMarkAsPaidInput(payment);
      const commerce = await markCommerceOrderAsPaid(markAsPaidInput, adapterConfig);
      const updated: CommercePaymentRecord = {
        ...payment,
        status: commerce.markedPaid ? "paid" : "verified",
        dryRun: commerce.dryRun,
        updatedAt: new Date().toISOString(),
      };

      commercePayments.set(updated.paymentId, updated);
      return {
        ...updated,
        commerce,
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/webhooks/shopify/mark-as-paid", async (request, reply) => {
    try {
      if (!verifyOptionalWebhookSecret(resolvedConfig.shopifyWebhookSecret, rawBodyOf(request.body), request.headers["x-shopify-hmac-sha256"])) {
        return reply.code(401).send({ error: "Invalid Shopify webhook signature" });
      }

      const body = request.body as Record<string, unknown>;
      const orderId = extractShopifyOrderId(body);
      const payment = createCommercePayment(
        {
          ...body,
          provider: "shopify",
          orderId,
          merchantId: optionalString(body.merchantId, "merchantId") ?? "shopify-webhook",
          chainId: body.chainId ?? resolvedConfig.chainId,
          voucherToken: optionalString(body.voucherToken, "voucherToken") ?? "0x0000000000000000000000000000000000000001",
          amount: optionalString(body.amount, "amount") ?? "1",
        },
        resolvedConfig,
        merchantReceivers,
      );
      const commerce = await markCommerceOrderAsPaid(toMarkAsPaidInput(payment), commerceAdapterConfig(resolvedConfig, body.dryRun === true));
      const updated: CommercePaymentRecord = {
        ...payment,
        status: commerce.markedPaid ? "paid" : "verified",
        dryRun: commerce.dryRun,
        updatedAt: new Date().toISOString(),
      };
      commercePayments.set(updated.paymentId, updated);

      return {
        ...updated,
        commerce,
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/webhooks/woocommerce/mark-as-paid", async (request, reply) => {
    try {
      if (!verifyOptionalWebhookSecret(resolvedConfig.woocommerceWebhookSecret, rawBodyOf(request.body), request.headers["x-wc-webhook-signature"])) {
        return reply.code(401).send({ error: "Invalid WooCommerce webhook signature" });
      }

      const body = request.body as Record<string, unknown>;
      const orderId = extractWooCommerceOrderId(body);
      const payment = createCommercePayment(
        {
          ...body,
          provider: "woocommerce",
          orderId,
          merchantId: optionalString(body.merchantId, "merchantId") ?? "woocommerce-webhook",
          chainId: body.chainId ?? resolvedConfig.chainId,
          voucherToken: optionalString(body.voucherToken, "voucherToken") ?? "0x0000000000000000000000000000000000000001",
          amount: optionalString(body.amount, "amount") ?? "1",
        },
        resolvedConfig,
        merchantReceivers,
      );
      const commerce = await markCommerceOrderAsPaid(toMarkAsPaidInput(payment), commerceAdapterConfig(resolvedConfig, body.dryRun === true));
      const updated: CommercePaymentRecord = {
        ...payment,
        status: commerce.markedPaid ? "paid" : "verified",
        dryRun: commerce.dryRun,
        updatedAt: new Date().toISOString(),
      };
      commercePayments.set(updated.paymentId, updated);

      return {
        ...updated,
        commerce,
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/redemptions/intents", async (request, reply) => {
    try {
      const body = request.body as RedemptionIntentInput;
      const chainId = normalizeChainId(body.chainId ?? resolvedConfig.chainId);
      const authorization = createAuthorization(body);

      if (!registeredTerminals.has(terminalKey(authorization.merchantId, authorization.storeId, authorization.terminalId))) {
        return reply.code(403).send({ error: "Terminal is not registered with this relayer" });
      }

      return reply.code(201).send({
        authorization,
        typedData: buildTypedDataJson(authorization, chainId),
        expiresAt: new Date(Number(authorization.deadline) * 1000).toISOString(),
      });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/redemptions/submit", async (request, reply) => {
    try {
      const body = request.body as SubmitBody;
      const chainId = normalizeChainId(body.chainId ?? resolvedConfig.chainId);
      const authorization = normalizeAuthorizationPayload(body.authorization);
      const signature = normalizeSignature(body.signature);

      if (!registeredTerminals.has(terminalKey(authorization.merchantId, authorization.storeId, authorization.terminalId))) {
        return reply.code(403).send({ error: "Terminal is not registered with this relayer" });
      }

      if (redemptionSubmissions.has(redemptionKey(authorization))) {
        return reply.code(409).send({ error: "Redemption nonce already submitted" });
      }

      const validSignature = await verifyTypedData({
        ...buildTypedData(authorization, chainId),
        address: authorization.user,
        signature,
      });

      if (!validSignature) {
        return reply.code(401).send({ error: "Invalid redemption signature" });
      }

      if (BigInt(authorization.deadline) < BigInt(Math.floor(Date.now() / 1000))) {
        return reply.code(400).send({ error: "Redemption authorization expired" });
      }

      redemptionSubmissions.add(redemptionKey(authorization));

      if (resolvedConfig.dryRun || !resolvedConfig.rpcUrl || !resolvedConfig.relayerPrivateKey) {
        return {
          status: "verified",
          dryRun: true,
          txHash: null,
        };
      }

      const account = privateKeyToAccount(resolvedConfig.relayerPrivateKey);
      const walletClient = createWalletClient({
        account,
        transport: http(resolvedConfig.rpcUrl),
      });
      const functionName = authorization.redemptionMode === 1 ? "collectWithAuthorization" : "burnWithAuthorization";
      const txHash = await walletClient.writeContract({
        address: authorization.voucherToken,
        abi: voucherAbi,
        functionName,
        chain: null,
        args: [toContractAuthorization(authorization), signature],
      });

      return {
        status: "submitted",
        dryRun: false,
        txHash,
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  return app;
}

function createAuthorization(input: RedemptionIntentInput): RedeemAuthorizationJson {
  const deadlineSeconds = normalizeDeadlineSeconds(input.deadlineSeconds);
  const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

  return {
    user: normalizeAddress(input.user, "user"),
    voucherToken: normalizeAddress(input.token, "token"),
    tokenId: "0",
    amount: normalizeAmount(input.amount),
    merchantId: normalizeBytes32(input.merchantId, "merchantId"),
    storeId: normalizeBytes32(input.storeId, "storeId"),
    terminalId: normalizeBytes32(input.terminalId, "terminalId"),
    termsHash: normalizeBytes32(input.termsHash, "termsHash"),
    redemptionMode: normalizeMode(input.redemptionMode),
    nonce: randomNonce(),
    deadline: String(deadline),
  };
}

function createCommercePayment(
  input: Record<string, unknown>,
  config: ApiConfig,
  merchantReceivers: Map<string, MerchantReceiverRecord>,
): CommercePaymentRecord {
  const provider = normalizeProvider(input.provider);
  const chainId = normalizeChainId(input.chainId ?? config.chainId);
  const merchantId = normalizeBytes32(requireString(input.merchantId, "merchantId"), "merchantId");
  const orderId = requireString(input.orderId, "orderId");
  const voucherToken = normalizeAddress(requireString(input.voucherToken, "voucherToken"), "voucherToken");
  const amount = normalizeAmount(requireString(input.amount, "amount"));
  const configuredReceiver = merchantReceivers.get(receiverKey(merchantId, chainId));
  const requestedReceiver = optionalString(input.receiver ?? input.merchantReceiver, "receiver");
  const receiver = normalizeCommerceReceiver(configuredReceiver, requestedReceiver);
  const now = new Date().toISOString();

  return {
    paymentId: optionalString(input.paymentId, "paymentId") ?? randomPaymentId(),
    provider,
    merchantId,
    chainId,
    orderId,
    voucherToken,
    amount,
    receiver,
    status: "intent_created",
    dryRun: config.dryRun || input.dryRun === true,
    txHash: normalizeOptionalHex(input.txHash, "txHash"),
    redemptionId: optionalString(input.redemptionId, "redemptionId"),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeCommerceReceiver(configuredReceiver: MerchantReceiverRecord | undefined, requestedReceiver: string | undefined): Address {
  if (!configuredReceiver && !requestedReceiver) {
    throw new Error("receiver is required when merchant receiving address is not configured");
  }
  if (!configuredReceiver) {
    return normalizeAddress(requestedReceiver ?? "", "receiver");
  }
  if (!requestedReceiver) {
    return configuredReceiver.receivingAddress;
  }
  const receiver = normalizeAddress(requestedReceiver, "receiver");
  if (receiver !== configuredReceiver.receivingAddress) {
    throw new Error("receiver must match the configured merchant receiving address");
  }
  return receiver;
}

function commerceAdapterConfig(config: ApiConfig, forceDryRun = false): CommerceAdapterConfig {
  return {
    dryRun: config.dryRun || forceDryRun,
    shopifyShopDomain: config.shopifyShopDomain,
    shopifyAdminAccessToken: config.shopifyAdminAccessToken,
    shopifyApiVersion: config.shopifyApiVersion,
    shopifyWebhookSecret: config.shopifyWebhookSecret,
    woocommerceStoreUrl: config.woocommerceStoreUrl,
    woocommerceConsumerKey: config.woocommerceConsumerKey,
    woocommerceConsumerSecret: config.woocommerceConsumerSecret,
    woocommerceWebhookSecret: config.woocommerceWebhookSecret,
  };
}

function toMarkAsPaidInput(payment: CommercePaymentRecord): CommerceMarkAsPaidInput {
  return {
    provider: payment.provider,
    orderId: payment.orderId,
    paymentId: payment.paymentId,
    merchantId: payment.merchantId,
    chainId: payment.chainId,
    voucherToken: payment.voucherToken,
    amount: payment.amount,
    receiver: payment.receiver,
    txHash: payment.txHash,
    redemptionId: payment.redemptionId,
  };
}

function normalizeAuthorizationPayload(input: RedeemAuthorizationJson): RedeemAuthorizationJson {
  if (!input) throw new Error("authorization is required");
  return {
    user: normalizeAddress(input.user, "authorization.user"),
    voucherToken: normalizeAddress(input.voucherToken, "authorization.voucherToken"),
    tokenId: normalizeUintString(input.tokenId, "authorization.tokenId"),
    amount: normalizeAmount(input.amount, "authorization.amount"),
    merchantId: normalizeBytes32(input.merchantId, "authorization.merchantId"),
    storeId: normalizeBytes32(input.storeId, "authorization.storeId"),
    terminalId: normalizeBytes32(input.terminalId, "authorization.terminalId"),
    termsHash: normalizeBytes32(input.termsHash, "authorization.termsHash"),
    redemptionMode: normalizeMode(input.redemptionMode),
    nonce: normalizeUintString(input.nonce, "authorization.nonce"),
    deadline: normalizeUintString(input.deadline, "authorization.deadline"),
  };
}

function normalizeSignature(signature: Hex): Hex {
  if (!isHex(signature)) throw new Error("signature must be hex");
  const byteLength = size(signature);
  if (byteLength !== 64 && byteLength !== 65) {
    throw new Error("signature must be 64 or 65 bytes");
  }
  return signature;
}

function normalizeOptionalHex(value: unknown, fieldName: string): Hex | undefined {
  const normalized = optionalString(value, fieldName);
  if (!normalized) return undefined;
  if (!isHex(normalized)) throw new Error(`${fieldName} must be hex`);
  return normalized;
}

function randomNonce(): string {
  return BigInt(`0x${randomBytes(16).toString("hex")}`).toString();
}

function randomPaymentId(): string {
  return `pay_${randomBytes(12).toString("hex")}`;
}

function terminalKey(merchantId: Hex, storeId: Hex, terminalId: Hex): string {
  return `${merchantId}:${storeId}:${terminalId}`;
}

function receiverKey(merchantId: Hex, chainId: number): string {
  return `${merchantId}:${chainId}`;
}

function redemptionKey(authorization: RedeemAuthorizationJson): string {
  return `${authorization.user}:${authorization.voucherToken}:${authorization.nonce}`;
}

function rawBodyOf(body: unknown): string {
  if (body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "__rawBody")) {
    return (body as { __rawBody: string }).__rawBody;
  }
  return JSON.stringify(body ?? {});
}

function verifyOptionalWebhookSecret(secret: string | undefined, rawBody: string, signatureHeader: string | string[] | undefined): boolean {
  if (!secret) return true;
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  return verifyBase64HmacSha256(secret, rawBody, signature);
}

function errorBody(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : "Unexpected API error" };
}
