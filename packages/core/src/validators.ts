import type {
  AssetType,
  BindingStatus,
  ChainNamespace,
  CommerceTarget,
  Entitlement,
  PaymentIntentStatus,
  RedeemLoopPaymentIntent,
  RedemptionBinding,
  SettlementPolicy,
  VoucherAssetDescriptor,
  VoucherPaymentProof,
} from "./types.js";

const chainNamespaces: readonly ChainNamespace[] = ["eip155", "bitcoin", "fractal"];
const assetTypes: readonly AssetType[] = ["erc20", "erc6909", "erc1155", "erc721", "rune", "inscription", "brc20_optional"];
const settlementPolicies: readonly SettlementPolicy[] = ["collect", "burn", "escrow"];
const bindingStatuses: readonly BindingStatus[] = ["draft", "active", "paused", "archived"];
const paymentIntentStatuses: readonly PaymentIntentStatus[] = [
  "created",
  "wallet_connected",
  "asset_selected",
  "transfer_requested",
  "broadcasted",
  "seen",
  "confirmed",
  "paid",
  "expired",
  "failed",
  "cancelled",
  "manual_review",
];
const commercePlatforms = [
  "custom",
  "woocommerce",
  "shopify",
  "magento",
  "shopline",
  "shoplazza",
  "bigcommerce",
  "pos",
  "miniapp",
  "livestream",
] as const;

export function assertValidVoucherAssetDescriptor(asset: VoucherAssetDescriptor): void {
  if (!asset || typeof asset !== "object") throw new Error("asset descriptor is required");
  assertOneOf(asset.chainNamespace, chainNamespaces, "asset.chainNamespace");
  assertOneOf(asset.assetType, assetTypes, "asset.assetType");
  assertNonEmptyString(asset.assetId, "asset.assetId");
  assertPositiveAmount(asset.requiredAmount, "asset.requiredAmount");
  assertNonEmptyString(asset.termsHash, "asset.termsHash");

  if (asset.chainNamespace === "eip155") {
    assertPositiveInteger(asset.chainId, "asset.chainId");
    assertHexAddress(asset.contract, "asset.contract");
    if ((asset.assetType === "erc6909" || asset.assetType === "erc1155" || asset.assetType === "erc721") && !asset.tokenId) {
      throw new Error("asset.tokenId is required for ERC-6909, ERC-1155, and ERC-721 descriptors");
    }
  }

  if ((asset.chainNamespace === "bitcoin" || asset.chainNamespace === "fractal") && asset.assetType === "rune") {
    if (!asset.runeId && !asset.runeName) throw new Error("asset.runeId or asset.runeName is required for Rune descriptors");
  }

  if ((asset.chainNamespace === "bitcoin" || asset.chainNamespace === "fractal") && asset.assetType === "inscription") {
    assertNonEmptyString(asset.inscriptionId, "asset.inscriptionId");
  }

  if (asset.decimals !== undefined) assertNonNegativeInteger(asset.decimals, "asset.decimals");
  if (asset.divisibility !== undefined) assertNonNegativeInteger(asset.divisibility, "asset.divisibility");
}

export function assertValidEntitlement(entitlement: Entitlement): void {
  assertNonEmptyString(entitlement.entitlementId, "entitlement.entitlementId");
  assertNonEmptyString(entitlement.merchantId, "entitlement.merchantId");
  assertNonEmptyString(entitlement.name, "entitlement.name");
  assertPositiveInteger(entitlement.quantity, "entitlement.quantity");
  assertNonEmptyString(entitlement.termsHash, "entitlement.termsHash");

  if (entitlement.validity?.type === "date_range") {
    assertNonEmptyString(entitlement.validity.validFrom, "entitlement.validity.validFrom");
    assertNonEmptyString(entitlement.validity.validUntil, "entitlement.validity.validUntil");
  }
  if (entitlement.validity?.type === "relative") {
    assertPositiveInteger(entitlement.validity.durationSeconds, "entitlement.validity.durationSeconds");
  }
}

export function assertValidCommerceTarget(target: CommerceTarget): void {
  assertOneOf(target.platform, commercePlatforms, "target.platform");
  assertNonEmptyString(target.storeId, "target.storeId");
}

export function assertValidRedemptionBinding(binding: RedemptionBinding): void {
  assertNonEmptyString(binding.bindingId, "binding.bindingId");
  assertNonEmptyString(binding.merchantId, "binding.merchantId");
  assertNonEmptyString(binding.entitlementId, "binding.entitlementId");
  assertOneOf(binding.settlementPolicy, settlementPolicies, "binding.settlementPolicy");
  assertOneOf(binding.status, bindingStatuses, "binding.status");
  assertNonEmptyString(binding.termsHash, "binding.termsHash");
  assertNonEmptyString(binding.createdAt, "binding.createdAt");
  assertNonEmptyString(binding.updatedAt, "binding.updatedAt");
  if (!Array.isArray(binding.acceptedAssets) || binding.acceptedAssets.length === 0) {
    throw new Error("binding.acceptedAssets must contain at least one voucher asset");
  }
  for (const asset of binding.acceptedAssets) assertValidVoucherAssetDescriptor(asset);
  if (!binding.merchantVaults || Object.keys(binding.merchantVaults).length === 0) {
    throw new Error("binding.merchantVaults must contain at least one receiving address");
  }
  if (!Array.isArray(binding.commerceTargets) || binding.commerceTargets.length === 0) {
    throw new Error("binding.commerceTargets must contain at least one commerce target");
  }
  for (const target of binding.commerceTargets) assertValidCommerceTarget(target);
}

export function assertValidPaymentIntent(intent: RedeemLoopPaymentIntent): void {
  assertNonEmptyString(intent.intentId, "intent.intentId");
  assertNonEmptyString(intent.bindingId, "intent.bindingId");
  assertNonEmptyString(intent.merchantId, "intent.merchantId");
  assertOneOf(intent.status, paymentIntentStatuses, "intent.status");
  assertOneOf(intent.settlementPolicy, settlementPolicies, "intent.settlementPolicy");
  assertNonEmptyString(intent.orderId, "intent.orderId");
  assertNonEmptyString(intent.merchantVault, "intent.merchantVault");
  assertNonEmptyString(intent.expiresAt, "intent.expiresAt");
  if (!Array.isArray(intent.skuLines) || intent.skuLines.length === 0) throw new Error("intent.skuLines must contain at least one SKU line");
  for (const skuLine of intent.skuLines) {
    assertNonEmptyString(skuLine.sku, "intent.skuLines[].sku");
    assertPositiveInteger(skuLine.quantity, "intent.skuLines[].quantity");
  }
  if (!Array.isArray(intent.acceptedAssets) || intent.acceptedAssets.length === 0) {
    throw new Error("intent.acceptedAssets must contain at least one voucher asset");
  }
  for (const asset of intent.acceptedAssets) assertValidVoucherAssetDescriptor(asset);
  if (intent.selectedAsset) assertValidVoucherAssetDescriptor(intent.selectedAsset);
}

export function assertValidVoucherPaymentProof(proof: VoucherPaymentProof, intent?: RedeemLoopPaymentIntent): void {
  assertNonEmptyString(proof.proofId, "proof.proofId");
  assertNonEmptyString(proof.intentId, "proof.intentId");
  assertOneOf(proof.chainNamespace, chainNamespaces, "proof.chainNamespace");
  assertOneOf(proof.assetType, assetTypes, "proof.assetType");
  assertNonEmptyString(proof.txid, "proof.txid");
  assertNonNegativeInteger(proof.confirmations, "proof.confirmations");
  assertNonEmptyString(proof.from, "proof.from");
  assertNonEmptyString(proof.to, "proof.to");
  assertNonEmptyString(proof.assetId, "proof.assetId");
  assertPositiveAmount(proof.amount, "proof.amount");
  assertOneOf(proof.status, ["seen", "confirmed", "finalized", "failed"] as const, "proof.status");
  if (proof.chainNamespace === "eip155") {
    assertPositiveInteger(proof.chainId, "proof.chainId");
    assertHexAddress(proof.contract, "proof.contract");
  }
  if (intent) {
    if (proof.intentId !== intent.intentId) throw new Error("proof.intentId must match intent.intentId");
    if (proof.to.toLowerCase() !== intent.merchantVault.toLowerCase()) throw new Error("proof.to must match intent.merchantVault");
    const selectedAsset = intent.selectedAsset ?? intent.acceptedAssets[0];
    if (proof.assetType !== selectedAsset.assetType) throw new Error("proof.assetType must match the selected voucher asset");
    if (proof.assetId !== selectedAsset.assetId) throw new Error("proof.assetId must match the selected voucher asset");
    if (proof.amount !== selectedAsset.requiredAmount) throw new Error("proof.amount must match the required voucher amount");
  }
}

export function proofIdempotencyKey(proof: VoucherPaymentProof): string {
  return `proof:${proof.chainNamespace}:${proof.txid}:${proof.assetId}:${proof.to.toLowerCase()}:${proof.amount}`;
}

export function markPaidIdempotencyKey(input: { platform: string; storeId: string; orderId: string; intentId: string }): string {
  return `mark_paid:${input.platform}:${input.storeId}:${input.orderId}:${input.intentId}`;
}

export function webhookIdempotencyKey(eventId: string): string {
  assertNonEmptyString(eventId, "eventId");
  return `webhook:${eventId}`;
}

function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${fieldName} is required`);
}

function assertPositiveAmount(value: unknown, fieldName: string): asserts value is string {
  assertNonEmptyString(value, fieldName);
  if (!/^[0-9]+$/.test(value) || BigInt(value) <= 0n) throw new Error(`${fieldName} must be a positive integer string`);
}

function assertPositiveInteger(value: unknown, fieldName: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) throw new Error(`${fieldName} must be a positive integer`);
}

function assertNonNegativeInteger(value: unknown, fieldName: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error(`${fieldName} must be a non-negative integer`);
}

function assertHexAddress(value: unknown, fieldName: string): asserts value is `0x${string}` {
  assertNonEmptyString(value, fieldName);
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error(`${fieldName} must be an EVM address`);
}

function assertOneOf<T extends string>(value: unknown, allowed: readonly T[], fieldName: string): asserts value is T {
  if (!allowed.includes(value as T)) throw new Error(`${fieldName} must be one of: ${allowed.join(", ")}`);
}
