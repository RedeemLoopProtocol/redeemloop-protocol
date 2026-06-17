import type { Address } from "viem";

export type CommerceProvider = "shopify" | "woocommerce" | "custom";
export type ChainNamespace = "eip155" | "bitcoin" | "fractal";
export type AssetType = "erc20" | "erc6909" | "erc1155" | "erc721" | "rune" | "inscription" | "brc20_optional";

export interface VoucherAssetDescriptor {
  chainNamespace: ChainNamespace;
  chainId?: number;
  assetType: AssetType;
  assetId: string;
  contract?: Address;
  tokenId?: string;
  requiredAmount: string;
  termsHash: string;
}

export interface BindingResponse {
  bindingId: string;
  merchantId: string;
  entitlementId: string;
  acceptedAssets: VoucherAssetDescriptor[];
  merchantVaults: Record<string, string>;
  settlementPolicy: "collect" | "burn" | "escrow";
  commerceTargets: Array<{
    platform: CommerceProvider | "pos" | "miniapp" | "livestream";
    storeId: string;
    sku?: string;
  }>;
  status: "draft" | "active" | "paused" | "archived";
  termsHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntentResponse {
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
  settlementPolicy: "collect" | "burn" | "escrow";
  status:
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
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  transfer?: {
    to: string;
    asset: VoucherAssetDescriptor;
    amount: string;
    settlementPolicy: "collect" | "burn" | "escrow";
  };
}

export interface SettlementProofResponse {
  proofId: string;
  intentId: string;
  txid: string;
  confirmations: number;
  from: string;
  to: string;
  assetType: AssetType;
  assetId: string;
  amount: string;
  status: "seen" | "confirmed" | "finalized" | "failed";
  duplicate?: boolean;
  paymentIntent?: PaymentIntentResponse;
  commerce?: {
    provider: CommerceProvider;
    orderId: string;
    markedPaid: boolean;
    dryRun: boolean;
    idempotencyKey?: string;
    request: {
      method: "POST" | "PUT";
      url: string;
      headers: string[];
      body: unknown;
    };
  };
}
