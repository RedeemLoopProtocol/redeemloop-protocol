import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  buildErc20BalanceCheckRequest,
  buildErc20TransferRequest,
  buildRuneTransferPsbtRequest,
  createXverseRuneIndexerAdapter,
  redeemLoopEvmChains,
  verifyErc20TransferReceipt,
  type Erc20BalanceCheckRequest,
  type Erc20TransactionReceiptLike,
  type Erc20TransferRequest,
  type BitcoinNetwork,
  type RuneIndexerAdapter,
  type RuneIndexerNetwork,
  type RuneTransferPsbtRequest,
  type RuneUtxo,
} from "@redeemloop/adapters";
import {
  type CommerceTarget,
  type BindingStatus,
  type Entitlement,
  type PaymentIntentStatus,
  type RedeemLoopPaymentIntent,
  type RedemptionBinding,
  type VoucherAssetDescriptor,
  type VoucherPaymentProof,
  assertTransition,
  assertValidEntitlement,
  assertValidPaymentIntent,
  assertValidRedemptionBinding,
  assertValidVoucherAssetDescriptor,
  assertValidVoucherPaymentProof,
  canTransition,
  markPaidIdempotencyKey,
  proofIdempotencyKey,
  transitionPaymentIntent,
} from "@redeemloop/core";
import {
  type Address,
  type Hex,
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  isHex,
  size,
  verifyMessage,
  verifyTypedData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  type CommerceAdapterConfig,
  type CommerceMarkAsPaidInput,
  type CommerceProvider,
  extractShopifyOrderId,
  extractWooCommerceOrderId,
  getShopifyAdapterDiagnostics,
  markCommerceOrderAsPaid,
  normalizeProvider,
  optionalString,
  redeemLoopWebhookSignature as signRedeemLoopWebhook,
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
import { createApiPersistence, type ApiPersistence, type RedeemLoopApiSnapshot } from "./persistence.js";

interface ApiConfig {
  chainId: number;
  rpcUrl?: string;
  evmRpcUrls: Record<number, string>;
  relayerPrivateKey?: Hex;
  dryRun: boolean;
  embedAllowedOrigins: string[];
  storageFile?: string;
  databaseUrl?: string;
  databaseSnapshotKey?: string;
  persistence?: ApiPersistence;
  apiKeys: Record<string, string>;
  evmMinConfirmations: number;
  evmReceiptProvider?: (input: { txid: Hex; chainId: number; rpcUrl?: string }) => Promise<{
    receipt: Erc20TransactionReceiptLike;
    currentBlockNumber?: bigint | number;
  }>;
  evmRpcHealthProvider?: (input: { chainId: number; rpcUrl?: string }) => Promise<{
    latestBlockNumber?: bigint | number;
  }>;
  runeIndexer?: RuneIndexerAdapter;
  xverseApiKey?: string;
  xverseNetwork: RuneIndexerNetwork;
  xverseApiBaseUrl?: string;
  webhookMaxAttempts: number;
  webhookDeliveryLeaseMs: number;
  webhookRequestTimeoutMs: number;
  webhookDeliverySender?: (request: WebhookDeliveryRequest) => Promise<WebhookDeliverySenderResult>;
  shopifyShopDomain?: string;
  shopifyAdminAccessToken?: string;
  shopifyApiVersion: string;
  shopifyWebhookSecret?: string;
  woocommerceStoreUrl?: string;
  woocommerceConsumerKey?: string;
  woocommerceConsumerSecret?: string;
  woocommerceWebhookSecret?: string;
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

type WebhookDeliveryStatus = "pending" | "processing" | "delivered" | "failed" | "dead_letter";

interface WebhookDeliveryRequest {
  deliveryId: string;
  eventId: string;
  eventType: string;
  url: string;
  headers: Record<string, string>;
  rawBody: string;
  body: unknown;
}

interface WebhookDeliverySenderResult {
  statusCode: number;
  body?: unknown;
}

interface MerchantRecord {
  merchantId: string;
  name: string;
  status: "active" | "suspended";
  domains: Array<{ domain: string; verified: boolean; verifiedAt?: string }>;
  createdAt: string;
  updatedAt: string;
}

interface MerchantVaultRecord {
  vaultId: string;
  merchantId: string;
  chainNamespace: "eip155" | "bitcoin" | "fractal";
  chainId?: number;
  address: string;
  label?: string;
  verified: boolean;
  verificationMessage?: string;
  verificationExpiresAt?: string;
  verificationSignature?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WebhookEndpointRecord {
  id: string;
  merchantId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebhookEventRecord {
  eventId: string;
  merchantId: string;
  type: string;
  payload: unknown;
  deliveryIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface WebhookDeliveryRecord {
  deliveryId: string;
  eventId: string;
  endpointId: string;
  merchantId: string;
  eventType: string;
  url: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  leaseOwner?: string;
  leaseAcquiredAt?: string;
  leaseExpiresAt?: string;
  lastError?: string;
  responseStatus?: number;
  responseBody?: unknown;
  request?: {
    method: "POST";
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

interface WebhookWorkerDrainRecord {
  workerId: string;
  merchantId?: string;
  checkedAt: string;
  attempted: number;
  delivered: number;
  failed: number;
  deadLetter: number;
  updatedAt: string;
}

interface AuditLogRecord {
  auditId: string;
  merchantId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
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

interface ShortPaymentLinkRecord {
  slug: string;
  intentId: string;
  merchantId: string;
  channel: "website" | "checkout" | "pos" | "miniapp" | "livestream" | "ad";
  url: string;
  createdAt: string;
  expiresAt: string;
}

interface PublicPaymentSessionRecord {
  intentId: string;
  merchantId: string;
  tokenHash: string;
  channel: "website" | "checkout" | "pos" | "miniapp" | "livestream" | "ad";
  createdAt: string;
  expiresAt: string;
}

const voucherAbi = parseAbi([
  "function collectWithAuthorization((address user,address voucherToken,uint256 tokenId,uint256 amount,bytes32 merchantId,bytes32 storeId,bytes32 terminalId,bytes32 termsHash,uint8 redemptionMode,uint256 nonce,uint256 deadline) authorization, bytes signature) returns (bytes32)",
  "function burnWithAuthorization((address user,address voucherToken,uint256 tokenId,uint256 amount,bytes32 merchantId,bytes32 storeId,bytes32 terminalId,bytes32 termsHash,uint8 redemptionMode,uint256 nonce,uint256 deadline) authorization, bytes signature) returns (bytes32)",
]);

export async function createApp(config: Partial<ApiConfig> = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  let schedulePersist = () => {};
  const registeredTerminals = new PersistentSet<string>(() => schedulePersist());
  const terminalPaymentNonces = new PersistentSet<string>(() => schedulePersist());
  const redemptionSubmissions = new PersistentSet<string>(() => schedulePersist());
  const merchantReceivers = new PersistentMap<string, MerchantReceiverRecord>(() => schedulePersist());
  const commercePayments = new PersistentMap<string, CommercePaymentRecord>(() => schedulePersist());
  const shortLinks = new PersistentMap<string, ShortPaymentLinkRecord>(() => schedulePersist());
  const publicPaymentSessions = new PersistentMap<string, PublicPaymentSessionRecord>(() => schedulePersist());
  const merchants = new PersistentMap<string, MerchantRecord>(() => schedulePersist());
  const merchantVaults = new PersistentMap<string, MerchantVaultRecord>(() => schedulePersist());
  const entitlements = new PersistentMap<string, Entitlement>(() => schedulePersist());
  const bindings = new PersistentMap<string, RedemptionBinding>(() => schedulePersist());
  const paymentIntents = new PersistentMap<string, RedeemLoopPaymentIntent>(() => schedulePersist());
  const settlementProofs = new PersistentMap<string, VoucherPaymentProof>(() => schedulePersist());
  const proofIdempotency = new PersistentMap<string, string>(() => schedulePersist());
  const markPaidIdempotency = new PersistentSet<string>(() => schedulePersist());
  const webhookEndpoints = new PersistentMap<string, WebhookEndpointRecord>(() => schedulePersist());
  const webhookEvents = new PersistentMap<string, WebhookEventRecord>(() => schedulePersist());
  const webhookDeliveries = new PersistentMap<string, WebhookDeliveryRecord>(() => schedulePersist());
  const webhookWorkerDrains = new PersistentMap<string, WebhookWorkerDrainRecord>(() => schedulePersist());
  const auditLogs = new PersistentMap<string, AuditLogRecord>(() => schedulePersist());
  const rateLimitBuckets = new Map<string, RateLimitBucket>();
  const resolvedConfig: ApiConfig = {
    chainId: normalizeChainId(config.chainId ?? process.env.CHAIN_ID ?? 31337),
    rpcUrl: config.rpcUrl ?? process.env.RPC_URL,
    evmRpcUrls: parseEvmRpcUrls(config.evmRpcUrls ?? process.env.EVM_RPC_URLS),
    relayerPrivateKey: config.relayerPrivateKey ?? (process.env.RELAYER_PRIVATE_KEY as Hex | undefined),
    dryRun: config.dryRun ?? process.env.RELAYER_DRY_RUN !== "false",
    embedAllowedOrigins: parseAllowedOrigins(
      config.embedAllowedOrigins ??
        process.env.REDEEMLOOP_EMBED_ALLOWED_ORIGINS ??
        "http://localhost:3000,http://127.0.0.1:3000",
    ),
    storageFile: config.storageFile ?? process.env.REDEEMLOOP_STORAGE_FILE,
    databaseUrl: config.databaseUrl ?? process.env.REDEEMLOOP_DATABASE_URL,
    databaseSnapshotKey: config.databaseSnapshotKey ?? process.env.REDEEMLOOP_DATABASE_SNAPSHOT_KEY,
    persistence: config.persistence,
    apiKeys: parseMerchantApiKeys(config.apiKeys ?? process.env.REDEEMLOOP_API_KEYS),
    evmMinConfirmations: normalizePositiveInteger(config.evmMinConfirmations ?? process.env.EVM_MIN_CONFIRMATIONS ?? 1, "evmMinConfirmations"),
    evmReceiptProvider: config.evmReceiptProvider,
    evmRpcHealthProvider: config.evmRpcHealthProvider,
    runeIndexer: config.runeIndexer,
    xverseApiKey: config.xverseApiKey ?? process.env.XVERSE_API_KEY,
    xverseNetwork: normalizeRuneIndexerNetwork(config.xverseNetwork ?? process.env.XVERSE_NETWORK ?? "mainnet"),
    xverseApiBaseUrl: config.xverseApiBaseUrl ?? process.env.XVERSE_API_BASE_URL,
    webhookMaxAttempts: normalizePositiveInteger(config.webhookMaxAttempts ?? process.env.WEBHOOK_MAX_ATTEMPTS ?? 5, "webhookMaxAttempts"),
    webhookDeliveryLeaseMs: normalizePositiveInteger(config.webhookDeliveryLeaseMs ?? process.env.WEBHOOK_DELIVERY_LEASE_MS ?? 60_000, "webhookDeliveryLeaseMs"),
    webhookRequestTimeoutMs: normalizePositiveInteger(config.webhookRequestTimeoutMs ?? process.env.WEBHOOK_REQUEST_TIMEOUT_MS ?? 15_000, "webhookRequestTimeoutMs"),
    webhookDeliverySender: config.webhookDeliverySender,
    shopifyShopDomain: config.shopifyShopDomain ?? process.env.SHOPIFY_SHOP_DOMAIN,
    shopifyAdminAccessToken: config.shopifyAdminAccessToken ?? process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    shopifyApiVersion: config.shopifyApiVersion ?? process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-04",
    shopifyWebhookSecret: config.shopifyWebhookSecret ?? process.env.SHOPIFY_WEBHOOK_SECRET,
    woocommerceStoreUrl: config.woocommerceStoreUrl ?? process.env.WOOCOMMERCE_STORE_URL,
    woocommerceConsumerKey: config.woocommerceConsumerKey ?? process.env.WOOCOMMERCE_CONSUMER_KEY,
    woocommerceConsumerSecret: config.woocommerceConsumerSecret ?? process.env.WOOCOMMERCE_CONSUMER_SECRET,
    woocommerceWebhookSecret: config.woocommerceWebhookSecret ?? process.env.WOOCOMMERCE_WEBHOOK_SECRET,
    rateLimitEnabled: config.rateLimitEnabled ?? process.env.RATE_LIMIT_DISABLED !== "true",
    rateLimitWindowMs: normalizePositiveInteger(config.rateLimitWindowMs ?? process.env.RATE_LIMIT_WINDOW_MS ?? 60_000, "rateLimitWindowMs"),
    rateLimitMax: normalizePositiveInteger(config.rateLimitMax ?? process.env.RATE_LIMIT_MAX ?? 300, "rateLimitMax"),
  };
  const persistence =
    resolvedConfig.persistence ??
    createApiPersistence({
      storageFile: resolvedConfig.storageFile,
      databaseUrl: resolvedConfig.databaseUrl,
      snapshotKey: resolvedConfig.databaseSnapshotKey,
    });
  const snapshot = await persistence.load();
  if (snapshot) {
    hydrateApiSnapshot(snapshot, {
      merchants,
      merchantVaults,
      merchantReceivers,
      commercePayments,
      entitlements,
      bindings,
      paymentIntents,
      settlementProofs,
      proofIdempotency,
      markPaidIdempotency,
      webhookEndpoints,
      webhookEvents,
      webhookDeliveries,
      webhookWorkerDrains,
      auditLogs,
      shortLinks,
      publicPaymentSessions,
      registeredTerminals,
      terminalPaymentNonces,
      redemptionSubmissions,
    });
  }
  let persistQueue = Promise.resolve();
  schedulePersist = () => {
    if (!persistence.enabled) return;
    persistQueue = persistQueue
      .then(() =>
        persistence.save(
          createApiSnapshot({
            merchants,
            merchantVaults,
            merchantReceivers,
            commercePayments,
            entitlements,
            bindings,
            paymentIntents,
            settlementProofs,
            proofIdempotency,
            markPaidIdempotency,
            webhookEndpoints,
            webhookEvents,
            webhookDeliveries,
            webhookWorkerDrains,
            auditLogs,
            shortLinks,
            publicPaymentSessions,
            registeredTerminals,
            terminalPaymentNonces,
            redemptionSubmissions,
          }),
        ),
      )
      .catch((error: unknown) => {
        app.log.error(error);
      });
  };

  app.addHook("onClose", async () => {
    try {
      await persistQueue;
      if (persistence.enabled) {
        await persistence.save(
          createApiSnapshot({
            merchants,
            merchantVaults,
            merchantReceivers,
            commercePayments,
            entitlements,
            bindings,
            paymentIntents,
            settlementProofs,
            proofIdempotency,
            markPaidIdempotency,
            webhookEndpoints,
            webhookEvents,
            webhookDeliveries,
            webhookWorkerDrains,
            auditLogs,
            shortLinks,
            publicPaymentSessions,
            registeredTerminals,
            terminalPaymentNonces,
            redemptionSubmissions,
          }),
        );
      }
    } finally {
      await persistence.close?.();
    }
  });

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

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedEmbedOrigin(origin, resolvedConfig, merchants));
    },
  });

  app.addHook("preHandler", async (request, reply) => {
    const result = consumeRateLimit(request, resolvedConfig, rateLimitBuckets);
    if (!result) return;
    setRateLimitHeaders(reply, result);
    if (!result.allowed) {
      return reply.code(429).send({
        error: "Rate limit exceeded",
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
  });

  app.addHook("preHandler", async (request, reply) => {
    const isExpireStaleRequest = request.url.startsWith("/v1/payment-intents/expire-stale");
    if (Object.keys(resolvedConfig.apiKeys).length === 0) {
      if (!isExpireStaleRequest) expireStalePaymentIntents(paymentIntents, auditLogs);
      return;
    }
    if (request.method === "OPTIONS") return;
    if (!request.url.startsWith("/v1/")) return;
    const merchantContext = resolveRequestMerchantId(request, {
      merchants,
      merchantVaults,
      entitlements,
      bindings,
      paymentIntents,
      settlementProofs,
      webhookEndpoints,
      webhookEvents,
      webhookDeliveries,
    });
    if (!merchantContext.required) return;
    if (!merchantContext.merchantId) {
      return reply.code(400).send({ error: merchantContext.error ?? "merchantId is required when API keys are enabled" });
    }
    if (!hasMerchantApiAccess(request.headers.authorization, merchantContext.merchantId, resolvedConfig.apiKeys)) {
      return reply.code(bearerToken(request.headers.authorization) ? 403 : 401).send({ error: "Invalid merchant API key" });
    }
    if (!isExpireStaleRequest) expireStalePaymentIntents(paymentIntents, auditLogs, new Date(), merchantContext.merchantId);
  });

  app.get("/health", async () => ({
    ok: true,
    service: "redeemloop-api",
    chainId: resolvedConfig.chainId,
    dryRun: resolvedConfig.dryRun,
  }));

  app.get("/v1/config", async () => ({
    chainId: resolvedConfig.chainId,
    dryRun: resolvedConfig.dryRun,
    embedAllowedOrigins: resolvedConfig.embedAllowedOrigins.includes("*") ? ["*"] : resolvedConfig.embedAllowedOrigins,
    evmMinConfirmations: resolvedConfig.evmMinConfirmations,
    webhookMaxAttempts: resolvedConfig.webhookMaxAttempts,
    webhookDeliveryLeaseMs: resolvedConfig.webhookDeliveryLeaseMs,
    webhookRequestTimeoutMs: resolvedConfig.webhookRequestTimeoutMs,
    rateLimit: {
      enabled: resolvedConfig.rateLimitEnabled,
      windowMs: resolvedConfig.rateLimitWindowMs,
      max: resolvedConfig.rateLimitMax,
    },
    cors: {
      allowedOrigins: resolvedConfig.embedAllowedOrigins.includes("*") ? ["*"] : resolvedConfig.embedAllowedOrigins,
      wildcardAllowed: resolvedConfig.embedAllowedOrigins.includes("*"),
      verifiedMerchantDomains: countVerifiedMerchantDomains(merchants),
    },
    persistence: {
      enabled: persistence.enabled,
      kind: persistence.kind,
    },
    auth: {
      apiKeysEnabled: Object.keys(resolvedConfig.apiKeys).length > 0,
    },
  }));

  app.get("/v1/diagnostics/evm-rpc", async () => ({
    checkedAt: new Date().toISOString(),
    chains: await Promise.all(redeemLoopEvmChains.map((chain) => checkEvmRpcDiagnostic(chain.chainId, chain.name, resolvedConfig))),
  }));

  app.get("/v1/diagnostics/shopify", async () => ({
    checkedAt: new Date().toISOString(),
    diagnostics: getShopifyAdapterDiagnostics(commerceAdapterConfig(resolvedConfig)),
  }));

  app.get("/v1/diagnostics/webhooks", async (request) => {
    const query = recordOf(request.query);
    return getWebhookOperationsDiagnostics({
      webhookDeliveries,
      webhookWorkerDrains,
    }, {
      merchantId: optionalString(query.merchantId, "merchantId"),
      now: new Date(),
      staleProcessingMs: normalizePositiveInteger(query.staleProcessingMs ?? 5 * 60_000, "staleProcessingMs"),
      noDrainMs: normalizePositiveInteger(query.noDrainMs ?? 10 * 60_000, "noDrainMs"),
    });
  });

  app.get("/v1/audit-logs", async (request) => {
    const query = request.query as { merchantId?: string; entityType?: string; entityId?: string; action?: string };
    return [...auditLogs.values()]
      .filter((entry) => {
        if (query.merchantId && entry.merchantId !== query.merchantId) return false;
        if (query.entityType && entry.entityType !== query.entityType) return false;
        if (query.entityId && entry.entityId !== query.entityId) return false;
        if (query.action && entry.action !== query.action) return false;
        return true;
      })
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  });

  app.post("/v1/merchants", async (request, reply) => {
    try {
      const body = recordOf(request.body);
      const now = new Date().toISOString();
      const merchantId = optionalString(body.merchantId, "merchantId") ?? randomId("mer");
      const merchant: MerchantRecord = {
        merchantId,
        name: optionalString(body.name, "name") ?? merchantId,
        status: "active",
        domains: [],
        createdAt: now,
        updatedAt: now,
      };
      merchants.set(merchantId, merchant);
      return reply.code(201).send(merchant);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/merchants/:merchantId", async (request, reply) => {
    const params = request.params as { merchantId: string };
    const merchant = merchants.get(params.merchantId);
    if (!merchant) return reply.code(404).send({ error: "Merchant not found" });
    return merchant;
  });

  app.post("/v1/merchants/:merchantId/domains/verify", async (request, reply) => {
    try {
      const params = request.params as { merchantId: string };
      const body = recordOf(request.body);
      const merchant = merchants.get(params.merchantId);
      if (!merchant) return reply.code(404).send({ error: "Merchant not found" });
      const domain = requireString(body.domain, "domain");
      const now = new Date().toISOString();
      const updated: MerchantRecord = {
        ...merchant,
        domains: [...merchant.domains.filter((item) => item.domain !== domain), { domain, verified: true, verifiedAt: now }],
        updatedAt: now,
      };
      merchants.set(updated.merchantId, updated);
      return updated;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/merchant-vaults", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const now = new Date().toISOString();
      const chainNamespace = normalizeChainNamespace(body.chainNamespace);
      const chainId = chainNamespace === "eip155" ? normalizeChainId(body.chainId ?? resolvedConfig.chainId) : normalizeOptionalChainId(body.chainId);
      const address = normalizeVaultAddress(chainNamespace, requireString(body.address, "address"));
      const vault: MerchantVaultRecord = {
        vaultId: optionalString(body.vaultId, "vaultId") ?? randomId("vault"),
        merchantId: requireString(body.merchantId, "merchantId"),
        chainNamespace,
        chainId,
        address,
        label: optionalString(body.label, "label"),
        verified: false,
        createdAt: now,
        updatedAt: now,
      };
      merchantVaults.set(vault.vaultId, vault);
      recordAuditLog(auditLogs, {
        merchantId: vault.merchantId,
        action: "merchant_vault.created",
        entityType: "merchant_vault",
        entityId: vault.vaultId,
        summary: "Merchant vault created",
        after: { chainNamespace: vault.chainNamespace, chainId: vault.chainId, address: vault.address, verified: vault.verified },
      });

      if (vault.chainNamespace === "eip155" && vault.chainId !== undefined) {
        merchantReceivers.set(receiverKey(normalizeBytes32(vault.merchantId, "merchantId"), vault.chainId), {
          merchantId: normalizeBytes32(vault.merchantId, "merchantId"),
          chainId: vault.chainId,
          receivingAddress: normalizeAddress(vault.address, "address"),
          updatedAt: now,
        });
      }

      return reply.code(201).send(vault);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/merchant-vaults", async (request) => {
    const query = request.query as { merchantId?: string };
    return [...merchantVaults.values()].filter((vault) => !query.merchantId || vault.merchantId === query.merchantId);
  });

  app.post("/v1/merchant-vaults/:vaultId/verification-challenge", async (request, reply) => {
    try {
      const params = request.params as { vaultId: string };
      const vault = merchantVaults.get(params.vaultId);
      if (!vault) return reply.code(404).send({ error: "Merchant vault not found" });
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      const message = merchantVaultVerificationMessage(vault, randomBytes(12).toString("hex"), expiresAt);
      const updated = {
        ...vault,
        verificationMessage: message,
        verificationExpiresAt: expiresAt,
        updatedAt: now.toISOString(),
      };
      merchantVaults.set(updated.vaultId, updated);
      recordAuditLog(auditLogs, {
        merchantId: updated.merchantId,
        action: "merchant_vault.challenge_created",
        entityType: "merchant_vault",
        entityId: updated.vaultId,
        summary: "Merchant vault verification challenge created",
      });
      return {
        vault: updated,
        message,
        expiresAt,
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/merchant-vaults/:vaultId/verify-signature", async (request, reply) => {
    try {
      const params = request.params as { vaultId: string };
      const body = request.body as Record<string, unknown>;
      const vault = merchantVaults.get(params.vaultId);
      if (!vault) return reply.code(404).send({ error: "Merchant vault not found" });
      if (vault.chainNamespace !== "eip155") throw new Error("Signature verification currently supports EVM vaults");
      const signature = requireString(body.signature, "signature") as Hex;
      const message = optionalString(body.message, "message") ?? vault.verificationMessage;
      if (!message) throw new Error("verification challenge is required before signature verification");
      if (vault.verificationExpiresAt && Date.parse(vault.verificationExpiresAt) < Date.now()) throw new Error("verification challenge has expired");
      if (vault.verificationMessage && message !== vault.verificationMessage) throw new Error("verification message does not match the active challenge");
      const valid = await verifyMessage({
        address: normalizeAddress(vault.address, "vault.address"),
        message,
        signature,
      });
      if (!valid) return reply.code(400).send({ error: "Invalid merchant vault signature" });
      const now = new Date().toISOString();
      const updated = {
        ...vault,
        verified: true,
        verificationMessage: undefined,
        verificationExpiresAt: undefined,
        verificationSignature: signature,
        verifiedAt: now,
        updatedAt: now,
      };
      merchantVaults.set(updated.vaultId, updated);
      recordAuditLog(auditLogs, {
        merchantId: updated.merchantId,
        action: "merchant_vault.verified",
        entityType: "merchant_vault",
        entityId: updated.vaultId,
        summary: "Merchant vault ownership verified by signature",
        after: { address: updated.address, chainId: updated.chainId, verified: true },
      });
      return updated;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/entitlements", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const entitlement: Entitlement = {
        entitlementId: optionalString(body.entitlementId, "entitlementId") ?? randomId("ent"),
        merchantId: requireString(body.merchantId, "merchantId"),
        name: requireString(body.name, "name"),
        description: optionalString(body.description, "description"),
        quantity: normalizePositiveInteger(body.quantity ?? 1, "quantity"),
        region: optionalString(body.region, "region"),
        validity: body.validity as Entitlement["validity"],
        termsHash: optionalString(body.termsHash, "termsHash") ?? randomId("terms"),
        termsUri: optionalString(body.termsUri, "termsUri"),
      };
      assertValidEntitlement(entitlement);
      entitlements.set(entitlement.entitlementId, entitlement);
      return reply.code(201).send(entitlement);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/entitlements/:entitlementId", async (request, reply) => {
    const params = request.params as { entitlementId: string };
    const entitlement = entitlements.get(params.entitlementId);
    if (!entitlement) return reply.code(404).send({ error: "Entitlement not found" });
    return entitlement;
  });

  app.patch("/v1/entitlements/:entitlementId", async (request, reply) => {
    try {
      const params = request.params as { entitlementId: string };
      const existing = entitlements.get(params.entitlementId);
      if (!existing) return reply.code(404).send({ error: "Entitlement not found" });
      const patch = request.body as Partial<Entitlement>;
      const updated: Entitlement = { ...existing, ...patch, entitlementId: existing.entitlementId, merchantId: existing.merchantId };
      assertValidEntitlement(updated);
      entitlements.set(updated.entitlementId, updated);
      return updated;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/bindings", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const entitlementId = requireString(body.entitlementId, "entitlementId");
      if (!entitlements.has(entitlementId)) return reply.code(404).send({ error: "Entitlement not found" });
      const now = new Date().toISOString();
      const acceptedAssets = normalizeAssetList(body.acceptedAssets);
      const merchantVaultMap = normalizeMerchantVaultMap(body.merchantVaults, acceptedAssets, merchantVaults);
      const binding: RedemptionBinding = {
        bindingId: optionalString(body.bindingId, "bindingId") ?? randomId("bind"),
        merchantId: requireString(body.merchantId, "merchantId"),
        entitlementId,
        acceptedAssets,
        merchantVaults: merchantVaultMap,
        settlementPolicy: normalizeSettlementPolicy(body.settlementPolicy ?? "collect"),
        commerceTargets: normalizeCommerceTargets(body.commerceTargets),
        status: normalizeBindingStatus(body.status ?? "active"),
        termsHash: optionalString(body.termsHash, "termsHash") ?? acceptedAssets[0]?.termsHash ?? entitlementId,
        createdAt: now,
        updatedAt: now,
      };
      assertValidRedemptionBinding(binding);
      bindings.set(binding.bindingId, binding);
      return reply.code(201).send(binding);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/bindings/:bindingId", async (request, reply) => {
    const params = request.params as { bindingId: string };
    const binding = bindings.get(params.bindingId);
    if (!binding) return reply.code(404).send({ error: "Binding not found" });
    return binding;
  });

  app.get("/v1/bindings", async (request) => {
    const query = request.query as { merchantId?: string; sku?: string };
    return [...bindings.values()].filter((binding) => {
      if (query.merchantId && binding.merchantId !== query.merchantId) return false;
      if (query.sku && !binding.commerceTargets.some((target) => target.sku === query.sku)) return false;
      return true;
    });
  });

  app.patch("/v1/bindings/:bindingId", async (request, reply) => {
    try {
      const params = request.params as { bindingId: string };
      const existing = bindings.get(params.bindingId);
      if (!existing) return reply.code(404).send({ error: "Binding not found" });
      const patch = request.body as Partial<RedemptionBinding>;
      const updated: RedemptionBinding = {
        ...existing,
        ...patch,
        bindingId: existing.bindingId,
        merchantId: existing.merchantId,
        entitlementId: existing.entitlementId,
        updatedAt: new Date().toISOString(),
      };
      assertValidRedemptionBinding(updated);
      bindings.set(updated.bindingId, updated);
      return updated;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/bindings/:bindingId/pause", async (request, reply) => {
    return updateBindingStatus(request.params as { bindingId: string }, "paused", bindings, reply);
  });

  app.post("/v1/bindings/:bindingId/activate", async (request, reply) => {
    return updateBindingStatus(request.params as { bindingId: string }, "active", bindings, reply);
  });

  app.post("/v1/payment-intents/expire-stale", async (request) => {
    const body = recordOf(request.body);
    const query = recordOf(request.query);
    const merchantId = optionalString(body.merchantId, "merchantId") ?? optionalString(query.merchantId, "merchantId");
    const result = expireStalePaymentIntents(paymentIntents, auditLogs, new Date(), merchantId);
    return {
      ...result,
      checkedAt: new Date().toISOString(),
    };
  });

  app.post("/v1/payment-intents", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const bindingId = requireString(body.bindingId, "bindingId");
      const binding = bindings.get(bindingId);
      if (!binding) return reply.code(404).send({ error: "Binding not found" });
      if (binding.status !== "active") return reply.code(409).send({ error: "Binding is not active" });
      const now = new Date();
      const intent = createPaymentIntentRecord(body, binding, now);
      paymentIntents.set(intent.intentId, intent);
      recordAuditLog(auditLogs, {
        merchantId: intent.merchantId,
        action: "payment_intent.created",
        entityType: "payment_intent",
        entityId: intent.intentId,
        summary: "PaymentIntent created",
        after: { status: intent.status, expiresAt: intent.expiresAt, orderId: intent.orderId },
      });
      return reply.code(201).send(intent);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/pos/payment-intents", async (request, reply) => {
    try {
      const body = recordOf(request.body);
      const bindingId = requireString(body.bindingId, "bindingId");
      const binding = bindings.get(bindingId);
      if (!binding) return reply.code(404).send({ error: "Binding not found" });
      if (binding.status !== "active") return reply.code(409).send({ error: "Binding is not active" });
      const storeId = optionalString(body.storeId, "storeId") ?? binding.commerceTargets.find((target) => target.platform === "pos")?.storeId ?? binding.commerceTargets[0]?.storeId;
      const terminalId = requireString(body.terminalId, "terminalId");
      const terminalRegistrationKey = terminalKey(normalizeBytes32(binding.merchantId, "merchantId"), normalizeBytes32(storeId ?? "", "storeId"), normalizeBytes32(terminalId, "terminalId"));
      if (!registeredTerminals.has(terminalRegistrationKey)) {
        return reply.code(403).send({ error: "Terminal is not registered for this merchant and store" });
      }
      const terminalNonce = optionalString(body.terminalNonce, "terminalNonce") ?? randomId("pos_nonce");
      const nonceKey = `${terminalRegistrationKey}:${terminalNonce}`;
      if (terminalPaymentNonces.has(nonceKey)) return reply.code(409).send({ error: "Terminal payment nonce has already been used" });
      terminalPaymentNonces.add(nonceKey);
      const now = new Date();
      const intent = createPaymentIntentRecord({
        ...body,
        bindingId,
        storeId,
        channel: "pos",
        orderId: optionalString(body.orderId, "orderId") ?? `pos_${terminalId}_${now.getTime()}`,
      }, binding, now);
      paymentIntents.set(intent.intentId, intent);
      recordAuditLog(auditLogs, {
        merchantId: intent.merchantId,
        action: "payment_intent.pos_qr_created",
        entityType: "payment_intent",
        entityId: intent.intentId,
        summary: "POS QR PaymentIntent created",
        after: { status: intent.status, storeId, terminalId, terminalNonce },
      });
      const checkoutToken = createCheckoutToken();
      publicPaymentSessions.set(intent.intentId, createPublicPaymentSession(intent, checkoutToken));
      const paymentPath = `/pay/${encodeURIComponent(intent.intentId)}?token=${encodeURIComponent(checkoutToken)}`;
      const baseUrl = optionalString(body.baseUrl, "baseUrl");
      const qr = {
        kind: "redeemloop.pos.payment",
        intentId: intent.intentId,
        merchantId: intent.merchantId,
        storeId,
        terminalId,
        terminalNonce,
        expiresAt: intent.expiresAt,
        checkoutToken,
        paymentUrl: baseUrl ? `${baseUrl.replace(/\/+$/, "")}${paymentPath}` : paymentPath,
      };
      return reply.code(201).send({ paymentIntent: intent, qr });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/short-links/payment-intents", async (request, reply) => {
    try {
      const body = recordOf(request.body);
      const bindingId = requireString(body.bindingId, "bindingId");
      const binding = bindings.get(bindingId);
      if (!binding) return reply.code(404).send({ error: "Binding not found" });
      if (binding.status !== "active") return reply.code(409).send({ error: "Binding is not active" });
      const slug = normalizeSlug(optionalString(body.slug, "slug") ?? randomId("rl"));
      if (shortLinks.has(slug)) return reply.code(409).send({ error: "Short link slug already exists" });
      const channel = normalizePaymentChannel(body.channel ?? "livestream");
      const now = new Date();
      const intent = createPaymentIntentRecord({
        ...body,
        bindingId,
        channel,
        orderId: optionalString(body.orderId, "orderId") ?? `short_${slug}`,
      }, binding, now);
      paymentIntents.set(intent.intentId, intent);
      const baseUrl = optionalString(body.baseUrl, "baseUrl") ?? "https://redeemloop.local";
      const checkoutToken = createCheckoutToken();
      const shortLink: ShortPaymentLinkRecord = {
        slug,
        intentId: intent.intentId,
        merchantId: intent.merchantId,
        channel: intent.channel,
        url: `${baseUrl.replace(/\/+$/, "")}/s/${encodeURIComponent(slug)}?token=${encodeURIComponent(checkoutToken)}`,
        createdAt: now.toISOString(),
        expiresAt: intent.expiresAt,
      };
      shortLinks.set(slug, shortLink);
      publicPaymentSessions.set(intent.intentId, createPublicPaymentSession(intent, checkoutToken));
      recordAuditLog(auditLogs, {
        merchantId: intent.merchantId,
        action: "payment_intent.short_link_created",
        entityType: "payment_intent",
        entityId: intent.intentId,
        summary: "Short-link PaymentIntent created",
        after: { status: intent.status, slug, channel: intent.channel },
      });
      return reply.code(201).send({ paymentIntent: intent, shortLink: { ...shortLink, checkoutToken } });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/short-links/:slug", async (request, reply) => {
    const params = request.params as { slug: string };
    const shortLink = shortLinks.get(params.slug);
    if (!shortLink) return reply.code(404).send({ error: "Short link not found" });
    const paymentIntent = paymentIntents.get(shortLink.intentId);
    if (!paymentIntent) return reply.code(404).send({ error: "PaymentIntent not found for short link" });
    return { shortLink, paymentIntent };
  });

  app.get("/v1/public/short-links/:slug", async (request, reply) => {
    try {
      const params = request.params as { slug: string };
      const shortLink = shortLinks.get(params.slug);
      if (!shortLink) return reply.code(404).send({ error: "Short link not found" });
      const publicSession = resolvePublicPaymentSession({
        intentId: shortLink.intentId,
        checkoutToken: checkoutTokenFromRequest(request),
        paymentIntents,
        publicPaymentSessions,
        reply,
      });
      if (!publicSession) return reply;
      return buildPublicPaymentSessionResponse(publicSession.intent, publicSession.session, shortLink);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/public/payment-sessions/:intentId", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const publicSession = resolvePublicPaymentSession({
        intentId: params.intentId,
        checkoutToken: checkoutTokenFromRequest(request),
        paymentIntents,
        publicPaymentSessions,
        reply,
      });
      if (!publicSession) return reply;
      return buildPublicPaymentSessionResponse(publicSession.intent, publicSession.session);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/public/payment-sessions/:intentId/connect-wallet", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = recordOf(request.body);
      const publicSession = resolvePublicPaymentSession({
        intentId: params.intentId,
        checkoutToken: checkoutTokenFromRequest(request),
        paymentIntents,
        publicPaymentSessions,
        reply,
      });
      if (!publicSession) return reply;
      const result = updatePaymentIntent({ intentId: publicSession.intent.intentId }, paymentIntents, "wallet_connected", {
        payerAddress: requireString(body.payerAddress, "payerAddress"),
      }, auditLogs);
      if (!result) return reply.code(404).send({ error: "PaymentIntent not found" });
      return buildPublicPaymentSessionResponse(result, publicSession.session);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/public/payment-sessions/:intentId/transfer-requested", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = recordOf(request.body);
      const publicSession = resolvePublicPaymentSession({
        intentId: params.intentId,
        checkoutToken: checkoutTokenFromRequest(request),
        paymentIntents,
        publicPaymentSessions,
        reply,
      });
      if (!publicSession) return reply;
      const intent = publicSession.intent;
      const asset = optionalString(body.assetId, "assetId") ? findAcceptedAsset(intent, requireString(body.assetId, "assetId")) : intent.selectedAsset ?? intent.acceptedAssets[0];
      const next = updatePaymentIntent({ intentId: intent.intentId }, paymentIntents, "transfer_requested", {
        selectedAsset: asset,
        payerAddress: optionalString(body.payerAddress, "payerAddress") ?? intent.payerAddress,
        merchantVault: findMerchantVaultAddress(bindings.get(intent.bindingId), asset),
      }, auditLogs);
      if (!next) return reply.code(404).send({ error: "PaymentIntent not found" });
      return {
        ...buildPublicPaymentSessionResponse(next, publicSession.session),
        transfer: {
          to: next.merchantVault,
          asset,
          amount: asset.requiredAmount,
          settlementPolicy: next.settlementPolicy,
          ...buildTenderTransferRequest(next, asset, body),
        },
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/public/payment-sessions/:intentId/broadcasted", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = recordOf(request.body);
      const publicSession = resolvePublicPaymentSession({
        intentId: params.intentId,
        checkoutToken: checkoutTokenFromRequest(request),
        paymentIntents,
        publicPaymentSessions,
        reply,
      });
      if (!publicSession) return reply;
      const txid = requireString(body.txid, "txid");
      const updated = updatePaymentIntent({ intentId: publicSession.intent.intentId }, paymentIntents, "broadcasted", {
        broadcastTxid: txid,
      }, auditLogs);
      if (!updated) return reply.code(404).send({ error: "PaymentIntent not found" });
      return {
        ...buildPublicPaymentSessionResponse(updated, publicSession.session),
        txid,
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/public/payment-sessions/:intentId/settlement/evm/recheck", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = recordOf(request.body);
      const publicSession = resolvePublicPaymentSession({
        intentId: params.intentId,
        checkoutToken: checkoutTokenFromRequest(request),
        paymentIntents,
        publicPaymentSessions,
        reply,
      });
      if (!publicSession) return reply;
      const intent = publicSession.intent;
      const asset = intent.selectedAsset ?? intent.acceptedAssets[0];
      if (asset.chainNamespace !== "eip155" || asset.assetType !== "erc20") {
        return reply.code(400).send({ error: "Public EVM settlement recheck currently supports EVM ERC-20 assets" });
      }
      const chainId = asset.chainId;
      if (chainId === undefined) throw new Error("EVM settlement recheck requires asset.chainId");
      const txid = normalizeOptionalHex(body.txid ?? intent.broadcastTxid, "txid");
      if (!txid) throw new Error("txid is required; call broadcasted first or pass txid");
      const from = requireString(body.from ?? intent.payerAddress, "from");
      const minConfirmations = normalizePositiveInteger(body.minConfirmations ?? resolvedConfig.evmMinConfirmations, "minConfirmations");
      const receiptResult = await fetchEvmReceipt(txid, chainId, resolvedConfig);
      const proof = verifyErc20TransferReceipt({
        proofId: optionalString(body.proofId, "proofId"),
        intentId: intent.intentId,
        txid,
        receipt: receiptResult.receipt,
        asset,
        from,
        to: intent.merchantVault,
        amount: asset.requiredAmount,
        currentBlockNumber: receiptResult.currentBlockNumber,
        minConfirmations,
      });
      assertValidVoucherPaymentProof(proof, intent);
      const idempotencyKey = proofIdempotencyKey(proof);
      const existingProofId = proofIdempotency.get(idempotencyKey);
      if (existingProofId) {
        return { ...settlementProofs.get(existingProofId), duplicate: true, trusted: true };
      }
      settlementProofs.set(proof.proofId, proof);
      proofIdempotency.set(idempotencyKey, proof.proofId);

      const nextIntent = advanceIntentFromProof(intent, proof);
      paymentIntents.set(nextIntent.intentId, nextIntent);
      recordAuditLog(auditLogs, {
        merchantId: nextIntent.merchantId,
        action: "payment_intent.public_evm_recheck",
        entityType: "payment_intent",
        entityId: nextIntent.intentId,
        summary: "PaymentIntent advanced from token-scoped public EVM recheck",
        before: { status: intent.status },
        after: { status: nextIntent.status, proofId: proof.proofId },
      });
      const commerce = proof.status === "confirmed" || proof.status === "finalized"
        ? await markIntentCommercePaid(nextIntent, proof, bindings.get(nextIntent.bindingId), resolvedConfig, markPaidIdempotency)
        : undefined;
      const webhookEvent = nextIntent.status === "paid"
        ? enqueuePaymentIntentWebhookEvent({
            eventType: "payment_intent.paid",
            intent: nextIntent,
            proof,
            webhookEndpoints,
            webhookEvents,
            webhookDeliveries,
            maxAttempts: resolvedConfig.webhookMaxAttempts,
          })
        : undefined;

      return reply.code(201).send({
        ...proof,
        trusted: true,
        paymentIntent: paymentIntents.get(nextIntent.intentId),
        publicSession: publicSession.session,
        commerce,
        webhookEvent,
      });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/payment-intents", async (request) => {
    const query = request.query as { merchantId?: string; bindingId?: string; status?: PaymentIntentStatus; orderId?: string };
    return [...paymentIntents.values()].filter((intent) => {
      if (query.merchantId && intent.merchantId !== query.merchantId) return false;
      if (query.bindingId && intent.bindingId !== query.bindingId) return false;
      if (query.status && intent.status !== query.status) return false;
      if (query.orderId && intent.orderId !== query.orderId) return false;
      return true;
    });
  });

  app.get("/v1/payment-intents/:intentId", async (request, reply) => {
    const params = request.params as { intentId: string };
    const intent = paymentIntents.get(params.intentId);
    if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
    return intent;
  });

  app.post("/v1/payment-intents/:intentId/connect-wallet", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const result = updatePaymentIntent(request.params as { intentId: string }, paymentIntents, "wallet_connected", {
        payerAddress: requireString(body.payerAddress, "payerAddress"),
      }, auditLogs);
      if (!result) return reply.code(404).send({ error: "PaymentIntent not found" });
      return result;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/payment-intents/:intentId/select-asset", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = request.body as Record<string, unknown>;
      const intent = paymentIntents.get(params.intentId);
      if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
      const asset = findAcceptedAssetByInput(intent.acceptedAssets, body);
      const updated = updatePaymentIntent(params, paymentIntents, "asset_selected", {
        selectedAsset: asset,
        merchantVault: findMerchantVaultAddress(bindings.get(intent.bindingId), asset),
      }, auditLogs);
      return updated;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/payment-intents/:intentId/check-balance", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = request.body as Record<string, unknown>;
      const intent = paymentIntents.get(params.intentId);
      if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
      const asset = optionalString(body.assetId, "assetId") ? findAcceptedAsset(intent, requireString(body.assetId, "assetId")) : intent.selectedAsset ?? intent.acceptedAssets[0];
      const payerAddress = optionalString(body.payerAddress, "payerAddress") ?? intent.payerAddress;
      if (!payerAddress) throw new Error("payerAddress is required");
      const balance = optionalString(body.balance, "balance");
      const balanceCheck = buildTenderBalanceCheck(payerAddress, asset, balance);
      const status = balanceCheck.hasSufficientBalance === true ? "asset_selected" : "wallet_connected";
      const updated = movePaymentIntentForBalanceCheck(intent, status, {
        payerAddress,
        selectedAsset: asset,
        merchantVault: findMerchantVaultAddress(bindings.get(intent.bindingId), asset),
      });
      paymentIntents.set(updated.intentId, updated);
      recordAuditLog(auditLogs, {
        merchantId: updated.merchantId,
        action: `payment_intent.${updated.status}`,
        entityType: "payment_intent",
        entityId: updated.intentId,
        summary: "PaymentIntent balance checked",
        before: { status: intent.status },
        after: { status: updated.status, hasSufficientBalance: balanceCheck.hasSufficientBalance },
      });
      return {
        ...updated,
        balanceCheck,
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/payment-intents/:intentId/transfer-requested", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = request.body as Record<string, unknown>;
      const intent = paymentIntents.get(params.intentId);
      if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
      const asset = optionalString(body.assetId, "assetId") ? findAcceptedAsset(intent, requireString(body.assetId, "assetId")) : intent.selectedAsset ?? intent.acceptedAssets[0];
      const next = updatePaymentIntent(params, paymentIntents, "transfer_requested", {
        selectedAsset: asset,
        payerAddress: optionalString(body.payerAddress, "payerAddress") ?? intent.payerAddress,
        merchantVault: findMerchantVaultAddress(bindings.get(intent.bindingId), asset),
      }, auditLogs);
      if (!next) return reply.code(404).send({ error: "PaymentIntent not found" });
      return {
        ...next,
        transfer: {
          to: next.merchantVault,
          asset,
          amount: asset.requiredAmount,
          settlementPolicy: next.settlementPolicy,
          ...buildTenderTransferRequest(next, asset, body),
        },
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/payment-intents/:intentId/broadcasted", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const txid = requireString(body.txid, "txid");
      const updated = updatePaymentIntent(request.params as { intentId: string }, paymentIntents, "broadcasted", {
        broadcastTxid: txid,
      }, auditLogs);
      if (!updated) return reply.code(404).send({ error: "PaymentIntent not found" });
      return { ...updated, txid };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/payment-intents/:intentId/cancel", async (request, reply) => {
    try {
      const updated = updatePaymentIntent(request.params as { intentId: string }, paymentIntents, "cancelled", {}, auditLogs);
      if (!updated) return reply.code(404).send({ error: "PaymentIntent not found" });
      return updated;
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/settlement/proofs", async (request, reply) => {
    try {
      const body = request.body as Partial<VoucherPaymentProof>;
      const intentId = requireString(body.intentId, "intentId");
      const intent = paymentIntents.get(intentId);
      if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
      const asset = intent.selectedAsset ?? intent.acceptedAssets[0];
      const proof: VoucherPaymentProof = {
        proofId: optionalString(body.proofId, "proofId") ?? randomId("proof"),
        intentId,
        chainNamespace: body.chainNamespace ?? asset.chainNamespace,
        chainId: body.chainId ?? asset.chainId,
        txid: requireString(body.txid, "txid"),
        blockNumber: body.blockNumber,
        blockHash: body.blockHash,
        confirmations: normalizeNonNegativeInteger(body.confirmations ?? 0, "confirmations"),
        from: requireString(body.from, "from"),
        to: requireString(body.to ?? intent.merchantVault, "to"),
        assetType: body.assetType ?? asset.assetType,
        assetId: body.assetId ?? asset.assetId,
        contract: body.contract ?? asset.contract,
        tokenId: body.tokenId ?? asset.tokenId,
        amount: body.amount ?? asset.requiredAmount,
        logIndex: body.logIndex,
        outputIndex: body.outputIndex,
        status: body.status ?? "seen",
        rawProof: body.rawProof,
      };
      assertValidVoucherPaymentProof(proof, intent);
      const idempotencyKey = proofIdempotencyKey(proof);
      const existingProofId = proofIdempotency.get(idempotencyKey);
      if (existingProofId) {
        return { ...settlementProofs.get(existingProofId), duplicate: true };
      }
      settlementProofs.set(proof.proofId, proof);
      proofIdempotency.set(idempotencyKey, proof.proofId);

      const nextIntent = advanceIntentFromProof(intent, proof);
      paymentIntents.set(nextIntent.intentId, nextIntent);
      recordAuditLog(auditLogs, {
        merchantId: nextIntent.merchantId,
        action: "payment_intent.settlement_proof",
        entityType: "payment_intent",
        entityId: nextIntent.intentId,
        summary: "PaymentIntent advanced from settlement proof",
        before: { status: intent.status },
        after: { status: nextIntent.status, proofId: proof.proofId },
      });
      const commerce = proof.status === "confirmed" || proof.status === "finalized"
        ? await markIntentCommercePaid(nextIntent, proof, bindings.get(nextIntent.bindingId), resolvedConfig, markPaidIdempotency)
        : undefined;
      const webhookEvent = nextIntent.status === "paid"
        ? enqueuePaymentIntentWebhookEvent({
            eventType: "payment_intent.paid",
            intent: nextIntent,
            proof,
            webhookEndpoints,
            webhookEvents,
            webhookDeliveries,
            maxAttempts: resolvedConfig.webhookMaxAttempts,
          })
        : undefined;

      return reply.code(201).send({
        ...proof,
        paymentIntent: paymentIntents.get(nextIntent.intentId),
        commerce,
        webhookEvent,
      });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/settlement/proofs/:proofId", async (request, reply) => {
    const params = request.params as { proofId: string };
    const proof = settlementProofs.get(params.proofId);
    if (!proof) return reply.code(404).send({ error: "Settlement proof not found" });
    return proof;
  });

  app.post("/v1/settlement/recheck/:intentId", async (request, reply) => {
    const params = request.params as { intentId: string };
    const intent = paymentIntents.get(params.intentId);
    if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
    return {
      intentId: intent.intentId,
      status: intent.status,
      proofs: [...settlementProofs.values()].filter((proof) => proof.intentId === intent.intentId),
    };
  });

  app.post("/v1/settlement/evm/recheck/:intentId", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = recordOf(request.body);
      const intent = paymentIntents.get(params.intentId);
      if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
      const asset = intent.selectedAsset ?? intent.acceptedAssets[0];
      if (asset.chainNamespace !== "eip155" || asset.assetType !== "erc20") {
        return reply.code(400).send({ error: "EVM settlement recheck currently supports EVM ERC-20 assets" });
      }
      const chainId = asset.chainId;
      if (chainId === undefined) throw new Error("EVM settlement recheck requires asset.chainId");
      const txid = normalizeOptionalHex(body.txid ?? intent.broadcastTxid, "txid");
      if (!txid) throw new Error("txid is required; call broadcasted first or pass txid");
      const from = requireString(body.from ?? intent.payerAddress, "from");
      const minConfirmations = normalizePositiveInteger(body.minConfirmations ?? resolvedConfig.evmMinConfirmations, "minConfirmations");
      const receiptResult = await fetchEvmReceipt(txid, chainId, resolvedConfig);
      const proof = verifyErc20TransferReceipt({
        proofId: optionalString(body.proofId, "proofId"),
        intentId: intent.intentId,
        txid,
        receipt: receiptResult.receipt,
        asset,
        from,
        to: intent.merchantVault,
        amount: asset.requiredAmount,
        currentBlockNumber: receiptResult.currentBlockNumber,
        minConfirmations,
      });
      assertValidVoucherPaymentProof(proof, intent);
      const idempotencyKey = proofIdempotencyKey(proof);
      const existingProofId = proofIdempotency.get(idempotencyKey);
      if (existingProofId) {
        return { ...settlementProofs.get(existingProofId), duplicate: true, trusted: true };
      }
      settlementProofs.set(proof.proofId, proof);
      proofIdempotency.set(idempotencyKey, proof.proofId);

      const nextIntent = advanceIntentFromProof(intent, proof);
      paymentIntents.set(nextIntent.intentId, nextIntent);
      recordAuditLog(auditLogs, {
        merchantId: nextIntent.merchantId,
        action: "payment_intent.evm_recheck",
        entityType: "payment_intent",
        entityId: nextIntent.intentId,
        summary: "PaymentIntent advanced from trusted EVM recheck",
        before: { status: intent.status },
        after: { status: nextIntent.status, proofId: proof.proofId },
      });
      const commerce = proof.status === "confirmed" || proof.status === "finalized"
        ? await markIntentCommercePaid(nextIntent, proof, bindings.get(nextIntent.bindingId), resolvedConfig, markPaidIdempotency)
        : undefined;
      const webhookEvent = nextIntent.status === "paid"
        ? enqueuePaymentIntentWebhookEvent({
            eventType: "payment_intent.paid",
            intent: nextIntent,
            proof,
            webhookEndpoints,
            webhookEvents,
            webhookDeliveries,
            maxAttempts: resolvedConfig.webhookMaxAttempts,
          })
        : undefined;

      return reply.code(201).send({
        ...proof,
        trusted: true,
        paymentIntent: paymentIntents.get(nextIntent.intentId),
        commerce,
        webhookEvent,
      });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/settlement/rune/recheck/:intentId", async (request, reply) => {
    try {
      const params = request.params as { intentId: string };
      const body = recordOf(request.body);
      const intent = paymentIntents.get(params.intentId);
      if (!intent) return reply.code(404).send({ error: "PaymentIntent not found" });
      const asset = intent.selectedAsset ?? intent.acceptedAssets[0];
      if ((asset.chainNamespace !== "bitcoin" && asset.chainNamespace !== "fractal") || asset.assetType !== "rune") {
        return reply.code(400).send({ error: "Rune settlement recheck currently supports Bitcoin or Fractal Rune assets" });
      }
      const txid = requireString(body.txid ?? intent.broadcastTxid, "txid");
      const from = requireString(body.from ?? intent.payerAddress, "from");
      const confirmations = body.confirmations === undefined ? undefined : normalizeNonNegativeInteger(body.confirmations, "confirmations");
      let proof: VoucherPaymentProof;
      try {
        proof = await getRuneIndexer(resolvedConfig).getRuneTransferProof({
          intentId: intent.intentId,
          txid,
          asset,
          from,
          to: intent.merchantVault,
          confirmations,
        });
      } catch (error) {
        if (body.manualReviewOnIndexerError === true && canTransition(intent.status, "manual_review")) {
          const nextIntent = transitionPaymentIntent(intent, "manual_review");
          paymentIntents.set(nextIntent.intentId, nextIntent);
          recordAuditLog(auditLogs, {
            merchantId: nextIntent.merchantId,
            action: "payment_intent.rune_manual_review",
            entityType: "payment_intent",
            entityId: nextIntent.intentId,
            summary: "PaymentIntent moved to manual review after Rune indexer recheck error",
            before: { status: intent.status },
            after: { status: nextIntent.status, txid, error: errorMessage(error) },
          });
          return reply.code(202).send({
            intentId: nextIntent.intentId,
            status: nextIntent.status,
            trusted: false,
            manualReview: true,
            error: errorMessage(error),
            paymentIntent: nextIntent,
          });
        }
        throw error;
      }
      assertValidVoucherPaymentProof(proof, intent);
      const idempotencyKey = proofIdempotencyKey(proof);
      const existingProofId = proofIdempotency.get(idempotencyKey);
      if (existingProofId) {
        return { ...settlementProofs.get(existingProofId), duplicate: true, trusted: true };
      }
      settlementProofs.set(proof.proofId, proof);
      proofIdempotency.set(idempotencyKey, proof.proofId);

      const nextIntent = advanceIntentFromProof(intent, proof);
      paymentIntents.set(nextIntent.intentId, nextIntent);
      recordAuditLog(auditLogs, {
        merchantId: nextIntent.merchantId,
        action: "payment_intent.rune_recheck",
        entityType: "payment_intent",
        entityId: nextIntent.intentId,
        summary: "PaymentIntent advanced from trusted Rune recheck",
        before: { status: intent.status },
        after: { status: nextIntent.status, proofId: proof.proofId },
      });
      const commerce = proof.status === "confirmed" || proof.status === "finalized"
        ? await markIntentCommercePaid(nextIntent, proof, bindings.get(nextIntent.bindingId), resolvedConfig, markPaidIdempotency)
        : undefined;
      const webhookEvent = nextIntent.status === "paid"
        ? enqueuePaymentIntentWebhookEvent({
            eventType: "payment_intent.paid",
            intent: nextIntent,
            proof,
            webhookEndpoints,
            webhookEvents,
            webhookDeliveries,
            maxAttempts: resolvedConfig.webhookMaxAttempts,
          })
        : undefined;

      return reply.code(201).send({
        ...proof,
        trusted: true,
        paymentIntent: paymentIntents.get(nextIntent.intentId),
        commerce,
        webhookEvent,
      });
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/webhook-endpoints", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const now = new Date().toISOString();
      const endpoint: WebhookEndpointRecord = {
        id: optionalString(body.id, "id") ?? randomId("wh"),
        merchantId: requireString(body.merchantId, "merchantId"),
        url: requireString(body.url, "url"),
        secret: optionalString(body.secret, "secret") ?? randomBytes(24).toString("hex"),
        events: Array.isArray(body.events) ? body.events.map((event) => requireString(event, "events[]")) : ["payment_intent.paid"],
        active: body.active !== false,
        createdAt: now,
        updatedAt: now,
      };
      webhookEndpoints.set(endpoint.id, endpoint);
      return reply.code(201).send(redactWebhookSecret(endpoint));
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.get("/v1/webhook-endpoints", async (request) => {
    const query = request.query as { merchantId?: string };
    return [...webhookEndpoints.values()]
      .filter((endpoint) => !query.merchantId || endpoint.merchantId === query.merchantId)
      .map(redactWebhookSecret);
  });

  app.post("/v1/webhook-endpoints/:id/test", async (request, reply) => {
    const params = request.params as { id: string };
    const endpoint = webhookEndpoints.get(params.id);
    if (!endpoint) return reply.code(404).send({ error: "Webhook endpoint not found" });
    const body = JSON.stringify({ type: "payment_intent.paid", endpointId: endpoint.id, test: true });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomBytes(8).toString("hex");
    return {
      endpoint: redactWebhookSecret(endpoint),
      request: {
        method: "POST",
        url: endpoint.url,
        headers: {
          "X-RedeemLoop-Timestamp": timestamp,
          "X-RedeemLoop-Nonce": nonce,
          "X-RedeemLoop-Signature": signRedeemLoopWebhook(endpoint.secret, timestamp, nonce, body),
        },
        body: JSON.parse(body),
      },
    };
  });

  app.get("/v1/webhook-events", async (request) => {
    const query = request.query as { merchantId?: string; type?: string };
    return [...webhookEvents.values()].filter((event) => {
      if (query.merchantId && event.merchantId !== query.merchantId) return false;
      if (query.type && event.type !== query.type) return false;
      return true;
    });
  });

  app.get("/v1/webhook-events/:eventId", async (request, reply) => {
    const params = request.params as { eventId: string };
    const event = webhookEvents.get(params.eventId);
    if (!event) return reply.code(404).send({ error: "Webhook event not found" });
    return event;
  });

  app.get("/v1/webhook-deliveries", async (request) => {
    const query = request.query as { merchantId?: string; eventId?: string; endpointId?: string; status?: WebhookDeliveryStatus };
    return [...webhookDeliveries.values()].filter((delivery) => {
      if (query.merchantId && delivery.merchantId !== query.merchantId) return false;
      if (query.eventId && delivery.eventId !== query.eventId) return false;
      if (query.endpointId && delivery.endpointId !== query.endpointId) return false;
      if (query.status && delivery.status !== query.status) return false;
      return true;
    });
  });

  app.get("/v1/webhook-deliveries/:deliveryId", async (request, reply) => {
    const params = request.params as { deliveryId: string };
    const delivery = webhookDeliveries.get(params.deliveryId);
    if (!delivery) return reply.code(404).send({ error: "Webhook delivery not found" });
    return delivery;
  });

  app.post("/v1/webhook-deliveries/drain-pending", async (request) => {
    const body = recordOf(request.body);
    const query = recordOf(request.query);
    const merchantId = optionalString(body.merchantId, "merchantId") ?? optionalString(query.merchantId, "merchantId");
    const limit = normalizePositiveInteger(body.limit ?? query.limit ?? 25, "limit");
    const workerId = optionalString(body.workerId, "workerId") ?? optionalString(query.workerId, "workerId") ?? "api-drain";
    const leaseMs = normalizePositiveInteger(body.leaseMs ?? query.leaseMs ?? resolvedConfig.webhookDeliveryLeaseMs, "leaseMs");
    const now = new Date();
    const due = claimDueWebhookDeliveries({
      webhookEndpoints,
      webhookEvents,
      webhookDeliveries,
    }, { merchantId, limit, now, workerId, leaseMs });
    const deliveries: WebhookDeliveryRecord[] = [];
    for (const delivery of due) {
      deliveries.push(
        await attemptWebhookDelivery(delivery, {
          webhookEndpoints,
          webhookEvents,
          webhookDeliveries,
        }, resolvedConfig),
      );
    }
    const result = {
      checkedAt: now.toISOString(),
      attempted: deliveries.length,
      delivered: deliveries.filter((delivery) => delivery.status === "delivered").length,
      failed: deliveries.filter((delivery) => delivery.status === "failed").length,
      deadLetter: deliveries.filter((delivery) => delivery.status === "dead_letter").length,
      deliveries,
    };
    webhookWorkerDrains.set(webhookWorkerDrainKey(workerId, merchantId), {
      workerId,
      merchantId,
      checkedAt: result.checkedAt,
      attempted: result.attempted,
      delivered: result.delivered,
      failed: result.failed,
      deadLetter: result.deadLetter,
      updatedAt: result.checkedAt,
    });
    return result;
  });

  app.post("/v1/webhook-deliveries/:deliveryId/attempt", async (request, reply) => {
    try {
      const params = request.params as { deliveryId: string };
      const delivery = webhookDeliveries.get(params.deliveryId);
      if (!delivery) return reply.code(404).send({ error: "Webhook delivery not found" });
      return await attemptWebhookDelivery(delivery, {
        webhookEndpoints,
        webhookEvents,
        webhookDeliveries,
      }, resolvedConfig);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/webhook-deliveries/:deliveryId/replay", async (request, reply) => {
    try {
      const params = request.params as { deliveryId: string };
      const source = webhookDeliveries.get(params.deliveryId);
      if (!source) return reply.code(404).send({ error: "Webhook delivery not found" });
      const event = webhookEvents.get(source.eventId);
      if (!event) return reply.code(404).send({ error: "Webhook event not found" });
      const endpoint = webhookEndpoints.get(source.endpointId);
      if (!endpoint) return reply.code(404).send({ error: "Webhook endpoint not found" });
      const replay = createWebhookDelivery(event, endpoint, new Date().toISOString(), resolvedConfig.webhookMaxAttempts);
      webhookDeliveries.set(replay.deliveryId, replay);
      webhookEvents.set(event.eventId, {
        ...event,
        deliveryIds: [...event.deliveryIds, replay.deliveryId],
        updatedAt: replay.createdAt,
      });
      if (recordOf(request.body).attemptNow === true) {
        return reply.code(201).send(
          await attemptWebhookDelivery(replay, {
            webhookEndpoints,
            webhookEvents,
            webhookDeliveries,
          }, resolvedConfig),
        );
      }
      return reply.code(201).send(replay);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

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

class PersistentMap<K, V> extends Map<K, V> {
  constructor(private readonly onChange: () => void) {
    super();
  }

  override set(key: K, value: V): this {
    super.set(key, value);
    this.onChange();
    return this;
  }

  override delete(key: K): boolean {
    const deleted = super.delete(key);
    if (deleted) this.onChange();
    return deleted;
  }

  override clear(): void {
    if (this.size === 0) return;
    super.clear();
    this.onChange();
  }
}

class PersistentSet<T> extends Set<T> {
  constructor(private readonly onChange: () => void) {
    super();
  }

  override add(value: T): this {
    super.add(value);
    this.onChange();
    return this;
  }

  override delete(value: T): boolean {
    const deleted = super.delete(value);
    if (deleted) this.onChange();
    return deleted;
  }

  override clear(): void {
    if (this.size === 0) return;
    super.clear();
    this.onChange();
  }
}

interface SnapshotStores {
  merchants: Map<string, MerchantRecord>;
  merchantVaults: Map<string, MerchantVaultRecord>;
  merchantReceivers: Map<string, MerchantReceiverRecord>;
  commercePayments: Map<string, CommercePaymentRecord>;
  entitlements: Map<string, Entitlement>;
  bindings: Map<string, RedemptionBinding>;
  paymentIntents: Map<string, RedeemLoopPaymentIntent>;
  settlementProofs: Map<string, VoucherPaymentProof>;
  proofIdempotency: Map<string, string>;
  markPaidIdempotency: Set<string>;
  webhookEndpoints: Map<string, WebhookEndpointRecord>;
  webhookEvents: Map<string, WebhookEventRecord>;
  webhookDeliveries: Map<string, WebhookDeliveryRecord>;
  webhookWorkerDrains: Map<string, WebhookWorkerDrainRecord>;
  auditLogs: Map<string, AuditLogRecord>;
  shortLinks: Map<string, ShortPaymentLinkRecord>;
  publicPaymentSessions: Map<string, PublicPaymentSessionRecord>;
  registeredTerminals: Set<string>;
  terminalPaymentNonces: Set<string>;
  redemptionSubmissions: Set<string>;
}

function createApiSnapshot(stores: SnapshotStores): RedeemLoopApiSnapshot {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    merchants: [...stores.merchants.values()],
    merchantVaults: [...stores.merchantVaults.values()],
    merchantReceivers: [...stores.merchantReceivers.values()],
    commercePayments: [...stores.commercePayments.values()],
    entitlements: [...stores.entitlements.values()],
    bindings: [...stores.bindings.values()],
    paymentIntents: [...stores.paymentIntents.values()],
    settlementProofs: [...stores.settlementProofs.values()],
    proofIdempotency: [...stores.proofIdempotency.entries()],
    markPaidIdempotency: [...stores.markPaidIdempotency.values()],
    webhookEndpoints: [...stores.webhookEndpoints.values()],
    webhookEvents: [...stores.webhookEvents.values()],
    webhookDeliveries: [...stores.webhookDeliveries.values()],
    webhookWorkerDrains: [...stores.webhookWorkerDrains.values()],
    auditLogs: [...stores.auditLogs.values()],
    shortLinks: [...stores.shortLinks.values()],
    publicPaymentSessions: [...stores.publicPaymentSessions.values()],
    registeredTerminals: [...stores.registeredTerminals.values()],
    terminalPaymentNonces: [...stores.terminalPaymentNonces.values()],
    redemptionSubmissions: [...stores.redemptionSubmissions.values()],
  };
}

function hydrateApiSnapshot(snapshot: RedeemLoopApiSnapshot, stores: SnapshotStores): void {
  for (const merchant of snapshot.merchants as MerchantRecord[]) stores.merchants.set(merchant.merchantId, merchant);
  for (const vault of snapshot.merchantVaults as MerchantVaultRecord[]) stores.merchantVaults.set(vault.vaultId, vault);
  for (const receiver of snapshot.merchantReceivers as MerchantReceiverRecord[]) {
    stores.merchantReceivers.set(receiverKey(receiver.merchantId, receiver.chainId), receiver);
  }
  for (const payment of snapshot.commercePayments as CommercePaymentRecord[]) stores.commercePayments.set(payment.paymentId, payment);
  for (const entitlement of snapshot.entitlements as Entitlement[]) stores.entitlements.set(entitlement.entitlementId, entitlement);
  for (const binding of snapshot.bindings as RedemptionBinding[]) stores.bindings.set(binding.bindingId, binding);
  for (const intent of snapshot.paymentIntents as RedeemLoopPaymentIntent[]) stores.paymentIntents.set(intent.intentId, intent);
  for (const proof of snapshot.settlementProofs as VoucherPaymentProof[]) stores.settlementProofs.set(proof.proofId, proof);
  for (const [key, proofId] of snapshot.proofIdempotency ?? []) stores.proofIdempotency.set(key, proofId);
  for (const key of snapshot.markPaidIdempotency ?? []) stores.markPaidIdempotency.add(key);
  for (const endpoint of snapshot.webhookEndpoints as WebhookEndpointRecord[]) stores.webhookEndpoints.set(endpoint.id, endpoint);
  for (const event of (snapshot.webhookEvents ?? []) as WebhookEventRecord[]) stores.webhookEvents.set(event.eventId, event);
  for (const delivery of (snapshot.webhookDeliveries ?? []) as WebhookDeliveryRecord[]) stores.webhookDeliveries.set(delivery.deliveryId, delivery);
  for (const drain of (snapshot.webhookWorkerDrains ?? []) as WebhookWorkerDrainRecord[]) {
    stores.webhookWorkerDrains.set(webhookWorkerDrainKey(drain.workerId, drain.merchantId), drain);
  }
  for (const auditLog of (snapshot.auditLogs ?? []) as AuditLogRecord[]) stores.auditLogs.set(auditLog.auditId, auditLog);
  for (const shortLink of (snapshot.shortLinks ?? []) as ShortPaymentLinkRecord[]) stores.shortLinks.set(shortLink.slug, shortLink);
  for (const publicSession of (snapshot.publicPaymentSessions ?? []) as PublicPaymentSessionRecord[]) {
    stores.publicPaymentSessions.set(publicSession.intentId, publicSession);
  }
  for (const key of snapshot.registeredTerminals ?? []) stores.registeredTerminals.add(key);
  for (const key of snapshot.terminalPaymentNonces ?? []) stores.terminalPaymentNonces.add(key);
  for (const key of snapshot.redemptionSubmissions ?? []) stores.redemptionSubmissions.add(key);
}

interface MerchantContextStores {
  merchants: Map<string, MerchantRecord>;
  merchantVaults: Map<string, MerchantVaultRecord>;
  entitlements: Map<string, Entitlement>;
  bindings: Map<string, RedemptionBinding>;
  paymentIntents: Map<string, RedeemLoopPaymentIntent>;
  settlementProofs: Map<string, VoucherPaymentProof>;
  webhookEndpoints: Map<string, WebhookEndpointRecord>;
  webhookEvents: Map<string, WebhookEventRecord>;
  webhookDeliveries: Map<string, WebhookDeliveryRecord>;
}

function resolveRequestMerchantId(
  request: { method: string; url: string; body?: unknown; params?: unknown; query?: unknown },
  stores: MerchantContextStores,
): { required: boolean; merchantId?: string; error?: string } {
  const body = recordOf(request.body);
  const params = recordOf(request.params);
  const query = recordOf(request.query);
  if (request.url.startsWith("/v1/public/")) return { required: false };
  const directMerchantId = stringOf(body.merchantId) ?? stringOf(params.merchantId) ?? stringOf(query.merchantId);
  if (directMerchantId) return { required: true, merchantId: directMerchantId };

  if (request.method === "POST" && request.url === "/v1/merchants") {
    return { required: true, error: "merchantId is required when API keys are enabled" };
  }

  const vaultId = stringOf(params.vaultId);
  if (vaultId) return { required: true, merchantId: stores.merchantVaults.get(vaultId)?.merchantId };

  const entitlementId = stringOf(params.entitlementId);
  if (entitlementId) return { required: true, merchantId: stores.entitlements.get(entitlementId)?.merchantId };

  const bindingId = stringOf(body.bindingId) ?? stringOf(params.bindingId);
  if (bindingId) return { required: true, merchantId: stores.bindings.get(bindingId)?.merchantId };

  const intentId = stringOf(body.intentId) ?? stringOf(params.intentId);
  if (intentId) return { required: true, merchantId: stores.paymentIntents.get(intentId)?.merchantId };

  const proofId = stringOf(params.proofId);
  if (proofId) {
    const proof = stores.settlementProofs.get(proofId);
    return { required: true, merchantId: proof ? stores.paymentIntents.get(proof.intentId)?.merchantId : undefined };
  }

  const webhookEndpointId = stringOf(params.id);
  if (webhookEndpointId) return { required: true, merchantId: stores.webhookEndpoints.get(webhookEndpointId)?.merchantId };

  const webhookEventId = stringOf(params.eventId) ?? stringOf(query.eventId);
  if (webhookEventId) return { required: true, merchantId: stores.webhookEvents.get(webhookEventId)?.merchantId };

  const webhookDeliveryId = stringOf(params.deliveryId);
  if (webhookDeliveryId) return { required: true, merchantId: stores.webhookDeliveries.get(webhookDeliveryId)?.merchantId };

  if (
    request.url.startsWith("/v1/webhook-endpoints") ||
    request.url.startsWith("/v1/webhook-events") ||
    request.url.startsWith("/v1/webhook-deliveries") ||
    request.url.startsWith("/v1/diagnostics/webhooks") ||
    request.url.startsWith("/v1/merchant-vaults") ||
    request.url.startsWith("/v1/payment-intents/expire-stale") ||
    request.url === "/v1/payment-intents" ||
    request.url.startsWith("/v1/payment-intents?") ||
    request.url.startsWith("/v1/bindings") ||
    request.url.startsWith("/v1/audit-logs")
  ) {
    return { required: true, error: "merchantId is required when API keys are enabled" };
  }

  return { required: false };
}

function parseMerchantApiKeys(input: string | Record<string, string> | undefined): Record<string, string> {
  if (!input) return {};
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as Record<string, string>;
  return Object.fromEntries(
    trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf(":");
        if (separator <= 0) throw new Error("REDEEMLOOP_API_KEYS entries must use merchantId:apiKey");
        return [entry.slice(0, separator), entry.slice(separator + 1)];
      }),
  );
}

function parseEvmRpcUrls(input: string | Record<number, string> | Record<string, string> | undefined): Record<number, string> {
  if (!input) return {};
  if (typeof input !== "string") {
    return Object.fromEntries(Object.entries(input).map(([chainId, rpcUrl]) => [normalizeChainId(chainId), requireString(rpcUrl, `evmRpcUrls.${chainId}`)]));
  }
  const trimmed = input.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{")) return parseEvmRpcUrls(JSON.parse(trimmed) as Record<string, string>);
  const result: Record<number, string> = {};
  for (const entry of trimmed.split(",")) {
    if (!entry.trim()) continue;
    const separator = entry.indexOf(":");
    if (separator <= 0) throw new Error("EVM_RPC_URLS entries must use chainId:rpcUrl");
    const chainId = normalizeChainId(entry.slice(0, separator));
    const rpcUrl = entry.slice(separator + 1).trim();
    if (!rpcUrl) throw new Error(`EVM_RPC_URLS.${chainId} is required`);
    result[chainId] = rpcUrl;
  }
  return result;
}

function hasMerchantApiAccess(authorization: string | string[] | undefined, merchantId: string, apiKeys: Record<string, string>): boolean {
  const token = bearerToken(authorization);
  if (!token) return false;
  const expected = apiKeys[merchantId];
  if (!expected) return false;
  return constantTimeEquals(token, expected);
}

function bearerToken(authorization: string | string[] | undefined): string | undefined {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length);
}

function consumeRateLimit(
  request: FastifyRequest,
  config: ApiConfig,
  buckets: Map<string, RateLimitBucket>,
): RateLimitResult | undefined {
  if (!config.rateLimitEnabled) return undefined;
  if (request.method === "OPTIONS") return undefined;
  if (!request.url.startsWith("/v1/")) return undefined;

  const now = Date.now();
  const key = rateLimitKey(request);
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + config.rateLimitWindowMs };
  bucket.count += 1;
  buckets.set(key, bucket);

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const remaining = Math.max(0, config.rateLimitMax - bucket.count);
  return {
    allowed: bucket.count <= config.rateLimitMax,
    limit: config.rateLimitMax,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

function rateLimitKey(request: FastifyRequest): string {
  const token = bearerToken(request.headers.authorization);
  if (token) return `bearer:${createHash("sha256").update(token).digest("hex")}`;
  return `ip:${request.ip ?? request.socket?.remoteAddress ?? "unknown"}`;
}

function setRateLimitHeaders(reply: FastifyReply, result: RateLimitResult): void {
  reply.header("X-RateLimit-Limit", String(result.limit));
  reply.header("X-RateLimit-Remaining", String(result.remaining));
  reply.header("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  if (!result.allowed) reply.header("Retry-After", String(result.retryAfterSeconds));
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createCheckoutToken(): string {
  return randomBytes(24).toString("hex");
}

function hashCheckoutToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createPublicPaymentSession(intent: RedeemLoopPaymentIntent, checkoutToken: string): PublicPaymentSessionRecord {
  return {
    intentId: intent.intentId,
    merchantId: intent.merchantId,
    tokenHash: hashCheckoutToken(checkoutToken),
    channel: intent.channel,
    createdAt: new Date().toISOString(),
    expiresAt: intent.expiresAt,
  };
}

function checkoutTokenFromRequest(request: { body?: unknown; query?: unknown }): string | undefined {
  const body = recordOf(request.body);
  const query = recordOf(request.query);
  return stringOf(body.checkoutToken) ?? stringOf(body.token) ?? stringOf(query.checkoutToken) ?? stringOf(query.token);
}

function resolvePublicPaymentSession(input: {
  intentId: string;
  checkoutToken?: string;
  paymentIntents: Map<string, RedeemLoopPaymentIntent>;
  publicPaymentSessions: Map<string, PublicPaymentSessionRecord>;
  reply: FastifyReply;
}): { intent: RedeemLoopPaymentIntent; session: PublicPaymentSessionRecord } | undefined {
  if (!input.checkoutToken) {
    input.reply.code(401).send({ error: "checkoutToken is required" });
    return undefined;
  }
  const session = input.publicPaymentSessions.get(input.intentId);
  if (!session) {
    input.reply.code(404).send({ error: "Public payment session not found" });
    return undefined;
  }
  if (!constantTimeEquals(hashCheckoutToken(input.checkoutToken), session.tokenHash)) {
    input.reply.code(403).send({ error: "Invalid checkoutToken" });
    return undefined;
  }
  const intent = input.paymentIntents.get(input.intentId);
  if (!intent) {
    input.reply.code(404).send({ error: "PaymentIntent not found" });
    return undefined;
  }
  if (Date.parse(session.expiresAt) <= Date.now() && intent.status !== "paid" && intent.status !== "confirmed") {
    input.reply.code(410).send({ error: "Public payment session has expired", paymentIntent: intent });
    return undefined;
  }
  return { intent, session };
}

function buildPublicPaymentSessionResponse(
  paymentIntent: RedeemLoopPaymentIntent,
  publicSession: PublicPaymentSessionRecord,
  shortLink?: ShortPaymentLinkRecord,
) {
  return {
    publicSession: {
      intentId: publicSession.intentId,
      merchantId: publicSession.merchantId,
      channel: publicSession.channel,
      expiresAt: publicSession.expiresAt,
      createdAt: publicSession.createdAt,
    },
    shortLink: shortLink ? { ...shortLink, url: redactCheckoutTokenFromUrl(shortLink.url) } : undefined,
    paymentIntent,
  };
}

function redactCheckoutTokenFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("token");
    parsed.searchParams.delete("checkoutToken");
    return parsed.toString();
  } catch {
    return url.replace(/([?&])(token|checkoutToken)=[^&]+&?/g, "$1").replace(/[?&]$/, "");
  }
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOf(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function normalizeChainNamespace(value: unknown): "eip155" | "bitcoin" | "fractal" {
  if (value === "eip155" || value === "bitcoin" || value === "fractal") return value;
  throw new Error("chainNamespace must be eip155, bitcoin, or fractal");
}

function normalizeOptionalChainId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return normalizeChainId(value);
}

function normalizeVaultAddress(chainNamespace: "eip155" | "bitcoin" | "fractal", address: string): string {
  if (chainNamespace === "eip155") return normalizeAddress(address, "address");
  if (!address.trim()) throw new Error("address is required");
  return address.trim();
}

function normalizeAssetList(value: unknown): VoucherAssetDescriptor[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("acceptedAssets must contain at least one voucher asset");
  }
  return value.map((item, index) => {
    const asset = item as VoucherAssetDescriptor;
    assertValidVoucherAssetDescriptor(asset);
    if (!asset.assetId) throw new Error(`acceptedAssets[${index}].assetId is required`);
    return asset;
  });
}

function normalizeMerchantVaultMap(
  value: unknown,
  acceptedAssets: VoucherAssetDescriptor[],
  vaultRecords: Map<string, MerchantVaultRecord>,
): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const map = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, vault]) => [key, requireString(vault, `merchantVaults.${key}`)]),
    );
    if (Object.keys(map).length > 0) return map;
  }

  const derived: Record<string, string> = {};
  for (const asset of acceptedAssets) {
    const key = vaultKeyForAsset(asset);
    const vault = [...vaultRecords.values()].find(
      (record) => record.chainNamespace === asset.chainNamespace && (asset.chainNamespace !== "eip155" || record.chainId === asset.chainId),
    );
    if (vault) derived[key] = vault.address;
  }
  if (Object.keys(derived).length > 0) return derived;
  throw new Error("merchantVaults must contain at least one receiving address");
}

function normalizeSettlementPolicy(value: unknown): "collect" | "burn" | "escrow" {
  if (value === "collect" || value === "burn" || value === "escrow") return value;
  throw new Error("settlementPolicy must be collect, burn, or escrow");
}

function normalizeBindingStatus(value: unknown): BindingStatus {
  if (value === "draft" || value === "active" || value === "paused" || value === "archived") return value;
  throw new Error("status must be draft, active, paused, or archived");
}

function normalizeCommerceTargets(value: unknown): CommerceTarget[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("commerceTargets must contain at least one commerce target");
  }
  return value.map((target) => target as CommerceTarget);
}

function normalizePaymentChannel(value: unknown): RedeemLoopPaymentIntent["channel"] {
  if (value === "website" || value === "checkout" || value === "pos" || value === "miniapp" || value === "livestream" || value === "ad") {
    return value;
  }
  throw new Error("channel must be website, checkout, pos, miniapp, livestream, or ad");
}

function normalizeSkuLines(value: unknown, commerceTargets: CommerceTarget[]): RedeemLoopPaymentIntent["skuLines"] {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((item) => {
      const line = item as Record<string, unknown>;
      return {
        sku: requireString(line.sku, "skuLines[].sku"),
        quantity: normalizePositiveInteger(line.quantity ?? 1, "skuLines[].quantity"),
      };
    });
  }
  const sku = commerceTargets.find((target) => target.sku)?.sku ?? commerceTargets[0]?.productId ?? "voucher-tender";
  return [{ sku, quantity: 1 }];
}

function createPaymentIntentRecord(body: Record<string, unknown>, binding: RedemptionBinding, now: Date): RedeemLoopPaymentIntent {
  const bindingId = requireString(body.bindingId, "bindingId");
  const selectedAsset = optionalString(body.assetId, "assetId")
    ? findAcceptedAsset(binding, requireString(body.assetId, "assetId"))
    : undefined;
  const primaryAsset = selectedAsset ?? binding.acceptedAssets[0];
  const intent: RedeemLoopPaymentIntent = {
    intentId: optionalString(body.intentId, "intentId") ?? randomId("pi"),
    bindingId,
    merchantId: binding.merchantId,
    storeId: optionalString(body.storeId, "storeId") ?? binding.commerceTargets[0]?.storeId,
    channel: normalizePaymentChannel(body.channel ?? "checkout"),
    orderId: requireString(body.orderId, "orderId"),
    skuLines: normalizeSkuLines(body.skuLines, binding.commerceTargets),
    acceptedAssets: binding.acceptedAssets,
    selectedAsset,
    payerAddress: optionalString(body.payerAddress, "payerAddress"),
    merchantVault: findMerchantVaultAddress(binding, primaryAsset),
    settlementPolicy: binding.settlementPolicy,
    status: "created",
    expiresAt: optionalString(body.expiresAt, "expiresAt") ?? new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  assertValidPaymentIntent(intent);
  return intent;
}

function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(slug)) {
    throw new Error("slug must be 3-64 characters using lowercase letters, numbers, underscore, or hyphen");
  }
  return slug;
}

function normalizePositiveInteger(value: unknown, fieldName: string): number {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(numberValue) || Number(numberValue) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Number(numberValue);
}

function normalizeNonNegativeInteger(value: unknown, fieldName: string): number {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(numberValue) || Number(numberValue) < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return Number(numberValue);
}

function updateBindingStatus(
  params: { bindingId: string },
  status: BindingStatus,
  bindings: Map<string, RedemptionBinding>,
  reply: FastifyReply,
) {
  const binding = bindings.get(params.bindingId);
  if (!binding) return reply.code(404).send({ error: "Binding not found" });
  const updated = { ...binding, status, updatedAt: new Date().toISOString() };
  bindings.set(updated.bindingId, updated);
  return updated;
}

function updatePaymentIntent(
  params: { intentId: string },
  paymentIntents: Map<string, RedeemLoopPaymentIntent>,
  status: PaymentIntentStatus,
  patch: Partial<RedeemLoopPaymentIntent> = {},
  auditLogs?: Map<string, AuditLogRecord>,
): RedeemLoopPaymentIntent | undefined {
  const intent = paymentIntents.get(params.intentId);
  if (!intent) return undefined;
  const transitioned = intent.status === status ? { ...intent, updatedAt: new Date().toISOString() } : transitionPaymentIntent(intent, status);
  const updated = {
    ...transitioned,
    ...patch,
    intentId: intent.intentId,
    bindingId: intent.bindingId,
    merchantId: intent.merchantId,
    status,
  };
  assertValidPaymentIntent(updated);
  paymentIntents.set(updated.intentId, updated);
  if (auditLogs) {
    recordAuditLog(auditLogs, {
      merchantId: updated.merchantId,
      action: `payment_intent.${status}`,
      entityType: "payment_intent",
      entityId: updated.intentId,
      summary: `PaymentIntent moved to ${status}`,
      before: { status: intent.status },
      after: { status: updated.status },
    });
  }
  return updated;
}

function expireStalePaymentIntents(
  paymentIntents: Map<string, RedeemLoopPaymentIntent>,
  auditLogs: Map<string, AuditLogRecord>,
  now = new Date(),
  merchantId?: string,
): { expired: number; intentIds: string[] } {
  const intentIds: string[] = [];
  for (const intent of paymentIntents.values()) {
    if (merchantId && intent.merchantId !== merchantId) continue;
    if (!canTransition(intent.status, "expired")) continue;
    const expiresAt = Date.parse(intent.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt > now.getTime()) continue;
    const expired = transitionPaymentIntent(intent, "expired", now);
    paymentIntents.set(expired.intentId, expired);
    intentIds.push(expired.intentId);
    recordAuditLog(auditLogs, {
      merchantId: expired.merchantId,
      action: "payment_intent.expired",
      entityType: "payment_intent",
      entityId: expired.intentId,
      summary: "PaymentIntent expired after expiresAt",
      before: { status: intent.status, expiresAt: intent.expiresAt },
      after: { status: expired.status },
    });
  }
  return { expired: intentIds.length, intentIds };
}

function recordAuditLog(
  auditLogs: Map<string, AuditLogRecord>,
  input: Omit<AuditLogRecord, "auditId" | "createdAt">,
): AuditLogRecord {
  const auditLog: AuditLogRecord = {
    auditId: randomId("audit"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  auditLogs.set(auditLog.auditId, auditLog);
  return auditLog;
}

function merchantVaultVerificationMessage(vault: MerchantVaultRecord, nonce: string, expiresAt: string): string {
  return [
    "RedeemLoop merchant vault verification",
    `vaultId: ${vault.vaultId}`,
    `merchantId: ${vault.merchantId}`,
    `chainNamespace: ${vault.chainNamespace}`,
    `chainId: ${vault.chainId ?? ""}`,
    `address: ${vault.address}`,
    `nonce: ${nonce}`,
    `expiresAt: ${expiresAt}`,
  ].join("\n");
}

function findAcceptedAsset(binding: RedemptionBinding | RedeemLoopPaymentIntent, assetId: string): VoucherAssetDescriptor {
  const asset = binding.acceptedAssets.find((candidate) => candidate.assetId === assetId);
  if (!asset) throw new Error("assetId is not accepted by this binding");
  return asset;
}

function findAcceptedAssetByInput(acceptedAssets: VoucherAssetDescriptor[], body: Record<string, unknown>): VoucherAssetDescriptor {
  const assetId = requireString(body.assetId, "assetId");
  const asset = acceptedAssets.find((candidate) => candidate.assetId === assetId);
  if (!asset) throw new Error("assetId is not accepted by this PaymentIntent");
  return asset;
}

function findMerchantVaultAddress(binding: RedemptionBinding | undefined, asset: VoucherAssetDescriptor): string {
  if (!binding) throw new Error("Binding not found");
  const keys = [vaultKeyForAsset(asset), asset.chainNamespace, asset.assetId].filter(Boolean);
  for (const key of keys) {
    const vault = binding.merchantVaults[key];
    if (vault) return vault;
  }
  throw new Error("No merchant vault configured for selected asset");
}

function vaultKeyForAsset(asset: VoucherAssetDescriptor): string {
  if (asset.chainNamespace === "eip155") return `${asset.chainNamespace}:${asset.chainId}`;
  return asset.chainNamespace;
}

function advanceIntentFromProof(intent: RedeemLoopPaymentIntent, proof: VoucherPaymentProof): RedeemLoopPaymentIntent {
  if (proof.status === "failed") return moveIntentTo(intent, "failed");
  if (proof.status === "seen") return moveIntentTo(intent, "seen");
  return moveIntentTo(moveIntentTo(moveIntentTo(intent, "seen"), "confirmed"), "paid");
}

function moveIntentTo(intent: RedeemLoopPaymentIntent, status: PaymentIntentStatus): RedeemLoopPaymentIntent {
  if (intent.status === status) return intent;
  if (canTransition(intent.status, status)) return transitionPaymentIntent(intent, status);
  if (status === "seen" && (intent.status === "created" || intent.status === "wallet_connected" || intent.status === "asset_selected")) {
    return moveIntentTo(transitionPaymentIntent(intent, "transfer_requested"), "seen");
  }
  if (status === "confirmed") return moveIntentTo(moveIntentTo(intent, "seen"), "confirmed");
  if (status === "paid") return moveIntentTo(moveIntentTo(intent, "confirmed"), "paid");
  assertTransition(intent.status, status);
  return intent;
}

function buildTenderTransferRequest(
  intent: RedeemLoopPaymentIntent,
  asset: VoucherAssetDescriptor,
  input: Record<string, unknown>,
): { evm?: Erc20TransferRequest; bitcoin?: RuneTransferPsbtRequest } {
  if (asset.chainNamespace === "eip155" && asset.assetType === "erc20") {
    return {
      evm: buildErc20TransferRequest({
        from: intent.payerAddress,
        to: intent.merchantVault,
        asset,
        amount: asset.requiredAmount,
      }),
    };
  }
  if ((asset.chainNamespace === "bitcoin" || asset.chainNamespace === "fractal") && asset.assetType === "rune") {
    const from = optionalString(input.payerAddress, "payerAddress") ?? intent.payerAddress;
    if (!from) throw new Error("payerAddress is required for Rune PSBT requests");
    return {
      bitcoin: buildRuneTransferPsbtRequest({
        network: normalizeBitcoinNetwork(input.network ?? "testnet"),
        from,
        to: intent.merchantVault,
        asset,
        amount: asset.requiredAmount,
        feeRate: input.feeRate === undefined ? undefined : normalizePositiveInteger(input.feeRate, "feeRate"),
        changeAddress: optionalString(input.changeAddress, "changeAddress"),
        payerPublicKey: optionalString(input.payerPublicKey, "payerPublicKey"),
        utxos: normalizeRuneUtxos(input.runeUtxos),
      }),
    };
  }
  return {};
}

function buildTenderBalanceCheck(payerAddress: string, asset: VoucherAssetDescriptor, balance?: string): Erc20BalanceCheckRequest {
  if (asset.chainNamespace !== "eip155" || asset.assetType !== "erc20") {
    throw new Error("Balance check currently supports EVM ERC-20 voucher assets");
  }
  return buildErc20BalanceCheckRequest({
    account: payerAddress,
    asset,
    requiredAmount: asset.requiredAmount,
    balance,
  });
}

function normalizeBitcoinNetwork(value: unknown): BitcoinNetwork {
  if (
    value === "mainnet" ||
    value === "testnet" ||
    value === "signet" ||
    value === "regtest" ||
    value === "fractal-mainnet" ||
    value === "fractal-testnet"
  ) {
    return value;
  }
  throw new Error("network must be mainnet, testnet, signet, regtest, fractal-mainnet, or fractal-testnet");
}

function normalizeRuneIndexerNetwork(value: unknown): RuneIndexerNetwork {
  if (value === "mainnet" || value === "signet" || value === "testnet4") return value;
  throw new Error("XVERSE_NETWORK must be mainnet, signet, or testnet4");
}

function normalizeRuneUtxos(value: unknown): RuneUtxo[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("runeUtxos must contain at least one UTXO");
  }
  return value.map((item, index) => {
    const utxo = recordOf(item);
    return {
      txid: requireString(utxo.txid, `runeUtxos[${index}].txid`),
      vout: normalizeNonNegativeInteger(utxo.vout, `runeUtxos[${index}].vout`),
      value: normalizePositiveInteger(utxo.value, `runeUtxos[${index}].value`),
      address: requireString(utxo.address, `runeUtxos[${index}].address`),
      runeId: requireString(utxo.runeId, `runeUtxos[${index}].runeId`),
      amount: requireString(utxo.amount, `runeUtxos[${index}].amount`),
      scriptPubKey: optionalString(utxo.scriptPubKey, `runeUtxos[${index}].scriptPubKey`),
      raw: utxo.raw,
    };
  });
}

async function fetchEvmReceipt(
  txid: Hex,
  chainId: number,
  config: ApiConfig,
): Promise<{ receipt: Erc20TransactionReceiptLike; currentBlockNumber?: bigint | number }> {
  const rpcUrl = config.evmRpcUrls[chainId] ?? config.rpcUrl;
  if (config.evmReceiptProvider) {
    return config.evmReceiptProvider({ txid, chainId, rpcUrl });
  }
  if (!rpcUrl) throw new Error("RPC_URL or EVM_RPC_URLS entry is required for trusted EVM settlement recheck");
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });
  const [receipt, currentBlockNumber] = await Promise.all([
    publicClient.getTransactionReceipt({ hash: txid }),
    publicClient.getBlockNumber(),
  ]);
  return {
    receipt: {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      status: receipt.status,
      logs: receipt.logs.map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        logIndex: log.logIndex,
      })),
    },
    currentBlockNumber,
  };
}

async function checkEvmRpcDiagnostic(
  chainId: number,
  name: string,
  config: ApiConfig,
): Promise<{
  chainId: number;
  name: string;
  status: "ok" | "missing" | "error";
  rpcConfigured: boolean;
  rpcSource?: "EVM_RPC_URLS" | "RPC_URL";
  rpcOrigin?: string;
  latestBlockNumber?: string;
  latencyMs?: number;
  error?: string;
}> {
  const rpc = resolveEvmRpcDiagnosticUrl(chainId, config);
  if (!rpc.rpcUrl) {
    return {
      chainId,
      name,
      status: "missing",
      rpcConfigured: false,
      error: "No RPC URL configured for this chain. Set EVM_RPC_URLS for this chainId or provide RPC_URL as a fallback.",
    };
  }

  const startedAt = Date.now();
  try {
    const health = config.evmRpcHealthProvider
      ? await config.evmRpcHealthProvider({ chainId, rpcUrl: rpc.rpcUrl })
      : { latestBlockNumber: await createPublicClient({ transport: http(rpc.rpcUrl) }).getBlockNumber() };
    return {
      chainId,
      name,
      status: "ok",
      rpcConfigured: true,
      rpcSource: rpc.source,
      rpcOrigin: rpcOriginOf(rpc.rpcUrl),
      latestBlockNumber: health.latestBlockNumber === undefined ? undefined : String(health.latestBlockNumber),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      chainId,
      name,
      status: "error",
      rpcConfigured: true,
      rpcSource: rpc.source,
      rpcOrigin: rpcOriginOf(rpc.rpcUrl),
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "EVM RPC health check failed",
    };
  }
}

function resolveEvmRpcDiagnosticUrl(
  chainId: number,
  config: ApiConfig,
): { rpcUrl?: string; source?: "EVM_RPC_URLS" | "RPC_URL" } {
  if (config.evmRpcUrls[chainId]) return { rpcUrl: config.evmRpcUrls[chainId], source: "EVM_RPC_URLS" };
  if (config.rpcUrl) return { rpcUrl: config.rpcUrl, source: "RPC_URL" };
  return {};
}

function rpcOriginOf(rpcUrl: string): string {
  try {
    return new URL(rpcUrl).origin;
  } catch {
    return "<configured>";
  }
}

function getRuneIndexer(config: ApiConfig): RuneIndexerAdapter {
  if (config.runeIndexer) return config.runeIndexer;
  if (!config.xverseApiKey) throw new Error("XVERSE_API_KEY is required for Rune settlement recheck");
  return createXverseRuneIndexerAdapter({
    apiKey: config.xverseApiKey,
    network: config.xverseNetwork,
    baseUrl: config.xverseApiBaseUrl,
  });
}

function movePaymentIntentForBalanceCheck(
  intent: RedeemLoopPaymentIntent,
  targetStatus: "wallet_connected" | "asset_selected",
  patch: Partial<RedeemLoopPaymentIntent>,
): RedeemLoopPaymentIntent {
  let next = intent;
  if (next.status === "created") {
    next = transitionPaymentIntent(next, "wallet_connected");
  }
  if (targetStatus === "asset_selected" && next.status === "wallet_connected") {
    next = transitionPaymentIntent(next, "asset_selected");
  }
  const updated = {
    ...next,
    ...patch,
    intentId: intent.intentId,
    bindingId: intent.bindingId,
    merchantId: intent.merchantId,
    status: next.status,
    updatedAt: new Date().toISOString(),
  };
  assertValidPaymentIntent(updated);
  return updated;
}

async function markIntentCommercePaid(
  intent: RedeemLoopPaymentIntent,
  proof: VoucherPaymentProof,
  binding: RedemptionBinding | undefined,
  config: ApiConfig,
  idempotency: Set<string>,
) {
  const target = binding?.commerceTargets.find((candidate) => candidate.storeId === intent.storeId) ?? binding?.commerceTargets[0];
  const platform = commerceProviderForTarget(target);
  const storeId = target?.storeId ?? intent.storeId ?? "default";
  const idempotencyKey = markPaidIdempotencyKey({ platform, storeId, orderId: intent.orderId, intentId: intent.intentId });
  if (idempotency.has(idempotencyKey)) {
    return { duplicate: true, idempotencyKey };
  }

  const result = await markCommerceOrderAsPaid(
    {
      provider: platform,
      orderId: intent.orderId,
      paymentId: intent.intentId,
      intentId: intent.intentId,
      merchantId: intent.merchantId,
      chainId: proof.chainId,
      voucherToken: proof.contract ?? proof.assetId,
      assetId: proof.assetId,
      amount: proof.amount,
      receiver: proof.to,
      txHash: proof.txid,
    },
    commerceAdapterConfig(config),
  );
  idempotency.add(idempotencyKey);
  return { ...result, idempotencyKey };
}

function commerceProviderForTarget(target: CommerceTarget | undefined): CommerceProvider {
  if (target?.platform === "shopify" || target?.platform === "woocommerce" || target?.platform === "custom") return target.platform;
  return "custom";
}

interface WebhookOutboxStores {
  webhookEndpoints: Map<string, WebhookEndpointRecord>;
  webhookEvents: Map<string, WebhookEventRecord>;
  webhookDeliveries: Map<string, WebhookDeliveryRecord>;
}

function enqueuePaymentIntentWebhookEvent(input: {
  eventType: string;
  intent: RedeemLoopPaymentIntent;
  proof: VoucherPaymentProof;
  webhookEndpoints: Map<string, WebhookEndpointRecord>;
  webhookEvents: Map<string, WebhookEventRecord>;
  webhookDeliveries: Map<string, WebhookDeliveryRecord>;
  maxAttempts: number;
}): WebhookEventRecord {
  const now = new Date().toISOString();
  const eventId = stableWebhookEventId(input.eventType, input.intent.intentId);
  const existing = input.webhookEvents.get(eventId);
  if (existing) return existing;

  const event: WebhookEventRecord = {
    eventId,
    merchantId: input.intent.merchantId,
    type: input.eventType,
    payload: paymentIntentWebhookPayload(eventId, input.eventType, input.intent, input.proof, now),
    deliveryIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const matchingEndpoints = [...input.webhookEndpoints.values()].filter(
    (endpoint) => endpoint.active && endpoint.merchantId === input.intent.merchantId && endpointAcceptsEvent(endpoint, input.eventType),
  );
  const deliveryIds: string[] = [];
  for (const endpoint of matchingEndpoints) {
    const delivery = createWebhookDelivery(event, endpoint, now, input.maxAttempts);
    input.webhookDeliveries.set(delivery.deliveryId, delivery);
    deliveryIds.push(delivery.deliveryId);
  }
  const eventWithDeliveries = { ...event, deliveryIds, updatedAt: now };
  input.webhookEvents.set(eventWithDeliveries.eventId, eventWithDeliveries);
  return eventWithDeliveries;
}

function paymentIntentWebhookPayload(
  eventId: string,
  eventType: string,
  intent: RedeemLoopPaymentIntent,
  proof: VoucherPaymentProof,
  createdAt: string,
) {
  return {
    id: eventId,
    type: eventType,
    createdAt,
    merchantId: intent.merchantId,
    intentId: intent.intentId,
    orderId: intent.orderId,
    txHash: proof.txid,
    paymentIntent: intent,
    proof,
    data: {
      paymentIntent: intent,
      proof,
    },
  };
}

function stableWebhookEventId(eventType: string, intentId: string): string {
  return `evt_${intentId}_${eventType.replace(/[^a-zA-Z0-9]+/g, "_")}`;
}

function endpointAcceptsEvent(endpoint: WebhookEndpointRecord, eventType: string): boolean {
  return endpoint.events.includes("*") || endpoint.events.includes(eventType);
}

function createWebhookDelivery(
  event: WebhookEventRecord,
  endpoint: WebhookEndpointRecord,
  now: string,
  maxAttempts: number,
): WebhookDeliveryRecord {
  return {
    deliveryId: randomId("whd"),
    eventId: event.eventId,
    endpointId: endpoint.id,
    merchantId: event.merchantId,
    eventType: event.type,
    url: endpoint.url,
    status: "pending",
    attempts: 0,
    maxAttempts,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function claimDueWebhookDeliveries(
  stores: WebhookOutboxStores,
  options: { merchantId?: string; limit: number; now: Date; workerId: string; leaseMs: number },
): WebhookDeliveryRecord[] {
  const claimed: WebhookDeliveryRecord[] = [];
  for (const delivery of stores.webhookDeliveries.values()) {
    if (claimed.length >= options.limit) break;
    if (options.merchantId && delivery.merchantId !== options.merchantId) continue;
    if (!isWebhookDeliveryDue(delivery, options.now)) continue;

    const nowIso = options.now.toISOString();
    const next: WebhookDeliveryRecord = {
      ...delivery,
      status: "processing",
      leaseOwner: options.workerId,
      leaseAcquiredAt: nowIso,
      leaseExpiresAt: new Date(options.now.getTime() + options.leaseMs).toISOString(),
      updatedAt: nowIso,
    };
    stores.webhookDeliveries.set(next.deliveryId, next);
    claimed.push(next);
  }
  return claimed;
}

function isWebhookDeliveryDue(delivery: WebhookDeliveryRecord, now: Date): boolean {
  if (delivery.status === "pending" || delivery.status === "failed") {
    const nextAttemptAt = delivery.nextAttemptAt;
    if (!nextAttemptAt) return false;
    return Date.parse(nextAttemptAt) <= now.getTime();
  }
  if (delivery.status === "processing") {
    const leaseExpiresAt = delivery.leaseExpiresAt;
    if (!leaseExpiresAt) return false;
    return Date.parse(leaseExpiresAt) <= now.getTime();
  }
  return false;
}

function getWebhookOperationsDiagnostics(
  stores: { webhookDeliveries: Map<string, WebhookDeliveryRecord>; webhookWorkerDrains: Map<string, WebhookWorkerDrainRecord> },
  options: { merchantId?: string; now: Date; staleProcessingMs: number; noDrainMs: number },
) {
  const nowMs = options.now.getTime();
  const deliveries = [...stores.webhookDeliveries.values()].filter((delivery) => !options.merchantId || delivery.merchantId === options.merchantId);
  const recentDrains = [...stores.webhookWorkerDrains.values()]
    .filter((drain) => !options.merchantId || !drain.merchantId || drain.merchantId === options.merchantId)
    .sort((left, right) => Date.parse(right.checkedAt) - Date.parse(left.checkedAt));
  const latestDrainAt = recentDrains[0]?.checkedAt;
  const noRecentDrain = !latestDrainAt || Date.parse(latestDrainAt) < nowMs - options.noDrainMs;
  const staleProcessing = deliveries.filter((delivery) => isStaleProcessingDelivery(delivery, nowMs, options.staleProcessingMs));
  const counts = countWebhookDeliveryStatuses(deliveries);
  const recommendedActions = webhookDiagnosticActions(counts, staleProcessing.length, noRecentDrain);

  return {
    checkedAt: options.now.toISOString(),
    merchantId: options.merchantId,
    thresholds: {
      staleProcessingMs: options.staleProcessingMs,
      noDrainMs: options.noDrainMs,
    },
    deliveries: {
      ...counts,
      staleProcessing: staleProcessing.length,
    },
    worker: {
      latestDrainAt,
      noRecentDrain,
      recentDrains: recentDrains.slice(0, 10),
    },
    staleProcessing: staleProcessing.slice(0, 25).map(summarizeWebhookDelivery),
    recommendedActions,
  };
}

function isStaleProcessingDelivery(delivery: WebhookDeliveryRecord, nowMs: number, staleProcessingMs: number): boolean {
  if (delivery.status !== "processing") return false;
  if (delivery.leaseExpiresAt && Date.parse(delivery.leaseExpiresAt) <= nowMs) return true;
  if (delivery.leaseAcquiredAt && Date.parse(delivery.leaseAcquiredAt) <= nowMs - staleProcessingMs) return true;
  return false;
}

function countWebhookDeliveryStatuses(deliveries: WebhookDeliveryRecord[]) {
  return {
    total: deliveries.length,
    pending: deliveries.filter((delivery) => delivery.status === "pending").length,
    processing: deliveries.filter((delivery) => delivery.status === "processing").length,
    delivered: deliveries.filter((delivery) => delivery.status === "delivered").length,
    failed: deliveries.filter((delivery) => delivery.status === "failed").length,
    deadLetter: deliveries.filter((delivery) => delivery.status === "dead_letter").length,
  };
}

function summarizeWebhookDelivery(delivery: WebhookDeliveryRecord) {
  return {
    deliveryId: delivery.deliveryId,
    eventId: delivery.eventId,
    endpointId: delivery.endpointId,
    merchantId: delivery.merchantId,
    status: delivery.status,
    attempts: delivery.attempts,
    maxAttempts: delivery.maxAttempts,
    nextAttemptAt: delivery.nextAttemptAt,
    lastAttemptAt: delivery.lastAttemptAt,
    leaseOwner: delivery.leaseOwner,
    leaseAcquiredAt: delivery.leaseAcquiredAt,
    leaseExpiresAt: delivery.leaseExpiresAt,
    lastError: delivery.lastError,
  };
}

function webhookDiagnosticActions(
  counts: ReturnType<typeof countWebhookDeliveryStatuses>,
  staleProcessingCount: number,
  noRecentDrain: boolean,
): string[] {
  const actions: string[] = [];
  if (noRecentDrain) actions.push("Start or inspect the webhook worker; no recent drain heartbeat is available.");
  if (staleProcessingCount > 0) actions.push("Inspect stale processing deliveries and replay them after confirming downstream idempotency.");
  if (counts.deadLetter > 0) actions.push("Review dead-letter deliveries and replay after fixing the merchant endpoint.");
  if (counts.failed > 0) actions.push("Check failed deliveries; they will retry when nextAttemptAt is due.");
  if (actions.length === 0) actions.push("No immediate webhook delivery action required.");
  return actions;
}

function webhookWorkerDrainKey(workerId: string, merchantId: string | undefined): string {
  return `${merchantId ?? "*"}:${workerId}`;
}

async function attemptWebhookDelivery(
  delivery: WebhookDeliveryRecord,
  stores: WebhookOutboxStores,
  config: ApiConfig,
): Promise<WebhookDeliveryRecord> {
  const event = stores.webhookEvents.get(delivery.eventId);
  if (!event) throw new Error("Webhook event not found");
  const endpoint = stores.webhookEndpoints.get(delivery.endpointId);
  if (!endpoint) throw new Error("Webhook endpoint not found");
  if (!endpoint.active) throw new Error("Webhook endpoint is not active");

  const request = createWebhookDeliveryRequest(delivery, event, endpoint);
  const attemptCount = delivery.attempts + 1;
  const attemptedAt = new Date().toISOString();
  try {
    const sender = config.webhookDeliverySender ?? ((input) => defaultWebhookDeliverySender(input, config.webhookRequestTimeoutMs));
    const response = await sender(request);
    const ok = response.statusCode >= 200 && response.statusCode < 300;
    const updated = finalizeWebhookDeliveryAttempt(delivery, {
      request,
      attempts: attemptCount,
      attemptedAt,
      statusCode: response.statusCode,
      responseBody: response.body,
      error: ok ? undefined : `Webhook endpoint returned HTTP ${response.statusCode}`,
      delivered: ok,
    });
    stores.webhookDeliveries.set(updated.deliveryId, updated);
    return updated;
  } catch (error) {
    const updated = finalizeWebhookDeliveryAttempt(delivery, {
      request,
      attempts: attemptCount,
      attemptedAt,
      error: error instanceof Error ? error.message : "Webhook delivery failed",
      delivered: false,
    });
    stores.webhookDeliveries.set(updated.deliveryId, updated);
    return updated;
  }
}

function createWebhookDeliveryRequest(
  delivery: WebhookDeliveryRecord,
  event: WebhookEventRecord,
  endpoint: WebhookEndpointRecord,
): WebhookDeliveryRequest {
  const rawBody = JSON.stringify(event.payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(8).toString("hex");
  const headers = {
    "Content-Type": "application/json",
    "X-RedeemLoop-Event-Id": event.eventId,
    "X-RedeemLoop-Delivery-Id": delivery.deliveryId,
    "X-RedeemLoop-Timestamp": timestamp,
    "X-RedeemLoop-Nonce": nonce,
    "X-RedeemLoop-Signature": signRedeemLoopWebhook(endpoint.secret, timestamp, nonce, rawBody),
  };
  return {
    deliveryId: delivery.deliveryId,
    eventId: event.eventId,
    eventType: event.type,
    url: delivery.url,
    headers,
    rawBody,
    body: event.payload,
  };
}

function finalizeWebhookDeliveryAttempt(
  delivery: WebhookDeliveryRecord,
  result: {
    request: WebhookDeliveryRequest;
    attempts: number;
    attemptedAt: string;
    statusCode?: number;
    responseBody?: unknown;
    error?: string;
    delivered: boolean;
  },
): WebhookDeliveryRecord {
  const exhausted = !result.delivered && result.attempts >= delivery.maxAttempts;
  const nextStatus: WebhookDeliveryStatus = result.delivered ? "delivered" : exhausted ? "dead_letter" : "failed";
  const attemptedAtMs = Date.parse(result.attemptedAt);
  const nextAttemptAt = result.delivered || exhausted ? undefined : new Date(attemptedAtMs + webhookBackoffMs(result.attempts)).toISOString();
  return {
    ...delivery,
    status: nextStatus,
    attempts: result.attempts,
    nextAttemptAt,
    lastAttemptAt: result.attemptedAt,
    deliveredAt: result.delivered ? result.attemptedAt : delivery.deliveredAt,
    leaseOwner: undefined,
    leaseAcquiredAt: undefined,
    leaseExpiresAt: undefined,
    lastError: result.error,
    responseStatus: result.statusCode,
    responseBody: result.responseBody,
    request: {
      method: "POST",
      url: result.request.url,
      headers: result.request.headers,
      body: result.request.body,
    },
    updatedAt: result.attemptedAt,
  };
}

function webhookBackoffMs(attempts: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 60 * 60_000);
}

async function defaultWebhookDeliverySender(request: WebhookDeliveryRequest, timeoutMs: number): Promise<WebhookDeliverySenderResult> {
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: request.rawBody,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text().catch(() => undefined);
  return {
    statusCode: response.status,
    body,
  };
}

function redactWebhookSecret(endpoint: WebhookEndpointRecord) {
  return {
    ...endpoint,
    secret: "<redacted>",
  };
}

function parseAllowedOrigins(input: string | string[] | undefined): string[] {
  const values = Array.isArray(input) ? input : String(input ?? "").split(",");
  return values.map((value) => value.trim()).filter(Boolean);
}

function isAllowedEmbedOrigin(origin: string | undefined, config: ApiConfig, merchants: Map<string, MerchantRecord>): boolean {
  if (!origin) return true;
  if (config.embedAllowedOrigins.includes("*")) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  if (config.embedAllowedOrigins.some((allowed) => normalizeOrigin(allowed) === normalizedOrigin)) return true;
  const originHost = normalizedHost(origin);
  if (!originHost) return false;
  return [...merchants.values()].some((merchant) =>
    merchant.domains.some((domain) => domain.verified && normalizedHost(domain.domain) === originHost),
  );
}

function countVerifiedMerchantDomains(merchants: Map<string, MerchantRecord>): number {
  return [...merchants.values()].reduce((count, merchant) => count + merchant.domains.filter((domain) => domain.verified).length, 0);
}

function normalizeOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return undefined;
  }
}

function normalizedHost(value: string): string | undefined {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).host.toLowerCase();
  } catch {
    return undefined;
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
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
  return { error: errorMessage(error) };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected API error";
}
