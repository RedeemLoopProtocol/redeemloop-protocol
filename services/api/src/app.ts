import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  buildErc20BalanceCheckRequest,
  buildErc20TransferRequest,
  type Erc20BalanceCheckRequest,
  type Erc20TransferRequest,
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
import { createJsonFilePersistence, type RedeemLoopApiSnapshot } from "./persistence.js";

interface ApiConfig {
  chainId: number;
  rpcUrl?: string;
  relayerPrivateKey?: Hex;
  dryRun: boolean;
  embedAllowedOrigins: string[];
  storageFile?: string;
  apiKeys: Record<string, string>;
  shopifyShopDomain?: string;
  shopifyAdminAccessToken?: string;
  shopifyApiVersion: string;
  shopifyWebhookSecret?: string;
  woocommerceStoreUrl?: string;
  woocommerceConsumerKey?: string;
  woocommerceConsumerSecret?: string;
  woocommerceWebhookSecret?: string;
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
  let schedulePersist = () => {};
  const registeredTerminals = new PersistentSet<string>(() => schedulePersist());
  const redemptionSubmissions = new PersistentSet<string>(() => schedulePersist());
  const merchantReceivers = new PersistentMap<string, MerchantReceiverRecord>(() => schedulePersist());
  const commercePayments = new PersistentMap<string, CommercePaymentRecord>(() => schedulePersist());
  const merchants = new PersistentMap<string, MerchantRecord>(() => schedulePersist());
  const merchantVaults = new PersistentMap<string, MerchantVaultRecord>(() => schedulePersist());
  const entitlements = new PersistentMap<string, Entitlement>(() => schedulePersist());
  const bindings = new PersistentMap<string, RedemptionBinding>(() => schedulePersist());
  const paymentIntents = new PersistentMap<string, RedeemLoopPaymentIntent>(() => schedulePersist());
  const settlementProofs = new PersistentMap<string, VoucherPaymentProof>(() => schedulePersist());
  const proofIdempotency = new PersistentMap<string, string>(() => schedulePersist());
  const markPaidIdempotency = new PersistentSet<string>(() => schedulePersist());
  const webhookEndpoints = new PersistentMap<string, WebhookEndpointRecord>(() => schedulePersist());
  const resolvedConfig: ApiConfig = {
    chainId: normalizeChainId(config.chainId ?? process.env.CHAIN_ID ?? 31337),
    rpcUrl: config.rpcUrl ?? process.env.RPC_URL,
    relayerPrivateKey: config.relayerPrivateKey ?? (process.env.RELAYER_PRIVATE_KEY as Hex | undefined),
    dryRun: config.dryRun ?? process.env.RELAYER_DRY_RUN !== "false",
    embedAllowedOrigins: parseAllowedOrigins(
      config.embedAllowedOrigins ??
        process.env.REDEEMLOOP_EMBED_ALLOWED_ORIGINS ??
        "http://localhost:3000,http://127.0.0.1:3000",
    ),
    storageFile: config.storageFile ?? process.env.REDEEMLOOP_STORAGE_FILE,
    apiKeys: parseMerchantApiKeys(config.apiKeys ?? process.env.REDEEMLOOP_API_KEYS),
    shopifyShopDomain: config.shopifyShopDomain ?? process.env.SHOPIFY_SHOP_DOMAIN,
    shopifyAdminAccessToken: config.shopifyAdminAccessToken ?? process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    shopifyApiVersion: config.shopifyApiVersion ?? process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-04",
    shopifyWebhookSecret: config.shopifyWebhookSecret ?? process.env.SHOPIFY_WEBHOOK_SECRET,
    woocommerceStoreUrl: config.woocommerceStoreUrl ?? process.env.WOOCOMMERCE_STORE_URL,
    woocommerceConsumerKey: config.woocommerceConsumerKey ?? process.env.WOOCOMMERCE_CONSUMER_KEY,
    woocommerceConsumerSecret: config.woocommerceConsumerSecret ?? process.env.WOOCOMMERCE_CONSUMER_SECRET,
    woocommerceWebhookSecret: config.woocommerceWebhookSecret ?? process.env.WOOCOMMERCE_WEBHOOK_SECRET,
  };
  const persistence = createJsonFilePersistence(resolvedConfig.storageFile);
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
      registeredTerminals,
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
            registeredTerminals,
            redemptionSubmissions,
          }),
        ),
      )
      .catch((error: unknown) => {
        app.log.error(error);
      });
  };

  app.addHook("onClose", async () => {
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
          registeredTerminals,
          redemptionSubmissions,
        }),
      );
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
    if (Object.keys(resolvedConfig.apiKeys).length === 0) return;
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
    });
    if (!merchantContext.required) return;
    if (!merchantContext.merchantId) {
      return reply.code(400).send({ error: merchantContext.error ?? "merchantId is required when API keys are enabled" });
    }
    if (!hasMerchantApiAccess(request.headers.authorization, merchantContext.merchantId, resolvedConfig.apiKeys)) {
      return reply.code(bearerToken(request.headers.authorization) ? 403 : 401).send({ error: "Invalid merchant API key" });
    }
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
    persistence: {
      enabled: persistence.enabled,
    },
    auth: {
      apiKeysEnabled: Object.keys(resolvedConfig.apiKeys).length > 0,
    },
  }));

  app.post("/v1/merchants", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
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
      const body = request.body as Record<string, unknown>;
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

  app.post("/v1/merchant-vaults/:vaultId/verify-signature", async (request, reply) => {
    try {
      const params = request.params as { vaultId: string };
      const body = request.body as Record<string, unknown>;
      const vault = merchantVaults.get(params.vaultId);
      if (!vault) return reply.code(404).send({ error: "Merchant vault not found" });
      requireString(body.signature, "signature");
      const updated = { ...vault, verified: true, updatedAt: new Date().toISOString() };
      merchantVaults.set(updated.vaultId, updated);
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

  app.post("/v1/payment-intents", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const bindingId = requireString(body.bindingId, "bindingId");
      const binding = bindings.get(bindingId);
      if (!binding) return reply.code(404).send({ error: "Binding not found" });
      if (binding.status !== "active") return reply.code(409).send({ error: "Binding is not active" });
      const now = new Date();
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
      paymentIntents.set(intent.intentId, intent);
      return reply.code(201).send(intent);
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
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
      });
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
      });
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
      });
      if (!next) return reply.code(404).send({ error: "PaymentIntent not found" });
      return {
        ...next,
        transfer: {
          to: next.merchantVault,
          asset,
          amount: asset.requiredAmount,
          settlementPolicy: next.settlementPolicy,
          evm: buildTenderTransferRequest(next, asset),
        },
      };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/payment-intents/:intentId/broadcasted", async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      requireString(body.txid, "txid");
      const updated = updatePaymentIntent(request.params as { intentId: string }, paymentIntents, "broadcasted");
      if (!updated) return reply.code(404).send({ error: "PaymentIntent not found" });
      return { ...updated, txid: body.txid };
    } catch (error) {
      return reply.code(400).send(errorBody(error));
    }
  });

  app.post("/v1/payment-intents/:intentId/cancel", async (request, reply) => {
    try {
      const updated = updatePaymentIntent(request.params as { intentId: string }, paymentIntents, "cancelled");
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
      const commerce = proof.status === "confirmed" || proof.status === "finalized"
        ? await markIntentCommercePaid(nextIntent, proof, bindings.get(nextIntent.bindingId), resolvedConfig, markPaidIdempotency)
        : undefined;

      return reply.code(201).send({
        ...proof,
        paymentIntent: paymentIntents.get(nextIntent.intentId),
        commerce,
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
  registeredTerminals: Set<string>;
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
    registeredTerminals: [...stores.registeredTerminals.values()],
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
  for (const key of snapshot.registeredTerminals ?? []) stores.registeredTerminals.add(key);
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
}

function resolveRequestMerchantId(
  request: { method: string; url: string; body?: unknown; params?: unknown; query?: unknown },
  stores: MerchantContextStores,
): { required: boolean; merchantId?: string; error?: string } {
  const body = recordOf(request.body);
  const params = recordOf(request.params);
  const query = recordOf(request.query);
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

  if (request.url.startsWith("/v1/webhook-endpoints") || request.url.startsWith("/v1/merchant-vaults") || request.url.startsWith("/v1/bindings")) {
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

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
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
  return updated;
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

function buildTenderTransferRequest(intent: RedeemLoopPaymentIntent, asset: VoucherAssetDescriptor): Erc20TransferRequest | undefined {
  if (asset.chainNamespace !== "eip155" || asset.assetType !== "erc20") return undefined;
  return buildErc20TransferRequest({
    from: intent.payerAddress,
    to: intent.merchantVault,
    asset,
    amount: asset.requiredAmount,
  });
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
  return { error: error instanceof Error ? error.message : "Unexpected API error" };
}
