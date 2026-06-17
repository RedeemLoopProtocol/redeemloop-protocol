export type ChainNamespace = "eip155" | "bitcoin" | "fractal";

export type AssetType =
  | "erc20"
  | "erc6909"
  | "erc1155"
  | "erc721"
  | "rune"
  | "inscription"
  | "brc20_optional";

export type SettlementPolicy = "collect" | "burn" | "escrow";
export type BindingStatus = "draft" | "active" | "paused" | "archived";

export type PaymentIntentStatus =
  | "created"
  | "wallet_connected"
  | "asset_selected"
  | "transfer_requested"
  | "broadcasted"
  | "seen"
  | "confirmed"
  | "paid"
  | "expired"
  | "failed"
  | "cancelled"
  | "manual_review";

export interface VoucherAssetDescriptor {
  chainNamespace: ChainNamespace;
  chainId?: number;
  assetType: AssetType;
  assetId: string;
  contract?: `0x${string}`;
  tokenId?: string;
  runeId?: string;
  runeName?: string;
  inscriptionId?: string;
  collectionId?: string;
  ticker?: string;
  decimals?: number;
  divisibility?: number;
  requiredAmount: string;
  termsHash: string;
  metadataUri?: string;
}

export interface Entitlement {
  entitlementId: string;
  merchantId: string;
  name: string;
  description?: string;
  quantity: number;
  region?: string;
  validity?: {
    type: "perpetual" | "date_range" | "relative";
    validFrom?: string;
    validUntil?: string;
    durationSeconds?: number;
  };
  termsHash: string;
  termsUri?: string;
}

export interface CommerceTarget {
  platform:
    | "custom"
    | "woocommerce"
    | "shopify"
    | "magento"
    | "shopline"
    | "shoplazza"
    | "bigcommerce"
    | "pos"
    | "miniapp"
    | "livestream";
  storeId: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  entitlementGroupId?: string;
  country?: string;
  channel?: string;
}

export interface RedemptionBinding {
  bindingId: string;
  merchantId: string;
  entitlementId: string;
  acceptedAssets: VoucherAssetDescriptor[];
  merchantVaults: Record<string, string>;
  settlementPolicy: SettlementPolicy;
  commerceTargets: CommerceTarget[];
  status: BindingStatus;
  termsHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface RedeemLoopPaymentIntent {
  intentId: string;
  bindingId: string;
  merchantId: string;
  storeId?: string;
  channel: "website" | "checkout" | "pos" | "miniapp" | "livestream" | "ad";
  orderId: string;
  skuLines: Array<{ sku: string; quantity: number }>;
  acceptedAssets: VoucherAssetDescriptor[];
  selectedAsset?: VoucherAssetDescriptor;
  payerAddress?: string;
  merchantVault: string;
  settlementPolicy: SettlementPolicy;
  status: PaymentIntentStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherPaymentProof {
  proofId: string;
  intentId: string;
  chainNamespace: ChainNamespace;
  chainId?: number;
  txid: string;
  blockNumber?: number;
  blockHash?: string;
  confirmations: number;
  from: string;
  to: string;
  assetType: AssetType;
  assetId: string;
  contract?: string;
  tokenId?: string;
  amount: string;
  logIndex?: number;
  outputIndex?: number;
  status: "seen" | "confirmed" | "finalized" | "failed";
  rawProof?: unknown;
}
